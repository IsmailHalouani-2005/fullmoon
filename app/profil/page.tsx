'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../../components/Header';
import { auth, db, storage } from '../../lib/firebase';
import { onAuthStateChanged, signOut, updateProfile, updateEmail, updatePassword, linkWithPopup, GoogleAuthProvider, deleteUser } from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ProfileStats from '../../components/profile/ProfileStats';

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [userRank, setUserRank] = useState<number | null>(null);

    // Form fields
    const [pseudo, setPseudo] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Avatar upload states
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.replace('/auth');
                return;
            }
            setUser(currentUser);
            setEmail(currentUser.email || '');

            const docSnap = await getDoc(doc(db, "users", currentUser.uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                setPseudo(data.pseudo || currentUser.displayName || '');

                // Fetch dynamic rank
                if (data.stats?.points !== undefined) {
                    try {
                        const q = query(collection(db, "users"), where("stats.points", ">", data.stats.points));
                        const snapshot = await getCountFromServer(q);
                        setUserRank(snapshot.data().count + 1);
                    } catch (rankError) {
                        console.error("Error fetching rank:", rankError);
                    }
                }
            } else {
                setPseudo(currentUser.displayName || '');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 1024 * 1024) {
                alert("La taille de l'image ne doit pas dépasser 1 Mo.");
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            let currentPhotoUrl = userData?.photoURL || user.photoURL;

            // 1. Upload new avatar as Base64 String to bypass Firebase Storage restriction
            if (avatarFile) {
                currentPhotoUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(avatarFile);
                });
            }

            // 2. Update Firebase Auth Profile (Pseudo always, PhotoURL only if it fits)
            if (pseudo !== user.displayName) {
                await updateProfile(user, { displayName: pseudo });
            }

            if (avatarFile) {
                try {
                    // Try to update Auth profile photo, might fail if Base64 string is too long for Auth
                    await updateProfile(user, { photoURL: currentPhotoUrl });
                } catch (e: any) {
                    console.warn("L'image est trop grande pour Firebase Auth (photoURL limit), mais elle sera sauvegardée dans Firestore.", e);
                }
            }

            // 3. Update Firestore (users doc)
            await updateDoc(doc(db, "users", user.uid), {
                pseudo: pseudo,
                photoURL: currentPhotoUrl
            });

            // 3b. Sync profile changes to active group if any
            if (userData?.currentGroupId) {
                try {
                    const groupDocRef = doc(db, "groups", userData.currentGroupId);
                    const groupSnap = await getDoc(groupDocRef);
                    if (groupSnap.exists()) {
                        const groupData = groupSnap.data();

                        // Update player in array
                        const updatedPlayers = groupData.players?.map((p: any) => {
                            if (p.uid === user.uid) {
                                return { ...p, pseudo: pseudo, photoURL: currentPhotoUrl };
                            }
                            return p;
                        }) || [];

                        const updates: any = { players: updatedPlayers };

                        // If user is the host, update host info
                        if (groupData.hostId === user.uid) {
                            updates.hostPseudo = pseudo;
                            updates.hostPhoto = currentPhotoUrl;

                            // Optionally update village name if it matches the default format
                            if (groupData.name === `Village de ${userData.pseudo}`) {
                                updates.name = `Village de ${pseudo}`;
                            }
                        }

                        await updateDoc(groupDocRef, updates);
                    }
                } catch (groupError) {
                    console.error("Error updating group profile info", groupError);
                }
            }

            // 4. Update Email
            if (email !== user.email && email.trim() !== '') {
                await updateEmail(user, email);
            }

            // 5. Update Password
            if (password.trim() !== '') {
                await updatePassword(user, password);
                setPassword(''); // Clear password field after updating
            }

            // Update local state
            setUserData((prev: any) => ({ ...prev, pseudo, photoURL: currentPhotoUrl }));
            alert("Modifications enregistrées avec succès !");
        } catch (error: any) {
            console.error("Erreur lors de la sauvegarde :", error);
            if (error.code === 'auth/requires-recent-login') {
                alert("Pour modifier l'email ou le mot de passe, veuillez vous déconnecter et vous reconnecter.");
            } else {
                alert("Erreur : la sauvegarde a échoué (l'image est-elle trop lourde pour Firestore ?). " + error.message);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleLinkGoogle = async () => {
        if (!user) return;
        try {
            const provider = new GoogleAuthProvider();
            await linkWithPopup(user, provider);
            alert("Votre compte a bien été lié à Google !");
        } catch (error: any) {
            console.error("Erreur de liaison Google", error);
            if (error.code === 'auth/credential-already-in-use') {
                alert("Ce compte Google est déjà lié à un autre profil.");
            } else {
                alert("Erreur lors de la liaison : " + error.message);
            }
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;
        const confirmDelete = window.confirm("Êtes-vous sûr de vouloir supprimer votre compte définitivement ? Cette action est irréversible.");
        if (!confirmDelete) return;

        try {
            // Delete the document first, as security rules may require the user to be authenticated
            await deleteDoc(doc(db, "users", user.uid));
            // Then delete the user from Firebase Auth
            await deleteUser(user);
            // Explicitly sign out to clear any remaining local auth state
            await signOut(auth);
            // Force a hard redirect to the home page to clear all React states
            window.location.href = '/';
        } catch (error: any) {
            console.error("Erreur de suppression de compte", error);
            if (error.code === 'auth/requires-recent-login') {
                alert("Pour des raisons de sécurité, veuillez vous déconnecter et vous reconnecter avant de supprimer votre compte.");
                await signOut(auth);
                window.location.href = '/';
            } else {
                alert("Erreur lors de la suppression : " + error.message);
            }
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error("Erreur de déconnexion", error);
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-screen bg-primary flex flex-col items-center justify-center">
                <Image src="/assets/images/logo_fullmoon.png" alt="Loading" width={80} height={80} className="animate-pulse mb-4" />
                <p className="text-secondary font-enchanted text-5xl">Chargement...</p>
            </div>
        );
    }

    const stats = userData?.stats || {
        totalWins: 0,
        totalLosses: 0,
        totalLeaves: 0,
        villageWins: 0,
        villageLosses: 0,
        werewolfWins: 0,
        werewolfLosses: 0,
        soloWins: 0,
        soloLosses: 0,
        kills: 0,
        saves: 0,
        daysSurvived: 0,
        powerUses: 0,
        points: 0,
        fled: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        rank: "Non classé"
    };

    // Use wins/losses/fled directly from new stats, fallback to old ones if new is 0
    const totalWins = stats.wins || stats.totalWins || 0;
    const totalLosses = stats.losses || stats.totalLosses || 0;
    const totalLeaves = stats.fled || stats.totalLeaves || 0;
    const totalGames = stats.gamesPlayed || (totalWins + totalLosses + totalLeaves);

    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    const lossRate = totalGames > 0 ? Math.round((totalLosses / totalGames) * 100) : 0;
    const leaveRate = totalGames > 0 ? Math.round((totalLeaves / totalGames) * 100) : 0;

    const isLinkedWithGoogle = user?.providerData?.some((provider: any) => provider.providerId === 'google.com');

    return (
        <div className="min-h-screen w-full bg-background text-dark font-montserrat flex flex-col">
            <Header />

            <main className="flex-1 flex flex-col items-center px-4 py-8 pb-32">
                <div className="w-full max-w-2xl flex flex-col gap-6">

                    {/* Card 1: Compte Info */}
                    <div className="bg-[#2A2F32] rounded-xl p-8 shadow-2xl relative">
                        <button
                            onClick={() => router.back()}
                            className="absolute top-6 left-8 text-white/70 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"
                        >
                            <span className="text-xl">←</span> Retour
                        </button>

                        <h1 className="font-enchanted text-6xl text-white text-center my-8 tracking-wider">COMPTE</h1>

                        <div className="flex flex-col md:flex-row gap-12 items-start md:items-center">

                            {/* Left: Avatar */}
                            <div className="flex flex-col items-center gap-4">
                                <span className="text-white font-bold text-lg">Photo de profil :</span>
                                <label className="relative w-40 h-40 rounded-full border-4 border-[#5E4730] bg-[#E3D1A5] shadow-xl overflow-hidden flex-shrink-0 cursor-pointer group">
                                    <div className="absolute inset-0 bg-[url('/assets/images/icones/village_batiments.png')] bg-cover opacity-20 bg-center"></div>
                                    <Image
                                        src={avatarPreview || userData?.photoURL || "/assets/images/icones/Photo_Profil-transparent.png"}
                                        alt="Profil"
                                        fill
                                        className="object-cover z-10 group-hover:opacity-70 transition-opacity"
                                    />
                                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white font-bold text-sm bg-black/50 px-3 py-1 rounded-full">Modifier</span>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/webp"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                </label>
                            </div>

                            {/* Right: Form */}
                            <div className="flex-1 w-full flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-white font-bold pl-1">Pseudo :</label>
                                    <input
                                        type="text"
                                        value={pseudo}
                                        onChange={(e) => setPseudo(e.target.value)}
                                        placeholder="Joueur"
                                        className="bg-[#111315] text-white px-4 py-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-secondary/50 placeholder-white/30"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-white font-bold pl-1">Email :</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="bg-[#111315] text-white px-4 py-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-secondary/50 placeholder-white/30"
                                    />
                                </div>
                                <div className="flex flex-col gap-1 relative">
                                    <label className="text-white font-bold pl-1">UID (Identifiant) :</label>
                                    <div className="flex w-full relative">
                                        <input
                                            type="text"
                                            value={user?.uid || ""}
                                            readOnly
                                            className="bg-[#111315] text-white/50 px-4 py-3 pr-12 rounded-md w-full focus:outline-none cursor-copy font-mono text-sm"
                                            onClick={(e) => {
                                                navigator.clipboard.writeText(user?.uid || "");
                                                const target = e.target as HTMLInputElement;
                                                const originalBg = target.style.backgroundColor;
                                                target.style.backgroundColor = '#1a1f24';
                                                setTimeout(() => target.style.backgroundColor = originalBg, 200);
                                            }}
                                            title="Cliquez pour copier"
                                        />
                                        <button
                                            title="Copier l'UID"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors cursor-pointer"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                navigator.clipboard.writeText(user?.uid || "");
                                                alert("UID copié : " + user?.uid);
                                            }}
                                        >
                                            <Image src="/assets/images/icones/copy_paste-icon_white.png" alt="Copier l'UID" width={16} height={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-white font-bold pl-1">Mot de Passe :</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Écrivez votre nouveau mot de passe..."
                                        className="bg-[#111315] text-white px-4 py-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-secondary/50 placeholder-white/30"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Card 1 Buttons */}
                        <div className="flex flex-col sm:flex-row justify-between mt-10 gap-4">
                            <button
                                onClick={handleLogout}
                                className="bg-black text-white font-bold border border-white/20 py-3 px-8 rounded-md hover:bg-white/5 transition-colors"
                            >
                                Déconnexion
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-[#FCF9E8] text-black font-bold py-3 px-8 rounded-md hover:bg-[#EAE5D1] transition-colors disabled:opacity-50"
                            >
                                {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
                            </button>
                        </div>
                    </div>

                    {/* Card 2: Stats */}
                    <ProfileStats
                        stats={{
                            ...stats,
                            rank: userRank
                        }}
                    />

                    {/* Card 3: Danger Zone */}
                    <div className="bg-[#2A2F32] rounded-xl p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 md:gap-0">

                        <div className="flex-1 flex items-center justify-center md:justify-start gap-4">
                            <span className="text-white font-bold">Lier avec :</span>
                            <button
                                onClick={handleLinkGoogle}
                                disabled={isLinkedWithGoogle}
                                className={`font-bold py-2 px-6 rounded-md flex items-center gap-2 transition-colors ${isLinkedWithGoogle
                                    ? 'bg-white/10 text-white/50 cursor-default'
                                    : 'bg-white text-dark hover:bg-gray-100'
                                    }`}
                            >
                                <img src="https://www.google.com/favicon.ico" alt="Google" width={18} height={18} className={isLinkedWithGoogle ? "opacity-50 grayscale" : ""} />
                                {isLinkedWithGoogle ? "GOOGLE (Lié)" : "GOOGLE"}
                            </button>
                        </div>

                        <div className="hidden md:block w-px h-12 bg-white/20 mx-8"></div>

                        <div className="flex-1 flex items-center justify-center md:justify-end">
                            <button onClick={handleDeleteAccount} className="bg-[#E53E3E] text-white font-bold py-3 px-6 rounded-md hover:bg-red-600 transition-colors">
                                Supprimer le compte
                            </button>
                        </div>
                    </div>

                    {/* Links to legal pages */}
                    <div className="bg-[#2A2F32] rounded-xl p-8 shadow-2xl flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-sm font-medium text-white/50 w-full mb-8">
                        <Link href="/legal" className="hover:text-white transition-colors">Mentions Légales</Link>
                        <span className="hidden md:inline text-white/20">|</span>
                        <Link href="/cgu" className="hover:text-white transition-colors">CGU</Link>
                        <span className="hidden md:inline text-white/20">|</span>
                        <Link href="/privacy" className="hover:text-white transition-colors">Données Personnelles</Link>
                        <span className="hidden md:inline text-white/20">|</span>
                        <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
                    </div>

                </div>
            </main>
        </div>
    );
}
