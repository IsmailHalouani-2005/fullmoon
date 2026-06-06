'use client';

import { User } from 'firebase/auth';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useThemeStore } from '@/store/themeStore';
import { useToast } from '@/contexts/ToastContext';

interface SidebarProps {
    user: User;
    roomCode: string;
    secretCode: string;
    villageName: string;
    setVillageName: (v: string) => void;
    isPrivate: boolean;
    setIsPrivate: (v: boolean) => void;
    isMicroEnabled: boolean;
    setIsMicroEnabled: (v: boolean) => void;
    isMayorEnabled: boolean;
    setIsMayorEnabled: (v: boolean) => void;
    phaseDurations: Record<string, number>;
    setPhaseDurations: (v: Record<string, number>) => void;
    onApplyDefaults: () => void;
    onCreateVillage: () => void;
}

const formatDuration = (s: number): string => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}min ${rem}s` : `${m}min`;
};

const MAIN_PHASES = [
    { key: 'NIGHT',          label: 'La Nuit',   min: 30, max: 300, step: 15 },
    { key: 'DAY_DISCUSSION', label: 'Le Débat',  min: 30, max: 300, step: 15 },
    { key: 'DAY_VOTE',       label: 'Le Bûcher', min: 30, max: 300, step: 15 },
];

const ACTION_PHASES = [
    { key: 'MAYOR_ELECTION',   label: 'Élection du Maire',   min: 15, max: 90, step: 15 },
    { key: 'HUNTER_SHOT',      label: 'Tir du Chasseur',     min: 15, max: 90, step: 15 },
    { key: 'MAYOR_SUCCESSION', label: 'Succession du Maire', min: 15, max: 90, step: 15 },
];

export default function Sidebar({
    user, secretCode, villageName, setVillageName, isPrivate, setIsPrivate,
    isMicroEnabled, setIsMicroEnabled, isMayorEnabled, setIsMayorEnabled,
    phaseDurations, setPhaseDurations,
    onApplyDefaults, onCreateVillage
}: SidebarProps) {

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [chatMessage, setChatMessage] = useState('');
    const { isDarkMode } = useThemeStore();
    const toast = useToast();

    const copyCode = () => {
        navigator.clipboard.writeText(secretCode);
        toast.success('Code copié !');
    };

    return (
        <div className="flex flex-col h-full gap-5 overflow-y-auto pr-1">
            {/* Top Nav (Home, Settings, Group) */}
            <div className={`flex mt-4 justify-between items-center border-[3px] ${isDarkMode ? "border-white" : "border-dark"} rounded-lg py-1 px-3 bg-transparent`}>
                <Link href="/play" className="p-1 hover:bg-slate-100 rounded">
                    <Image src={isDarkMode ? "/assets/images/icones/home-icon_white.png" : "/assets/images/icones/home-icon_black.png"} alt="Accueil" width={22} height={22} />
                </Link>
                {/* <div className="flex gap-2">
                    <button className="p-1 hover:bg-slate-100 rounded"><Image src="/assets/images/icones/parametre-icon_black.png" alt="Paramètres" width={22} height={22} /></button>
                    <button className="p-1 hover:bg-slate-100 rounded"><Image src="/assets/images/icones/friends-icon_black.png" alt="Joueurs" width={22} height={22} /></button>
                </div> */}
            </div>

            {/* Creator Info */}
            <div className="flex items-center gap-3">
                <span className="font-bold text-xl">Créateur :</span>
                <div className="flex items-center gap-2 bg-[#F3ECE0] px-3 py-1.5 rounded-full border border-slate-300">
                    {/* Avatar */}
                    <div className="w-8 h-8 flex items-center justify-center rounded-full overflow-hidden bg-white border border-slate-300 relative">
                        {user.photoURL ? (
                            <Image src={user.photoURL} alt="Profil" fill className="object-cover" />
                        ) : (
                            <Image src="/assets/images/icones/Photo_Profil-transparent.png" alt="Profil" fill className="object-cover" />
                        )}
                    </div>
                    <span className="text-sm font-bold text-dark truncate max-w-[120px]">{user.displayName || user.email?.split('@')[0] || "Joueur"}</span>
                </div>
            </div>

            {/* Village Name */}
            <input
                type="text"
                placeholder="Nom du village..."
                className="w-full bg-[#2C3338] text-white placeholder-slate-400 p-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                value={villageName}
                onChange={(e) => setVillageName(e.target.value)}
            />

            {/* Public / Private Toggle */}
            <div className="flex rounded-lg p-1.5 bg-[#2C3338] border-2 border-slate-800 shadow-inner">
                <button
                    className={`flex-1 py-2.5 font-bold transition-all rounded-md ${!isPrivate ? 'bg-[#E1C699] text-slate-900 ' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                    onClick={() => setIsPrivate(false)}
                >
                    Publique
                </button>
                <button
                    className={`flex-1 py-2.5 font-bold transition-all rounded-md ${isPrivate ? 'bg-[#E1C699] text-slate-900' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                    onClick={() => setIsPrivate(true)}
                >
                    Privé
                </button>
            </div>

            {/* Secret Code — affiché uniquement si le salon est privé */}
            {isPrivate && (
                <button
                    className="w-full bg-[#2C3338] text-white py-4 px-3.5 rounded-lg text-center font-bold tracking-widest relative group overflow-hidden transition-transform active:scale-[0.98] border border-slate-800 flex-shrink-0"
                    onClick={copyCode}
                >
                    <span className="flex flex-col items-center gap-0.5 group-hover:opacity-10 transition-opacity">
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Code Secret</span>
                        <span className="text-xl tracking-[0.3em]">{secretCode}</span>
                    </span>
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-sm tracking-normal opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                        <Image src="/assets/images/icones/copy_paste-icon_white.png" alt="Copier" width={14} height={14} /> Copier
                    </div>
                </button>
            )}

            {/* Micro and Mayor Toggles */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-lg">Micro</span>
                    <button
                        className={`relative inline-flex h-8 w-14 lg:w-16 items-center rounded-full transition-colors font-bold text-[10px] ${isMicroEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                        onClick={() => setIsMicroEnabled(!isMicroEnabled)}
                    >
                        <span className={`inline-block h-5 w-5 lg:h-6 lg:w-6 transform rounded-full bg-white transition-transform ${isMicroEnabled ? 'translate-x-8 lg:translate-x-9' : 'translate-x-1'}`} />
                        <span className={`absolute text-white ${isMicroEnabled ? 'left-2' : 'right-2'}`}>
                            {isMicroEnabled ? 'ON' : 'OFF'}
                        </span>
                    </button>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">Mairie</span>
                    </div>
                    <button
                        className={`relative inline-flex h-8 w-14 lg:w-16 items-center rounded-full transition-colors font-bold text-[10px] ${isMayorEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                        onClick={() => setIsMayorEnabled(!isMayorEnabled)}
                    >
                        <span className={`inline-block h-5 w-5 lg:h-6 lg:w-6 transform rounded-full bg-white transition-transform ${isMayorEnabled ? 'translate-x-8 lg:translate-x-9' : 'translate-x-1'}`} />
                        <span className={`absolute text-white ${isMayorEnabled ? 'left-2' : 'right-2'}`}>
                            {isMayorEnabled ? 'ON' : 'OFF'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Durée des phases */}
            <div className="flex flex-col gap-4">
                <h3 className="font-bold text-base tracking-wide">Durée des phases</h3>

                {/* Phases principales */}
                <div className="flex flex-col gap-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Phases principales (30s – 5min)</p>
                    {MAIN_PHASES.map(({ key, label, min, max, step }) => (
                        <div key={key} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium">{label}</span>
                                <span className="font-extrabold text-[#D1A07A] text-sm min-w-[52px] text-right">
                                    {formatDuration(phaseDurations[key])}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={min} max={max} step={step}
                                value={phaseDurations[key]}
                                onChange={e => setPhaseDurations({ ...phaseDurations, [key]: parseInt(e.target.value) })}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D1A07A] bg-slate-600"
                            />
                        </div>
                    ))}
                </div>

                {/* Phases d'action */}
                <div className="flex flex-col gap-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Phases d{"'"}action (15s – 1min30)</p>
                    {ACTION_PHASES.map(({ key, label, min, max, step }) => (
                        <div key={key} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium">{label}</span>
                                <span className="font-extrabold text-[#D1A07A] text-sm min-w-[52px] text-right">
                                    {formatDuration(phaseDurations[key])}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={min} max={max} step={step}
                                value={phaseDurations[key]}
                                onChange={e => setPhaseDurations({ ...phaseDurations, [key]: parseInt(e.target.value) })}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D1A07A] bg-slate-600"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Default Settings Button */}
            <button
                onClick={onApplyDefaults}
                className="w-full bg-[#E1C699] hover:bg-[#D5B888] p-1 text-slate-800 font-bold py-3 rounded-lg transition-colors border-2 border-transparent shadow-[0_4px_10px_-1px_#2D3436]  active:translate-y-1 "
            >
                Choisir les paramètres par défaut
            </button>

            {/* Create Village Button */}
            <button
                onClick={onCreateVillage}
                className="w-full bg-white hover:bg-slate-50 text-slate-900 font-black text-xl py-4 border-3 border-dark rounded-lg transition-colors transition-transform hover:translate-y-[-1px] mt-2"
            >
                CRÉER LE VILLAGE
            </button>

            {/* Chat Box */}
            {/* <div className="mt-auto border-[3px] border-slate-900 rounded-xl bg-[#FFF9E6] h-64 flex flex-col pt-1 pl-1 pb-1">
                <div className="flex-1 p-2 overflow-y-auto">
                    
                </div>
                <div className="p-2 flex items-center bg-white rounded-lg border border-slate-200 mr-1 mt-1">
                    <input
                        type="text"
                        placeholder="Écrivez votre message..."
                        className="flex-1 bg-transparent text-sm focus:outline-none px-2 text-slate-700"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                    />
                    <button className="text-slate-500 hover:text-slate-900">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </div> */}
        </div>
    );
}
