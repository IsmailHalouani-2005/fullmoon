'use client';

import { useEffect } from 'react';
import { rtdb } from '../lib/firebase';
import { ref, onDisconnect, set, serverTimestamp, onValue } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';

export default function PresenceManager() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;
        const uid = user.uid;

        const userStatusRef = ref(rtdb, `/status/${uid}`);
        const connectedRef  = ref(rtdb, '.info/connected');

        // Fire-and-forget — aucune lecture Firestore bloquante
        const unsub = onValue(connectedRef, (snap) => {
            if (snap.val() !== true) return;

            onDisconnect(userStatusRef)
                .set({ state: 'offline', last_changed: serverTimestamp() })
                .then(() => set(userStatusRef, { state: 'online', last_changed: serverTimestamp() }))
                .catch(() => {});
        });

        return () => unsub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid]); // user?.uid is the stable dep; the full `user` object reference changes on every auth tick

    return null;
}
