import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser } from "react-icons/fi";
import { useTheme } from "../contexts/ThemeContext";
import { DashboardCalendar } from "../components/DashboardCalendar";
import NotificationCenter from "../components/NotificationCenter";

import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  FaRecycle,
  FaGift,
  FaExclamationTriangle,
  FaTrophy,
  FaFileAlt,
  FaCoins,
} from "react-icons/fa";

const MENU_ITEMS = [
  {
    id: "submit",
    title: "Submit",
    subtitle: "Submit Waste",
    icon: FaRecycle,
    color: "from-emerald-400 via-teal-500 to-green-600",
    route: "/submitwaste",
  },
  {
    id: "rewards",
    title: "Reward Vault",
    subtitle: "Redeem Rewards",
    icon: FaGift,
    color: "from-amber-400 via-orange-500 to-yellow-600",
    route: "/rewards",
  },
  {
    id: "report",
    title: "Report Hub",
    subtitle: "Report Violations",
    icon: FaExclamationTriangle,
    color: "from-red-400 via-rose-500 to-pink-600",
    route: "/forum",
  },
  {
    id: "leaderboard",
    title: "Leaderboard",
    subtitle: "Community Leaderboard",
    icon: FaTrophy,
    color: "from-blue-400 via-indigo-500 to-purple-600",
    route: "/leaderboard",
  },
  {
    id: "transactions",
    title: "Transactions",
    subtitle: "Transaction history",
    icon: FaFileAlt,
    color: "from-gray-400 via-slate-500 to-gray-600",
    route: "/transactions",
  },
];

