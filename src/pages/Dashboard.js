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
        {/* Mobile-Optimized Header */}
        <header className="flex justify-between items-center mb-4 animate-slide-down">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div
                className={`w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg ${getThemeClass(
                  "glowEffect",
                  "shadow-lg"
                )}`}
              >
                <FaMicrochip className="text-white text-lg" />
              </div>
              <div
                className={`absolute -top-0.5 -right-0.5 w-3 h-3 ${getThemeClass(
                  "onlineIndicator",
                  "bg-green-400"
                )} rounded-full animate-ping`}
              ></div>
              <div
                className={`absolute -top-0.5 -right-0.5 w-3 h-3 ${getThemeClass(
                  "onlineIndicator",
                  "bg-green-400"
                )} rounded-full`}
              ></div>
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
              <div
                className={`flex items-center gap-1.5 text-xs ${getThemeClass(
                  "textMuted",
                  "text-gray-600 dark:text-gray-400"
                )}`}
              >
                <span
                  className={`w-1.5 h-1.5 ${getThemeClass(
                    "onlineIndicator",
                    "bg-green-400"
                  )} rounded-full animate-pulse`}
                ></span>
                <span className="font-mono">ONLINE</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 relative">
            {/* Mobile Notifications Button */}
            <button
              onClick={toggleNotifications}
              className={`relative p-2.5 ${getThemeClass(
                "cardBackground",
                "bg-white dark:bg-gray-800"
              )} ${getThemeClass(
                "backdropBlur",
                "backdrop-blur-xl"
              )} rounded-xl border ${getThemeClass(
                "cardBorder",
                "border-gray-200 dark:border-gray-700"
              )} hover:${getThemeClass(
                "cardBackgroundHover",
                "bg-gray-100 dark:bg-gray-700"
              )} transition-all duration-300 active:scale-95 touch-manipulation`}
              aria-label="Notifications"
            >
              <FiBell
                className={`${getThemeClass(
                  "textSecondary",
                  "text-gray-600 dark:text-gray-400"
                )} text-lg transition-colors`}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 text-xs font-bold rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Mobile Settings Button */}
            <button
              onClick={() => navigate("/settings")}
              className={`relative p-2.5 ${getThemeClass(
                "cardBackground",
                "bg-white dark:bg-gray-800"
              )} ${getThemeClass(
                "backdropBlur",
                "backdrop-blur-xl"
              )} rounded-xl border ${getThemeClass(
                "cardBorder",
                "border-gray-200 dark:border-gray-700"
              )} hover:${getThemeClass(
                "cardBackgroundHover",
                "bg-gray-100 dark:bg-gray-700"
              )} transition-all duration-300 active:scale-95 touch-manipulation`}
              aria-label="Settings"
            >
              <FiSettings
                className={`${getThemeClass(
                  "textSecondary",
                  "text-gray-600 dark:text-gray-400"
                )} text-lg transition-colors`}
              />
            </button>

            {/* Mobile Profile Button */}
            <button
              onClick={() => navigate("/profile")}
              className={`relative p-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 rounded-xl hover:shadow-lg ${getThemeClass(
                "glowEffect",
                "shadow-lg"
              )} transition-all duration-300 active:scale-95 touch-manipulation`}
              aria-label="Profile"
            >
              <FiUser className="text-white text-lg" />
            </button>

            {/* Mobile Notifications Dropdown */}
            {showNotifications && (
              <div
                ref={dropdownRef}
                className={`absolute right-0 top-12 w-80 max-w-[calc(100vw-24px)] max-h-80 overflow-y-auto ${getThemeClass(
                  "notificationBackground",
                  "bg-white/95 dark:bg-gray-900/95"
                )} ${getThemeClass(
                  "backdropBlur",
                  "backdrop-blur-xl"
                )} rounded-2xl shadow-2xl border ${getThemeClass(
                  "cardBorder",
                  "border-gray-200 dark:border-gray-700"
                )} z-50 animate-fade-in`}
              >
                <div
                  className={`flex justify-between items-center px-4 py-3 border-b ${getThemeClass(
                    "cardBorder",
                    "border-gray-200 dark:border-gray-700"
                  )}`}
                >
                  <h3
                    className={`font-bold text-base ${getThemeClass(
                      "textPrimary",
                      "text-gray-900 dark:text-white"
                    )} flex items-center gap-2`}
                  >
                    <span
                      className={`w-1.5 h-1.5 ${getThemeClass(
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
                      )} text-sm font-medium px-2 py-1 rounded-lg transition-all duration-200 active:scale-95 touch-manipulation`}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                {loadingNotifications ? (
                  <div className="p-4 text-center">
                    <div
                      className={`w-6 h-6 border-2 ${getThemeClass(
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
                  <div className="p-4 text-center">
                    <div className="text-3xl mb-2">📭</div>
                    <p className={getThemeClass("textMuted", "text-gray-600 dark:text-gray-400")}>
                      No notifications
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-56 overflow-y-auto">
                    {notifications.map((notif) => (
                      <li
                        key={notif.id}
                        className={`px-4 py-3 cursor-pointer border-b ${getThemeClass(
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
                        } hover:${getThemeClass("cardBackgroundHover", "bg-gray-100 dark:bg-gray-700")} transition-all duration-200 active:scale-[0.98] touch-manipulation`}
                        onClick={() => markAsRead(notif.id)}
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-xs">✓</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${getThemeClass("textPrimary", "text-gray-900 dark:text-white")} mb-1 leading-relaxed`}>
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

        {/* Mobile-Optimized Welcome Section */}
        <div className="mb-6 animate-fade-in">
          <div
            className={`${getThemeClass("cardBackground", "bg-white dark:bg-gray-800")} ${getThemeClass("backdropBlur", "backdrop-blur-xl")} rounded-2xl p-4 shadow-xl border ${getThemeClass("cardBorder", "border-gray-200 dark:border-gray-700")} relative overflow-hidden`}
          >
            <div className={`absolute top-0 right-0 w-20 h-20 ${getThemeClass("textAccent", "text-emerald-500").replace("text-", "bg-")}/10 rounded-full blur-xl`} />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`flex items-center gap-1.5 px-2 py-1 ${getThemeClass("textAccent", "text-emerald-500").replace(
                    "text-",
                    "bg-"
                  )}/20 rounded-full border ${getThemeClass("textAccent", "text-emerald-500").replace("text-", "border-")}/30`}
                >
                  <span className={`w-1.5 h-1.5 ${getThemeClass("onlineIndicator", "bg-green-400")} rounded-full animate-pulse`} />
                  <span className={`text-xs font-mono ${getThemeClass("textAccent", "text-emerald-500")}`}>ACTIVE</span>
                </div>
              </div>

              <h2 className={`text-xl font-black ${getThemeClass("textPrimary", "text-gray-900 dark:text-white")} mb-2 leading-tight`}>
                {loadingUser ? (
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 border-2 ${getThemeClass("textAccent", "text-emerald-500").replace("text-", "border-")}/30 ${getThemeClass(
                        "textAccent", "text-emerald-500"
                      ).replace("text-", "border-t-")} rounded-full animate-spin`}
                    />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <>
                    {getGreeting()}, <span className={`${getThemeClass("textAccent", "text-emerald-500")} font-black`}>{userName}</span>! 🚀
                  </>
                )}
              </h2>
              <p className={`${getThemeClass("textSecondary", "text-gray-600 dark:text-gray-300")} text-sm mb-4`}>
                Ready to make a difference today?
              </p>

              {/* Mobile Stats Row */}
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <div className="relative mb-2">
                    <div
                      className={`w-12 h-12 bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg mb-1`}
                    >
                      <FaCoins className="text-white text-lg" />
                    </div>
                    <div
                      className={`absolute -top-1 -right-1 w-4 h-4 ${getThemeClass("onlineIndicator", "bg-green-400")} rounded-full flex items-center justify-center`}
                    >
                      <span className="text-white text-xs font-bold">+</span>
                    </div>
                  </div>
                  <p className={`text-lg font-black ${getThemeClass("textPrimary", "text-gray-900 dark:text-white")}`}>
                    {loadingUser ? "..." : points.toLocaleString()}
                  </p>
                  <p className={`text-xs ${getThemeClass("textMuted", "text-gray-600 dark:text-gray-400")} font-mono`}>ECO POINTS</p>
                </div>

                <div className="text-center">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg mb-1`}
                  >
                    <FaCalendarAlt className="text-white text-base" />
                  </div>
                  <p className={`text-base font-black ${getThemeClass("textPrimary", "text-gray-900 dark:text-white")}`}>THU</p>
                  <p className={`text-xs ${getThemeClass("textMuted", "text-gray-600 dark:text-gray-400")} font-mono`}>COLLECTION</p>
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
                className={`${getThemeClass("cardBackground", "bg-white dark:bg-gray-800")} ${getThemeClass("backdropBlur", "backdrop-blur-xl")} rounded-2xl p-4 shadow-lg border ${getThemeClass("cardBorder", "border-gray-200 dark:border-gray-700")} active:scale-95 transition-all duration-200 relative overflow-hidden group`}
              >
                {/* Background effects - reduced for mobile */}
                <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-white/5 to-transparent rounded-full blur-lg" />

                <div className="relative z-10 flex flex-col items-center text-center space-y-2">
                  {/* Tech icon badge - smaller for mobile */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs shadow-md">
                    {item.techIcon}
                  </div>

                  <div
                    className={`w-12 h-12 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center shadow-lg group-active:scale-110 transition-all duration-200 relative`}
                  >
                    <item.icon className="text-white text-lg" />
                  </div>

                  <div className="space-y-1">
                    <h3 className={`text-sm font-black ${getThemeClass("textPrimary", "text-gray-900 dark:text-white")} leading-tight`}>{item.title}</h3>
                    <p className={`${getThemeClass("textSecondary", "text-gray-600 dark:text-gray-300")} text-xs font-medium leading-tight`}>{item.subtitle}</p>
                  </div>

                  {/* Progress bar - thinner for mobile */}
                  <div className={`w-full ${isDark ? "bg-gray-200/20" : "bg-gray-800/20"} rounded-full h-0.5 mt-2`}>
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

        {/* Mobile-Optimized Collection Notice */}
        <div className="animate-fade-in">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-4 shadow-xl text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-purple-600/90 to-indigo-700/90" />
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -translate-y-12 translate-x-12" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full blur-xl translate-y-10 -translate-x-10" />

            <div className="relative z-10">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <FaCalendarAlt className="text-lg animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full border border-white/20">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs font-mono">NEXT COLLECTION</span>
                  </div>
                </div>
                
                <h3 className="text-xl font-black mb-1 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                  Smart Collection Hub
                </h3>
                <p className="text-base text-blue-100 mb-3 font-medium">Thursday Morning</p>
                
                <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 mb-3">
                  <div className="text-2xl font-black text-white mb-1">3</div>
                  <div className="text-xs text-blue-200 font-mono">DAYS LEFT</div>
                </div>
              </div>

              {/* Mobile Contact Info - Stacked vertically */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <span className="text-base">📞</span>
                  <span className="text-sm font-mono">0912-345-6789</span>
                </div>
                <div className="flex items-center justify-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <span className="text-base">📧</span>
                  <span className="text-xs font-mono">teodoraalonzo@gmail.com</span>
                </div>
                <div className="flex items-center justify-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <span className="text-base">📍</span>
                  <span className="text-sm font-mono">Brgy-T-Alonzo</span>
                </div>
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

        /* Mobile-optimized touch interactions */
        .touch-manipulation {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        /* Improved active states for mobile */
        .active\\:scale-95:active {
          transform: scale(0.95);
        }

        .active\\:scale-\\[0\\.98\\]:active {
          transform: scale(0.98);
        }

        .group-active\\:scale-110:active {
          transform: scale(1.1);
        }

        .group-active\\:w-full:active {
          width: 100%;
        }

        /* Custom scrollbar - mobile optimized */
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
          .animate-pulse-slow,
          .animate-ping,
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
        }

        /* Focus states for accessibility */
        button:focus-visible,
        [role="button"]:focus-visible {
          outline: 2px solid ${isDark ? '#10b981' : '#059669'};
          outline-offset: 2px;
          border-radius: 0.75rem;
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
      `}</style>
    </div>
  );
}