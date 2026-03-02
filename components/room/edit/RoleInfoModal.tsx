'use client';

import { RoleDefinition } from '@/types/roles';
import Image from 'next/image';

interface RoleInfoModalProps {
    role: RoleDefinition;
    onClose: () => void;
}

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
                            <div className="pt-2 border-t border-slate-700">
                                <h4 className="text-amber-400 font-bold mb-1 uppercase text-xs tracking-wider">Capacité Pivot</h4>
                                <p className="text-slate-300 text-sm leading-relaxed">{role.capacity}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
