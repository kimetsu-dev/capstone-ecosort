import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiMenu, FiX, FiLogOut, FiChevronRight } from "react-icons/fi";
import { useTheme } from "../contexts/ThemeContext";
import { DashboardCalendar } from "../components/DashboardCalendar";
import NotificationCenter from "../components/NotificationCenter";
import SubmitWaste from "./SubmitWaste";
import Rewards from "./Rewards";
import Forum from "./Forum";
import Leaderboard from "./Leaderboard";
import Transactions from "./Transactions";

import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import {
  FaRecycle,
  FaGift,
  FaExclamationTriangle,
  FaTrophy,
  FaFileAlt,
  FaHome,
  FaClock,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaChartLine,
} from "react-icons/fa";

const MENU_ITEMS = [
  { id: "overview", title: "Overview", icon: FaHome, color: "from-blue-400 via-indigo-500 to-purple-600" },
  { id: "submit", title: "Submit Waste", icon: FaRecycle, color: "from-emerald-400 via-teal-500 to-green-600" },
  { id: "rewards", title: "Redeem Rewards", icon: FaGift, color: "from-amber-400 via-orange-500 to-yellow-600" },
  { id: "report", title: "Report Forum", icon: FaExclamationTriangle, color: "from-red-400 via-rose-500 to-pink-600" },
  { id: "leaderboard", title: "Leaderboard", icon: FaTrophy, color: "from-blue-400 via-indigo-500 to-purple-600" },
  { id: "transactions", title: "Transactions", icon: FaFileAlt, color: "from-gray-400 via-slate-500 to-gray-600" },
];

