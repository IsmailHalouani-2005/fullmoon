'use client';

import Image from 'next/image';

export default function RulesSection() {
    const steps = [
        { src: "/assets/images/icones/roles_distribution.png", label: "La Distribution\ndes Rôles Secrets" },
        { src: "/assets/images/icones/nuit_dormir.png", label: "La Nuit :\nLe Village s'endort..." },
        { src: "/assets/images/icones/aube_reveiller.png", label: "L'Aube :\nOn découvre qui a survécu.\nLes morts ne parlent plus." },
        { src: "/assets/images/icones/conseil_debat.png", label: "Le Conseil :\nLes survivants débattent dans\nle chat. Qui ment ? Qui dit vrai ?" },
        { src: "/assets/images/icones/verdict_vote.png", label: "Le Verdict :\nLe village vote. Le joueur ayant\nreçu le plus de voix est éliminé." }
    ];

    return (
        <section id="regles" className="w-full py-20">
            <div className="conteneur">

                <h2 className="font-enchanted text-6xl md:text-7xl text-center text-dark mb-12 underline decoration-dark/30 underline-offset-8">
                    LES LOIS DU VILLAGE
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* BUT DU JEU */}
                    <div className="border-2 border-slate-200 bg-[#F9F4DF] p-8 shadow-sm rounded-sm hover:-translate-y-1 transition-transform duration-300">
                        <h3 className="font-bold text-xl mb-4 tracking-wide text-dark">LE BUT DU JEU</h3>
                        <p className="text-dark/90 text-sm leading-relaxed font-medium">
                            Le village de FullMoon est divisé en deux camps. <br /> <u>Les Villageois</u> doivent identifier et éliminer tous les Loups-Garous.<br />
                            <u>Les Loups-Garous</u>, eux, doivent dévorer les habitants jusqu'à ce qu'ils soient les seuls survivants.
                        </p>
                        <h3 className="font-bold text-xl my-2 mt-6 tracking-wide text-dark">LA RÈGLE D'OR :</h3>
                        <p className="text-dark/90 text-sm leading-relaxed font-medium">
                            Dans Fullmoon, le silence est parfois plus suspect qu'un cri. Mais attention : celui qui accuse trop vite pourrait bien être celui qui a le plus à cacher.
                        </p>
                    </div>

                    {/* DÉROULEMENT */}
                    <div className="lg:col-span-2 border-2 border-slate-200 bg-[#F9F4DF] p-8 shadow-sm rounded-sm hover:-translate-y-1 transition-transform duration-300">
                        <h3 className="font-bold text-xl mb-6 tracking-wide text-dark">LE DÉROULEMENT D'UNE PARTIE</h3>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            {steps.map((step, idx) => (
                                <div key={idx} className="flex flex-col  text-center items-center min-w-[120px] group">
                                    <div className="relative w-32 h-32 md:w-25 md:h-25 mb-3 grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-300">
                                        <Image
                                            src={step.src}
                                            alt={step.label.split('\n')[0]}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <p className=" ml-2 text-sm md:text-xs text-dark font-bold leading-tight whitespace-pre-line">
                                        {step.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RÈGLE D'OR */}
                    {/* <div className="md:col-span-2 lg:col-span-3 border-2 border-slate-200 bg-[#F9F4DF] p-8 shadow-sm rounded-sm hover:-translate-y-1 transition-transform duration-300">
                        <h3 className="font-bold text-xl mb-2 tracking-wide text-dark">LA RÈGLE D'OR :</h3>
                        <p className="text-dark/90 text-sm leading-relaxed font-medium">
                            Dans Fullmoon, le silence est parfois plus suspect qu'un cri. Mais attention : celui qui accuse trop vite pourrait bien être celui qui a le plus à cacher.
                        </p>
                    </div> */}

                </div>
            </div>
        </section>
    );
}
