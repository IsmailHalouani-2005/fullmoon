'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ROLES, RoleId } from '@/types/roles';
import { useToast } from '@/contexts/ToastContext';

const SUPER_ADMIN = 'ismail.halouani@gmail.com';

const PHASE_LABELS: Record<string, string> = {
    LOBBY: 'Lobby', ROLE_REVEAL: 'Révélation', MAYOR_ELECTION: 'Élection Maire',
    MAYOR_SUCCESSION: 'Succession Maire', NIGHT: 'Nuit', DAY_DISCUSSION: 'Débat',
    DAY_VOTE: 'Bûcher', HUNTER_SHOT: 'Chasseur', GAME_OVER: 'Fin',
};
const PHASE_COLORS: Record<string, string> = {
    LOBBY: 'bg-slate-600', NIGHT: 'bg-blue-900', DAY_DISCUSSION: 'bg-yellow-700',
    DAY_VOTE: 'bg-orange-700', MAYOR_ELECTION: 'bg-purple-700', GAME_OVER: 'bg-red-900',
    ROLE_REVEAL: 'bg-indigo-700', HUNTER_SHOT: 'bg-red-700', MAYOR_SUCCESSION: 'bg-purple-800',
};
const CAMP_COLORS: Record<string, string> = {
    VILLAGE: 'text-emerald-400', LOUPS: 'text-red-400', SOLO: 'text-purple-400',
};

type UserSort = 'points_desc' | 'points_asc' | 'alpha_asc' | 'alpha_desc' | 'games_desc' | 'wins_desc' | 'created_desc' | 'created_asc';
type RoomFilter = 'all' | 'lobby' | 'active' | 'finished';
type RoomSort = 'created_desc' | 'created_asc' | 'players_desc' | 'players_asc' | 'phase';

// ─── Types internes ───────────────────────────────────────────────────────────

interface LivePlayer {
    id: string;
    name: string;
    role?: string;
    isAlive?: boolean;
    isDisconnected?: boolean;
    effects?: string[];
    deadAt?: string;
}

interface FsPlayer {
    uid: string;
    pseudo: string;
    photoURL?: string;
}

interface MergedRoom {
    id: string;
    name: string;
    hostPseudo: string;
    gameStarted: boolean;
    isPrivate: boolean;
    isMicro: boolean;
    createdAt: string;
    phase: string;
    playerCount: number;
    alivePlayers: number | null;
    liveState: {
        timer?: number;
        players?: LivePlayer[];
        hostId?: string;
        mayorId?: string;
    } | null;
    players?: FsPlayer[];
    [key: string]: unknown;
}

