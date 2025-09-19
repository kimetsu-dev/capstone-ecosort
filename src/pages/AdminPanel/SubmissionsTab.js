import React, { useEffect, useState } from "react";
import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  runTransaction, 
  addDoc, 
  collection, 
  getDocs,
  onSnapshot,
  query,
  orderBy 
} from "firebase/firestore";
import { db } from "../../firebase";

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
  loading, 
  setLoading, 
  showToast, 
  isDark 
}) => {
  const [stats, setStats] = useState({ 
    total: 0, 
    successful: 0, 
    rejected: 0, 
    pending: 0,
    successRate: 0
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Real-time stats listener
  useEffect(() => {
    const submissionsQuery = query(
      collection(db, "waste_submissions"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      submissionsQuery,
      (snapshot) => {
        try {
          const submissions = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          
          console.log("Live stats update - fetched submissions:", submissions.length);

          const total = submissions.length;
          const successful = submissions.filter(s => s.status === "confirmed").length;
          const rejected = submissions.filter(s => s.status === "rejected").length;
          const pending = submissions.filter(s => s.status === "pending").length;
          const successRate = total > 0 ? ((successful / (successful + rejected)) * 100) : 0;

          console.log("Live stats:", { total, successful, rejected, pending, successRate });

          setStats({ 
            total, 
            successful, 
            rejected, 
            pending,
            successRate: isNaN(successRate) ? 0 : successRate
          });
          setIsStatsLoading(false);
        } catch (error) {
          console.error("Error processing live stats:", error);
          setIsStatsLoading(false);
        }
      },
      (error) => {
        console.error("Error with live stats listener:", error);
        setIsStatsLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

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
      {/* Enhanced Live Stats Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className={`text-2xl font-bold ${isDark ? "text-gray-100" : "text-slate-800"}`}>
            Live Submission Stats
          </h2>
          {!isStatsLoading && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Live
              </span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatsCard
            title="Total Submissions"
            value={stats.total}
            bgColor={isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}
            isLoading={isStatsLoading}
            icon="📊"
          />
          
          <StatsCard
            title="Pending Review"
            value={stats.pending}
            bgColor={isDark ? "bg-yellow-900 border-yellow-700 text-yellow-200" : "bg-yellow-50 border-yellow-200 text-yellow-900"}
            isLoading={isStatsLoading}
            icon="⏳"
          />
          
          <StatsCard
            title="Successful"
            value={stats.successful}
            bgColor={isDark ? "bg-green-900 border-green-700 text-green-200" : "bg-green-50 border-green-200 text-green-900"}
            isLoading={isStatsLoading}
            icon="✅"
          />
          
          <StatsCard
            title="Rejected"
            value={stats.rejected}
            bgColor={isDark ? "bg-red-900 border-red-700 text-red-200" : "bg-red-50 border-red-200 text-red-900"}
            isLoading={isStatsLoading}
            icon="❌"
          />
          
          <StatsCard
            title="Success Rate"
            value={`${stats.successRate.toFixed(1)}%`}
            bgColor={isDark ? "bg-blue-900 border-blue-700 text-blue-200" : "bg-blue-50 border-blue-200 text-blue-900"}
            isLoading={isStatsLoading}
            icon="📈"
            subtitle={stats.total > 0 ? `${stats.successful}/${stats.successful + stats.rejected}` : "N/A"}
          />
        </div>
      </div>

      {/* Pending Submissions Section */}
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-slate-800"}`}> 
          Pending Submissions ({pendingSubmissions.length})
        </h2>
        <p className={`${isDark ? "text-gray-400" : "text-slate-600"}`}> 
          Review and approve waste submissions from users.
        </p>
      </div>

      {/* Your existing pending submissions UI would continue here */}
      {/* ...existing code for pending submissions... */}
    </div>
  );
};

export default SubmissionsTab;