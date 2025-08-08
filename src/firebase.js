import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 


const firebaseConfig = {
  apiKey: "AIzaSyDWRvunKHCqs3maebTRr1dICfxb04XGW6A",
  authDomain: "ecosort-51471.firebaseapp.com",
  projectId: "ecosort-51471",
  storageBucket: "ecosort-51471.appspot.com", 
  messagingSenderId: "296718734304",
  appId: "1:296718734304:web:852095c72930c6b61a1185",
  measurementId: "G-31NRJCYK8P"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); 
export const provider = new GoogleAuthProvider(); 

export default app;

