'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Sidebar from '@/components/room/edit/Sidebar';
import MainContent from '@/components/room/edit/MainContent';
import { RoleId } from '@/types/roles';
import { distributeRoles } from '@/lib/roleDistribution';

// Re-exported so MainContent can import it
export const getDefaultRolesForPlayerCount = (playerCount: number): Partial<Record<RoleId, number>> =>
    distributeRoles(playerCount);

export default function EditRoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomCode = params.code as string;

    const [user, setUser] = useState<User | null>(null);
    const [secretCode, setSecretCode] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    // Settings state
    const [villageName, setVillageName] = useState<string>('');
    const [isPrivate, setIsPrivate] = useState<boolean>(false);
    const [isMicroEnabled, setIsMicroEnabled] = useState<boolean>(false);
    const [isMayorEnabled, setIsMayorEnabled] = useState<boolean>(true);
    const [playerCount, setPlayerCount] = useState<number>(16);
    const [rolesCount, setRolesCount] = useState<Partial<Record<RoleId, number>>>(getDefaultRolesForPlayerCount(16));
    const [isCustom, setIsCustom] = useState<boolean>(false);
    const [livePlayerCounts, setLivePlayerCounts] = useState<Record<string, number>>({});
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

    // Polling du nombre de joueurs connectés en direct (Socket.io) via /api/rooms-live
    useEffect(() => {
        let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';

        // CORRECTION : Utiliser NEXT_PUBLIC_SOCKET_URL ou l'origine actuelle
        let baseUrl = socketUrl || (typeof window !== 'undefined' ? window.location.origin : '');
        if (!socketUrl && baseUrl.includes('localhost')) {
            baseUrl = 'http://localhost:3001';
        }
        baseUrl = baseUrl.replace(/\/$/, '');

        const fetchLiveCounts = async () => {
            try {
                // On utilise baseUrl qui pointe vers le port 3001 (serveur socket + API)
                const res = await fetch(`${baseUrl}/api/rooms-live`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    setLivePlayerCounts(data);
                }
            } catch {
                // Silently ignore network errors
            }
        };

        fetchLiveCounts();
        const interval = setInterval(fetchLiveCounts, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push('/');
            } else {
                setUser(currentUser);
                if (!secretCode) {
                    setSecretCode(Math.random().toString(36).substring(2, 8).toUpperCase());
                }
            }
        });
        return () => unsubscribe();
    }, [router, secretCode]);

    const handleApplyDefaults = () => {
        setPlayerCount(16);
        setRolesCount(getDefaultRolesForPlayerCount(16));
        setIsCustom(false);
    };

    const handleCreateVillage = async () => {
        if (!user || !roomCode) return;

        setIsSaving(true);
        try {
            const totalRoles = Object.values(rolesCount).reduce((sum, count) => sum + (count || 0), 0);

            // Filtrer les rôles à 0 avant sauvegarde (pour la grille de la room)
            const filteredRolesCount = Object.fromEntries(
                Object.entries(rolesCount).filter(([, count]) => (count ?? 0) > 0)
            );

            await updateDoc(doc(db, "groups", roomCode), {
                name: villageName || `Village de ${user.displayName || 'Joueur'}`,
                isPrivate,
                isMicro: isMicroEnabled,
                isMayorEnabled,
                maxPlayers: playerCount,
                rolesCount: filteredRolesCount,
                isCustom,
                secretCode,
                isConfigured: true
            });

            console.log("[DIAGNOSTIC] Village saved with isCustom:", isCustom, "Settings:", { villageName, isPrivate, isMicroEnabled, isMayorEnabled, playerCount, rolesCount, totalRoles, secretCode });
            router.push(`/room/${roomCode}`);
        } catch (error) {
            console.error("Error saving village configuration:", error);
            alert("Une erreur est survenue lors de la sauvegarde des paramètres du village.");
            setIsSaving(false);
        }
    };

    if (!user || isSaving) {
        return (
            <div className="h-screen w-full bg-[#FCF8E8] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full overflow-hidden bg-[#FCF8E8] text-slate-900 flex flex-col md:flex-row">
            {/* Mobile Header (Hamburger Menu) */}
            <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm z-30">
                <h1 className="font-enchanted text-2xl tracking-widest text-slate-900">Paramètres</h1>
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:text-slate-900 focus:outline-none">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
            </div>

            {/* Backdrop for Mobile Sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Left Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-[85%] sm:w-[400px] h-full pt-12 md:pt-6 p-6 flex flex-col gap-6 bg-[#FCF8E8] border-r border-black/10 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex-shrink-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>

                {/* Close Button Mobile */}
                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden absolute top-3 right-4 p-2 text-slate-500 hover:text-slate-900">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>

                <Sidebar
                    user={user}
                    roomCode={roomCode}
                    secretCode={secretCode}
                    villageName={villageName}
                    setVillageName={setVillageName}
                    isPrivate={isPrivate}
                    setIsPrivate={setIsPrivate}
                    isMicroEnabled={isMicroEnabled}
                    setIsMicroEnabled={setIsMicroEnabled}
                    isMayorEnabled={isMayorEnabled}
                    setIsMayorEnabled={setIsMayorEnabled}
                    onApplyDefaults={handleApplyDefaults}
                    onCreateVillage={handleCreateVillage}
                />
            </div>

            {/* Right Main Content */}
            <div className="flex-1 h-full p-4 sm:p-8 overflow-y-auto w-full">
                <MainContent
                    playerCount={playerCount}
                    setPlayerCount={(v) => {
                        setPlayerCount(v);
                        setRolesCount(getDefaultRolesForPlayerCount(v));
                        setIsCustom(false);
                    }}
                    rolesCount={rolesCount}
                    setRolesCount={(v) => {
                        setRolesCount(v);
                    }}
                    isCustom={isCustom}
                    setIsCustom={setIsCustom}
                />
            </div>
        </div>
    );
}
