import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDWRvunKHCqs3maebTRr1dICfxb04XGW6A",
  authDomain: "ecosort-51471.firebaseapp.com",
  projectId: "ecosort-51471",
  storageBucket: "ecosort-51471.firebasestorage.app", // Updated bucket URL
  messagingSenderId: "296718734304",
  appId: "1:296718734304:web:852095c72930c6b61a1185",
  measurementId: "G-31NRJCYK8P",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const provider = new GoogleAuthProvider();

// --- Messaging Helpers ---

export const requestForToken = async () => {
  try {
    const hasMessaging = await isSupported();
    if (!hasMessaging) {
      console.log("Firebase Messaging not supported in this browser.");
      return null;
    }

    const messaging = getMessaging(app);
    
    // ⚠️ IMPORTANT: Replace this string with your actual "Key pair" from:
    // Firebase Console -> Project Settings -> Cloud Messaging -> Web Configuration
    const currentToken = await getToken(messaging, {
      vapidKey: "BFFuaGuP8bKDwDsZ6lZm4G98ambUfOca_2eTvLeexdfaSkBwdEUee3z_knD5KrzGdiTsCrR-Zwxjy6c6srTVkuI" 
    });

    if (currentToken) {
      return currentToken;
    } else {
      console.log("No registration token available. Request permission to generate one.");
      return null;
    }
  } catch (err) {
    console.log("An error occurred while retrieving token: ", err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    isSupported().then((hasMessaging) => {
      if (hasMessaging) {
        const messaging = getMessaging(app);
        onMessage(messaging, (payload) => {
          resolve(payload);
        });
      }
    });
  });

export default app;