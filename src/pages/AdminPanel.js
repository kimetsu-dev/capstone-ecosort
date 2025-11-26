import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import ScheduleManager from "./AdminPanel/ScheduleManager";
import { FiUser,  FiLogOut } from "react-icons/fi";
import { 
  FiMenu, 
  FiX,
  FiHome, 
  FiFileText, 
  FiGift, 
  FiUsers, 
  FiCreditCard, 
  FiTag, 
  FiAlertTriangle, 
  FiTrash,
  FiCalendar,
  FiLink // Imported for Blockchain Ledger Icon
} from "react-icons/fi";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  deleteDoc,
  query,
  orderBy,
  where,
} from "firebase/firestore";


import WasteTypesManager from "./AdminPanel/WasteTypesManager";
import RewardsTab from "./AdminPanel/RewardsTab";
import ReportsTab from "./AdminPanel/ReportsTab";
import UsersTab from "./AdminPanel/UsersTab";
import TransactionsTab from "./AdminPanel/TransactionsTab";


import PointsModal from "./AdminPanel/Modals/PointsModal";
import RewardModal from "./AdminPanel/Modals/RewardModal";
import RewardPreview from "./AdminPanel/Modals/RewardPreview";
import RedemptionsTab from "./AdminPanel/RedemptionsTab";
import SubmissionsTab from "./AdminPanel/SubmissionsTab";
import LedgerTab from "./AdminPanel/LedgerTab";
import BlockchainTab from './AdminPanel/BlockchainTab'; 

import { formatTimestamp, getStatusBadge } from "../utils/helpers";
import { useTheme } from "../contexts/ThemeContext";

