import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import {
  FiArrowLeft,
  FiMoon,
  FiSun,
  FiBell,
  FiSettings,
  FiToggleLeft,
  FiToggleRight,
  FiLogOut,
} from "react-icons/fi";
import { FaPalette } from "react-icons/fa";
import { auth, db, messaging } from "../firebase";
import { signOut } from "firebase/auth";
import { getToken, onMessage } from "firebase/messaging";
import {
  doc,
  setDoc,
  updateDoc,
  deleteField,
  onSnapshot,
} from "firebase/firestore";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [notifications, setNotifications] = useState(false);
  const manualToggleRef = useRef(false);

  // Realtime listener for push state
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsub = onSnapshot(doc(db, "fcmTokens", user.uid), (snap) => {
      if (manualToggleRef.current) {
        console.log("Manual toggle, skipping Firestore sync");
        return;
      }

      const permissionGranted = Notification.permission === "granted";
      const tokenExists = snap.exists() && snap.data()?.token;
      setNotifications(permissionGranted && tokenExists);
    });

    return () => unsub();
  }, []);

  const handlePushToggle = async (enabled) => {
    setNotifications(enabled);
    manualToggleRef.current = true;

    const user = auth.currentUser;
    if (!user && enabled) {
      alert("Please login to manage push notifications.");
      setNotifications(false);
      manualToggleRef.current = false;
      return;
    }

    if (enabled) {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          alert("Push notification permission denied.");
          setNotifications(false);
          return;
        }

        const token = await getToken(messaging, {
          vapidKey: "<YOUR_VAPID_KEY>",
        });
        if (!token) {
          alert("Failed to retrieve token.");
          setNotifications(false);
          return;
        }

        await setDoc(
          doc(db, "fcmTokens", user.uid),
          {
            token,
            userId: user.uid,
            createdAt: new Date(),
          },
          { merge: true }
        );

        setNotifications(true);
      } catch (error) {
        console.error("Error enabling push:", error);
        setNotifications(false);
      } finally {
        // Release after a short delay so Firestore has time to sync
        setTimeout(() => (manualToggleRef.current = false), 500);
      }
    } else {
      try {
        await updateDoc(doc(db, "fcmTokens", user.uid), {
          token: deleteField(),
        });
        setNotifications(false);
      } catch (error) {
        console.error("Error disabling push:", error);
      } finally {
        setTimeout(() => (manualToggleRef.current = false), 500);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const settingsSections = [
    {
      id: "appearance",
      title: "Appearance & Display",
      icon: FaPalette,
      items: [
        {
          id: "theme",
          title: "Theme Mode",
          subtitle: "Switch between light and dark themes",
          type: "toggle",
          value: theme === "dark",
          onChange: toggleTheme,
          icon: theme === "dark" ? FiMoon : FiSun,
          color: "from-purple-500 to-indigo-600",
        },
      ],
    },
    {
      id: "notifications",
      title: "Notifications & Alerts",
      icon: FiBell,
      items: [
        {
          id: "push-notifications",
          title: "Push Notifications",
          subtitle: "Receive real-time updates",
          type: "toggle",
          value: notifications,
          onChange: handlePushToggle,
          icon: FiBell,
          color: "from-emerald-500 to-green-600",
        },
      ],
    },
  ];

  return (
    <div
      className={`min-h-screen transition-all duration-500 ${
        theme === "dark"
          ? "bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900"
          : "bg-gradient-to-br from-gray-50 via-white to-emerald-50"
      } relative overflow-hidden`}
    >
      <div className="relative z-10 px-3 sm:px-4 py-4 sm:py-6 max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 animate-slide-down">
          <button
            onClick={() => navigate(-1)}
            className={`p-3 ${
              theme === "dark"
                ? "bg-white/10 hover:bg-white/20 border-white/10 text-gray-300 hover:text-white"
                : "bg-black/10 hover:bg-black/20 border-black/10 text-gray-700 hover:text-black"
            } backdrop-blur-xl rounded-2xl border transition-all duration-300 hover:scale-105 group`}
          >
            <FiArrowLeft className="text-xl transition-transform group-hover:-translate-x-1" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/25">
                <FiSettings className="text-white text-xl animate-spin-slow" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-ping"></div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full"></div>
            </div>

            <div>
              <h1
                className={`text-2xl font-black ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Settings
              </h1>
              
            </div>
          </div>
        </header>

        {/* Settings Sections */}
        <div className="space-y-8">
          {settingsSections.map((section, idx) => (
            <div
              key={section.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              <div
                className={`${
                  theme === "dark"
                    ? "bg-white/5 border-white/10"
                    : "bg-white/80 border-black/10"
                } backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border relative overflow-hidden`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-xl"></div>

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <section.icon className="text-white text-xl" />
                    </div>
                    <div>
                      <h2
                        className={`text-xl font-bold ${
                          theme === "dark" ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {section.title}
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 ${
                          theme === "dark"
                            ? "bg-white/5 hover:bg-white/10 border-white/10"
                            : "bg-white/50 hover:bg-white/80 border-black/10"
                        } rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] group`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}
                            >
                              <item.icon className="text-white text-lg" />
                            </div>
                            <div>
                              <h3
                                className={`font-semibold ${
                                  theme === "dark"
                                    ? "text-white"
                                    : "text-gray-900"
                                }`}
                              >
                                {item.title}
                              </h3>
                              <p
                                className={`text-sm ${
                                  theme === "dark"
                                    ? "text-gray-400"
                                    : "text-gray-600"
                                }`}
                              >
                                {item.subtitle}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center">
                            {item.type === "toggle" && (
                              <button
                                onClick={() => item.onChange(!item.value)}
                                className={`p-1 rounded-full transition-all duration-300 ${
                                  item.value
                                    ? "bg-gradient-to-r from-emerald-500 to-green-600"
                                    : theme === "dark"
                                    ? "bg-gray-600"
                                    : "bg-gray-300"
                                } hover:scale-110`}
                              >
                                {item.value ? (
                                  <FiToggleRight className="text-white text-2xl" />
                                ) : (
                                  <FiToggleLeft
                                    className={`text-2xl ${
                                      theme === "dark"
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Logout Section */}
        <div className="mt-8 animate-fade-in">
          <button
            onClick={handleLogout}
            className="w-full p-6 bg-gradient-to-r from-red-500 to-pink-600 rounded-3xl shadow-2xl text-white font-bold text-lg hover:shadow-2xl hover:shadow-red-500/25 transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 flex items-center justify-center gap-3">
              <FiLogOut className="text-2xl group-hover:scale-110 transition-transform duration-300" />
              <span>Sign Out</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
