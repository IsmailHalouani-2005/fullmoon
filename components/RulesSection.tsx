'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { useThemeStore } from '../store/themeStore';

// ─── Données ─────────────────────────────────────────────────────────────────

const steps = [
    {
        src: '/assets/images/icones/roles_distribution.png',
        title: 'Les Rôles',
        label: 'Chaque joueur reçoit un rôle secret.',
    },
    {
        src: '/assets/images/icones/nuit_dormir.png',
        title: 'La Nuit',
        label: 'Le village s\'endort. Les loups frappent.',
    },
    {
        src: '/assets/images/icones/aube_reveiller.png',
        title: 'L\'Aube',
        label: 'Les victimes sont révélées. Les morts se taisent.',
    },
    {
        src: '/assets/images/icones/conseil_debat.png',
        title: 'Le Débat',
        label: 'Les survivants débattent. Qui ment ?',
    },
    {
        src: '/assets/images/icones/verdict_vote.png',
        title: 'Le Verdict',
        label: 'Le village vote. Un suspect est envoyé au bûcher.',
    },
];

const camps = [
    {
        key: 'village',
        name: 'LE VILLAGE',
        objective: 'Identifier et éliminer tous les Loups-Garous et les Solitaires dangereux. Le Fou ne peut pas être éliminé par vote, mais la Sorcière ou le Chasseur peuvent le tuer avec leurs pouvoirs.',
        victory: 'Tous les loups morts + tous les solos dangereux éliminés',
        victoryShort: 'Plus aucun loup ni solitaire dangereux en vie',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        badge: 'bg-emerald-500',
        dot: 'bg-emerald-400',
        icon: '/assets/images/icones/maison_jardin-icon.png',
        roles: [
            { name: 'Villageois', img: '/assets/images/roles/villagers/Villageois.png' },
            { name: 'Sorcière', img: '/assets/images/roles/villagers/Sorciere.png' },
            { name: 'Chasseur', img: '/assets/images/roles/villagers/Chasseur.png' },
            { name: 'Voyante', img: '/assets/images/roles/villagers/Voyante.png' },
            { name: 'Cupidon', img: '/assets/images/roles/villagers/Cupidon.png' },
            { name: 'Petite Fille', img: '/assets/images/roles/villagers/Petite_fille.png' },
        ],
    },
    {
        key: 'loups',
        name: 'LES LOUPS',
        objective: 'Dévorer les habitants jusqu\'à être aussi nombreux qu\'eux. La nuit protège vos secrets.',
        victory: 'Loups vivants ≥ Villageois vivants',
        victoryShort: 'Égaler les villageois en nombre',
        color: 'text-red-700',
        bg: 'bg-red-50',
        border: 'border-red-300',
        badge: 'bg-red-500',
        dot: 'bg-red-400',
        icon: '/assets/images/icones/loup-icon.png',
        roles: [
            { name: 'Loup-Garou', img: '/assets/images/roles/werwolves/LoupGarou.png' },
            { name: 'Loup Alpha', img: '/assets/images/roles/werwolves/Loup_Alpha.png' },
            { name: 'Grand Méchant Loup', img: '/assets/images/roles/werwolves/Grand_Mechant_Loup.png' },
            { name: 'Loup Infect', img: '/assets/images/roles/werwolves/Loup_Infect.png' },
        ],
    },
    {
        key: 'solitaires',
        name: 'LES SOLITAIRES',
        objective: 'Chaque rôle solitaire joue pour lui-même, avec sa propre règle de victoire.',
        victory: 'Condition unique par rôle',
        victoryShort: 'Condition propre à chaque rôle',
        color: 'text-purple-700',
        bg: 'bg-purple-50',
        border: 'border-purple-300',
        badge: 'bg-purple-500',
        dot: 'bg-purple-400',
        icon: '/assets/images/icones/masque_theatre-icon.png',
        roles: [
            { name: 'Fou', img: '/assets/images/roles/solos/Fou.png' },
            { name: 'Loup Blanc', img: '/assets/images/roles/werwolves/Loup_Blanc.png' },
            { name: 'Assassin', img: '/assets/images/roles/solos/Assassin.png' },
            { name: 'Pyromane', img: '/assets/images/roles/solos/Pyromane.png' },
        ],
    },
];

