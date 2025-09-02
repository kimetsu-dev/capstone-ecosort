import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiBell, FiSettings } from "react-icons/fi";
import { useTheme } from "../contexts/ThemeContext";
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
  FaLeaf,
  FaCoins,
  FaCalendarAlt,
  FaChartLine,
  FaRocket,
  FaMicrochip,
} from "react-icons/fa";

const MENU_ITEMS = [
  {
    id: "submit",
    title: "Submit",
    subtitle: "Submit Waste",
    icon: FaRecycle,
    color: "from-emerald-400 via-teal-500 to-green-600",
    route: "/submitwaste",
    techIcon: "🤖",
  },
  {
    id: "rewards",
    title: "Reward Vault",
    subtitle: "Redeem Rewards",
    icon: FaGift,
    color: "from-amber-400 via-orange-500 to-yellow-600",
    route: "/rewards",
    techIcon: "💎",
  },
  {
    id: "report",
    title: "Report Hub",
    subtitle: "Report Violations",
    icon: FaExclamationTriangle,
    color: "from-red-400 via-rose-500 to-pink-600",
    route: "/forum",
    techIcon: "🔍",
  },
  {
    id: "leaderboard",
    title: "Leaderboard",
    subtitle: "Community Leaderboard",
    icon: FaTrophy,
    color: "from-blue-400 via-indigo-500 to-purple-600",
    route: "/leaderboard",
    techIcon: "🏆",
  },
  {
    id: "transactions",
    title: "Transactions",
    subtitle: "Transaction history",
    icon: FaFileAlt,
    color: "from-gray-400 via-slate-500 to-gray-600",
    route: "/transactions",
    techIcon: "📊",
  },
  {
    id: "my-redemptions",
    title: "Redemptions",
    subtitle: "Redeemed Rewards",
    icon: FaCoins,
    color: "from-indigo-500 via-purple-600 to-violet-700",
    route: "/my-redemptions",
    techIcon: "💰",
  },
];

// Helper to format Firestore Timestamp or JS Date to local string
function formatDate(date) {
  if (!date) return "";
  if (typeof date.toDate === "function") return date.toDate().toLocaleString();
  if (date instanceof Date) return date.toLocaleString();
  return String(date);
}

