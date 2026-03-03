'use client';
import React from 'react';
import Image from 'next/image';

interface LoversModalProps {
    isOpen: boolean;
    onClose: () => void;
    loverName: string;
    isSameCamp: boolean;
}

export default function LoversModal({ isOpen, onClose, loverName, isSameCamp }: LoversModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[200] flex flex-col items-center justify-center p-6 backdrop-blur-md animation-fade-in font-montserrat">
            <div className="bg-slate-900 border-2 border-[#ff69b4] p-8 rounded-2xl max-w-md w-full text-center shadow-[0_0_30px_rgba(255,105,180,0.3)] relative overflow-hidden">
                {/* Effet romantique / cupidon au fond */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('/assets/images/icones/powers/coup_coeur.png')] bg-center bg-no-repeat bg-contain blur-sm"></div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 mb-4 drop-shadow-[0_0_15px_rgba(255,105,180,0.6)]">
                        <Image src="/assets/images/icones/powers/coup_coeur.png" alt="Amour" width={80} height={80} className="object-contain" />
                    </div>

                    <h2 className="text-3xl font-enchanted tracking-widest text-[#ff69b4] mb-2 uppercase drop-shadow-md">
                        Coup de foudre !
                    </h2>

                    <p className="text-white text-base mb-6 font-medium leading-relaxed">
                        Cupidon a décoché sa flèche. Vous êtes désormais lié(e) pour la vie et pour la mort à <span className="font-extrabold text-[#D1A07A] text-lg uppercase tracking-wide">{loverName}</span>.
                    </p>

                    <div className="space-y-4 mb-8 text-sm">
                        <div className="bg-red-950/40 p-3 rounded-lg border border-red-500/30">
                            <p className="text-red-300">
                                <Image src="/assets/images/icones/coueur_brise.png" alt="Destin lié" width={20} height={20} className="inline-block mr-2 -mt-1" />
                                <strong>Destin lié :</strong> Si votre partenaire meurt, vous mourrez instantanément de chagrin. Protégez-le à tout prix.
                            </p>
                        </div>

                        {isSameCamp ? (
                            <div className="bg-green-950/40 p-3 rounded-lg border border-green-500/30">
                                <p className="text-green-300">
                                    <Image src="/assets/images/icones/main_main.png" alt="Alliance" width={20} height={20} className="inline-block mr-2 -mt-1" />
                                    <strong>Victoire :</strong> Vous êtes de la même alliance. Continuez à vous battre pour faire triompher votre camp.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-[#ff69b4]/10 p-3 rounded-lg border border-[#ff69b4]/30">
                                <p className="text-[#ff69b4]">
                                    <Image src="/assets/images/icones/epees_epees.png" alt="Amour Impossible" width={20} height={20} className="inline-block mr-2 -mt-1" />
                                    <strong>Amour Impossible :</strong> Vos camps sont ennemis ! Vous avez trahi les vôtres. Votre unique but est désormais de <strong>survivre jusqu'à la fin, SEULS tous les deux</strong>.
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="bg-[#ff69b4] text-white hover:bg-pink-400 text-lg font-bold px-8 py-3 rounded-xl transition-all hover:scale-105 shadow-[0_0_15px_rgba(255,105,180,0.4)] uppercase tracking-widest"
                    >
                        Accepter mon destin
                    </button>
                </div>
            </div>
        </div>
    );
}
