'use client';

import { RoleId, ROLES, RoleDefinition } from '@/types/roles';
import Image from 'next/image';
import { useState } from 'react';
import RoleInfoModal from './RoleInfoModal';
import { getDefaultRolesForPlayerCount } from '@/app/room/[code]/edit/page';

interface MainContentProps {
    playerCount: number;
    setPlayerCount: (v: number) => void;
    rolesCount: Partial<Record<RoleId, number>>;
    setRolesCount: (v: Partial<Record<RoleId, number>>) => void;
    isCustom: boolean;
    setIsCustom: (v: boolean) => void;
}

export default function MainContent({
    playerCount, setPlayerCount, rolesCount, setRolesCount, isCustom, setIsCustom
}: MainContentProps) {

    const [selectedRole, setSelectedRole] = useState<RoleDefinition | null>(null);

    // Handlers for adjusting player count
    const handlePlayerCountChange = (delta: number) => {
        const newCount = playerCount + delta;
        if (newCount >= 5 && newCount <= 18) {
            setPlayerCount(newCount);
            setRolesCount(getDefaultRolesForPlayerCount(newCount));
            setIsCustom(false);
        }
    };

    return (
        <div className="flex flex-col items-center w-full max-w-5xl mx-auto h-full gap-8 pb-10">

            <h1 className="text-4xl sm:text-5xl font-enchanted text-center font-extrabold tracking-wider text-[#2C3338]">
                NOMBRE DE JOUEURS
            </h1>

            <div className="flex items-center justify-between w-full bg-white border-[3px] border-[#2C3338] rounded-lg p-2 text-2xl font-bold shadow-sm">
                <button
                    onClick={() => handlePlayerCountChange(-1)}
                    className="pl-2 pr-4 md:px-6 py-2 hover:bg-[#F3ECE0] rounded transition-colors text-3xl flex items-center justify-center font-black text-[#2C3338]"
                >
                    &lt;
                </button>

                <div className="flex-1 flex justify-center gap-12 items-center text-[#2C3338]">
                    <span className="text-slate-300 text-xl font-bold">{playerCount > 5 ? playerCount - 1 : ''}</span>
                    <span className="text-4xl px-6">{playerCount}</span>
                    <span className="text-slate-300 text-xl font-bold">{playerCount < 18 ? playerCount + 1 : ''}</span>
                </div>

                <button
                    onClick={() => handlePlayerCountChange(1)}
                    className="pl-4 pr-2 md:px-6 py-2 hover:bg-[#F3ECE0] rounded transition-colors text-3xl flex items-center justify-center font-black text-[#2C3338]"
                >
                    &gt;
                </button>
            </div>

            {/* Mode Selection Toggle */}
            <div className="mt-6 flex flex-col items-center gap-4 w-full">
                <h2 className="text-2xl font-bold text-center font-enchanted tracking-widest text-[#2C3338]">ALGORITHME DE DISTRIBUTION</h2>
                <div className="flex bg-[#2C3338] p-1.5 rounded-xl border-2 border-slate-800 shadow-inner w-full max-w-md">
                    <button
                        onClick={() => {
                            setIsCustom(false);
                            setRolesCount(getDefaultRolesForPlayerCount(playerCount));
                        }}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${!isCustom ? 'bg-[#E1C699] text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                        PAR DÉFAUT
                    </button>
                    <button
                        onClick={() => setIsCustom(true)}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${isCustom ? 'bg-[#E1C699] text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                        PERSONNALISÉ
                    </button>
                </div>
                {!isCustom && (
                    <p className="text-xs text-slate-500 font-medium italic animate-pulse">
                        * Le mode par défaut ajuste automatiquement les rôles selon le nombre de joueurs.
                    </p>
                )}
            </div>

            <h1 className="text-4xl sm:text-5xl font-enchanted text-center font-extrabold tracking-wider mt-6 text-[#2C3338]">
                {isCustom ? 'CHOISISSEZ LES RÔLES' : 'COMPOSITION DU VILLAGE'}
            </h1>
            <p className="text-xs text-slate-500 font-medium italic">
                (Cliquez sur les rôles pour voir les détails)
            </p>

            <div className={`w-full bg-white border-[2px] border-[#2C3338] rounded-xl p-8 transition-opacity duration-300 ${!isCustom ? 'opacity-80' : ''}`}>
                <RoleGroup
                    camp="VILLAGE"
                    title="Camp du VILLAGE :"
                    roles={Object.values(ROLES).filter(r => r.camp === 'VILLAGE')}
                    rolesCount={rolesCount}
                    setRolesCount={setRolesCount}
                    onRoleClick={setSelectedRole}
                    playerCount={playerCount}
                    isCustom={isCustom}
                />
                <div className="my-8 h-[1px] bg-slate-200" />
                <RoleGroup
                    camp="LOUPS"
                    title="Camp des LOUPS-GAROU :"
                    roles={Object.values(ROLES).filter(r => r.camp === 'LOUPS')}
                    rolesCount={rolesCount}
                    setRolesCount={setRolesCount}
                    onRoleClick={setSelectedRole}
                    playerCount={playerCount}
                    isCustom={isCustom}
                />
                <div className="my-8 h-[1px] bg-slate-200" />
                <RoleGroup
                    camp="SOLO"
                    title="Camp des SOLITAIRES :"
                    roles={Object.values(ROLES).filter(r => r.camp === 'SOLO')}
                    rolesCount={rolesCount}
                    setRolesCount={setRolesCount}
                    onRoleClick={setSelectedRole}
                    playerCount={playerCount}
                    isCustom={isCustom}
                />
            </div>

            {/* Modal for viewing role details */}
            {selectedRole && (
                <RoleInfoModal role={selectedRole} onClose={() => setSelectedRole(null)} />
            )}
        </div>
    );
}

// Subcomponent for Role Group
function RoleGroup({ camp, title, roles, rolesCount, setRolesCount, onRoleClick, playerCount, isCustom }: any) {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-[#2C3338]">{title}</h2>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-6">
                {roles.map((role: RoleDefinition) => {
                    const count = rolesCount[role.id] || 0;

                    const updateCount = (delta: number) => {
                        if (!isCustom) return; // Prevention

                        const currentTotal = Object.values(rolesCount).reduce((sum: number, c: any) => sum + (c || 0), 0);
                        if (delta > 0 && currentTotal >= playerCount) {
                            return;
                        }
                        const newCount = Math.max(0, count + delta);
                        setRolesCount({ ...rolesCount, [role.id]: newCount });
                    };

                    return (
                        <div key={role.id} className="flex flex-col items-center gap-2">
                            {/* Role Image */}
                            <div
                                className="w-20 h-20 relative cursor-pointer hover:scale-110 transition-transform active:scale-95"
                                onClick={() => onRoleClick(role)}
                            >
                                <Image src={role.image} alt={role.label} fill className="object-contain drop-shadow-md" />
                            </div>

                            {/* Counter */}
                            <div className={`flex items-center bg-[#E1C699] rounded-md text-sm overflow-hidden font-bold h-7 shadow-sm border border-[#2C3338]/10 transition-all ${!isCustom ? 'opacity-50 grayscale' : ''}`}>
                                {isCustom && (
                                    <button onClick={() => updateCount(-1)} className="px-2 h-full hover:bg-[#D5B888] pb-0.5 text-lg flex items-center justify-center text-[#2C3338]">-</button>
                                )}
                                <span className="bg-[#2C3338] text-white px-3 h-full flex items-center justify-center min-w-[32px]">{count}</span>
                                {isCustom && (
                                    <button onClick={() => updateCount(1)} className="px-2 h-full hover:bg-[#D5B888] pb-0.5 text-lg flex items-center justify-center text-[#2C3338]">+</button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
