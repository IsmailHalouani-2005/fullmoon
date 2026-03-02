# Logique du Chat des Loups (`Nuit`)

Ce document explique le fonctionnement technique du chat réservé à la meute des Loups durant la nuit.

## 1. Identification de la Meute
La meute est définie par une liste fixe de rôles (`wolfRoles`) pour garantir la cohérence entre le client et le serveur :
- `LOUP_GAROU`
- `LOUP_ALPHA`
- `GRAND_MECHANT_LOUP`
- `LOUP_INFECT`

> [!IMPORTANT]
> Le **Loup Blanc** est volontairement EXCLU de cette liste car il joue en solitaire. Il ne voit pas les messages de la meute et la meute ne voit pas les siens.

## 2. Système d'Onglets (Client)
Le chat est divisé en deux sections dans l'interface (`GroupChat.tsx`) :
- **Onglet "Général"** : Affiche les messages système et les messages envoyés durant la phase de discussion (Jour).
- **Onglet "Nuit"** : Visible uniquement pour les joueurs identifiés comme Loups. Affiche les messages de type `night`.

## 3. Envoi d'un Message (`page.tsx`)
Lorsqu'un joueur envoie un message :
1. Si l'onglet actif est **"Nuit"**, le type du message est forcé à `night`.
2. Le message est envoyé via l'événement Socket `chat_message`.

## 4. Validation Serveur (`gameLogic.ts`)
Le serveur vérifie chaque message entrant de type `night` :
- **Rôle** : L'expéditeur doit faire partie de la liste `wolfRoles`.
- **Phase** : La phase actuelle du jeu doit être `NIGHT`.
- **Vie** : L'expéditeur doit être vivant.

Si ces conditions ne sont pas remplies, le message est rejeté (`[CHAT_BLOCKED]`).

## 5. Affichage et Filtrage (Client)
Le filtrage final est effectué dans le composant principal de la salle :
```tsx
chatMessages.filter(msg => {
    // 1. Les messages système sont toujours visibles
    if (msg.chatType === 'system') return true;

    // 2. Messages de Nuit
    if (msg.chatType === 'night') {
        const isMeWolf = isInWolfCamp(mePlayer.role);
        const isMeSender = msg.senderId === myUserId;
        
        // Un message de nuit est visible si :
        // - On est sur l'onglet "Nuit" ET qu'on est un Loup
        // - OU si ON est l'expéditeur (pour voir qu'il a bien été envoyé)
        return (activeChatTab === 'night' && isMeWolf) || (isMeSender && isMeWolf);
    }

    // 3. Messages de Jour
    return activeChatTab === 'day';
})
```

## 6. Synthèse du Flux
1. Le loup clique sur l'onglet **"Nuit"**.
2. Il écrit et envoie : "On mange le numéro 3 ?".
3. Le serveur reçoit, valide que c'est bien la nuit et qu'il est loup, puis stocke et re-émet le message.
4. Les autres loups (onglet "Nuit") reçoivent et affichent le message.
5. Les villageois reçoivent techniquement le signal mais leur interface le filtre totalement.
