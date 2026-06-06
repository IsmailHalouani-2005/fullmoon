import { filterChatMessages, windowChatMessages, CHAT_WINDOW_SIZE } from '../lib/chatWindowing';
import type { ChatMessage } from '../types/game';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function msg(
    id: string,
    chatType: ChatMessage['chatType'],
    senderId = 'system'
): ChatMessage {
    return {
        senderId,
        senderName: 'Test',
        text: `msg-${id}`,
        time: parseInt(id, 10),
        chatType,
    };
}

const alwaysWolf = () => true;
const neverWolf  = () => false;

// ─── filterChatMessages ───────────────────────────────────────────────────────

describe('filterChatMessages', () => {

    it('les messages système sont toujours visibles, peu importe l\'onglet', () => {
        const msgs = [msg('1', 'system')];
        expect(filterChatMessages(msgs, 'day',   null, null, neverWolf)).toHaveLength(1);
        expect(filterChatMessages(msgs, 'night',  null, null, neverWolf)).toHaveLength(1);
    });

    it('les messages lover sont toujours visibles', () => {
        const msgs = [msg('1', 'lover')];
        expect(filterChatMessages(msgs, 'day',  null, null, neverWolf)).toHaveLength(1);
        expect(filterChatMessages(msgs, 'night', null, null, neverWolf)).toHaveLength(1);
    });

    it('les messages highlighted sont toujours visibles', () => {
        const msgs = [msg('1', 'highlighted')];
        expect(filterChatMessages(msgs, 'day',  null, null, neverWolf)).toHaveLength(1);
        expect(filterChatMessages(msgs, 'night', null, null, neverWolf)).toHaveLength(1);
    });

    it('les messages poisoned sont toujours visibles', () => {
        const msgs = [msg('1', 'poisoned')];
        expect(filterChatMessages(msgs, 'day',  null, null, neverWolf)).toHaveLength(1);
        expect(filterChatMessages(msgs, 'night', null, null, neverWolf)).toHaveLength(1);
    });

    it('un message de jour est visible sur l\'onglet jour', () => {
        const msgs = [msg('1', 'day')];
        expect(filterChatMessages(msgs, 'day', null, null, neverWolf)).toHaveLength(1);
    });

    it('un message de jour est masqué sur l\'onglet nuit', () => {
        const msgs = [msg('1', 'day')];
        expect(filterChatMessages(msgs, 'night', null, null, neverWolf)).toHaveLength(0);
    });

    it('un message nuit est visible sur l\'onglet nuit pour un loup', () => {
        const msgs = [msg('1', 'night', 'wolf1')];
        expect(filterChatMessages(msgs, 'night', 'LOUP_GAROU', 'wolf1', alwaysWolf)).toHaveLength(1);
    });

    it('un message nuit est masqué sur l\'onglet nuit pour un villageois', () => {
        const msgs = [msg('1', 'night', 'wolf1')];
        expect(filterChatMessages(msgs, 'night', 'VILLAGEOIS', 'p1', neverWolf)).toHaveLength(0);
    });

    it('la Petite Fille peut voir les messages nuit sur l\'onglet nuit', () => {
        const msgs = [msg('1', 'night', 'wolf1')];
        expect(filterChatMessages(msgs, 'night', 'PETITE_FILLE', 'p1', neverWolf)).toHaveLength(1);
    });

    it('un loup voit ses propres messages nuit même sur l\'onglet jour', () => {
        const msgs = [msg('1', 'night', 'wolf1')];
        expect(filterChatMessages(msgs, 'day', 'LOUP_GAROU', 'wolf1', alwaysWolf)).toHaveLength(1);
    });

    it('un loup ne voit pas les messages nuit d\'un autre loup sur l\'onglet jour', () => {
        const msgs = [msg('1', 'night', 'wolf2')];
        expect(filterChatMessages(msgs, 'day', 'LOUP_GAROU', 'wolf1', alwaysWolf)).toHaveLength(0);
    });

    it('filtre simultané : onglet jour → garde system + lover + highlighted + poisoned + day', () => {
        const msgs = [
            msg('1', 'system'),
            msg('2', 'lover'),
            msg('3', 'highlighted'),
            msg('4', 'poisoned'),
            msg('5', 'day'),
            msg('6', 'night'),
        ];
        const result = filterChatMessages(msgs, 'day', 'VILLAGEOIS', 'p1', neverWolf);
        expect(result).toHaveLength(5); // tout sauf night
    });

});

// ─── windowChatMessages ───────────────────────────────────────────────────────

describe('windowChatMessages', () => {

    function makeMessages(n: number, type: ChatMessage['chatType'] = 'day'): ChatMessage[] {
        return Array.from({ length: n }, (_, i) => msg(String(i + 1), type));
    }

    it('retourne tous les messages si la liste est <= windowSize', () => {
        const msgs = makeMessages(10);
        const { displayed, hiddenCount } = windowChatMessages(msgs, 80, false);
        expect(displayed).toHaveLength(10);
        expect(hiddenCount).toBe(0);
    });

    it('tronque les messages au-delà de windowSize', () => {
        const msgs = makeMessages(100);
        const { displayed, hiddenCount } = windowChatMessages(msgs, 80, false);
        expect(displayed).toHaveLength(80);
        expect(hiddenCount).toBe(20);
    });

    it('showAll=true retourne tous les messages sans troncature', () => {
        const msgs = makeMessages(200);
        const { displayed, hiddenCount } = windowChatMessages(msgs, 80, true);
        expect(displayed).toHaveLength(200);
        expect(hiddenCount).toBe(0);
    });

    it('les messages lover hors-fenêtre sont épinglés en tête', () => {
        // 90 messages day, le 5ème est lover (hors fenêtre de 80)
        const msgs = makeMessages(90, 'day');
        msgs[4] = { ...msgs[4], chatType: 'lover' }; // index 4 → avant la fenêtre

        const { displayed } = windowChatMessages(msgs, 80, false);
        // On attend le lover épinglé + les 80 récents = 81 messages
        expect(displayed).toHaveLength(81);
        expect(displayed[0].chatType).toBe('lover');
    });

    it('les messages highlighted hors-fenêtre sont épinglés en tête', () => {
        const msgs = makeMessages(100, 'day');
        msgs[2] = { ...msgs[2], chatType: 'highlighted' };

        const { displayed } = windowChatMessages(msgs, 80, false);
        expect(displayed[0].chatType).toBe('highlighted');
        expect(displayed).toHaveLength(81);
    });

    it('les messages ordinaires hors-fenêtre ne sont pas épinglés', () => {
        const msgs = makeMessages(90, 'day');
        const { displayed } = windowChatMessages(msgs, 80, false);
        // Premier message affiché = msg n° 11 (le 80ème en partant de la fin)
        expect(displayed).toHaveLength(80);
        expect(displayed[0].text).toBe('msg-11');
    });

    it('hiddenCount exclut les messages épinglés', () => {
        // 100 messages, dont 2 lover/highlighted hors-fenêtre
        const msgs = makeMessages(100, 'day');
        msgs[0] = { ...msgs[0], chatType: 'lover' };
        msgs[1] = { ...msgs[1], chatType: 'highlighted' };

        const { hiddenCount } = windowChatMessages(msgs, 80, false);
        // cutoff = 20, pinned = 2 → hiddenCount = 18
        expect(hiddenCount).toBe(18);
    });

    it('CHAT_WINDOW_SIZE est égal à 80', () => {
        expect(CHAT_WINDOW_SIZE).toBe(80);
    });

});
