'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useThemeStore } from '../store/themeStore';

interface HeaderProps {
    onQuickJoin?: () => void;
    isDark?: boolean;
}

export default function Header({ onQuickJoin, isDark = false }: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { isDarkMode } = useThemeStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, []);

    const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        e.preventDefault();
        setIsMobileMenuOpen(false);

        if (pathname !== '/') {
            router.push(`/#${targetId}`);
        } else {
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    return (
        <header className={` text-sm sticky top-0 z-50 ${isDark || isDarkMode ? 'text-white' : 'text-dark'}`}>
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                {/* Logo */}
                <div className="flex-shrink-0">
                    <Link href="/">
                        <Image
                            src="/assets/images/logo_fullmoon.png"
                            alt="FullMoon Logo"
                            width={80}
                            height={80}
                            className="object-contain drop-shadow-lg"
                        />
                    </Link>
                </div>

                {/* Hamburger Button (Mobile) */}
                <div className="md:hidden flex items-center">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className={`focus:outline-none cursor-pointer`}
                        aria-label="Toggle menu"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            {isMobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Navigation (Desktop) */}
                <nav className="hidden backdrop-blur-md md:flex items-center space-x-12 py-4 px-8 rounded-lg">
                    <div className="flex items-center space-x-4 border-2 gap-4 border-slate-200 rounded-lg py-3 px-8 shadow-md">
                        <Link
                            href="/#histoire"
                            onClick={(e) => handleScroll(e, 'histoire')}
                            className={`font-bold tracking-wider hover:text-secondary transition-colors`}
                        >
                            C'EST QUOI ?
                        </Link>
                        <Link
                            href="/#regles"
                            onClick={(e) => handleScroll(e, 'regles')}
                            className={`font-bold tracking-wider hover:text-secondary transition-colors`}
                        >
                            RÈGLES
                        </Link>
                        <Link
                            href="/#roles"
                            onClick={(e) => handleScroll(e, 'roles')}
                            className={`font-bold tracking-wider hover:text-secondary transition-colors`}
                        >
                            RÔLES
                        </Link>
                        <Link
                            href="/#leaderboard"
                            onClick={(e) => handleScroll(e, 'leaderboard')}
                            className={`font-bold tracking-wider hover:text-secondary transition-colors`}
                        >
                            CLASSEMENT
                        </Link>
                    </div>

                    {pathname !== '/play' ? (

                        <button
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                router.push(user ? '/play' : '/auth');
                            }}
                            className={`cursor-pointer !text-white font-bold px-12 py-3 rounded-md shadow-md transition-colors bg-[#E3D1A5] text-dark hover:bg-[#c9a785]`}
                        >
                            JOUER
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                if (onQuickJoin) {
                                    onQuickJoin();
                                } else {
                                    router.push(user ? '/play' : '/auth');
                                }
                            }}
                            className={`cursor-pointer !text-white font-bold px-12 py-3 rounded-md shadow-md transition-colors bg-secondary hover:bg-[#c9a785]`}
                        >
                            PARTIE RAPIDE
                        </button>
                    )}
                </nav>
            </div>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-20 right-5  bg-transparent backdrop-blur-md p-6 border-2 border-slate-200 rounded-lg flex flex-col items-center space-y-6 z-40">
                    <Link
                        href="/#histoire"
                        onClick={(e) => handleScroll(e, 'histoire')}
                        className={`font-bold tracking-wider hover:text-secondary transition-colors`}
                    >
                        C'EST QUOI ?
                    </Link>
                    <Link
                        href="/#regles"
                        onClick={(e) => handleScroll(e, 'regles')}
                        className={`font-bold tracking-wider hover:text-secondary transition-colors`}
                    >
                        RÈGLES
                    </Link>
                    <Link
                        href="/#roles"
                        onClick={(e) => handleScroll(e, 'roles')}
                        className={`font-bold tracking-wider hover:text-secondary transition-colors`}
                    >
                        RÔLES
                    </Link>
                    <Link
                        href="/#leaderboard"
                        onClick={(e) => handleScroll(e, 'leaderboard')}
                        className={`font-bold tracking-wider hover:text-secondary transition-colors`}
                    >
                        CLASSEMENT
                    </Link>


                    {pathname !== '/play' ? (

                        <button
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                router.push(user ? '/play' : '/auth');
                            }}
                            className={`cursor-pointer !text-white font-bold px-12 py-3 rounded-md shadow-md transition-colors bg-[#E3D1A5] text-dark hover:bg-[#c9a785]`}
                        >
                            JOUER
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                if (onQuickJoin) {
                                    onQuickJoin();
                                } else {
                                    router.push(user ? '/play' : '/auth');
                                }
                            }}
                            className={`cursor-pointer !text-white font-bold px-12 py-3 rounded-md shadow-md transition-colors bg-secondary hover:bg-[#c9a785]`}
                        >
                            PARTIE RAPIDE
                        </button>
                    )}
                </div>
            )}
        </header>
    );
}
