'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ROLES, RoleId } from "@/types/roles";
import RoleCard from '@/components/game/RoleCard';
import PlayerCircleNode from '@/components/game/PlayerCircleNode';
import ProfileAvatarHeader from '@/components/profile/ProfileAvatarHeader';
import ProfileStats from '@/components/profile/ProfileStats';
import RoleInfoModal from '@/components/room/edit/RoleInfoModal';
import { Player, GameState, Phase } from '@/types/game';

export default function ComponentsTestPage() {
    const [selectedRole, setSelectedRole] = useState<RoleId>('VILLAGEOIS');
    const [isCardFlipped, setIsCardFlipped] = useState(false);

    const roleDef = ROLES[selectedRole];

    // --- State pour le Modal Rôle ---
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- State pour le Cercle Joueur ---
    const [playerCount, setPlayerCount] = useState<number>(5);
    const [circlePhase, setCirclePhase] = useState<Phase>('DAY_VOTE');
    const [mockTargetId, setMockTargetId] = useState<string | null>(null);

    // Generation des joueurs factices
    const mockPlayers: Player[] = Array.from({ length: playerCount }).map((_, i) => ({
        id: `mock-${i}`,
        socketId: `socket-${i}`,
        name: `Joueur ${i + 1}`,
        avatarUrl: undefined,
        isReady: true,
        isHost: i === 0,
        role: i === 0 ? 'VILLAGEOIS' : (i === 1 ? 'LOUP_GAROU' : null),
        hasVoted: mockTargetId === `mock-${i}` ? 'mock-0' : null,
        votesAgainst: mockTargetId === `mock-${i}` ? 1 : 0,
        isAlive: i !== playerCount - 1,
        usedPowers: [],
        effects: []
    }));

    const mockGame: GameState = {
        roomCode: 'MOCK',
        players: mockPlayers,
        phase: circlePhase,
        hostId: 'mock-0',
        mayorId: 'mock-0',
        votes: mockTargetId ? { 'mock-1': mockTargetId } : {},
        chatMessages: [],
        timer: 30,
        dayCount: 1,
        isPrivate: false,
        secretCode: '1234',
        nightActions: [],
        lastActivity: Date.now()
    };

    const handleMockVote = (id: string) => {
        if (mockTargetId === id) {
            setMockTargetId(null);
        } else {
            setMockTargetId(id);
        }
    };

    const navItems = [
        { id: 'role-card', label: 'Carte de Rôle' },
        { id: 'player-circle', label: 'Cercle des Joueurs' },
        { id: 'profile-components', label: 'Profil Joueur' },
        { id: 'role-info-modal', label: 'Modal Info Rôle' },
    ];

    return (
        <div className="min-h-screen bg-[#fafafa] p-8 font-montserrat flex flex-col items-center relative">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-6 font-enchanted">Testeur de Composants</h1>

            {/* Navigation Menu */}
            <div className="w-full max-w-5xl bg-slate-900 rounded-xl p-4 shadow-md flex flex-wrap gap-4 justify-center mb-8 sticky top-4 z-50">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-md text-sm font-bold transition-all border border-slate-700 hover:border-slate-500"
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div id="role-card" className="scroll-mt-28 w-full max-w-5xl bg-white p-6 rounded-xl shadow-md border-2 border-slate-200">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2">Carte de Révélation de Rôle</h2>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Controles de la carte */}
                    <div className="flex flex-col gap-4 w-full md:w-1/3">
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Choisir un Rôle à prévisualiser :</label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D1A07A]"
                                value={selectedRole}
                                onChange={(e) => {
                                    setSelectedRole(e.target.value as RoleId);
                                    setIsCardFlipped(false); // Reset flip on change
                                }}
                            >
                                {Object.values(ROLES).map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.label} ({r.camp})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <label className="block text-sm font-bold text-slate-700 mb-2">État de la carte :</label>
                            <button
                                onClick={() => setIsCardFlipped(!isCardFlipped)}
                                className="w-full bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition-colors font-bold uppercase text-sm tracking-wide"
                            >
                                {isCardFlipped ? 'Masquer la carte' : 'Révéler la carte'}
                            </button>
                        </div>

                        <div className="text-sm text-slate-500 italic p-2">
                            Note : Vous pouvez aussi cliquer directement sur la carte pour la retourner, exactement comme dans le jeu.
                        </div>
                    </div>

                    {/* Affichage du composant (isolé du jeu) */}
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 rounded-xl relative overflow-hidden perspective-1000 w-full">
                        {/* Fake background decoration to simulate the room */}
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>

                        <h3 className="text-3xl sm:text-4xl font-extrabold tracking-widest mb-8 text-white font-enchanted drop-shadow-md z-10">Découvrez votre Rôle</h3>

                        <RoleCard
                            roleId={selectedRole}
                            isCardFlipped={isCardFlipped}
                            onFlip={() => setIsCardFlipped(true)}
                            showCapacity={true}
                            className="w-[240px] sm:w-[320px] z-10"
                        />

                        <button
                            className="mt-8 text-sm text-slate-300 font-bold bg-white/10 px-4 py-2 rounded-full shadow-sm hover:bg-white/20 transition-colors z-10"
                            onClick={() => setIsCardFlipped(false)}
                        >
                            Réinitialiser la carte
                        </button>
                    </div>
                </div>
            </div>

            {/* --- SECTION : CERCLE DES JOUEURS --- */}
            <div id="player-circle" className="scroll-mt-28 w-full max-w-5xl bg-white p-6 rounded-xl shadow-md border-2 border-slate-200 mt-8">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2">Cercle des Joueurs</h2>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Controles du cercle */}
                    <div className="flex flex-col gap-4 w-full md:w-1/3">
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Nombre de Joueurs : {playerCount}</label>
                            <input
                                type="range"
                                min="5"
                                max="18"
                                value={playerCount}
                                onChange={(e) => setPlayerCount(parseInt(e.target.value))}
                                className="w-full cursor-pointer accent-[#D1A07A]"
                            />
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Phase en cours :</label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D1A07A]"
                                value={circlePhase}
                                onChange={(e) => {
                                    setCirclePhase(e.target.value as Phase);
                                    setMockTargetId(null); // Reset votes on phase change
                                }}
                            >
                                <option value="LOBBY">LOBBY (Attente)</option>
                                <option value="ROLE_REVEAL">Révélation des rôles</option>
                                <option value="NIGHT">Nuit</option>
                                <option value="DAY_DISCUSSION">Jour - Discussion</option>
                                <option value="MAYOR_ELECTION">Élection Maire</option>
                                <option value="DAY_VOTE">Jour - Vote</option>
                                <option value="GAME_OVER">Fin de partie</option>
                            </select>
                        </div>

                        <div className="text-sm text-slate-500 italic p-2 space-y-2">
                            <p>Joueur 1 : Maire (Couronne), Hôte (Bordure dorée au LOBBY).</p>
                            <p>Dernier Joueur : Mort (Grisé, barré).</p>
                            <p>Votez (cliquez) sur un joueur pour simuler la mécanique de Toggle (annulation de vote).</p>
                        </div>
                    </div>

                    {/* Affichage du composant Cercle */}
                    <div className={`flex-1 flex flex-col items-center justify-center p-8 rounded-xl relative overflow-hidden min-h-[500px] w-full transition-colors duration-1000 ${circlePhase === 'NIGHT' ? 'bg-slate-900 border-2 border-slate-700' : 'bg-[#FCF8E8] border-2 border-slate-300'}`}>

                        {/* Le conteneur du cercle (Responsive) */}
                        <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center">
                            {mockGame.players.map((player, index) => (
                                <PlayerCircleNode
                                    key={player.id}
                                    player={player}
                                    index={index}
                                    totalPlayers={mockGame.players.length}
                                    game={mockGame}
                                    currentPhase={circlePhase}
                                    currentUser={null} // Pas d'user spécifique pour le test
                                    mockCanVote={circlePhase === 'DAY_VOTE' || circlePhase === 'MAYOR_ELECTION' || circlePhase === 'NIGHT'} // Force enable click on test
                                    onVote={handleMockVote}
                                    mockRoleDef={index === 0 ? ROLES['VILLAGEOIS'] : (index === 1 ? ROLES['LOUP_GAROU'] : undefined)}
                                    getPlayerAvatar={() => "/assets/images/icones/Photo_Profil-transparent.png"}
                                />
                            ))}
                        </div>

                    </div>
                </div>
            </div>

            {/* --- SECTION : COMPOSANTS DE PROFIL --- */}
            <div id="profile-components" className="scroll-mt-28 w-full max-w-5xl bg-white p-6 rounded-xl shadow-md border-2 border-slate-200 mt-8">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2">Composants de Profil Joueur</h2>

                <div className="flex flex-col gap-8 w-full bg-[#181a1b] p-8 rounded-xl relative border-4 border-slate-700">
                    <h3 className="text-white text-center font-bold text-lg mb-4 underline decoration-[#D1A07A] underline-offset-4">En-tête & Actions</h3>
                    {/* Mock Profile Header */}
                    <div className="w-full relative shadow-2xl">
                        <ProfileAvatarHeader
                            playerId="mock-test-id-12345"
                            playerData={{ pseudo: "Testeur Fou", photoURL: "" }}
                            currentUser={{ uid: "admin-uid" }}
                            isFriend={true}
                            hasBlockedMe={false}
                            isBlocked={false}
                            hasPendingRequest={false}
                            unreadCount={3}
                            onMessage={() => alert("Mock: Message Clicked")}
                            onRemoveFriend={() => alert("Mock: Remove Friend Clicked")}
                            onSendFriendRequest={() => alert("Mock: Send Request Clicked")}
                            onBlockPlayer={() => alert("Mock: Block Player Clicked")}
                            onGoBack={() => alert("Mock: Go Back Clicked")}
                        />
                    </div>

                    <div className="w-full h-px bg-white/20 my-4"></div>

                    <h3 className="text-white text-center font-bold text-lg mb-4 underline decoration-[#D1A07A] underline-offset-4">Bloc de Statistiques</h3>
                    {/* Mock Profile Stats */}
                    <ProfileStats
                        stats={{
                            totalWins: 42,
                            totalLosses: 15,
                            totalLeaves: 3,
                            villageWins: 25,
                            villageLosses: 5,
                            werewolfWins: 15,
                            werewolfLosses: 8,
                            soloWins: 2,
                            soloLosses: 2,
                            rank: "Loup Alpha"
                        }}
                    />
                </div>
            </div>

            {/* --- SECTION : MODAL INFO ROLE --- */}
            <div id="role-info-modal" className="scroll-mt-28 w-full max-w-5xl bg-white p-6 rounded-xl shadow-md border-2 border-slate-200 mt-8">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2">Modal Informations Rôle</h2>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex flex-col gap-4 w-full md:w-1/3">
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Choisir un Rôle pour le modal :</label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D1A07A] mb-4"
                                value={selectedRole}
                                onChange={(e) => {
                                    setSelectedRole(e.target.value as RoleId);
                                    setIsCardFlipped(false); // Optionnel, pour resetter la carte plus haut en même temps
                                }}
                            >
                                {Object.values(ROLES).map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.label} ({r.camp})
                                    </option>
                                ))}
                            </select>

                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="w-full bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition-colors font-bold uppercase text-sm tracking-wide"
                            >
                                Ouvrir le Modal
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 p-8 bg-slate-100 rounded-xl border border-slate-300 text-center relative overflow-hidden min-h-[300px] flex items-center justify-center">
                        <p className="text-slate-500 italic">Le modal s'ouvrira en plein écran par-dessus l'interface.</p>

                        {isModalOpen && (
                            <RoleInfoModal role={roleDef} onClose={() => setIsModalOpen(false)} />
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