export default function Dashboard() {
  const themeContext = useTheme();
  const [userName, setUserName] = useState(null);
  const [points, setPoints] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoadingUser(false);
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
        }
        setLoadingUser(false);
      },
      (error) => {
        console.error("User listener error:", error);
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

        const filteredNotifs = notifList.filter(
          (notif) =>
            notif.message &&
            (notif.message.toLowerCase().includes("approved") ||
              notif.message.toLowerCase().includes("confirmed"))
        );

        setNotifications(filteredNotifs);
        setUnreadCount(filteredNotifs.filter((n) => !n.read).length);
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!themeContext) {
    console.error("Theme context not available");
    return <div>Loading...</div>;
  }

  const { theme, styles, isDark } = themeContext;

  if (!styles) {
    return <div>Loading theme...</div>;
  }

  const getThemeClass = (styleKey, fallback = "") => {
    return styles && styles[styleKey] ? styles[styleKey] : fallback;
  };

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const markAsRead = async (id) => {
    try {
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
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
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
      setUnreadCount(0);
      setShowNotifications(false);
      await batch.commit();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Add background elements and other utility functions if needed here

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
      {/* Background and floating elements */}
      {/* ... Could insert JSX for getBackgroundElements here ... */}

      <div className="relative z-10 px-3 sm:px-4 py-4 sm:py-6 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-6 sm:mb-10 animate-slide-down">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="relative">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl ${getThemeClass(
                  "glowEffect",
                  "shadow-lg"
                )}`}
              >
                <FaMicrochip className="text-white text-lg sm:text-2xl" />
              </div>
              <div
                className={`absolute -top-1 -right-1 w-4 h-4 ${getThemeClass(
                  "onlineIndicator",
                  "bg-green-400"
                )} rounded-full animate-ping`}
              ></div>
              <div
                className={`absolute -top-1 -right-1 w-4 h-4 ${getThemeClass(
                  "onlineIndicator",
                  "bg-green-400"
                )} rounded-full`}
              ></div>
            </div>
            <div>
              <h1
                className={`text-xl sm:text-3xl font-black ${getThemeClass(
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
              <div
                className={`flex items-center gap-2 text-xs sm:text-sm ${getThemeClass(
                  "textMuted",
                  "text-gray-600 dark:text-gray-400"
                )}`}
              >
                <span
                  className={`w-2 h-2 ${getThemeClass(
                    "onlineIndicator",
                    "bg-green-400"
                  )} rounded-full animate-pulse`}
                ></span>
                <span className="font-mono">ONLINE</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">
                  {currentTime.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 relative">
            {/* Notifications Button */}
            <button
              onClick={toggleNotifications}
              className={`relative p-3 sm:p-4 ${getThemeClass(
                "cardBackground",
                "bg-white dark:bg-gray-800"
              )} ${getThemeClass(
                "backdropBlur",
                "backdrop-blur-xl"
              )} rounded-2xl border ${getThemeClass(
                "cardBorder",
                "border-gray-200 dark:border-gray-700"
              )} hover:${getThemeClass(
                "cardBackgroundHover",
                "bg-gray-100 dark:bg-gray-700"
              )} transition-all duration-300 hover:scale-105 group`}
              aria-label="Notifications"
            >
              <FiBell
                className={`${getThemeClass(
                  "textSecondary",
                  "text-gray-600 dark:text-gray-400"
                )} group-hover:${getThemeClass(
                  "textPrimary",
                  "text-gray-900 dark:text-white"
                )} text-lg sm:text-xl transition-colors`}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[20px] h-[20px] text-xs font-bold rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <div
                className={`absolute inset-0 ${getThemeClass(
                  "textAccent",
                  "text-emerald-500"
                )
                  .replace("text-", "bg-")
                  .concat("/20")} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              ></div>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => navigate("/settings")}
              className={`relative p-3 sm:p-4 ${getThemeClass(
                "cardBackground",
                "bg-white dark:bg-gray-800"
              )} ${getThemeClass(
                "backdropBlur",
                "backdrop-blur-xl"
              )} rounded-2xl border ${getThemeClass(
                "cardBorder",
                "border-gray-200 dark:border-gray-700"
              )} hover:${getThemeClass(
                "cardBackgroundHover",
                "bg-gray-100 dark:bg-gray-700"
              )} transition-all duration-300 hover:scale-105 group`}
              aria-label="Settings"
            >
              <FiSettings
                className={`${getThemeClass(
                  "textSecondary",
                  "text-gray-600 dark:text-gray-400"
                )} group-hover:${getThemeClass(
                  "textPrimary",
                  "text-gray-900 dark:text-white"
                )} text-lg sm:text-xl transition-colors group-hover:rotate-180 duration-300`}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {/* Profile Button */}
            <button
              onClick={() => navigate("/profile")}
              className={`relative p-3 sm:p-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 rounded-2xl hover:shadow-2xl ${getThemeClass(
                "glowEffect",
                "shadow-lg"
              )} transition-all duration-300 hover:scale-105 group`}
              aria-label="Profile"
            >
              <FiUser className="text-white text-lg sm:text-xl" />
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div
                ref={dropdownRef}
                className={`absolute right-0 top-16 sm:top-20 w-80 sm:w-96 max-h-96 overflow-y-auto ${getThemeClass(
                  "notificationBackground",
                  "bg-white/90 dark:bg-gray-900/90"
                )} ${getThemeClass(
                  "backdropBlur",
                  "backdrop-blur-xl"
                )} rounded-3xl shadow-2xl border ${getThemeClass(
                  "cardBorder",
                  "border-gray-200 dark:border-gray-700"
                )} z-50 animate-fade-in`}
              >
                <div
                  className={`flex justify-between items-center px-6 py-4 border-b ${getThemeClass(
                    "cardBorder",
                    "border-gray-200 dark:border-gray-700"
                  )}`}
                >
                  <h3
                    className={`font-bold text-lg ${getThemeClass(
                      "textPrimary",
                      "text-gray-900 dark:text-white"
                    )} flex items-center gap-2`}
                  >
                    <span
                      className={`w-2 h-2 ${getThemeClass(
                        "onlineIndicator",
                        "bg-green-400"
                      )} rounded-full animate-pulse`}
                    ></span>
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className={`${getThemeClass(
                        "textAccent",
                        "text-emerald-500"
                      )} hover:opacity-80 text-sm font-medium px-3 py-1 rounded-lg ${getThemeClass(
                        "textAccent",
                        "text-emerald-500"
                      )
                        .replace("text-", "bg-")
                        .concat("/10 hover:")}${getThemeClass(
                        "textAccent",
                        "text-emerald-500"
                      )
                        .replace("text-", "bg-")
                        .concat("/20")} transition-all duration-200`}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                {loadingNotifications ? (
                  <div className="p-6 text-center">
                    <div
                      className={`w-8 h-8 border-2 ${getThemeClass(
                        "textAccent",
                        "text-emerald-500"
                      )
                        .replace("text-", "border-")
                        .concat("/30")} ${getThemeClass(
                        "textAccent",
                        "text-emerald-500"
                      )
                        .replace("text-", "border-t-")} rounded-full animate-spin mx-auto mb-2`}
                    ></div>
                    <p className={getThemeClass("textMuted", "text-gray-600 dark:text-gray-400") + " text-sm"}>
                      Loading...
                    </p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="text-4xl mb-2">📭</div>
                    <p className={getThemeClass("textMuted", "text-gray-600 dark:text-gray-400")}>
                      No notifications
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-72 overflow-y-auto">
                    {notifications.map((notif) => (
                      <li
                        key={notif.id}
                        className={`px-6 py-4 cursor-pointer border-b ${getThemeClass(
                          "cardBorder",
                          "border-gray-200 dark:border-gray-700"
                        )} last:border-b-0 ${
                          notif.read
                            ? "bg-transparent"
                            : `${getThemeClass("textAccent", "text-emerald-500")
                                .replace("text-", "bg-")
                                .concat("/5 border-l-2 ")}${getThemeClass(
                                "textAccent",
                                "text-emerald-500"
                              ).replace("text-", "border-l-")}`
                        } hover:${getThemeClass("cardBackgroundHover", "bg-gray-100 dark:bg-gray-700")} transition-all duration-200`}
                        onClick={() => markAsRead(notif.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs">✓</span>
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm ${getThemeClass("textPrimary", "text-gray-900 dark:text-white")} mb-1`}>
                              {notif.message}
                            </p>
                            <small className={`${getThemeClass("textMuted", "text-gray-600 dark:text-gray-400")} text-xs font-mono`}>
                              {formatDate(notif.createdAt)}
                            </small>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Modern Welcome Section */}
        <div className="mb-8 sm:mb-12 animate-fade-in">
          <div
            className={`${getThemeClass("cardBackground", "bg-white dark:bg-gray-800")} ${getThemeClass("backdropBlur", "backdrop-blur-xl")} rounded-3xl sm:rounded-[2rem] p-6 sm:p-10 shadow-2xl border ${getThemeClass("cardBorder", "border-gray-200 dark:border-gray-700")} relative overflow-hidden`}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${getThemeClass("textAccent", "text-emerald-500").replace("text-", "bg-")}/10 rounded-full blur-2xl`} />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl" />

            <div className="relative z-10 flex flex-col space-y-6 sm:space-y-0 sm:flex-row justify-between items-start sm:items-center">
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`flex items-center gap-2 px-3 py-1 ${getThemeClass("textAccent", "text-emerald-500").replace(
                      "text-",
                      "bg-"
                    )}/20 rounded-full border ${getThemeClass("textAccent", "text-emerald-500").replace("text-", "border-")}/30`}
                  >
                    <span className={`w-2 h-2 ${getThemeClass("onlineIndicator", "bg-green-400")} rounded-full animate-pulse`} />
                    <span className={`text-xs font-mono ${getThemeClass("textAccent", "text-emerald-500")}`}>ACTIVE USER</span>
                  </div>
                </div>
                <h2 className={`text-2xl sm:text-4xl font-black ${getThemeClass("textPrimary", "text-gray-900 dark:text-white")} mb-2`}>
                  {loadingUser ? (
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 border-2 ${getThemeClass("textAccent", "text-emerald-500").replace("text-", "border-")}/30 ${getThemeClass(
                          "textAccent", "text-emerald-500"
                        ).replace("text-", "border-t-")} rounded-full animate-spin`}
                      />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <>
                      {getGreeting()}, <span className={`${getThemeClass("textAccent", "text-emerald-500")} font-black`}>{userName}</span>!{" "}
                      <span className="ml-2 text-3xl">🚀</span>
                    </>
                  )}
                </h2>
                <p className={`${getThemeClass("textSecondary", "text-gray-600 dark:text-gray-300")} text-lg`}>Ready to make a difference today?</p>
              </div>

              <div className="flex items-center space-x-6 sm:space-x-8">
                <div className="text-center group">
                  <div className="relative">
                    <div
                      className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/25 mb-3 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <FaCoins className="text-white text-xl sm:text-3xl" />
                    </div>
                    <div
                      className={`absolute -top-2 -right-2 w-6 h-6 ${getThemeClass("onlineIndicator", "bg-green-400")} rounded-full flex items-center justify-center`}
                    >
                      <span className="text-white text-xs font-bold">+</span>
                    </div>
                  </div>
                  <p className={`text-2xl sm:text-3xl font-black ${getThemeClass("textPrimary", "text-gray-900 dark:text-white")} mb-1`}>
                    {loadingUser ? "..." : points.toLocaleString()}
                  </p>
                  <p className={`text-xs sm:text-sm ${getThemeClass("textMuted", "text-gray-600 dark:text-gray-400")} font-mono`}>ECO POINTS</p>
                </div>

                <div className="text-center group">
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600 rounded-2xl flex items-center justify-center shadow-2xl ${getThemeClass("glowEffect", "shadow-lg")} mb-3 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <FaCalendarAlt className="text-white text-lg sm:text-2xl" />
                  </div>
                  <p className={`text-xl sm:text-2xl font-black ${getThemeClass("textPrimary", "text-gray-900 dark:text-white")} mb-1`}>THU</p>
                  <p className={`text-xs sm:text-sm ${getThemeClass("textMuted", "text-gray-600 dark:text-gray-400")} font-mono`}>COLLECTION</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Menu Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-stagger mb-8">
          {MENU_ITEMS.map((item, index) => (
            <div
              key={item.id}
              className="group cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => navigate(item.route)}
            >
              <div
                className={`${getThemeClass("cardBackground", "bg-white dark:bg-gray-800")} ${getThemeClass("backdropBlur", "backdrop-blur-xl")} rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 shadow-2xl border ${getThemeClass("cardBorder", "border-gray-200 dark:border-gray-700")} hover:shadow-2xl ${getThemeClass("glowEffect", "shadow-lg")} transition-all duration-500 hover:scale-105 hover:-translate-y-2 relative overflow-hidden group`}
              >
                {/* Background effects */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-xl" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-white/5 to-transparent rounded-full blur-lg" />

                <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                  {/* Tech icon badge */}
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm shadow-lg">
                    {item.techIcon}
                  </div>

                  <div
                    className={`w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-r ${item.color} rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 relative`}
                  >
                    <item.icon className="text-white text-xl sm:text-3xl" />
                    <div className="absolute inset-0 bg-white/20 rounded-2xl sm:rounded-3xl scale-0 group-hover:scale-100 transition-transform duration-300" />
                  </div>

                  <div className="space-y-2">
                    <h3 className={`text-lg sm:text-2xl font-black ${getThemeClass("textPrimary", "text-gray-900 dark:text-white")}`}>{item.title}</h3>
                    <p className={`${getThemeClass("textSecondary", "text-gray-600 dark:text-gray-300")} text-sm sm:text-base font-medium`}>{item.subtitle}</p>
                  </div>

                  {/* Progress bar */}
                  <div className={`w-full ${isDark ? "bg-gray-200/20" : "bg-gray-800/20"} rounded-full h-1 mt-4`}>
                    <div
                      className={`h-1 bg-gradient-to-r ${item.color} rounded-full transition-all duration-700 group-hover:w-full`}
                      style={{ width: "0%" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Futuristic Collection Notice */}
        <div className="animate-fade-in">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl sm:rounded-[2rem] p-6 sm:p-10 shadow-2xl text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-purple-600/90 to-indigo-700/90" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -translate-y-20 translate-x-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-16 -translate-x-16" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/5 rounded-full blur-xl" />

            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <div className="text-center sm:text-left mb-6 sm:mb-0">
                  <div className="flex justify-center sm:justify-start items-center gap-3 mb-4">
                    <div className="w-14 h-14 sm:w-18 sm:h-18 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                      <FaCalendarAlt className="text-2xl sm:text-3xl animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-sm font-mono">NEXT COLLECTION</span>
                    </div>
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-black mb-2 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                    Smart Collection Hub
                  </h3>
                  <p className="text-lg sm:text-xl text-blue-100 mb-4 font-medium">
                    Thursday Morning
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-4">
                  <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                    <div className="text-3xl sm:text-4xl font-black text-white mb-1">3</div>
                    <div className="text-sm text-blue-200 font-mono">DAYS LEFT</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <div className="w-2 h-2 bg-green-400/60 rounded-full" />
                    <div className="w-2 h-2 bg-green-400/30 rounded-full" />
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <span className="text-lg">📞</span>
                  <span className="text-sm font-mono">0912-345-6789</span>
                </div>
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <span className="text-lg">📧</span>
                  <span className="text-sm font-mono">teodoraalonzo@gmail.com</span>
                </div>
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <span className="text-lg">📍</span>
                  <span className="text-sm font-mono">Brgy-T-Alonzo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      <style>{`
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
          }
          33% { 
            transform: translateY(-15px) rotate(1deg); 
          }
          66% { 
            transform: translateY(-8px) rotate(-1deg); 
          }
        }
        
        @keyframes float-reverse {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
          }
          50% { 
            transform: translateY(20px) rotate(2deg); 
          }
        }

        @keyframes bounce-slow {
          0%, 100% { 
            transform: translateY(0px) scale(1); 
          }
          50% { 
            transform: translateY(-10px) scale(1.05); 
          }
        }

        @keyframes pulse-slow {
          0%, 100% { 
            opacity: 0.4; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.8; 
            transform: scale(1.05); 
          }
        }
        
        @keyframes slide-down {
          from { 
            opacity: 0; 
            transform: translateY(-30px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes slide-up {
          from { 
            opacity: 0; 
            transform: translateY(30px); 
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
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        @keyframes glow {
          0%, 100% { 
            box-shadow: 0 0 5px ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(52, 211, 153, 0.4)'}, 0 0 10px ${isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(52, 211, 153, 0.3)'}, 0 0 15px ${isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(52, 211, 153, 0.2)'};
          }
          50% { 
            box-shadow: 0 0 10px ${isDark ? 'rgba(16, 185, 129, 0.6)' : 'rgba(52, 211, 153, 0.7)'}, 0 0 20px ${isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(52, 211, 153, 0.5)'}, 0 0 30px ${isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(52, 211, 153, 0.3)'};
          }
        }
        
        .animate-float { 
          animation: float 6s ease-in-out infinite; 
        }
        
        .animate-float-reverse { 
          animation: float-reverse 8s ease-in-out infinite; 
        }

        .animate-bounce-slow { 
          animation: bounce-slow 4s ease-in-out infinite; 
        }
        
        .animate-pulse-slow { 
          animation: pulse-slow 3s ease-in-out infinite; 
        }
        
        .animate-slide-down { 
          animation: slide-down 0.8s ease-out; 
        }
        
        .animate-slide-up { 
          animation: slide-up 0.8s ease-out 0.2s both; 
        }
        
        .animate-fade-in { 
          animation: fade-in 1s ease-out 0.3s both; 
        }
        
        .animate-fade-in-up { 
          animation: fade-in-up 0.6s ease-out both; 
        }
        
        .animate-stagger > * { 
          animation: fade-in-up 0.6s ease-out both; 
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(243, 244, 246, 0.5)'};
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
          background: ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(52, 211, 153, 0.4)'};
          color: ${isDark ? '#ffffff' : '#000000'};
        }

        /* Smooth transitions for all interactive elements */
        * {
          transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 150ms;
        }

        /* Enhanced hover effects for buttons */
        button:hover {
          transform: translateY(-1px);
        }

        button:active {
          transform: translateY(0);
        }

        /* Theme transition effects */
        .theme-transition {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Responsive design improvements */
        @media (max-width: 640px) {
          .backdrop-blur-2xl {
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }
          
          /* Mobile-specific optimizations */
          .animate-float,
          .animate-float-reverse,
          .animate-bounce-slow {
            animation-duration: 4s;
          }
          
          .animate-pulse-slow {
            animation-duration: 2s;
          }
        }

        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .animate-float-reverse,
          .animate-bounce-slow,
          .animate-pulse-slow,
          .animate-ping,
          .animate-spin,
          .animate-glow {
            animation: none;
          }
          
          .group:hover .group-hover\\:scale-110,
          .group:hover .group-hover\\:rotate-180,
          .group:hover .group-hover\\:rotate-3 {
            transform: none;
          }
        }

        /* Focus states for accessibility */
        button:focus-visible,
        [role="button"]:focus-visible {
          outline: 2px solid ${isDark ? '#10b981' : '#059669'};
          outline-offset: 2px;
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .backdrop-blur-xl,
          .backdrop-blur-2xl {
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            background: ${isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)'};
          }
        }
      `}</style>
    </div>
      </div>
  );
}