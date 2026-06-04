'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LoadingScreenProps {
    roomCode: string;
}

const STEPS = [
    "Connexion au village...",
    "Synchronisation des joueurs...",
    "Chargement des rôles...",
    "Préparation de la nuit...",
];

export default function LoadingScreen({ roomCode }: LoadingScreenProps) {
    const [stepIndex, setStepIndex] = useState(0);
    const [copied, setCopied] = useState(false);

    // Cycle through loading messages every 1.8s
    useEffect(() => {
        const interval = setInterval(() => {
            setStepIndex(prev => (prev + 1) % STEPS.length);
        }, 1800);
        return () => clearInterval(interval);
    }, []);

    const copyCode = () => {
        navigator.clipboard.writeText(roomCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="h-screen w-screen bg-primary flex flex-col items-center justify-center gap-4">
            <Image
                src="/assets/images/logo_fullmoon.png"
                alt="FullMoon"
                width={90}
                height={90}
                className="animate-pulse mb-2"
            />

            <p className="text-secondary font-enchanted text-4xl sm:text-5xl text-center">
                Connexion au village
            </p>

            {/* Animated step message */}
            <p
                key={stepIndex}
                className="text-dark/60 font-montserrat text-sm tracking-widest uppercase"
                style={{ animation: 'toast-in 0.3s ease-out' }}
            >
                {STEPS[stepIndex]}
            </p>

            {/* Room code — grand et copiable */}
            <button
                onClick={copyCode}
                className="mt-4 flex items-center gap-2 bg-dark/10 hover:bg-dark/20 transition-colors px-5 py-2 rounded-lg cursor-pointer"
                title="Copier le code"
            >
                <span className="font-montserrat text-dark/40 text-xs uppercase tracking-widest">Code salon</span>
                <span className="font-montserrat font-extrabold text-dark text-xl tracking-[0.3em]">{roomCode}</span>
                <span className="text-dark/40 text-xs">{copied ? '✓ Copié !' : '⎘'}</span>
            </button>
        </div>
    );
}
