import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  runTransaction,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Gift, 
  Loader2,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";

export default function MyRedemptions() {
  const { currentUser } = useAuth();
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState(null);
  const [visibleCodes, setVisibleCodes] = useState(new Set());
  const [copiedCode, setCopiedCode] = useState(null);

  const navigate = useNavigate();
  const ArrowLeft = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      setRedemptions([]);
      return;
    }

    const redemptionsQuery = query(
      collection(db, "redemptions"),
      where("userId", "==", currentUser.uid),
      orderBy("redeemedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      redemptionsQuery,
      (snapshot) => {
        setRedemptions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Failed to load redemptions:", err);
        setError("Failed to load your redemptions: " + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const cancelRedemption = async (redemption) => {
    if (!window.confirm("Cancel this redemption? Points will be refunded.")) return;

    setCancellingId(redemption.id);
    setError(null);

    try {
      await runTransaction(db, async (transaction) => {
        const redemptionRef = doc(db, "redemptions", redemption.id);
        const userRef = doc(db, "users", currentUser.uid);

        const redemptionSnap = await transaction.get(redemptionRef);
        const userSnap = await transaction.get(userRef);

        if (!redemptionSnap.exists()) throw new Error("Redemption record no longer exists.");
        if (!userSnap.exists()) throw new Error("User record does not exist.");

        const redemptionData = redemptionSnap.data();
        if (redemptionData.status !== "pending") {
          throw new Error("Only pending redemptions can be cancelled.");
        }

        const refundPoints = redemptionData.cost ?? 0;
        const currentPoints = userSnap.data().totalPoints ?? 0;

        transaction.update(redemptionRef, {
          status: "cancelled",
          cancelledAt: new Date(),
        });

        transaction.update(userRef, { totalPoints: currentPoints + refundPoints });
      });
      alert("Redemption cancelled and points refunded.");
    } catch (err) {
      console.error("Error cancelling redemption:", err);
      alert(err.message || "Failed to cancel redemption. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  const toggleCodeVisibility = (id) => {
    setVisibleCodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-lg text-gray-600">Loading your redemptions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center">
          <AlertCircle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">Error Loading Redemptions</h3>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <Gift className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-blue-800 mb-2">Sign In Required</h2>
          <p className="text-blue-600">Please log in to view your redemptions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft />
            <span className="font-medium">Dashboard</span>
            </button>
          </div>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center">
          <Gift className="w-8 h-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Redemptions</h1>
            <p className="text-gray-600 mt-1">Track and manage your reward redemptions</p>
          </div>
        </div>
      </div>

      {redemptions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Redemptions Yet</h3>
          <p className="text-gray-600">You haven't redeemed any rewards yet. Start earning points to unlock amazing rewards!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Reward
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Redemption Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {redemptions.map(({ id, rewardId, redemptionCode, status, redeemedAt }) => (
                  <tr key={id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">Reward #{rewardId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="font-mono text-sm bg-gray-100 px-3 py-1 rounded border">
                          {visibleCodes.has(id) ? redemptionCode : '••••••••'}
                        </div>
                        <button
                          onClick={() => toggleCodeVisibility(id)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title={visibleCodes.has(id) ? "Hide code" : "Show code"}
                        >
                          {visibleCodes.has(id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        {visibleCodes.has(id) && (
                          <button
                            onClick={() => copyToClipboard(redemptionCode, id)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Copy code"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        {copiedCode === id && (
                          <span className="text-xs text-green-600 font-medium">Copied!</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        <span className="ml-2 capitalize">{status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {redeemedAt?.toDate ? redeemedAt.toDate().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      {status === "pending" ? (
                        <button
                          onClick={() => cancelRedemption({ id, rewardId })}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                          disabled={cancellingId === id}
                        >
                          {cancellingId === id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-500 italic capitalize">{status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-gray-200">
            {redemptions.map(({ id, rewardId, redemptionCode, status, redeemedAt }) => (
              <div key={id} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Reward #{rewardId}</h3>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                    <span className="ml-1 capitalize">{status}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Redemption Code:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {visibleCodes.has(id) ? redemptionCode : '••••••••'}
                      </span>
                      <button
                        onClick={() => toggleCodeVisibility(id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        {visibleCodes.has(id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {visibleCodes.has(id) && (
                        <button
                          onClick={() => copyToClipboard(redemptionCode, id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Date:</span>
                    <span className="text-sm text-gray-600">
                      {redeemedAt?.toDate ? redeemedAt.toDate().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : "N/A"}
                    </span>
                  </div>
                </div>

                {status === "pending" && (
                  <button
                    onClick={() => cancelRedemption({ id, rewardId })}
                    className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                    disabled={cancellingId === id}
                  >
                    {cancellingId === id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Redemption
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Important Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start">
          <AlertCircle className="w-6 h-6 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-amber-800 mb-2">Important Reminder</h3>
            <p className="text-amber-700">
              Remember to show your redemption code onsite to claim your reward. Keep your codes secure and only share them when redeeming.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}