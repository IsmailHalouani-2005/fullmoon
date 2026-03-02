'use client';

import { useEffect } from 'react';
import { auth, rtdb, db } from '../lib/firebase';
import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function PresenceManager() {
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const uid = user.uid;

                // ALWAYS set Firestore to true on login, regardless of RTDB
                updateDoc(doc(db, 'users', uid), {
                    isOnline: true
                }).catch(err => console.error("Could not update Firestore online status", err));

                let hasConnected = false;

                try {
                    // Realtime Database references
                    const userStatusDatabaseRef = ref(rtdb, '/status/' + uid);
                    const connectedRef = ref(rtdb, '.info/connected');

                    onValue(connectedRef, (snap) => {
                        if (snap.val() === true) {
                            hasConnected = true;
                            // We're connected (or reconnected)!
                            console.log("Presence: Connected to RTDB successfully.");

                            // Set up the disconnect hook.
                            onDisconnect(userStatusDatabaseRef).set({
                                state: 'offline',
                                last_changed: serverTimestamp(),
                            }).then(() => {
                                console.log("Presence: onDisconnect setup successful.");
                                set(userStatusDatabaseRef, {
                                    state: 'online',
                                    last_changed: serverTimestamp(),
                                }).then(() => {
                                    console.log("Presence: status set to 'online' in RTDB.");
                                }).catch((err) => {
                                    console.error("Presence: Could not set status 'online' in RTDB.", err);
                                });
                            }).catch((err) => {
                                console.error("Presence: Could not setup onDisconnect in RTDB.", err);
                            });
                        } else {
                            // If snap.val() is false, we are disconnected.
                            console.log("Presence: Disconnected from RTDB");
                            // We ONLY update Firestore directly here to false IF we actually connected first.
                            // This prevents falsely setting offline if the RTDB just fails to connect on boot.
                            if (hasConnected) {
                                updateDoc(doc(db, 'users', uid), {
                                    isOnline: false
                                }).catch(err => console.error("Could not update Firestore offline status", err));
                            }
                        }
                    });
                } catch (e) {
                    console.error("RTDB presence failed to start", e);
                }

                // Add a backup listener for when the user closes the tab (graceful exit)
                const handleUnload = () => {
                    updateDoc(doc(db, 'users', uid), {
                        isOnline: false
                    }).catch(() => { });
                };
                window.addEventListener('beforeunload', handleUnload);

                // We return a function to do cleanup on component unmount
                return () => {
                    window.removeEventListener('beforeunload', handleUnload);
                };
            }
        });

        return () => unsubscribe();
    }, []);

    return null; // This component doesn't render anything
}
