'use client';

import { User } from 'firebase/auth';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useThemeStore } from '@/store/themeStore';

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
    onApplyDefaults: () => void;
    onCreateVillage: () => void;
}

export default function Sidebar({
    user, roomCode, secretCode, villageName, setVillageName, isPrivate, setIsPrivate, isMicroEnabled, setIsMicroEnabled, isMayorEnabled, setIsMayorEnabled, onApplyDefaults, onCreateVillage
}: SidebarProps) {

    const [chatMessage, setChatMessage] = useState('');
    const { isDarkMode } = useThemeStore();

    const copyCode = () => {
        navigator.clipboard.writeText(secretCode);
        alert('Code copié !');
    };

    return (
        <div className="flex flex-col h-full gap-5 ">
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

            {/* Secret Code */}
            <button
                className="bg-[#2C3338] text-white p-3.5 rounded-lg text-center font-bold tracking-widest relative group overflow-hidden transition-transform active:scale-[0.98] border border-slate-800"
                onClick={copyCode}
            >
                <span className="block group-hover:opacity-10 transition-opacity flex justify-center gap-2 items-end">
                    <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Code Secret</span>
                    <span className="text-lg tracking-widest">{secretCode}</span>
                </span>
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-sm tracking-normal opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                    <Image src="/assets/images/icones/copy_paste-icon_white.png" alt="Copier" width={14} height={14} /> Copier
                </div>
            </button>

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
