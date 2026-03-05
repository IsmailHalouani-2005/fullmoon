'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useThemeStore } from '../store/themeStore';

export default function Hero() {
    const router = useRouter();
    const { isDarkMode } = useThemeStore();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, []);

    return (
        <section className={`relative w-full overflow-hidden min-h-[500px] flex items-center justify-center pb-20 pt-12`}>
            <div className="conteneur">
                {/* Container for the bordered box */}
                <div className="bg-primary relative z-10 max-w-5xl w-full mx-4 border-2 rounded-lg border-dark flex flex-col items-center justify-center p-12 text-center overflow-hidden">

                    {/* Background Moon Silhouette inside the box */}
                    <div className="absolute inset-0 z-0 flex items-center justify-center opacity-10 pointer-events-none">
                        <Image
                            src="/assets/images/icones/Icone_Loup.png"
                            alt="Background Wolf"
                            width={400}
                            height={400}
                            className="object-contain"
                        />
                    </div>

                    {/* Main Content */}
                    <div className="relative z-10">
                        <h1 className="font-enchanted text-6xl md:text-8xl lg:text-[100px] text-dark leading-none tracking-wide text-shadow-md mb-4">
                            Le village s'endort.
                        </h1>
                        <h2 className="font-enchanted text-4xl md:text-6xl text-dark leading-none tracking-wide mb-10">
                            Serez-vous la prochaine victime ?
                        </h2>

                        <button
                            onClick={() => router.push(user ? '/play' : '/auth')}
                            className="cursor-pointer bg-secondary text-white font-extrabold text-xl px-10 py-4 rounded-lg shadow-lg hover:bg-[#c9a785] transition-transform transform hover:scale-105"
                        >
                            REJOINDRE LE VILLAGE
                        </button>
                    </div>

                    {/* Silhouettes of village at the bottom of the box */}
                    <div className="absolute bottom-[-10px] left-0 right-0 w-full pointer-events-none opacity-90 mix-blend-multiply">
                        <img
                            src="/assets/images/icones/village_batiments.png"
                            alt="Village Silhouette"
                            className="w-full h-30 sm:h-30 md:h-30 object-cover object-bottom"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
