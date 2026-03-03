'use client';

import { RoleDefinition } from '@/types/roles';
import Image from 'next/image';

interface RoleInfoModalProps {
    role: RoleDefinition;
    onClose: () => void;
}

const POWER_DESCRIPTIONS = [
    { pouvoir: 'FUSIL', label: "Avant de mourir, vous pouvez choisir un joueur de votre choix pour l'abattre.", role: 'CHASSEUR' },
    { pouvoir: 'POTION_SOIN', label: "Sauve la victime ciblée par les loups de la mort. (Choissiez le pour appliquer le soin.)", role: 'SORCIERE' },
    { pouvoir: 'POTION_POISON', label: "Tue un joueur de votre choix la nuit. (Choissiez le pour appliquer le poison.)", role: 'SORCIERE' },
    { pouvoir: 'COUP_DE_COEUR', label: "Rend deux joueurs amoureux au premier tour. (Choissiez deux joueurs pour appliquer le coup de coeur.)", role: 'CUPIDON' },
    { pouvoir: 'VISION_LUNAIRE', label: "Dévoile l'identité secrète d'un joueur. (Choissiez le pour appliquer la vision lunaire.)", role: 'VOYANTE' },
    { pouvoir: 'MORSURE_INFECTE', label: "Contamine la victime des loups pour qu'elle devienne loup à son tour. (Choissiez le pour appliquer la morsure infecte.)", role: 'LOUP_INFECT' },
    { pouvoir: 'DOUBLE_VOTE', label: "Votre vote au bûcher compte double.", role: 'LOUP_ALPHA' },
    { pouvoir: 'GRIFFURE_MORTELLE', label: "Tant qu'aucun loup ne meurt, vous pouvez chasser une victime supplémentaire. (Choissisez une différente victime de plus).", role: 'GRAND_MECHANT_LOUP' },
    { pouvoir: 'TRAHISON', label: "Permet d'éliminer un joueur faisant parti des loups-garous. (Choissiez un joueur pour appliquer la trahison).", role: 'LOUP_BLANC' },
    { pouvoir: 'LAME_NOIRE', label: "Permet d'éliminer n'importe quel joueur en ignorant les défenses. (Choissiez un joueur pour tuer avec la lame noire).", role: 'ASSASSIN' },
    { pouvoir: 'ESSENCE', label: "Vous aspergez un joueur d'essence. (Choissiez un joueur pour appliquer l'essence).", role: 'PYROMANE' },
    { pouvoir: 'ALLUMETTE', label: "Vous immolez tous les joueurs imbibés d'essence. (Confirmez pour déclencher l'allumette).", role: 'PYROMANE' },
    { pouvoir: 'POISON_TOXIQUE', label: "Empoisonne un joueur, le rendant muet pour le lendemain, il ne peut ni parler ni voter ni utiliser ses pouvoirs pour le prochain jour et nuit. (Choissiez un joueur pour appliquer le poison).", role: 'EMPOISONNEUR' }
];

export default function RoleInfoModal({ role, onClose }: RoleInfoModalProps) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-[#2C3338] text-white max-w-md w-full rounded-2xl p-6 border-2 border-slate-900 shadow-2xl relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                <div className="flex flex-col items-center pt-4 font-montserrat">
                    <div className="w-32 h-32 relative mb-6">
                        <Image src={role.image} alt={role.label} fill className="object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                    </div>

                    <h3 className="text-4xl font-extrabold mb-2 font-enchanted">{role.label}</h3>

                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold mb-6 border-2 ${role.camp === 'VILLAGE' ? 'border-green-500 text-green-400 bg-green-500/10' :
                        role.camp === 'LOUPS' ? 'border-red-500 text-red-400 bg-red-500/10' :
                            'border-purple-500 text-purple-400 bg-purple-500/10'
                        }`}>
                        Camp : {role.camp === 'SOLO' ? 'Solitaire' : role.camp === 'LOUPS' ? 'Loups-Garous' : 'Village'}
                    </span>

                    <div className="space-y-4 text-center w-full bg-[#1e2327] p-4 rounded-xl">
                        <div>
                            <h4 className="text-amber-400 font-bold mb-1 uppercase text-xs tracking-wider">Description</h4>
                            <p className="text-slate-300 text-sm leading-relaxed">{role.description}</p>
                        </div>
                        {role.capacity && (
                            <div className="pt-4 border-t border-slate-700">
                                <h4 className="text-amber-400 font-bold mb-1 uppercase text-xs tracking-wider">Capacité Pivot</h4>
                                <p className="text-slate-300 text-sm leading-relaxed">{role.capacity}</p>
                            </div>
                        )}
                        {(role.powers && role.powers.length > 0) && (
                            <div className="pt-4 border-t border-slate-700 text-left">
                                <h4 className="text-amber-400 font-bold mb-3 uppercase text-xs tracking-wider text-center">Pouvoirs</h4>
                                <div className="space-y-3">
                                    {role.powers.map(p => (
                                        <div key={p.id} className="flex items-start gap-3 bg-black/20 p-2 rounded-lg border border-slate-700/50">
                                            {p.icon && (
                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center border border-slate-600">
                                                    <Image src={p.icon} alt={p.label} width={20} height={20} className="object-contain" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h5 className="font-bold text-sm text-slate-200">{p.label}</h5>
                                                <p className="text-xs text-slate-400 leading-tight">
                                                    {POWER_DESCRIPTIONS.find(desc => desc.pouvoir === p.id)?.label || "Aucune description trouvée."}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
