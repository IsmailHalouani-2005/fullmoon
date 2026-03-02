'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Header from '@/components/Header';
import { ROLES, RoleId } from '@/types/roles';
import { distributeRoles, distributeCustomRoles } from '@/lib/roleDistribution';
import Image from 'next/image';

const ADMIN_EMAILS = ['ismail.halouani@gmail.com', 'ilovehacking25@gmail.com'];

export default function AdminSimulationPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);

    // Simulation state
    const [playerCount, setPlayerCount] = useState(10);
    const [isCustom, setIsCustom] = useState(false);
    const [rolesCount, setRolesCount] = useState<Partial<Record<RoleId, number>>>({});
    const [lastResult, setLastResult] = useState<Partial<Record<RoleId, number>> | null>(null);
    const [batchResults, setBatchResults] = useState<{
        runs: number;
        stats: Record<RoleId, { count: number; percentage: number }>;
    } | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && user.email && ADMIN_EMAILS.includes(user.email)) {
                setIsAuthorized(true);
            } else {
                router.replace('/play');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    const handleRunSingle = () => {
        const result = isCustom
            ? distributeCustomRoles(playerCount, rolesCount)
            : distributeRoles(playerCount);
        setLastResult(result);
        setBatchResults(null);
    };

    const handleRunBatch = (runs: number = 100) => {
        const stats: Record<RoleId, number> = {} as any;

        for (let i = 0; i < runs; i++) {
            const res = isCustom
                ? distributeCustomRoles(playerCount, rolesCount)
                : distributeRoles(playerCount);

            Object.entries(res).forEach(([rId, count]) => {
                stats[rId as RoleId] = (stats[rId as RoleId] || 0) + (count as number);
            });
        }

        const finalStats: Record<RoleId, { count: number; percentage: number }> = {} as any;
        Object.entries(stats).forEach(([rId, total]) => {
            finalStats[rId as RoleId] = {
                count: total as number,
                percentage: ((total as number) / (playerCount * runs)) * 100
            };
        });

        setBatchResults({ runs, stats: finalStats });
        setLastResult(null);
    };

    const toggleRole = (rId: RoleId, delta: number) => {
        setRolesCount(prev => {
            const current = prev[rId] || 0;
            const next = Math.max(0, current + delta);
            return { ...prev, [rId]: next };
        });
        setIsCustom(true);
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-500"></div>
        </div>
    );
    if (!isAuthorized) return null;

    return (
        <div className="min-h-screen w-full bg-slate-900 text-white font-montserrat pb-20">
            <Header />
            <main className="max-w-6xl mx-auto px-6 py-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-enchanted text-5xl tracking-widest text-red-400 mb-2">Simulateur de Distribution</h1>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Testez vos algorithmes de jeu</p>
                    </div>
                    <button
                        onClick={() => router.push('/admin')}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-slate-700"
                    >
                        Retour Admin
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Configuration Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="text-red-400">01.</span> Paramètres
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre de Joueurs (J)</label>
                                    <input
                                        type="range" min="5" max="25"
                                        value={playerCount}
                                        onChange={(e) => setPlayerCount(parseInt(e.target.value))}
                                        className="w-full accent-red-500"
                                    />
                                    <div className="text-center font-bold text-2xl text-red-400 mt-1">{playerCount}</div>
                                </div>

                                <div className="pt-4 border-t border-slate-700">
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Mode Personnalisé</label>
                                        <button
                                            onClick={() => setIsCustom(!isCustom)}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${isCustom ? 'bg-red-500' : 'bg-slate-600'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isCustom ? 'translate-x-6' : ''}`}></div>
                                        </button>
                                    </div>

                                    {isCustom && (
                                        <div className="text-[10px] text-slate-400 italic mb-4">
                                            Utilise la formule: f(x) = (1/Jt) * ((J - x) / J)
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="text-red-400">02.</span> Actions
                            </h2>
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={handleRunSingle}
                                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg text-sm uppercase tracking-widest"
                                >
                                    Lancer Simulation Unique
                                </button>
                                <button
                                    onClick={() => handleRunBatch(100)}
                                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-all border border-slate-600 text-sm uppercase tracking-widest"
                                >
                                    Batch (100 runs)
                                </button>
                                <button
                                    onClick={() => handleRunBatch(1000)}
                                    className="bg-slate-900 hover:bg-black text-slate-400 font-bold py-2 rounded-lg transition-all border border-slate-800 text-xs uppercase tracking-widest"
                                >
                                    Stress Test (1000 runs)
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Roles Selector / Results Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl overflow-hidden">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="text-red-400">03.</span> Pool de Rôles
                            </h2>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                {Object.values(ROLES).map(role => (
                                    <div key={role.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex flex-col items-center group">
                                        <div className="relative w-12 h-12 mb-2 group-hover:scale-110 transition-transform">
                                            <img src={role.image} alt={role.label} className="object-contain" />
                                        </div>
                                        <div className="text-[10px] font-bold uppercase text-slate-400 mb-2 truncate max-w-full">{role.label}</div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => toggleRole(role.id, -1)}
                                                className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center hover:bg-red-500/20 text-red-400 transition-colors"
                                            >-</button>
                                            <span className="font-bold text-sm min-w-[2ch] text-center">{rolesCount[role.id] || 0}</span>
                                            <button
                                                onClick={() => toggleRole(role.id, 1)}
                                                className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center hover:bg-green-500/20 text-green-400 transition-colors"
                                            >+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Results Section */}
                        {lastResult && (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    Résultat de la Simulation
                                </h3>
                                <div className="flex flex-wrap gap-4">
                                    {Object.entries(lastResult).map(([rId, count]) => (
                                        <div key={rId} className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2 flex items-center gap-3">
                                            <img src={ROLES[rId as RoleId].image} alt="" className="w-8 h-8 object-contain" />
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase">{ROLES[rId as RoleId].label}</div>
                                                <div className="font-bold text-slate-200">x{count}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {batchResults && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                                    Statistiques sur {batchResults.runs} simulations
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-700">
                                                <th className="py-2 text-xs font-bold text-slate-500 uppercase">Rôle</th>
                                                <th className="py-2 text-xs font-bold text-slate-500 uppercase">Total</th>
                                                <th className="py-2 text-xs font-bold text-slate-500 uppercase">Fréquence (%)</th>
                                                <th className="py-2 text-xs font-bold text-slate-500 uppercase">Visualisation</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {Object.entries(batchResults.stats).sort((a, b) => b[1].count - a[1].count).map(([rId, data]) => (
                                                <tr key={rId} className="group hover:bg-slate-700/30 transition-colors">
                                                    <td className="py-3 flex items-center gap-3">
                                                        <img src={ROLES[rId as RoleId].image} alt="" className="w-6 h-6 object-contain" />
                                                        <span className="font-bold text-slate-300">{ROLES[rId as RoleId].label}</span>
                                                    </td>
                                                    <td className="py-3 font-mono text-slate-400">{data.count}</td>
                                                    <td className="py-3 font-bold text-blue-400">{data.percentage.toFixed(1)}%</td>
                                                    <td className="py-3 w-48">
                                                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500 transition-all duration-1000"
                                                                style={{ width: `${data.percentage}%` }}
                                                            ></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
