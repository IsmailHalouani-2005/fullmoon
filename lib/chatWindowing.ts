import type { ChatMessage } from '../types/game';

/** Nombre de messages récents affichés sans scroll "tout afficher". */
export const CHAT_WINDOW_SIZE = 80;

/**
 * Filtre les messages du chat selon l'onglet actif (jour / nuit) et le rôle
 * du joueur courant.
 *
 * Règles :
 * - Les messages système, amoureux, surlignés et empoisonnés sont toujours
 *   visibles quel que soit l'onglet.
 * - Les messages nuit ne sont visibles que si le joueur appartient au camp
 *   des loups (ou est Petite Fille), ou s'il en est l'auteur.
 * - Les messages jour ne sont visibles que quand l'onglet "jour" est actif.
 */
export function filterChatMessages(
    messages: ChatMessage[],
    activeChatTab: 'day' | 'night',
    myRole: string | null | undefined,
    myUserId: string | null | undefined,
    isWolfRole: (role: string) => boolean
): ChatMessage[] {
    return messages.filter(msg => {
        // Toujours pinné
        if (
            msg.chatType === 'system' ||
            msg.chatType === 'lover' ||
            msg.chatType === 'highlighted' ||
            msg.chatType === 'poisoned'
        ) {
            return true;
        }

        if (msg.chatType === 'night') {
            const isMeWolf = myRole ? isWolfRole(myRole) : false;
            const isPetiteFille = myRole === 'PETITE_FILLE';
            const isMeSender = msg.senderId === myUserId;
            return (
                (activeChatTab === 'night' && (isMeWolf || isPetiteFille)) ||
                (isMeSender && isMeWolf)
            );
        }

        // message de jour
        return activeChatTab === 'day';
    });
}

/**
 * Applique la fenêtre glissante sur les messages déjà filtrés.
 *
 * Les messages `lover` et `highlighted` antérieurs à la fenêtre sont
 * « épinglés » en tête de liste pour rester toujours visibles.
 *
 * @returns displayed  — liste finale à rendre
 * @returns hiddenCount — nombre de messages masqués (pour le bouton "Afficher tout")
 */
export function windowChatMessages(
    filtered: ChatMessage[],
    windowSize: number,
    showAll: boolean
): { displayed: ChatMessage[]; hiddenCount: number } {
    if (showAll || filtered.length <= windowSize) {
        return { displayed: filtered, hiddenCount: 0 };
    }

    const cutoff = filtered.length - windowSize;
    const pinned = filtered
        .slice(0, cutoff)
        .filter(msg => msg.chatType === 'lover' || msg.chatType === 'highlighted');
    const recent = filtered.slice(cutoff);
    const displayed = pinned.length > 0 ? [...pinned, ...recent] : recent;
    const hiddenCount = cutoff - pinned.length;

    return { displayed, hiddenCount };
}
