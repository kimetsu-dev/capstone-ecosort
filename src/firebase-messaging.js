import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import app from "./firebase";

const VAPID_KEY = "BFFuaGuP8bKDwDsZ6lZm4G98ambUfOca_2eTvLeexdfaSkBwdEUee3z_knD5KrzGdiTsCrR-Zwxjy6c6srTVkuI";

let messaging = null;

export async function initMessaging() {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("🚫 Firebase Messaging not supported in this browser.");
      return null;
    }
    
    // Initialize messaging
    messaging = getMessaging(app);
    return messaging;
  } catch (err) {
    console.error("⚠️ Error initializing messaging:", err);
    return null;
  }
}

export async function requestFirebaseNotificationPermission() {
  // Ensure messaging is initialized
  if (!messaging) {
    await initMessaging();
  }

  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      
      // 1. Wait for the Service Worker (PWA) to be ready.
      // CRITICAL: We want the token to be associated with our MAIN service-worker.js,
      // not the default firebase-messaging-sw.js
      let registration;
      try {
        registration = await navigator.serviceWorker.ready;
      } catch (e) {
        console.warn("Service worker not ready, falling back to default.");
      }

      // 2. Get Token using that specific registration
      const token = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration 
      });
      
      // console.log("🔥 FCM Token:", token);
      return token;
    } else {
      console.log("🚫 Notification permission denied.");
      return null;
    }
  } catch (error) {
    console.error("⚠️ Error getting token:", error);
    return null;
  }
}

export function onMessageListener(callback) {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}