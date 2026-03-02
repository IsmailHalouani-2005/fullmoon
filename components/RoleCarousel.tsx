'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ROLES, RoleDefinition } from '@/types/roles';

export default function RoleCarousel() {
    const rolesList = Object.values(ROLES);

    // Embla Carousel setup: infinite loop, aligned to center
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: true,
        align: 'center',
        skipSnaps: false
    });

    const [selectedIndex, setSelectedIndex] = useState(0);
    const [modalRole, setModalRole] = useState<RoleDefinition | null>(null);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi, setSelectedIndex]);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        emblaApi.on('select', onSelect);
        emblaApi.on('reInit', onSelect);
    }, [emblaApi, onSelect]);

    const handleRoleClick = (index: number) => {
        if (!emblaApi) return;
        if (index === selectedIndex) {
            // If clicking the center active role, open modal
            setModalRole(rolesList[index]);
        } else {
            // Else, scroll to that role
            emblaApi.scrollTo(index);
        }
    };

    const getCampColor = (camp: string) => {
        switch (camp) {
            case 'VILLAGE': return 'text-green-400';
            case 'LOUPS': return 'text-red-500';
            case 'SOLO': return 'text-purple-400';
            default: return 'text-white';
        }
    };

    return (
        <section id="roles" className="w-full bg-dark py-20 relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <h2 className="font-enchanted text-5xl md:text-7xl text-center text-primary mb-12">
                    DÉCOUVREZ LES RÔLES
                </h2>

                <div className="relative">
                    {/* Embla Viewport */}
                    <div className="overflow-hidden py-10" ref={emblaRef}>
                        <div className="flex -ml-4">
                            {rolesList.map((role, index) => {
                                const isActive = index === selectedIndex;

                                return (
                                    <div
                                        key={role.id}
                                        className="flex-[0_0_50%] sm:flex-[0_0_33.33%] md:flex-[0_0_25%] min-w-0 pl-4 flex flex-col items-center justify-center relative cursor-pointer"
                                        onClick={() => handleRoleClick(index)}
                                    >
                                        {/* Role Title (Visible only when active) */}
                                        <div className={`transition-all duration-300 mb-6 absolute -top-12 whitespace-nowrap text-center ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                                            <h3 className="font-enchanted text-4xl text-white tracking-widest">{role.label}</h3>
                                        </div>

                                        {/* Image Container with dashed border animation */}
                                        <div className={`relative isolate transition-all duration-500 rounded-full flex items-center justify-center ${isActive ? 'w-52 h-52 md:w-64 md:h-64 z-10' : 'w-32 h-32 md:w-40 md:h-40 opacity-50 grayscale hover:grayscale-0'}`}>

                                            {/* Rotating Dashed Border - Only on active */}
                                            {isActive && (
                                                <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary animate-spin-slow"></div>
                                            )}

                                            <Image
                                                src={role.image}
                                                alt={role.label}
                                                fill
                                                className="object-contain p-4 drop-shadow-2xl z-10"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center mt-8 space-x-8 text-primary/70">
                        <button
                            className="cursor-pointer flex items-center hover:text-primary transition-colors hover:-translate-x-1"
                            onClick={() => emblaApi?.scrollPrev()}
                        >
                            <span className="mr-2">←</span> précédent
                        </button>
                        <span className="font-enchanted text-center text-2xl tracking-wider text-primary">Cliquez sur le rôle pour voir les informations</span>
                        <button
                            className="cursor-pointer flex items-center hover:text-primary transition-colors hover:translate-x-1"
                            onClick={() => emblaApi?.scrollNext()}
                        >
                            suivant <span className="ml-2">→</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal Infobox */}
            {modalRole && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative bg-[#1E2325] border-2 border-primary max-w-2xl w-full rounded-md shadow-2xl p-8 md:p-12 text-center text-white">
                        <button
                            className="absolute top-4 right-4 text-primary hover:text-white transition-colors"
                            onClick={() => setModalRole(null)}
                        >
                            ✕
                        </button>

                        <div className="w-32 h-32 md:w-48 md:h-48 relative mx-auto mb-6">
                            <Image src={modalRole.image} alt={modalRole.label} fill className="object-contain" />
                        </div>

                        <h3 className="font-enchanted text-5xl md:text-7xl text-primary mb-2">{modalRole.label}</h3>
                        <span className={`text-sm md:text-base tracking-widest uppercase font-bold mb-6 block ${getCampColor(modalRole.camp)}`}>
                            Camp: {modalRole.camp}
                        </span>

                        <div className="space-y-6 text-left">
                            <div>
                                <h4 className="text-secondary font-bold text-lg mb-2 border-b border-primary/20 pb-1">Histoire</h4>
                                <p className="text-gray-300 leading-relaxed">{modalRole.description}</p>
                            </div>

                            <div>
                                <h4 className="text-secondary font-bold text-lg mb-2 border-b border-primary/20 pb-1">Capacité Spéciale</h4>
                                <p className="text-gray-300 leading-relaxed font-semibold">{modalRole.capacity}</p>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            <style jsx global>{`
        .animate-spin-slow {
          animation: spin 10s linear infinite;
        }
      `}</style>
        </section>
    );
}
