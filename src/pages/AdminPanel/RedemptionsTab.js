import React, { useEffect, useState } from "react";
import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  runTransaction, 
  addDoc, 
  collection,
  onSnapshot,
  query,
  orderBy 
} from "firebase/firestore";
import { db } from "../../firebase";

// Helper function to create point transactions
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

const RedemptionsTab = ({ 
  redemptions, 
  users, 
  rewards, 
  showToast, 
  isDark 
}) => {
  const [liveStats, setLiveStats] = useState({ 
    total: 0, 
    pending: 0,
    successful: 0, 
    cancelled: 0, 
    successRate: 0,
    totalPointsRedeemed: 0
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Real-time redemption stats listener
  useEffect(() => {
    const redemptionsQuery = query(
      collection(db, "redemptions"),
      orderBy("redeemedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      redemptionsQuery,
      (snapshot) => {
        try {
          const allRedemptions = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          
          console.log("Live redemption stats update - fetched:", allRedemptions.length);

          const total = allRedemptions.length;
          const pending = allRedemptions.filter(r => r.status === "pending").length;
          const successful = allRedemptions.filter(r => r.status === "claimed").length;
          const cancelled = allRedemptions.filter(r => r.status === "cancelled").length;
          const successRate = (successful + cancelled) > 0 ? ((successful / (successful + cancelled)) * 100) : 0;
          
          // Calculate total points redeemed (only for claimed redemptions)
          const totalPointsRedeemed = allRedemptions
            .filter(r => r.status === "claimed")
            .reduce((sum, r) => {
              const points = parseFloat(r.pointCost) || 0;
              return sum + points;
            }, 0);

          console.log("Live redemption stats:", { 
            total, 
            pending, 
            successful, 
            cancelled, 
            successRate,
            totalPointsRedeemed 
          });

          setLiveStats({ 
            total, 
            pending,
            successful, 
            cancelled, 
            successRate: isNaN(successRate) ? 0 : successRate,
            totalPointsRedeemed
          });
          setIsStatsLoading(false);
        } catch (error) {
          console.error("Error processing live redemption stats:", error);
          setIsStatsLoading(false);
        }
      },
      (error) => {
        console.error("Error with live redemption stats listener:", error);
        setIsStatsLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
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

  const getUserEmail = (userId) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.email : "Unknown User";
  };

  const getUserName = (userId) => {
  const user = users.find((u) => u.id === userId);
  
  // Debug: Log the user object to see available fields
  console.log("User data for", userId, ":", user);
  
  if (!user) return "Unknown User";
  
  // Check all possible name fields
  return user.displayName || 
         user.name || 
         user.username || 
         user.firstName || 
         user.email?.split('@')[0] || // Fallback to email username part
         "Unknown User";
};

  const getRewardName = (rewardId) => {
    const reward = rewards.find((r) => r.id === rewardId);
    return reward ? reward.name : "Unknown Reward";
  };

  const getRewardDetails = (rewardId) => {
    const reward = rewards.find((r) => r.id === rewardId);
    return reward || null;
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "claimed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleString();
  };

  // Group redemptions by status (using prop data for display, live stats for metrics)
  const pendingRedemptions = redemptions.filter(r => r.status === "pending");
  const claimedRedemptions = redemptions.filter(r => r.status === "claimed");
  const cancelledRedemptions = redemptions.filter(r => r.status === "cancelled");

  // Loading skeleton for stats
  const StatsCard = ({ title, value, bgColor, isLoading, icon, subtitle }) => (
    <div className={`p-6 rounded-xl shadow-lg border transition-all duration-200 hover:shadow-xl ${bgColor}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium mb-2 opacity-90">{title}</div>
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-16 mb-1"></div>
              {subtitle && <div className="h-4 bg-gray-200 rounded w-12"></div>}
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold mb-1">{value}</div>
              {subtitle && <div className="text-sm opacity-80">{subtitle}</div>}
            </>
          )}
        </div>
        {icon && !isLoading && (
          <div className="text-2xl opacity-60">{icon}</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h2 className={`text-2xl font-bold ${isDark ? "text-gray-100" : "text-slate-800"}`}>
            Redemption Management
          </h2>
        </div>
        <p className={`${isDark ? "text-gray-400" : "text-slate-600"}`}>
          Manage reward redemption requests from users.
        </p>
      </div>

      {/* Enhanced Live Stats Dashboard */}
      <div>
        
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <StatsCard
            title="Total Redemptions"
            value={liveStats.total}
            bgColor={isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}
            isLoading={isStatsLoading}
          />
        </div>
      </div>

      {/* Quick Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${
          isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
        }`}>
          <div className="text-2xl font-bold text-yellow-600">{pendingRedemptions.length}</div>
          <div className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
            Needs Action
          </div>
          <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
            Waiting for approval
          </div>
        </div>
        <div className={`p-4 rounded-lg border ${
          isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
        }`}>
          <div className="text-2xl font-bold text-green-600">{claimedRedemptions.length}</div>
          <div className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
            Completed 
          </div>
          <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
            Successfully processed
          </div>
        </div>
        <div className={`p-4 rounded-lg border ${
          isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
        }`}>
          <div className="text-2xl font-bold text-red-600">{cancelledRedemptions.length}</div>
          <div className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
            Cancelled
          </div>
          <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
            Rejected or cancelled
          </div>
        </div>
      </div>

      {redemptions.length === 0 ? (
        <div className="text-center py-12">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            isDark ? "bg-gray-700" : "bg-slate-100"
          }`}>
            <span className="text-2xl">🎫</span>
          </div>
          <h3 className={`text-lg font-medium mb-2 ${isDark ? "text-gray-200" : "text-slate-900"}`}>
            No redemption requests
          </h3>
          <p className={`${isDark ? "text-gray-400" : "text-slate-500"}`}>
            No users have redeemed rewards yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending Redemptions First */}
          {pendingRedemptions.length > 0 && (
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${isDark ? "text-gray-200" : "text-slate-800"}`}>
                Pending Redemptions ({pendingRedemptions.length})
              </h3>
              <div className="space-y-3">
                {pendingRedemptions.map((redemption) => {
                  const reward = getRewardDetails(redemption.rewardId);
                  return (
                    <div
                      key={redemption.id}
                      className={`p-4 rounded-lg border-l-4 border-l-yellow-400 ${
                        isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-slate-200"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className={`font-medium uppercase tracking-wider text-xs ${
                                  isDark ? "text-gray-400" : "text-slate-500"
                                }`}>
                                  User
                                </span>
                                <div className={`text-sm mt-1 ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                                  {getUserName(redemption.userId)}
                                </div>
                                <div className={`text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                                  {getUserEmail(redemption.userId)}
                                </div>
                              </div>
                              <div>
                                <span className={`font-medium uppercase tracking-wider text-xs ${
                                  isDark ? "text-gray-400" : "text-slate-500"
                                }`}>
                                  Reward
                                </span>
                                <div className={`text-sm mt-1 ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                                  {getRewardName(redemption.rewardId)}
                                </div>
                                {reward && (
                                  <div className={`text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                                    {reward.cost} points • {reward.category}
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className={`font-medium uppercase tracking-wider text-xs ${
                                  isDark ? "text-gray-400" : "text-slate-500"
                                }`}>
                                  Code & Date
                                </span>
                                <div className={`text-sm font-mono mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                  {redemption.redemptionCode}
                                </div>
                                <div className={`text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                                  {formatDate(redemption.redeemedAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                            getStatusBadgeStyle(redemption.status)
                          }`}>
                            {redemption.status}
                          </span>
                        </div>
                        
                        <div className="flex space-x-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <button
                            onClick={() => markRedemptionClaimed(redemption)}
                            className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                          >
                            
                            <span>Mark Claimed</span>
                          </button>
                          <button
                            onClick={() => updateRedemptionStatus(redemption.id, "cancelled")}
                            className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                          >
                         
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Other Redemptions */}
          {(claimedRedemptions.length > 0 || cancelledRedemptions.length > 0) && (
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${isDark ? "text-gray-200" : "text-slate-800"}`}>
                All Redemptions History
              </h3>
              <div className="space-y-3">
                {[...claimedRedemptions, ...cancelledRedemptions].map((redemption) => {
                  const reward = getRewardDetails(redemption.rewardId);
                  return (
                    <div
                      key={redemption.id}
                      className={`p-4 rounded-lg ${
                        isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className={`font-medium uppercase tracking-wider text-xs ${
                                isDark ? "text-gray-400" : "text-slate-500"
                              }`}>
                                User
                              </span>
                              <div className={`text-sm mt-1 ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                                {getUserName(redemption.userId)}
                              </div>
                              <div className={`text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                                {getUserEmail(redemption.userId)}
                              </div>
                            </div>
                            <div>
                              <span className={`font-medium uppercase tracking-wider text-xs ${
                                isDark ? "text-gray-400" : "text-slate-500"
                              }`}>
                                Reward
                              </span>
                              <div className={`text-sm mt-1 ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                                {getRewardName(redemption.rewardId)}
                              </div>
                              {reward && (
                                <div className={`text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                                  {reward.cost} points • {reward.category}
                                </div>
                              )}
                            </div>
                            <div>
                              <span className={`font-medium uppercase tracking-wider text-xs ${
                                isDark ? "text-gray-400" : "text-slate-500"
                              }`}>
                                Code
                              </span>
                              <div className={`text-sm font-mono mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {redemption.redemptionCode}
                              </div>
                            </div>
                            <div>
                              <span className={`font-medium uppercase tracking-wider text-xs ${
                                isDark ? "text-gray-400" : "text-slate-500"
                              }`}>
                                Date
                              </span>
                              <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                                Redeemed: {formatDate(redemption.redeemedAt)}
                              </div>
                              {redemption.claimedAt && (
                                <div className={`text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                                  Claimed: {formatDate(redemption.claimedAt)}
                                </div>
                              )}
                              {redemption.cancelledAt && (
                                <div className={`text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                                  Cancelled: {formatDate(redemption.cancelledAt)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                          getStatusBadgeStyle(redemption.status)
                        }`}>
                          {redemption.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RedemptionsTab;