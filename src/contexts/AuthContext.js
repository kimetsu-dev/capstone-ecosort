import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);

        if (!user || !user.uid) {
          // Not logged in - reset all states
          setIsAdmin(false);
          setLoading(false);
          setAuthInitialized(true);
          return;
        }

        // User is logged in, fetch their role
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setIsAdmin(userData.role === "admin");
        } else {
          console.warn("User doc not found, creating default for:", user.uid);

          // Create default user doc
          await setDoc(userDocRef, {
            email: user.email,
            role: "resident",
            totalPoints: 0,
            createdAt: new Date(),
          });

          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error in auth state change:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
        setAuthInitialized(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sign in with email and password
  const loginUser = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Don't set loading here - let onAuthStateChanged handle it
    } catch (error) {
      throw error;
    }
  };

  // Create user with email and password
  const createUser = async (email, password) => {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // Create Firestore user document
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "resident",
        totalPoints: 0,
        createdAt: new Date(),
      });
    } catch (error) {
      throw error;
    }
  };

  // Logout user
  const logOut = async () => {
    try {
      // Reset states immediately for faster UI response
      setCurrentUser(null);
      setIsAdmin(false);
      setLoading(true);
      
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ 
        currentUser, 
        isAdmin, 
        loading, 
        authInitialized,
        loginUser, 
        createUser, 
        logOut 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};