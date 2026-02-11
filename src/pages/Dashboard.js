import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiMenu, FiX, FiLogOut, FiChevronLeft, FiBell } from "react-icons/fi";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext"; // Using existing AuthContext for stability
import { DashboardCalendar } from "../components/DashboardCalendar";
import NotificationCenter from "../components/NotificationCenter";
import NotificationsListener from "../components/NotificationsListener"; // ✅ Added Listener
import UpdateBanner from '../components/UpdateBanner';
import SubmitWaste from "./SubmitWaste";
import Rewards from "./Rewards";
import Forum from "./Forum";
import Leaderboard from "./Leaderboard";
import Transactions from "./Transactions";
import PublicVerification from "./PublicVerification";
import { useLanguage } from "../contexts/LanguageContext";
import usePushNotifications from "../hooks/usePushNotifications"; // ✅ Added Hook

import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  getDoc,
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
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaChartLine,
  FaArrowUp,
  FaLeaf,
  FaCubes,
  FaLink,
  FaMedal,
  FaUsers,
  FaChartBar,
  FaBell,
} from "react-icons/fa";

// Menu items for web version
const WEB_MENU_ITEMS = [
  { id: "overview", title: "Home", icon: FaHome, color: "from-blue-500 to-indigo-600", bgColor: "bg-blue-500" },
  { id: "submit", title: "Submit", icon: FaRecycle, color: "from-emerald-500 to-teal-600", bgColor: "bg-emerald-500" },
  { id: "rewards", title: "Rewards", icon: FaGift, color: "from-amber-500 to-orange-600", bgColor: "bg-amber-500" },
  { id: "report", title: "Forum", icon: FaExclamationTriangle, color: "from-red-500 to-rose-600", bgColor: "bg-red-500" },
  { id: "leaderboard", title: "Leaderboard", icon: FaTrophy, color: "from-purple-500 to-pink-600", bgColor: "bg-purple-500" },
  { id: "transactions", title: "Transactions", icon: FaFileAlt, color: "from-slate-500 to-gray-600", bgColor: "bg-slate-500" },
  { id: "ledger", title: "Public Ledger", icon: FaCubes, color: "from-indigo-500 to-purple-600", bgColor: "bg-indigo-500" }, 
];

