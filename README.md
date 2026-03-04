# 🌕 FullMoon - Expérience Multijoueur "Les Loups-Garous de Thiercelieux"

**FullMoon** est une adaptation web complète, interactive et en temps réel du célèbre jeu de société "Les Loups-Garous de Thiercelieux". Destinée à être jouée entre amis à distance, la plateforme intègre un tchat vocal automatisé, une synchronisation de l'état du jeu à la milliseconde près, et une interface utilisateur immersive développée avec les technologies web modernes.

---

## 📖 Qu'est-ce que FullMoon ?

C'est une plateforme web (PWA-ready) permettant de créer des salons (Lobbies) personnalisés, d'inviter des joueurs via des codes uniques ou une liste d'amis, de distribuer les rôles, et de jouer des parties automatisées de Loup-Garou sans recourir à un Maître du Jeu (Master) humain.

Le serveur centralise l'intelligence artificielle du Maître du Jeu, orchestre les phases (Jour / Nuit / Votes / Actions spéciales), dicte les temps de parole, et mute/demute automatiquement les joueurs selon le contexte de la partie.

---

## 🎮 Comment ça fonctionne ? (Déroulement d'une partie)

1. **Inscription / Connexion** : Les joueurs se connectent via email ou compte Google.
2. **Création d'un Salon (Lobby)** : Un hôte (Host) crée un groupe, définissant le nombre final de joueurs et la composition des rôles (soit Générée, soit Personnalisée).
3. **Invitation** : L'hôte invite des amis en ligne (via le système social temps réel) ou en partageant un code à 6 chiffres.
4. **Début de Partie** : Lorsque le groupe est complet, la partie est lancée.
5. **Phase de Nuit** : Les microphones de tout le monde (sauf les loups entre eux) sont coupés. Les joueurs ayant des pouvoirs (Loups, Voyantes, Sorcières, etc.) effectuent leurs actions silencieusement via l'interface du jeu.
6. **Phase de Jour** : Le serveur annonce les victimes, ouvre les microphones de tous les survivants pour le grand débat, et lance un timer de vote.
7. **Élimination** : Le serveur compile les votes, élimine un joueur et referme les canaux vocaux pour la boucle de nuit suivante.
8. **Statistiques** : En fin de partie (Victoire Village / Loups / Solitaire), les points sont calculés et les statistiques globales de chaque profil sont mises à jour.

---

## 🛠️ Architecture Technique & Ingénierie (Du plus au moins complexe)

