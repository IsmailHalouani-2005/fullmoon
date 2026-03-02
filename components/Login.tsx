'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isRegistering) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-4 bg-slate-800 rounded-xl border border-slate-700">
            <h2 className="text-2xl font-bold text-center text-white">
                {isRegistering ? 'Inscription' : 'Connexion'}
            </h2>

            {error && <div className="p-3 bg-red-900/50 text-red-200 text-sm rounded">{error}</div>}

            <form onSubmit={handleAuth} className="space-y-4">
                <input
                    type="email"
                    placeholder="Email"
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded text-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Mot de passe"
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded text-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button className="w-full py-3 font-bold text-white bg-blue-600 rounded hover:bg-blue-700 transition">
                    {isRegistering ? "S'inscrire" : "Se connecter"}
                </button>
            </form>

            <button
                onClick={() => setIsRegistering(!isRegistering)}
                className="w-full text-sm text-slate-400 hover:text-white"
            >
                {isRegistering ? "Déjà un compte ? Se connecter" : "Pas de compte ? Créer un compte"}
            </button>
        </div>
    );
}
