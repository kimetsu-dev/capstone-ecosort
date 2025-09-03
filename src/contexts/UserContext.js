import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserData(null);
        setLoading(false);
        return;
      }
      // Listen to user profile document changes
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const unsubscribeDoc = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            setUserData(null);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching user profile:", error);
          setUserData(null);
          setLoading(false);
        }
      );
      // Cleanup Firestore listener on unmount or user change
      return () => unsubscribeDoc();
    });
    // Cleanup auth listener on unmount
    return () => unsubscribeAuth();
  }, []);

  return (
    <UserContext.Provider value={{ user, userData, loading }}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook to access user context
export function useUser() {
  const context = useContext(UserContext);
  if (context === null) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
