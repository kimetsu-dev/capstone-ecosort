import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDWRvunKHCqs3maebTRr1dICfxb04XGW6A",
  authDomain: "ecosort-51471.firebaseapp.com",
  projectId: "ecosort-51471",
  // ✅ UPDATED: Matching your actual console value
  storageBucket: "ecosort-51471.firebasestorage.app", 
  messagingSenderId: "296718734304",
  appId: "1:296718734304:web:852095c72930c6b61a1185",
  measurementId: "G-31NRJCYK8P",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Exports the correctly configured storage
export const provider = new GoogleAuthProvider();

// Messaging (safe init)
let messaging = null;

if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
      console.log("✅ Firebase Messaging initialized");
    } else {
      console.warn("🚫 Firebase Messaging not supported in this browser.");
    }
  });
} else {
  console.log("🚧 Skipping Firebase Messaging in development.");
}

export { messaging };
export default app;