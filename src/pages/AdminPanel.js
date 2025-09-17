import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { FiSettings, FiMenu, FiX } from "react-icons/fi";
import Settings from "./Settings";
import ScheduleManager from "./AdminPanel/ScheduleManager";
import { FiUser,  FiLogOut } from "react-icons/fi";
import { 
  FiHome, 
  FiFileText, 
  FiGift, 
  FiUsers, 
  FiCreditCard, 
  FiTag, 
  FiAlertTriangle, 
  FiTrash,
  FiCalendar 
} from "react-icons/fi";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  addDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";


import WasteTypesManager from "./AdminPanel/WasteTypesManager";
import RewardsTab from "./AdminPanel/RewardsTab";
import ReportsTab from "./AdminPanel/ReportsTab";
import UsersTab from "./AdminPanel/UsersTab";
import TransactionsTab from "./AdminPanel/TransactionsTab";

import PointsModal from "./AdminPanel/Modals/PointsModal";
import RewardModal from "./AdminPanel/Modals/RewardModal";
import RewardPreview from "./AdminPanel/Modals/RewardPreview";

import { formatTimestamp, getStatusBadge } from "../utils/helpers";
import { useTheme } from "../contexts/ThemeContext";

async function addNotification(userId, message, type = "submission_status") {
  const notificationsRef = collection(db, "notifications", userId, "userNotifications");
  await addDoc(notificationsRef, {
    type,
    message,
    read: false,
    createdAt: serverTimestamp(),
  });
}

// Generic point transaction creator
async function createPointTransaction({ userId, points, description, type = "points_awarded" }) {
  try {
    await addDoc(collection(db, "point_transactions"), {
      userId,
      points,
      description,
      timestamp: serverTimestamp(),
      type,
    });
  } catch (error) {
    console.error("Failed to create point transaction:", error);
  }
}

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

  const [imageUploadLoading, setImageUploadLoading] = useState(false);
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

  const updateRedemptionStatus = async (redemptionId, newStatus) => {
    try {
      const redemptionRef = doc(db, "redemptions", redemptionId);
      await updateDoc(redemptionRef, {
        status: newStatus,
        ...(newStatus === "claimed" ? { claimedAt: serverTimestamp() } : {}),
        ...(newStatus === "cancelled" ? { cancelledAt: serverTimestamp() } : {}),
      });
      showToast(`Redemption marked as ${newStatus}`, "success");
    } catch (error) {
      console.error("Failed to update redemption status:", error);
      showToast("Failed to update redemption status", "error");
    }
  };

  const markRedemptionClaimed = async (redemption) => {
    if (!redemption) return;

    const reward = rewards.find((r) => r.id === redemption.rewardId);
    const rewardName = reward ? reward.name : "Unknown Reward";
    const redemptionCode = redemption.redemptionCode || "N/A";

    let cost = parseFloat(redemption.pointCost);
    if (isNaN(cost) || cost <= 0) {
      cost = reward ? parseFloat(reward.cost) : 0;
      if (isNaN(cost) || cost <= 0) {
        showToast("Invalid redemption point cost. Cannot deduct points.", "error");
        return;
      }
    }

    try {
      await createPointTransaction({
        userId: redemption.userId,
        points: -cost,
        description: `Redeemed reward: ${rewardName} (Code: ${redemptionCode})`,
        type: "points_redeemed",
      });

      const userRef = doc(db, "users", redemption.userId);
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User does not exist");
        const currentPoints = Number(userSnap.data().totalPoints) || 0;
        const updatedPoints = currentPoints - cost;
        if (updatedPoints < 0) throw new Error("User points cannot be negative");
        transaction.update(userRef, { totalPoints: updatedPoints });
      });

      await updateRedemptionStatus(redemption.id, "claimed");
      showToast(`Redemption claimed and points deducted`, "success");
    } catch (error) {
      console.error("Failed to mark redemption claimed:", error);
      showToast(error.message || "Failed to claim redemption", "error");
    }
  };

  const rejectSubmission = async (submissionId, userId) => {
    setLoading(true);
    try {
      const submissionRef = doc(db, "waste_submissions", submissionId);
      await updateDoc(submissionRef, {
        status: "rejected",
        rejectedAt: serverTimestamp(),
      });

      await addNotification(
        userId,
        "Your waste submission has been rejected. Please review the guidelines and try again."
      );

      setPendingSubmissions((prev) => prev.filter((sub) => sub.id !== submissionId));
      showToast("Submission rejected", "success");
    } catch (error) {
      console.error("Error rejecting submission:", error);
      showToast("Failed to reject submission", "error");
    } finally {
      setLoading(false);
    }
  };

  const confirmSubmission = async (submission) => {
    setLoading(true);
    try {
      const pointsPerKiloForType = pointsPerKiloMap[submission.type] ?? 0;
      const awardedPoints = Number(submission.weight * pointsPerKiloForType) || 0;
      const userRef = doc(db, "users", submission.userId);

      await createPointTransaction({
        userId: submission.userId,
        points: awardedPoints,
        description: `Awarded points for waste submission (ID: ${submission.id})`,
        type: "points_awarded",
      });

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User does not exist");
        const currentPoints = Number(userSnap.data().totalPoints) || 0;
        const updatedPoints = currentPoints + awardedPoints;
        if (updatedPoints < 0) throw new Error("User points cannot be negative");
        transaction.update(userRef, { totalPoints: updatedPoints });
      });

      const submissionRef = doc(db, "waste_submissions", submission.id);
      await updateDoc(submissionRef, {
        status: "confirmed",
        confirmedAt: serverTimestamp(),
      });

      await addNotification(
        submission.userId,
        `Your waste submission has been confirmed! You earned ${awardedPoints.toFixed(2)} points.`
      );

      setPendingSubmissions((prev) => prev.filter((sub) => sub.id !== submission.id));
      showToast("Submission confirmed and points awarded!", "success");
    } catch (error) {
      console.error("Error confirming submission:", error);
      showToast("Failed to confirm submission", "error");
    } finally {
      setLoading(false);
    }
  };

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

  const getUserEmail = (userId) => {
    const u = users.find((x) => x.id === userId);
    return u ? u.email : "Unknown User";
  };

  const getRewardName = (rewardId) => {
    const r = rewards.find((x) => x.id === rewardId);
    return r ? r.name : "Unknown Reward";
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
];


