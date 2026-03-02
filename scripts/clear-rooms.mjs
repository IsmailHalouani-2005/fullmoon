import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

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

async function clearRooms() {
    console.log("Fetching all groups (rooms)...");
    const groupsRef = collection(db, "groups");
    const querySnapshot = await getDocs(groupsRef);

    let count = 0;
    for (const document of querySnapshot.docs) {
        await deleteDoc(doc(db, "groups", document.id));
        count++;
    }

    console.log(`Successfully deleted ${count} rooms.`);
    process.exit(0);
}

clearRooms();
