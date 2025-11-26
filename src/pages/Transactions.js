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
  RefreshCw,
  ShieldCheck, // blockchain: verification icon
  Link,        // blockchain: chain link icon
  Hash,        // blockchain: hash icon
  Box,         // blockchain: block icon
  X
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

// --- COMPONENT: Blockchain Details Modal ---
// Displays the cryptographic proof for a specific transaction
function BlockDetailModal({ block, visible, onClose }) {
  const { isDark } = useTheme();
  if (!visible || !block) return null;

  const isGenesis = block.index === 1 || block.prevHash === "0";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 ${
          isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
        }`}
      >
        {/* Modal Header */}
        <div className="relative p-6 pb-0">
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
              isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
              <ShieldCheck className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Verified Transaction
              </h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Immutable Record #{block.index}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Cryptographic Data Card */}
          <div className={`p-5 rounded-xl space-y-4 ${isDark ? "bg-gray-900/50 border border-gray-700" : "bg-gray-50 border border-gray-100"}`}>
            
            {/* Block Index */}
            <div className="flex justify-between items-center border-b border-gray-200/10 pb-3">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-500" />
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Block Index
                </span>
              </div>
              <span className={`font-mono font-bold text-lg ${isDark ? "text-green-400" : "text-green-600"}`}>
                #{block.index}
              </span>
            </div>

            {/* Current Hash */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-purple-500" />
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Current Hash (Fingerprint)
                </span>
              </div>
              <div className={`font-mono text-[10px] break-all p-3 rounded-lg border ${
                isDark ? "bg-black/30 border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-600"
              }`}>
                {block.hash}
              </div>
            </div>

            {/* Previous Hash */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link className="w-4 h-4 text-orange-500" />
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Previous Hash (Chain Link)
                </span>
              </div>
              <div className={`font-mono text-[10px] break-all p-3 rounded-lg border ${
                isDark ? "bg-black/30 border-gray-700 text-gray-500" : "bg-white border-gray-200 text-gray-400"
              }`}>
                {isGenesis ? (
                  <span className="text-blue-500 font-bold italic">-- GENESIS BLOCK (Start of Chain) --</span>
                ) : (
                  block.prevHash
                )}
              </div>
            </div>
          </div>

          {/* Education/Explanation */}
          <div className={`flex gap-3 p-4 rounded-lg text-sm border ${
            isDark ? "bg-blue-900/10 border-blue-900/30 text-blue-300" : "bg-blue-50 border-blue-100 text-blue-700"
          }`}>
            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Tamper-Proof:</strong> This transaction is cryptographically linked to the previous one. Any attempt to alter this record would break the chain, alerting the system immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Transactions() {
  const navigate = useNavigate();
  const { isDark } = useTheme() || {};
  
  // User Data
  const [userName, setUserName] = useState("User");
  const [points, setPoints] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Transaction Data
  const [transactions, setTransactions] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  
  // Blockchain Data
  const [ledgerMap, setLedgerMap] = useState({}); // Maps firestoreId -> Block Data
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);

  // Loading States
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [error, setError] = useState(null);

  // UI State
  const [activeTab, setActiveTab] = useState("all"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all"); 
  const [sortOrder, setSortOrder] = useState("desc"); 
  const [showPoints, setShowPoints] = useState(true);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      setIsPWA(isStandalone || isIOSStandalone);
    };
    checkPWA();
  }, []);

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
    reward: "🎁",
    default: "🎟️",
  };

  const categoryColors = {
    recycling: isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-700",
    transport: isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700",
    lifestyle: isDark ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-700",
    food: isDark ? "bg-orange-900/30 text-orange-400" : "bg-orange-100 text-orange-700",
    products: isDark ? "bg-teal-900/30 text-teal-400" : "bg-teal-100 text-teal-700",
    reward: isDark ? "bg-pink-900/30 text-pink-400" : "bg-pink-100 text-pink-700",
    default: isDark ? "bg-gray-800/30 text-gray-400" : "bg-gray-100 text-gray-700",
  };

  const totalEarned = transactions.reduce((sum, tx) => sum + (tx.points || 0), 0);
  const totalSpent = redemptions.reduce((sum, r) => sum + (r.points || 0), 0);

  // Clock Tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Fetch User Data
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

  // 2. Fetch Blockchain Ledger (The Verification Layer)
  const fetchLedger = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // We fetch the ledger entries specifically for this user to link them to transactions
      const q = query(collection(db, "ledger"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      
      const map = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // The 'metadata.firestoreId' links the Blockchain Block to the User Transaction
        if (data.metadata && data.metadata.firestoreId) {
          map[data.metadata.firestoreId] = {
            id: doc.id,
            ...data
          };
        }
      });
      
      setLedgerMap(map);
      // console.log("Ledger synced:", Object.keys(map).length, "blocks verified.");
    } catch (err) {
      console.error("Error fetching ledger:", err);
    }
  }, []);

  // 3. Fetch Earned Transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoadingTransactions(true);
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
      console.error("Error fetching transactions:", err);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  // 4. Fetch Redemption Transactions
  const fetchRedemptions = useCallback(async () => {
    try {
      setLoadingTransactions(true);
      const user = auth.currentUser;
      if (!user) return;
      
      // Strategy: Look for both explicit 'points_redeemed' and negative point values
      const queries = [
        query(
          collection(db, "point_transactions"),
          where("userId", "==", user.uid),
          where("type", "==", "points_redeemed"),
          orderBy("timestamp", "desc")
        ),
        query(
          collection(db, "point_transactions"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc")
        ),
      ];

      let allRedemptions = [];
      const seenIds = new Set();
      
      for (const q of queries) {
        try {
          const snapshot = await getDocs(q);
          snapshot.docs.forEach((doc) => {
            if (seenIds.has(doc.id)) return;

            const tx = doc.data();
            if (tx.type === "points_redeemed" || (typeof tx.points === "number" && tx.points < 0)) {
              seenIds.add(doc.id);
              allRedemptions.push({
                id: doc.id,
                description: tx.description || tx.rewardName || "Redeemed reward",
                points: Math.abs(typeof tx.points === "number" ? tx.points : 0),
                timestamp: tx.timestamp?.toDate?.() || new Date(0),
                type: "points_redeemed",
                category: tx.category || "reward",
                rewardName: tx.rewardName,
              });
            }
          });
        } catch (err) {
          console.error("Query error:", err);
        }
      }
      setRedemptions(allRedemptions);
    } catch (err) {
      setError("Failed to load redemptions.");
      console.error("Error fetching redemptions:", err);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  // Initial Load & Refresh Handler
  const handleRefresh = useCallback(async () => {
    setError(null);
    await Promise.all([fetchTransactions(), fetchRedemptions(), fetchLedger()]);
  }, [fetchTransactions, fetchRedemptions, fetchLedger]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

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

  // Blockchain Interaction: View Block Details
  const handleViewBlock = (txId) => {
    const block = ledgerMap[txId];
    if (block) {
      setSelectedBlock(block);
      setShowBlockModal(true);
    }
  };

  // Filtering Logic
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
        case "today": compareDate.setHours(0, 0, 0, 0); break;
        case "week": compareDate.setDate(now.getDate() - 7); break;
        case "month": compareDate.setMonth(now.getMonth() - 1); break;
        default: compareDate = new Date(0); break;
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

  // --- RENDERERS ---

  const renderMobileTransaction = (tx, type) => {
    const isEarned = type === "earned" || tx.type === "points_awarded";
    const amount = Math.abs(tx.points || 0);
    const cat = tx.category || (isEarned ? "recycling" : "reward");
    
    // Check blockchain status
    const ledgerBlock = ledgerMap[tx.id]; 

    return (
      <div
        key={tx.id}
        onClick={() => ledgerBlock && handleViewBlock(tx.id)}
        className={`rounded-lg p-4 border relative overflow-hidden transition-all ${
          isDark
            ? "bg-gray-800/50 border-gray-700/50 hover:bg-gray-800"
            : "bg-white/70 border-gray-200 hover:bg-white"
        } ${ledgerBlock ? "cursor-pointer" : ""}`}
        role="listitem"
      >
        {/* Visual Indicator for Verified Block */}
        {ledgerBlock && (
          <div className="absolute top-0 right-0 p-1 pointer-events-none">
             <div className="bg-gradient-to-bl from-green-500/20 to-transparent w-20 h-20 absolute top-0 right-0 -mr-10 -mt-10 rounded-full blur-xl"></div>
          </div>
        )}

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div
              className={`${categoryColors[cat] || categoryColors.default} w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0`}
            >
              {categoryIcons[cat] || categoryIcons.default}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p
                  className={`text-sm font-medium truncate ${
                    isDark ? "text-gray-200" : "text-gray-900"
                  }`}
                >
                  {tx.description}
                </p>
                {ledgerBlock && (
                  <ShieldCheck className="w-3 h-3 text-green-500" />
                )}
              </div>
              <div className={`flex items-center text-xs space-x-2 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}>
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTimeAgo(tx.timestamp)}
                </span>
                {/* Mobile Verified Badge */}
                {ledgerBlock && (
                   <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 rounded border border-green-500/20 ml-1 font-medium">Verified</span>
                )}
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

  const renderDesktopTransaction = (tx, type) => {
    const isEarned = type === "earned" || tx.type === "points_awarded";
    const amount = Math.abs(tx.points || 0);
    const cat = tx.category || (isEarned ? "recycling" : "reward");
    
    // Check blockchain status
    const ledgerBlock = ledgerMap[tx.id];

    return (
      <tr
        key={tx.id}
        onClick={() => ledgerBlock && handleViewBlock(tx.id)}
        className={`border-b ${
          isDark 
            ? "border-gray-700 hover:bg-gray-800/30" 
            : "border-gray-200 hover:bg-gray-50"
        } transition-colors ${ledgerBlock ? "cursor-pointer group" : ""}`}
      >
        <td className="px-6 py-4">
          <div className="flex items-center space-x-3">
            <div
              className={`${categoryColors[cat] || categoryColors.default} w-10 h-10 rounded-lg flex items-center justify-center`}
            >
              {categoryIcons[cat] || categoryIcons.default}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className={`font-medium ${isDark ? "text-gray-200" : "text-gray-900"}`}>
                  {tx.description}
                </p>
                {ledgerBlock && (
                   <ShieldCheck className="w-4 h-4 text-green-500 opacity-70 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
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
          {/* Verification Status Column */}
          <div className="flex items-center">
             {ledgerBlock ? (
                <div className={`px-2.5 py-1 rounded-md text-xs font-bold border flex items-center gap-1.5 shadow-sm ${
                    isDark ? "bg-green-900/20 border-green-800 text-green-400" : "bg-green-50 border-green-200 text-green-700"
                }`}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </div>
            ) : (
                <div className="flex items-center opacity-50" title="Pending Verification">
                    <Clock className="w-4 h-4 mr-2" />
                    {formatTimeAgo(tx.timestamp)}
                </div>
            )}
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

  // Loading Screen
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
          Loading secure transactions...
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
      {/* The Blockchain Verification Modal */}
      <BlockDetailModal 
        visible={showBlockModal} 
        block={selectedBlock} 
        onClose={() => setShowBlockModal(false)} 
      />

      {/* Mobile Layout */}
      <div className="lg:hidden">
       {/* Sticky Header */}
        {isPWA && (
          <div className={`sticky top-0 z-50 px-4 py-3 backdrop-blur-sm ${
            isDark 
              ? "bg-gray-900/95" 
              : "bg-white/95"
          }`}>
            <div className="flex items-center justify-between">
              <h1 className={`text-lg font-semibold ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                Transactions
              </h1>
              <button
                onClick={handleRefresh}
                disabled={loadingTransactions}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${loadingTransactions ? 'animate-spin' : ''} ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`} />
              </button>
            </div>
          </div>
        )}
        
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
                Your verified eco-friendly journey
              </p>
            </div>
            <div className="flex items-center justify-center">
              <button
                onClick={() => setShowPoints(!showPoints)}
                className={`p-2 rounded-lg transition-colors mr-3 ${
                  isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                {showPoints ? (
                  <Eye className={`w-4 h-4 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
                ) : (
                  <EyeOff className={`w-4 h-4 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
                )}
              </button>
              <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl px-4 py-3 text-white shadow-lg shadow-orange-500/20">
                <Coins className="w-5 h-5" />
                <div>
                  <p className="text-xs opacity-90">Available Points</p>
                  <p className="text-lg font-bold">{showPoints ? points.toLocaleString() : "•••••"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-4 text-white shadow-md">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-xs text-green-100 mb-1 text-center">Earned</p>
              <p className="text-xl font-bold text-center">{totalEarned.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-red-400 to-red-600 rounded-xl p-4 text-white shadow-md">
              <div className="flex items-center justify-center mb-2">
                <TrendingDown className="w-5 h-5" />
              </div>
              <p className="text-xs text-red-100 mb-1 text-center">Redeemed</p>
              <p className="text-xl font-bold text-center">{totalSpent.toLocaleString()}</p>
            </div>
          </div>

          {/* Mobile Controls & List */}
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
                placeholder="Search..."
                className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm ${
                  isDark 
                    ? "bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-400" 
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                } focus:outline-none focus:ring-2 focus:ring-green-500`}
              />
            </div>
            
            {/* Sort Dropdowns */}
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

          {/* Mobile List */}
          <div role="list" className="space-y-3">
            {loadingTransactions ? (
              <div className="text-center py-8">
                <Loader2 className={`animate-spin w-8 h-8 mx-auto mb-3 ${isDark ? "text-green-400" : "text-green-600"}`} />
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Verifying ledger...
                </p>
              </div>
            ) : filteredTransactions.length === 0 ? (
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
                <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Start earning to see your blockchain record!
                </p>
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
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
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                Transaction History
              </h1>
              <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Powered by EcoSort Blockchain Ledger
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={loadingTransactions}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
                title="Refresh Ledger"
              >
                <RefreshCw className={`w-5 h-5 ${loadingTransactions ? 'animate-spin' : ''} ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`} />
              </button>
              <button
                onClick={() => setShowPoints(!showPoints)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                {showPoints ? (
                  <Eye className={`w-5 h-5 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
                ) : (
                  <EyeOff className={`w-5 h-5 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
                )}
              </button>
              <div className="flex items-center space-x-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl px-6 py-4 text-white shadow-lg shadow-orange-500/20">
                <Coins className="w-6 h-6" />
                <div>
                  <p className="text-sm opacity-90">Available Points</p>
                  <p className="text-2xl font-bold">{showPoints ? points.toLocaleString() : "•••••"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <p className="text-green-100 text-sm mb-1">Total Points Earned</p>
              <p className="text-3xl font-bold">{totalEarned.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-red-400 to-red-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6" />
                </div>
              </div>
              <p className="text-red-100 text-sm mb-1">Points Redeemed</p>
              <p className="text-3xl font-bold">{totalSpent.toLocaleString()}</p>
            </div>

            <div className={`rounded-2xl p-6 border ${
              isDark ? "bg-gray-800/50 border-gray-700" : "bg-white/70 border-gray-200"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isDark ? "bg-gray-700" : "bg-gray-100"
                }`}>
                  <Coins className={`w-6 h-6 ${isDark ? "text-yellow-400" : "text-yellow-600"}`} />
                </div>
              </div>
              <p className={`text-sm mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Current Balance
              </p>
              <p className={`text-3xl font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                {points.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-8">
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
                >
                  {tab === "all" ? "All Transactions" : tab === "earned" ? "Points Earned" : "Points Redeemed"}
                </button>
              ))}
            </div>

            {/* Desktop Filters */}
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
                  } focus:outline-none focus:ring-2 focus:ring-green-500`}
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
                  } focus:outline-none focus:ring-2 focus:ring-green-500`}
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
                  } focus:outline-none focus:ring-2 focus:ring-green-500`}
                >
                  <option value="desc">Newest</option>
                  <option value="asc">Oldest</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className={`rounded-2xl overflow-hidden shadow-sm border ${
            isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"
          }`}>
            {loadingTransactions ? (
              <div className="text-center py-16">
                <Loader2 className={`animate-spin w-12 h-12 mx-auto mb-6 ${isDark ? "text-green-400" : "text-green-600"}`} />
                <p className={`text-lg ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  Syncing blockchain ledger...
                </p>
              </div>
            ) : filteredTransactions.length === 0 ? (
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
                <p className={`text-base mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {searchTerm 
                    ? "Try adjusting your search terms" 
                    : "Your verified blockchain record will appear here once you start earning."}
                </p>
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center px-6 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Refresh Ledger
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className={`${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-900"}`}>Description</th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-900"}`}>Date</th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-900"}`}>Status</th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-900"}`}>Type</th>
                    <th className={`px-6 py-4 text-right text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-900"}`}>Points</th>
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

      {/* Error Toasts */}
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