const DashboardContent = () => (
  <div className="space-y-8">
    <div>
      <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
        Dashboard Overview
      </h1>
      <p className={`mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
        Welcome to the EcoSort Management System admin panel.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {pendingSubmissions.length > 0 && (
        <button
          onClick={() => setActiveTab("submissions")}
          className="p-6 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors"
        >
          <div className="text-orange-600 font-semibold text-2xl">{pendingSubmissions.length}</div>
          <div className="text-sm text-orange-700 mt-1">Pending Submissions</div>
        </button>
      )}

      {redemptions.filter((r) => r.status === "pending").length > 0 && (
        <button
          onClick={() => setActiveTab("redemptions")}
          className="p-6 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
        >
          <div className="text-blue-600 font-semibold text-2xl">
            {redemptions.filter((r) => r.status === "pending").length}
          </div>
          <div className="text-sm text-blue-700 mt-1">Pending Redemptions</div>
        </button>
      )}

      {reports.filter((r) => r.status === "pending").length > 0 && (
        <button
          onClick={() => setActiveTab("reports")}
          className="p-6 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
        >
          <div className="text-red-600 font-semibold text-2xl">{reports.filter((r) => r.status === "pending").length}</div>
          <div className="text-sm text-red-700 mt-1">Pending Reports</div>
        </button>
      )}
    </div>

    {/* Other dashboard quick actions can remain as is */}
  </div>
);


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

      return (
        <button
          key={tab.id}
          onClick={() => {
            setActiveTab(tab.id);
            setSidebarOpen(false);
          }}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
            isActive
              ? `${isDark ? "bg-indigo-600 text-white" : "bg-indigo-600 text-white"} shadow-lg`
              : `${isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`
          }`}
        >
          <Icon className={`w-5 h-5 ${isActive ? "text-white" : ""}`} aria-hidden="true" />
          <span className="font-medium">{tab.label}</span>
          {tab.badge > 0 && (
            <span
              className={`ml-auto px-2 py-1 text-xs rounded-full font-medium ${
                isActive ? "bg-white bg-opacity-20 text-white" : "bg-red-500 text-white"
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
    className={`mt-3 w-full flex items-center justify-center space-x-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
      isDark ? "text-gray-400" : "text-gray-500"
    }`}
    aria-label="Sign out"
  >
    <FiLogOut className="w-5 h-5" aria-hidden="true" />
    <span>Logout</span>
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
          <main className="p-4 lg:p-8 space-y-6">

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
                      <p className={`${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {pendingSubmissions.length > 0 && (
                        <button
                          onClick={() => setActiveTab("submissions")}
                          className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-left hover:bg-orange-100 transition-colors"
                        >
                          <div className="text-orange-600 font-semibold text-lg">{pendingSubmissions.length}</div>
                          <div className="text-sm text-orange-700">Pending Submissions</div>
                        </button>
                      )}

                      {redemptions.filter((r) => r.status === "pending").length > 0 && (
                        <button
                          onClick={() => setActiveTab("redemptions")}
                          className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
                        >
                          <div className="text-blue-600 font-semibold text-lg">
                            {redemptions.filter((r) => r.status === "pending").length}
                          </div>
                          <div className="text-sm text-blue-700">Pending Redemptions</div>
                        </button>
                      )}

                      {reportsPendingCount > 0 && (
                        <button
                          onClick={() => setActiveTab("reports")}
                          className="p-4 bg-red-50 border border-red-200 rounded-lg text-left hover:bg-red-100 transition-colors"
                        >
                          <div className="text-red-600 font-semibold text-lg">{reportsPendingCount}</div>
                          <div className="text-sm text-red-700">Pending Reports</div>
                        </button>
                      )}

                     
                    </div>
                  </div>
                )}

                {/* Waste Types Tab */}
                {activeTab === "wasteTypes" && (
                  <WasteTypesManager isDark={isDark} />
                )}

                {/* Submissions Tab */}
                {activeTab === "submissions" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                        Pending Submissions ({pendingSubmissions.length})
                      </h2>
                      <p className={`${isDark ? "text-gray-400" : "text-slate-600"}`}>
                        Review and approve waste submissions from users.
                      </p>
                    </div>

                    {loading && (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="ml-2 text-slate-600">Loading...</span>
                      </div>
                    )}

                    {!loading && pendingSubmissions.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">📝</span>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No pending submissions</h3>
                        <p className="text-slate-500">All submissions have been processed.</p>
                      </div>
                    )}

                    {!loading && pendingSubmissions.length > 0 && (
                      <div className="space-y-4">
                        {pendingSubmissions.map((sub) => (
                          <div
                            key={sub.id}
                            className={`rounded-lg p-4 shadow-sm ${
                              isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-slate-200"
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className={`font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>User:</span>
                                  <div className={`${isDark ? "text-gray-400" : "text-slate-600"} truncate`}>{sub.userId.slice(0, 8)}...</div>
                                </div>
                                <div>
                                  <span className={`font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Type:</span>
                                  <div className={`${isDark ? "text-gray-400" : "text-slate-600"} truncate`}>{sub.type}</div>
                                </div>
                                <div>
                                  <span className={`font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Weight:</span>
                                  <div className={`${isDark ? "text-gray-400" : "text-slate-600"}`}>{sub.weight} kg</div>
                                </div>
                                <div>
                                  <span className={`font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Points:</span>
                                  <div className={`${isDark ? "text-gray-400" : "text-slate-600"}`}>{sub.points}</div>
                                </div>
                              </div>
                              <div className={`${isDark ? "text-gray-400" : "text-slate-600"} text-sm`}>
                                <span className={`font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Submitted:</span>
                                <div className="mt-1">
                                  {sub.submittedAt?.toDate ? sub.submittedAt.toDate().toLocaleString() : "N/A"}
                                </div>
                              </div>
                              <div className="flex space-x-2 pt-2">
                                <button
                                  onClick={() => confirmSubmission(sub)}
                                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium text-sm"
                                  disabled={loading}
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => rejectSubmission(sub.id, sub.userId)}
                                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium text-sm"
                                  disabled={loading}
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                    loading={loading || imageUploadLoading}
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
                  <div className="space-y-6">
                    <div>
                      <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                        Redemptions Management
                      </h2>
                      <p className={`${isDark ? "text-gray-400" : "text-slate-600"}`}>
                        Manage reward redemption requests from users.
                      </p>
                    </div>
                    {redemptions.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">🎫</span>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">
                          No redemption requests
                        </h3>
                        <p className="text-slate-500">No users have redeemed rewards yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {redemptions.map((redemption) => (
                          <div
                            key={redemption.id}
                            className={`p-4 space-y-3 rounded-lg ${
                              isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-slate-200"
                            }`}
                          >
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className={`font-medium uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                                  User
                                </span>
                                <div className={`text-sm truncate mt-1 ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                                  {getUserEmail(redemption.userId)}
                                </div>
                              </div>
                              <div>
                                <span className={`font-medium uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                                  Reward
                                </span>
                                <div className={`text-sm truncate mt-1 ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                                  {getRewardName(redemption.rewardId)}
                                </div>
                              </div>
                              <div>
                                <span className={`font-medium uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                                  Status
                                </span>
                                <div className="mt-1">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      redemption.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : redemption.status === "claimed"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {redemption.status}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <span className={`font-medium uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                                  Code
                                </span>
                                <div className={`text-sm font-mono mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                  {redemption.redemptionCode}
                                </div>
                              </div>
                            </div>
                            {redemption.status === "pending" && (
                              <div className="flex space-x-2 pt-2">
                                <button
                                  onClick={() => markRedemptionClaimed(redemption)}
                                  className="flex-1 px-3 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                                >
                                  Mark Claimed
                                </button>
                                <button
                                  onClick={() => updateRedemptionStatus(redemption.id, "cancelled")}
                                  className="flex-1 px-3 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                loading={loading || imageUploadLoading}
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
          </main>
        </div>
      </div>
    </div>
  );
}