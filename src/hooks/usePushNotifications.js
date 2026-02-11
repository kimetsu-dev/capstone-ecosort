import { useEffect } from "react";
import { requestForToken, onMessageListener, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";

const usePushNotifications = (user) => {
  useEffect(() => {
    if (!user) return;

    // 1. Request Permission & Save Token
    const initializePush = async () => {
      try {
        const token = await requestForToken();
        if (token) {
          // Save token to user profile so Admin/System can send messages to it
          // We use merge: true to avoid overwriting other user data
          await setDoc(doc(db, "users", user.uid), { 
            fcmToken: token,
            lastTokenUpdate: new Date()
          }, { merge: true });
          
          console.log("Push Notification Token synced.");
        }
      } catch (error) {
        console.error("Error initializing push notifications:", error);
      }
    };

    initializePush();

    // 2. Listen for FOREGROUND messages
    // These appear when the app is OPEN and focused.
    // Background messages are handled by firebase-messaging-sw.js
    const unsubscribe = onMessageListener().then((payload) => {
      if (payload) {
        console.log("Foreground push received:", payload);
        
        // Show a visual toast for the foreground notification
        toast.info(`${payload.notification.title}: ${payload.notification.body}`, {
            icon: "🔔",
            position: "top-right",
            autoClose: 5000,
        });
      }
    });

    return () => {
      // Cleanup if necessary (Promises don't strictly need cleanup but good practice)
    };
  }, [user]);
};

export default usePushNotifications;