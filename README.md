# 🌕 FullMoon — Loup-Garou en ligne

**FullMoon** est une adaptation web complète et en temps réel du jeu de société "Les Loups-Garous de Thiercelieux". La plateforme remplace le maître du jeu humain par un serveur qui orchestre automatiquement les phases, gère les rôles, le chat vocal, les votes et les pouvoirs — le tout jouable à distance entre amis.

---

## 🎮 Déroulement d'une partie

1. **Connexion** — via email ou compte Google
2. **Lobby** — un hôte crée un salon, choisit les rôles (auto ou personnalisé), invite ses amis
3. **Révélation des rôles** — chaque joueur découvre son rôle en retournant sa carte
4. **Élection du Maire** — vote pour désigner un maire (vote double au bûcher)
5. **Boucle Nuit / Jour** :
   - **Nuit** (45s) — les loups votent leur victime, les rôles spéciaux agissent
   - **Jour** (60s) — le village débat de la nuit
   - **Vote** (30s) — le village vote l'élimination d'un suspect
6. **Fin de partie** — victoire du camp qui remplit sa condition. Les stats sont mises à jour.
7. **Rejouer** — un nouveau salon identique est créé automatiquement

---

## 🎭 Rôles disponibles

### Camp Village
| Rôle | Pouvoir |
|------|---------|
| Villageois | Aucun pouvoir spécial |
| Sorcière | Potion de vie (sauvegarde aveugle) + Potion de mort |
| Chasseur | Tire sur un joueur au moment de sa mort |
| Voyante | Inspecte le rôle d'un joueur chaque nuit |
| Cupidon | Unit deux amoureux lors de la première nuit |
| Petite Fille | Entend le chat des loups (anonymisé) |

### Camp Loups-Garous
| Rôle | Pouvoir |
|------|---------|
| Loup-Garou | Vote avec la meute pour éliminer un villageois |
| Loup Alpha | Vote compte double la nuit |
| Grand Méchant Loup | Peut tuer une seconde victime si aucun loup n'est mort |
| Loup Infect | Transforme la victime des loups en loup au lieu de la tuer (auto-ciblé) |

### Camp Solitaires
| Rôle | Condition de victoire |
|------|----------------------|
| Loup Blanc | Être le dernier survivant |
| Fou | Être voté au bûcher (non infecté, non amoureux) |
| Assassin | Être le dernier survivant |
| Pyromane | Asperger des joueurs d'essence puis déclencher l'incendie — être le dernier survivant |
| Empoisonneur | Empoisonner (mutisme) — être le dernier survivant |

---

## 🏆 Scénarios de fin de partie

| # | Gagnant | Condition |
|---|---------|-----------|
| 1 | **VILLAGEOIS** | Tous les loups morts, tous les solos dangereux morts |
| 2 | **LOUPS** | Loups vivants ≥ puissance de vote villageoise |
| 3 | **AMOUR** | Les 2 amoureux de camps différents sont les 2 derniers survivants |
| 4 | **FOU** | Le Fou est voté au bûcher (non infecté, non amoureux) |
| 5 | **LOUP_BLANC** | Le Loup Blanc est le seul survivant |
| 6 | **ASSASSIN** | L'Assassin est le seul survivant |
| 7 | **PYROMANE** | Le Pyromane est le seul survivant |
| 8 | **EMPOISONNEUR** | L'Empoisonneur est le seul survivant |
| 9 | **NONE** | Tous les joueurs morts simultanément |

> Le **Maire** bénéficie d'un vote double au bûcher. Si 1 villageois-maire affronte 1 loup en phase de jour, la partie continue (le maire peut voter le loup) — le serveur en tient compte dans le calcul de victoire.

---

## 🛠️ Architecture Technique

### 1. Moteur de jeu serveur-autoritaire (Socket.io) ⭐⭐⭐⭐⭐

Le serveur Node.js est la **source absolue de vérité** — le client ne peut pas tricher.

- **Machine à états** : `LOBBY → ROLE_REVEAL → MAYOR_ELECTION → NIGHT → DAY_DISCUSSION → DAY_VOTE → GAME_OVER`
- **Rate limiting** : 5 msg/s sur le chat, 10/s sur les votes, 5/s sur les pouvoirs
- **Lookup O(1)** : `userSocketMap` (Map userId→socketId) pour le signaling WebRTC
- **Payload personnalisé** : chaque joueur reçoit un état du jeu taillé sur mesure (rôles masqués, votes filtrés, messages nuit limités aux loups)
- **Déconnexion intelligente** : en partie, l'avatar reste en jeu (`isDisconnected: true`) — le joueur peut revenir. En lobby, 60s de délai puis suppression
- **Animations synchronisées** : délai de 2.5s côté serveur après chaque mort pour laisser l'animation côté client se jouer
- **Sécurité** : CORS restreint aux origines configurées (`ALLOWED_ORIGINS`)

