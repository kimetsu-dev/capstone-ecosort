import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebase"; // Your firebase config exports
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user || !user.uid) {
        // Not logged in
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setIsAdmin(userData.role === "admin");
        } else {
          console.warn("User doc not found, creating default for:", user.uid);

          // Create default user doc so rules will pass
          await setDoc(userDocRef, {
            email: user.email,
            role: "resident", // default role
            totalPoints: 0,
            createdAt: new Date(),
          });

          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error reading user doc:", error);
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign in with email and password
  const loginUser = async (email, password) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } finally {
      setLoading(false);
    }
  };

  // Create user with email and password
  const createUser = async (email, password) => {
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // Create Firestore user document
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "resident", // default role
        totalPoints: 0,
        createdAt: new Date(),
      });
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>; // Replace with spinner if you like
  }

  return (
    <AuthContext.Provider
      value={{ currentUser, isAdmin, loading, loginUser, createUser, logOut }}
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
