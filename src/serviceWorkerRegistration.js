// Updated serviceWorkerRegistration.js
// Enhanced to work with versioned EcoSort service-worker.js

const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    window.location.hostname === "[::1]" ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function register(config) {
  if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) return;

    window.addEventListener("load", () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        // Localhost: validate and log helpful info
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log(
            "✅ This app is being served cache-first by a service worker. See https://cra.link/PWA"
          );
        });
      } else {
        // Production: just register
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log("🧩 Service Worker registered:", registration.scope);

      // Listen for new updates
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              // New update available
              console.log("🔄 New content is available!");

              if (config && config.onUpdate) {
                config.onUpdate(registration);
              } else {
                // Show prompt or auto-reload
                showUpdatePrompt(registration);
              }
            } else {
              console.log("📦 Content is cached for offline use.");
              if (config && config.onSuccess) config.onSuccess(registration);
            }
          }
        };
      };

      // Optional: periodically check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // every 1 hour
    })
    .catch((error) => {
      console.error("❌ Error during service worker registration:", error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, { headers: { "Service-Worker": "script" } })
    .then((response) => {
      const contentType = response.headers.get("content-type");
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf("javascript") === -1)
      ) {
        // No service worker found – clear old one
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => window.location.reload());
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log("⚠️ No internet connection found. App is offline.");
    });
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => registration.unregister())
      .catch((error) => console.error(error.message));
  }
}

/**
 * 🔔 Show update prompt or auto-activate new service worker.
 * This listens for the "waiting" service worker and activates it on user approval.
 */
function showUpdatePrompt(registration) {
  if (!registration || !registration.waiting) return;

  const message =
    "A new version of EcoSort is available! Would you like to update now?";
  if (window.confirm(message)) {
    // Trigger skipWaiting in service-worker.js
    registration.waiting.postMessage({ type: "SKIP_WAITING" });

    registration.waiting.addEventListener("statechange", (e) => {
      if (e.target.state === "activated") {
        console.log("✅ Updated to new service worker version. Reloading...");
        window.location.reload();
      }
    });
  } else {
    console.log("User postponed update.");
  }
}

// 🔎 Optional: Log current SW version for debugging
navigator.serviceWorker?.ready?.then(async (reg) => {
  try {
    const response = await fetch(window.location.origin);
    const swVersion = response.headers.get("X-SW-Version");
    if (swVersion) {
      console.log(`🌍 Active Service Worker version: ${swVersion}`);
    }
  } catch (e) {
    // Silent fail if offline
  }
});
