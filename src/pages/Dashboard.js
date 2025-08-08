import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiBell, } from "react-icons/fi";
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
} from "react-icons/fa";

const MENU_ITEMS = [
  {
    id: "submit",
    title: "Submit Waste",
    subtitle: "Earn points for recycling",
    icon: FaRecycle,
    color: "from-emerald-400 to-green-500",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    route: "/submitwaste",
  },
  {
    id: "rewards",
    title: "Rewards",
    subtitle: "Redeem your points",
    icon: FaGift,
    color: "from-amber-400 to-orange-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    route: "/rewards",
  },
  {
    id: "report",
    title: "Report Forum",
    subtitle: "Community discussions",
    icon: FaExclamationTriangle,
    color: "from-red-400 to-rose-500",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    route: "/forum",
  },
  {
    id: "leaderboard",
    title: "Leaderboards",
    subtitle: "See top contributors",
    icon: FaTrophy,
    color: "from-blue-400 to-indigo-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    route: "/leaderboard",
  },
  {
    id: "transactions",
    title: "Transactions",
    subtitle: "View your history",
    icon: FaFileAlt,
    color: "from-gray-400 to-slate-500",
    bgColor: "bg-gray-50",
    textColor: "text-gray-700",
    route: "/transactions",
  },
  {
    id: "my-redemptions",
    title: "My Redemptions",
    subtitle: "View redeemed rewards",
    icon: FaCoins,
    color: "from-indigo-500 to-purple-600",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-700",
    route: "/my-redemptions",
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
      // Handle unauthenticated user as needed
      setLoadingUser(false);
      return;
    }

    // User data listener with error handling
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

    // Notifications listener with error handling
    const notificationsRef = collection(
      db,
      "notifications",
      user.uid,
      "userNotifications"
    );
    const notificationsQuery = query(
      notificationsRef,
      orderBy("createdAt", "desc")
    );

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

  // Toggle notifications dropdown visibility
  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  // Close notifications dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
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

  // Mark a notification as read (single)
  const markAsRead = async (id) => {
    try {
      // Update UI state immediately
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Persist to Firestore
      const user = auth.currentUser;
      if (!user) return;
      const notifRef = doc(
        db,
        "notifications",
        user.uid,
        "userNotifications",
        id
      );
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // Mark all notifications as read (batch update)
  const markAllAsRead = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const batch = writeBatch(db);
    const unreadNotifs = notifications.filter((n) => !n.read);
    unreadNotifs.forEach((notif) => {
      const notifRef = doc(
        db,
        "notifications",
        user.uid,
        "userNotifications",
        notif.id
      );
      batch.update(notifRef, { read: true });
    });

    try {
      // Update UI immediately
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
      setShowNotifications(false);
      await batch.commit();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-4 sm:left-10 text-green-200 text-3xl sm:text-6xl opacity-30 animate-float">🌿</div>
        <div className="absolute top-32 right-4 sm:right-20 text-emerald-300 text-2xl sm:text-4xl opacity-20 animate-float-reverse">♻️</div>
        <div className="absolute bottom-20 left-1/4 text-green-400 text-3xl sm:text-5xl opacity-15 animate-pulse">🌱</div>
        <div className="absolute top-1/2 right-4 sm:right-10 text-teal-300 text-xl sm:text-3xl opacity-25 animate-bounce">🍃</div>
      </div>

      <div className="relative z-10 px-3 sm:px-4 py-4 sm:py-6 max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-4 sm:mb-8 animate-slide-down">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaLeaf className="text-white text-sm sm:text-lg" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-800">
                Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">ECOSORT</p>
              <p className="text-xs text-gray-600">{currentTime.toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 relative">
            {/* Notification Bell Button with Badge */}
            <button
              onClick={toggleNotifications}
              className="p-2 sm:p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative focus:outline-none focus:ring-2 focus:ring-green-400"
              aria-label="Notifications"
              aria-haspopup="true"
              aria-expanded={showNotifications}
            >
              <FiBell className="text-gray-700 text-sm sm:text-lg" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[16px] h-[16px] text-xs font-bold rounded-full bg-red-600 text-white flex items-center justify-center"
                  aria-live="polite"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Settings Button */}
            

            {/* Profile Button */}
            <button
              onClick={() => navigate("/profile")}
              className="p-2 sm:p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400"
              aria-label="Go to Profile"
            >
              <FiUser className="text-white text-sm sm:text-lg" />
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div
                ref={dropdownRef}
                className="absolute right-0 top-[50px] sm:top-[60px] w-72 sm:w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-fade-in"
                role="dialog"
                aria-label="User Notifications"
              >
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                  <h3 className="font-bold text-base sm:text-lg">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-green-600 hover:text-green-700 text-sm font-medium focus:outline-none focus:underline"
                      aria-label="Mark all notifications as read"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {loadingNotifications ? (
                  <p className="p-4 text-gray-500 text-center">Loading notifications...</p>
                ) : notifications.length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No notifications</p>
                ) : (
                  <ul>
                    {notifications.map((notif) => (
                      <li
                        key={notif.id}
                        className={`px-3 sm:px-4 py-2 sm:py-3 cursor-pointer border-b last:border-b-0 ${
                          notif.read ? "bg-white" : "bg-green-50 font-semibold"
                        } hover:bg-green-100 focus:outline-none focus:bg-green-100`}
                        onClick={() => markAsRead(notif.id)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            markAsRead(notif.id);
                          }
                        }}
                        role="button"
                        aria-label={`Notification: ${notif.message}`}
                      >
                        <p className="text-sm">{notif.message}</p>
                        <small className="text-gray-400 text-xs">
                          {formatDate(notif.createdAt)}
                        </small>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Welcome Section */}
        <div className="mb-4 sm:mb-8 animate-fade-in">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl border border-white/20">
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h2 className="text-xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">
                  {loadingUser ? "Loading..." : `${getGreeting()}, ${userName}! 👋`}
                </h2>
                <p className="text-gray-600 text-sm sm:text-lg">
                  Ready to make a difference today?
                </p>
              </div>

              <div className="flex items-center justify-center sm:justify-start space-x-4 sm:space-x-6 w-full sm:w-auto">
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-xl sm:rounded-2xl mb-2 shadow-lg">
                    <FaCoins className="text-white text-lg sm:text-2xl" />
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-gray-800">
                    {loadingUser ? "..." : points.toLocaleString()}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">Points</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl sm:rounded-2xl mb-2 shadow-lg">
                    <FaCalendarAlt className="text-white text-sm sm:text-xl" />
                  </div>
                  <p className="text-sm sm:text-lg font-bold text-gray-800">Thu</p>
                  <p className="text-xs sm:text-sm text-gray-600">Collection</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8 animate-slide-up">
          {[
            {
              label: "This Week",
              value: "12",
              extra: "+3 from last week",
              icon: <FaRecycle className="text-green-600 text-sm sm:text-xl" />,
              iconBg: "bg-green-100",
              extraColor: "text-green-600",
            },
            {
              label: "Rank",
              value: "#5",
              extra: "Top 10%",
              icon: <FaTrophy className="text-blue-600 text-sm sm:text-xl" />,
              iconBg: "bg-blue-100",
              extraColor: "text-blue-600",
            },
            {
              label: "Impact",
              value: "4.2kg",
              extra: "CO₂ saved",
              icon: <FaLeaf className="text-emerald-600 text-sm sm:text-xl" />,
              iconBg: "bg-emerald-100",
              extraColor: "text-emerald-600",
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white/60 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-white/30 hover:bg-white/70 transition-all duration-300"
            >
              <div className="text-center sm:text-left">
                <div
                  className={`${stat.iconBg} rounded-lg flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 mx-auto sm:mx-0 mb-2`}
                >
                  {stat.icon}
                </div>
                <p className="text-xs sm:text-sm text-gray-600">{stat.label}</p>
                <p className="text-sm sm:text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className={`text-xs ${stat.extraColor} hidden sm:block`}>{stat.extra}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 animate-stagger">
          {MENU_ITEMS.map((item, index) => (
            <div
              key={item.id}
              className="group cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => navigate(item.route)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(item.route);
                }
              }}
              aria-label={`Go to ${item.title}`}
            >
              <div
                className={`${item.bgColor} rounded-2xl sm:rounded-3xl p-3 sm:p-6 lg:p-8 shadow-xl border border-white/30 hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 backdrop-blur-sm`}
              >
                <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
                  <div
                    className={`w-10 h-10 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-r ${item.color} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <item.icon className="text-white text-lg sm:text-2xl lg:text-3xl" />
                  </div>

                  <div>
                    <h3
                      className={`text-sm sm:text-xl font-bold ${item.textColor} mb-1`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="mt-3 sm:mt-6 flex justify-center">
                  <div
                    className={`w-6 group-hover:w-10 sm:w-8 sm:group-hover:w-12 h-1 bg-gradient-to-r ${item.color} rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Collection Notice */}
        <div className="mt-6 sm:mt-12 animate-fade-in">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-white/10 rounded-full translate-y-8 -translate-x-8 sm:translate-y-12 sm:-translate-x-12"></div>

            <div className="relative z-10 text-center">
              <div className="flex justify-center mb-3 sm:mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center">
                  <FaCalendarAlt className="text-xl sm:text-3xl" />
                </div>
              </div>
              <h3 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">
                Next Collection Day
              </h3>
              <p className="text-sm sm:text-lg opacity-90 mb-3 sm:mb-4">
                Thursday Morning - Don't forget to prepare your waste!
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-1 sm:space-y-0 sm:space-x-6 text-xs sm:text-sm opacity-80">
                <span>📞 0912 345 6789</span>
                <span className="hidden sm:inline">✉️ taonzo@gmail.com</span>
                <span>📍 Brgy. T. Alonzo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded CSS for Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-15px) rotate(1deg); }
          66% { transform: translateY(-8px) rotate(-1deg); }
        }
        
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(20px) rotate(2deg); }
        }
        
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 8s ease-in-out infinite; }
        .animate-slide-down { animation: slide-down 0.8s ease-out; }
        .animate-slide-up { animation: slide-up 0.8s ease-out 0.2s both; }
        .animate-fade-in { animation: fade-in 1s ease-out 0.3s both; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out both; }
        .animate-stagger > * { animation: fade-in-up 0.6s ease-out both; }
      `}</style>
    </div>
  );
}
