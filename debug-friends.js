const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
const { getDatabase, ref, get } = require('firebase/database');

const firebaseConfig = {
    apiKey: "AIzaSyB5n0XoICsbfFuXo_UwdXX8Ax00Fe2KCSQ",
    authDomain: "fullmoon-e94e4.firebaseapp.com",
    projectId: "fullmoon-e94e4",
    storageBucket: "fullmoon-e94e4.firebasestorage.app",
    messagingSenderId: "509949476619",
    appId: "1:509949476619:web:0d33c357f156bf4d1dec0e",
    databaseURL: "https://fullmoon-e94e4-default-rtdb.europe-west1.firebasedatabase.app" // Let's try the correct region URL for admin SDK
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

async function check() {
    const usersSnap = await getDocs(collection(db, "users"));
    for (const userDoc of usersSnap.docs) {
        try {
            const rtdbSnap = await get(ref(rtdb, 'status/' + userDoc.id));
        } catch (e) {}

        const friendsSnap = await getDocs(collection(db, `users/${userDoc.id}/friends`));
        friendsSnap.forEach(fDoc => {});
    }
}

check().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
