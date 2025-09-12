import { useEffect, useState, useCallback, useMemo } from "react";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  Loader2,
  Coins,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Search,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

export default function Transactions() {
  const navigate = useNavigate();
  const { isDark } = useTheme() || {};
  const [userName, setUserName] = useState("User");
  const [points, setPoints] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [transactions, setTransactions] = useState([]);
  const [redemptions, setRedemptions] = useState([]);

  const [loadingUserData, setLoadingUserData] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("all"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all"); 
  const [sortOrder, setSortOrder] = useState("desc"); 
  const [showPoints, setShowPoints] = useState(true);

  const ArrowLeft = () => (
    <svg
      className={`${isDark ? "text-gray-300" : "text-gray-700"} w-5 h-5`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    else if (hour < 18) return "Good Afternoon";
    else return "Good Evening";
  };

  const categoryIcons = {
    recycling: "♻️",
    transport: "🚶",
    lifestyle: "🌱",
    food: "🥗",
    products: "🧽",
  };

  const categoryColors = {
    recycling: isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-700",
    transport: isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700",
    lifestyle: isDark ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-700",
    food: isDark ? "bg-orange-900/30 text-orange-400" : "bg-orange-100 text-orange-700",
    products: isDark ? "bg-teal-900/30 text-teal-400" : "bg-teal-100 text-teal-700",
  };

  const totalEarned = transactions.reduce((sum, tx) => sum + (tx.points || 0), 0);
  const totalSpent = redemptions.reduce((sum, r) => sum + (r.points || 0), 0);

  // Update current time every second (for greeting and time ago)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch user data (name and points)
  useEffect(() => {
    async function fetchUserData() {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserName(data.username || "User");
          setPoints(data.totalPoints || 0);
        } else {
          setError("User data not found.");
        }
      } catch (err) {
        setError("Failed to load user data.");
        console.error(err);
      } finally {
        setLoadingUserData(false);
      }
    }
    fetchUserData();
  }, [navigate]);

  // Fetch earned transactions ("points_awarded")
  const fetchTransactions = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(
        collection(db, "point_transactions"),
        where("userId", "==", user.uid),
        where("type", "==", "points_awarded"),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => {
        const tx = doc.data();
        return {
          id: doc.id,
          description: tx.description || "Points Earned",
          points: typeof tx.points === "number" ? tx.points : 0,
          timestamp: tx.timestamp?.toDate?.() || new Date(0),
          type: tx.type,
          category: tx.category || "recycling",
        };
      });
      setTransactions(data);
    } catch (err) {
      setError("Failed to load transactions.");
      console.error(err);
    }
  }, []);

  // Fetch redeemed transactions ("points_redeemed")
  const fetchRedemptions = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(
        collection(db, "point_transactions"),
        where("userId", "==", user.uid),
        where("type", "==", "points_redeemed"),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => {
        const tx = doc.data();
        return {
          id: doc.id,
          description: tx.description || "Redeemed reward",
          points: typeof tx.points === "number" ? Math.abs(tx.points) : 0,
          timestamp: tx.timestamp?.toDate?.() || new Date(0),
          type: tx.type,
          category: tx.category || "products",
        };
      });
      setRedemptions(data);
    } catch (err) {
      setError("Failed to load redemptions.");
      console.error(err);
    }
  }, []);

  // Load all transaction types on component mount
  useEffect(() => {
    fetchTransactions();
    fetchRedemptions();
  }, [fetchTransactions, fetchRedemptions]);

  const formatTimeAgo = (timestamp) => {
    const diff = currentTime - timestamp;
    if (diff < 0) return "now";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}d`;
    return timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filter, search, date range, sort transactions for display
  const filteredTransactions = useMemo(() => {
    let data = [];
    if (activeTab === "earned") {
      data = transactions;
    } else if (activeTab === "redeemed") {
      data = redemptions;
    } else {
      data = [
        ...transactions.map((t) => ({ ...t, _type: "earned" })),
        ...redemptions.map((r) => ({ ...r, _type: "redeemed" })),
      ];
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      data = data.filter((t) => t.description.toLowerCase().includes(searchLower));
    }

    if (dateRange !== "all") {
      const now = new Date();
      let compareDate = new Date();
      switch (dateRange) {
        case "today":
          compareDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          compareDate.setDate(now.getDate() - 7);
          break;
        case "month":
          compareDate.setMonth(now.getMonth() - 1);
          break;
        default:
          compareDate = new Date(0);
          break;
      }
      data = data.filter((t) => t.timestamp >= compareDate);
    }

    data.sort((a, b) => {
      const aTime = a.timestamp?.getTime() || 0;
      const bTime = b.timestamp?.getTime() || 0;
      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });

    return data;
  }, [activeTab, transactions, redemptions, searchTerm, dateRange, sortOrder]);

  // Mobile transaction card
  const renderMobileTransaction = (tx, type) => {
    const isEarned = type === "earned" || tx.type === "points_awarded";
    const amount = Math.abs(tx.points || 0);
    const cat = tx.category || "recycling";

    return (
      <div
        key={tx.id}
        className={`rounded-lg p-4 border ${
          isDark
            ? "bg-gray-800/50 border-gray-700/50"
            : "bg-white/70 border-gray-200"
        }`}
        role="listitem"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div
              className={`${categoryColors[cat]} w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0`}
              title={cat}
            >
              {categoryIcons[cat]}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium truncate mb-1 ${
                  isDark ? "text-gray-200" : "text-gray-900"
                }`}
              >
                {tx.description}
              </p>
              <div className={`flex items-center text-xs space-x-2 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}>
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTimeAgo(tx.timestamp)}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            <div
              className={`text-sm font-semibold ${
                isEarned 
                  ? isDark ? "text-green-400" : "text-green-600"
                  : isDark ? "text-red-400" : "text-red-600"
              }`}
            >
              {isEarned ? `+${amount}` : `-${amount}`}
            </div>
            <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              points
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Desktop transaction row
  const renderDesktopTransaction = (tx, type) => {
    const isEarned = type === "earned" || tx.type === "points_awarded";
    const amount = Math.abs(tx.points || 0);
    const cat = tx.category || "recycling";

    return (
      <tr
        key={tx.id}
        className={`border-b ${
          isDark 
            ? "border-gray-700 hover:bg-gray-800/30" 
            : "border-gray-200 hover:bg-gray-50"
        } transition-colors`}
      >
        <td className="px-6 py-4">
          <div className="flex items-center space-x-3">
            <div
              className={`${categoryColors[cat]} w-10 h-10 rounded-lg flex items-center justify-center`}
              title={cat}
            >
              {categoryIcons[cat]}
            </div>
            <div>
              <p className={`font-medium ${isDark ? "text-gray-200" : "text-gray-900"}`}>
                {tx.description}
              </p>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </p>
            </div>
          </div>
        </td>
        <td className={`px-6 py-4 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            {tx.timestamp.toLocaleDateString()}
          </div>
        </td>
        <td className={`px-6 py-4 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            {formatTimeAgo(tx.timestamp)}
          </div>
        </td>
        <td className="px-6 py-4">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isEarned
                ? isDark 
                  ? "bg-green-900/30 text-green-400"
                  : "bg-green-100 text-green-800"
                : isDark 
                  ? "bg-red-900/30 text-red-400"
                  : "bg-red-100 text-red-800"
            }`}
          >
            {isEarned ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1" />
            )}
            {isEarned ? "Earned" : "Redeemed"}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <span
            className={`text-lg font-semibold ${
              isEarned 
                ? isDark ? "text-green-400" : "text-green-600"
                : isDark ? "text-red-400" : "text-red-600"
            }`}
          >
            {isEarned ? `+${amount}` : `-${amount}`}
          </span>
          <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            points
          </div>
        </td>
      </tr>
    );
  };

  if (loadingUserData) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center px-4 ${
          isDark ? "bg-gray-900" : "bg-gradient-to-br from-green-50 via-teal-50 to-blue-50"
        }`}
      >
        <Loader2
          className={`animate-spin w-8 h-8 mb-4 ${
            isDark ? "text-green-400" : "text-green-600"
          }`}
        />
        <p className={`text-base font-medium ${isDark ? "text-green-400" : "text-green-700"}`}>
          Loading transactions...
        </p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        isDark
          ? "bg-gray-900 text-gray-200"
          : "bg-gradient-to-br from-green-50 via-teal-50 to-blue-50 text-gray-900"
      }`}
    >
      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Sticky Header */}
        <div className={`sticky top-0 z-50 px-4 py-3 border-b backdrop-blur-sm ${
          isDark 
            ? "bg-gray-900/90 border-gray-700" 
            : "bg-white/90 border-gray-200"
        }`}>
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate("/dashboard")}
                className={`flex items-center gap-2 transition-colors ${
                  isDark ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
                aria-label="Back to Dashboard"
              >
                <ArrowLeft />
                <span className="font-medium">Back</span>
              </button>
              <h1 className={`text-lg font-semibold ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                Transactions
              </h1>
            </div>
          </div>
        </div>
        
        <div className="max-w-md mx-auto px-4 py-4">
          {/* Welcome Section */}
          <div
            className={`rounded-xl p-6 mb-6 ${
              isDark ? "bg-gray-800/50" : "bg-white/70"
            }`}
          >
            <div className="text-center mb-4">
              <h1 className={`text-xl font-bold mb-1 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                {`${getGreeting()}, ${userName}! 🌟`}
              </h1>
              <p className={`${isDark ? "text-gray-400" : "text-gray-600"} text-sm`}>
                Your eco-friendly journey
              </p>
            </div>
            <div className="flex items-center justify-center">
              <button
                onClick={() => setShowPoints(!showPoints)}
                className={`p-2 rounded-lg transition-colors mr-3 ${
                  isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
                aria-label={showPoints ? "Hide points" : "Show points"}
              >
                {showPoints ? (
                  <Eye className={`w-4 h-4 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
                ) : (
                  <EyeOff className={`w-4 h-4 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
                )}
              </button>
              <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl px-4 py-3 text-white">
                <Coins className="w-5 h-5" />
                <div>
                  <p className="text-xs opacity-90">Available Points</p>
                  <p className="text-lg font-bold">{showPoints ? points.toLocaleString() : "•••••"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-xs text-green-100 mb-1 text-center">Earned</p>
              <p className="text-xl font-bold text-center">{totalEarned.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-red-400 to-red-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-center mb-2">
                <TrendingDown className="w-5 h-5" />
              </div>
              <p className="text-xs text-red-100 mb-1 text-center">Redeemed</p>
              <p className="text-xl font-bold text-center">{totalSpent.toLocaleString()}</p>
            </div>
          </div>

          {/* Compact Tabs */}
          <div className={`flex rounded-lg p-1 mb-4 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
            {["all", "earned", "redeemed"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-green-600 text-white"
                    : isDark
                    ? "text-gray-300"
                    : "text-gray-700"
                }`}
                aria-pressed={activeTab === tab}
              >
                {tab === "all" ? "All" : tab === "earned" ? "Earned" : "Redeemed"}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="space-y-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions..."
                className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm ${
                  isDark 
                    ? "bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-400" 
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                } focus:outline-none focus:ring-2 focus:ring-green-500`}
              />
            </div>

            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className={`w-full pl-8 pr-8 py-2.5 rounded-lg border text-sm appearance-none ${
                    isDark 
                      ? "bg-gray-800 border-gray-700 text-gray-200" 
                      : "bg-white border-gray-300 text-gray-900"
                  } focus:outline-none focus:ring-2 focus:ring-green-500`}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">7 Days</option>
                  <option value="month">30 Days</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>

              <div className="relative flex-1">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className={`w-full pl-3 pr-8 py-2.5 rounded-lg border text-sm appearance-none ${
                    isDark 
                      ? "bg-gray-800 border-gray-700 text-gray-200" 
                      : "bg-white border-gray-300 text-gray-900"
                  } focus:outline-none focus:ring-2 focus:ring-green-500`}
                >
                  <option value="desc">Newest</option>
                  <option value="asc">Oldest</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div role="list" className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <div
                  className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                    isDark ? "bg-gray-800" : "bg-gray-100"
                  }`}
                >
                  <Coins className={`w-6 h-6 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                </div>
                <h3 className={`text-base font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-900"}`}>
                  No transactions found
                </h3>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {searchTerm ? "Try different search terms" : "Start earning eco-points!"}
                </p>
              </div>
            ) : (
              filteredTransactions.map((item) =>
                renderMobileTransaction(item, activeTab === "all" ? item._type : activeTab)
              )
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Desktop Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className={`flex items-center gap-2 transition-colors ${
                  isDark ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
                aria-label="Back to Dashboard"
              >
                <ArrowLeft />
                <span className="font-medium">Dashboard</span>
              </button>
              <div className={`w-px h-6 ${isDark ? "bg-gray-700" : "bg-gray-300"}`}></div>
              <h1 className={`text-2xl font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                Transaction History
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowPoints(!showPoints)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
                aria-label={showPoints ? "Hide points" : "Show points"}
              >
                {showPoints ? (
                  <Eye className={`w-5 h-5 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
                ) : (
                  <EyeOff className={`w-5 h-5 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
                )}
              </button>
              <div className="flex items-center space-x-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl px-6 py-4 text-white">
                <Coins className="w-6 h-6" />
                <div>
                  <p className="text-sm opacity-90">Available Points</p>
                  <p className="text-2xl font-bold">{showPoints ? points.toLocaleString() : "•••••"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Welcome Banner */}
          <div
            className={`rounded-2xl p-8 mb-8 ${
              isDark ? "bg-gray-800/50" : "bg-white/70"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-3xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                  {`${getGreeting()}, ${userName}! 🌟`}
                </h2>
                <p className={`${isDark ? "text-gray-400" : "text-gray-600"} text-lg`}>
                  Track your eco-friendly journey and celebrate your environmental impact
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-green-100 text-sm font-medium">+12% vs last month</span>
              </div>
              <p className="text-green-100 text-sm mb-1">Total Points Earned</p>
              <p className="text-3xl font-bold">{totalEarned.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-red-400 to-red-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <span className="text-red-100 text-sm font-medium">Rewards claimed</span>
              </div>
              <p className="text-red-100 text-sm mb-1">Points Redeemed</p>
              <p className="text-3xl font-bold">{totalSpent.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Coins className="w-6 h-6" />
                </div>
                <span className="text-blue-100 text-sm font-medium">Ready to use</span>
              </div>
              <p className="text-blue-100 text-sm mb-1">Net Balance</p>
              <p className="text-3xl font-bold">{(totalEarned - totalSpent).toLocaleString()}</p>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-8">
            {/* Tabs */}
            <div className={`inline-flex rounded-xl p-1 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
              {["all", "earned", "redeemed"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-green-600 text-white shadow-lg shadow-green-600/30"
                      : isDark
                      ? "text-gray-300 hover:text-white"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                  aria-pressed={activeTab === tab}
                >
                  {tab === "all" ? "All Transactions" : tab === "earned" ? "Points Earned" : "Points Redeemed"}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search transactions..."
                  className={`pl-10 pr-4 py-2.5 rounded-xl border text-sm w-64 ${
                    isDark 
                      ? "bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-400" 
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className={`pl-10 pr-8 py-2.5 rounded-xl border text-sm appearance-none w-40 ${
                    isDark 
                      ? "bg-gray-800 border-gray-700 text-gray-200" 
                      : "bg-white border-gray-300 text-gray-900"
                  } focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last Month</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>

              <div className="relative">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className={`pl-4 pr-8 py-2.5 rounded-xl border text-sm appearance-none w-32 ${
                    isDark 
                      ? "bg-gray-800 border-gray-700 text-gray-200" 
                      : "bg-white border-gray-300 text-gray-900"
                  } focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                >
                  <option value="desc">Newest</option>
                  <option value="asc">Oldest</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Desktop Transaction Table */}
          <div className={`rounded-2xl overflow-hidden shadow-sm border ${
            isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"
          }`}>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-16">
                <div
                  className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
                    isDark ? "bg-gray-700" : "bg-gray-100"
                  }`}
                >
                  <Coins className={`w-10 h-10 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                </div>
                <h3 className={`text-xl font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-900"}`}>
                  No transactions found
                </h3>
                <p className={`text-base ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {searchTerm 
                    ? "Try adjusting your search terms or date filters" 
                    : "Start earning points by completing eco-friendly activities!"}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className={`${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${
                      isDark ? "text-gray-200" : "text-gray-900"
                    }`}>
                      Description
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${
                      isDark ? "text-gray-200" : "text-gray-900"
                    }`}>
                      Date
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${
                      isDark ? "text-gray-200" : "text-gray-900"
                    }`}>
                      Time Ago
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${
                      isDark ? "text-gray-200" : "text-gray-900"
                    }`}>
                      Type
                    </th>
                    <th className={`px-6 py-4 text-right text-sm font-semibold ${
                      isDark ? "text-gray-200" : "text-gray-900"
                    }`}>
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((item) =>
                    renderDesktopTransaction(item, activeTab === "all" ? item._type : activeTab)
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className={`fixed bottom-4 right-4 max-w-md rounded-xl p-4 flex items-center space-x-3 shadow-lg border z-50 ${
            isDark ? "bg-red-900/90 border-red-700 backdrop-blur-sm" : "bg-red-50 border-red-200"
          }`}
          role="alert"
        >
          <AlertTriangle
            className={`w-5 h-5 flex-shrink-0 ${
              isDark ? "text-red-400" : "text-red-600"
            }`}
          />
          <span className={`font-medium ${isDark ? "text-red-300" : "text-red-700"}`}>
            {error}
          </span>
        </div>
      )}
    </div>
  );
}