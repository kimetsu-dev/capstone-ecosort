import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

// Import your pages
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

// Import contexts
import { useAuth } from "./contexts/AuthContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";

// Loading component with theme support
const LoadingSpinner = () => {
  const { theme, styles } = useTheme();

  return (
    <div className={`${styles.page} flex items-center justify-center`}>
      <div className="text-center">
        <div
          className={`inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin ${styles.text.accent}`}
        ></div>
        <p className={`mt-4 ${styles.text.secondary} font-mono text-sm`}>Loading...</p>
      </div>
    </div>
  );
};

// ProtectedRoute component for auth-protected routes and optional admin check
const ProtectedRoute = ({ element, isAdminRoute = false }) => {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (isAdminRoute && !isAdmin) return <Navigate to="/dashboard" replace />;

  return element;
};

const ThemedAppWrapper = () => {
  const { theme, styles } = useTheme();

  return (
    <div className={`no-select ${styles.page} relative overflow-hidden`}>
      {/* Global background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className={`absolute top-20 left-10 w-32 h-32 ${
            theme === "dark" ? "bg-emerald-500/5" : "bg-emerald-500/10"
          } rounded-full blur-xl animate-pulse-slow`}
        ></div>
        <div
          className={`absolute top-40 right-20 w-48 h-48 ${
            theme === "dark" ? "bg-blue-500/5" : "bg-blue-500/10"
          } rounded-full blur-2xl animate-float`}
        ></div>
        <div
          className={`absolute bottom-32 left-1/4 w-24 h-24 ${
            theme === "dark" ? "bg-purple-500/5" : "bg-purple-500/10"
          } rounded-full blur-lg animate-bounce-slow`}
        ></div>

        {/* Grid pattern overlay */}
        <div
          className={`absolute inset-0 ${
            theme === "dark" ? "opacity-[0.02]" : "opacity-[0.05]"
          }`}
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${
              theme === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"
            } 1px, transparent 0)`,
            backgroundSize: "50px 50px",
          }}
        ></div>
      </div>

      {/* Main content with proper z-index */}
      <div className="relative z-10">
        <Router>
          <Routes>
            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/welcome" replace />} />

            {/* Public routes */}
            <Route path="/welcome" element={<Welcome />} />
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
            <Route
              path="/adminpanel"
              element={<ProtectedRoute element={<AdminPanel />} isAdminRoute />}
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </Router>
      </div>

      {/* Global animations and theme-aware styles */}
      <style>{`
        /* Global animations */
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-15px) rotate(1deg); }
          66% { transform: translateY(-8px) rotate(-1deg); }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-10px) scale(1.05); }
        }


        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }


        /* No-select utility */
        .no-select {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }


        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${theme === "dark" ? "rgba(31, 41, 55, 0.5)" : "rgba(243, 244, 246, 0.5)"};
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #10b981, #0d9488);
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #059669, #0f766e);
        }


        /* Selection styling */
        ::selection {
          background: rgba(16, 185, 129, 0.3);
          color: ${theme === "dark" ? "#ffffff" : "#000000"};
        }
      `}</style>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ThemedAppWrapper />
    </ThemeProvider>
  );
}