interface UserRecord {
    id: string;
    pseudo: string;
    email: string;
    photoURL?: string;
    createdAt: string;
    stats?: {
        points?: number;
        gamesPlayed?: number;
        wins?: number;
        losses?: number;
        fled?: number;
    };
    [key: string]: unknown;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminMonitorPage() {
    const router = useRouter();
    const toast = useToast();
    const [authorized, setAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'rooms' | 'users'>('rooms');

    // Rooms
    const [liveRooms, setLiveRooms] = useState<Record<string, Record<string, unknown>>>({});  // Socket.io state
    const [fsRooms, setFsRooms] = useState<MergedRoom[]>([]);                                 // Firestore rooms
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [roomFilter, setRoomFilter] = useState<RoomFilter>('all');
    const [roomSort, setRoomSort] = useState<RoomSort>('created_desc');
    const [roomSearch, setRoomSearch] = useState('');

    // Users
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [userSort, setUserSort] = useState<UserSort>('points_desc');
    const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
    const [editPseudo, setEditPseudo] = useState('');
    const [editPoints, setEditPoints] = useState(0);

    // ─── Auth ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            if (!u || u.email !== SUPER_ADMIN) { router.replace('/'); return; }
            setAuthorized(true);
            setLoading(false);
        });
        return () => unsub();
    }, [router]);

    // ─── Fetch rooms (Socket.io live + Firestore) ─────────────────────────────

    const fetchRooms = useCallback(async () => {
        setRoomsLoading(true);
        try {
            // 1. Rooms Firestore (toutes, même non lancées)
            const snap = await getDocs(collection(db, 'groups'));
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as MergedRoom));
            setFsRooms(all);

            // 2. Rooms Socket.io live (état détaillé en partie)
            const socketUrl = (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001').replace(/\/$/, '');
            const secret = process.env.NEXT_PUBLIC_ADMIN_API_SECRET || '';
            const res = await fetch(`${socketUrl}/api/admin/rooms?secret=${secret}`, { cache: 'no-store' });
            if (res.ok) setLiveRooms(await res.json());
        } catch {
            toast.error('Erreur lors du chargement des rooms.');
        } finally {
            setRoomsLoading(false);
        }
    }, [toast]);

    // ─── Fetch users ──────────────────────────────────────────────────────────

    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        try {
            const snap = await getDocs(collection(db, 'users'));
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRecord)));
        } catch {
            toast.error('Erreur lors du chargement des utilisateurs.');
        } finally {
            setUsersLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!authorized) return;
        fetchRooms();
        fetchUsers();
    }, [authorized, fetchRooms, fetchUsers]);

    // ─── Rooms fusionnés (Firestore + live Socket.io) ─────────────────────────

    const mergedRooms = useMemo<MergedRoom[]>(() => {
        return fsRooms.map(fsRoom => {
            const live = liveRooms[fsRoom.id] as (Record<string, unknown> & { phase?: string; totalPlayers?: number; alivePlayers?: number; timer?: number; players?: LivePlayer[]; hostId?: string; mayorId?: string }) | undefined;
            return {
                ...fsRoom,
                liveState: live ? {
                    timer: live.timer,
                    players: live.players,
                    hostId: live.hostId as string | undefined,
                    mayorId: live.mayorId as string | undefined,
                } : null,
                phase: (live?.phase as string) || (fsRoom.gameStarted ? 'ACTIVE' : 'LOBBY'),
                playerCount: (live?.totalPlayers as number) ?? (fsRoom.players?.length ?? 0),
                alivePlayers: (live?.alivePlayers as number) ?? null,
            } as MergedRoom;
        });
    }, [fsRooms, liveRooms]);

    const filteredRooms = useMemo(() => {
        let list = [...mergedRooms];

        // Filtre
        if (roomFilter === 'lobby') list = list.filter(r => !r.gameStarted || r.phase === 'LOBBY');
        else if (roomFilter === 'active') list = list.filter(r => r.gameStarted && r.phase !== 'GAME_OVER' && r.phase !== 'LOBBY');
        else if (roomFilter === 'finished') list = list.filter(r => r.phase === 'GAME_OVER');

        // Recherche
        if (roomSearch) list = list.filter(r =>
            r.id?.toLowerCase().includes(roomSearch.toLowerCase()) ||
            r.name?.toLowerCase().includes(roomSearch.toLowerCase()) ||
            r.hostPseudo?.toLowerCase().includes(roomSearch.toLowerCase())
        );

        // Tri
        if (roomSort === 'created_desc') list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        else if (roomSort === 'created_asc') list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        else if (roomSort === 'players_desc') list.sort((a, b) => b.playerCount - a.playerCount);
        else if (roomSort === 'players_asc') list.sort((a, b) => a.playerCount - b.playerCount);
        else if (roomSort === 'phase') list.sort((a, b) => (a.phase || '').localeCompare(b.phase || ''));

        return list;
    }, [mergedRooms, roomFilter, roomSort, roomSearch]);

    // ─── Users filtrés + triés ────────────────────────────────────────────────

    const filteredUsers = useMemo<UserRecord[]>(() => {
        let list = [...users];
        if (userSearch) list = list.filter(u =>
            u.pseudo?.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email?.toLowerCase().includes(userSearch.toLowerCase())
        );
        switch (userSort) {
            case 'points_desc': list.sort((a, b) => (b.stats?.points ?? 0) - (a.stats?.points ?? 0)); break;
            case 'points_asc':  list.sort((a, b) => (a.stats?.points ?? 0) - (b.stats?.points ?? 0)); break;
            case 'alpha_asc':   list.sort((a, b) => (a.pseudo || '').localeCompare(b.pseudo || '')); break;
            case 'alpha_desc':  list.sort((a, b) => (b.pseudo || '').localeCompare(a.pseudo || '')); break;
            case 'games_desc':  list.sort((a, b) => (b.stats?.gamesPlayed ?? 0) - (a.stats?.gamesPlayed ?? 0)); break;
            case 'wins_desc':   list.sort((a, b) => (b.stats?.wins ?? 0) - (a.stats?.wins ?? 0)); break;
            case 'created_desc': list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()); break;
            case 'created_asc':  list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()); break;
        }
        return list;
    }, [users, userSearch, userSort]);

    // ─── User actions ─────────────────────────────────────────────────────────

    const handleDeleteUser = async (userId: string, pseudo: string) => {
        if (!confirm(`Supprimer le compte de ${pseudo} ? Action irréversible.`)) return;
        try {
            await deleteDoc(doc(db, 'users', userId));
            setUsers(prev => prev.filter(u => u.id !== userId));
            toast.success(`Compte de ${pseudo} supprimé.`);
        } catch { toast.error('Erreur lors de la suppression.'); }
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        try {
            await updateDoc(doc(db, 'users', editingUser.id), { pseudo: editPseudo, 'stats.points': editPoints });
            setUsers(prev => prev.map(u => u.id === editingUser.id
                ? { ...u, pseudo: editPseudo, stats: { ...u.stats, points: editPoints } } : u));
            setEditingUser(null);
            toast.success('Utilisateur mis à jour.');
        } catch { toast.error('Erreur lors de la mise à jour.'); }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    if (loading) return (
        <div className="min-h-screen bg-[#1a1b26] flex items-center justify-center">
            <p className="text-[#D1A07A] font-enchanted text-4xl animate-pulse">Vérification...</p>
        </div>
    );
    if (!authorized) return null;

    return (
        <div className="min-h-screen bg-[#0d0f1a] text-white font-montserrat">

            {/* Header */}
            <div className="bg-[#1a1b26] border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/admin')} className="text-slate-400 hover:text-white text-sm transition-colors">← Admin</button>
                    <h1 className="font-enchanted text-3xl text-[#D1A07A]">Tableau de Bord</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { fetchRooms(); fetchUsers(); }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-300 transition-colors border border-white/10"
                    >
                        ↻ Rafraîchir
                    </button>
                    <span className="text-xs text-slate-500">{SUPER_ADMIN}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 bg-[#1a1b26]">
                {[
                    { key: 'rooms', label: `Rooms (${filteredRooms.length}/${mergedRooms.length})` },
                    { key: 'users', label: `Utilisateurs (${filteredUsers.length}/${users.length})` },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key as 'rooms' | 'users')}
                        className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === tab.key ? 'border-[#D1A07A] text-[#D1A07A]' : 'border-transparent text-slate-400 hover:text-white'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="p-6">

                {/* ──────────────── ROOMS ──────────────── */}
                {activeTab === 'rooms' && (
                    <div>
                        {/* Filtres rooms */}
                        <div className="flex flex-wrap gap-3 mb-5">
                            <input type="text" placeholder="Rechercher code, nom, hôte..." value={roomSearch}
                                onChange={e => setRoomSearch(e.target.value)}
                                className="bg-[#1a1b26] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D1A07A] placeholder-slate-500 w-64" />

                            {/* Filtre statut */}
                            <div className="flex rounded-lg overflow-hidden border border-white/10">
                                {([['all','Tous'],['lobby','Lobby'],['active','En cours'],['finished','Terminées']] as [RoomFilter,string][]).map(([k,l]) => (
                                    <button key={k} onClick={() => setRoomFilter(k)}
                                        className={`px-3 py-2 text-xs font-bold transition-colors ${roomFilter===k ? 'bg-[#D1A07A] text-dark' : 'bg-[#1a1b26] text-slate-400 hover:text-white'}`}>
                                        {l}
                                    </button>
                                ))}
                            </div>

                            {/* Tri */}
                            <select value={roomSort} onChange={e => setRoomSort(e.target.value as RoomSort)}
                                className="bg-[#1a1b26] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-[#D1A07A]">
                                <option value="created_desc">Plus récentes</option>
                                <option value="created_asc">Plus anciennes</option>
                                <option value="players_desc">Plus de joueurs</option>
                                <option value="players_asc">Moins de joueurs</option>
                                <option value="phase">Par phase</option>
                            </select>
                        </div>

                        {roomsLoading ? (
                            <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-[#D1A07A] border-t-transparent rounded-full" /></div>
                        ) : filteredRooms.length === 0 ? (
                            <div className="text-center py-16 text-slate-500">
                                <p className="font-enchanted text-4xl mb-2">Aucune room</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                {filteredRooms.map((room: MergedRoom) => (
                                    <div key={room.id} className="bg-[#1a1b26] rounded-xl border border-white/10 overflow-hidden">
                                        {/* Room header */}
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <code className="text-[#D1A07A] font-bold tracking-widest">{room.id}</code>
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${PHASE_COLORS[room.phase] || 'bg-slate-700'}`}>
                                                    {PHASE_LABELS[room.phase] || room.phase || 'Lobby'}
                                                </span>
                                                {(room.liveState?.timer ?? 0) > 0 && (
                                                    <span className="text-slate-400 text-xs font-mono">{room.liveState!.timer}s</span>
                                                )}
                                                {room.isPrivate && <span className="text-xs bg-yellow-800/40 text-yellow-300 px-2 py-0.5 rounded border border-yellow-700/30">Privé</span>}
                                                {room.isMicro && <span className="text-xs bg-blue-800/40 text-blue-300 px-2 py-0.5 rounded border border-blue-700/30">🎙</span>}
                                            </div>
                                            <div className="text-xs text-slate-400 text-right">
                                                <div>{room.name || '—'}</div>
                                                <div className="text-slate-500">{room.hostPseudo || '—'} • {room.playerCount} joueurs</div>
                                            </div>
                                        </div>

                                        {/* Players from live state OR Firestore */}
                                        <div className="p-3">
                                            {room.liveState ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                    {(room.liveState.players ?? []).map((p: LivePlayer) => {
                                                        const roleDef = p.role ? ROLES[p.role as RoleId] : null;
                                                        return (
                                                            <div key={p.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border ${p.isAlive ? 'border-white/10 bg-white/5' : 'border-red-900/30 bg-red-950/20 opacity-60'}`}>
                                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.isDisconnected ? 'bg-yellow-400 animate-pulse' : p.isAlive ? 'bg-green-400' : 'bg-red-500'}`} />
                                                                <span className={`flex-1 font-medium truncate ${!p.isAlive ? 'line-through text-slate-500' : ''}`}>
                                                                    {p.name}
                                                                    {p.id === room.liveState!.hostId && <span className="ml-1 text-[9px] text-yellow-400">H</span>}
                                                                    {p.id === room.liveState!.mayorId && <span className="ml-0.5">👑</span>}
                                                                </span>
                                                                {roleDef && (
                                                                    <span className={`text-[10px] font-bold ${CAMP_COLORS[roleDef.camp] || 'text-slate-300'} flex items-center gap-1`}>
                                                                        <div className="relative w-3.5 h-3.5"><Image src={roleDef.image} alt={roleDef.label} fill className="object-contain" /></div>
                                                                        {roleDef.label}
                                                                    </span>
                                                                )}
                                                                {p.effects?.map((e: string) => <span key={e} className="text-[8px] px-1 bg-white/10 rounded capitalize">{e}</span>)}
                                                                {!p.isAlive && p.deadAt && <span className="text-[9px] text-red-400 capitalize">{p.deadAt}</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                /* Lobby non lancé — joueurs depuis Firestore */
                                                (room.players?.length ?? 0) > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(room.players ?? []).map((p: FsPlayer) => (
                                                            <span key={p.uid} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg text-xs border border-white/10">
                                                                <div className="w-4 h-4 rounded-full overflow-hidden relative flex-shrink-0">
                                                                    <Image src={p.photoURL || '/assets/images/icones/Photo_Profil-transparent.png'} alt={p.pseudo} fill className="object-cover" />
                                                                </div>
                                                                {p.pseudo}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-600 italic">Aucun joueur</p>
                                                )
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="px-4 py-2 border-t border-white/5 text-[10px] text-slate-500 flex justify-between">
                                            <span>{room.createdAt ? new Date(room.createdAt).toLocaleString('fr-FR') : '—'}</span>
                                            <span>{room.isConfigured ? 'Configuré' : 'Non configuré'} • {(room.maxPlayers as number | undefined) ?? '?'} max</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ──────────────── USERS ──────────────── */}
                {activeTab === 'users' && (
                    <div>
                        {/* Filtres users */}
                        <div className="flex flex-wrap gap-3 mb-5">
                            <input type="text" placeholder="Rechercher pseudo ou email..." value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                className="bg-[#1a1b26] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D1A07A] placeholder-slate-500 w-72" />

                            <select value={userSort} onChange={e => setUserSort(e.target.value as UserSort)}
                                className="bg-[#1a1b26] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-[#D1A07A]">
                                <option value="points_desc">Points ↓</option>
                                <option value="points_asc">Points ↑</option>
                                <option value="alpha_asc">Pseudo A→Z</option>
                                <option value="alpha_desc">Pseudo Z→A</option>
                                <option value="games_desc">Parties jouées ↓</option>
                                <option value="wins_desc">Victoires ↓</option>
                                <option value="created_desc">Plus récents</option>
                                <option value="created_asc">Plus anciens</option>
                            </select>
                        </div>

                        {usersLoading ? (
                            <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-[#D1A07A] border-t-transparent rounded-full" /></div>
                        ) : (
                            <div className="bg-[#1a1b26] rounded-xl border border-white/10 overflow-hidden">
                                <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-white/10 text-xs text-slate-400 font-bold uppercase tracking-widest">
                                    <span>Pseudo</span><span>Email</span>
                                    <span className="text-center">Points</span><span className="text-center">V/D</span>
                                    <span className="text-center">Parties</span><span className="text-center">Fuites</span>
                                    <span>Actions</span>
                                </div>
                                {filteredUsers.map((u, idx) => (
                                    <div key={u.id} className={`grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center text-sm border-b border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                                                <Image src={u.photoURL?.startsWith('data:') ? '/assets/images/icones/Photo_Profil-transparent.png' : (u.photoURL || '/assets/images/icones/Photo_Profil-transparent.png')} alt={u.pseudo || '?'} fill className="object-cover" />
                                            </div>
                                            <span className="font-semibold truncate">{u.pseudo || '—'}</span>
                                        </div>
                                        <span className="text-slate-400 text-xs truncate">{u.email || '—'}</span>
                                        <span className="text-center font-bold text-[#D1A07A]">{u.stats?.points ?? 0}</span>
                                        <span className="text-center text-xs">
                                            <span className="text-green-400">{u.stats?.wins ?? 0}</span>
                                            <span className="text-slate-500">/</span>
                                            <span className="text-red-400">{u.stats?.losses ?? 0}</span>
                                        </span>
                                        <span className="text-center text-slate-300">{u.stats?.gamesPlayed ?? 0}</span>
                                        <span className="text-center text-orange-400">{u.stats?.fled ?? 0}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingUser(u); setEditPseudo(u.pseudo || ''); setEditPoints(u.stats?.points ?? 0); }}
                                                className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded text-xs transition-colors border border-blue-600/30">
                                                Modifier
                                            </button>
                                            <button onClick={() => handleDeleteUser(u.id, u.pseudo || u.email)}
                                                disabled={u.email === SUPER_ADMIN}
                                                className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded text-xs transition-colors border border-red-600/30 disabled:opacity-30 disabled:cursor-not-allowed">
                                                Supprimer
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 text-sm">Aucun utilisateur trouvé.</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── MODAL EDIT USER ── */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setEditingUser(null)}>
                    <div className="bg-[#1a1b26] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="font-enchanted text-2xl text-[#D1A07A] mb-4">Modifier {editingUser.pseudo}</h3>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1 block">Pseudo</label>
                                <input value={editPseudo} onChange={e => setEditPseudo(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D1A07A]" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1 block">Points</label>
                                <input type="number" value={editPoints} onChange={e => setEditPoints(parseInt(e.target.value) || 0)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D1A07A]" />
                            </div>
                            <div className="flex gap-3 mt-2">
                                <button onClick={() => setEditingUser(null)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-bold transition-colors">Annuler</button>
                                <button onClick={handleSaveUser} className="flex-1 py-2 bg-[#D1A07A] hover:bg-[#b08465] text-dark rounded-lg text-sm font-bold transition-colors">Enregistrer</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
