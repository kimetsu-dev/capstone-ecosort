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

export default function Transactions() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("User");
  const [points, setPoints] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [transactions, setTransactions] = useState([]);
  const [redemptions, setRedemptions] = useState([]);

  const [loadingUserData, setLoadingUserData] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("all"); // "all", "earned", "spent"
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all"); // "all", "today", "week", "month"
  const [sortOrder, setSortOrder] = useState("desc"); // "desc", "asc"
  const [showPoints, setShowPoints] = useState(true);

  const ArrowLeft = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    else if (hour < 18) return "Good Afternoon";
    else return "Good Evening";
  };

  // Category icons and colors for badges
  const categoryIcons = {
    recycling: "♻️",
    transport: "🚶",
    lifestyle: "🌱",
    food: "🥗",
    products: "🧽",
  };

  const categoryColors = {
    recycling: "bg-blue-50 text-blue-700 border-blue-200",
    transport: "bg-green-50 text-green-700 border-green-200",
    lifestyle: "bg-purple-50 text-purple-700 border-purple-200",
    food: "bg-orange-50 text-orange-700 border-orange-200",
    products: "bg-teal-50 text-teal-700 border-teal-200",
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
    if (diff < 0) return "just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  // Filter, search, date range, sort transactions for display
  const filteredTransactions = useMemo(() => {
    let data = [];
    if (activeTab === "earned") {
      data = transactions;
    } else if (activeTab === "spent") {
      data = redemptions;
    } else {
      data = [
        ...transactions.map((t) => ({ ...t, _type: "earned" })),
        ...redemptions.map((r) => ({ ...r, _type: "spent" })),
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

  // Render transaction card
  const renderTransaction = (tx, type) => {
    const isEarned = type === "earned" || tx.type === "points_awarded";
    const amount = Math.abs(tx.points || 0);
    const cat = tx.category || "recycling";

    return (
      <div
        key={tx.id}
        className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-5 mb-3 border border-gray-100 hover:border-gray-200"
        role="listitem"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 overflow-hidden">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${categoryColors[cat]}`}
              aria-label={cat}
              title={cat}
            >
              {categoryIcons[cat]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900 truncate pr-2">{tx.description}</h3>
                <div className="flex items-center space-x-2 flex-shrink-0 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      isEarned ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {isEarned ? (
                      <TrendingUp className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />
                    )}
                    {isEarned ? `+${amount}` : `-${amount}`} pts
                  </span>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-500 space-x-3">
                <div className="flex items-center whitespace-nowrap">
                  <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
                  {formatTimeAgo(tx.timestamp)}
                </div>
                <div className="flex items-center whitespace-nowrap">
                  <Calendar className="w-3 h-3 mr-1" aria-hidden="true" />
                  {tx.timestamp.toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loadingUserData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-teal-50 to-blue-50 px-2">
        <Loader2 className="animate-spin w-12 h-12 text-green-600 mx-auto mb-4" />
        <p className="text-lg font-medium text-green-700">Loading your eco journey...</p>
        <p className="text-sm text-gray-500 mt-1">Fetching your latest activities</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-blue-50 px-2 sm:px-4">
      <div className="max-w-6xl mx-auto py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 mb-6">
          <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft />
            <span className="font-medium">Dashboard</span>
            </button>
        </div>

        {/* Welcome Card */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {`${getGreeting()}, ${userName}! 🌟`}
            </h1>
            <p className="text-gray-600 text-lg">Track your eco-friendly journey and celebrate your impact</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowPoints(!showPoints)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={showPoints ? "Hide points" : "Show points"}
            >
              {showPoints ? <Eye className="w-5 h-5 text-gray-500" /> : <EyeOff className="w-5 h-5 text-gray-500" />}
            </button>
            <div className="flex items-center space-x-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl px-6 py-4 text-white">
              <Coins className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-90">Available Points</p>
                <p className="text-2xl font-bold">{showPoints ? points.toLocaleString() : "•••••"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <span className="text-green-100 text-sm font-medium">+12% vs last month</span>
            </div>
            <p className="text-green-100 text-sm mb-1">Total Points Earned</p>
            <p className="text-3xl font-bold">{totalEarned.toLocaleString()}</p>
          </div>

          <div className="bg-gradient-to-br from-red-400 to-red-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6" />
              </div>
              <span className="text-red-100 text-sm font-medium">Rewards claimed</span>
            </div>
            <p className="text-red-100 text-sm mb-1">Points Redeemed</p>
            <p className="text-3xl font-bold">{totalSpent.toLocaleString()}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Coins className="w-6 h-6" />
              </div>
              <span className="text-blue-100 text-sm font-medium">Ready to use</span>
            </div>
            <p className="text-blue-100 text-sm mb-1">Available Balance</p>
            <p className="text-3xl font-bold">{points.toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          {["all", "earned", "spent"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl font-medium w-full sm:w-auto transition-colors ${
                activeTab === tab
                  ? "bg-green-600 text-white shadow-lg shadow-green-600/30"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              aria-pressed={activeTab === tab}
              aria-label={
                tab === "all"
                  ? "All Transactions"
                  : tab === "earned"
                  ? "Points Earned"
                  : "Points Redeemed"
              }
            >
              {tab === "all"
                ? "All Transactions"
                : tab === "earned"
                ? "Points Earned"
                : "Points Redeemed"}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0 mb-6 max-w-6xl mx-auto">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              aria-label="Search transactions"
            />
          </div>

          {/* Date Range */}
          <div className="relative w-full max-w-xs">
            <label htmlFor="dateRange" className="sr-only">
              Date Range
            </label>
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              id="dateRange"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              aria-label="Filter by date range"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last Month</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Sort Order */}
          <div className="relative w-full max-w-xs">
            <label htmlFor="sortOrder" className="sr-only">
              Sort Order
            </label>
            <select
              id="sortOrder"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full pl-4 pr-4 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              aria-label="Sort transactions order"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Transaction list */}
        <div
          role="list"
          aria-live="polite"
          aria-busy={loadingUserData}
          className="max-w-6xl mx-auto"
        >
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Coins className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No transactions found
              </h3>
              <p className="text-gray-500">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Start earning points by completing eco-friendly activities!"}
              </p>
            </div>
          ) : (
            filteredTransactions.map(item => renderTransaction(item, activeTab === "all" ? item._type : activeTab))
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3 max-w-6xl mx-auto">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700 font-medium">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