// Optional: Error Boundary to catch errors, you can wrap Dashboard export with this in app if desired
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Dashboard() {
  const themeContext = useTheme();
  const [userName, setUserName] = useState(null);
  const [points, setPoints] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [error, setError] = useState(null);

  // Firestore listeners for user data and notifications
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoadingUser(false);
      setError("No authenticated user");
      return;
    }
    const userRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserName(data.username || "User");
          setPoints(data.totalPoints ?? 0);
          setError(null);
        } else {
          setError("User data not found");
        }
        setLoadingUser(false);
      },
      (error) => {
        console.error("User listener error:", error);
        setError(error.message);
        setLoadingUser(false);
      }
    );

    const notificationsRef = collection(db, "notifications", user.uid, "userNotifications");
    const notificationsQuery = query(notificationsRef, orderBy("createdAt", "desc"));
    const unsubscribeNotifications = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notifList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Defensive: Ensure notifList is always array
        const filteredNotifs = Array.isArray(notifList)
          ? notifList.filter(
              (notif) =>
                notif.message &&
                (notif.message.toLowerCase().includes("approved") ||
                 notif.message.toLowerCase().includes("confirmed"))
            )
          : [];

        setNotifications(filteredNotifs);
        setUnreadCount(
          Array.isArray(filteredNotifs)
            ? filteredNotifs.filter((n) => !n.read).length
            : 0
        );
        setLoadingNotifications(false);
      },
      (error) => {
        console.error("Notifications listener error:", error);
        setLoadingNotifications(false);
      }
    );

    return () => {
      unsubscribeUser();
      unsubscribeNotifications();
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") setShowNotifications(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Update currentTime every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!themeContext) {
    console.error("Theme context not available");
    return <div>Loading...</div>;
  }

  const { styles, isDark } = themeContext;

  const getThemeClass = (styleKey, fallback = "") =>
    styles?.[styleKey] || fallback;

  // Greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Mark a notification as read
  const markAsRead = async (id) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const user = auth.currentUser;
      if (!user) return;
      const notifRef = doc(db, "notifications", user.uid, "userNotifications", id);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const batch = writeBatch(db);
    const unreadNotifs = notifications.filter((n) => !n.read);
    unreadNotifs.forEach((notif) => {
      const notifRef = doc(db, "notifications", user.uid, "userNotifications", notif.id);
      batch.update(notifRef, { read: true });
    });

    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      setShowNotifications(false);
      await batch.commit();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  // Toggle notifications dropdown
  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  // Navigation helper
  const handleNavigation = (route) => {
    try {
      navigate(route);
    } catch (error) {
      console.error("Navigation error:", error);
      window.location.href = route;
    }
  };

  // Check if a date is today
  const isToday = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelectedDateToday = isToday(selectedDate);
  const selectedDateWeekday = selectedDate
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();

  return (
    <div
      className={`min-h-screen transition-all duration-500 ${getThemeClass(
        "backgroundGradient",
        "bg-gray-50 dark:bg-gray-900"
      )} relative overflow-hidden`}
      style={{
        "--theme-accent-color": isDark ? "#10b981" : "#059669",
        "--theme-secondary-color": isDark ? "#3b82f6" : "#1d4ed8",
        "--theme-background": isDark ? "#111827" : "#f9fafb",
        "--theme-surface": isDark ? "#1f2937" : "#ffffff",
        "--theme-border": isDark ? "#374151" : "#e5e7eb",
      }}
    >
      <div className="relative z-10 px-3 py-4 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-4 animate-slide-down">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div
                className={`w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg ${getThemeClass(
                  "glowEffect",
                  "shadow-lg"
                )}`}
              >
                <span className="text-white text-lg font-bold">E</span>
              </div>
            </div>
            <div>
              <h1
                className={`text-lg font-black ${getThemeClass(
                  "textPrimary",
                  "text-gray-900 dark:text-white"
                )} ${
                  isDark
                    ? "bg-gradient-to-r from-white via-emerald-200 to-teal-300 bg-clip-text text-transparent"
                    : "bg-gradient-to-r from-gray-900 via-emerald-700 to-teal-700 bg-clip-text text-transparent"
                }`}
              >
                ECOSORT
              </h1>
            </div>
          </div>

          {/* Notifications and Profile Buttons */}
          <div className="flex items-center space-x-1 relative">
            <NotificationCenter userId={auth.currentUser?.uid} />

            <button
              onClick={() => handleNavigation("/profile")}
              className={`relative w-10 h-10 flex items-center justify-center 
                bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 
                rounded-full hover:shadow-lg ${getThemeClass(
                  "glowEffect",
                  "shadow-lg"
                )} transition-all duration-300 active:scale-95 touch-manipulation`}
              aria-label="Profile"
            >
              <FiUser className="w-5 h-5 text-white" />
            </button>
          </div>
        </header>

        {/* Mobile-Optimized Welcome Section */}
        <div className="mb-6 animate-fade-in">
          <div
            className={`${getThemeClass(
              "cardBackground",
              "bg-white dark:bg-gray-800"
            )} ${getThemeClass(
              "backdropBlur",
              "backdrop-blur-xl"
            )} rounded-2xl p-4 shadow-xl border ${getThemeClass(
              "cardBorder",
              "border-gray-200 dark:border-gray-700"
            )} relative overflow-hidden`}
          >
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2
                    className={`text-2xl font-extrabold ${getThemeClass(
                      "textPrimary",
                      "text-gray-900 dark:text-white"
                    )} mb-1 animate-fade-in-up`}
                  >
                    {loadingUser ? "Loading..." : (
                      <>
                        {getGreeting()}{" "}
                        <span
                          className={`${getThemeClass("textAccent", "text-emerald-600 dark:text-emerald-400")} select-text`}
                          aria-label="User name"
                        >
                          {userName || "User"}{" "}
                          <span role="img" aria-label="waving hand" className="inline-block animate-wave">👋</span>
                        </span>
                      </>
                    )}
                  </h2>
                  <p
                    className={`inline-flex items-center space-x-1 text-xl font-semibold ${getThemeClass(
                      "textSecondary",
                      "text-gray-700 dark:text-gray-300"
                    )} select-none`}
                    aria-label={`User eco points: ${points || 0}`}
                  >
                    <FaCoins className="text-amber-500 dark:text-yellow-400 text-lg" />
                    <span>
                      {loadingUser ? "Fetching points..." : `Eco Points: ${points || 0}`}
                    </span>
                  </p>
                </div>

                {/* Enhanced Calendar Collection Widget */}
                <div className="text-center relative">
                  <DashboardCalendar
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    isDark={isDark}
                  />
                  <div className="mt-1">
                    <p
                      className={`text-lg font-black ${getThemeClass(
                        "textPrimary",
                        "text-gray-900 dark:text-white"
                      )} ${isSelectedDateToday ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                    >
                      {selectedDateWeekday}
                    </p>
                    <p
                      className={`text-xs font-mono ${getThemeClass(
                        "textMuted",
                        "text-gray-600 dark:text-gray-400"
                      )}`}
                    >
                      {selectedDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile-Optimized Menu Grid */}
        <div className="grid grid-cols-2 gap-3 animate-stagger mb-6">
          {MENU_ITEMS.map((item, index) => (
            <div
              key={item.id}
              className="group cursor-pointer animate-fade-in-up touch-manipulation"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => navigate(item.route)}
            >
              <div
                className={`${getThemeClass(
                  "cardBackground",
                  "bg-white dark:bg-gray-800"
                )} ${getThemeClass(
                  "backdropBlur",
                  "backdrop-blur-xl"
                )} rounded-2xl p-4 shadow-lg border ${getThemeClass(
                  "cardBorder",
                  "border-gray-200 dark:border-gray-700"
                )} active:scale-95 transition-all duration-200 relative overflow-hidden group`}
              >
                <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-white/5 to-transparent rounded-full blur-lg" />
                <div className="relative z-10 flex flex-col items-center text-center space-y-2">
                  <div
                    className={`w-12 h-12 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center shadow-lg group-active:scale-110 transition-all duration-200 relative`}
                  >
                    <item.icon className="text-white text-lg" />
                  </div>
                  <div className="space-y-1">
                    <h3
                      className={`text-sm font-black ${getThemeClass(
                        "textPrimary",
                        "text-gray-900 dark:text-white"
                      )} leading-tight`}
                    >
                      {item.title}
                    </h3>
                    <p
                      className={`${getThemeClass(
                        "textSecondary",
                        "text-gray-600 dark:text-gray-300"
                      )} text-xs font-medium leading-tight`}
                    >
                      {item.subtitle}
                    </p>
                  </div>
                  <div
                    className={`w-full ${
                      isDark ? "bg-gray-200/20" : "bg-gray-800/20"
                    } rounded-full h-0.5 mt-2`}
                  >
                    <div
                      className={`h-0.5 bg-gradient-to-r ${item.color} rounded-full transition-all duration-500 group-active:w-full`}
                      style={{ width: "0%" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>




      <style>{`
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
          }
          33% { 
            transform: translateY(-8px) rotate(0.5deg); 
          }
          66% { 
            transform: translateY(-4px) rotate(-0.5deg); 
          }
        }
        
        @keyframes float-reverse {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
          }
          50% { 
            transform: translateY(10px) rotate(1deg); 
          }
        }

        @keyframes bounce-slow {
          0%, 100% { 
            transform: translateY(0px) scale(1); 
          }
          50% { 
            transform: translateY(-5px) scale(1.02); 
          }
        }

        @keyframes pulse-slow {
          0%, 100% { 
            opacity: 0.4; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.8; 
            transform: scale(1.03); 
          }
        }
        
        @keyframes slide-down {
          from { 
            opacity: 0; 
            transform: translateY(-20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes slide-up {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes fade-in {
          from { 
            opacity: 0; 
          }
          to { 
            opacity: 1; 
          }
        }
        
        @keyframes fade-in-up {
          from { 
            opacity: 0; 
            transform: translateY(15px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        @keyframes glow {
          0%, 100% { 
            box-shadow: 0 0 3px ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(52, 211, 153, 0.4)'}, 0 0 6px ${isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(52, 211, 153, 0.3)'}, 0 0 9px ${isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(52, 211, 153, 0.2)'};
          }
          50% { 
            box-shadow: 0 0 6px ${isDark ? 'rgba(16, 185, 129, 0.6)' : 'rgba(52, 211, 153, 0.7)'}, 0 0 12px ${isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(52, 211, 153, 0.5)'}, 0 0 18px ${isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(52, 211, 153, 0.3)'};
          }
        }

        @keyframes modal-appear {
          from { 
            opacity: 0; 
            transform: translate(-50%, -50%) scale(0.9); 
          }
          to { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1); 
          }
        }

        @keyframes backdrop-appear {
          from { 
            opacity: 0; 
          }
          to { 
            opacity: 1; 
          }
        }

        @keyframes wave {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        
        .animate-float { 
          animation: float 4s ease-in-out infinite; 
        }
        
        .animate-float-reverse { 
          animation: float-reverse 5s ease-in-out infinite; 
        }

        .animate-bounce-slow { 
          animation: bounce-slow 3s ease-in-out infinite; 
        }
        
        .animate-pulse-slow { 
          animation: pulse-slow 2s ease-in-out infinite; 
        }
        
        .animate-slide-down { 
          animation: slide-down 0.6s ease-out; 
        }
        
        .animate-slide-up { 
          animation: slide-up 0.6s ease-out 0.1s both; 
        }
        
        .animate-fade-in { 
          animation: fade-in 0.8s ease-out 0.2s both; 
        }
        
        .animate-fade-in-up { 
          animation: fade-in-up 0.5s ease-out both; 
        }
        
        .animate-stagger > * { 
          animation: fade-in-up 0.5s ease-out both; 
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        .animate-modal-appear { 
          animation: modal-appear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; 
        }

        .animate-backdrop-appear { 
          animation: backdrop-appear 0.2s ease-out forwards; 
        }

        /* Enhanced modal backdrop */
        .modal-backdrop {
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }

        /* Mobile-specific optimizations */
        @media (max-width: 640px) {
          .backdrop-blur-xl {
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
          }
          
          /* Reduce animation intensity on mobile */
          .animate-float,
          .animate-float-reverse,
          .animate-bounce-slow {
            animation-duration: 3s;
          }
          
          .animate-pulse-slow {
            animation-duration: 1.5s;
          }

          /* Optimize for smaller screens */
          .min-w-0 {
            min-width: 0;
          }

          /* Better text wrapping */
          .leading-tight {
            line-height: 1.1;
          }

          .leading-relaxed {
            line-height: 1.4;
          }
        }

        /* Touch interactions */
        .touch-manipulation {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        /* Improved active states for mobile */
        .active\\:scale-95:active {
          transform: scale(0.95);
        }

        .group-active\\:scale-110:active {
          transform: scale(1.1);
        }

        .group-active\\:w-full:active {
          width: 100%;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 4px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(243, 244, 246, 0.3)'};
          border-radius: 8px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #10b981, #0d9488);
          border-radius: 8px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #059669, #0f766e);
        }

        /* Selection styling */
        ::selection {
          background: ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(52, 211, 153, 0.4)'};
          color: ${isDark ? '#ffffff' : '#000000'};
        }

        /* Smooth transitions optimized for mobile */
        * {
          transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
          transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          transition-duration: 200ms;
        }

        /* Enhanced touch feedback */
        button:active,
        [role="button"]:active {
          transform: scale(0.95);
          transition-duration: 100ms;
        }

        /* Theme transition effects */
        .theme-transition {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Mobile-specific optimizations */
        @media (max-width: 640px) {
          .backdrop-blur-xl {
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
          }
          
          /* Reduce animation intensity on mobile */
          .animate-float,
          .animate-float-reverse,
          .animate-bounce-slow {
            animation-duration: 3s;
          }
          
          .animate-pulse-slow {
            animation-duration: 1.5s;
          }

          /* Optimize for smaller screens */
          .min-w-0 {
            min-width: 0;
          }

          /* Better text wrapping */
          .leading-tight {
            line-height: 1.1;
          }

          .leading-relaxed {
            line-height: 1.4;
          }

          /* Calendar mobile optimizations */
          .react-calendar__tile {
            padding: 0.5rem 0.25rem !important;
            min-height: 36px !important;
            font-size: 0.8rem !important;
          }

          .react-calendar__navigation button {
            min-width: 40px !important;
            font-size: 0.875rem !important;
          }
        }

        /* Very small screens (< 375px) */
        @media (max-width: 374px) {
          .px-3 {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
          }

          .gap-3 {
            gap: 0.5rem;
          }

          .text-xl {
            font-size: 1.125rem;
            line-height: 1.75rem;
          }

          .w-80 {
            width: calc(100vw - 1rem);
          }

          .min-w-\\[280px\\] {
            min-width: calc(100vw - 2rem);
          }

          .react-calendar__tile {
            padding: 0.375rem 0.125rem !important;
            min-height: 32px !important;
            font-size: 0.75rem !important;
          }
        }

        /* Large mobile screens optimization */
        @media (min-width: 375px) and (max-width: 640px) {
          .grid-cols-2 {
            gap: 1rem;
          }
        }

        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .animate-float-reverse,
          .animate-bounce-slow,
          .animate-spin,
          .animate-glow {
            animation: none;
          }
          
          .group-active\\:scale-110,
          .active\\:scale-95,
          .active\\:scale-\\[0\\.98\\] {
            transform: none;
          }

          * {
            transition-duration: 50ms;
          }

          .react-calendar__tile:hover {
            transform: none !important;
          }

          .react-calendar__tile:active {
            transform: none !important;
          }
        }

        /* Focus states for accessibility */
        button:focus-visible,
        [role="button"]:focus-visible {
          outline: 2px solid ${isDark ? '#10b981' : '#059669'};
          outline-offset: 2px;
          border-radius: 0.75rem;
        }

        .react-calendar__tile:focus-visible {
          outline: 2px solid ${isDark ? '#10b981' : '#059669'} !important;
          outline-offset: 2px !important;
          border-radius: 0.5rem !important;
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .backdrop-blur-xl,
          .backdrop-blur-2xl {
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            background: ${isDark ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
          }

          .shadow-lg,
          .shadow-xl,
          .shadow-2xl {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
          }

          .react-calendar__tile {
            border: 1px solid ${isDark ? '#4b5563' : '#d1d5db'} !important;
          }
        }

        /* Safe area insets for notched devices */
        @supports (padding-top: env(safe-area-inset-top)) {
          .pt-4 {
            padding-top: max(1rem, env(safe-area-inset-top));
          }
        }

        /* Prevent horizontal scrolling */
        .overflow-x-hidden {
          overflow-x: hidden;
        }

        /* Optimize font rendering on mobile */
        body {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        /* Improve button tap targets for mobile */
        button,
        [role="button"] {
          min-height: 44px;
          min-width: 44px;
        }

        /* Optimize dropdown positioning for small screens */
        @media (max-width: 640px) {
          .absolute.right-0 {
            right: -0.75rem;
            left: auto;
            transform: none;
          }

          .w-80.max-w-\\[calc\\(100vw-24px\\)\\] {
            width: calc(100vw - 1.5rem);
            max-width: calc(100vw - 1.5rem);
          }
        }

        /* Loading states */
        .loading-shimmer {
          background: linear-gradient(90deg, transparent, ${isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)'}, transparent);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        /* Enhanced notification badge */
        .notification-badge {
          animation: notification-pulse 2s infinite;
        }

        @keyframes notification-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        /* Calendar date indicator animations */
        .garbage-day-indicator {
          animation: garbage-glow 2s ease-in-out infinite alternate;
        }

        @keyframes garbage-glow {
          from {
            box-shadow: 0 0 5px rgba(16, 185, 129, 0.5);
          }
          to {
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.8), 0 0 30px rgba(16, 185, 129, 0.6);
          }
        }

        /* Improve calendar month navigation */
        .react-calendar__navigation__prev2-button,
        .react-calendar__navigation__next2-button {
          display: none !important;
        }

        /* Custom styling for weekend days */
        .react-calendar__month-view__days__day--weekend {
          color: ${isDark ? '#f87171' : '#dc2626'} !important;
        }

        /* Ensure proper z-index stacking */
        .calendar-popup {
          z-index: 9999 !important;
        }

        .notification-dropdown {
          z-index: 9998 !important;
        }
      `}</style>
    </div>
  );
}