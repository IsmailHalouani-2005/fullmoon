'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const ADMIN_EMAILS = ['ismail.halouani@gmail.com', 'ilovehacking25@gmail.com', 'admin@admin.admin'];

export default function MicrophoneDebug() {
    const [status, setStatus] = useState<string>('Initialization...');
    const [volume, setVolume] = useState<number>(0);
    const [isOpen, setIsOpen] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isHttps, setIsHttps] = useState(false);
    const [hostname, setHostname] = useState<string>('...');
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user && user.email && ADMIN_EMAILS.includes(user.email)) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        });

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsHttps(window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        setHostname(window.location.hostname);

        let audioContext: AudioContext;
        let analyser: AnalyserNode;
        let animationId: number;
        let streamRef: MediaStream;

        async function initMicro() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setStatus('Non supporté (Requis HTTPS/localhost)');
                setErrorMsg("L'API MediaDevices n'est pas disponible. Assurez-vous d'être en HTTPS ou localhost.");
                return;
            }

            try {
                setStatus('Demande de permission...');
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef = stream;
                setStatus('Microphone Actif (Connecté)');

                audioContext = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || AudioContext)();
                analyser = audioContext.createAnalyser();
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);

                analyser.fftSize = 256;
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                const checkVolume = () => {
                    analyser.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < bufferLength; i++) {
                        sum += dataArray[i];
                    }
                    setVolume(sum / bufferLength);
                    animationId = requestAnimationFrame(checkVolume);
                };

                checkVolume();
            } catch (err: unknown) {
                setStatus('Erreur / Permission Refusée');
                setErrorMsg(err instanceof Error ? err.message : 'Permission refusée');
            }
        }

        initMicro();

        return () => {
            unsubscribeAuth();
            if (animationId) cancelAnimationFrame(animationId);
            if (audioContext && audioContext.state !== 'closed') audioContext.close().catch(() => { });
            if (streamRef) streamRef.getTracks().forEach(t => t.stop());
        };
    }, []);

    if (!isAdmin) return null;

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-[9999] bg-slate-900 text-white px-3 py-1 text-xs rounded shadow-lg border border-slate-700"
            >
                Ouvrir Debug Micro
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-[9999] bg-slate-900/90 text-[10px] text-white p-3 rounded-lg border border-slate-600 shadow-2xl w-[250px] font-mono backdrop-blur-sm pointer-events-auto">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700">
                <span className="font-bold uppercase tracking-wider text-secondary">Global Mic Test</span>
                <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white">✕</button>
            </div>

            <p className="mb-1">
                Protocole/URL: <span className={isHttps ? 'text-green-400' : 'text-red-400 font-bold'}>
                    {hostname}
                </span>
            </p>
            <p className="mb-1">
                Statut: <span className={status.includes('Actif') ? 'text-green-400' : 'text-yellow-400'}>{status}</span>
            </p>

            {errorMsg && (
                <p className="text-red-400 text-[9px] mt-1 bg-red-900/30 p-1 rounded border border-red-900/50">
                    Err: {errorMsg}
                </p>
            )}

            <div className="mt-2 text-white/70">
                <div className="flex justify-between mb-1">
                    <span>Live Input:</span>
                    <span>{Math.round(volume)}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 border border-slate-700 overflow-hidden">
                    <div
                        className="bg-green-500 h-1.5 transition-all duration-75"
                        style={{ width: `${Math.min(100, volume * 1.5)}%` }}
                    />
                </div>
            </div>

            {!isHttps && (
                <div className="mt-2 text-[8px] leading-tight text-red-300">
                    ⚠️ Les navigateurs bloquent l{"'"}accès au micro si le site n{"'"}est pas en HTTPS (sauf localhost).
                </div>
            )}
        </div>
    );
}