### 2. Chat vocal P2P (WebRTC Mesh) ⭐⭐⭐⭐⭐

Topologie Mesh (P2P direct), sans serveur média — coût serveur nul.

- **Algorithme Polite Peer** : gestion des collisions de connexion simultanées
- **Mute dynamique** : `MediaStreamTrack.enabled` selon la phase et le rôle (la nuit, seuls les loups s'entendent entre eux)
- **STUN + TURN** : serveurs STUN Google + fallback TURN openrelay pour les réseaux NAT symétriques (4G, entreprise)
- **Détection de parole** : analyse FFT en temps réel, indicateur visuel sur les avatars
- **Deux types de salons** : avec ou sans microphone (configurable par l'hôte)

### 3. Persistance Firebase Hybride ⭐⭐⭐

| Service | Usage |
|---------|-------|
| **Firestore** | Profils, stats, salons, amis, notifications, chats privés |
| **Realtime Database** | Présence en ligne (online/offline) |
| **Firebase Auth** | Connexion email + Google OAuth |

- **AuthContext** : un seul `onAuthStateChanged` pour toute l'application (partagé via React Context)
- **PresenceManager** : mise à jour RTDB en fire-and-forget (aucune lecture Firestore bloquante)
- **Pénalités de fuite** : via `increment()` Firestore (atomique, sans race condition)

### 4. Interface React/Next.js ⭐⭐⭐

- **Toasts** : système de notifications non-bloquantes (remplace tous les `alert()`)
- **Transitions de phase** : overlay animé avec icône et titre à chaque changement de phase
- **Timer visuel** : barre de progression + passage orange/rouge à l'approche de 0
- **Animation de mort** : flash rouge sur l'avatar + `Mort.png` pendant 2.5s
- **LoadingScreen** : messages animés cycliques + code salon copiable
- **Error Boundary** : écran propre en cas d'erreur React inattendue

### 5. Tests ⭐⭐⭐

**269 tests** couvrant la logique critique et les comportements réseau :

| Suite | Tests |
|-------|-------|
| `checkVictory.test.ts` | Victoires village, loups, amour, solo, NONE |
| `checkVictory.advanced.test.ts` | FOU infecté/amoureux, infectés, solos multiples |
| `checkVictory.extreme.test.ts` | 1 joueur, 18 joueurs, effets multiples, cas limites |
| `tallyVotes.test.ts` | Majorité, égalité, maire double, Loup Alpha double |
| `tallyVotes.advanced.test.ts` | Loup Blanc/Assassin, égalité triangle, succession maire |
| `distributeRoles.test.ts` | Formules A/B/C, total = J, village majoritaire |
| `distributeCustomRoles.test.ts` | Pool vide, pool trop petit, Villageois en fallback |
| `getCountsForJ.test.ts` | Valeurs exactes J=5→18, invariants mathématiques |
| `isInWolfCamp.test.ts` | Tous les rôles du jeu vérifiés |
| `rolesIntegrity.test.ts` | Structure ROLES : camps, powers, timing, cohérence |
| `effects.test.ts` | infected, lover, gasoline, poisoned — interactions victoire |
| `victoryDetection.test.ts` | Sons fin de partie — chaque rôle/combinaison |
| `witchBlindSave.test.ts` | Sorcière aveugle — sauvegarde, victoire, effets |
| `gameContext.test.ts` | GameContext exports, phases, maire, Sorcière |
| `wolf_chat.test.ts` | Chat nuit Loup Alpha → Loup Garou (intégration Socket.io) |
| `voiceRoom.test.ts` | Enregistrement vocal, relay `voice_request_connect` / `voice_signal` |
| `disconnectInGame.test.ts` | Déconnexion lobby (isDisconnected=true, 60s) et en partie (avatar conservé) |
| `disconnectedPlayerLogic.test.ts` | checkVictory et tallyVotes avec joueurs déconnectés |

```bash
npx jest
```

---

## 📁 Structure du projet

```
werewolf/
├── app/                        # Pages Next.js (App Router)
│   ├── auth/                   # Connexion / Inscription
│   ├── play/                   # Lobby — liste des salons
│   ├── room/[code]/            # Salon de jeu
│   │   └── edit/               # Configuration du salon
│   ├── profil/                 # Profil joueur
│   │   └── [id]/               # Profil d'un autre joueur
│   └── admin/                  # Dashboard admin + simulateurs
├── components/
│   ├── game/
│   │   ├── ActiveGame.tsx      # Interface de jeu (cercle de joueurs)
│   │   ├── EndGame.tsx         # Écran de fin (stats + rejouer)
│   │   ├── PlayerCircleNode.tsx# Avatar joueur + votes + effets
│   │   ├── PhaseTransitionOverlay.tsx # Overlay animé entre phases
│   │   └── RoleCard.tsx        # Carte de rôle (animation flip)
│   ├── room/
│   │   ├── VoiceChatManager.tsx# WebRTC P2P, mute dynamique
│   │   └── LoadingScreen.tsx   # Écran de chargement animé
│   ├── ErrorBoundary.tsx       # Filet de sécurité React
│   ├── GlobalActionBar.tsx     # Notifications, messages, amis
│   └── PresenceManager.tsx     # Statut en ligne (RTDB)
├── contexts/
│   ├── AuthContext.tsx          # Auth partagée (un seul listener)
│   └── ToastContext.tsx         # Notifications toast globales
├── hooks/
│   └── useGameAudio.ts          # Ambiances et effets sonores
├── server/
│   ├── index.ts                 # HTTP + Socket.io (dev local)
│   └── gameLogic.ts             # Moteur de jeu complet
├── server.js                    # Point d'entrée production (Infomaniak)
├── lib/
│   ├── firebase.ts              # Init Firebase SDK
│   └── roleDistribution.ts      # Algorithmes de distribution des rôles
├── types/
│   ├── game.ts                  # GameState, Player, Phase, Events Socket.io
│   ├── roles.ts                 # Définitions des rôles et pouvoirs
│   └── firestore.ts             # Interfaces des documents Firestore (UserData, GroupData…)
├── tests/                       # Tests unitaires Jest
├── public/assets/
│   ├── images/                  # Icônes, rôles, personnages
│   └── soundeffects/            # Ambiances et effets sonores
├── UX_TODO.md                   # Journal des améliorations UX
├── start_dev.bat                # Lance l'environnement de dev complet
└── .env.local                   # Variables d'environnement
```

---

## 🚀 Lancement Local

### Prérequis
- Node.js ≥ 18
- pnpm ou npm

### Installation

```bash
# Dépendances frontend
npm install

# Dépendances backend
cd server && npm install && cd ..
```

### Démarrage rapide (recommandé)

```bat
start_dev.bat
```

Le script :
1. Tue les processus existants sur les ports 3000 et 3001
2. Démarre le serveur Socket.io (port 3001)
3. Lance ngrok (tunnel HTTPS pour tests externes)
4. Vide le cache `.next`
5. Démarre Next.js (port 3000)

### Scripts npm disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Frontend Next.js (port 3000) |
| `npm run socket` | Serveur Socket.io (port 3001) |
| `npm run build` | Build de production |
| `npm run clean` | Supprime le cache `.next` |
| `npm run fresh` | `clean` + `dev` |
| `npx jest` | Lance les tests unitaires |

---

## ⚙️ Configuration (`.env.local`)

```env
# URL du serveur Socket.io
NEXT_PUBLIC_SOCKET_URL=   # Dev local

# Origines CORS autorisées (serveur Socket.io)
ALLOWED_ORIGINS= #Dev local

# Serveur TURN WebRTC (optionnel — openrelay en fallback si absent)
# NEXT_PUBLIC_TURN_URL=turn:ton-serveur.com:3478
# NEXT_PUBLIC_TURN_USERNAME=username
# NEXT_PUBLIC_TURN_CREDENTIAL=password
```

---

## 🔒 Sécurité

- **CORS restreint** : origines explicitement listées dans `ALLOWED_ORIGINS`
- **Rate limiting** : protège les events Socket.io contre le spam
- **Payload personnalisé** : chaque joueur ne reçoit que les informations auxquelles il a droit (rôles masqués, votes filtrés, chat nuit limité)
- **Serveur autoritaire** : toute action est validée côté serveur avant d'être appliquée

---

## 👤 Auteur

**Développé par [Ismail Halouani](mailto:ismail.halouani@gmail.com)**  
SAE 601 — BUT MMI S6 Dev
