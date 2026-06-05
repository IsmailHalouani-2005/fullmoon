'use client';

import { createContext, useContext, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { User } from 'firebase/auth';
import { GameState, Phase } from '@/types/game';
import { RoleId } from '@/types/roles';

export interface GameContextValue {
    // État du jeu
    game: GameState;
    currentPhase: Phase | string;
    roomCode: string;
    isHost: boolean;
    groupConfig: any;
    dynamicRolesConfig: any;

    // Connexion
    socket: Socket | null;
    user: User | null;

    // Pouvoirs & actions
    activePower: string | null;
    setActivePower: (v: string | null) => void;
    powerTargets: string[];
    setPowerTargets: (v: string[]) => void;
    handlePowerClick: (powerId: string) => void;
    handlePlayerClick: (playerId: string) => void;

    // UI état
    isCardFlipped: boolean;
    setIsCardFlipped: (v: boolean) => void;
    setSelectedRole: (v: RoleId | null) => void;
    isInviteOpen: boolean;
    setIsInviteOpen: (v: boolean) => void;
    isPlayersListOpen: boolean;
    setIsPlayersListOpen: (v: boolean) => void;

    // Utilitaires
    getPlayerAvatar: (playerId: string, avatarUrl?: string) => string;
    speakingPlayers: Set<string>;
    copyInviteLink: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
    children: ReactNode;
    value: GameContextValue;
}

export function GameProvider({ children, value }: GameProviderProps) {
    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
}

export function useGameContext(): GameContextValue {
    const ctx = useContext(GameContext);
    if (!ctx) throw new Error('useGameContext must be used inside GameProvider');
    return ctx;
}
