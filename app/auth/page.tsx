'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function AuthPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pseudo, setPseudo] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const isAuthenticatingRef = useRef(false);

    // Redirect to /play if already connected
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && !isAuthenticatingRef.current) {
                router.push('/play');
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // Login
                await signInWithEmailAndPassword(auth, email, password);
                router.push('/play');
            } else {
                // Register
                if (!pseudo.trim()) {
                    throw new Error("Le pseudo est obligatoire.");
                }
                isAuthenticatingRef.current = true;
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Update profile with pseudo
                await updateProfile(user, {
                    displayName: pseudo
                });

                // Create user document in Firestore
                await setDoc(doc(db, "users", user.uid), {
                    pseudo: pseudo,
                    email: email,
                    points: 0,
                    photoURL: user.photoURL || "/assets/images/icones/Photo_Profil-transparent.png",
                    createdAt: new Date().toISOString()
                });

                router.push('/play');
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Cet email est déjà utilisé.');
            } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                setError('Email ou mot de passe incorrect.');
            } else if (err.code === 'auth/weak-password') {
                setError('Le mot de passe doit faire au moins 6 caractères.');
            } else {
                setError(err.message || "Une erreur est survenue.");
            }
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setError('');
        setLoading(true);
        const provider = new GoogleAuthProvider();

        try {
            isAuthenticatingRef.current = true;
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user document exists, if not, create it
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                await setDoc(userDocRef, {
                    pseudo: user.displayName || "Joueur Inconnu",
                    email: user.email,
                    points: 0,
                    photoURL: user.photoURL || "/assets/images/icones/Photo_Profil-transparent.png",
                    createdAt: new Date().toISOString()
                });
            }

            router.push('/play');
        } catch (err: any) {
            console.error(err);
            setError("Erreur avec l'authentification Google.");
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark w-full flex items-center justify-center">
                <p className="text-secondary font-enchanted text-4xl animate-pulse">Chargement en cours...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
            {/* Background Image (same style as Hero if desired or plain dark) */}
            <div className="absolute inset-0 z-0 bg-dark">
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/images/icones/village_batiments.png')", backgroundPosition: "bottom", backgroundSize: "cover", backgroundRepeat: "no-repeat" }}></div>
            </div>

            <div className="max-w-md w-full shrink-0 relative z-10 bg-primary/95 backdrop-blur-md rounded-lg border-3 border-dark shadow-2xl p-8 transform transition-all">
                <div className="text-center mb-8">
                    <Image
                        src="/assets/images/logo_fullmoon.png"
                        alt="FullMoon Logo"
                        width={100}
                        height={100}
                        className="mx-auto mb-4 drop-shadow-md"
                    />
                    <h2 className="text-5xl font-enchanted text-dark tracking-wider">
                        {isLogin ? "Rejoindre le Village" : "Nouveau Villageois"}
                    </h2>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 font-medium text-sm rounded">
                        {error}
                    </div>
                )}

                <form className="space-y-6" onSubmit={handleEmailAuth}>
                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-bold text-dark mb-1" htmlFor="pseudo">
                                Pseudo
                            </label>
                            <input
                                id="pseudo"
                                type="text"
                                required={!isLogin}
                                value={pseudo}
                                onChange={(e) => setPseudo(e.target.value)}
                                className="appearance-none block w-full px-4 py-3 border-2 border-dark/30 rounded-md placeholder-dark/50 focus:outline-none focus:border-dark focus:ring-1 focus:ring-dark bg-white/80 transition-colors"
                                placeholder="Votre nom dans le jeu"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-dark mb-1" htmlFor="email">
                            Adresse Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="appearance-none block w-full px-4 py-3 border-2 border-dark/30 rounded-md placeholder-dark/50 focus:outline-none focus:border-dark focus:ring-1 focus:ring-dark bg-white/80 transition-colors"
                            placeholder="loup@fullmoon.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-dark mb-1" htmlFor="password">
                            Mot de passe
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="appearance-none block w-full px-4 py-3 border-2 border-dark/30 rounded-md placeholder-dark/50 focus:outline-none focus:border-dark focus:ring-1 focus:ring-dark bg-white/80 transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border-3 border-dark rounded-md shadow-sm text-xl font-bold text-white bg-dark hover:bg-dark/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dark transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {isLogin ? "Se connecter" : "S'inscrire"}
                    </button>
                </form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t-2 border-dark/20" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-primary text-dark font-bold">Ou continuer avec</span>
                        </div>
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={handleGoogleAuth}
                            type="button"
                            disabled={loading}
                            className="w-full flex items-center justify-center p-3 border-2 border-dark/30 rounded-md shadow-sm bg-white hover:bg-gray-50 font-bold text-dark transition-all cursor-pointer disabled:opacity-50"
                        >
                            <svg className="h-5 w-5 mr-3" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                <path fill="none" d="M0 0h48v48H0z" />
                            </svg>
                            Google
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center text-sm font-medium text-dark">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                        className="font-bold underline cursor-pointer hover:text-secondary transition-colors"
                    >
                        {isLogin ? "Pas encore de compte ? Créer un villageois." : "Déjà membre du village ? Se connecter."}
                    </button>
                </div>
            </div>
        </div>
    );
}