const DAY_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export default function Dashboard() {
  const themeContext = useTheme();
  const [userName, setUserName] = useState(null);
  const [points, setPoints] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [collectionSchedules, setCollectionSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const navigate = useNavigate();
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState(null);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      setIsPWA(isStandalone || isIOSStandalone);
    };
    checkPWA();
  }, []);

  useEffect(() => {
    const schedulesRef = collection(db, "collection_schedules");
    const schedulesQuery = query(
      schedulesRef,
      where("isActive", "==", true)
    );

    const unsubscribe = onSnapshot(
      schedulesQuery,
      (snapshot) => {
        const schedulesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCollectionSchedules(schedulesData);
        setLoadingSchedules(false);
      },
      (error) => {
        console.error("Error fetching schedules:", error);
        setLoadingSchedules(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getNextCollectionDate = () => {
    if (collectionSchedules.length === 0) {
      return null;
    }

    const today = new Date();
    const currentDay = today.getDay();
    const currentTime = today.getHours() * 60 + today.getMinutes();

    let nearestCollection = null;
    let minDaysAway = Infinity;

    for (const schedule of collectionSchedules) {
      const scheduleDayNum = DAY_MAP[schedule.day.toLowerCase()];
      
      const [startHours, startMinutes] = schedule.startTime.split(':').map(Number);
      const scheduleTime = startHours * 60 + startMinutes;

      let daysUntil = scheduleDayNum - currentDay;
      
      if (daysUntil < 0 || (daysUntil === 0 && currentTime >= scheduleTime)) {
        daysUntil += 7;
      }

      if (daysUntil < minDaysAway) {
        minDaysAway = daysUntil;
        const collectionDate = new Date(today);
        collectionDate.setDate(today.getDate() + daysUntil);
        collectionDate.setHours(startHours, startMinutes, 0, 0);
        
        nearestCollection = {
          date: collectionDate,
          schedule: schedule
        };
      }
    }

    return nearestCollection;
  };

  const getWeekCollectionDates = () => {
    if (collectionSchedules.length === 0) {
      return [];
    }

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const collectionDates = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayNum = date.getDay();

      const daySchedule = collectionSchedules.find(
        schedule => DAY_MAP[schedule.day.toLowerCase()] === dayNum
      );

      if (daySchedule) {
        const [hours, minutes] = daySchedule.startTime.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);
        
        collectionDates.push({
          date: date,
          schedule: daySchedule
        });
      }
    }

    return collectionDates;
  };

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

    return () => {
      unsubscribeUser();
    };
  }, []);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        setLoadingActivity(true);
        
        const wasteQuery = query(
          collection(db, "wasteSubmissions"),
          orderBy("submittedAt", "desc"),
          limit(5)
        );
        const wasteSnapshot = await getDocs(wasteQuery);
        
        const transactionsQuery = query(
          collection(db, "transactions"),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);

        const activities = [];
        
        wasteSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.userId === user.uid) {
            activities.push({
              id: doc.id,
              type: "waste_submission",
              description: `Submitted ${data.wasteType || "waste"} - ${data.weight || 0}kg`,
              points: data.pointsEarned || 0,
              timestamp: data.submittedAt?.toDate() || new Date(),
              icon: FaRecycle,
              color: "emerald"
            });
          }
        });

        transactionsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.userId === user.uid) {
            activities.push({
              id: doc.id,
              type: data.type === "redemption" ? "reward_redemption" : "points_earned",
              description: data.type === "redemption" 
                ? `Redeemed ${data.rewardName || "reward"}` 
                : `Earned ${data.amount || 0} points`,
              points: data.type === "redemption" ? -Math.abs(data.amount || 0) : (data.amount || 0),
              timestamp: data.createdAt?.toDate() || new Date(),
              icon: data.type === "redemption" ? FaGift : FaTrophy,
              color: data.type === "redemption" ? "amber" : "blue"
            });
          }
        });

        activities.sort((a, b) => b.timestamp - a.timestamp);
        
        setRecentActivity(activities.slice(0, 5));
        setLoadingActivity(false);
      } catch (error) {
        console.error("Error fetching activity:", error);
        setLoadingActivity(false);
      }
    };

    if (auth.currentUser) {
      fetchRecentActivity();
    }
  }, []);

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

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const handleNavigation = (item) => {
    if (isPWA) {
      navigate(`/${item.id}`);
    } else {
      setActiveTab(item.id);
    }
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const isToday = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatRelativeTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const formatTime = (time) => {
    try {
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return time;
    }
  };

  const formatTimeRange = (start, end) => {
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const nextCollection = getNextCollectionDate();
  const weekCollectionDates = getWeekCollectionDates();
  const isSelectedDateToday = isToday(selectedDate);

  if (isPWA) {
    return (
      <div
        className={`min-h-screen transition-all duration-500 ${getThemeClass(
          "backgroundGradient",
          "bg-gray-50 dark:bg-gray-900"
        )} relative overflow-hidden`}
      >
        <div className="relative z-10 px-3 py-4 max-w-7xl mx-auto">
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

            <div className="flex items-center space-x-1 relative">
              <NotificationCenter userId={auth.currentUser?.uid} />
              <button
                onClick={() => navigate("/profile")}
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
                <h2
                  className={`text-2xl font-extrabold ${getThemeClass(
                    "textPrimary",
                    "text-gray-900 dark:text-white"
                  )} mb-1 animate-fade-in-up`}
                >
                  {loadingUser ? "Loading..." : (
                    <>
                      {getGreeting()}{" "}
                      <span className={`${getThemeClass("textAccent", "text-emerald-600 dark:text-emerald-400")} select-text`}>
                        {userName || "User"}
                      </span>
                    </>
                  )}
                </h2>
                <p
                  className={`text-xl font-semibold ${getThemeClass(
                    "textSecondary",
                    "text-gray-700 dark:text-gray-300"
                  )} select-none`}
                >
                  {loadingUser ? "Fetching points..." : `Eco Points: ${points || 0}`}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 animate-stagger mb-6">
            {MENU_ITEMS.slice(1).map((item, index) => (
              <div
                key={item.id}
                className="group cursor-pointer animate-fade-in-up touch-manipulation"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleNavigation(item)}
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
                    <h3
                      className={`text-sm font-black ${getThemeClass(
                        "textPrimary",
                        "text-gray-900 dark:text-white"
                      )} leading-tight`}
                    >
                      {item.title}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200"
          : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-900"
      }`}
    >
      <header
        className={`lg:hidden backdrop-blur-md sticky top-0 z-30 border-b ${
          isDark
            ? "bg-gray-800/90 text-gray-200 border-gray-700"
            : "bg-white/90 text-slate-900 border-slate-200/50"
        } shadow-sm`}
      >
        <div className="px-4">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className={`p-2 rounded-lg ${
                  isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                } transition-colors`}
              >
                <FiMenu className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg">
                  E
                </div>
                <h1
                  className={`text-base font-bold bg-gradient-to-r ${
                    isDark ? "from-gray-100 to-gray-400" : "from-slate-800 to-slate-600"
                  } bg-clip-text text-transparent`}
                >
                  ECOSORT
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <NotificationCenter userId={auth.currentUser?.uid} />
              <div
                className="flex items-center space-x-2 cursor-pointer group"
                onClick={() => navigate("/profile")}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center group-hover:shadow-md transition-all">
                  <FiUser className="text-emerald-600 w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${sidebarCollapsed ? "lg:w-20" : "lg:w-64"} w-64 ${
            isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          } border-r flex flex-col h-screen`}
        >
          <div className={`flex items-center justify-between p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"} flex-shrink-0`}>
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  E
                </div>
                <div>
                  <h2 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>ECOSORT</h2>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Dashboard</p>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                setSidebarOpen(false);
                if (window.innerWidth >= 1024) {
                  setSidebarCollapsed(!sidebarCollapsed);
                }
              }}
              className={`p-2 rounded-lg ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition-colors`}
            >
              {sidebarCollapsed ? <FiMenu className="w-5 h-5" /> : <FiX className="w-5 h-5" />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-2" style={{ scrollbarWidth: "thin" }}>
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item)}
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                    isActive
                      ? `${isDark 
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25" 
                          : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                        } transform scale-[1.02]`
                      : `${isDark 
                          ? "text-gray-300 hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-600 hover:text-white" 
                          : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"
                        } hover:transform hover:scale-[1.01] border border-transparent hover:border-gray-200 dark:hover:border-gray-600`
                  }`}
                  title={sidebarCollapsed ? item.title : ''}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-20"></div>
                  )}
                  <Icon className={`w-5 h-5 ${isActive ? "text-white" : ""} transition-colors flex-shrink-0`} />
                  {!sidebarCollapsed && <span className="font-medium flex-1 text-left">{item.title}</span>}
                </button>
              );
            })}
          </nav>

          <div className={`p-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"} flex-shrink-0`}>
            {!sidebarCollapsed && (
              <div
                className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer group transition-colors mb-3 ${
                  isDark
                    ? "hover:bg-gray-700 text-gray-300 hover:text-white"
                    : "hover:bg-slate-50 text-slate-600 hover:text-slate-800"
                }`}
                onClick={() => navigate("/profile")}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center group-hover:shadow-md transition-all">
                  <FiUser className="text-emerald-600 w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{userName || "User"}</p>
                  <p className={`text-xs truncate ${isDark ? "text-gray-400" : "text-slate-500"}`}>{auth.currentUser?.email}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-2 justify-center'} py-2.5 rounded-lg transition-all hover:transform hover:scale-105 ${
                isDark 
                  ? "text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30" 
                  : "text-gray-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
              }`}
              title={sidebarCollapsed ? "Logout" : ''}
            >
              <FiLogOut className="w-5 h-5" />
              {!sidebarCollapsed && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            style={{ zIndex: 45 }}
          />
        )}

        <div className={`flex-1 min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
          <div className="p-4 lg:p-6">
            <div
              className={`rounded-2xl shadow-xl border ${
                isDark ? "bg-gray-800/50 border-gray-700/50" : "bg-white/80 border-slate-200/50"
              } backdrop-blur-sm`}
            >
              <div className="p-4 lg:p-8 min-h-[90vh]">
                {activeTab === "overview" && (
                  <div className="space-y-6 lg:space-y-8">
                    {/* Welcome Header */}
                    <div className="relative overflow-hidden rounded-2xl">
                      <div className={`absolute inset-0 bg-gradient-to-r ${isDark ? 'from-emerald-600/20 via-teal-600/20 to-blue-600/20' : 'from-emerald-500/10 via-teal-500/10 to-blue-500/10'}`}></div>
                      <div className="relative p-6 lg:p-8">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div>
                            <h2 className={`text-2xl lg:text-4xl font-black mb-2 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                              {getGreeting()}, <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">{userName || "User"}</span>!
                            </h2>
                            <p className={`text-base lg:text-lg ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                              Ready to make an impact today? Let's sort for a better tomorrow.
                            </p>
                          </div>
                          <div className={`flex items-center gap-4 p-4 lg:p-6 rounded-2xl ${isDark ? "bg-gray-800/80 border border-gray-700" : "bg-white border border-slate-200"} shadow-lg`}>
                            <div>
                              <div className={`text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                                Eco Points
                              </div>
                              <div className="flex items-baseline gap-2">
                                <div className={`text-4xl lg:text-5xl font-black bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent`}>
                                  {loadingUser ? "..." : points || 0}
                                </div>
                                
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Grid Layout */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      {/* Left Column - Collection Schedule */}
                      <div className="xl:col-span-2 space-y-6">
                        {/* Next Collection Card */}
                        <div className={`rounded-2xl overflow-hidden shadow-xl border ${isDark ? "bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-700/50" : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"}`}>
                          <div className="p-6 lg:p-8">
                            <div className="flex items-center gap-3 mb-6">
                              <div className={`w-12 h-12 rounded-xl ${isDark ? "bg-blue-500/20" : "bg-blue-100"} flex items-center justify-center`}>
                                <FaCalendarAlt className={`w-6 h-6 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                              </div>
                              <div>
                                <h3 className={`text-xl lg:text-2xl font-bold ${isDark ? "text-blue-200" : "text-blue-800"}`}>
                                  Next Collection
                                </h3>
                                <p className={`text-sm ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                                  Don't miss your collection day
                                </p>
                              </div>
                            </div>

                            {loadingSchedules ? (
                              <div className="flex flex-col items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
                                <span className={`text-sm ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                                  Loading schedule...
                                </span>
                              </div>
                            ) : !nextCollection ? (
                              <div className="text-center py-12">
                                <div className={`w-20 h-20 mx-auto mb-4 rounded-full ${isDark ? "bg-blue-500/10" : "bg-blue-100"} flex items-center justify-center`}>
                                  <FaCalendarAlt className={`w-10 h-10 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                                </div>
                                <h4 className={`text-lg font-bold mb-2 ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                                  No Schedule Available
                                </h4>
                                <p className={`text-sm ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                                  Contact your administrator to set up collection schedules
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                <div className={`p-6 rounded-xl ${isDark ? "bg-gray-800/50" : "bg-white/80"} backdrop-blur-sm border ${isDark ? "border-gray-700" : "border-blue-200"}`}>
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                      <div className={`text-4xl lg:text-5xl font-black mb-3 ${isDark ? "text-white" : "text-blue-900"}`}>
                                        {nextCollection.date.toLocaleDateString('en-US', { weekday: 'long' })}
                                      </div>
                                      <div className={`text-2xl font-bold mb-4 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                                        {nextCollection.date.toLocaleDateString('en-US', {
                                          month: 'long',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </div>
                                    </div>
                                    {isToday(nextCollection.date) && (
                                      <div className="animate-pulse">
                                        <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-full shadow-lg">
                                          <span className="w-2 h-2 bg-white rounded-full mr-2 animate-ping"></span>
                                          TODAY
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className={`flex items-center gap-3 p-4 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-blue-50"}`}>
                                      <div className={`w-10 h-10 rounded-lg ${isDark ? "bg-blue-500/20" : "bg-blue-100"} flex items-center justify-center`}>
                                        <FaClock className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                                      </div>
                                      <div>
                                        <div className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                                          Collection Time
                                        </div>
                                        <div className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                                          {formatTimeRange(nextCollection.schedule.startTime, nextCollection.schedule.endTime)}
                                        </div>
                                      </div>
                                    </div>

                                    {(nextCollection.schedule.area || nextCollection.schedule.barangay) && (
                                      <div className={`flex items-center gap-3 p-4 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-blue-50"}`}>
                                        <div className={`w-10 h-10 rounded-lg ${isDark ? "bg-emerald-500/20" : "bg-emerald-100"} flex items-center justify-center`}>
                                          <FaMapMarkerAlt className={`w-5 h-5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                                            Location
                                          </div>
                                          <div className={`text-sm font-bold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                                            {nextCollection.schedule.area}
                                            {nextCollection.schedule.barangay && `, ${nextCollection.schedule.barangay}`}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Week Schedule */}
                                {weekCollectionDates.length > 0 && (
                                  <div>
                                    <h4 className={`text-sm font-bold mb-3 ${isDark ? "text-blue-300" : "text-blue-700"} uppercase tracking-wider`}>
                                      This Week's Schedule
                                    </h4>
                                    <div className={`grid gap-3 ${
                                      weekCollectionDates.length === 1 
                                        ? 'grid-cols-1' 
                                        : weekCollectionDates.length === 2 
                                        ? 'grid-cols-2' 
                                        : 'grid-cols-3'
                                    }`}>
                                      {weekCollectionDates.map((collection, index) => {
                                        const isPast = collection.date < new Date() && !isToday(collection.date);
                                        const isTodayDate = isToday(collection.date);
                                        
                                        return (
                                          <div
                                            key={index}
                                            className={`relative p-4 rounded-xl transition-all duration-300 ${
                                              isTodayDate
                                                ? `bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/50 scale-105`
                                                : isPast
                                                ? `${isDark ? "bg-gray-700/30 text-gray-500" : "bg-gray-100 text-gray-400"} opacity-50`
                                                : `${isDark ? "bg-gray-700/50 text-gray-300 hover:bg-gray-700" : "bg-white text-gray-700 hover:bg-blue-50"} border ${isDark ? "border-gray-600" : "border-blue-100"} hover:shadow-md`
                                            }`}
                                          >
                                            {isTodayDate && (
                                              <div className="absolute top-2 right-2">
                                                <FaCheckCircle className="w-5 h-5 text-white" />
                                              </div>
                                            )}
                                            <div className={`text-xs font-bold mb-1 uppercase tracking-wide ${isTodayDate ? "text-white/90" : ""}`}>
                                              {collection.date.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </div>
                                            <div className={`text-2xl font-black mb-2 ${isTodayDate ? "text-white" : ""}`}>
                                              {collection.date.getDate()}
                                            </div>
                                            <div className={`text-xs font-medium mb-1 ${isTodayDate ? "text-white/90" : ""}`}>
                                              {formatTime(collection.schedule.startTime)}
                                            </div>
                                            {collection.schedule.area && (
                                              <div className={`text-xs truncate ${isTodayDate ? "text-white/80" : ""}`}>
                                                {collection.schedule.area}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Stats */}
                      <div className="space-y-6">
                        {/* Quick Stats */}
                        
                          <div className="flex items-center gap-3 mb-4">
                            
                          
                          
                          <div className="space-y-4">
                           
                            
                         
                            
                            <div className="space-y-3">
                              
                            </div>
                          </div>
                        </div>

                        {/* Calendar Widget */}
                        <div className={`rounded-2xl p-6 border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-slate-200"} shadow-xl`}>
                          <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-gray-200" : "text-slate-700"}`}>
                            Calendar
                          </h3>
                          <DashboardCalendar
                            selectedDate={selectedDate}
                            setSelectedDate={setSelectedDate}
                            isDark={isDark}
                          />
                        </div>
                      </div>
                    </div>

                   
                      </div>
                    
                  
                )}
                
                {activeTab === "submit" && <SubmitWaste />}
                {activeTab === "rewards" && <Rewards />}
                {activeTab === "report" && <Forum sidebarOpen={sidebarOpen} />}
                {activeTab === "leaderboard" && <Leaderboard />}
                {activeTab === "transactions" && <Transactions />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
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

        .animate-slide-down { 
          animation: slide-down 0.6s ease-out; 
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

        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
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

        ::selection {
          background: ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(52, 211, 153, 0.4)'};
          color: ${isDark ? '#ffffff' : '#000000'};
        }

        * {
          transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
          transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          transition-duration: 200ms;
        }

        button:active,
        [role="button"]:active {
          transform: scale(0.95);
          transition-duration: 100ms;
        }

        button:focus-visible,
        [role="button"]:focus-visible {
          outline: 2px solid ${isDark ? '#10b981' : '#059669'};
          outline-offset: 2px;
          border-radius: 0.75rem;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-slide-down,
          .animate-fade-in,
          .animate-fade-in-up {
            animation: none;
          }
          
          * {
            transition-duration: 50ms;
          }
        }

        body {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        @media (max-width: 640px) {
          .backdrop-blur-xl {
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
          }
        }

        .touch-manipulation {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        button,
        [role="button"] {
          min-height: 44px;
          min-width: 44px;
        }

        @supports (padding-top: env(safe-area-inset-top)) {
          .py-3 {
            padding-top: max(0.75rem, env(safe-area-inset-top));
            padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
          }
        }

        nav[style*="scrollbarWidth"] {
          scrollbar-color: ${isDark ? '#10b981 #1f2937' : '#10b981 #f3f4f6'};
        }

        @media (prefers-contrast: high) {
          .backdrop-blur-xl,
          .backdrop-blur-2xl {
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            background: ${isDark ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
          }
        }

        aside {
          will-change: transform, width;
        }
      `}</style>
    </div>
  );
}