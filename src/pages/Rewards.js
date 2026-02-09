import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  query,
  runTransaction,
  startAfter,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { Search, Filter } from "lucide-react"; 

// 1. Import the Ledger Service for Blockchain Integration
import { addToLedger } from '../utils/ledgerService';

const storage = getStorage();

// SVG Icon Components
const Gift = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75L12 21m0 0c1.472 0 2.882.265 4.185.75L12 21m-7.5-9h15m-15 0l1.5 1.5m13.5-1.5l-1.5 1.5m-7.5 3v3h3v-3m0 0h3"
    />
  </svg>
);

const CheckCircle2 = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Copy = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const Check = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const Coins = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const AlertCircle = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
);

const X = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Info = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

function generateRedemptionCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Toast component
function Toast({ visible, message, type, onClose }) {
  if (!visible) return null;
  const bgColors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };
  const bgClass = bgColors[type] || bgColors.info;
  return (
    <div
      className={`fixed bottom-6 right-6 left-6 sm:left-auto sm:right-6 px-4 py-3 rounded-lg shadow-lg text-white z-50 ${bgClass} flex items-center justify-between`}
      role="alert"
      aria-live="assertive"
    >
      <span className="text-sm">{message}</span>
      <button 
        onClick={onClose} 
        className="ml-4 -mr-2 p-1 rounded-full text-white/70 hover:text-white hover:bg-black/20 transition-colors flex-shrink-0"
        aria-label="Close notification"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

// Compact Reward Card Component
function CompactRewardCard({ reward, onClick }) {
  const { isDark } = useTheme();

  const getStockBadge = () => {
    const qty = reward.stock || 0;
    if (qty === 0) return { text: "Out", color: "bg-red-500" };
    if (qty <= 5) return { text: "Low", color: "bg-orange-500" };
    return null;
  };

  const stockBadge = getStockBadge();
  const isOutOfStock = reward.stock === 0;

  return (
    <div
      onClick={() => onClick(reward)}
      className={`${
        isDark ? "bg-gray-800 shadow-gray-900/20" : "bg-white shadow-gray-200/60"
      } rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 cursor-pointer active:scale-95 flex flex-col h-full ${isOutOfStock ? 'opacity-70 grayscale-[0.5]' : ''}`}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
        {reward.imageUrl ? (
          <img
            src={reward.imageUrl}
            alt={reward.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${
            isDark ? "bg-gray-700" : "bg-gray-100"
          }`}>
            <Gift className={`w-12 h-12 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
          </div>
        )}
        
        {/* Stock Badge */}
        {stockBadge && (
          <div className={`absolute top-2 right-2 ${stockBadge.color} text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg uppercase tracking-wider`}>
            {stockBadge.text}
          </div>
        )}

        {/* Category Badge */}
         <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full capitalize">
          {reward.category}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className={`font-semibold text-sm line-clamp-2 mb-2 flex-1 ${
          isDark ? "text-white" : "text-gray-900"
        }`}>
          {reward.name}
        </h3>
        
        <div className="flex items-center justify-between mt-auto">
            <div className={`flex items-center gap-1 font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                <Coins className="w-3.5 h-3.5" />
                <span>{reward.cost}</span>
            </div>
            {isOutOfStock && (
                <span className="text-[10px] font-medium text-red-500">Unavailable</span>
            )}
        </div>
      </div>
    </div>
  );
}

// --- REWARD DETAIL MODAL ---
function RewardDetailModal({ reward, visible, onClose, userPoints, onRedeem, isPWA }) {
  const { isDark } = useTheme();

  useEffect(() => {
    if (visible && isPWA) { 
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [visible, isPWA]);

  if (!visible || !reward) return null;

  const getStockStatus = () => {
    const qty = reward.stock || 0;
    if (qty === 0) return { text: "Out of Stock", color: "text-red-500", bgColor: "bg-red-50 dark:bg-red-900/20" };
    if (qty <= 5) return { text: "Low Stock", color: "text-orange-500", bgColor: "bg-orange-50 dark:bg-orange-900/20" };
    return { text: "In Stock", color: "text-green-500", bgColor: "bg-green-50 dark:bg-green-900/20" };
  };

  const stockStatus = getStockStatus();
  const canRedeem = userPoints >= reward.cost && reward.stock > 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 animate-fadeIn overflow-y-auto">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div 
        className={`${
          isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
        } relative w-full sm:max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scaleIn my-auto`}
        style={{ maxHeight: '85dvh', height: 'auto' }} 
        onClick={(e) => e.stopPropagation()} 
      >
        <div className={`flex-shrink-0 px-4 py-3 sm:p-4 border-b ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"} z-10 flex items-center justify-between`}>
            <h2 className="text-lg font-bold truncate pr-4">{reward.name}</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full flex-shrink-0 ${isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
            >
              <X className="w-5 h-5" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
          <div className="relative mb-5 rounded-xl overflow-hidden shadow-md flex-shrink-0 aspect-video">
            {reward.imageUrl ? (
              <img
                src={reward.imageUrl}
                alt={reward.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${
                isDark ? "bg-gray-700" : "bg-gray-100"
              }`}>
                <Gift className={`w-12 h-12 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
              </div>
            )}
          </div>

          <p className={`mb-6 text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            {reward.description}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className={`p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-amber-500" />
                <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Cost</span>
              </div>
              <span className="text-lg font-bold">{reward.cost}</span>
            </div>

            <div className={`p-3 rounded-lg ${stockStatus.bgColor}`}>
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4" />
                <span className="text-xs">Stock</span>
              </div>
              <span className={`text-sm font-bold ${stockStatus.color}`}>
                  {stockStatus.text} ({reward.stock})
              </span>
            </div>
          </div>

          <div className={`p-3 rounded-lg flex gap-3 ${isDark ? "bg-red-900/20 border border-red-500/20" : "bg-red-50 border border-red-100"}`}>
             <AlertCircle className={`w-5 h-5 flex-shrink-0 ${isDark ? "text-red-400" : "text-red-500"}`} />
             <p className={`text-xs ${isDark ? "text-red-300" : "text-red-600"}`}>
                Must be claimed onsite.
             </p>
          </div>
        </div>

        <div className={`flex-shrink-0 p-4 border-t ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"}`}>
          <div className="flex items-center justify-between mb-3 text-sm">
             <span className={isDark ? "text-gray-400" : "text-gray-500"}>Your Points:</span>
             <span className={`font-bold ${userPoints < reward.cost ? "text-red-500" : (isDark ? "text-white" : "text-gray-900")}`}>
               {userPoints.toLocaleString()}
             </span>
          </div>
          
          {canRedeem ? (
            <button
              onClick={() => onRedeem(reward)}
              className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg shadow-green-500/20
                bg-gradient-to-r from-green-500 to-emerald-600 
                active:scale-95 transition-transform"
            >
              Redeem Now
            </button>
          ) : (
            <button
              disabled
              className={`w-full py-3.5 rounded-xl font-bold cursor-not-allowed ${
                 isDark ? "bg-gray-700 text-gray-500" : "bg-gray-200 text-gray-400"
              }`}
            >
              {reward.stock === 0 ? "Out of Stock" : "Insufficient Points"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ visible, message, onConfirm, onCancel, loading }) {
  const { isDark } = useTheme();
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div
        className={`${
          isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
        } rounded-2xl p-6 max-w-md w-full shadow-lg animate-scaleIn`}
      >
        <h3 className="text-lg font-semibold mb-4">Please Confirm</h3>
        <p className="mb-6 whitespace-pre-line text-sm sm:text-base">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg border transition disabled:opacity-50 text-sm sm:text-base ${
              isDark ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50 text-sm sm:text-base"
          >
            {loading ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Success Modal
function SuccessModal({ visible, reward, code, onClose }) {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  if (!visible || !reward) return null;

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`${
          isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
        } rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-scaleIn`}
      >
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Success!</h3>
          <p className={`text-sm sm:text-base ${isDark ? "text-gray-300" : "text-gray-600"} mb-4 sm:mb-6`}>
            You've successfully redeemed{" "}
            <span className={`font-semibold ${isDark ? "text-purple-400" : "text-purple-600"}`}>{reward.name}</span>.
          </p>
          <div className={`p-3 sm:p-4 rounded-xl mb-4 sm:mb-6 ${isDark ? "bg-red-900/20 border border-red-500/30" : "bg-red-50 border border-red-200"}`}>
            <p className={`font-semibold mb-2 sm:mb-3 text-sm sm:text-base ${isDark ? "text-red-300" : "text-red-600"}`}>
              Present this code onsite to claim your reward:
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 text-xl sm:text-2xl font-mono font-bold text-center select-all border-2 border-dashed border-indigo-600/50 rounded-lg py-2 sm:py-3 px-3 sm:px-4 bg-indigo-50 text-indigo-900 tracking-widest">
                {code}
              </div>
              <button
                onClick={handleCopyCode}
                className={`p-2 sm:p-3 rounded-lg transition-all duration-200 flex items-center justify-center ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
                aria-label="Copy code"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 text-sm sm:text-base"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Rewards() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { styles, isDark } = useTheme();

  const PAGE_SIZE = 20; // Increased since we are filtering locally

  const [isPWA, setIsPWA] = useState(false);
  const [rewards, setRewards] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  
  // NEW STATE FOR FILTERING
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedReward, setSelectedReward] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redeemedReward, setRedeemedReward] = useState(null);
  const [redemptionCode, setRedemptionCode] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [rewardPendingConfirmation, setRewardPendingConfirmation] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true; 
      setIsPWA(isStandalone || isIOSStandalone);
    };
    checkPWA();
  }, []);

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []); 

  const showToast = useCallback((msg, type = "info") => {
    setToast({ visible: true, message: msg, type });
    const timer = setTimeout(() => {
      closeToast();
    }, 4000);
    return () => clearTimeout(timer);
  }, [closeToast]); 

  useEffect(() => {
    if (!currentUser) {
      setUserPoints(0);
      return;
    }
    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserPoints(data.totalPoints || 0);
      }
    });
    return () => unsubscribeUser();
  }, [currentUser]);

  // Fetch all rewards initially so we can filter nicely on client side
  // For production with thousands of items, this should be server-side filtered
  const fetchRewardsPage = useCallback(
    async (startAfterDoc = null) => {
      try {
        const baseQuery = query(
          collection(db, "rewards"),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE)
        );
        const rewardsQuery = startAfterDoc ? query(baseQuery, startAfter(startAfterDoc)) : baseQuery;
        const snapshot = await getDocs(rewardsQuery);
        
        if (snapshot.empty) {
          setHasMore(false);
          return;
        }
        
        const rewardsPage = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        if (startAfterDoc) {
          setRewards((prev) => [...prev, ...rewardsPage]);
        } else {
          setRewards(rewardsPage);
        }
        
        setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);
        
        if (snapshot.docs.length < PAGE_SIZE) {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Failed to load rewards:", error);
        showToast("Failed to load rewards", "error");
      }
    },
    [showToast, PAGE_SIZE]
  );

  useEffect(() => {
    setHasMore(true);
    setLastVisibleDoc(null);
    fetchRewardsPage(null);
  }, [fetchRewardsPage]);

  const handleRewardClick = (reward) => {
    setSelectedReward(reward);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedReward(null);
  };

  const startRedeemReward = (reward) => {
    if (!currentUser) {
      showToast("Please log in to redeem rewards.", "error");
      return;
    }
    if (userPoints < reward.cost) {
      showToast("Not enough points to redeem.", "error");
      return;
    }
    if (reward.stock === 0) {
      showToast("Reward out of stock.", "error");
      return;
    }
    setRewardPendingConfirmation(reward);
    setConfirmModalVisible(true);
    setShowDetailModal(false); 
  };

  const confirmRedeemReward = async () => {
    if (!rewardPendingConfirmation || !currentUser) return;
    
    setConfirmLoading(true);
    const reward = rewardPendingConfirmation;
    const code = generateRedemptionCode(); 

    try {
      const { newPoints, newStock, redemptionId } = await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", currentUser.uid);
        const rewardRef = doc(db, "rewards", reward.id);
        const redemptionRef = doc(collection(db, "redemptions")); 

        const userDoc = await transaction.get(userRef);
        const rewardDoc = await transaction.get(rewardRef);

        if (!userDoc.exists()) throw new Error("User data not found.");
        if (!rewardDoc.exists()) throw new Error("Reward not found.");

        const currentPoints = userDoc.data().totalPoints || 0;
        const currentStock = rewardDoc.data().stock || 0;

        const calculatedNewPoints = currentPoints - reward.cost;
        const calculatedNewStock = currentStock - 1;

        if (calculatedNewPoints < 0) throw new Error("Insufficient points");
        if (calculatedNewStock < 0) throw new Error("Out of stock");

        transaction.update(userRef, { totalPoints: calculatedNewPoints });
        transaction.update(rewardRef, { stock: calculatedNewStock });

        transaction.set(redemptionRef, {
          userId: currentUser.uid,
          userEmail: currentUser.email, 
          rewardId: reward.id,
          rewardName: reward.name, 
          cost: reward.cost,
          redeemedAt: serverTimestamp(),
          status: "pending", 
          redemptionCode: code,
        });

        return { 
            newPoints: calculatedNewPoints, 
            newStock: calculatedNewStock,
            redemptionId: redemptionRef.id 
        };
      });

      try {
          await addToLedger(
            currentUser.uid,
            "REWARD_REDEEMED",
            -Math.abs(reward.cost), 
            {
              rewardId: reward.id,
              rewardName: reward.name,
              redemptionCode: code,
              firestoreId: redemptionId
            }
          );
      } catch (ledgerError) {
          console.error("⚠️ Ledger Error:", ledgerError);
      }

      try {
        await addDoc(collection(db, "point_transactions"), {
          userId: currentUser.uid,
          type: "points_redeemed",
          points: -Math.abs(reward.cost),
          description: `Redeemed: ${reward.name}`,
          rewardName: reward.name,
          rewardId: reward.id,
          category: reward.category || "reward",
          timestamp: serverTimestamp(),
        });
      } catch (txError) {
        console.error("⚠️ Warning: Failed to create transaction record:", txError);
      }

      setUserPoints(newPoints);
      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, stock: newStock } : r))
      );
      setRedeemedReward(reward);
      setRedemptionCode(code);
      setShowSuccessModal(true);

      showToast("Reward redeemed! Please claim it onsite.", "success");

    } catch (error) {
      console.error("❌ Redemption failed:", error);
      showToast(error.message || "Failed to redeem reward. Please try again.", "error");
      setShowDetailModal(true);
    } finally {
      setConfirmLoading(false);
      setConfirmModalVisible(false);
      setRewardPendingConfirmation(null);
    }
  };

  // --- FILTERING LOGIC ---
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(rewards.map((r) => r.category))];
    return uniqueCategories.filter(Boolean).sort();
  }, [rewards]);

  const filteredRewards = rewards.filter((reward) => {
    // 1. Filter by Search Term
    const matchesSearch = reward.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Filter by Category
    const matchesCategory = selectedCategory === "all" || reward.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`min-h-screen transition-all duration-300 ${styles.backgroundGradient}`}>
       {/* Sticky Header Section */}
       <div
        className={`${
          isDark ? "bg-gray-800/90 border-gray-700" : "bg-white/90 border-gray-200"
        } backdrop-blur-md border-b sticky top-0 z-40 transition-colors duration-300`}
      >
        <div className={`${isPWA ? 'px-4 sm:px-6' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'} py-3 sm:py-4`}>
          
          {/* Top Row: Points & My Redemptions Link */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
             {/* Points Display */}
             {currentUser ? (
                <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 rounded-xl shadow-lg w-fit">
                  <Coins className="w-5 h-5" />
                  <div className="flex flex-col leading-none">
                    <span className="font-bold text-lg">{userPoints.toLocaleString()}</span>
                    <span className="text-amber-100 text-[10px] font-medium uppercase tracking-wide">Available Points</span>
                  </div>
                </div>
              ) : <div></div>}

              <button
                onClick={() => navigate("/my-redemptions")}
                className={`px-4 py-2 rounded-xl font-medium transition text-sm flex items-center justify-center gap-2 ${
                    isDark 
                    ? "bg-gray-700 text-gray-200 hover:bg-gray-600" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Gift className="w-4 h-4" />
                My Redemptions
              </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col gap-3">
             {/* Search Input */}
             <div className="relative w-full">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                <input 
                    type="text" 
                    placeholder="Search rewards..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                        isDark 
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                        : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500"
                    }`}
                />
             </div>

             {/* Category Pills (Horizontal Scroll) */}
             <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className={`flex items-center gap-2 pr-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                   <Filter className="w-4 h-4" />
                   <span className="text-xs font-medium uppercase tracking-wider">Filters:</span>
                </div>
                
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap text-xs flex-shrink-0 border ${
                    selectedCategory === "all"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : `${
                          isDark
                            ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                        }`
                  }`}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap text-xs flex-shrink-0 border ${
                      selectedCategory === category
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                        : `${
                            isDark
                              ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                          }`
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
          </div>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredRewards.length === 0 ? (
          <div className="text-center py-16 animate-fadeIn">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
               <Search className={`${isDark ? "text-gray-500" : "text-gray-400"} w-8 h-8`} />
            </div>
            <h3 className={`${isDark ? "text-gray-200" : "text-gray-700"} text-lg font-semibold mb-2`}>
              No rewards found
            </h3>
            <p className={`${isDark ? "text-gray-400" : "text-gray-500"} text-sm max-w-xs mx-auto`}>
               We couldn't find any rewards matching "{searchTerm}" in {selectedCategory === 'all' ? 'all categories' : selectedCategory}.
            </p>
            <button 
                onClick={() => { setSearchTerm(""); setSelectedCategory("all"); }}
                className="mt-4 text-indigo-500 hover:text-indigo-600 text-sm font-medium"
            >
                Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredRewards.map((reward) => (
                <CompactRewardCard
                  key={reward.id}
                  reward={reward}
                  onClick={handleRewardClick}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => {
                    setLoadingMore(true);
                    fetchRewardsPage(lastVisibleDoc).finally(() => setLoadingMore(false));
                  }}
                  disabled={loadingMore}
                  className={`px-6 py-2.5 rounded-lg font-semibold transition disabled:opacity-50 text-sm ${
                      isDark 
                      ? "bg-gray-700 hover:bg-gray-600 text-white" 
                      : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm"
                  }`}
                >
                  {loadingMore ? "Loading..." : "Load More Rewards"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reward Detail Modal */}
      <RewardDetailModal
        reward={selectedReward}
        visible={showDetailModal}
        onClose={closeDetailModal}
        userPoints={userPoints}
        onRedeem={startRedeemReward}
        isPWA={isPWA}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        reward={redeemedReward}
        code={redemptionCode}
        onClose={() => {
          setShowSuccessModal(false);
          setRedemptionCode(null);
          setRedeemedReward(null);
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={confirmModalVisible}
        message={
          "Please confirm your redemption request.\n\n" +
          "⚠️ You will receive a unique redemption code after confirming.\n" +
          "You MUST show this code onsite to claim your reward physically."
        }
        onConfirm={confirmRedeemReward}
        onCancel={() => {
          setConfirmModalVisible(false);
          setRewardPendingConfirmation(null);
          setShowDetailModal(true); 
        }}
        loading={confirmLoading}
      />

      {/* Toast Notification */}
      <Toast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type} 
        onClose={closeToast} 
      />

      <style>
        {`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          @keyframes scaleIn {
            from {
              transform: scale(0.9);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .animate-slideUp {
            animation: slideUp 0.3s ease-out;
          }
          .animate-scaleIn {
            animation: scaleIn 0.2s ease-out;
          }
          .animate-fadeIn {
            animation: fadeIn 0.2s ease-out;
          }
        `}
      </style>
    </div>
  );
}