export default function AdminPanel() {
  const { isDark } = useTheme() || {};
  const [user, loadingAuth] = useAuthState(auth);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "", visible: false });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [profile, setProfile] = useState({ displayName: "", phone: "", photoURL: "" });

  const [pointsModal, setPointsModal] = useState({ visible: false, user: null });
  const [rewardModal, setRewardModal] = useState({ visible: false, reward: null, isEdit: false });
  const [rewardPreview, setRewardPreview] = useState({ visible: false, reward: null });
  
  const [rewardForm, setRewardForm] = useState({
    name: "",
    description: "",
    cost: "",
    stock: "",
    category: "food",
    imageFile: null,
    imagePreview: null,
    imageUrl: null,
  });

  const [pointsForm, setPointsForm] = useState({ amount: "", reason: "" });
  const [pointsPerKiloMap, setPointsPerKiloMap] = useState({});

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const userDoc = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDoc);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    };
    fetchProfile();
    
    const q = query(collection(db, "waste_types"), orderBy("name"));
    const unsubscribeWasteTypes = onSnapshot(q, (snapshot) => {
      const map = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.name) {
          map[data.name] = data.pointsPerKilo ?? 0;
        }
      });
      setPointsPerKiloMap(map);
    });

    return () => unsubscribeWasteTypes();
  }, [user]);

  const showToast = useCallback((message, type) => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 4000);
  }, []);



  const deleteReward = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reward?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "rewards", id));
      showToast("Reward deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting reward:", error);
      showToast("Failed to delete reward", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingAuth && !user) {
      navigate("/login");
    }
  }, [user, loadingAuth, navigate]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const usersRef = collection(db, "users");
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeTx = onSnapshot(
      query(collection(db, "point_transactions"), orderBy("timestamp", "desc")),
      (snapshot) => {
        setTransactions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    );

    const reportsRef = collection(db, "violation_reports");
    const unsubscribeReports = onSnapshot(
      reportsRef,
      (snapshot) => {
        setReports(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            submittedAt: doc.data().submittedAt?.toDate ? doc.data().submittedAt.toDate() : new Date(),
          }))
        );
        setLoading(false);
      },
      (error) => {
        console.error("Failed to fetch reports:", error);
        setLoading(false);
      }
    );

    const rewardsRef = collection(db, "rewards");
    const unsubscribeRewards = onSnapshot(rewardsRef, (snapshot) => {
      setRewards(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const pendingQuery = query(collection(db, "waste_submissions"), where("status", "==", "pending"));
    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      setPendingSubmissions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const redemptionsRef = query(collection(db, "redemptions"), orderBy("redeemedAt", "desc"));
    const unsubscribeRedemptions = onSnapshot(redemptionsRef, (snapshot) => {
      setRedemptions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTx();
      unsubscribeReports();
      unsubscribeRewards();
      unsubscribePending();
      unsubscribeRedemptions();
    };
  }, [user]);

  const reportsPendingCount = reports.filter((report) => report.status === "pending").length;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      showToast("Failed to sign out", "error");
    }
  };

  const filteredRewards = rewards.filter((reward) => {
    const matchesCategory = categoryFilter === "all" || reward.category === categoryFilter;

    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "in-stock" && reward.stock > 10) ||
      (stockFilter === "low-stock" && reward.stock > 0 && reward.stock <= 10) ||
      (stockFilter === "out-of-stock" && reward.stock <= 0);

    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      reward.name.toLowerCase().includes(lowerSearch) || reward.description.toLowerCase().includes(lowerSearch);

    return matchesCategory && matchesStock && matchesSearch;
  });

  const tabConfig = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: FiHome,
    description: "Overview and statistics",
  },
  {
    id: "submissions",
    label: "Submissions",
    icon: FiFileText,
    badge: pendingSubmissions.length,
    description: "Manage waste submissions",
  },
  {
    id: "rewards",
    label: "Rewards",
    icon: FiGift,
    description: "Manage reward items",
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: FiCreditCard,
    description: "Point transactions",
  },
  {
    id: "redemptions",
    label: "Redemptions",
    icon: FiTag,
    badge: redemptions.filter((r) => r.status === "pending").length,
    description: "Reward redemptions",
  },
    {
    id: "reports",
    label: "Reports",
    icon: FiAlertTriangle,
    badge: reports.filter((r) => r.status === "pending").length,
    description: "Violation reports",
  },
  {
    id: "users",
    label: "Users",
    icon: FiUsers,
    description: "User management",
  },
 
  {
    id: "wasteTypes",
    label: "Waste Types",
    icon: FiTrash, 
    description: "Configure waste categories",
  },
  {
    id: "schedules",
    label: "Schedules",
    icon: FiCalendar,
    description: "Manage collection schedules",
  },
   // Blockchain Ledger Tab
  {
    id: "ledger",
    label: "Ledger",
    icon: FiLink,
    description: "Immutable Audit Trail",
  },
  // NEW: Blockchain Verification Tab
  {
    id: "blockchain",
    label: "Blockchain",
    icon: "⛓️", // Using emoji for chain icon
    description: "Verify & Manage Chain",
  },
];

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200"
          : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-900"
      }`}
    >
      {/* Mobile Header */}
      <header
        className={`lg:hidden backdrop-blur-md sticky top-0 z-40 border-b ${
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
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg">
                  A
                </div>
                <div className="flex flex-col">
                  <h1
                    className={`text-base font-bold bg-gradient-to-r ${
                      isDark ? "from-gray-100 to-gray-400" : "from-slate-800 to-slate-600"
                    } bg-clip-text text-transparent`}
                  >
                    Admin Panel
                  </h1>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className="flex items-center space-x-2 cursor-pointer group"
                onClick={() => navigate("/adminprofile")}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center group-hover:shadow-md transition-all">
                  <FiUser className="text-indigo-600 w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
<aside
  className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
    sidebarOpen ? "translate-x-0" : "-translate-x-full"
  } ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-r flex flex-col h-screen`}
>
  {/* Sidebar Header */}
  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
        A
      </div>
      <div>
        <h2 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>Admin Panel</h2>
        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>ECOSORT</p>
      </div>
    </div>
    <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close sidebar">
      <FiX className="w-5 h-5" />
    </button>
  </div>

  {/* Navigation - scrollable with scrollbar */}
  <nav
    className="flex-1 overflow-y-auto p-4 space-y-2"
    style={{ scrollbarWidth: "thin" }}
    aria-label="Sidebar navigation"
  >
    {tabConfig.map((tab) => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;
      const isIconString = typeof tab.icon === 'string';

      return (
        <button
          key={tab.id}
          onClick={() => {
            setActiveTab(tab.id);
            setSidebarOpen(false);
          }}
          className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
            isActive
              ? `${isDark 
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25" 
                  : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/25"
                } transform scale-[1.02]`
              : `${isDark 
                  ? "text-gray-300 hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-600 hover:text-white" 
                  : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"
                } hover:transform hover:scale-[1.01] border border-transparent hover:border-gray-200 dark:hover:border-gray-600`
          }`}
        >
          {isActive && (
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-20"></div>
          )}
          
          {/* Icon - handle both React Icons and emoji */}
          {isIconString ? (
            <span className={`text-lg ${isActive ? "text-white" : ""}`}>{tab.icon}</span>
          ) : (
            <Icon className={`w-5 h-5 ${isActive ? "text-white" : ""} transition-colors`} aria-hidden="true" />
          )}
          
          <span className="font-medium flex-1 text-left">{tab.label}</span>
          
          {/* NEW badge for blockchain tab */}
          {tab.isNew && !isActive && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-500 text-white animate-pulse">
              NEW
            </span>
          )}
          
          {/* Regular notification badges */}
          {tab.badge > 0 && (
            <span
              className={`px-2 py-1 text-xs rounded-full font-semibold transition-all ${
                isActive 
                  ? "bg-white/20 text-white backdrop-blur-sm" 
                  : "bg-red-500 text-white shadow-sm"
              }`}
              aria-label={`${tab.badge} new notifications`}
            >
              {tab.badge}
            </span>
          )}
        </button>
      );
    })}
  </nav>

