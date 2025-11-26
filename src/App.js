import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useTheme, ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./contexts/AuthContext";
import "./index.css";

import BackButtonHandler from "./BackButtonHandler";
import { requestFirebaseNotificationPermission, onMessageListener } from "./firebase-messaging";

/* Pages */
import Welcome from "./pages/Welcome";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import AdminProfile from "./pages/AdminProfile";
import Dashboard from "./pages/Dashboard";
import Forum from "./pages/Forum";
import SubmitWaste from "./pages/SubmitWaste";
import Rewards from "./pages/Rewards";
import Report from "./pages/Report";
import Profile from "./pages/Profile";
import Transactions from "./pages/Transactions";
import Leaderboard from "./pages/Leaderboard";
import MyRedemptions from "./pages/MyRedemptions";
import Settings from "./pages/Settings";
import PublicVerification from "./pages/PublicVerification";

/* ---------------- MOBILE WELCOME ---------------- */
const MobileWelcome = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-white/90" : "text-gray-700";
  const bgCard = isDark
    ? "bg-white/5 border border-white/10"
    : "bg-white/80 border border-black/10";

  return (
    <div
      className={`min-h-screen flex flex-col overflow-hidden bg-gradient-to-br ${
        isDark
          ? "from-slate-900 via-gray-900 to-emerald-900"
          : "from-emerald-500 to-green-500"
      }`}
    >
      {/* Top Bar */}
      <div className="w-full flex justify-between items-center p-4 pb-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #059669, #047857)" }}
          >
            E
          </div>
          <h1 className={`text-xl font-bold select-none ${textPrimary}`}>
            ECOSORT
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate("/signup")}
            className="bg-white hover:bg-gray-100 text-emerald-600 font-semibold text-sm px-5 py-2 rounded-lg shadow-lg transition-colors"
            type="button"
          >
            Sign Up
          </button>

          <button
            onClick={() => navigate("/login")}
            className={`font-semibold text-sm px-4 py-2 rounded-lg transition-colors border
              ${
                isDark
                  ? "text-white hover:bg-white/20 border-white/40"
                  : "text-gray-900 hover:bg-gray-200 border-gray-300"
              }`}
            type="button"
          >
            Login
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-8">
        <div className={`text-center mb-6 ${textPrimary}`}>
          <h2 className="text-4xl font-bold leading-tight mb-3">
            Turn Your Trash<br />
            into Rewards!
          </h2>
          <p className={`text-lg font-medium ${textSecondary}`}>
            Earn points every time you segregate waste properly.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="w-32 h-32 border-8 border-white/90 rounded-full flex items-center justify-center text-white text-6xl font-bold shadow-2xl bg-white/10 backdrop-blur-sm">
            ♻
          </div>
        </div>

        <div className={`${bgCard} backdrop-blur-md rounded-xl p-5 mb-6 shadow-lg`}>
          <p className={`text-sm leading-relaxed font-medium drop-shadow-sm ${textSecondary}`}>
            ECOSORT combines recycling rewards, community reporting, and social
            features to create a comprehensive platform for sustainable waste
            management.
          </p>
        </div>

        <div className="text-center">
          <p className={`text-lg font-medium mb-3 ${textSecondary}`}>
            Redeem your points for essential goods!
          </p>
          <button
            onClick={() => navigate("/signup")}
            className="bg-white hover:bg-gray-100 text-emerald-600 font-bold text-lg px-10 py-4 rounded-xl shadow-lg transition-all transform hover:scale-105"
            type="button"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- SMART WELCOME ---------------- */
