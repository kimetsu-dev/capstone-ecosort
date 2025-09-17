import React, { useState, useEffect, useCallback } from "react";
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

const storage = getStorage();

async function addRewardWithImage(file, rewardData) {
  try {
    let imageUrl = "";
    if (file) {
      const fileRef = storageRef(storage, `reward_images/${file.name}_${Date.now()}`);
      await uploadBytes(fileRef, file);
      imageUrl = await getDownloadURL(fileRef);
    }

    const newReward = {
      ...rewardData,
      imageUrl,
      createdAt: serverTimestamp(),
    };
    const rewardRef = await addDoc(collection(db, "rewards"), newReward);

    console.log("Reward added with imageUrl:", imageUrl, "Doc ID:", rewardRef.id);
    return rewardRef.id;
  } catch (error) {
    console.error("Error adding reward:", error);
    throw error;
  }
}

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

const ArrowLeft = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const CheckCircle2 = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function Toast({ visible, message, type }) {
  const { styles } = useTheme();
  if (!visible) return null;
  const bgColors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };
  const bgClass = bgColors[type] || bgColors.info;
  return (
    <div
      className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${bgClass}`}
      role="alert"
      aria-live="assertive"
      style={{ minWidth: "200px" }}
    >
      {message}
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
    return null; // Don't show badge for normal stock
  };

  const stockBadge = getStockBadge();

  return (
    <div
      onClick={() => onClick(reward)}
      className={`${
        isDark ? "bg-gray-800 shadow-gray-900/20" : "bg-white shadow-gray-200/60"
      } rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer active:scale-95`}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden">
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
        
        {/* Stock Badge */}
        {stockBadge && (
          <div className={`absolute top-3 right-3 ${stockBadge.color} text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg`}>
            {stockBadge.text}
          </div>
        )}

        {/* Points Badge */}
        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
          <Coins className="w-3 h-3 text-amber-400" />
          <span className="text-sm font-semibold">{reward.cost}</span>
        </div>
      </div>

      {/* Title */}
      <div className="p-4">
        <h3 className={`font-semibold text-center line-clamp-2 ${
          isDark ? "text-white" : "text-gray-900"
        }`}>
          {reward.name}
        </h3>
      </div>
    </div>
  );
}

// Detailed Reward Modal
function RewardDetailModal({ reward, visible, onClose, userPoints, onRedeem, loading }) {
  const { isDark } = useTheme();

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      {/* Modal */}
      <div 
        className={`${
          isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
        } rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp sm:animate-scaleIn`}
      >
        {/* Header */}
        <div className="sticky top-0 p-6 pb-4 border-b border-gray-200 dark:border-gray-600 bg-inherit rounded-t-3xl sm:rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Reward Details</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Image */}
          <div className="relative mb-6 rounded-2xl overflow-hidden">
            {reward.imageUrl ? (
              <img
                src={reward.imageUrl}
                alt={reward.name}
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className={`w-full h-64 flex items-center justify-center ${
                isDark ? "bg-gray-700" : "bg-gray-100"
              }`}>
                <Gift className={`w-16 h-16 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
              </div>
            )}
          </div>

          {/* Title & Description */}
          <h3 className="text-2xl font-bold mb-3">{reward.name}</h3>
          <p className={`mb-6 leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            {reward.description}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Cost */}
            <div className={`p-4 rounded-xl ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-amber-500" />
                <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Cost</span>
              </div>
              <span className="text-xl font-bold">{reward.cost}</span>
              <span className={`text-sm ml-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>points</span>
            </div>

            {/* Stock */}
            <div className={`p-4 rounded-xl ${stockStatus.bgColor}`}>
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4" />
                <span className="text-sm">Stock</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{reward.stock}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${stockStatus.color}`}>
                  {stockStatus.text}
                </span>
              </div>
            </div>
          </div>

          {/* User Points */}
          <div className={`p-4 rounded-xl mb-6 ${isDark ? "bg-indigo-900/20 border border-indigo-500/30" : "bg-indigo-50 border border-indigo-200"}`}>
            <div className="flex items-center justify-between">
              <span className={`${isDark ? "text-indigo-300" : "text-indigo-600"}`}>Your Points</span>
              <span className="text-xl font-bold">{userPoints.toLocaleString()}</span>
            </div>
          </div>

          {/* Important Notice */}
          <div className={`p-4 rounded-xl mb-6 ${isDark ? "bg-red-900/20 border border-red-500/30" : "bg-red-50 border border-red-200"}`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 mt-0.5 ${isDark ? "text-red-400" : "text-red-500"}`} />
              <div>
                <h4 className={`font-semibold mb-1 ${isDark ? "text-red-300" : "text-red-700"}`}>
                  Onsite Claim Required
                </h4>
                <p className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>
                  You must present your redemption code onsite to claim this reward physically.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {canRedeem ? (
            <button
              onClick={() => onRedeem(reward)}
              disabled={loading}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
                loading
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-lg transform hover:scale-105 active:scale-95"
              }`}
            >
              {loading ? "Processing..." : "Redeem Now"}
            </button>
          ) : (
            <button
              disabled
              className="w-full py-4 rounded-xl font-semibold text-lg cursor-not-allowed bg-gray-300 text-gray-500"
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
        } rounded-2xl p-6 max-w-md w-full shadow-lg`}
      >
        <h3 className="text-lg font-semibold mb-4">Please Confirm</h3>
        <p className="mb-6 whitespace-pre-line">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg border transition disabled:opacity-50 ${
              isDark ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? "Processing..." : "Confirm"}
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

  const PAGE_SIZE = 12;

  const [rewards, setRewards] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedReward, setSelectedReward] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redeemedReward, setRedeemedReward] = useState(null);
  const [redemptionCode, setRedemptionCode] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Confirmation modal state
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [rewardPendingConfirmation, setRewardPendingConfirmation] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const showToast = (msg, type = "info") => {
    setToast({ visible: true, message: msg, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "info" }), 4000);
  };

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
    []
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

  // Step 1: Open confirm modal on redeem attempt
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
    setShowDetailModal(false); // Close detail modal
  };

  // Step 2: Confirm redemption & generate redemption code + create Firestore doc
// Step 2: Confirm redemption & generate redemption code + create Firestore doc atomically
const confirmRedeemReward = async () => {
  if (!rewardPendingConfirmation) return;
  setConfirmLoading(true);

  try {
    const reward = rewardPendingConfirmation;
    const code = generateRedemptionCode();

    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, "users", currentUser.uid);
      const rewardRef = doc(db, "rewards", reward.id);
      const redemptionRef = doc(collection(db, "redemptions"));

      const userDoc = await transaction.get(userRef);
      const rewardDoc = await transaction.get(rewardRef);

      if (!userDoc.exists() || !rewardDoc.exists()) throw new Error("Document missing");

      const newPoints = (userDoc.data().totalPoints || 0) - reward.cost;
      const newStock = (rewardDoc.data().stock || 0) - 1;

      if (newPoints < 0) throw new Error("Insufficient points");
      if (newStock < 0) throw new Error("Out of stock");

      // Update points and stock in the transaction
      transaction.update(userRef, { totalPoints: newPoints });
      transaction.update(rewardRef, { stock: newStock });

      // Create redemption document
      transaction.set(redemptionRef, {
        userId: currentUser.uid,
        rewardId: reward.id,
        redeemedAt: serverTimestamp(),
        status: "pending",
        redemptionCode: code,
      });

      // Update UI state optimistically inside transaction callback
      setUserPoints(newPoints);
      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, stock: newStock } : r))
      );
      setRedeemedReward(reward);
      setRedemptionCode(code);
      setShowSuccessModal(true);
    });

    showToast("Reward redeemed! Please claim it onsite and present this code.", "success");
  } catch (error) {
    console.error("Redemption failed:", error);
    showToast(error.message || "Failed to redeem reward. Please try again.", "error");
  } finally {
    setConfirmLoading(false);
    setConfirmModalVisible(false);
    setRewardPendingConfirmation(null);
  }
};


  const filteredRewards =
    selectedCategory === "all" ? rewards : rewards.filter((reward) => reward.category === selectedCategory);

  return (
    <div className={`min-h-screen transition-all duration-300 ${styles.backgroundGradient}`}>
      {/* Header */}
      <div
        className={`${
          isDark ? "bg-gray-800/90 border-gray-700" : "bg-white/90 border-gray-200"
        } backdrop-blur-sm border-b sticky top-0 z-40`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate("/dashboard")}
              className={`${
                isDark ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"
              } flex items-center gap-2 transition-colors`}
            >
              <ArrowLeft />
              <span className="font-medium">Dashboard</span>
            </button>

            <button
              onClick={() => navigate("/my-redemptions")}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition text-sm"
            >
              My Redemptions
            </button>
          </div>

          {/* Points Display */}
          {currentUser && (
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-lg">
                <Coins className="w-5 h-5" />
                <span className="font-bold text-lg">{userPoints.toLocaleString()}</span>
                <span className="text-amber-100 text-sm font-medium">points</span>
              </div>
            </div>
          )}

          {/* Category Filter - Horizontal Scroll */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
                  : `${
                      isDark
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-white/80 text-gray-700 hover:bg-white hover:shadow-md"
                    }`
              }`}
            >
              <Gift className="w-4 h-4" />
              All Rewards
            </button>
            {[...new Set(rewards.map((r) => r.category))].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
                    : `${
                        isDark
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-white/80 text-gray-700 hover:bg-white hover:shadow-md"
                      }`
                }`}
              >
                <Gift className="w-4 h-4" />
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredRewards.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className={`${isDark ? "text-gray-500" : "text-gray-400"} w-16 h-16 mx-auto mb-4`} />
            <h3 className={`${isDark ? "text-gray-300" : "text-gray-600"} text-xl font-semibold mb-2`}>
              No rewards available
            </h3>
            <p className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>Check back later for new rewards!</p>
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
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? "Loading..." : "Load More"}
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
        loading={loading}
      />

      {/* Success Modal */}
      {showSuccessModal && redeemedReward && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`${
              isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
            } rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scaleIn`}
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Success!</h3>
              <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mb-6`}>
                You've successfully redeemed{" "}
                <span className="font-semibold text-purple-600">{redeemedReward.name}</span>.
              </p>
              <div className={`p-4 rounded-xl mb-6 ${isDark ? "bg-red-900/20 border border-red-500/30" : "bg-red-50 border border-red-200"}`}>
                <p className="text-red-600 font-semibold mb-3">
                  Present this code onsite to claim your reward:
                </p>
                <div className="text-2xl font-mono font-bold text-center select-all border-2 border-indigo-600 rounded-lg py-3 px-4 bg-indigo-50 text-indigo-900 tracking-widest">
                  {redemptionCode}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setRedemptionCode(null);
                  setRedeemedReward(null);
                }}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

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
        }}
        loading={confirmLoading}
      />

      {/* Toast Notification */}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />

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
    .animate-slideUp {
      animation: slideUp 0.3s ease-out;
    }
    .animate-scaleIn {
      animation: scaleIn 0.2s ease-out;
    }
  `}
</style>

    </div>
  );
}