La complexité du hub applicatif réside dans la parfaite synchronisation entre les événements de jeu (ce qu'il se passe sur le plateau) et les flux multimédias (qui entend qui).

### 1. Tchat Vocal Temps Réel (WebRTC & Signaling via Socket.io) [⭐️⭐️⭐️⭐️⭐️]
C'est le module le plus complexe de l'application. Pour éviter un coût de serveur vocal coûteux, l'application utilise une topologie **Mesh (Peer-to-Peer)** via l'API navigateur **WebRTC**.
- **Serveurs STUN** : Les clients utilisent des serveurs STUN publics (Google) pour découvrir leurs IP publiques et traverser les pare-feux/NAT.
- **Processus de Signaling (La Négociation Polite Peer)** : Lorsque les joueurs entrent dans le jeu, ils établissent un canal P2P direct entre chaque paire de joueurs. Le serveur Node.js (Socket.io) sert uniquement de facteur pour échanger les "Offres", "Réponses" (SDP) et candidats ICE.
- **Gestion des Collisions (Glare)** : Si deux joueurs tentent d'établir une connexion simultanément, l'application implémente parfaitement l'algorithme "Polite Peer". Un joueur est désigné "Polite" et l'autre "Impolite". L'Impolite ignore l'offre entrante s'il est déjà en train de créer la sienne, tandis que le Polite détruit son offre locale pour accepter celle de l'Impolite. Cela évite les connexions `0S/0R` (silencieuses).
- **Mute / Unmute Dynamique** : Plutôt que de détruire les canaux vocaux chaque nuit, l'application manipule la propriété `enabled` des `MediaStreamTrack` audio en fonction de la phase du jeu et du rôle. Pendant la nuit, si vous êtes un loup, les canaux entrants/sortants vers d'autres loups s'activent, et se désactivent pour les villageois.

### 2. Moteur de Jeu Synchrone et Autoritaire (Socket.io) [⭐️⭐️⭐️⭐️]
La triche est impossible car le client n'a aucun pouvoir décisionnel. Le serveur Node (Socket.io) détient la source absolue de vérité.
- **Automate Fini (State Machine)** : Le jeu évolue selon un automate d'états stricts (Phase LOBBY -> PRE_GAME -> NIGHT -> DAY -> VOTING -> GAMEOVER).
- **Tick / Timer Global** : Le serveur gère les compteurs de temps et diffuse aux clients l'avancement du timer (évitant la désynchronisation des différentes horloges système locales).
- **Reconciliation des actions** : Quand la Voyante inspecte une carte, une demande est envoyée au serveur. Le serveur vérifie silencieusement (Est-ce que c'est bien la nuit ? La voyante est-elle en vie ? A-t-elle déjà joué ?). Si oui, il renvoie l'information de rôle de manière asynchrone uniquement au client de la voyante.
- **Récupération de Connexion (Rejoin System)** : Le serveur mémorise les IDs de sessions (Sockets). Si un joueur perd sa connexion Wi-Fi et revient 30 secondes plus tard, le serveur reconstruit son interface à l'identique (au sein de son State) et relance les connexions WebRTC avec les autres.

### 3. Persistance et Base de Données Hybride (Firebase Ecosystem) [⭐️⭐️⭐️]
Pour pallier aux problématiques techniques, l'application utilise simultanément Firestore et Firebase Realtime Database.
- **Firebase Firestore (NoSQL Documentaires)** : Stockage "froid" et persistant. Utilisé pour les Profils Utilisateurs, les Statistiques historiques, la validation d'Authentication, et les Paramètres globaux (Règles, configs admin). Il permet des requêtes complexes (ex: "Trouver tous les utilisateurs triés par le plus de points" pour un Leaderboard).
- **Firebase Realtime Database (JSON Tree)** : Stockage ultra-rapide axé sur la "Présence". Utilisé pour l'interface Sociale (Qui de mes amis est en ligne / hors ligne) et la salle d'attente basique du salon, où chaque modification du profil (ping) est perçue en quelques millisecondes par le réseau.
- **Firebase Storage** : Utilisé pour sauvegarder le profil (Avatars téléchargés par les utilisateurs).
- **Firebase Authentication** : Gestion de session sécurisée (JWT, tokens côté client).

### 4. Interface Dynamique et Responsive (React / Next.js) [⭐️⭐️]
Le frontal de l'application gère de lourdes tâches d'interface sans ralentir ou perdre son état, et assure une expérience mobile similaire à une application native.
- **Hooks Personnalisés** : La séparation claire de la logique métier (e.g., `useWebRTC`, `useGameSync`, `useAudio`) avec l'interface pure permet une complexité du jeu cachée sous le capot.
- **Tailwind CSS & Animations** : Le jeu comporte de nombreuses animations CSS (le retournement des cartes de rôle via Transforms 3D `rotateY`, les transitions jour/nuit (filtres de couleurs, opacité absolue), le Slide du Sidebar Mobile).
- **Gestion PWA / Mobile-First** : Optimisations pour smartphones, par exemple un Menu Hamburger pour la partie d'administration, ou la réorganisation dynamique des joueurs autour du bûcher, s'assurant que les cliques tactiles (pour cibler quelqu'un) sont ergonomiques.

### 5. Administration et Sécurité (Tableaux de Bord) [⭐️]
L'aspect gestion et observation (Mastering) du logiciel.
- **Panel Admin** : Le projet abrite un dashboard sous `/admin` protégé par un vérificateur d'emails serveurs (`SUPER_ADMIN_EMAILS`).
- **Simulateur de composants** : Des pages comme `/admin/components` ou `/admin/simulation` permettent de tester l'intégration des interfaces en modifiant de faux états globaux sans avoir besoin de 5 vrais joueurs pour le visualiser. Ce simulateur est particulièrement pertinent pour le débogage visuel rapide.

---

## 🚀 Technologie Stack

- **Frontend** : Next.js 14, React 18, Tailwind CSS, Heroicons
- **Backend (Game Engine)** : Node.js, Express, Socket.io
- **Base de données & Auth** : Firebase (Firestore, Realtime DB, Auth)
- **Communications Audiovisuels** : WebRTC natif, Stun/Turn Google
- **Hosting** : Infomaniak (Node Application) / Firebase Hosting

## 📥 Lancement Local

1. Installez les dépendances du frontend :
```bash
npm install
```
2. Installez les dépendances du server Socket.io backend :
```bash
cd server
npm install
cd ..
```
3. Exécutez le frontend & le backend simultanément (nécessite deux terminaux) :
```bash
npm run dev # (Frontend Next.js au port 3000)
node server/index.js # (Généralement au port 3001)
```

**Développé par [Ismail Halouani](mailto:ismail.halouani@gmail.com)**