const SmartWelcome = () => {
  const [showMobileVersion, setShowMobileVersion] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  const [systemTheme, setSystemTheme] = useState("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    const handleChange = (e) => setSystemTheme(e.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const detectMobile = () => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const isIOSStandalone = window.navigator.standalone === true;
      const isMobile = window.innerWidth <= 768;
      return isStandalone || isIOSStandalone || isMobile;
    };
    setTimeout(() => {
      setShowMobileVersion(detectMobile());
      setIsLoading(false);
    }, 50);
  }, []);

  const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark");

  if (isLoading) {
    return (
      <div
        className={`h-screen flex items-center justify-center transition-colors duration-300 ${
          isDark ? "bg-gray-900" : "bg-emerald-50"
        }`}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-colors duration-300 ${
            isDark ? "bg-gray-700 text-gray-100" : "bg-emerald-500 text-white"
          }`}
        >
          E
        </div>
      </div>
    );
  }

  return showMobileVersion ? <MobileWelcome /> : <Welcome />;
};

/* ---------------- LOADING SPINNER ---------------- */
const LoadingSpinner = () => {
  const { theme } = useTheme();
  const [systemTheme, setSystemTheme] = useState("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    const handleChange = (e) => setSystemTheme(e.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark");

  return (
    <div
      className={`h-screen flex items-center justify-center transition-colors duration-300 ${
        isDark ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="text-center">
        <div
          className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-2 transition-colors duration-300 ${
            isDark ? "border-gray-400" : "border-emerald-500"
          }`}
        ></div>
        <p
          className={`text-sm transition-colors duration-300 ${
            isDark ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Loading...
        </p>
      </div>
    </div>
  );
};

/* ---------------- ROUTE GUARD COMPONENT ---------------- */
const RouteGuard = ({ children, requireAuth = false, adminOnly = false, publicOnly = false }) => {
  const { currentUser, isAdmin, loading, authInitialized } = useAuth();
  
  // Show loading until auth is fully initialized
  if (loading || !authInitialized) {
    return <LoadingSpinner />;
  }

  // Public only routes (redirect authenticated users)
  if (publicOnly && currentUser) {
    const redirectPath = isAdmin ? "/adminpanel" : "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  // Auth required routes
  if (requireAuth && !currentUser) {
    return <Navigate to="/welcome" replace />;
  }

  // Admin only routes
  if (adminOnly && (!currentUser || !isAdmin)) {
    const redirectPath = currentUser ? "/dashboard" : "/welcome";
    return <Navigate to={redirectPath} replace />;
  }

  // User only routes (prevent admin access)
  if (requireAuth && !adminOnly && currentUser && isAdmin) {
    return <Navigate to="/adminpanel" replace />;
  }

  return children;
};

/* ---------------- THEMED APP WRAPPER ---------------- */
const ThemedAppWrapper = () => {
  const { theme, systemTheme } = useTheme();
  const { authInitialized } = useAuth();
  const activeTheme = theme === "system" ? systemTheme : theme;

  // Initialize Notification listeners
  useEffect(() => {
    // 1. Request Permission immediately
    requestFirebaseNotificationPermission()
      .then((token) => {
        if (token) {
          console.log("🔔 Notification permission granted. Token:", token);
          // In a real app, you would send this token to your backend/Firestore
          // e.g., updateDoc(doc(db, 'users', userId), { fcmToken: token });
        }
      })
      .catch((err) => console.log("Notification permission error:", err));

    // 2. Listen for FOREGROUND messages (while user is using the app)
    const unsubscribe = onMessageListener((payload) => {
      console.log("💬 Foreground Message Received:", payload);
      const { title, body } = payload.notification || {};
      
      // Native notification fallback if you want to show system notification even when app is open
      if (Notification.permission === 'granted') {
         new Notification(title, { 
           body,
           icon: '/logo192.png'
         });
      }
    });

    // Cleanup isn't strictly necessary for the listener wrapper but good practice
    return () => {
      // unsubscribe if your onMessageListener returned an unsubscribe function
    };
  }, []);

  // Show initial loading screen until auth is initialized
  if (!authInitialized) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        activeTheme === "dark" ? "bg-gray-900" : "bg-gray-50"
      }`}>
        <div className="text-center">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${
            activeTheme === "dark" ? "bg-gray-700 text-gray-100" : "bg-emerald-500 text-white"
          }`}>
            E
          </div>
          <p className={`mt-2 text-sm ${
            activeTheme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}>
            Initializing...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${
        activeTheme === "dark" ? "dark" : ""
      } min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300`}
    >
      <Router>
        <BackButtonHandler />
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/welcome" replace />} />

          {/* Public Routes */}
          <Route
            path="/welcome"
            element={
              <RouteGuard publicOnly>
                <SmartWelcome />
              </RouteGuard>
            }
          />
          <Route
            path="/login"
            element={
              <RouteGuard publicOnly>
                <Login />
              </RouteGuard>
            }
          />
          <Route
            path="/signup"
            element={
              <RouteGuard publicOnly>
                <Signup />
              </RouteGuard>
            }
          />
           <Route
            path="/verify"
            element={<PublicVerification />}
          />

          {/* User Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <RouteGuard requireAuth>
                <Dashboard />
              </RouteGuard>
            }
          />
          <Route
            path="/forum"
            element={
              <RouteGuard requireAuth>
                <Forum />
              </RouteGuard>
            }
          />
          <Route
            path="/submitwaste"
            element={
              <RouteGuard requireAuth>
                <SubmitWaste />
              </RouteGuard>
            }
          />
          <Route
            path="/rewards"
            element={
              <RouteGuard requireAuth>
                <Rewards />
              </RouteGuard>
            }
          />
          <Route
            path="/report"
            element={
              <RouteGuard requireAuth>
                <Report />
              </RouteGuard>
            }
          />
          <Route
            path="/profile"
            element={
              <RouteGuard requireAuth>
                <Profile />
              </RouteGuard>
            }
          />
          <Route
            path="/transactions"
            element={
              <RouteGuard requireAuth>
                <Transactions />
              </RouteGuard>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <RouteGuard requireAuth>
                <Leaderboard />
              </RouteGuard>
            }
          />
          <Route
            path="/my-redemptions"
            element={
              <RouteGuard requireAuth>
                <MyRedemptions />
              </RouteGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <RouteGuard requireAuth>
                <Settings />
              </RouteGuard>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/adminpanel"
            element={
              <RouteGuard requireAuth adminOnly>
                <AdminPanel />
              </RouteGuard>
            }
          />
          <Route
            path="/adminprofile"
            element={
              <RouteGuard requireAuth adminOnly>
                <AdminProfile />
              </RouteGuard>
            }
          />
          <Route
            path="/adminsettings"
            element={
              <RouteGuard requireAuth adminOnly>
                <Settings />
              </RouteGuard>
            }
          />

          {/* Fallback */}
          <Route 
            path="*" 
            element={<Navigate to="/welcome" replace />}
          />
        </Routes>
      </Router>
    </div>
  );
};

/* ---------------- APP ---------------- */
export default function App() {
  useEffect(() => {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isPWA) {
      document.body.classList.add("no-select");

      const preventDefault = (e) => e.preventDefault();
      document.addEventListener("copy", preventDefault);
      document.addEventListener("cut", preventDefault);
      document.addEventListener("contextmenu", preventDefault);
      document.addEventListener("selectstart", preventDefault);
      document.addEventListener("dragstart", preventDefault);

      const images = document.querySelectorAll("img");
      images.forEach((img) => img.classList.add("no-save"));

      return () => {
        document.body.classList.remove("no-select");
        document.removeEventListener("copy", preventDefault);
        document.removeEventListener("cut", preventDefault);
        document.removeEventListener("contextmenu", preventDefault);
        document.removeEventListener("selectstart", preventDefault);
        document.removeEventListener("dragstart", preventDefault);

        images.forEach((img) => img.classList.remove("no-save"));
      };
    }
  }, []);

  return (
    <ThemeProvider>
      <ThemedAppWrapper />
    </ThemeProvider>
  );
}