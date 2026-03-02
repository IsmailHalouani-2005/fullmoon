'use client';

import Image from 'next/image';
import { useState, useRef, MouseEvent } from 'react';

const cards = [
    {
        title: "Incarnez",
        description: "Recevez un rôle unique et cachez votre identité.",
        icon: "/assets/images/roles/werwolves/LoupGarou.png"
    },
    {
        title: "Analysez",
        description: "Observez les votes, lisez entre les lignes du chat.",
        icon: "/assets/images/icones/Searching_Icone.png"
    },
    {
        title: "Survivez",
        description: "Éliminez les menaces avant qu'il ne soit trop tard.",
        icon: "/assets/images/icones/Mort.png"
    }
];

    const features = [
        {
            title: "Le Jeu de Société, Réinventé",
            description: "Fullmoon adapte le grand classique du Loup-Garou dans une interface moderne et immersive. Pas besoin de cartes, juste de votre flair et de votre micro.",
            icon: "/assets/images/icones/LG_Thierceleux.png",
            align: "left"
        },
        {
            title: "Le Cycle Jour/Nuit Dynamique",
            description: "Ressentez la tension monter. Quand le soleil se couche, l'interface s'assombrit, les canaux de discussion se ferment et les prédateurs choisissent leur proie en silence.",
            icon: "/assets/images/icones/jour-et-nuit.png",
            align: "right"
        },
        {
            title: "Social & Stratégie",
            description: "Créez des salons privés pour vos amis ou affrontez des joueurs du monde entier. Utilisez le chat en temps réel et notre système de vote instantané pour mener l'enquête... ou semer le chaos.",
            icon: "/assets/images/icones/Social_Strategie.png",
            align: "left"
        }
    ];

function TiltCard({ card }: { card: any }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [rotate, setRotate] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -15; // Max 15 degrees tilt
        const rotateY = ((x - centerX) / centerX) * 15;

        setRotate({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setRotate({ x: 0, y: 0 });
        setIsHovered(false);
    };

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            style={{
                transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) ${isHovered ? 'translateZ(30px)' : 'translateZ(0px)'}`,
                transformStyle: "preserve-3d",
                willChange: "transform",
                transition: isHovered ? "transform 0.1s ease-out, padding 0.3s ease" : "transform 0.5s ease-out, padding 0.3s ease",
                padding: isHovered ? "2.5rem" : "2rem"
            }}
            className="flex flex-col items-center text-center border-2 border-slate-200 bg-white/50 backdrop-blur-sm shadow-md rounded-sm cursor-default"
        >
            <div
                style={{
                    transform: isHovered ? "translateZ(50px)" : "translateZ(0px)",
                    transformStyle: "preserve-3d",
                    transition: "transform 0.3s ease"
                }}
                className="flex flex-col items-center pointer-events-none"
            >
                <div
                    className="w-50 h-50 relative mb-6"
                    style={{
                        transform: isHovered ? "translateZ(50px) scale(1.1)" : "translateZ(0px) scale(1)",
                        transition: "transform 0.3s ease"
                    }}
                >
                    <Image
                        src={card.icon}
                        alt={card.title}
                        fill
                        className="object-contain drop-shadow-lg"
                    />
                </div>
                <h3 className="font-enchanted text-5xl text-dark mb-4">{card.title}</h3>
                <p className="text-dark font-medium text-sm leading-relaxed max-w-xs">{card.description}</p>
            </div>
        </div>
    );
}

export default function HeroCards() {
    return (
        <section id="histoire" className="w-full conteneur py-12">
            <h2 className="font-enchanted text-6xl md:text-7xl text-center text-dark mb-16 underline decoration-dark/30 underline-offset-8">
                UNE NOUVELLE FAÇON DE CHASSER
            </h2>
            <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                {features.map((card, index) => (
                    <TiltCard key={index} card={card} />
                ))}
            </div>
        </section>
    );
}
