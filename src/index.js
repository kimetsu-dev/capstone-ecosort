import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

import { AuthProvider } from "./contexts/AuthContext";
import { UserProvider } from "./contexts/UserContext";
import { ThemeProvider } from "./contexts/ThemeContext";

import { isSupported } from "firebase/messaging";

async function registerFirebaseMessagingSW() {
  // Only try in production
  if (process.env.NODE_ENV !== "production") {
    console.log("🚧 Skipping Firebase Messaging service worker in development.");
    return;
  }

  if (await isSupported()) {
    try {
      await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      console.log("✅ Firebase Messaging service worker registered");
    } catch (err) {
      console.error("⚠️ Failed to register Firebase Messaging SW:", err);
    }
  } else {
    console.log("🚫 Firebase messaging not supported in this browser.");
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element with id 'root'");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// ✅ Register default Workbox service worker for caching/offline PWA support
serviceWorkerRegistration.register();

// ✅ Register Firebase Messaging SW only in production + supported browsers
registerFirebaseMessagingSW();
