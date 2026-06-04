'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Phase } from '@/types/game';

interface PhaseTransitionOverlayProps {
    phase: Phase | string;
    dayCount: number;
}

interface PhaseDisplay {
    title: string;
    subtitle: string;
    icon: string;
    bg: string;
    textColor: string;
}

const PHASE_DISPLAY: Partial<Record<string, PhaseDisplay>> = {
    ROLE_REVEAL: {
        title: 'La Partie Commence !',
        subtitle: 'Découvrez votre rôle...',
        icon: '/assets/images/icones/Carte_Role.png',
        bg: 'bg-[#1a1b26]',
        textColor: 'text-[#D1A07A]',
    },
    MAYOR_ELECTION: {
        title: 'Élection du Maire',
        subtitle: 'Votez pour votre représentant',
        icon: '/assets/images/icones/couronne-icon.png',
        bg: 'bg-slate-900',
        textColor: 'text-yellow-300',
    },
    NIGHT: {
        title: 'La Nuit Tombe',
        subtitle: 'Les loups se réveillent...',
        icon: '/assets/images/icones/moon-icon.png',
        bg: 'bg-[#080a14]',
        textColor: 'text-white',
    },
    DAY_DISCUSSION: {
        title: 'Le Jour se Lève',
        subtitle: 'Discutez et débattez',
        icon: '/assets/images/icones/sun-icon.png',
        bg: 'bg-[#FCF8E8]',
        textColor: 'text-slate-800',
    },
    DAY_VOTE: {
        title: 'Le Bûcher',
        subtitle: 'Votez pour exécuter un suspect',
        icon: '/assets/images/icones/bucher.png',
        bg: 'bg-orange-950',
        textColor: 'text-orange-200',
    },
    HUNTER_SHOT: {
        title: 'Le Chasseur !',
        subtitle: 'Il prépare son arme...',
        icon: '/assets/images/icones/powers/fusil.png',
        bg: 'bg-slate-900',
        textColor: 'text-slate-200',
    },
    MAYOR_SUCCESSION: {
        title: 'Succession du Maire',
        subtitle: 'Le Maire choisit son successeur',
        icon: '/assets/images/icones/couronne-icon.png',
        bg: 'bg-slate-900',
        textColor: 'text-yellow-300',
    },
};

export default function PhaseTransitionOverlay({ phase, dayCount }: PhaseTransitionOverlayProps) {
    const [visible, setVisible] = useState(false);
    const [display, setDisplay] = useState<PhaseDisplay | null>(null);
    const [fading, setFading] = useState(false);
    const prevPhaseRef = useRef<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Ne pas afficher à l'initialisation (premier rendu)
        if (prevPhaseRef.current === null) {
            prevPhaseRef.current = phase as string;
            return;
        }

        // Ne pas afficher si la phase n'a pas changé
        if (prevPhaseRef.current === phase) return;
        prevPhaseRef.current = phase as string;

        const data = PHASE_DISPLAY[phase as string];
        if (!data) return;

        // Pour DAY_DISCUSSION, ajouter le numéro du jour
        const d: PhaseDisplay = phase === 'DAY_DISCUSSION' && dayCount > 1
            ? { ...data, title: `Jour ${dayCount}`, subtitle: 'Le village se réveille' }
            : data;

        // Nettoyer le timer précédent si la phase change rapidement
        if (timerRef.current) clearTimeout(timerRef.current);

        setDisplay(d);
        setFading(false);
        setVisible(true);

        // Fade out après 2s
        timerRef.current = setTimeout(() => {
            setFading(true);
            timerRef.current = setTimeout(() => setVisible(false), 500);
        }, 2000);

        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [phase, dayCount]);

    if (!visible || !display) return null;

    return (
        <div
            className={`fixed inset-0 z-[99998] flex flex-col items-center justify-center pointer-events-none transition-opacity duration-500 ${display.bg} ${fading ? 'opacity-0' : 'opacity-95'}`}
        >
            <div className="flex flex-col items-center gap-3 text-center px-8">
                <div className="relative w-20 h-20 drop-shadow-2xl" style={{ animation: 'toast-in 0.4s ease-out' }}>
                    <Image src={display.icon} alt="" fill className="object-contain" />
                </div>
                <h2
                    className={`font-enchanted text-5xl sm:text-6xl tracking-wider ${display.textColor}`}
                    style={{ animation: 'toast-in 0.5s ease-out' }}
                >
                    {display.title}
                </h2>
                <p
                    className={`font-montserrat text-sm tracking-widest uppercase opacity-70 ${display.textColor}`}
                    style={{ animation: 'toast-in 0.6s ease-out' }}
                >
                    {display.subtitle}
                </p>
            </div>
        </div>
    );
}
