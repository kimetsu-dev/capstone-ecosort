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
import { Layers, ChevronDown, ChevronUp, Package } from "lucide-react";

// Helper function to add notifications
async function addNotification(userId, message, type = "submission_status") {
  const notificationsRef = collection(db, "notifications", userId, "userNotifications");
  await addDoc(notificationsRef, {
    type,
    message,
    read: false,
    createdAt: serverTimestamp(),
  });
}

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

const SubmissionsTab = ({ 
  pendingSubmissions, 
  setPendingSubmissions, 
  pointsPerKiloMap, 
  users, 
  loading, 
  setLoading, 
  showToast, 
  isDark 
}) => {
  const [liveStats, setLiveStats] = useState({ 
    total: 0, 
    successful: 0, 
    rejected: 0, 
    pending: 0,
    successRate: 0,
    totalPointsAwarded: 0
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [allSubmissions, setAllSubmissions] = useState([]);
  
  // State to track expanded items in the history view
  const [expandedBundles, setExpandedBundles] = useState({});

  const toggleBundle = (id) => {
    setExpandedBundles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Real-time stats listener
  useEffect(() => {
    let submissionsQuery;
    
    try {
      submissionsQuery = query(
        collection(db, "waste_submissions"),
        orderBy("submittedAt", "desc")
      );
    } catch (error) {
      console.log("Failed to create ordered query, using unordered:", error);
      submissionsQuery = collection(db, "waste_submissions");
    }

    const unsubscribe = onSnapshot(
      submissionsQuery,
      (snapshot) => {
        try {
          const submissions = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          
          const total = submissions.length;
          const successful = submissions.filter(s => s.status === "confirmed").length;
          const rejected = submissions.filter(s => s.status === "rejected").length;
          const pending = submissions.filter(s => s.status === "pending").length;
          const successRate = (successful + rejected) > 0 ? ((successful / (successful + rejected)) * 100) : 0;
          
          const totalPointsAwarded = submissions
            .filter(s => s.status === "confirmed")
            .reduce((sum, s) => {
              const points = parseFloat(s.points) || parseFloat(s.pointsAwarded) || parseFloat(s.awardedPoints) || 0;
              return sum + points;
            }, 0);

          setLiveStats({ 
            total, 
            successful, 
            rejected, 
            pending,
            successRate: isNaN(successRate) ? 0 : successRate,
            totalPointsAwarded
          });
          setAllSubmissions(submissions);
          setIsStatsLoading(false);
        } catch (error) {
          console.error("Error processing live submission stats:", error);
          setIsStatsLoading(false);
        }
      },
      (error) => {
        console.error("Error with live submission stats listener:", error);
        setIsStatsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getUserInfo = (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return { name: "Unknown User", email: "N/A", uniqueId: userId.slice(0, 8) };
    
    const name = user.displayName || user.name || user.username || user.firstName || "Unknown User";
    const email = user.email || "No email";
    const uniqueId = userId.slice(0, 8); 
    
    return { name, email, uniqueId };
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
      // Determine if this is a mixed bundle or single item
      const isMixedBundle = submission.items && Array.isArray(submission.items) && submission.items.length > 1;
      let awardedPoints = 0;

      if (isMixedBundle) {
        // Mixed bundle: use the calculated total
        awardedPoints = parseFloat(submission.points) || 0;
      } else {
        // Single item: calculate based on type and weight
        const pointsPerKiloForType = pointsPerKiloMap[submission.type] ?? 0;
        awardedPoints = Number(submission.weight * pointsPerKiloForType) || 0;
      }

      const userRef = doc(db, "users", submission.userId);

      await createPointTransaction({
        userId: submission.userId,
        points: awardedPoints,
        description: `Awarded points for ${isMixedBundle ? 'mixed bundle' : submission.type} submission (ID: ${submission.id.slice(0,6)})`,
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
        points: awardedPoints,
        confirmedAt: serverTimestamp(),
      });

      await addNotification(
        submission.userId,
        `Your ${isMixedBundle ? 'mixed bundle' : 'waste'} submission has been confirmed! You earned ${awardedPoints.toFixed(2)} points.`
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

  // Helper to check if submission is a mixed bundle
  const isMixedBundle = (submission) => {
    return submission.items && Array.isArray(submission.items) && submission.items.length > 1;
  };

  // Helper to render waste details with clear visual distinction
  const WasteDetailsRenderer = ({ submission, compact = false, showExpanded = false }) => {
    const isBundle = isMixedBundle(submission);
    const isExpanded = expandedBundles[submission.id];
    
    if (isBundle) {
      return (
        <div>
          <div className={`text-sm mt-1 font-bold flex items-center gap-2 ${isDark ? "text-green-400" : "text-green-600"}`}>
            <Layers className="w-4 h-4" />
            Mixed Bundle ({submission.items.length} items)
          </div>
          <div className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
            Total Weight: {(submission.totalWeight || submission.weight || 0).toFixed(2)} kg
          </div>
          
          {showExpanded ? (
            <>
              <button
                onClick={() => toggleBundle(submission.id)}
                className={`mt-2 text-xs flex items-center gap-1 ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {isExpanded ? "Hide items" : "Show items"}
              </button>
              
              {isExpanded && (
                <div className={`mt-2 p-2 rounded-md ${isDark ? "bg-gray-900/50" : "bg-slate-100"} animate-slide-down`}>
                  {submission.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs mb-1 last:mb-0">
                      <span className={`${isDark ? "text-gray-300" : "text-slate-700"}`}>
                        • {item.wasteType}
                      </span>
                      <span className={`font-mono ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                        {item.weight}kg ({item.points || 0} pts)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Compact view always shows items
            <div className={`mt-2 p-2 rounded-md ${isDark ? "bg-gray-900/50" : "bg-slate-50"}`}>
              {submission.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs mb-1 last:mb-0">
                  <span className={`${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    • {item.wasteType}
                  </span>
                  <span className={`font-mono ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                    {item.weight}kg
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Single Item - Cleaner, more distinct display
    return (
      <div>
        <div className={`text-sm mt-1 font-bold flex items-center gap-2 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
          <Package className="w-4 h-4" />
          {submission.type}
        </div>
        <div className={`text-xs ${isDark ? "text-gray-400" : "text-slate-600"}`}>
          Weight: {(submission.weight || 0).toFixed(2)} kg
        </div>
        {!compact && (
          <div className={`text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
            Rate: {pointsPerKiloMap[submission.type] ?? 0} pts/kg
          </div>
        )}
      </div>
    );
  };

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
      <div className={`sticky top-0 z-10 ${isDark ? 'bg-gray-900/95 border-gray-700' : 'bg-white/95 border-slate-200'} backdrop-blur-md border-b`}>
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 mb-1">
            <h2 className={`text-2xl font-bold ${isDark ? "text-gray-100" : "text-slate-800"}`}>
              Submission Management
            </h2>
          </div>
        </div>
      </div>

      {/* Live Stats Dashboard */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <StatsCard
            title="Total Submissions"
            value={liveStats.total}
            bgColor={isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}
            isLoading={isStatsLoading}
          />
          <StatsCard
            title="Eco Points Awarded"
            value={liveStats.totalPointsAwarded.toLocaleString()}
            bgColor={isDark ? "bg-purple-900 border-purple-700 text-purple-200" : "bg-purple-50 border-purple-200 text-purple-900"}
            isLoading={isStatsLoading}
            subtitle="Total confirmed"
          />
        </div>
      </div>

      {/* Quick Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`p-4 rounded-lg border transition-all hover:shadow-md ${
          isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-600">{pendingSubmissions.length}</div>
              <div className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                Needs Review
              </div>
            </div>
          </div>
        </div>
        
        <div className={`p-4 rounded-lg border transition-all hover:shadow-md ${
          isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{liveStats.successful}</div>
              <div className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                Confirmed
              </div>
            </div>
          </div>
        </div>
        
        <div className={`p-4 rounded-lg border transition-all hover:shadow-md ${
          isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-600">{liveStats.rejected}</div>
              <div className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                Rejected
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Submissions Section */}
      {pendingSubmissions.length === 0 ? (
        <div className="text-center py-12">
          <h3 className={`text-lg font-medium mb-2 ${isDark ? "text-gray-200" : "text-slate-900"}`}>
            All caught up!
          </h3>
          <p className={`${isDark ? "text-gray-400" : "text-slate-500"}`}>
            No pending submissions to review.
          </p>
        </div>
      ) : (
        <div>
          <h3 className={`text-lg font-semibold mb-3 ${isDark ? "text-gray-200" : "text-slate-800"}`}>
            Pending Submissions ({pendingSubmissions.length})
          </h3>
          
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-slate-600">Processing...</span>
            </div>
          )}

          {!loading && (
            <div className="space-y-3">
              {pendingSubmissions.map((submission) => {
                const userInfo = getUserInfo(submission.userId);
                const isBundle = isMixedBundle(submission);
                
                // Calculate estimated points
                let estimatedPoints = 0;
                if (isBundle) {
                  estimatedPoints = parseFloat(submission.points) || 0;
                } else {
                  const rate = pointsPerKiloMap[submission.type] ?? 0;
                  estimatedPoints = Number(submission.weight * rate) || 0;
                }
                
                return (
                  <div
                    key={submission.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      isBundle ? 'border-l-green-500' : 'border-l-yellow-400'
                    } transition-all hover:shadow-md ${
                      isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-slate-200"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Type Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        {isBundle ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                            isDark ? "bg-green-900/40 text-green-400 border border-green-700" : "bg-green-100 text-green-700 border border-green-300"
                          }`}>
                            <Layers className="w-3 h-3" />
                            Bundle
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                            isDark ? "bg-blue-900/40 text-blue-400 border border-blue-700" : "bg-blue-100 text-blue-700 border border-blue-300"
                          }`}>
                            <Package className="w-3 h-3" />
                            Single Item
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            
                            {/* User Info Column */}
                            <div>
                              <span className={`font-medium uppercase tracking-wider text-xs ${
                                isDark ? "text-gray-400" : "text-slate-500"
                              }`}>
                                User Info
                              </span>
                              <div className={`text-sm mt-1 font-medium ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                                {userInfo.name}
                              </div>
                              <div className={`text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                                {userInfo.email}
                              </div>
                              <div className={`text-xs font-mono ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                                ID: {userInfo.uniqueId}
                              </div>
                            </div>

                            {/* Waste Details Column */}
                            <div>
                              <span className={`font-medium uppercase tracking-wider text-xs ${
                                isDark ? "text-gray-400" : "text-slate-500"
                              }`}>
                                Waste Details
                              </span>
                              <WasteDetailsRenderer submission={submission} />
                            </div>

                            {/* Points & Date Column */}
                            <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                              <div>
                                <span className={`font-medium uppercase tracking-wider text-xs ${
                                  isDark ? "text-gray-400" : "text-slate-500"
                                }`}>
                                  Points
                                </span>
                                <div className={`text-sm mt-1 font-bold ${isDark ? "text-yellow-400" : "text-yellow-600"}`}>
                                  {estimatedPoints.toFixed(2)} pts
                                </div>
                                <div className={`text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                                  Estimated reward
                                </div>
                              </div>
                              <div>
                                <span className={`font-medium uppercase tracking-wider text-xs ${
                                  isDark ? "text-gray-400" : "text-slate-500"
                                }`}>
                                  Submitted
                                </span>
                                <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                                  {formatDate(submission.submittedAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <button
                          onClick={() => confirmSubmission(submission)}
                          className="flex-1 px-4 py-2.5 text-white bg-gradient-to-r from-green-600 to-green-700 rounded-lg hover:from-green-700 hover:to-green-800 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                          disabled={loading}
                        >
                          <span className="text-center">Confirm & Award {estimatedPoints.toFixed(1)} pts</span>
                        </button>
                        <button
                          onClick={() => rejectSubmission(submission.id, submission.userId)}
                          className="flex-1 px-4 py-2.5 text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-700 hover:to-red-800 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                          disabled={loading}
                        >
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* All Submissions History */}
      <div>
        <h3 className={`text-lg font-semibold mb-3 ${isDark ? "text-gray-200" : "text-slate-800"}`}>
          All Submissions History
        </h3>
        
        {allSubmissions.filter(s => s.status === "confirmed" || s.status === "rejected").length === 0 ? (
          <div className="text-center py-8">
            <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
              isDark ? "bg-gray-700" : "bg-slate-100"
            }`}>
              <span className="text-lg">⏳</span>
            </div>
            <p className={`${isDark ? "text-gray-400" : "text-slate-500"}`}>
              No processed submissions yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allSubmissions
              .filter(s => s.status === "confirmed" || s.status === "rejected")
              .map((submission) => {
                const userInfo = getUserInfo(submission.userId);
                const isBundle = isMixedBundle(submission);
                
                // Handle points logic for display
                let finalPoints = parseFloat(submission.points) || parseFloat(submission.pointsAwarded) || 0;
                
                if (finalPoints === 0 && !isBundle) {
                  // Fallback calculation for legacy single items
                  const rate = pointsPerKiloMap[submission.type] ?? 0;
                  finalPoints = Number(submission.weight * rate) || 0;
                }

                const getStatusBadgeStyle = (status) => {
                  switch (status) {
                    case "confirmed":
                      return "bg-green-100 text-green-800 border-green-200";
                    case "rejected":
                      return "bg-red-100 text-red-800 border-red-200";
                    default:
                      return "bg-gray-100 text-gray-800 border-gray-200";
                  }
                };
                
                return (
                  <div
                    key={submission.id}
                    className={`p-4 rounded-lg ${
                      isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="flex-1 w-full">
                        {/* Type Badge for History */}
                        <div className="flex items-center gap-2 mb-3">
                          {isBundle ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                              isDark ? "bg-green-900/40 text-green-400 border border-green-700" : "bg-green-100 text-green-700 border border-green-300"
                            }`}>
                              <Layers className="w-3 h-3" />
                              Bundle
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                              isDark ? "bg-blue-900/40 text-blue-400 border border-blue-700" : "bg-blue-100 text-blue-700 border border-blue-300"
                            }`}>
                              <Package className="w-3 h-3" />
                              Single Item
                            </span>
                          )}
                        </div>

                        <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-4 text-sm">
                          
                          {/* User Info */}
                          <div>
                            <span className={`font-medium uppercase tracking-wider text-xs ${
                              isDark ? "text-gray-400" : "text-slate-500"
                            }`}>
                              User
                            </span>
                            <div className={`text-sm mt-1 ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                              {userInfo.name}
                            </div>
                            <div className={`text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                              {userInfo.email}
                            </div>
                          </div>

                          {/* Waste Details */}
                          <div className="xl:col-span-2">
                            <span className={`font-medium uppercase tracking-wider text-xs ${
                              isDark ? "text-gray-400" : "text-slate-500"
                            }`}>
                              Waste Details
                            </span>
                            <WasteDetailsRenderer submission={submission} compact={true} showExpanded={true} />
                          </div>

                          {/* Points */}
                          <div>
                            <span className={`font-medium uppercase tracking-wider text-xs ${
                              isDark ? "text-gray-400" : "text-slate-500"
                            }`}>
                              Points
                            </span>
                            <div className={`text-sm mt-1 font-bold ${
                              submission.status === "confirmed" 
                                ? (isDark ? "text-green-400" : "text-green-600")
                                : (isDark ? "text-red-400" : "text-red-600")
                            }`}>
                              {submission.status === "confirmed" ? `${finalPoints.toFixed(2)} pts` : "0 pts"}
                            </div>
                          </div>

                          {/* Status Badge (Mobile view puts it here, Desktop floats right) */}
                          <div className="flex sm:hidden mt-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                              getStatusBadgeStyle(submission.status)
                            }`}>
                              {submission.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge (Desktop) */}
                      <div className="hidden sm:block flex-shrink-0 ml-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                          getStatusBadgeStyle(submission.status)
                        }`}>
                          {submission.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default SubmissionsTab;