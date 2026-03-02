import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, setDoc, doc, getDocs, query, limit } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB5n0XoICsbfFuXo_UwdXX8Ax00Fe2KCSQ",
    authDomain: "fullmoon-e94e4.firebaseapp.com",
    projectId: "fullmoon-e94e4",
    storageBucket: "fullmoon-e94e4.firebasestorage.app",
    messagingSenderId: "509949476619",
    appId: "1:509949476619:web:0d33c357f156bf4d1dec0e",
    measurementId: "G-EGCLYLDY6F"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedRoomsAndFriends() {
    console.log("Fetching some existing users...");
    const usersRef = collection(db, "users");
    const q = query(usersRef, limit(10));
    const querySnapshot = await getDocs(q);

    const users = [];
    querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
    });

    if (users.length < 2) {
        console.error("Not enough users in DB to create rooms/friends. Please create some users first or run the original seed script.");
        process.exit(1);
    }

    console.log(`Found ${users.length} users. Creating 15 fictional villages...`);
    const villagesRef = collection(db, "villages");

    for (let i = 1; i <= 15; i++) {
        // Pick a random host from our fetched users
        const host = users[Math.floor(Math.random() * users.length)];
        const isPrivate = Math.random() > 0.7; // 30% private rooms
        const isMicro = Math.random() > 0.5; // 50% requires mic
        const mode = Math.random() > 0.5 ? "Mode par défaut" : "Mode personnalisé";
        const playersCount = Math.floor(Math.random() * 15) + 1; // 1 to 15 players

        const villageData = {
            name: `Le Village Fictif #${i}`,
            mode: mode,
            isPrivate: isPrivate,
            isMicro: isMicro,
            hostId: host.id,
            hostPseudo: host.nom || host.pseudo || "Hôte Mystère",
            players: [host.id], // Just storing the host for now to represent occupied slots
            playerCount: playersCount, // Mock field for UI purposes
            maxPlayers: 16,
            createdAt: new Date()
        };

        try {
            await addDoc(villagesRef, villageData);
        } catch (error) {
            console.error(`Error inserting village ${i}:`, error);
        }
    }

    console.log("15 villages created successfully.");
    console.log("Done.");
    process.exit(0);
}

seedRoomsAndFriends();
