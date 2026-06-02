'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface AuthContextValue {
    user: User | null;
    userData: Record<string, any> | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    userData: null,
    loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser]         = useState<User | null>(null);
    const [userData, setUserData] = useState<Record<string, any> | null>(null);
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        let unsubUser: (() => void) | null = null;

        const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
            // Cleanup previous user-data listener when auth changes
            if (unsubUser) { unsubUser(); unsubUser = null; }

            setUser(currentUser);

            if (currentUser) {
                // Single live listener on users/{uid} for the entire app
                unsubUser = onSnapshot(
                    doc(db, 'users', currentUser.uid),
                    (snap) => {
                        setUserData(snap.exists() ? (snap.data() as Record<string, any>) : null);
                        setLoading(false);
                    },
                    () => setLoading(false)
                );
            } else {
                setUserData(null);
                setLoading(false);
            }
        });

        return () => {
            unsubAuth();
            if (unsubUser) unsubUser();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, userData, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
