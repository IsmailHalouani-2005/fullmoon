import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, setDoc, doc } from "firebase/firestore";

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

async function seed() {
    console.log("Seeding 100 users...");

    const usersRef = collection(db, "users");
    let currentScore = 15000;

    for (let i = 1; i <= 100; i++) {
        // Decrease score to make it sorted naturally
        currentScore -= Math.floor(Math.random() * 100) + 10;

        const userData = {
            nom: `Joueur Fictif ${i}`,
            email: `joueur${i}@fullmoon.com`,
            mdp: `MotDePasse${i}!`, // Fictitious, normally never store clear text
            score: currentScore,
            rang: i,
            photo_profil: "/assets/images/icones/Photo_Profil-transparent.png",
            createdAt: new Date()
        };

        try {
            await addDoc(usersRef, userData);
            if (i % 10 === 0) console.log(`Inserted ${i} users...`);
        } catch (error) {
            console.error(`Error inserting user ${i}:`, error);
        }
    }

    console.log("Seeding complete! 100 users created.");
    process.exit(0);
}

seed();
