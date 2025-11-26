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

// ✅ Enhanced service worker registration with auto-update support
serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    console.log('✅ Service worker registered successfully');
    
    // Check for updates every 60 seconds
    setInterval(() => {
      registration.update();
      console.log('🔄 Checking for updates...');
    }, 60000);
  },
  onUpdate: (registration) => {
    console.log('🎉 New version available!');
    
    // Store the registration globally so UpdateBanner component can access it
    if (registration && registration.waiting) {
      // Dispatch custom event that UpdateBanner will listen to
      window.dispatchEvent(
        new CustomEvent('swUpdated', { detail: registration })
      );
    }
  },
});

// Listen for controller change and reload
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🔄 New service worker activated, reloading...');
    window.location.reload();
  });
}

// Check for updates when app comes back into focus
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.update();
      console.log('👀 App focused, checking for updates...');
    });
  }
});

// ✅ Register Firebase Messaging SW only in production + supported browsers
registerFirebaseMessagingSW();