'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ROLES, RoleId } from "@/types/roles";
import RoleCard from '@/components/game/RoleCard';
import PlayerCircleNode from '@/components/game/PlayerCircleNode';
import ProfileAvatarHeader from '@/components/profile/ProfileAvatarHeader';
import ProfileStats from '@/components/profile/ProfileStats';
import RoleInfoModal from '@/components/room/edit/RoleInfoModal';
import LoversModal from '@/components/game/LoversModal';
import InfectedModal from '@/components/game/InfectedModal';
import EndGame from '@/components/game/EndGame';
import { distributeRoles } from '@/lib/roleDistribution';
import { Player, GameState, Phase } from '@/types/game';

export default function ComponentsTestPage() {
    const [selectedRole, setSelectedRole] = useState<RoleId>('VILLAGEOIS');
    const [isCardFlipped, setIsCardFlipped] = useState(false);

    const roleDef = ROLES[selectedRole];

    // --- State pour le Modal Rôle ---
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [isLoverModalOpen, setIsLoverModalOpen] = useState(false);
    const [loverName, setLoverName] = useState('Joueur Alpha');
    const [isSameCamp, setIsSameCamp] = useState(false);

    // --- State pour le Modal Infecté ---
    const [isInfectedModalOpen, setIsInfectedModalOpen] = useState(false);

    // --- State pour le Modal Quitter ---
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

    // --- State pour le Modal Fin de Partie ---
    const [isGameOverOpen, setIsGameOverOpen] = useState(false);
    const [gameOverWinner, setGameOverWinner] = useState<string>('VILLAGEOIS');
    const [endGamePlayerCount, setEndGamePlayerCount] = useState<number>(8);

    const endGameDistribution = distributeRoles(endGamePlayerCount);
    // Flatten the distribution into an array of RoleIds
    const endGameRoles: RoleId[] = [];
    Object.entries(endGameDistribution).forEach(([role, count]) => {
        for (let i = 0; i < (count as number); i++) {
            endGameRoles.push(role as RoleId);
        }
    });

    const endGamePlayers: Player[] = endGameRoles.map((role, i) => ({
        id: `mock-end-${i}`,
        socketId: `socket-end-${i}`,
        name: `Joueur ${i + 1}`,
        role: role,
        avatarUrl: undefined,
        isReady: true,
        isHost: i === 0,
        isAlive: false,
        hasVoted: null,
        votesAgainst: 0,
        usedPowers: [],
        effects: i === 1 ? ['infected'] : [], // Mock an infected player
        stats: {
            kills: Math.floor(Math.random() * 3),
            saves: Math.floor(Math.random() * 2),
            daysSurvived: Math.floor(Math.random() * 5) + 1,
            powerUses: Math.floor(Math.random() * 2),
            points: Math.floor(Math.random() * 50) + 10,
            fled: 0,
            wins: 1,
            losses: 0,
            gamesPlayed: 1
        }
    }));

    const mockGameOverData = {
        winner: gameOverWinner,
        players: endGamePlayers
    };

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
        effects: [],
        stats: {
            kills: 0,
            saves: 0,
            daysSurvived: 0,
            powerUses: 0,
            points: 0,
            fled: 0,
            wins: 0,
            losses: 0,
            gamesPlayed: 0
        }
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
        { id: 'lover-info-modal', label: 'Modal Amoureux' },
        { id: 'infected-modal', label: 'Modal Infecté' },
        { id: 'leave-modal', label: 'Modal Quitter' },
        { id: 'game-over-modal', label: 'Modal Fin' }
    ];

    return (
        <div className="min-h-screen bg-[#fafafa] p-8 font-montserrat flex flex-col items-center relative">
            <div className="w-full max-w-5xl flex items-center justify-between mb-6">
                <h1 className="text-4xl font-extrabold text-slate-900 font-enchanted">Testeur de Composants</h1>
                <Link
                    href="/admin"
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm transition-all shadow-md hover:shadow-lg"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                    </svg>
                    Retour à l'Admin
                </Link>
            </div>

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
                            wins: 42,
                            losses: 15,
                            fled: 3,
                            gamesPlayed: 60,
                            villageWins: 25,
                            villageLosses: 5,
                            werewolfWins: 15,
                            werewolfLosses: 8,
                            soloWins: 2,
                            soloLosses: 2,
                            kills: 10,
                            saves: 5,
                            powerUses: 20,
                            daysSurvived: 30,
                            points: 150,
                            rank: 1
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

            {/* --- SECTION : MODAL AMOUREUX --- */}
            <div id="lover-info-modal" className="scroll-mt-28 w-full max-w-5xl bg-white p-6 rounded-xl shadow-md border-2 border-slate-200 mt-8">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2">Modal Informations Amoureux (Cupidon)</h2>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex flex-col gap-4 w-full md:w-1/3">
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Options du Modal Amoureux :</label>

                            <div className="mb-4">
                                <label className="block text-xs text-slate-500 mb-1">Nom du Partenaire :</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#ff69b4]"
                                    value={loverName}
                                    onChange={(e) => setLoverName(e.target.value)}
                                />
                            </div>

                            <div className="mb-4 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isSameCampCheckbox"
                                    checked={isSameCamp}
                                    onChange={(e) => setIsSameCamp(e.target.checked)}
                                    className="w-4 h-4 cursor-pointer accent-[#ff69b4]"
                                />
                                <label htmlFor="isSameCampCheckbox" className="text-sm cursor-pointer select-none">Même Camp (Victoire Équipe)</label>
                            </div>

                            <button
                                onClick={() => setIsLoverModalOpen(true)}
                                className="w-full bg-[#ff69b4] text-white px-4 py-2 rounded-md hover:bg-pink-500 transition-colors font-bold uppercase text-sm tracking-wide shadow-[0_0_10px_rgba(255,105,180,0.5)]"
                            >
                                Ouvrir le Modal Amoureux
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 p-8 bg-slate-100 rounded-xl border border-slate-300 text-center relative overflow-hidden min-h-[300px] flex items-center justify-center">
                        <p className="text-slate-500 italic">Le modal s'ouvrira en plein écran par-dessus l'interface.</p>

                        <LoversModal
                            isOpen={isLoverModalOpen}
                            onClose={() => setIsLoverModalOpen(false)}
                            loverName={loverName}
                            isSameCamp={isSameCamp}
                        />
                    </div>
                </div>
            </div>

            {/* --- SECTION : MODAL INFECTE --- */}
            <div id="infected-modal" className="scroll-mt-28 w-full max-w-5xl bg-white p-6 rounded-xl shadow-md border-2 border-slate-200 mt-8">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2">Modal Informations Infecté (Loup)</h2>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex flex-col gap-4 w-full md:w-1/3">
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Options du Modal Infecté :</label>

                            <button
                                onClick={() => setIsInfectedModalOpen(true)}
                                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500 transition-colors font-bold uppercase text-sm tracking-wide shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                            >
                                Ouvrir le Modal Infecté
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 p-8 bg-slate-100 rounded-xl border border-slate-300 text-center relative overflow-hidden min-h-[300px] flex items-center justify-center">
                        <p className="text-slate-500 italic">Le modal s'ouvrira en plein écran par-dessus l'interface.</p>

                        <InfectedModal
                            isOpen={isInfectedModalOpen}
                            onClose={() => setIsInfectedModalOpen(false)}
                        />
                    </div>
                </div>
            </div>

            {/* --- SECTION : MODAL QUITTER --- */}
            <div id="leave-modal" className="scroll-mt-28 w-full max-w-5xl bg-white p-6 rounded-xl shadow-md border-2 border-slate-200 mt-8">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2">Modal Confirmation Départ</h2>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex flex-col gap-4 w-full md:w-1/3">
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <button
                                onClick={() => setIsLeaveModalOpen(true)}
                                className="w-full bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition-colors font-bold uppercase text-sm tracking-wide shadow-[0_0_10px_rgba(0,0,0,0.2)]"
                            >
                                Ouvrir Confirmation Départ
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 p-8 bg-slate-100 rounded-xl border border-slate-300 text-center relative overflow-hidden min-h-[300px] flex items-center justify-center">
                        <p className="text-slate-500 italic">Le modal s'ouvrira en plein écran par-dessus l'interface.</p>

                        {isLeaveModalOpen && (
                            <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
                                <div className="bg-slate-900 border-2 border-slate-700 p-8 rounded-xl max-w-sm text-center shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                                    <h2 className="text-2xl font-enchanted tracking-wider text-red-500 mb-4">Quitter le village ?</h2>
                                    <p className="text-slate-300 text-sm mb-8">
                                        Êtes-vous sûr de vouloir abandonner votre village ?
                                        <br /><br />
                                        <span className="text-yellow-500 font-bold">Vous serez déconnecté de la partie.</span>
                                    </p>
                                    <div className="flex gap-4 justify-center">
                                        <button
                                            onClick={() => setIsLeaveModalOpen(false)}
                                            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded shadow transition-colors flex-1"
                                        >
                                            Rester
                                        </button>
                                        <button
                                            onClick={() => { alert("Mock: Quitter la partie"); setIsLeaveModalOpen(false); }}
                                            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow transition-colors flex-1 uppercase text-sm tracking-wide"
                                        >
                                            Quitter
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- SECTION : MODAL FIN DE PARTIE --- */}
            <div id="game-over-modal" className="scroll-mt-28 w-full max-w-5xl bg-white p-6 rounded-xl shadow-md border-2 border-slate-200 mt-8 mb-20">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2">Modal Fin de Partie</h2>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex flex-col gap-4 w-full md:w-1/3">
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Nombre de Joueurs : {endGamePlayerCount}</label>
                            <input
                                type="range"
                                min="5"
                                max="18"
                                value={endGamePlayerCount}
                                onChange={(e) => setEndGamePlayerCount(parseInt(e.target.value))}
                                className="w-full cursor-pointer accent-[#D1A07A] mb-4"
                            />

                            <label className="block text-sm font-bold text-slate-700 mb-2">Choisir le vainqueur :</label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D1A07A] mb-4"
                                value={gameOverWinner}
                                onChange={(e) => setGameOverWinner(e.target.value)}
                            >
                                <option value="VILLAGEOIS">Villageois</option>
                                <option value="LOUPS">Loups-Garous</option>
                                <option value="AMOUR">Amoureux</option>
                                <option value="LOUP_BLANC">Loup Blanc</option>
                                <option value="PYROMANE">Pyromane</option>
                                <option value="ASSASSIN">Assassin</option>
                                <option value="ANGE">Ange</option>
                            </select>

                            <button
                                onClick={() => setIsGameOverOpen(true)}
                                className="w-full bg-[#D1A07A] text-slate-900 px-4 py-2 rounded-md hover:bg-[#b08465] hover:text-white transition-colors font-bold uppercase text-sm tracking-wide shadow-[0_0_10px_rgba(209,160,122,0.5)]"
                            >
                                Ouvrir le Modal
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 p-0 rounded-xl relative overflow-hidden flex items-center justify-center">
                        {isGameOverOpen ? (
                            <div className="fixed inset-0 z-50 flex flex-col bg-white">
                                {/* Navbar header over the end game component for testing purposes to close it */}
                                <div className="absolute top-4 right-4 z-[60]">
                                    <button
                                        onClick={() => setIsGameOverOpen(false)}
                                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg shadow-lg"
                                    >
                                        Fermer (Test)
                                    </button>
                                </div>
                                <div className="flex-1 w-full relative overflow-y-auto">
                                    <EndGame
                                        gameOverData={mockGameOverData}
                                        confirmLeave={() => { alert('Mock: Quitter le village'); setIsGameOverOpen(false); }}
                                        getPlayerAvatar={(id) => '/assets/images/icones/Photo_Profil-transparent.png'}
                                        currentUserId="mock-end-0"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 bg-slate-100 rounded-xl border border-slate-300 w-full text-center h-[300px] flex items-center justify-center">
                                <p className="text-slate-500 italic">Le composant EndGame s'ouvrira en plein écran avec la distribution de rôles testée.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
