'use client';
import React from 'react';
import Image from 'next/image';

interface InfectedModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function InfectedModal({ isOpen, onClose }: InfectedModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-[200] flex flex-col items-center justify-center p-6 backdrop-blur-md animation-fade-in font-montserrat">
            <div className="bg-slate-900 border-2 border-red-600 p-8 rounded-2xl max-w-md w-full text-center shadow-[0_0_30px_rgba(220,38,38,0.3)] relative overflow-hidden">
                {/* Effet lugubre au fond */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('/assets/images/icones/powers/Effect_infecte.png')] bg-center bg-no-repeat bg-contain blur-sm"></div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 mb-4 drop-shadow-[0_0_15px_rgba(220,38,38,0.6)]">
                        <Image src="/assets/images/icones/powers/Effect_infecte.png" alt="Infection" width={80} height={80} className="object-contain" />
                    </div>

                    <h2 className="text-3xl font-enchanted tracking-widest text-red-500 mb-2 uppercase drop-shadow-md">
                        Morsure Infecte !
                    </h2>

                    <p className="text-white text-base mb-6 font-medium leading-relaxed">
                        Le venin coule maintenant dans vos veines... Vous êtes désormais <span className="font-extrabold text-red-500 text-lg uppercase tracking-wide">Infecté(e)</span>.
                    </p>

                    <div className="space-y-4 mb-8 text-sm">
                        <div className="bg-red-950/40 p-3 rounded-lg border border-red-500/30">
                            <p className="text-red-300">
                                <strong>Nouveau Camp :</strong> Vous faites maintenant partie du camp des LOUPS-GAROUS. Vous devez les aider à gagner !
                            </p>
                        </div>

                        <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-600">
                            <p className="text-slate-300">
                                <strong>Secret préservé :</strong> Vous ne connaissez pas l'identité des loups, mais eux savent que vous êtes de leur côté.
                            </p>
                        </div>

                        <div className="bg-green-950/40 p-3 rounded-lg border border-green-500/30">
                            <p className="text-green-300">
                                <strong>Pouvoir intact :</strong> Vous gardez l'utilisation du pouvoir de votre rôle initial !
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all uppercase tracking-wide"
                    >
                        Accepter la corruption
                    </button>
                </div>
            </div>
        </div>
    );
}
