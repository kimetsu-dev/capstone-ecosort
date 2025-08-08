import React, { useState, useEffect, useCallback } from "react";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import {
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  query,
  runTransaction,
  startAfter,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
const storage = getStorage();

async function addRewardWithImage(file, rewardData) {
  try {
    let imageUrl = "";
    if (file) {
      // Upload image file to Firebase Storage (adjust path as you like)
      const fileRef = storageRef(storage, `reward_images/${file.name}_${Date.now()}`);
      await uploadBytes(fileRef, file);
      imageUrl = await getDownloadURL(fileRef);
    }

    // Save reward in Firestore including the imageUrl field
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
// Simple function to generate a short unique redemption code
function generateRedemptionCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Toast Component
function Toast({ visible, message, type }) {
  if (!visible) return null;
  const bgColors = { success: "bg-green-600", error: "bg-red-600", info: "bg-blue-600" };
  return (
    <div
      className={`fixed bottom-6 right-6 px-6 py-3 rounded shadow-lg text-white z-50 ${bgColors[type] || bgColors.info}`}
      role="alert"
      aria-live="assertive"
    >
      {message}
    </div>
  );
}

// Confirmation Modal Component
function ConfirmModal({ visible, message, onConfirm, onCancel, loading }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Please Confirm</h3>
        <p className="mb-6 text-gray-700 whitespace-pre-line">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Reward Card Component
function RewardCard({ reward, canRedeem, onRedeem, disabled }) {
  const getStockStatus = () => {
    const qty = reward.stock || 0;
    if (qty === 0) return { text: "Out of Stock", color: "text-red-600 bg-red-50" };
    if (qty <= 5) return { text: "Low Stock", color: "text-orange-600 bg-orange-50" };
    return { text: "In Stock", color: "text-green-600 bg-green-50" };
  };

  const stockStatus = getStockStatus();

  return (
    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2">
      {/* Stock badge */}
      <div className={`absolute top-4 right-4 z-10 px-3 py-1 rounded-full text-xs font-semibold ${stockStatus.color}`}>
        {stockStatus.text}
      </div>

      {/* Image */}
      <div className="relative overflow-hidden h-48 bg-gradient-to-br from-gray-100 to-gray-200">
        {reward.imageUrl ? (
          <img
            src={reward.imageUrl}
            alt={reward.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gift className="w-16 h-16 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-purple-600 transition-colors">{reward.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{reward.description}</p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-lg text-gray-800">{reward.cost}</span>
            <span className="text-sm text-gray-500">points</span>
          </div>
          <div className="text-sm text-gray-500">
            Stock: <span className="font-medium">{reward.stock}</span>
          </div>
        </div>

        {canRedeem ? (
          <button
            onClick={() => onRedeem(reward)}
            disabled={disabled}
            className={`w-full py-3 rounded-xl font-semibold transition duration-200 ${
              disabled
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-lg transform hover:scale-105"
            }`}
          >
            {disabled ? "Processing..." : "Redeem Now"}
          </button>
        ) : (
          <button disabled className="w-full py-3 bg-gray-300 text-gray-500 rounded-xl font-semibold cursor-not-allowed">
            {reward.stock === 0 ? "Out of Stock" : "Insufficient Points"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Rewards() {
  const [rewards, setRewards] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("all");
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

  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const PAGE_SIZE = 8;

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
  };

  // Step 2: Confirm redemption & generate redemption code + create Firestore doc
  const confirmRedeemReward = async () => {
    if (!rewardPendingConfirmation) return;
    setConfirmLoading(true);

    try {
      const reward = rewardPendingConfirmation;
      const code = generateRedemptionCode();

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", currentUser.uid);
        const rewardRef = doc(db, "rewards", reward.id);
        const redemptionsRef = collection(db, "redemptions");

        const userDoc = await transaction.get(userRef);
        const rewardDoc = await transaction.get(rewardRef);

        if (!userDoc.exists() || !rewardDoc.exists()) throw new Error("Document missing");

        const newPoints = (userDoc.data().totalPoints || 0) - reward.cost;
        const newStock = (rewardDoc.data().stock || 0) - 1;

        if (newPoints < 0) throw new Error("Insufficient points");
        if (newStock < 0) throw new Error("Out of stock");

        transaction.update(userRef, { totalPoints: newPoints });
        transaction.update(rewardRef, { stock: newStock });

        // Create redemption doc with status "pending" and redemption code
        transaction.set(doc(redemptionsRef), {
          userId: currentUser.uid,
          rewardId: reward.id,
          redeemedAt: serverTimestamp(),
          status: "pending",
          redemptionCode: code,
        });
      });

      setUserPoints((prev) => prev - rewardPendingConfirmation.cost);
      setRewards((prev) =>
        prev.map((r) => (r.id === rewardPendingConfirmation.id ? { ...r, stock: r.stock - 1 } : r))
      );

      setRedeemedReward(rewardPendingConfirmation);
      setRedemptionCode(code);
      setShowSuccessModal(true);
      showToast("Reward redeemed! Please claim it onsite and present this code.", "success");
    } catch (error) {
      console.error("Redemption failed:", error);
      showToast("Failed to redeem reward. Please try again.", "error");
    } finally {
      setConfirmLoading(false);
      setConfirmModalVisible(false);
      setRewardPendingConfirmation(null);
    }
  };

  const filteredRewards =
    selectedCategory === "all" ? rewards : rewards.filter((reward) => reward.category === selectedCategory);

  const canRedeem = (reward) => currentUser && userPoints >= reward.cost && reward.stock > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft />
            <span className="font-medium">Dashboard</span>
          </button>
          {currentUser && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-lg">
              <Coins className="w-5 h-5" />
              <span className="font-bold text-lg">{userPoints.toLocaleString()}</span>
              <span className="text-amber-100 text-sm font-medium">points</span>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-3 mb-8 pt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
            selectedCategory === "all"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg transform scale-105"
              : "bg-white/80 text-gray-700 hover:bg-white hover:shadow-md hover:scale-105"
          }`}
          aria-pressed={selectedCategory === "all"}
        >
          <Gift className="w-4 h-4" />
          All Rewards
        </button>
        {[...new Set(rewards.map((r) => r.category))].map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
              selectedCategory === category
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg transform scale-105"
                : "bg-white/80 text-gray-700 hover:bg-white hover:shadow-md hover:scale-105"
            }`}
            aria-pressed={selectedCategory === category}
          >
            <Gift className="w-4 h-4" />
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Note about onsite redemption */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <p className="text-center text-sm text-red-600 font-semibold">
          You may redeem rewards online early if you have enough points, but you <strong>must claim rewards onsite </strong> by showing your redemption code.
        </p>
      </div>

      {/* Rewards List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {filteredRewards.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No rewards available</h3>
            <p className="text-gray-500">Check back later for new rewards!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  canRedeem={canRedeem(reward)}
                  onRedeem={startRedeemReward}
                  disabled={loading}
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

      {/* Success Modal showing redemption code */}
      {showSuccessModal && redeemedReward && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full animate-scaleIn">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Success!</h3>
              <p className="text-gray-600 mb-6">
                You've successfully redeemed <span className="font-semibold text-purple-600">{redeemedReward.name}</span>.
              </p>
              <p className="text-red-600 font-semibold mb-6">
                Please present the following redemption code onsite to claim your reward:
              </p>
              <div className="text-3xl font-mono font-bold text-center mb-6 select-all border-2 border-indigo-600 rounded-lg py-3 px-6 bg-indigo-50">
                {redemptionCode}
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
          "Please confirm your redemption request.\n" +
          "Note: You will receive a unique redemption code after confirming.\n" +
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
    </div>
  );
}
