import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import app from "./firebase";

const VAPID_KEY =
  "BFFuaGuP8bKDwDsZ6lZm4G98ambUfOca_2eTvLeexdfaSkBwdEUee3z_knD5KrzGdiTsCrR-Zwxjy6c6srTVkuI";

let messaging = null;

// Initialize messaging safely
export async function initMessaging() {
  try {
    // Disable in development to avoid runtime errors
    if (process.env.NODE_ENV !== "production") {
      console.log("🚧 Skipping Firebase Messaging in development.");
      return null;
    }

    const supported = await isSupported();
    if (!supported) {
      console.warn("🚫 Firebase Messaging not supported in this browser.");
      return null;
    }

    messaging = getMessaging(app);
    return messaging;
  } catch (err) {
    console.error("⚠️ Error initializing messaging:", err);
    return null;
  }
}

export async function requestFirebaseNotificationPermission() {
  if (!messaging) {
    console.warn("🚫 Messaging not initialized; skipping request.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      return token;
    } else {
      console.log("🚫 Notification permission not granted.");
      return null;
    }
  } catch (error) {
    console.error("⚠️ Error requesting permission or getting token:", error);
    return null;
  }
}

export function onMessageListener(callback) {
  if (!messaging) {
    console.warn("🚫 Messaging not initialized; onMessageListener disabled.");
    return;
  }
  onMessage(messaging, (payload) => {
    callback(payload);
  });
}
