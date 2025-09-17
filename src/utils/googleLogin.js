import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase"; // use existing provider

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Google sign-in failed:", error);
    throw error;
  }
};
