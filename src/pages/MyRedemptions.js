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
import { useNavigate, useLocation } from "react-router-dom";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Gift,
  Loader2,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

export default function MyRedemptions() {
  const { currentUser } = useAuth();
  const { isDark } = useTheme() || {};

  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState(null);
  const [visibleCodes, setVisibleCodes] = useState(new Set());
  const [copiedCode, setCopiedCode] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const ArrowLeft = () => (
    <svg
      className={`${isDark ? "text-gray-300" : "text-gray-700"} w-4 h-4`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );

    useEffect(() => {
      if (!currentUser || !currentUser.uid) {
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
    setVisibleCodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const copyToClipboard = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return isDark
          ? "bg-yellow-700 text-yellow-300 border-yellow-600"
          : "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return isDark
          ? "bg-green-700 text-green-300 border-green-600"
          : "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return isDark
          ? "bg-red-700 text-red-300 border-red-600"
          : "bg-red-100 text-red-800 border-red-200";
      default:
        return isDark
          ? "bg-gray-700 text-gray-300 border-gray-600"
          : "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Back button handler: go to profile if came from profile, else back or dashboard
  const handleBack = () => {
    if (location.state && location.state.from === "/profile") {
      navigate("/profile");
    } else {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/dashboard");
      }
    }
  };

  if (loading) {
    return (
      <div className={`${isDark ? "bg-gray-900" : ""} max-w-6xl mx-auto p-6`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className={`w-8 h-8 animate-spin ${isDark ? "text-blue-400" : "text-blue-600"}`} />
          <span className={`${isDark ? "text-gray-200" : "text-gray-600"} ml-3 text-lg`}>Loading your redemptions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`max-w-6xl mx-auto p-6 ${isDark ? "bg-gray-900" : ""}`}>
        <div
          className={`rounded-lg p-6 flex items-center ${isDark ? "bg-red-900 border border-red-700" : "bg-red-50 border border-red-200"}`}
          role="alert"
        >
          <AlertCircle className={`w-6 h-6 mr-3 flex-shrink-0 ${isDark ? "text-red-400" : "text-red-500"}`} />
          <div>
            <h3 className={`text-lg font-semibold mb-1 ${isDark ? "text-red-300" : "text-red-800"}`}>Error Loading Redemptions</h3>
            <p className={`${isDark ? "text-red-400" : "text-red-600"}`}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={`max-w-6xl mx-auto p-6 ${isDark ? "bg-gray-900" : ""}`}>
        <div className={`rounded-lg p-8 text-center ${isDark ? "bg-blue-900 border border-blue-700 text-blue-300" : "bg-blue-50 border border-blue-200 text-blue-800"}`}>
          <Gift className={`w-12 h-12 mx-auto mb-4 ${isDark ? "text-blue-400" : "text-blue-500"}`} />
          <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
          <p>Please log in to view your redemptions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto p-6 space-y-6 ${isDark ? "bg-gray-900 text-gray-200" : ""}`}>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={handleBack}
          className={`flex items-center gap-2 transition-colors ${isDark ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
          aria-label="Back"
        >
          <ArrowLeft />
          <span className="font-medium">Back</span>
        </button>
      </div>

      <div className={`rounded-xl p-6 border flex items-center gap-4 ${isDark ? "bg-blue-900 border-blue-700 text-blue-300" : "bg-blue-50 border-blue-100 text-blue-800"}`}>
        <Gift className="w-8 h-8" />
        <div>
          <h1 className="text-3xl font-bold">My Redemptions</h1>
          <p className="mt-1">Track and manage your reward redemptions</p>
        </div>
      </div>

      {redemptions.length === 0 ? (
        <div className={`rounded-xl border p-12 text-center ${isDark ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-white border-gray-200 text-gray-900"}`}>
          <Gift className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Redemptions Yet</h3>
          <p>You haven't redeemed any rewards yet. Start earning points to unlock amazing rewards!</p>
        </div>
      ) : (
        <div className={`rounded-xl overflow-hidden shadow-sm ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className={`${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"} border-b`}>
                <tr>
                  {["Reward","Redemption Code","Status","Date","Actions"].map((header) => (
                    <th
                      key={header}
                      className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-gray-600" : "divide-gray-200"}`}>
                {redemptions.map(({ id, rewardId, redemptionCode, status, redeemedAt }) => (
                  <tr
                    key={id}
                    className={`hover:${isDark ? "bg-gray-700" : "bg-gray-50"} transition-colors duration-150 cursor-default`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      Reward #{rewardId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className={`${isDark ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-gray-100 text-gray-700 border-gray-300"} font-mono text-sm px-3 py-1 rounded border select-text`}>
                          {visibleCodes.has(id) ? redemptionCode : "••••••••"}
                        </div>
                        <button
                          onClick={() => toggleCodeVisibility(id)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title={visibleCodes.has(id) ? "Hide code" : "Show code"}
                          aria-label={visibleCodes.has(id) ? "Hide redemption code" : "Show redemption code"}
                          type="button"
                        >
                          {visibleCodes.has(id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        {visibleCodes.has(id) && (
                          <button
                            onClick={() => copyToClipboard(redemptionCode, id)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            type="button"
                            aria-label="Copy redemption code to clipboard"
                            title="Copy code"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        {copiedCode === id && (
                          <span className="text-xs text-green-500 font-medium select-none">Copied!</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        <span className="ml-2 capitalize">{status}</span>
                      </div>
                    </td>
                    <td className={`${isDark ? "text-gray-300" : "text-gray-600"} px-6 py-4 whitespace-nowrap text-sm`}>
                      {redeemedAt?.toDate
                        ? redeemedAt.toDate().toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {status === "pending" ? (
                        <button
                          onClick={() => cancelRedemption({ id, rewardId })}
                          className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 transition-colors duration-150 ${
                            isDark
                              ? "text-red-400 bg-red-900 border-red-700 hover:bg-red-800 focus:ring-red-600 disabled:opacity-50"
                              : "text-red-700 bg-red-50 border-red-200 hover:bg-red-100 focus:ring-red-500 disabled:opacity-50"
                          }`}
                          disabled={cancellingId === id}
                          type="button"
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
                        <span className={`${isDark ? "text-gray-400 italic" : "text-gray-500 italic"} text-sm capitalize`}>
                          {status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className={`${isDark ? "divide-gray-700" : "divide-gray-200"} lg:hidden divide-y`}>
            {redemptions.map(({ id, rewardId, redemptionCode, status, redeemedAt }) => (
              <div key={id} className={`space-y-4 p-6 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`${isDark ? "text-gray-200" : "text-gray-900"} font-semibold`}>
                    Reward #{rewardId}
                  </h3>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                    <span className="ml-1 capitalize">{status}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`${isDark ? "text-gray-300" : "text-gray-700"} text-sm font-medium`}>Redemption Code:</span>
                    <div className="flex items-center space-x-2">
                      <span className={`${isDark ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-gray-100 text-gray-700 border-gray-300"} font-mono text-sm px-2 py-1 rounded border select-text`}>
                        {visibleCodes.has(id) ? redemptionCode : "••••••••"}
                      </span>
                      <button
                        onClick={() => toggleCodeVisibility(id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        type="button"
                        aria-label={visibleCodes.has(id) ? "Hide redemption code" : "Show redemption code"}
                        title={visibleCodes.has(id) ? "Hide code" : "Show code"}
                      >
                        {visibleCodes.has(id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {visibleCodes.has(id) && (
                        <button
                          onClick={() => copyToClipboard(redemptionCode, id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          type="button"
                          aria-label="Copy redemption code to clipboard"
                          title="Copy code"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`${isDark ? "text-gray-300" : "text-gray-700"} text-sm font-medium`}>Date:</span>
                    <span className={`${isDark ? "text-gray-400" : "text-gray-600"} text-sm`}>
                      {redeemedAt?.toDate
                        ? redeemedAt.toDate().toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {status === "pending" && (
                  <button
                    onClick={() => cancelRedemption({ id, rewardId })}
                    className={`w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 transition-colors duration-150 ${
                      isDark
                        ? "text-red-400 bg-red-900 border-red-700 hover:bg-red-800 focus:ring-red-600 disabled:opacity-50"
                        : "text-red-700 bg-red-50 border-red-200 hover:bg-red-100 focus:ring-red-500 disabled:opacity-50"
                    }`}
                    disabled={cancellingId === id}
                    type="button"
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
      <div className={`rounded-xl p-6 border flex items-start gap-4 ${isDark ? "bg-amber-900 border-amber-700 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
        <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-semibold mb-2">Important Reminder</h3>
          <p>
            Remember to show your redemption code onsite to claim your reward. Keep your codes secure and only share them when redeeming.
          </p>
        </div>
      </div>
    </div>
  );
}
