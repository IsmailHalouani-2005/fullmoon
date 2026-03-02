'use client';

import Image from 'next/image';

export default function InfoSection() {
    const features = [
        {
            title: "Le Jeu de Société, Réinventé :",
            text: "Fullmoon adapte le grand classique du Loup-Garou dans une interface moderne et immersive. Pas besoin de cartes, juste de votre flair et de votre micro.",
            image: "/assets/images/icones/LG_Thierceleux.png",
            align: "left"
        },
        {
            title: "Le Cycle Jour/Nuit Dynamique :",
            text: "Ressentez la tension monter. Quand le soleil se couche, l'interface s'assombrit, les canaux de discussion se ferment et les prédateurs choisissent leur proie en silence.",
            image: "/assets/images/icones/jour-et-nuit.png",
            align: "right"
        },
        {
            title: "Social & Stratégie :",
            text: "Créez des salons privés pour vos amis ou affrontez des joueurs du monde entier. Utilisez le chat en temps réel et notre système de vote instantané pour mener l'enquête... ou semer le chaos.",
            image: "/assets/images/icones/Social_Strategie.png",
            align: "left"
        }
    ];

    return (
        <section className="w-full conteneur py-24">
            <div className="max-w-6xl mx-auto px-4">

                <h2 className="font-enchanted text-6xl md:text-7xl text-center text-dark mb-16 underline decoration-dark/30 underline-offset-8">
                    UNE NOUVELLE FAÇON DE CHASSER
                </h2>

                <div className="space-y-20">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className={`flex flex-col md:flex-row items-center gap-12 ${feature.align === 'right' ? 'md:flex-row-reverse' : ''}`}
                        >
                            <div className="w-full md:w-1/3 flex justify-center">
                                <div className="relative w-72 h-72">
                                    <Image
                                        src={feature.image}
                                        alt={feature.title}
                                        fill
                                        className="object-contain drop-shadow-lg"
                                    />
                                </div>
                            </div>

                            <div className="w-full md:w-2/3 text-center md:text-left">
                                <h3 className="font-bold text-2xl mb-4 text-dark font-montserrat">{feature.title}</h3>
                                <p className="text-dark/80 text-lg leading-relaxed font-medium">
                                    {feature.text}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
