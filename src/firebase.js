import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD9Xv7FE-vb7xpHrn1w0yHHHjUrG02a-FU",
  authDomain: "digital-studio-8a4a7.firebaseapp.com",
  projectId: "digital-studio-8a4a7",
  storageBucket: "digital-studio-8a4a7.firebasestorage.app",
  messagingSenderId: "665186835522",
  appId: "1:665186835522:web:153a30000f528ea05de1db",
  measurementId: "G-PSLD9C0NHC"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