{/* Sidebar Footer */}
<div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
  <div
    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer group transition-colors ${
      isDark
        ? "hover:bg-gray-700 text-gray-300 hover:text-white"
        : "hover:bg-slate-50 text-slate-600 hover:text-slate-800"
    }`}
    onClick={() => navigate("/adminprofile")}
    title="Admin Profile"
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate("/adminprofile");
      }
    }}
    aria-label="Go to Admin Profile"
  >
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center group-hover:shadow-md transition-all">
      <FiUser className="text-indigo-600 w-4 h-4" aria-hidden="true" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium truncate">{profile.displayName || "Admin Profile"}</p>
      <p className={`text-xs truncate ${isDark ? "text-gray-400" : "text-slate-500"}`}>{user?.email || "admin@ecosort.com"}</p>
    </div>
  </div>
  <button
    onClick={handleLogout}
    className={`mt-3 w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg transition-all hover:transform hover:scale-105 ${
      isDark 
        ? "text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30" 
        : "text-gray-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
    }`}
    aria-label="Sign out"
  >
    <FiLogOut className="w-5 h-5" aria-hidden="true" />
    <span className="font-medium">Logout</span>
  </button>
</div>
</aside>


        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0 lg:ml-64">
          

            {/* Content Container */}
            <div
              className={`rounded-xl shadow-sm border ${
                isDark ? "bg-gray-800 border-gray-600" : "bg-white border-slate-200/50"
              }`}
            >
              <div className="p-6">
             {/* Dashboard Tab */}
                {activeTab === "dashboard" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                        Dashboard Overview
                      </h2>
                      
                    </div>

                    {/* Action Required Cards */}
                    <div>
                      <h3 className={`text-lg font-semibold mb-3 ${isDark ? "text-gray-200" : "text-slate-700"}`}>
                        Requires Attention
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                          onClick={() => setActiveTab("submissions")}
                          className={`p-5 rounded-xl text-left transition-all transform hover:scale-105 ${
                            pendingSubmissions.length > 0
                              ? "bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 shadow-lg hover:shadow-xl"
                              : isDark
                              ? "bg-gray-700/50 border border-gray-600"
                              : "bg-gray-50 border border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <FiFileText className={`w-6 h-6 ${pendingSubmissions.length > 0 ? "text-orange-600" : isDark ? "text-gray-400" : "text-gray-400"}`} />
                            {pendingSubmissions.length > 0 && (
                              <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                                ACTION
                              </span>
                            )}
                          </div>
                          <div className={`text-3xl font-bold mb-1 ${pendingSubmissions.length > 0 ? "text-orange-600" : isDark ? "text-gray-400" : "text-gray-400"}`}>
                            {pendingSubmissions.length}
                          </div>
                          <div className={`text-sm font-medium ${pendingSubmissions.length > 0 ? "text-orange-700" : isDark ? "text-gray-500" : "text-gray-500"}`}>
                            Pending Submissions
                          </div>
                        </button>

                        <button
                          onClick={() => setActiveTab("redemptions")}
                          className={`p-5 rounded-xl text-left transition-all transform hover:scale-105 ${
                            redemptions.filter((r) => r.status === "pending").length > 0
                              ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-lg hover:shadow-xl"
                              : isDark
                              ? "bg-gray-700/50 border border-gray-600"
                              : "bg-gray-50 border border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <FiTag className={`w-6 h-6 ${redemptions.filter((r) => r.status === "pending").length > 0 ? "text-blue-600" : isDark ? "text-gray-400" : "text-gray-400"}`} />
                            {redemptions.filter((r) => r.status === "pending").length > 0 && (
                              <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                                ACTION
                              </span>
                            )}
                          </div>
                          <div className={`text-3xl font-bold mb-1 ${redemptions.filter((r) => r.status === "pending").length > 0 ? "text-blue-600" : isDark ? "text-gray-400" : "text-gray-400"}`}>
                            {redemptions.filter((r) => r.status === "pending").length}
                          </div>
                          <div className={`text-sm font-medium ${redemptions.filter((r) => r.status === "pending").length > 0 ? "text-blue-700" : isDark ? "text-gray-500" : "text-gray-500"}`}>
                            Pending Redemptions
                          </div>
                        </button>

                        <button
                          onClick={() => setActiveTab("reports")}
                          className={`p-5 rounded-xl text-left transition-all transform hover:scale-105 ${
                            reportsPendingCount > 0
                              ? "bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 shadow-lg hover:shadow-xl"
                              : isDark
                              ? "bg-gray-700/50 border border-gray-600"
                              : "bg-gray-50 border border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <FiAlertTriangle className={`w-6 h-6 ${reportsPendingCount > 0 ? "text-red-600" : isDark ? "text-gray-400" : "text-gray-400"}`} />
                            {reportsPendingCount > 0 && (
                              <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                                ACTION
                              </span>
                            )}
                          </div>
                          <div className={`text-3xl font-bold mb-1 ${reportsPendingCount > 0 ? "text-red-600" : isDark ? "text-gray-400" : "text-gray-400"}`}>
                            {reportsPendingCount}
                          </div>
                          <div className={`text-sm font-medium ${reportsPendingCount > 0 ? "text-red-700" : isDark ? "text-gray-500" : "text-gray-500"}`}>
                            Pending Reports
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* System Overview */}
                    <div>
                      <h3 className={`text-lg font-semibold mb-3 ${isDark ? "text-gray-200" : "text-slate-700"}`}>
                        System Overview
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={`p-5 rounded-xl ${isDark ? "bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600" : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"} shadow-sm`}>
                          <FiUsers className={`w-6 h-6 mb-3 ${isDark ? "text-indigo-400" : "text-indigo-600"}`} />
                          <div className={`text-3xl font-bold mb-1 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                            {users.length}
                          </div>
                          <div className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                            Total Users
                          </div>
                        </div>

                        <div className={`p-5 rounded-xl ${isDark ? "bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600" : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"} shadow-sm`}>
                          <FiGift className={`w-6 h-6 mb-3 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
                          <div className={`text-3xl font-bold mb-1 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                            {rewards.length}
                          </div>
                          <div className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                            Total Rewards
                          </div>
                        </div>

                        <div className={`p-5 rounded-xl ${isDark ? "bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600" : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"} shadow-sm`}>
                          <FiCreditCard className={`w-6 h-6 mb-3 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                          <div className={`text-3xl font-bold mb-1 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                            {transactions.length}
                          </div>
                          <div className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                            Transactions
                          </div>
                        </div>

                        <div className={`p-5 rounded-xl ${isDark ? "bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600" : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"} shadow-sm`}>
                          <FiTag className={`w-6 h-6 mb-3 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
                          <div className={`text-3xl font-bold mb-1 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                            {redemptions.length}
                          </div>
                          <div className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                            Total Redemptions
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inventory Status */}
                    <div>
                      <h3 className={`text-lg font-semibold mb-3 ${isDark ? "text-gray-200" : "text-slate-700"}`}>
                        Inventory Status
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-5 rounded-xl ${isDark ? "bg-gradient-to-br from-emerald-900/30 to-emerald-800/30 border border-emerald-700/50" : "bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200"}`}>
                          <div className={`text-2xl font-bold mb-1 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                            {rewards.filter(r => r.stock > 5).length}
                          </div>
                          <div className={`text-sm ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                            In Stock (6+)
                          </div>
                        </div>

                        <div className={`p-5 rounded-xl ${isDark ? "bg-gradient-to-br from-amber-900/30 to-amber-800/30 border border-amber-700/50" : "bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200"}`}>
                          <div className={`text-2xl font-bold mb-1 ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                            {rewards.filter(r => r.stock > 0 && r.stock <= 5).length}
                          </div>
                          <div className={`text-sm ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                            Low Stock (1-5)
                          </div>
                        </div>

                        <div className={`p-5 rounded-xl ${isDark ? "bg-gradient-to-br from-red-900/30 to-red-800/30 border border-red-700/50" : "bg-gradient-to-br from-red-50 to-rose-50 border border-red-200"}`}>
                          <div className={`text-2xl font-bold mb-1 ${isDark ? "text-red-400" : "text-red-600"}`}>
                            {rewards.filter(r => r.stock === 0).length}
                          </div>
                          <div className={`text-sm ${isDark ? "text-red-300" : "text-red-700"}`}>
                            Out of Stock
                          </div>
                        </div>
                      </div>
                    </div>

                   
                    {/* Recent Activity */}
                    <div>
                      <h3 className={`text-lg font-semibold mb-3 ${isDark ? "text-gray-200" : "text-slate-700"}`}>
                        Recent Activity
                      </h3>
                      <div className={`rounded-xl overflow-hidden ${isDark ? "bg-gray-700/50 border border-gray-600" : "bg-white border border-gray-200"}`}>
                        {transactions.slice(0, 5).map((tx, idx) => {
                          const user = users.find(u => u.id === tx.userId);
                          return (
                            <div 
                              key={tx.id} 
                              className={`p-4 flex items-center justify-between ${
                                idx !== 0 ? (isDark ? "border-t border-gray-600" : "border-t border-gray-100") : ""
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  tx.type === "earn" 
                                    ? "bg-emerald-100 text-emerald-600" 
                                    : tx.type === "redeem" 
                                    ? "bg-purple-100 text-purple-600"
                                    : "bg-blue-100 text-blue-600"
                                }`}>
                                  {tx.type === "earn" ? "+" : tx.type === "redeem" ? "🎁" : "•"}
                                </div>
                                <div>
                                  <div className={`font-medium ${isDark ? "text-gray-200" : "text-slate-800"}`}>
                                    {user?.displayName || "Unknown User"}
                                  </div>
                                  <div className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                                    {tx.reason || tx.type}
                                  </div>
                                </div>
                              </div>
                              <div className={`text-right`}>
                                <div className={`font-bold ${
                                  tx.type === "earn" 
                                    ? "text-emerald-600" 
                                    : tx.type === "redeem" 
                                    ? "text-purple-600"
                                    : "text-blue-600"
                                }`}>
                                  {tx.type === "earn" ? "+" : tx.type === "redeem" ? "-" : ""}{tx.amount} pts
                                </div>
                                <div className={`text-xs ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                                  {formatTimestamp(tx.timestamp)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {transactions.length === 0 && (
                          <div className={`p-8 text-center ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                            No recent transactions
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Waste Types Tab */}
                {activeTab === "wasteTypes" && (
                  <WasteTypesManager isDark={isDark} />
                )}

                {activeTab === "submissions" && (
                  <SubmissionsTab
                    pendingSubmissions={pendingSubmissions}
                    setPendingSubmissions={setPendingSubmissions}
                    pointsPerKiloMap={pointsPerKiloMap}
                    users={users}
                    loading={loading}
                    setLoading={setLoading}
                    showToast={showToast}
                    isDark={isDark}
                  />
                )}

                {/* Schedules Tab */}
                {activeTab === "schedules" && (
                  <ScheduleManager isDark={isDark} showToast={showToast} />
                )}

                {/* Other Tab Components */}
                {activeTab === "rewards" && (
                  <RewardsTab
                    rewards={rewards}
                    filteredRewards={filteredRewards}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    categoryFilter={categoryFilter}
                    setCategoryFilter={setCategoryFilter}
                    stockFilter={stockFilter}
                    setStockFilter={setStockFilter}
                    setRewardModal={setRewardModal}
                    setRewardPreview={setRewardPreview}
                    rewardForm={rewardForm}
                    setRewardForm={setRewardForm}
                    deleteReward={deleteReward}
                    loading={loading}
                    showToast={showToast}
                    isDark={isDark}
                  />
                )}

                {activeTab === "reports" && (
                  <ReportsTab
                    reports={reports}
                    setReports={setReports}
                    formatTimestamp={formatTimestamp}
                    getStatusBadge={getStatusBadge}
                    showToast={showToast}
                    isDark={isDark}
                  />
                )}

                {activeTab === "users" && (
                  <UsersTab 
                    users={users} 
                    setUsers={setUsers} 
                    setPointsModal={setPointsModal} 
                    isDark={isDark} 
                  />
                )}

                {activeTab === "transactions" && (
                  <TransactionsTab 
                    transactions={transactions} 
                    users={users} 
                    formatTimestamp={formatTimestamp} 
                    showSigns={true} 
                    isDark={isDark} 
                  />
                )}

                 {/* Redemptions Tab */}
                {activeTab === "redemptions" && (
                  <RedemptionsTab
                    redemptions={redemptions}
                    users={users}
                    rewards={rewards}
                    showToast={showToast}
                    isDark={isDark}
                  />
                )}

                {/* Blockchain Ledger Tab */}
                {activeTab === "ledger" && (
                  <LedgerTab />
                )}

                {/* NEW: Blockchain Verification Tab */}
                {activeTab === "blockchain" && (
                  <BlockchainTab />
                )}
              </div>
            </div>
          </div>

          {/* Modals */}
          {pointsModal.visible && (
            <PointsModal
              pointsModal={pointsModal}
              setPointsModal={setPointsModal}
              pointsForm={pointsForm}
              setPointsForm={setPointsForm}
              users={users}
              setUsers={setUsers}
              transactions={transactions}
              setTransactions={setTransactions}
              showToast={showToast}
              isDark={isDark}
            />
          )}

          {rewardModal.visible && (
            <RewardModal
              rewardModal={rewardModal}
              setRewardModal={setRewardModal}
              rewardForm={rewardForm}
              setRewardForm={setRewardForm}
              loading={loading}
              setLoading={setLoading}
              showToast={showToast}
              isDark={isDark}
            />
          )}

          {rewardPreview.visible && (
            <RewardPreview
              rewardPreview={rewardPreview}
              setRewardPreview={setRewardPreview}
              setRewardModal={setRewardModal}
              setRewardForm={setRewardForm}
              isDark={isDark}
            />
          )}

          {/* Toast Notification */}
          {toast.visible && (
            <div
              className={`fixed top-4 right-4 px-6 py-4 rounded-2xl text-white shadow-2xl transition-all duration-300 z-50 backdrop-blur-sm max-w-sm ${
                toast.visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
              } ${
                toast.type === "success"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                  : toast.type === "error"
                  ? "bg-gradient-to-r from-red-500 to-rose-600"
                  : "bg-gradient-to-r from-blue-500 to-indigo-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-white/20">
                  {toast.type === "success" && "✓"}
                  {toast.type === "error" && "✗"}
                  {toast.type === "info" && "i"}
                </div>
                <span className="font-medium">{toast.message}</span>
              </div>
            </div>
          )}
        </div>
      </div>
  

      
  );
}