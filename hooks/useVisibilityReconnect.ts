import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';

/**
 * Reconnecte automatiquement le socket Socket.io quand l'onglet navigateur
 * redevient visible.
 *
 * Cas d'usage principal : iOS Safari suspend les connexions WebSocket lors
 * d'un passage en arrière-plan, ce qui provoque une dérive du timer de phase
 * et des timeouts de reconnexion silencieux. Ce hook garantit qu'un `ping_activity`
 * (si connecté) ou un `connect()` (si déconnecté) est émis dès le retour.
 */
export function useVisibilityReconnect(socket: Socket | null) {
    useEffect(() => {
        if (!socket) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') return;

            if (socket.connected) {
                socket.emit('ping_activity');
            } else {
                socket.connect();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [socket]);
}
