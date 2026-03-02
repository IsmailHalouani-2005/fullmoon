'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Leaderboard() {
    const [topPlayers, setTopPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const usersRef = collection(db, "users");
                const q = query(usersRef, orderBy("score", "desc"), limit(10));
                const querySnapshot = await getDocs(q);

                const players: any[] = [];
                querySnapshot.forEach((doc) => {
                    players.push({ id: doc.id, ...doc.data() });
                });

                setTopPlayers(players);
            } catch (error) {
                console.error("Error fetching leaderboard: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    if (loading) {
        return (
            <section className="w-full py-24 flex justify-center">
                <div className="text-dark font-enchanted text-3xl animate-pulse">Chargement du classement...</div>
            </section>
        );
    }

    if (topPlayers.length === 0) return null;

    const podium = [
        topPlayers[1], // 2nd place (left)
        topPlayers[0], // 1st place (center)
        topPlayers[2], // 3rd place (right)
    ];

    return (
        <section className="w-full py-24">
            <div className="max-w-6xl mx-auto px-4 ">

                <h2 className="font-enchanted text-5xl md:text-7xl text-center text-dark mb-16 underline decoration-dark/30 underline-offset-8">
                    TOP 10 DES MEILLEURS JOUEURS
                </h2>

                <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">

                    {/* PODIUM (Left Side) */}
                    <div className="w-full lg:w-1/2 flex justify-center relative min-h-[400px]">
                        <div className="absolute bottom-0 w-[120%] md:w-[80%] max-w-[500px]">
                            <Image
                                src="/assets/images/icones/podium_vide.png"
                                alt="Podium"
                                width={500}
                                height={300}
                                className="w-full h-auto object-contain"
                            />
                        </div>

                        {/* 3rd Place Avatar (Left on image "3") */}
                        {podium[2] && (
                            <div className="absolute bottom-[55%] left-[18%] w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-amber-700 bg-secondary flex items-center justify-center overflow-hidden z-10 transition-transform hover:scale-105">
                                <Image src={podium[2].photo_profil || "/assets/images/icones/Photo_Profil-transparent.png"} alt="3rd Place" fill className="object-cover p-2" />
                            </div>
                        )}

                        {/* 1st Place Avatar (Center "1") */}
                        {podium[1] && (
                            <div className="absolute bottom-[75%] left-[50%] -translate-x-1/2 w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-yellow-400 bg-secondary flex items-center justify-center overflow-hidden z-20 shadow-xl transition-transform hover:scale-110">
                                <Image src={podium[1].photo_profil || "/assets/images/icones/Photo_Profil-transparent.png"} alt="1st Place" fill className="object-cover p-2" />
                            </div>
                        )}

                        {/* 2nd Place Avatar (Right on image "2") */}
                        {podium[0] && (
                            <div className="absolute bottom-[55%] right-[18%] w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-slate-400 bg-secondary flex items-center justify-center overflow-hidden z-10 transition-transform hover:scale-105">
                                <Image src={podium[0].photo_profil || "/assets/images/icones/Photo_Profil-transparent.png"} alt="2nd Place" fill className="object-cover p-2" />
                            </div>
                        )}
                    </div>

                    {/* TABLE (Right Side) */}
                    <div className="w-full lg:w-1/2">
                        <div className="bg-dark rounded-md p-6 sm:p-8 shadow-2xl">
                            <div className="grid grid-cols-[1fr_3fr_1fr] text-white border-b border-white/20 pb-4 mb-4 text-sm sm:text-base font-bold tracking-widest uppercase gap-2">
                                <div className="text-center border-r border-white/20">Rang</div>
                                <div className="text-center border-r border-white/20">Joueur</div>
                                <div className="text-center">Points</div>
                            </div>

                            <div className="flex flex-col space-y-3">
                                {topPlayers.map((player, index) => (
                                    <div key={player.id} className="grid grid-cols-[1fr_3fr_1fr] items-center py-2 text-white/90 hover:bg-white/10 rounded-sm transition-colors cursor-default gap-2">
                                        <div className="text-center font-bold text-lg">{index + 1}</div>
                                        <div className="flex items-center justify-start sm:justify-center pl-2 sm:pl-0 space-x-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded-full bg-secondary outline outline-2 outline-white/20 overflow-hidden relative flex-shrink-0">
                                                <Image src={player.photo_profil || "/assets/images/icones/Photo_Profil-transparent.png"} alt="avatar" fill className="object-cover" />
                                            </div>
                                            <span className="font-semibold text-sm sm:text-base truncate">{player.nom || `Joueur ${index + 1}`}</span>
                                        </div>
                                        <div className="text-center font-mono font-medium text-secondary">{player.score}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
