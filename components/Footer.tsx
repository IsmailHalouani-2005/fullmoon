'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full bg-dark text-white/80 py-12 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">

                {/* Left Side: Logo & Copyright */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <Link href="/">
                        <Image
                            src="/assets/images/logo_fullmoon.png"
                            alt="FullMoon Logo"
                            width={100}
                            height={100}
                            className="object-contain opacity-90 hover:opacity-100 transition-opacity mb-4"
                        />
                    </Link>
                    <p className="text-sm font-medium tracking-wide">
                        © {currentYear} Ismail Halouani — FullMoon
                    </p>
                </div>

                {/* Right Side: Links */}
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-sm font-medium">
                    <Link href="/mentions" className="hover:text-secondary transition-colors">Mentions Légales</Link>
                    <Link href="/cgu" className="hover:text-secondary transition-colors">Conditions Générales d'Utilisation</Link>
                    <Link href="/donnees" className="hover:text-secondary transition-colors">Données Personnelles</Link>
                    <Link href="/cookies" className="hover:text-secondary transition-colors">Cookies</Link>
                </div>

            </div>
        </footer>
    );
}
