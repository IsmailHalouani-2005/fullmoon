'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import { Player, Phase, GameState } from '@/types/game';
import { isInWolfCamp } from '@/types/roles';

const ADMIN_EMAILS = ['ismail.halouani@gmail.com', 'ilovehacking25@gmail.com', 'admin@admin.admin'];

interface VoiceChatManagerProps {
    socket: Socket | null;
    roomCode: string;
    currentUser: { uid: string; pseudo?: string; email?: string | null };
    game: GameState | null;
    isMicroOn: boolean;       // Local setting: Am I speaking?
    isHeadphonesOn: boolean;  // Local setting: Am I listening?
    onSpeakingChange?: (speakingPlayers: Set<string>) => void;
    players?: Player[]; // Fallback list of players for non-game contexts (groups)
    type?: 'room' | 'group';
    micSensitivity?: number; // 0-100 (inverted to threshold)
    outputVolume?: number;   // 0-100
}
export default function VoiceChatManager({
    socket,
    roomCode,
    currentUser,
    game,
    isMicroOn,
    isHeadphonesOn,
    onSpeakingChange,
    players,
    type: propType,
    micSensitivity = 50,
    outputVolume = 100
}: VoiceChatManagerProps) {
    const type = propType || (roomCode.length > 10 ? 'group' : 'room');
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const localStreamRefForCleanup = useRef<MediaStream | null>(null);
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
    const [iceStates, setIceStates] = useState<Record<string, string>>({});
    const [gatheringStates, setGatheringStates] = useState<Record<string, string>>({});
    const gatheringStatesRef = useRef<Record<string, string>>({});
    const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
    const remoteAnalyzersRef = useRef<Record<string, AnalyserNode>>({});
    const sharedAcRef = useRef<AudioContext | null>(null);
    const pendingCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({});
    const [peerIds, setPeerIds] = useState<string[]>([]); // Reactive list for effects
    const [debugInfo, setDebugInfo] = useState<string>('');
    const [stats, setStats] = useState({ sentReq: 0, recvReq: 0, sentSig: 0, recvSig: 0, cand: 0 });
    const [audioStatus, setAudioStatus] = useState<Record<string, { playing: boolean, volume: number }>>({});
    const [localVolume, setLocalVolume] = useState<number>(0);
    const micSensitivityRef = useRef(micSensitivity);
    useEffect(() => {
        micSensitivityRef.current = micSensitivity;
    }, [micSensitivity]);
    const [acState, setAcState] = useState<string>('unknown');
    const [speakingPlayers, setSpeakingPlayers] = useState<Set<string>>(new Set());
    const speakingPlayersRef = useRef<Set<string>>(new Set());

    // Polite Peer state
    const isMakingOffer = useRef<Record<string, boolean>>({});
    const isIgnoringOffer = useRef<Record<string, boolean>>({});

    const handleSpeaking = useCallback(({ userId, isSpeaking }: { userId: string, isSpeaking: boolean }) => {
        const newSet = new Set(speakingPlayersRef.current);
        if (isSpeaking) newSet.add(userId);
        else newSet.delete(userId);
        speakingPlayersRef.current = newSet;
        setSpeakingPlayers(newSet);
        onSpeakingChange?.(newSet);
    }, [onSpeakingChange]);

    // --- 1. Get Local Media ---
    useEffect(() => {
        async function getMedia() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("VoiceChat: navigator.mediaDevices.getUserMedia is not supported on this browser/context.");
                setDebugInfo("Microphone access unavailable (requires HTTPS on mobile).");
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 48000
                    }
                });
                setLocalStream(stream);
                localStreamRefForCleanup.current = stream;
                // Initially mute if setting is off
                stream.getAudioTracks().forEach(track => {
                    track.enabled = isMicroOn;
                });
            } catch (err) {
                console.error("VoiceChat: Error getting user media", err);
                setDebugInfo("Microphone access denied or error.");
            }
        }
        getMedia();

        return () => {
            localStreamRefForCleanup.current?.getTracks().forEach(track => track.stop());
        };
    }, []);

    // --- 2. Update Local Mic Track ---
    useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = isMicroOn;
            });
        }
    }, [isMicroOn, localStream]);

    // Update remote volumes and enforce sender states when settings change
    useEffect(() => {
        Object.values(audioElementsRef.current).forEach(audio => {
            audio.volume = (outputVolume / 100) * (isHeadphonesOn ? 1 : 0);
            audio.muted = !isHeadphonesOn;
        });

        // Enforce mute on all active senders
        Object.values(peerConnections.current).forEach(pc => {
            pc.getSenders().forEach(sender => {
                if (sender.track && sender.track.kind === 'audio') {
                    sender.track.enabled = isMicroOn;
                }
            });
        });
    }, [outputVolume, isMicroOn, isHeadphonesOn, peerIds]); // Reactive to peerIds

    // Speaking detection (Volume analysis)
    useEffect(() => {
        if (!isMicroOn || !localStream || !socket) {
            if (socket) socket.emit('player_speaking', { isSpeaking: false, type });
            setLocalVolume(0); // Also reset visual meter
            return;
        }

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Ensure context is running for volume detection
        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(console.warn);
        }

        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(localStream);
        source.connect(analyser);

        // Try to resume on any user interaction as a fallback
        const resumeOnInteraction = () => {
            if (audioContext.state === 'suspended') {
                audioContext.resume().catch(console.warn);
            }
        };
        window.addEventListener('click', resumeOnInteraction);
        window.addEventListener('touchstart', resumeOnInteraction);

        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let lastSpeaking = false;
        let silenceCount = 0;

        let isActive = true;

        const checkVolume = () => {
            if (!isActive || !isMicroOn) return;

            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            setLocalVolume(average);

            // Sensitivity 100 (max) -> threshold 10
            // Sensitivity 0 (min) -> threshold 160
            const threshold = 160 - (micSensitivityRef.current * 1.5);
            const isSpeaking = average > threshold;

            if (isSpeaking !== lastSpeaking) {
                if (isSpeaking) {
                    silenceCount = 0;
                    socket.emit('player_speaking', { isSpeaking: true, type });
                    // Local update
                    if (currentUser?.uid) {
                        handleSpeaking({ userId: currentUser.uid, isSpeaking: true });
                    }
                    lastSpeaking = true;
                } else {
                    silenceCount++;
                    if (silenceCount > 20) { // Require ~400ms of silence
                        socket.emit('player_speaking', { isSpeaking: false, type });
                        if (currentUser?.uid) {
                            handleSpeaking({ userId: currentUser.uid, isSpeaking: false });
                        }
                        lastSpeaking = false;
                    }
                }
            } else if (isSpeaking) {
                silenceCount = 0;
            }

            requestAnimationFrame(checkVolume);
        };

        const animationId = requestAnimationFrame(checkVolume);

        return () => {
            isActive = false;
            cancelAnimationFrame(animationId);
            window.removeEventListener('click', resumeOnInteraction);
            window.removeEventListener('touchstart', resumeOnInteraction);
            audioContext.close().catch(() => { });
            socket.emit('player_speaking', { isSpeaking: false, type });
            if (currentUser?.uid) {
                handleSpeaking({ userId: currentUser.uid, isSpeaking: false });
            }
        };
    }, [isMicroOn, localStream, socket, roomCode, handleSpeaking, currentUser?.uid]);

    // --- 3. Manage Peer Connections based on Game Phase/Roles ---
    const targets = useMemo(() => {
        const effectivePlayers: Player[] = players || game?.players || [];
        const myPlayer = effectivePlayers.find((p: Player) => p.id === currentUser?.uid);

        return effectivePlayers.filter((p: Player) => {
            if (p.id === currentUser?.uid) return false;
            if (!game) return true; // Group context
            if (game.phase === 'LOBBY' || game.phase === 'DAY_DISCUSSION' || game.phase === 'DAY_VOTE' || game.phase === 'MAYOR_ELECTION' || game.phase === 'ROLE_REVEAL') {
                return true;
            }
            if (game.phase === 'NIGHT' && myPlayer) {
                const meInWolfCamp = isInWolfCamp(myPlayer.role) || myPlayer.effects?.includes('infected');
                const pInWolfCamp = isInWolfCamp(p.role) || p.effects?.includes('infected');
                return meInWolfCamp && pInWolfCamp;
            }
            return false;
        });
    }, [players, game?.players, game?.phase, currentUser?.uid]);

    useEffect(() => {
        if (!socket || !localStream || !currentUser?.uid) return;

        const effectivePlayers: Player[] = players || game?.players || [];

        if (targets.length === 0 && effectivePlayers.length > 1) {
            console.warn(`VoiceChat[${type}]: Discovery found ${effectivePlayers.length} players but 0 targets. Phase: ${game?.phase}`);
        }

        const targetIds = new Set(targets.map(p => p.id));

        // Close connections to players no longer in targets
        Object.keys(peerConnections.current).forEach(peerId => {
            if (!targetIds.has(peerId)) closeConnection(peerId);
        });

        // Request connections to new targets (staggered initiation by UID)
        targets.forEach((target: Player) => {
            if (!peerConnections.current[target.id]) {
                if (currentUser?.uid && currentUser.uid > target.id) {
                    setStats(s => ({ ...s, sentReq: s.sentReq + 1 }));
                    socket.emit('voice_request_connect', { targetId: target.id, type });
                }
            }
        });

    }, [game?.phase, game?.players.length, players?.length, socket, localStream, type, targets, currentUser?.uid]);

    // Periodic Poke (Every 15s, if targets exist but no pairs, try re-initiating)
    useEffect(() => {
        const interval = setInterval(() => {
            if (!socket || targets.length === 0 || Object.keys(iceStates).length > 0) return;

            targets.forEach(target => {
                if (currentUser?.uid && currentUser.uid > target.id) {
                    setStats(s => ({ ...s, sentReq: s.sentReq + 1 }));
                    socket.emit('voice_request_connect', { targetId: target.id, type });
                }
            });
        }, 15000);
        return () => clearInterval(interval);
    }, [socket, targets, iceStates, type, currentUser?.uid]);

    const handleInteraction = useCallback(() => {
        Object.values(audioElementsRef.current).forEach(audio => {
            if (audio && isHeadphonesOn) {
                audio.muted = false;
                if (audio.paused) {
                    audio.play().catch(e => console.warn("VoiceChat: Play blocked on interaction", e));
                }
            }
        });

        // Réutiliser le contexte partagé existant plutôt que d'en créer un nouveau à chaque clic
        if (sharedAcRef.current) {
            sharedAcRef.current.resume()
                .then(() => setAcState(sharedAcRef.current?.state || 'running'))
                .catch(() => {});
        }
    }, [isHeadphonesOn]);

    // Auto-resume audio when switches are toggled ON
    useEffect(() => {
        if (isMicroOn || isHeadphonesOn) {
            handleInteraction();
        }
    }, [isMicroOn, isHeadphonesOn, handleInteraction]);

    useEffect(() => {
        window.addEventListener('click', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);
        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, [handleInteraction]);

    // --- 4. Signaling Listeners ---
    useEffect(() => {
        if (!socket) return;

        const handleRequest = ({ senderId }: { senderId: string }) => {
            setStats(s => ({ ...s, recvReq: s.recvReq + 1 }));
            if (!peerConnections.current[senderId]) {
                createPeerConnection(senderId, true);
            }
        };

        const handleSignal = async ({ senderId, signal }: { senderId: string, signal: any }) => {
            setStats(s => ({ ...s, recvSig: s.recvSig + 1 }));
            let pc = peerConnections.current[senderId];
            if (!pc) {
                pc = createPeerConnection(senderId, false);
            }

            try {
                if (signal.type === 'offer') {
                    const isCollision = isMakingOffer.current[senderId] || pc.signalingState !== 'stable';
                    const isPolite = currentUser?.uid < senderId;
                    isIgnoringOffer.current[senderId] = !isPolite && isCollision;

                    if (isIgnoringOffer.current[senderId]) {
                        console.warn(`VoiceChat: Ignoring offer collision from ${senderId} (impolite peer)`);
                        return;
                    }

                    await pc.setRemoteDescription(new RTCSessionDescription(signal));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('voice_signal', { targetId: senderId, signal: answer, type });

                    if (pendingCandidates.current[senderId]) {
                        for (const cand of pendingCandidates.current[senderId]) {
                            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e => console.warn("Queued candidate error", e));
                        }
                        delete pendingCandidates.current[senderId];
                    }
                } else if (signal.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal));

                    if (pendingCandidates.current[senderId]) {
                        for (const cand of pendingCandidates.current[senderId]) {
                            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e => console.warn("Queued candidate error", e));
                        }
                        delete pendingCandidates.current[senderId];
                    }
                } else if (signal && (signal.candidate || signal.sdpMid)) {
                    if (pc.remoteDescription) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(signal));
                            setStats(s => ({ ...s, cand: s.cand + 1 }));
                        } catch (e) {
                            if (!isIgnoringOffer.current[senderId]) {
                                console.warn("Candidate error", e);
                            }
                        }
                    } else {
                        if (!isIgnoringOffer.current[senderId]) {
                            if (!pendingCandidates.current[senderId]) pendingCandidates.current[senderId] = [];
                            pendingCandidates.current[senderId].push(signal);
                        }
                    }
                }
            } catch (err) {
                console.error("VoiceChat: Error handling signal", err);
                setDebugInfo(`Err: ${err instanceof Error ? err.message.slice(0, 20) : 'WebRTC Error'}`);
            }
        };

        socket.on('voice_request_connect', handleRequest);
        socket.on('voice_signal', handleSignal);
        socket.on('player_speaking', handleSpeaking);

        return () => {
            socket.off('voice_request_connect', handleRequest);
            socket.off('voice_signal', handleSignal);
            socket.off('player_speaking', handleSpeaking);
        };
    }, [socket, handleSpeaking, type, currentUser?.uid]);

    // --- Helper Functions ---

    function createPeerConnection(peerId: string, isInitiator: boolean) {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun.voiparound.com:3478' },
                { urls: 'stun:stun.stunprotocol.org:3478' },
                { urls: 'stun:stun.ekiga.net:3478' },
                { urls: 'stun:stun.ideasip.com:3478' },
            ],
            iceCandidatePoolSize: 10
        });

        // Force ICE agent by creating a dummy data channel if initiator
        if (isInitiator) {
            pc.createDataChannel("icepoke");
        }

        // Initialize UI state immediately
        setIceStates(prev => ({ ...prev, [peerId]: 'new' }));
        setGatheringStates(prev => ({ ...prev, [peerId]: 'new' }));
        setPeerIds(prev => Array.from(new Set([...prev, peerId])));

        peerConnections.current[peerId] = pc;

        pc.oniceconnectionstatechange = () => {
            setIceStates(prev => ({ ...prev, [peerId]: pc.iceConnectionState }));
            if (pc.iceConnectionState === 'failed') {
                console.warn(`VoiceChat: Connection failed with ${peerId}`);
                closeConnection(peerId);
            }
        };

        pc.onicegatheringstatechange = () => {
            setGatheringStates(prev => ({ ...prev, [peerId]: pc.iceGatheringState }));
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                setStats(s => ({ ...s, sentSig: s.sentSig + 1 }));
                socket?.emit('voice_signal', { targetId: peerId, signal: event.candidate, type });
            }
        };

        pc.onnegotiationneeded = async () => {
            try {
                isMakingOffer.current[peerId] = true;
                const senders = pc.getSenders();
                const hasAudio = senders.some(s => s.track && s.track.kind === 'audio');
                if (!hasAudio && localStreamRefForCleanup.current) {
                    localStreamRefForCleanup.current.getTracks().forEach(track => {
                        if (!pc.getSenders().find(s => s.track === track)) {
                            pc.addTrack(track, localStreamRefForCleanup.current!);
                        }
                    });
                }
                const offer = await pc.createOffer();
                if (pc.signalingState !== 'stable') return;
                await pc.setLocalDescription(offer);
                socket?.emit('voice_signal', { targetId: peerId, signal: pc.localDescription, type });
            } catch (err) {
                console.error("Negotiation error", err);
            } finally {
                isMakingOffer.current[peerId] = false;
            }
        };

        pc.ontrack = (event) => {

            setRemoteStreams(prev => {
                const next = { ...prev };
                let stream = next[peerId];
                if (!stream) {
                    stream = new MediaStream();
                    next[peerId] = stream;
                }
                if (!stream.getTracks().includes(event.track)) {
                    stream.addTrack(event.track);
                }
                return next;
            });

            if (isHeadphonesOn) {
                setTimeout(() => {
                    const el = audioElementsRef.current[peerId];
                    if (el && el.paused) {
                        el.play().catch(e => console.warn("VoiceChat ontrack play blocked:", e));
                    }
                }, 200);
            }
        };

        // Add local tracks (triggers onnegotiationneeded if not already present)
        if (localStreamRefForCleanup.current) {
            localStreamRefForCleanup.current.getTracks().forEach(track => {
                const senders = pc.getSenders();
                if (!senders.find(s => s.track === track)) {
                    pc.addTrack(track, localStreamRefForCleanup.current!);
                }
            });
        }

        return pc;
    }

    // --- 4b. Sync Local tracks to all connections ---
    useEffect(() => {
        if (!localStream) return;
        Object.entries(peerConnections.current).forEach(([id, pc]) => {
            const senders = pc.getSenders();
            const hasAudio = senders.some(s => s.track?.kind === 'audio' && s.track?.id);

            if (!hasAudio) {
                localStream.getTracks().forEach(track => {
                    const senders = pc.getSenders();
                    if (!senders.find(s => s.track === track)) {
                        pc.addTrack(track, localStream);
                    }
                });
            }

            // Sync mute state to new tracks immediately
            pc.getSenders().forEach(sender => {
                if (sender.track && sender.track.kind === 'audio') {
                    sender.track.enabled = isMicroOn;
                }
            });
        });
    }, [localStream, socket, type, isMicroOn, peerIds]); // Added isMicroOn and peerIds

    // --- 5. Global Maintenance & Remote Analysis ---
    useEffect(() => {
        const interval = setInterval(() => {
            // Update gathering states and remote volumes
            Object.entries(peerConnections.current).forEach(([id, pc]) => {
                if (pc.iceGatheringState !== (gatheringStatesRef.current[id] || 'new')) {
                    gatheringStatesRef.current[id] = pc.iceGatheringState;
                    setGatheringStates(prev => ({ ...prev, [id]: pc.iceGatheringState }));
                }

                // [REMOVED RECOVERY SPAM]: La boucle précédente spamait une "offer" toutes les 500ms
                // si aucune piste n'était reçue (getReceivers().length === 0). 
                // En production (latence > 50ms), les pistes mettent du temps à s'échanger,
                // ce qui provoquait une cascade `InvalidStateError` et tuait la connexion WebRTC.
                // La négociation `onnegotiationneeded` normale suffit.
            });

            Object.entries(remoteAnalyzersRef.current).forEach(([id, analyzer]) => {
                const data = new Uint8Array(analyzer.frequencyBinCount);
                analyzer.getByteFrequencyData(data);
                let sum = 0;
                for (let i = 0; i < data.length; i++) sum += data[i];
                const vol = sum / data.length / 255;
                setAudioStatus(prev => ({
                    ...prev,
                    [id]: {
                        playing: audioElementsRef.current[id] ? !audioElementsRef.current[id].paused : false,
                        volume: vol
                    }
                }));
            });
        }, 500); // 500ms for more reactive volume meter
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        Object.entries(remoteStreams).forEach(([id, stream]) => {
            if (!remoteAnalyzersRef.current[id] && stream.getAudioTracks().length > 0) {
                try {
                    if (!sharedAcRef.current) {
                        const AC = (window.AudioContext || (window as any).webkitAudioContext);
                        sharedAcRef.current = new AC();
                    }
                    if (sharedAcRef.current.state === 'suspended') sharedAcRef.current.resume();
                    const analyzer = sharedAcRef.current.createAnalyser();
                    const source = sharedAcRef.current.createMediaStreamSource(stream);
                    source.connect(analyzer);
                    remoteAnalyzersRef.current[id] = analyzer;
                } catch (e) { console.warn("Analyzer error", e); }
            }
        });
    }, [remoteStreams]);

    function closeConnection(peerId: string) {
        if (peerConnections.current[peerId]) {
            peerConnections.current[peerId].close();
            delete peerConnections.current[peerId];
        }
        setRemoteStreams(prev => {
            const next = { ...prev };
            delete next[peerId];
            return next;
        });
        setIceStates(prev => {
            const next = { ...prev };
            delete next[peerId];
            return next;
        });
        setPeerIds(prev => prev.filter(id => id !== peerId));
        if (audioElementsRef.current[peerId]) {
            delete audioElementsRef.current[peerId];
        }
        if (remoteAnalyzersRef.current[peerId]) {
            delete remoteAnalyzersRef.current[peerId];
        }
    }

    function resetConnections() {
        console.log("VoiceChat: Resetting all peer connections...");
        try {
            const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.connect(gain);
            gain.connect(ac.destination);
            gain.gain.value = 0.1;
            osc.start();
            osc.stop(ac.currentTime + 0.1);
            setDebugInfo("Bip de test envoyé...");
        } catch (e) {
            console.warn("Could not play test beep", e);
        }

        Object.keys(peerConnections.current).forEach(closeConnection);
        setStats({ sentReq: 0, recvReq: 0, sentSig: 0, recvSig: 0, cand: 0 });
        setDebugInfo("Connections reset.");
    }

    function forceAudio() {
        const elements = Object.values(audioElementsRef.current);
        if (elements.length === 0) {
            setDebugInfo("Aucun flux audio détecté (Pairs connectés but streams empty).");
            return;
        }

        setDebugInfo(`Forçage de ${elements.length} flux...`);
        elements.forEach(async (audio) => {
            try {
                audio.muted = false;
                await audio.play();
                setDebugInfo("Audio relancé !");
            } catch (e) {
                console.warn("Force play failed", e);
                setDebugInfo(`Erreur: ${e instanceof Error ? e.message.slice(0, 20) : 'Blocage navigateur'}`);
            }
        });

        if (sharedAcRef.current && sharedAcRef.current.state !== 'running') {
            sharedAcRef.current.resume().then(() => setAcState(sharedAcRef.current?.state || 'unknown'));
        }
        handleInteraction();
    }

    return (
        <div style={{ position: 'fixed', bottom: 10, right: 10, zIndex: 9999, pointerEvents: 'none', display: 'block' }}>
            {ADMIN_EMAILS.includes(currentUser?.email || '') && (
                <>
                    {/* Direct Interaction Layer for Reset (only on the button) */}
                    <div style={{ pointerEvents: 'auto' }} className="mb-1 text-right flex flex-col items-end gap-1">
                        <button
                            onClick={forceAudio}
                            className="bg-blue-500/40 hover:bg-blue-500/60 text-[8px] text-white px-2 py-1 rounded border border-white/10"
                        >
                            🔊 DÉBLOQUER SON
                        </button>
                        <button
                            onClick={resetConnections}
                            className="bg-red-500/20 hover:bg-red-500/40 text-[8px] text-white px-2 py-1 rounded border border-white/10"
                        >
                            Réinitialiser
                        </button>
                    </div>

                    {/* Visible Debug Info (Small) */}
                    <div className="bg-black/95 text-[9px] text-white p-2 rounded border border-white/20 shadow-xl w-[190px] font-mono">
                        <p className="font-bold border-bottom border-white/10 pb-1 mb-1 uppercase tracking-tighter">Voice: {type}</p>
                        <p>Moi: {currentUser?.pseudo || currentUser?.uid.slice(0, 5)} <span className="opacity-50">({currentUser?.uid.slice(0, 3)})</span></p>
                        <p>Micro: <span className={isMicroOn ? 'text-green-400' : 'text-red-400'}>{isMicroOn ? 'ON' : (game?.players.find(p => p.id === currentUser?.uid)?.isAlive === false && game.phase !== 'LOBBY' && game.phase !== 'GAME_OVER' ? 'OFF (MORT)' : 'OFF (MUTE)')}</span></p>
                        <p>Socket: <span className={socket?.connected ? 'text-green-400' : 'text-red-400'}>{socket?.connected ? 'OK' : 'ERR'}</span></p>
                        <div className="flex items-center gap-2">
                            <p className={!isMicroOn ? 'opacity-50' : ''}>Flux:</p>
                            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-100 ${!isMicroOn ? 'bg-red-500/50' : 'bg-blue-400'}`}
                                    style={{ width: `${Math.min(100, localVolume * 4)}%`, opacity: !isMicroOn ? 0.3 : 1 }}
                                />
                            </div>
                        </div>
                        <p>Sortie: <span className={isHeadphonesOn ? 'text-green-400' : 'text-red-400'}>{isHeadphonesOn ? 'HP ON' : 'MUET'}</span> <span className="opacity-50 text-[7px]">({acState})</span></p>
                        <p>Flux Dist: {Object.keys(remoteStreams).length} <span className="opacity-50 text-[7px]">({Object.keys(audioElementsRef.current).length} el)</span></p>
                        <p>Cibles: {targets.length} <span className="opacity-50">(W:{targets.filter((t: Player) => currentUser.uid <= t.id).length} I:{targets.filter((t: Player) => currentUser.uid > t.id).length})</span></p>
                        <p className="text-blue-300">REQ: ↑{stats.sentReq} ↓{stats.recvReq}</p>
                        <p className="text-purple-300">SIG: ↑{stats.sentSig} ↓{stats.recvSig} • ICE: {stats.cand}</p>

                        <div className="mt-1 pt-1 border-t border-white/10">
                            <p className="text-[8px] opacity-70 mb-1 underline">Pairs ({Object.keys(iceStates).length}):</p>
                            {Object.keys(iceStates).length === 0 ? (
                                <p className="italic opacity-50">Aucun pair actif</p>
                            ) : (
                                Object.entries(iceStates).map(([id, state]) => (
                                    <div key={id} className="mb-1 border-b border-white/5 pb-1 last:border-0">
                                        <p className="truncate font-bold">
                                            {(players?.find(p => p.id === id)?.name || (game?.players || []).find(p => p.id === id)?.name || id.slice(0, 5))}
                                            <span className="opacity-50 font-normal"> ({id.slice(0, 3)})</span>
                                        </p>
                                        <p className="flex justify-between pl-1">
                                            <span>ICE:</span>
                                            <span className={state === 'connected' ? 'text-green-400 font-bold' : state === 'failed' ? 'text-red-400' : 'text-yellow-400'}>{state}</span>
                                        </p>
                                        <p className="flex justify-between pl-1 text-[8px] opacity-70">
                                            <span>GATH/SIG:</span>
                                            <span>{gatheringStates[id] || 'new'}/{peerConnections.current[id]?.signalingState?.slice(0, 4) || 'none'} <span className="opacity-40 text-[6px]">({peerConnections.current[id]?.getSenders().length}S/{peerConnections.current[id]?.getReceivers().length}R)</span></span>
                                        </p>
                                        <p className="flex justify-between pl-1 text-[8px] text-orange-300">
                                            <span>SON:</span>
                                            <span className="flex items-center gap-1">
                                                {audioStatus[id]?.playing ? '🔊' : '🔇'}
                                                <span className="w-10 h-1 bg-white/20 rounded-full overflow-hidden">
                                                    <span
                                                        className="block h-full bg-green-400"
                                                        style={{ width: `${Math.min(100, (audioStatus[id]?.volume || 0) * 1000)}%` }}
                                                    />
                                                </span>
                                            </span>
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                        {debugInfo && <p className="mt-1 text-[7px] text-yellow-400 break-words leading-tight border-t border-white/5 pt-1 italic">{debugInfo}</p>}
                    </div>
                </>
            )}

            {/* Audio Elements */}
            {Object.entries(remoteStreams).map(([peerId, stream]) => (
                <audio
                    key={peerId}
                    ref={el => {
                        if (el) {
                            if (el.srcObject !== stream) el.srcObject = stream;
                            audioElementsRef.current[peerId] = el;
                        }
                    }}
                    autoPlay
                    playsInline
                    muted={!isHeadphonesOn}
                    onLoadedMetadata={(e) => {
                        (e.target as HTMLAudioElement).volume = outputVolume / 100;
                    }}
                />
            ))}
        </div>
    );
}