// ─── Composant ────────────────────────────────────────────────────────────────

export default function RulesSection() {
    const { isDarkMode } = useThemeStore();
    const sectionRef = useRef<HTMLElement>(null);

    // Animation au scroll via IntersectionObserver
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        (entry.target as HTMLElement).style.opacity = '1';
                        (entry.target as HTMLElement).style.transform = 'translateY(0)';
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 }
        );
        sectionRef.current?.querySelectorAll('.rules-animate').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const dark = isDarkMode;

    return (
        <section
            ref={sectionRef}
            id="regles"
            className={`w-full py-24 ${dark ? 'text-slate-100' : 'text-dark'}`}
            style={{
                background: dark
                    ? 'linear-gradient(180deg, #12131c 0%, #0a0b14 100%)'
                    : 'linear-gradient(180deg, #FCF8E8 0%, #ede3c8 100%)',
            }}
        >
            <div className="conteneur flex flex-col gap-16">

                {/* ── TITRE ─────────────────────────────────────────────── */}
                <div
                    className="rules-animate text-center"
                    style={{ opacity: 0, transform: 'translateY(24px)', transition: 'opacity 0.7s ease, transform 0.7s ease' }}
                >
                    <h2 className={`font-enchanted text-6xl md:text-7xl mb-3 ${dark ? 'text-[#D1A07A]' : 'text-dark'}`}>
                        LES LOIS DU VILLAGE
                    </h2>
                    <p className={`text-sm md:text-base font-medium tracking-widest uppercase ${dark ? 'text-slate-400' : 'text-dark/50'}`}>
                        Un village. Trois camps. Un seul survivra.
                    </p>
                </div>

                {/* ── BUT DU JEU ────────────────────────────────────────── */}
                <div
                    className="rules-animate"
                    style={{ opacity: 0, transform: 'translateY(24px)', transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s' }}
                >
                    <div className={`rounded-2xl border-2 p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start ${dark ? 'border-slate-700 bg-white/5' : 'border-slate-200 bg-white/60'} shadow-sm`}>
                        <div className="flex-1">
                            <h3 className={`font-enchanted text-3xl mb-3 ${dark ? 'text-[#D1A07A]' : 'text-dark'}`}>Le But du Jeu</h3>
                            <p className={`text-sm leading-relaxed font-medium ${dark ? 'text-slate-300' : 'text-dark/80'}`}>
                                Le village de FullMoon est divisé en camps secrets. Les <span className="text-emerald-600 font-bold">Villageois</span> doivent identifier et éliminer tous les <span className="text-red-600 font-bold">Loups-Garous</span>. Les loups, eux, doivent dévorer les habitants jusqu'à dominer le village. Les <span className="text-purple-600 font-bold">Solitaires</span> poursuivent leurs propres objectifs — souvent au détriment des deux camps.
                            </p>
                        </div>
                        <div className={`flex-1 border-l-0 md:border-l-2 md:pl-8 ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
                            <h3 className={`font-enchanted text-3xl mb-3 ${dark ? 'text-[#D1A07A]' : 'text-dark'}`}>La Règle d'Or</h3>
                            <p className={`text-sm leading-relaxed font-medium italic ${dark ? 'text-slate-300' : 'text-dark/80'}`}>
                                "Dans FullMoon, le silence est parfois plus suspect qu'un cri. Mais attention : celui qui accuse trop vite pourrait bien être celui qui a le plus à cacher."
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── TIMELINE ──────────────────────────────────────────── */}
                <div
                    className="rules-animate"
                    style={{ opacity: 0, transform: 'translateY(24px)', transition: 'opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s' }}
                >
                    <h3 className={`font-enchanted text-4xl text-center mb-10 ${dark ? 'text-[#D1A07A]' : 'text-dark'}`}>
                        Le Déroulement d'une Partie
                    </h3>

                    {/* Desktop : horizontal */}
                    <div className="hidden md:flex items-start justify-between relative">
                        {/* Ligne de connexion */}
                        <div
                            className={`absolute top-8 left-[10%] right-[10%] h-0.5 ${dark ? 'bg-slate-700' : 'bg-slate-300'}`}
                            style={{ zIndex: 0 }}
                        />
                        {steps.map((step, idx) => (
                            <div key={idx} className="flex flex-col items-center text-center relative z-10 w-1/5 px-2">
                                {/* Cercle numéroté */}
                                <div className="w-16 h-16 rounded-full bg-[#D1A07A] text-dark font-extrabold text-xl flex items-center justify-center shadow-md mb-3 font-montserrat border-4 border-white">
                                    {idx + 1}
                                </div>
                                {/* Icône */}
                                <div className={`relative w-20 h-20 mb-3 grayscale hover:grayscale-0 hover:scale-110 transition-all duration-300 ${dark ? 'brightness-90' : ''}`}>
                                    <Image src={step.src} alt={step.title} fill className="object-contain" />
                                </div>
                                {/* Texte */}
                                <p className={`font-bold text-sm mb-1 ${dark ? 'text-[#D1A07A]' : 'text-dark'}`}>{step.title}</p>
                                <p className={`text-xs leading-snug ${dark ? 'text-slate-400' : 'text-dark/60'}`}>{step.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Mobile : vertical */}
                    <div className="flex md:hidden flex-col gap-0">
                        {steps.map((step, idx) => (
                            <div key={idx} className="flex items-stretch gap-4">
                                {/* Colonne gauche : cercle + ligne connectée */}
                                <div className="flex flex-col items-center flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-[#D1A07A] text-dark font-extrabold text-sm flex items-center justify-center shadow-md border-2 border-white font-montserrat flex-shrink-0">
                                        {idx + 1}
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={`w-0.5 flex-1 mt-1 ${dark ? 'bg-slate-300/30' : 'bg-slate-400/40'}`} />
                                    )}
                                </div>
                                {/* Contenu */}
                                <div className="pb-6 pt-1">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="relative w-16 h-16 flex-shrink-0">
                                            <Image src={step.src} alt={step.title} fill className="object-contain" />
                                        </div>
                                        <p className={`font-bold text-base ${dark ? 'text-[#D1A07A]' : 'text-dark'}`}>{step.title}</p>
                                    </div>
                                    <p className={`text-sm leading-snug ${dark ? 'text-slate-400' : 'text-dark/60'}`}>{step.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── LES 3 CAMPS ───────────────────────────────────────── */}
                <div
                    className="rules-animate"
                    style={{ opacity: 0, transform: 'translateY(24px)', transition: 'opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s' }}
                >
                    <h3 className={`font-enchanted text-4xl text-center mb-10 ${dark ? 'text-[#D1A07A]' : 'text-dark'}`}>
                        Les Camps
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {camps.map((camp, cIdx) => (
                            <div
                                key={camp.key}
                                className="rules-animate rounded-2xl border-2 overflow-hidden shadow-sm hover:-translate-y-1 transition-transform duration-300"
                                style={{
                                    opacity: 0,
                                    transform: 'translateY(24px)',
                                    transition: `opacity 0.7s ease ${0.4 + cIdx * 0.1}s, transform 0.7s ease ${0.4 + cIdx * 0.1}s`,
                                    borderColor: dark ? undefined : undefined,
                                    background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                                }}
                            >
                                {/* Header coloré */}
                                <div className={`${camp.badge} px-6 py-4 flex items-center gap-3`}>
                                    <div className="relative w-8 h-8 flex-shrink-0">
                                        <Image src={camp.icon} alt={camp.name} fill className="object-contain brightness-0 invert" />
                                    </div>
                                    <h4 className="font-enchanted text-xl text-white tracking-wider">{camp.name}</h4>
                                </div>

                                {/* Corps */}
                                <div className="p-5 flex flex-col gap-4">
                                    {/* Objectif */}
                                    <p className={`text-sm leading-relaxed ${dark ? 'text-slate-300' : 'text-dark/80'}`}>
                                        {camp.objective}
                                    </p>

                                    {/* Victoire */}
                                    <div className={`rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-2 ${dark ? 'bg-white/10 text-slate-200' : `${camp.bg} ${camp.color} border ${camp.border}`}`}>
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${camp.dot}`} />
                                        {camp.victoryShort}
                                    </div>

                                    {/* Rôles */}
                                    <div>
                                        <p className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${dark ? 'text-slate-500' : 'text-dark/40'}`}>Rôles</p>
                                        <div className="flex flex-wrap gap-2">
                                            {camp.roles.map((role) => (
                                                <div key={role.name} className="group relative flex flex-col items-center">
                                                    <div className="relative w-10 h-10 grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-200">
                                                        <Image src={role.img} alt={role.name} fill className="object-contain" />
                                                    </div>
                                                    {/* Tooltip nom */}
                                                    <span className="absolute -bottom-5 text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black/80 text-white px-1 rounded">
                                                        {role.name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── CONDITIONS DE VICTOIRE ────────────────────────────── */}
                <div
                    className="rules-animate"
                    style={{ opacity: 0, transform: 'translateY(24px)', transition: 'opacity 0.7s ease 0.5s, transform 0.7s ease 0.5s' }}
                >
                    <h3 className={`font-enchanted text-4xl text-center mb-10 ${dark ? 'text-[#D1A07A]' : 'text-dark'}`}>
                        Conditions de Victoire
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                camp: 'Village',
                                color: 'border-emerald-400',
                                badge: 'bg-emerald-500',
                                conditions: [
                                    'Tous les loups-garous sont éliminés',
                                    'Tous les solitaires dangereux sont éliminés',
                                    'Le Fou ne peut pas être éliminé par vote du village — mais la Sorcière ou le Chasseur peuvent le tuer avec leurs pouvoirs',
                                ],
                            },
                            {
                                camp: 'Loups-Garous',
                                color: 'border-red-400',
                                badge: 'bg-red-500',
                                conditions: [
                                    'Les loups sont aussi nombreux que les villageois',
                                    'Aucun solitaire dangereux en vie',
                                    'Les joueurs infectés comptent dans le camp des loups',
                                ],
                            },
                            {
                                camp: 'Solitaires',
                                color: 'border-purple-400',
                                badge: 'bg-purple-500',
                                conditions: [
                                    'Fou : être voté au bûcher (non infecté, non amoureux)',
                                    'Loup Blanc / Assassin / Pyromane / Empoisonneur : être le dernier survivant',
                                    'Amoureux : être les 2 derniers survivants (camps différents)',
                                ],
                            },
                        ].map((vc, idx) => (
                            <div
                                key={vc.camp}
                                className={`rules-animate rounded-2xl border-2 ${vc.color} overflow-hidden shadow-sm ${dark ? 'bg-white/5' : 'bg-white/70'}`}
                                style={{
                                    opacity: 0,
                                    transform: 'translateY(24px)',
                                    transition: `opacity 0.7s ease ${0.6 + idx * 0.1}s, transform 0.7s ease ${0.6 + idx * 0.1}s`,
                                }}
                            >
                                <div className={`${vc.badge} px-5 py-3`}>
                                    <p className="font-enchanted text-xl text-white tracking-wider">{vc.camp}</p>
                                </div>
                                <ul className="p-5 flex flex-col gap-3">
                                    {vc.conditions.map((c, i) => (
                                        <li key={i} className={`flex items-start gap-2 text-sm ${dark ? 'text-slate-300' : 'text-dark/80'}`}>
                                            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${vc.badge}`} />
                                            {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
}