// Menu items for app version
const APP_MENU_ITEMS = [
  { id: "overview", title: "Home", icon: FaHome, color: "from-blue-500 to-indigo-600", bgColor: "bg-blue-500" },
  { id: "submit", title: "Submit", icon: FaRecycle, color: "from-emerald-500 to-teal-600", bgColor: "bg-emerald-500" },
  { id: "rewards", title: "Rewards", icon: FaGift, color: "from-amber-500 to-orange-600", bgColor: "bg-amber-500" },
  { id: "report", title: "Forum", icon: FaExclamationTriangle, color: "from-red-500 to-rose-600", bgColor: "bg-red-500" },
  { id: "transactions", title: "Transactions", icon: FaFileAlt, color: "from-slate-500 to-gray-600", bgColor: "bg-slate-500" },
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
  const { currentUser } = useAuth(); // Using existing Auth Context
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
  const [submissionSchedules, setSubmissionSchedules] = useState([]); 
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [monthlySubmissions, setMonthlySubmissions] = useState(0);
  const [weeklySubmissions, setWeeklySubmissions] = useState(0);
  const navigate = useNavigate();
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState(null);
  const [isPWA, setIsPWA] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // ✅ Initialize Push Notifications Hook
  // This handles permission requests and saves the FCM token to Firestore
  usePushNotifications(currentUser);

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
          type: "collection", 
          ...doc.data(),
        }));
        setCollectionSchedules(schedulesData);
        setLoadingSchedules(false); 
      },
      (error) => {
        console.error("Error fetching collection schedules:", error);
        setLoadingSchedules(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const schedulesRef = collection(db, "submission_schedules");
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
        setSubmissionSchedules(schedulesData); 
      },
      (error) => {
        console.error("Error fetching submission schedules:", error);
      }
    );

    return () => unsubscribe();
  }, []); 

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoadingLeaderboard(true);
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("totalPoints", "desc"), limit(5));
        const querySnapshot = await getDocs(q);
        
        const leaderboard = querySnapshot.docs.map((doc, index) => ({
          id: doc.id,
          rank: index + 1,
          username: doc.data().username || "Anonymous",
          points: doc.data().totalPoints || 0,
          isCurrentUser: doc.id === currentUser?.uid
        }));
        
        setLeaderboardData(leaderboard);
        setLoadingLeaderboard(false);
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        setLoadingLeaderboard(false);
      }
    };

    fetchLeaderboardData();
  }, [currentUser]);

  // Fetch user submission data
  useEffect(() => {
    const fetchSubmissionData = async () => {
      if (!currentUser) return;

      try {
        // Get current date and dates for month and week calculations
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        
        // Fetch all waste submissions for the user
        const wasteQuery = query(
          collection(db, "wasteSubmissions"),
          where("userId", "==", currentUser.uid)
        );
        const wasteSnapshot = await getDocs(wasteQuery);
        
        let monthlyCount = 0;
        let weeklyCount = 0;
        
        wasteSnapshot.forEach((doc) => {
          const data = doc.data();
          const submissionDate = data.submittedAt?.toDate();
          
          if (submissionDate) {
            if (submissionDate >= startOfMonth) {
              monthlyCount++;
            }
            if (submissionDate >= startOfWeek) {
              weeklyCount++;
            }
          }
        });
        
        setMonthlySubmissions(monthlyCount);
        setWeeklySubmissions(weeklyCount);
      } catch (error) {
        console.error("Error fetching submission data:", error);
      }
    };

    if (currentUser) {
      fetchSubmissionData();
    }
  }, [currentUser]);

  // Generate achievements based on points
  const generateAchievements = (points) => {
    const allAchievements = [
      { name: "First Steps", icon: "🌱", description: "Earned your first 100 points", requiredPoints: 100, unlocked: points >= 100 },
      { name: "Eco Advocate", icon: "🌿", description: "Reached 500 points milestone", requiredPoints: 500, unlocked: points >= 500 },
      { name: "Eco Hero", icon: "🦸", description: "Achieved 1000 points!", requiredPoints: 1000, unlocked: points >= 1000 },
      { name: "Green Champion", icon: "🏆", description: "Outstanding 2000+ points", requiredPoints: 2000, unlocked: points >= 2000 },
    ];
    return allAchievements;
  };

  // Fetch user details when clicked
  const handleUserClick = async (user, rank) => {
    setModalLoading(true);
    setShowModal(true);
    
    try {
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const achievements = generateAchievements(userData.totalPoints || 0);
        
        setSelectedUser({
          ...user,
          ...userData,
          rank,
          achievements,
        });
      } else {
        setSelectedUser({
          ...user,
          rank,
          achievements: generateAchievements(user.totalPoints || 0),
        });
      }
    } catch (err) {
      console.error("Error fetching user details:", err);
      setSelectedUser({
        ...user,
        rank,
        achievements: generateAchievements(user.totalPoints || 0),
      });
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedUser(null), 300);
  };

  const allSchedules = useMemo(() => {
    return [
      ...collectionSchedules.map(schedule => ({
        ...schedule,
        title: `Collection: ${schedule.area || schedule.barangay || 'Area'}`,
      })),
      ...submissionSchedules.map(schedule => ({
        ...schedule,
        title: `Submission: ${schedule.area || schedule.barangay || 'Center'}`,
      })),
    ];
  }, [collectionSchedules, submissionSchedules]);

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

  const getNextSubmissionDate = () => {
    if (submissionSchedules.length === 0) {
      return null;
    }

    const today = new Date();
    const currentDay = today.getDay();
    const currentTime = today.getHours() * 60 + today.getMinutes();

    let nearestSubmission = null;
    let minDaysAway = Infinity;

    for (const schedule of submissionSchedules) {
      const scheduleDayNum = DAY_MAP[schedule.day.toLowerCase()];
      
      const [startHours, startMinutes] = schedule.startTime.split(':').map(Number);
      const scheduleTime = startHours * 60 + startMinutes;

      let daysUntil = scheduleDayNum - currentDay;
      
      if (daysUntil < 0 || (daysUntil === 0 && currentTime >= scheduleTime)) {
        daysUntil += 7; 
      }

      if (daysUntil < minDaysAway) {
        minDaysAway = daysUntil;
        const submissionDate = new Date(today);
        submissionDate.setDate(today.getDate() + daysUntil);
        submissionDate.setHours(startHours, startMinutes, 0, 0);
        
        nearestSubmission = {
          date: submissionDate,
          schedule: schedule
        };
      }
    }

    return nearestSubmission;
  };

  useEffect(() => {
    if (!currentUser) {
      setLoadingUser(false);
      setError("No authenticated user");
      return;
    }
    const userRef = doc(db, "users", currentUser.uid);
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
  }, [currentUser]);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (!currentUser) return;

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
          if (data.userId === currentUser.uid) {
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
          if (data.userId === currentUser.uid) {
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

    if (currentUser) {
      fetchRecentActivity();
    }
  }, [currentUser]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!themeContext) {
    console.error("Theme context not available");
    return <div>Loading...</div>;
  }

  const { styles, isDark } = themeContext;

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const handleNavigation = (item) => {
    setActiveTab(item.id);
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
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    } catch {
      return time;
    }
  };

  const formatTimeRange = (start, end) => {
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const nextCollection = getNextCollectionDate();
  const nextSubmission = getNextSubmissionDate();

  // Find user's rank in leaderboard
  const userRank = leaderboardData.findIndex(user => user.isCurrentUser) + 1;

  // PWA MODE - Mobile App Design
  if (isPWA) {
    return (
      <div className={`min-h-screen pb-32 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
        {/* ✅ Foreground Toast Listener */}
        <NotificationsListener userId={currentUser?.uid} />

        <div className={`sticky top-0 z-50 ${isDark ? 'bg-gray-900/95' : 'bg-white/95'} border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <div>
                <h1 className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  ECOSORT
                </h1>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {getGreeting()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter userId={currentUser?.uid} />
              <button
                onClick={() => navigate("/profile")}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <FiUser className="text-white text-lg" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          {activeTab === "overview" ? (
            <div className="space-y-4">
              {/* Enhanced Eco Points Card with Leaderboard Integration */}
              <div className={`rounded-3xl overflow-hidden shadow-2xl ${isDark ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
                <div className="p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <p className="text-emerald-100 text-sm font-medium mb-2">Your Eco Points</p>
                        <div className="flex items-baseline gap-2">
                          <h2 className="text-5xl font-black text-white">
                            {loadingUser ? "..." : points || 0}
                          </h2>
                          <span className="text-emerald-100 text-lg">pts</span>
                        </div>
                      </div>
                      
                      {/* Trophy icon positioned side by side with points */}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => setShowLeaderboard(!showLeaderboard)}
                          className={`p-2 rounded-xl ${isDark ? 'bg-white/20 hover:bg-white/30' : 'bg-emerald-100 hover:bg-emerald-200'} transition-all active:scale-95`}
                          title="View Leaderboard"
                        >
                          <FaTrophy className="text-yellow-300 text-2xl" />
                        </button>
                        <span className="text-emerald-100 text-xs font-medium mt-1">
                          Rank #{userRank}
                        </span>
                        <span className="text-emerald-100 text-xs">
                          Click to view
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Leaderboard Section */}
                {showLeaderboard && (
                  <div className={`${isDark ? 'bg-gray-900/90' : 'bg-white/90'} backdrop-blur-sm p-4 border-t ${isDark ? 'border-emerald-700' : 'border-emerald-400'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Top Recyclers</h3>
                      <FaUsers className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    </div>
                    
                    {loadingLeaderboard ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {leaderboardData.map((user) => (
                          <div 
                            key={user.id} 
                            onClick={() => handleUserClick(user, user.rank)}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${user.isCurrentUser ? (isDark ? 'bg-emerald-800/30' : 'bg-emerald-100') : ''}`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              user.rank === 1 ? 'bg-yellow-500 text-white' : 
                              user.rank === 2 ? 'bg-gray-400 text-white' : 
                              user.rank === 3 ? 'bg-amber-600 text-white' : 
                              isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {user.rank}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {user.username}
                                {user.isCurrentUser && (
                                  <span className={`ml-1 text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}> (You)</span>
                                )}
                              </p>
                            </div>
                            <span className={`text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              {user.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PWA: Added Blockchain Status Card */}
              <div 
                onClick={() => setActiveTab('ledger')}
                className={`rounded-3xl p-5 ${isDark ? 'bg-indigo-900/30 border border-indigo-800' : 'bg-indigo-50 border border-indigo-100'} shadow-lg cursor-pointer active:scale-95 transition-transform`}
              >
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                          <FaCubes className="text-lg" />
                      </div>
                      <div>
                        <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Public Ledger
                        </h3>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          All data is auditable & transparent
                        </p>
                      </div>
                   </div>
                   <FaLink className={`text-sm ${isDark ? 'text-indigo-400' : 'text-indigo-400'}`} />
                </div>
              </div>

              {/* UPDATED CALENDAR CARD */}
              <div className={`rounded-3xl p-5 ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} shadow-lg`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Calendar
                    </h3>
                   
                  </div>
                </div>

                {/* Reminder Alert if there is an event today */}
                {((nextCollection && isToday(nextCollection.date)) || (nextSubmission && isToday(nextSubmission.date))) && (
                   <div className={`mb-4 p-3 rounded-2xl flex items-center gap-3 ${isDark ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-emerald-50 border border-emerald-100'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-emerald-500' : 'bg-emerald-500'}`}>
                        <FaBell className="text-white text-xs" />
                      </div>
                      <div>
                         <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                           Happening Today!
                         </p>
                         <p className={`text-[10px] ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                           {nextCollection && isToday(nextCollection.date) ? "Waste Collection Day" : "Submission Center Open"}
                         </p>
                      </div>
                   </div>
                )}

                <DashboardCalendar
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  isDark={isDark}
                  schedules={allSchedules}
                />
              </div>

              {nextCollection && (
                <div className={`rounded-3xl p-5 ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} shadow-lg`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div>
                      <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Garbage Collection
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {isToday(nextCollection.date) ? 'Today' : nextCollection.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-stretch gap-3">
                    <div className={`flex-1 rounded-2xl p-4 h-full ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Collection Time</span>
                      </div>
                      <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formatTime(nextCollection.schedule.startTime)}
                      </p>
                    </div>
                    {nextCollection.schedule.area && (
                      <div className={`flex-1 rounded-2xl p-4 h-full ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Location</span>
                        </div>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {nextCollection.schedule.area}
                          {nextCollection.schedule.barangay && `, ${nextCollection.schedule.barangay}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {nextSubmission && (
                <div className={`rounded-3xl p-5 ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} shadow-lg`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div>
                      <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Recyclable Waste Submission
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {isToday(nextSubmission.date) ? 'Today' : nextSubmission.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-stretch gap-3">
                    <div className={`flex-1 rounded-2xl p-4 h-full ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Operating Hours</span>
                      </div>
                      <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formatTimeRange(nextSubmission.schedule.startTime, nextSubmission.schedule.endTime)}
                      </p>
                    </div>
                    {nextSubmission.schedule.area && (
                      <div className={`flex-1 rounded-2xl p-4 h-full ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Location</span>
                        </div>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {nextSubmission.schedule.area}
                          {nextSubmission.schedule.barangay && `, ${nextSubmission.schedule.barangay}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {recentActivity.length > 0 && (
                <div>
                  <h3 className={`text-sm font-bold mb-3 px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                    Recent Activity
                  </h3>
                  <div className={`rounded-3xl ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} shadow-lg divide-y ${isDark ? 'divide-gray-800' : 'divide-gray-100'}`}>
                    {recentActivity.slice(0, 3).map((activity) => (
                      <div key={activity.id} className="p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl bg-${activity.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                          <activity.icon className={`text-${activity.color}-500 text-lg`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>
                            {activity.description}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatRelativeTime(activity.timestamp)}
                          </p>
                        </div>
                        <span className={`text-sm font-bold ${activity.points > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {activity.points > 0 ? '+' : ''}{activity.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="pb-4">
              {activeTab === "submit" && <SubmitWaste />}
              {activeTab === "rewards" && <Rewards />}
              {activeTab === "report" && <Forum sidebarOpen={false} />}
              {activeTab === "leaderboard" && <Leaderboard />}
              {activeTab === "transactions" && <Transactions />}
              {activeTab === "ledger" && <PublicVerification />}
            </div>
          )}
        </div>

        <div className={`fixed bottom-0 left-0 right-0 ${isDark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-200'} border-t backdrop-blur-xl z-50`}>
          <div className="px-2 py-3">
            <div className="flex items-center justify-around overflow-x-auto">
              {APP_MENU_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item)}
                    className="flex flex-col items-center gap-1 px-3 py-1 min-w-0 active:scale-95 transition-transform"
                  >
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                      isActive 
                        ? `bg-gradient-to-br ${item.color} shadow-lg shadow-${item.color.split('-')[1]}-500/30` 
                        : `${isDark ? 'bg-gray-800' : 'bg-gray-100'}`
                    }`}>
                      <item.icon className={`text-lg ${isActive ? 'text-white' : isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    </div>
                    <span className={`text-[10px] font-bold truncate max-w-[60px] ${
                      isActive 
                        ? 'text-emerald-500' 
                        : isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
         <UpdateBanner />
         
         {/* Added Modal here for App Version */}
         {showModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
              onClick={closeModal}
            >
              <div
                className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-slideUp ${
                  isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={closeModal}
                  className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                    isDark
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  <FiX className="w-5 h-5" />
                </button>

                {modalLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mb-4"></div>
                    <p className={`text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>Loading profile...</p>
                  </div>
                ) : selectedUser ? (
                  <>
                    {/* Header Section */}
                    <div className={`p-8 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* Profile Picture */}
                        <div className="relative">
                          {selectedUser.profileUrl ? (
                            <img
                              src={selectedUser.profileUrl}
                              alt="Profile"
                              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-white shadow-xl">
                              <FiUser size={36} className="text-gray-600" />
                            </div>
                          )}
                          {/* Rank Badge */}
                          <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                            selectedUser.rank === 1
                              ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900"
                              : selectedUser.rank === 2
                              ? "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900"
                              : selectedUser.rank === 3
                              ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white"
                              : isDark
                              ? "bg-gray-700 text-gray-300"
                              : "bg-gray-200 text-gray-700"
                          }`}>
                            #{selectedUser.rank}
                          </div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 text-center sm:text-left">
                          <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                            {selectedUser.username || selectedUser.email || 'Anonymous'}
                          </h2>
                          <p className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {selectedUser.email}
                          </p>
                          <div className="flex items-center justify-center sm:justify-start gap-4">
                            <div className={`px-4 py-2 rounded-xl ${isDark ? "bg-gray-700" : "bg-emerald-50"}`}>
                              <div className={`text-2xl font-bold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                                {(selectedUser.totalPoints || 0).toLocaleString()}
                              </div>
                              <div className={`text-xs ${isDark ? "text-emerald-500" : "text-emerald-600"}`}>Points</div>
                            </div>
                            <div className={`px-4 py-2 rounded-xl ${isDark ? "bg-gray-700" : "bg-blue-50"}`}>
                              <div className={`text-2xl font-bold ${isDark ? "text-blue-400" : "text-blue-700"}`}>
                                #{selectedUser.rank}
                              </div>
                              <div className={`text-xs ${isDark ? "text-blue-500" : "text-blue-600"}`}>Rank</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Achievements Section */}
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className={`text-xl font-bold flex items-center ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                          <FaTrophy className="mr-2 text-2xl" /> Achievements
                        </h3>
                        <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          {selectedUser.achievements?.filter(a => a.unlocked).length || 0} of {selectedUser.achievements?.length || 0} unlocked
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedUser.achievements?.map((achievement, index) => (
                          <div
                            key={index}
                            className={`rounded-xl p-4 border transition-all duration-300 relative ${
                              achievement.unlocked
                                ? `${
                                    isDark ? "bg-yellow-800/20 border-yellow-600/30" : "bg-yellow-50 border-amber-200"
                                  }`
                                : `${
                                    isDark 
                                      ? "bg-gray-700/30 border-gray-600/30 opacity-60" 
                                      : "bg-gray-50 border-gray-200 opacity-70"
                                  }`
                            }`}
                          >
                            {/* Unlocked indicator */}
                            {achievement.unlocked && (
                              <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                                <FaCheckCircle className="w-3 h-3 text-white" />
                              </div>
                            )}

                            <div className="flex items-start space-x-3">
                              <div 
                                className={`text-3xl flex-shrink-0 ${
                                  achievement.unlocked ? "" : "grayscale opacity-40"
                                }`}
                              >
                                {achievement.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 
                                  className={`font-bold text-base mb-1 ${
                                    achievement.unlocked 
                                      ? (isDark ? "text-yellow-300" : "text-amber-800")
                                      : (isDark ? "text-gray-400" : "text-gray-600")
                                  }`}
                                >
                                  {achievement.name}
                                </h4>
                                <p 
                                  className={`text-xs ${
                                    achievement.unlocked 
                                      ? (isDark ? "text-yellow-400" : "text-amber-600")
                                      : (isDark ? "text-gray-500" : "text-gray-500")
                                  }`}
                                >
                                  {achievement.description}
                                </p>

                                {/* Progress for locked achievements */}
                                {!achievement.unlocked && (
                                  <div className="mt-2">
                                    <div className={`w-full rounded-full h-1 ${isDark ? "bg-gray-600" : "bg-gray-200"}`}>
                                      <div
                                        className="bg-gradient-to-r from-blue-400 to-blue-500 h-1 rounded-full transition-all duration-500"
                                        style={{ 
                                          width: `${Math.min(((selectedUser.totalPoints || 0) / achievement.requiredPoints) * 100, 100)}%` 
                                        }}
                                      ></div>
                                    </div>
                                    <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                      {achievement.requiredPoints - (selectedUser.totalPoints || 0)} points to unlock
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Motivational Message */}
                      <div className={`mt-6 p-4 rounded-xl ${isDark ? "bg-blue-900/20 border border-blue-700/30" : "bg-blue-50 border border-blue-200"}`}>
                        <p className={`text-center text-sm ${isDark ? "text-blue-300" : "text-blue-800"}`}>
                          {selectedUser.achievements?.filter(a => a.unlocked).length === selectedUser.achievements?.length
                            ? "🎉 All achievements unlocked! You're an eco champion!"
                            : selectedUser.achievements?.filter(a => a.unlocked).length > 0
                            ? "Keep going! More achievements await!"
                            : "Start your eco journey to unlock achievements!"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
      </div>
    );
  }

  // WEB MODE - Desktop Design
  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200"
          : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-900"
      }`}
    >
      {/* ✅ Foreground Toast Listener */}
      <NotificationsListener userId={currentUser?.uid} />

     <header
        className={`lg:hidden sticky top-0 z-30 border-b ${
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
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg">
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
              <NotificationCenter userId={currentUser?.uid} />
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
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  E
                </div>
                <div>
                  <h2 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>ECOSORT</h2>
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
            {WEB_MENU_ITEMS.map((item) => {
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
                        } hover:transform hover:scale-[1.01] border border-transparent hover:border-gray-200 dark:hover:border-gray-600"`
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
                  <p className={`text-xs truncate ${isDark ? "text-gray-400" : "text-slate-500"}`}>{currentUser?.email}</p>
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

        <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
          
          <header className="hidden lg:flex items-center justify-end h-20 px-6 lg:px-8">
            <div className="flex-shrink-0 z-50">
              <NotificationCenter userId={currentUser?.uid} />
            </div>
          </header>
          
          <div className="p-4 lg:px-6 lg:pb-6">
            <div
              className={`relative rounded-2xl shadow-xl border ${
                isDark ? "bg-gray-800/50 border-gray-700/50" : "bg-white/80 border-slate-200/50"
              } backdrop-blur-sm`}
            >

              <div className="p-4 lg:p-8 min-h-[90vh]">
                {activeTab === "overview" && (
                  <div className="space-y-6 lg:space-y-8">
                     <div className="relative overflow-hidden rounded-2xl">
                      <div className={`absolute inset-0 bg-gradient-to-r ${isDark ? 'from-emerald-600/20 via-teal-600/20 to-blue-600/20' : 'from-emerald-500/10 via-teal-500/10 to-blue-500/10'}`}></div>
                      <div className="relative p-6 lg:p-8">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                          <div className="xl:col-span-3 flex flex-col justify-between">
                            <div>
                              <h2 className={`text-2xl lg:text-4xl font-black mb-2 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                                {getGreeting()}, <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">{userName || "User"}</span>!
                              </h2>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                              {/* Enhanced Eco Points Card with Leaderboard Integration */}
                              <div className={`flex items-center gap-4 p-4 lg:p-6 rounded-2xl ${isDark ? "bg-gray-800/80 border border-gray-700" : "bg-white border border-slate-200"} shadow-lg`}>
                                <div className="flex-1">
                                  <div className={`text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                                    Eco Points
                                  </div>
                                  <div className="flex items-baseline gap-2">
                                    <div className={`text-4xl lg:text-5xl font-black bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent`}>
                                      {loadingUser ? "..." : points || 0}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                                    Your Rank
                                  </span>
                                  <button
                                    onClick={() => setShowLeaderboard(!showLeaderboard)}
                                    className={`p-2 rounded-xl ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-all active:scale-95`}
                                    title="View Leaderboard"
                                  >
                                    <FaTrophy className="text-yellow-500 text-3xl" />
                                  </button>
                                  <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"} mt-1`}>
                                    Click to view
                                  </span>
                                  <span className={`text-lg font-bold ${isDark ? "text-gray-300" : "text-slate-700"} mt-1`}>
                                    #{userRank}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Leaderboard Section */}
                              {showLeaderboard && (
                                <div className={`p-4 lg:p-6 rounded-2xl ${isDark ? "bg-gray-800/80 border border-gray-700" : "bg-white border border-slate-200"} shadow-lg`}>
                                  <div className="flex items-center justify-between mb-4">
                                    <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Top Recyclers</h3>
                                    <FaUsers className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                                  </div>
                                  
                                  {loadingLeaderboard ? (
                                    <div className="flex justify-center py-4">
                                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {leaderboardData.map((user) => (
                                        <div 
                                          key={user.id} 
                                          onClick={() => handleUserClick(user, user.rank)}
                                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${user.isCurrentUser ? (isDark ? 'bg-emerald-800/30' : 'bg-emerald-100') : ''}`}
                                        >
                                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                            user.rank === 1 ? 'bg-yellow-500 text-white' : 
                                            user.rank === 2 ? 'bg-gray-400 text-white' : 
                                            user.rank === 3 ? 'bg-amber-600 text-white' : 
                                            isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                                          }`}>
                                            {user.rank}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                              {user.username}
                                              {user.isCurrentUser && (
                                                <span className={`ml-1 text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}> (You)</span>
                                              )}
                                            </p>
                                          </div>
                                          <span className={`text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                            {user.points}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                      <div className="xl:col-span-3 space-y-6">
                        <div className={`rounded-2xl overflow-hidden shadow-xl border ${isDark ? "bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-700/50" : "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200"} h-full`}>
                          <div className="p-6 lg:p-8">
                            <h3 className={`text-xl lg:text-2xl font-bold mb-6 ${isDark ? "text-purple-200" : "text-purple-800"}`}>
                              Calendar
                            </h3>
                            <DashboardCalendar
                              selectedDate={selectedDate}
                              setSelectedDate={setSelectedDate}
                              isDark={isDark}
                              schedules={allSchedules}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="xl:col-span-2 space-y-6">
                        <div className={`rounded-2xl overflow-hidden shadow-xl border ${isDark ? "bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-700/50" : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"}`}>
                          <div className="p-6 lg:p-8">
                            <div className="flex items-center gap-3 mb-6">
                              <div>
                                <h3 className={`text-xl lg:text-2xl font-bold ${isDark ? "text-blue-200" : "text-blue-800"}`}>
                                  Garbage Collection
                                </h3>
                                <p className={`text-sm ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                                  Don't miss your garbage collection day
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
                              </div>
                            )}
                          </div>
                        </div>

                        {nextSubmission && (
                          <div className={`rounded-2xl overflow-hidden shadow-xl border ${isDark ? "bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-700/50" : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"}`}>
                            <div className="p-6 lg:p-8">
                              <div className="flex items-center gap-3 mb-6">
                                
                                <div>
                                  <h3 className={`text-xl lg:text-2xl font-bold ${isDark ? "text-green-200" : "text-green-800"}`}>
                                    Recyclable Waste Submission
                                  </h3>
                                  <p className={`text-sm ${isDark ? "text-green-400" : "text-green-600"}`}>
                                    Drop off your recyclable and sorted waste
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-6">
                                <div className={`p-6 rounded-xl ${isDark ? "bg-gray-800/50" : "bg-white/80"} backdrop-blur-sm border ${isDark ? "border-gray-700" : "border-green-200"}`}>
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                      <div className={`text-4xl lg:text-5xl font-black mb-3 ${isDark ? "text-white" : "text-green-900"}`}>
                                        {nextSubmission.date.toLocaleDateString('en-US', { weekday: 'long' })}
                                      </div>
                                      <div className={`text-2xl font-bold mb-4 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                                        {nextSubmission.date.toLocaleDateString('en-US', {
                                          month: 'long',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </div>
                                    </div>
                                    {isToday(nextSubmission.date) && (
                                      <div className="animate-pulse">
                                        <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold rounded-full shadow-lg">
                                          <span className="w-2 h-2 bg-white rounded-full mr-2 animate-ping"></span>
                                          TODAY
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className={`flex items-center gap-3 p-4 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-green-50"}`}>
                                      
                                      <div>
                                        <div className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                                          Operating Hours
                                        </div>
                                        <div className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                                          {formatTimeRange(nextSubmission.schedule.startTime, nextSubmission.schedule.endTime)}
                                        </div>
                                      </div>
                                    </div>

                                    {(nextSubmission.schedule.area || nextSubmission.schedule.barangay) && (
                                      <div className={`flex items-center gap-3 p-4 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-green-50"}`}>
                                        
                                        <div className="flex-1 min-w-0">
                                          <div className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                                            Location
                                          </div>
                                          <div className={`text-sm font-bold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                                            {nextSubmission.schedule.area}
                                            {nextSubmission.schedule.barangay && `, ${nextSubmission.schedule.barangay}`}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-6">
                        {/* Web: Added Blockchain Status Card */}
                        <div 
                          onClick={() => setActiveTab('ledger')}
                          className={`rounded-2xl overflow-hidden shadow-xl border cursor-pointer hover:shadow-2xl transition-all group ${isDark ? "bg-gradient-to-br from-indigo-900/50 to-indigo-800/30 border-indigo-700" : "bg-gradient-to-br from-indigo-50 to-white border-indigo-100"}`}
                        >
                           <div className="p-6">
                              <div className="flex items-center justify-between mb-2">
                                 <div className={`p-3 rounded-xl ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                                    <FaCubes className="w-6 h-6" />
                                 </div>
                                 
                              </div>
                              <h3 className={`text-lg font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                                 System Integrity
                              </h3>
                              <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                 Verify all transactions on ledger.
                              </p>
                              <div className={`flex items-center text-sm font-medium ${isDark ? 'text-indigo-400 group-hover:text-indigo-300' : 'text-indigo-600 group-hover:text-indigo-700'}`}>
                                 View Public Ledger <FaLink className="ml-2 w-3 h-3" />
                              </div>
                           </div>
                        </div>

                        {recentActivity.length > 0 && (
                          <div className={`rounded-2xl overflow-hidden shadow-xl border ${isDark ? "bg-gray-800/80 border-gray-700" : "bg-white border-gray-200"}`}>
                            <div className="p-6 lg:p-8">
                              <h3 className={`text-xl lg:text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>
                                Recent Activity
                              </h3>
                              <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                                {recentActivity.map((activity) => (
                                  <div key={activity.id} className="py-4 flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl bg-${activity.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                                      <activity.icon className={`text-${activity.color}-500 text-lg`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>
                                        {activity.description}
                                      </p>
                                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {formatRelativeTime(activity.timestamp)}
                                      </p>
                                    </div>
                                    <span className={`text-sm font-bold ${activity.points > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                      {activity.points > 0 ? '+' : ''}{activity.points}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}
                
                {activeTab === "submit" && <SubmitWaste />}
                {activeTab === "rewards" && <Rewards />}
                {activeTab === "report" && <Forum sidebarOpen={sidebarOpen} />}
                {activeTab === "leaderboard" && <Leaderboard />}
                {activeTab === "transactions" && <Transactions />}
                {activeTab === "ledger" && <PublicVerification />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={closeModal}
        >
          <div
            className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-slideUp ${
              isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeModal}
              className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                isDark
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              <FiX className="w-5 h-5" />
            </button>

            {modalLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mb-4"></div>
                <p className={`text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>Loading profile...</p>
              </div>
            ) : selectedUser ? (
              <>
                {/* Header Section */}
                <div className={`p-8 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Profile Picture */}
                    <div className="relative">
                      {selectedUser.profileUrl ? (
                        <img
                          src={selectedUser.profileUrl}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-white shadow-xl">
                          <FiUser size={36} className="text-gray-600" />
                        </div>
                      )}
                      {/* Rank Badge */}
                      <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                        selectedUser.rank === 1
                          ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900"
                          : selectedUser.rank === 2
                          ? "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900"
                          : selectedUser.rank === 3
                          ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white"
                          : isDark
                          ? "bg-gray-700 text-gray-300"
                          : "bg-gray-200 text-gray-700"
                      }`}>
                        #{selectedUser.rank}
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 text-center sm:text-left">
                      <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                        {selectedUser.username || selectedUser.email || 'Anonymous'}
                      </h2>
                      <p className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {selectedUser.email}
                      </p>
                      <div className="flex items-center justify-center sm:justify-start gap-4">
                        <div className={`px-4 py-2 rounded-xl ${isDark ? "bg-gray-700" : "bg-emerald-50"}`}>
                          <div className={`text-2xl font-bold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                            {(selectedUser.totalPoints || 0).toLocaleString()}
                          </div>
                          <div className={`text-xs ${isDark ? "text-emerald-500" : "text-emerald-600"}`}>Points</div>
                        </div>
                        <div className={`px-4 py-2 rounded-xl ${isDark ? "bg-gray-700" : "bg-blue-50"}`}>
                          <div className={`text-2xl font-bold ${isDark ? "text-blue-400" : "text-blue-700"}`}>
                            #{selectedUser.rank}
                          </div>
                          <div className={`text-xs ${isDark ? "text-blue-500" : "text-blue-600"}`}>Rank</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Achievements Section */}
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-xl font-bold flex items-center ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                      <FaTrophy className="mr-2 text-2xl" /> Achievements
                    </h3>
                    <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {selectedUser.achievements?.filter(a => a.unlocked).length || 0} of {selectedUser.achievements?.length || 0} unlocked
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedUser.achievements?.map((achievement, index) => (
                      <div
                        key={index}
                        className={`rounded-xl p-4 border transition-all duration-300 relative ${
                          achievement.unlocked
                            ? `${
                                isDark ? "bg-yellow-800/20 border-yellow-600/30" : "bg-yellow-50 border-amber-200"
                              }`
                            : `${
                                isDark 
                                  ? "bg-gray-700/30 border-gray-600/30 opacity-60" 
                                  : "bg-gray-50 border-gray-200 opacity-70"
                              }`
                        }`}
                      >
                        {/* Unlocked indicator */}
                        {achievement.unlocked && (
                          <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                            <FaCheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}

                        <div className="flex items-start space-x-3">
                          <div 
                            className={`text-3xl flex-shrink-0 ${
                              achievement.unlocked ? "" : "grayscale opacity-40"
                            }`}
                          >
                            {achievement.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 
                              className={`font-bold text-base mb-1 ${
                                achievement.unlocked 
                                  ? (isDark ? "text-yellow-300" : "text-amber-800")
                                  : (isDark ? "text-gray-400" : "text-gray-600")
                              }`}
                            >
                              {achievement.name}
                            </h4>
                            <p 
                              className={`text-xs ${
                                achievement.unlocked 
                                  ? (isDark ? "text-yellow-400" : "text-amber-600")
                                  : (isDark ? "text-gray-500" : "text-gray-500")
                              }`}
                            >
                              {achievement.description}
                            </p>

                            {/* Progress for locked achievements */}
                            {!achievement.unlocked && (
                              <div className="mt-2">
                                <div className={`w-full rounded-full h-1 ${isDark ? "bg-gray-600" : "bg-gray-200"}`}>
                                  <div
                                    className="bg-gradient-to-r from-blue-400 to-blue-500 h-1 rounded-full transition-all duration-500"
                                    style={{ 
                                      width: `${Math.min(((selectedUser.totalPoints || 0) / achievement.requiredPoints) * 100, 100)}%` 
                                    }}
                                  ></div>
                                </div>
                                <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                  {achievement.requiredPoints - (selectedUser.totalPoints || 0)} points to unlock
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Motivational Message */}
                  <div className={`mt-6 p-4 rounded-xl ${isDark ? "bg-blue-900/20 border border-blue-700/30" : "bg-blue-50 border border-blue-200"}`}>
                    <p className={`text-center text-sm ${isDark ? "text-blue-300" : "text-blue-800"}`}>
                      {selectedUser.achievements?.filter(a => a.unlocked).length === selectedUser.achievements?.length
                        ? "🎉 All achievements unlocked! You're an eco champion!"
                        : selectedUser.achievements?.filter(a => a.unlocked).length > 0
                        ? "Keep going! More achievements await!"
                        : "Start your eco journey to unlock achievements!"}
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

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

        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
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
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
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
          .animate-fade-in-up,
          .animate-slideUp {
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
          /* .backdrop-blur-xl {
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
          } */
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