import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useTheme } from "./contexts/ThemeContext";
import "./index.css";

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

import { useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

const MobileWelcome = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Text color switches using tailwind dark variant or conditional class based on isDark
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-white/90" : "text-gray-700";
  const bgCard = isDark ? "bg-white/5 border border-white/10" : "bg-white/80 border border-black/10";

  return (
    <div className={`min-h-screen flex flex-col overflow-hidden bg-gradient-to-br ${
      isDark ? "from-slate-900 via-gray-900 to-emerald-900" : "from-emerald-500 to-green-500"
    }`}>
      {/* Top Bar with Logo and Buttons */}
      <div className="w-full flex justify-between items-center p-4 pb-2">
        {/* Logo and ECOSORT left */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #059669, #047857)" }}
          >
            E
          </div>
          <h1 className={`text-xl font-bold select-none ${textPrimary}`}>ECOSORT</h1>
        </div>

        {/* Login and Signup buttons right */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/login")}
            className={`font-semibold text-sm px-4 py-2 rounded-lg transition-colors border
              ${isDark ? "text-white hover:bg-white/20 border-white/40" : "text-gray-900 hover:bg-gray-200 border-gray-300"}`}
            type="button"
          >
            Login
          </button>

          <button
            onClick={() => navigate("/signup")}
            className="bg-white hover:bg-gray-100 text-emerald-600 font-semibold text-sm px-5 py-2 rounded-lg shadow-lg transition-colors"
            type="button"
          >
            Sign Up
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-8">
        {/* Title Section */}
        <div className={`text-center mb-6 ${textPrimary}`}>
          <h2 className="text-4xl font-bold leading-tight mb-3">
            Turn Your Trash<br />
            into Rewards!
          </h2>
          <p className={`text-lg font-medium ${textSecondary}`}>
            Earn points every time you segregate waste properly.
          </p>
        </div>

        {/* Illustration Area */}
        <div className="flex justify-center mb-8">
          <div className="w-32 h-32 border-8 border-white/90 rounded-full flex items-center justify-center text-white text-6xl font-bold shadow-2xl bg-white/10 backdrop-blur-sm">
            ♻
          </div>
        </div>

        {/* Statistics Box */}
        <div className={`${bgCard} backdrop-blur-md rounded-xl p-5 mb-6 shadow-lg`}>
          <p className={`text-sm leading-relaxed font-medium drop-shadow-sm ${textSecondary}`}>
            ECOSORT combines recycling rewards, community reporting, and social features to create a comprehensive platform for sustainable waste management.
          </p>
        </div>

        {/* Call to Action */}
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

        {/* Footer */}
        <div className="text-center mt-8 pt-4 rounded-xl">
          <div className="flex justify-between items-center text-white/80 text-xs bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div>
              <p>Bagong collectong Day every Sunday morning</p>
            </div>
            <div className="text-right">
              <p>CONTACT US:</p>
              <p>09234567890</p>
              <p>baguioECOSORT@gmail.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};





const SmartWelcome = () => {
  const [showMobileVersion, setShowMobileVersion] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const { theme } = useTheme();
  const [systemTheme, setSystemTheme] = React.useState("light");

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    const handleChange = (e) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  React.useEffect(() => {
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
      <div className={`h-screen flex items-center justify-center transition-colors duration-300 ${isDark ? "bg-gray-900" : "bg-emerald-50"}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-colors duration-300 ${isDark ? "bg-gray-700 text-gray-100" : "bg-emerald-500 text-white"}`}>
          E
        </div>
      </div>
    );
  }

  return showMobileVersion ? <MobileWelcome /> : <Welcome />;
};

const LoadingSpinner = () => {
  const { theme } = useTheme();
  const [systemTheme, setSystemTheme] = React.useState("light");

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    const handleChange = (e) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark");

  return (
    <div className={`h-screen flex items-center justify-center transition-colors duration-300 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="text-center">
        <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-2 transition-colors duration-300 ${isDark ? "border-gray-400" : "border-emerald-500"}`}></div>
        <p className={`text-sm transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-600"}`}>Loading...</p>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ element, isAdminRoute = false }) => {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (isAdminRoute && !isAdmin) return <Navigate to="/dashboard" replace />;

  return element;
};

// Wraps Routes and applies theme class to root div
// Wraps Routes and applies theme class to root div
const ThemedAppWrapper = () => {
  const { theme, systemTheme } = useTheme();

  // Determine active theme class for top-level container
  const activeTheme = theme === "system" ? systemTheme : theme;

  return (
    <div
      className={`${
        activeTheme === "dark" ? "dark" : ""
      } min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300`}
    >
      <Router>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/welcome" replace />} />

          {/* Public routes */}
          <Route path="/welcome" element={<SmartWelcome />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          {/* Protected user routes */}
          <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
          <Route path="/forum" element={<ProtectedRoute element={<Forum />} />} />
          <Route path="/submitwaste" element={<ProtectedRoute element={<SubmitWaste />} />} />
          <Route path="/rewards" element={<ProtectedRoute element={<Rewards />} />} />
          <Route path="/report" element={<ProtectedRoute element={<Report />} />} />
          <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
          <Route path="/transactions" element={<ProtectedRoute element={<Transactions />} />} />
          <Route path="/leaderboard" element={<ProtectedRoute element={<Leaderboard />} />} />
          <Route path="/my-redemptions" element={<ProtectedRoute element={<MyRedemptions />} />} />
          <Route path="/adminprofile" element={<ProtectedRoute element={<AdminProfile />} />} />
          <Route path="/settings" element={<ProtectedRoute element={<Settings />} />} />

          {/* Protected admin route */}
          <Route path="/adminpanel" element={<ProtectedRoute element={<AdminPanel />} isAdminRoute />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
      </Router>
    </div>
  );
};

export default function App() {
  useEffect(() => {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isPWA) {
      // Add no-select class to body
      document.body.classList.add("no-select");

      // Prevent copy, cut, right-click, text select, drag
      const preventDefault = (e) => e.preventDefault();
      document.addEventListener("copy", preventDefault);
      document.addEventListener("cut", preventDefault);
      document.addEventListener("contextmenu", preventDefault);
      document.addEventListener("selectstart", preventDefault);
      document.addEventListener("dragstart", preventDefault);

      // Disable saving/dragging of images
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
