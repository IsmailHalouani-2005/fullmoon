'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Header from '@/components/Header';

const SUPER_ADMIN_EMAILS = ['ismail.halouani@gmail.com', 'ilovehacking25@gmail.com'];
const ADMIN_EMAILS = [...SUPER_ADMIN_EMAILS, 'admin@admin.admin'];

export default function AdminPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && user.email && ADMIN_EMAILS.includes(user.email)) {
                setIsAuthorized(true);
                if (SUPER_ADMIN_EMAILS.includes(user.email)) {
                    setIsSuperAdmin(true);
                }
            } else {
                router.replace('/play');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    const handleWipeRooms = async () => {
        if (!confirm("⚠️ ATTENTION : Êtes-vous sûr de vouloir effacer TOUTES les rooms existantes de la base de données ?")) return;

        try {
            setLoading(true);
            const snapshot = await getDocs(collection(db, "groups"));

            let count = 0;
            const deletePromises = snapshot.docs.map(d => {
                count++;
                return deleteDoc(doc(db, "groups", d.id));
            });

            await Promise.all(deletePromises);

            alert(`✅ Succès : ${count} village(s) ont été supprimés de la base de données.`);
        } catch (error) {
            console.error("Erreur suppression:", error);
            alert("❌ Une erreur est survenue lors de la suppression des villages.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-montserrat">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mb-4"></div>
                <p className="font-bold tracking-widest text-sm uppercase text-slate-400">Vérification de l'accès...</p>
            </div>
        );
    }

    if (!isAuthorized) return null; // Fallback, router.replace will handle redirection

    return (
        <div className="min-h-screen w-full bg-slate-900 text-white font-montserrat">
            <Header isDark={true} />

            <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-16">
                <div className="bg-slate-800 border-2 border-red-500/30 rounded-xl p-4 md:p-8 shadow-2xl">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6 md:mb-8 border-b border-slate-700 pb-4 md:pb-6">
                        <span className="text-4xl">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-red-400"><path d="M12 2L4 5v6c0 5.25 3.4 10.15 8 11.5C16.6 21.15 20 16.25 20 11V5l-8-3z" /></svg>
                        </span>
                        <div>
                            <h1 className="font-enchanted text-3xl md:text-5xl tracking-widest text-red-400 mb-1">Panneau d'Administration</h1>
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-wide">Accès Restreint</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Danger Zone Card */}
                        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 flex flex-col items-start relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                            <h2 className="text-xl font-bold text-slate-200 mb-2 flex items-center gap-2">
                                <span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
                                </span> Danger Zone
                            </h2>
                            <p className="text-slate-400 text-sm mb-6 flex-1">
                                Supprime définitivement tous les lobbies actifs et les groupes. Cette action est irréversible et déconnectera tous les joueurs en cours de partie.
                            </p>
                            <button
                                onClick={handleWipeRooms}
                                disabled={loading || !isSuperAdmin}
                                title={!isSuperAdmin ? "Accès refusé : Vous n'avez pas les droits pour cette action." : ""}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition-colors shadow-lg uppercase tracking-wide text-sm flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        {isSuperAdmin ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline-block mr-1"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                        )}
                                        Purger tous les Lobbies
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Simulation Tool Card */}
                        <div
                            onClick={() => router.push('/admin/simulation')}
                            className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 flex flex-col items-start cursor-pointer hover:border-blue-500/50 hover:bg-slate-800 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                            <h2 className="text-xl font-bold text-slate-200 mb-2 flex items-center gap-2">
                                <span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400"><path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z" /></svg>
                                </span> Simulateur
                            </h2>
                            <p className="text-slate-400 text-sm mb-6 flex-1">
                                Testez la distribution des rôles et analysez les probabilités d'apparition selon vos paramètres personnalisés ou par défaut.
                            </p>
                            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors shadow-lg uppercase tracking-wide text-sm">
                                Ouvrir le Simulateur
                            </button>
                        </div>

                        {/* Components Explorer Card */}
                        <div
                            onClick={() => router.push('/admin/components')}
                            className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 flex flex-col items-start cursor-pointer hover:border-emerald-500/50 hover:bg-slate-800 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                            <h2 className="text-xl font-bold text-slate-200 mb-2 flex items-center gap-2">
                                <span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                                </span> Composants
                            </h2>
                            <p className="text-slate-400 text-sm mb-6 flex-1">
                                Visualisez et testez les différents composants de l'interface utilisateur de manière isolée.
                            </p>
                            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded transition-colors shadow-lg uppercase tracking-wide text-sm">
                                Voir les Composants
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
