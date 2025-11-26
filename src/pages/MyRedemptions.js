import React, { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  runTransaction,
  getDocs
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
  ShieldCheck, // New: Blockchain Icon
  Link,        // New: Chain Icon
  Hash,        // New: Hash Icon
  Box,         // New: Block Icon
  X            // New: Close Icon
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

// --- NEW COMPONENT: Blockchain Details Modal ---
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
                Verified Redemption
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
              <strong>Secure Redemption:</strong> This transaction is recorded on the EcoSort ledger. The digital fingerprint proves your reward claim is authentic and has not been altered.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyRedemptions() {
  const { currentUser } = useAuth();
  const { isDark } = useTheme() || {};

  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState(null);
  const [visibleCodes, setVisibleCodes] = useState(new Set());
  const [copiedCode, setCopiedCode] = useState(null);

  // Blockchain State
  const [ledgerMap, setLedgerMap] = useState({});
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);

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

  // Fetch Blockchain Ledger Data
  const fetchLedger = useCallback(async () => {
    if (!currentUser) return;

    try {
      const q = query(collection(db, "ledger"), where("userId", "==", currentUser.uid));
      const snapshot = await getDocs(q);
      
      const map = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Map ledger block to firestore ID (redemption ID)
        if (data.metadata && data.metadata.firestoreId) {
          map[data.metadata.firestoreId] = {
            id: doc.id,
            ...data
          };
        }
      });
      
      setLedgerMap(map);
    } catch (err) {
      console.error("Error fetching ledger:", err);
    }
  }, [currentUser]);

  // Load Redemptions & Ledger
  useEffect(() => {
    if (!currentUser || !currentUser.uid) {
      setLoading(false);
      setRedemptions([]);
      return;
    }

    // Fetch Ledger
    fetchLedger();

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
  }, [currentUser, fetchLedger]);

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

  // Handle viewing block details
  const handleViewBlock = (redemptionId) => {
    const block = ledgerMap[redemptionId];
    if (block) {
      setSelectedBlock(block);
      setShowBlockModal(true);
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

  // Back button handler
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
      
      {/* Blockchain Verification Modal */}
      <BlockDetailModal 
        visible={showBlockModal} 
        block={selectedBlock} 
        onClose={() => setShowBlockModal(false)} 
      />

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
                {redemptions.map((item) => {
                  // Check if this item is on the blockchain
                  const ledgerBlock = ledgerMap[item.id];
                  
                  return (
                    <tr
                      key={item.id}
                      // Make row clickable if on blockchain
                      onClick={() => ledgerBlock && handleViewBlock(item.id)}
                      className={`transition-colors duration-150 ${
                        ledgerBlock ? "cursor-pointer group" : "cursor-default"
                      } hover:${isDark ? "bg-gray-700" : "bg-gray-50"}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">Reward #{item.rewardId}</span>
                            {/* Hover Shield */}
                            {ledgerBlock && (
                              <ShieldCheck className="w-4 h-4 text-green-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-2">
                          <div className={`${isDark ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-gray-100 text-gray-700 border-gray-300"} font-mono text-sm px-3 py-1 rounded border select-text`}>
                            {visibleCodes.has(item.id) ? item.redemptionCode : "••••••••"}
                          </div>
                          <button
                            onClick={() => toggleCodeVisibility(item.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            type="button"
                          >
                            {visibleCodes.has(item.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          {visibleCodes.has(item.id) && (
                            <button
                              onClick={() => copyToClipboard(item.redemptionCode, item.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              type="button"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                          {copiedCode === item.id && (
                            <span className="text-xs text-green-500 font-medium select-none">Copied!</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className={`inline-flex items-center w-fit px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-2 capitalize">{item.status}</span>
                          </div>
                          {/* Verification Badge */}
                          {ledgerBlock && (
                             <div className="flex items-center gap-1 text-[10px] text-green-500 font-semibold ml-1">
                                <ShieldCheck className="w-3 h-3" /> Verified on Chain
                             </div>
                          )}
                        </div>
                      </td>
                      <td className={`${isDark ? "text-gray-300" : "text-gray-600"} px-6 py-4 whitespace-nowrap text-sm`}>
                        {item.redeemedAt?.toDate
                          ? item.redeemedAt.toDate().toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {item.status === "pending" ? (
                          <button
                            onClick={() => cancelRedemption(item)}
                            className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 transition-colors duration-150 ${
                              isDark
                                ? "text-red-400 bg-red-900 border-red-700 hover:bg-red-800 focus:ring-red-600 disabled:opacity-50"
                                : "text-red-700 bg-red-50 border-red-200 hover:bg-red-100 focus:ring-red-500 disabled:opacity-50"
                            }`}
                            disabled={cancellingId === item.id}
                            type="button"
                          >
                            {cancellingId === item.id ? (
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
                            {item.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className={`${isDark ? "divide-gray-700" : "divide-gray-200"} lg:hidden divide-y`}>
            {redemptions.map((item) => {
              const ledgerBlock = ledgerMap[item.id];
              
              return (
                <div 
                  key={item.id} 
                  onClick={() => ledgerBlock && handleViewBlock(item.id)}
                  className={`space-y-4 p-6 relative overflow-hidden ${
                    isDark ? "bg-gray-800" : "bg-white"
                  } ${ledgerBlock ? "cursor-pointer" : ""}`}
                >
                  {/* Verified Background Glow */}
                  {ledgerBlock && (
                    <div className="absolute top-0 right-0 p-1 pointer-events-none">
                       <div className="bg-gradient-to-bl from-green-500/20 to-transparent w-16 h-16 absolute top-0 right-0 -mr-8 -mt-8 rounded-full blur-xl"></div>
                    </div>
                  )}

                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <h3 className={`${isDark ? "text-gray-200" : "text-gray-900"} font-semibold`}>
                        Reward #{item.rewardId}
                      </h3>
                      {ledgerBlock && <ShieldCheck className="w-4 h-4 text-green-500" />}
                    </div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                      <span className="ml-1 capitalize">{item.status}</span>
                    </div>
                  </div>

                  {/* Mobile Verification Status */}
                  {ledgerBlock && (
                    <div className={`text-[10px] px-2 py-1 rounded w-fit flex items-center gap-1 border ${
                      isDark ? "bg-green-900/20 border-green-800 text-green-400" : "bg-green-50 border-green-200 text-green-700"
                    }`}>
                      <ShieldCheck className="w-3 h-3" /> Authenticated Record
                    </div>
                  )}

                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <span className={`${isDark ? "text-gray-300" : "text-gray-700"} text-sm font-medium`}>Redemption Code:</span>
                      <div className="flex items-center space-x-2">
                        <span className={`${isDark ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-gray-100 text-gray-700 border-gray-300"} font-mono text-sm px-2 py-1 rounded border select-text`}>
                          {visibleCodes.has(item.id) ? item.redemptionCode : "••••••••"}
                        </span>
                        <button
                          onClick={() => toggleCodeVisibility(item.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          type="button"
                        >
                          {visibleCodes.has(item.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        {visibleCodes.has(item.id) && (
                          <button
                            onClick={() => copyToClipboard(item.redemptionCode, item.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            type="button"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`${isDark ? "text-gray-300" : "text-gray-700"} text-sm font-medium`}>Date:</span>
                      <span className={`${isDark ? "text-gray-400" : "text-gray-600"} text-sm`}>
                        {item.redeemedAt?.toDate
                          ? item.redeemedAt.toDate().toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "N/A"}
                      </span>
                    </div>
                  </div>

                  {item.status === "pending" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelRedemption(item);
                      }}
                      className={`w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 transition-colors duration-150 ${
                        isDark
                          ? "text-red-400 bg-red-900 border-red-700 hover:bg-red-800 focus:ring-red-600 disabled:opacity-50"
                          : "text-red-700 bg-red-50 border-red-200 hover:bg-red-100 focus:ring-red-500 disabled:opacity-50"
                      }`}
                      disabled={cancellingId === item.id}
                      type="button"
                    >
                      {cancellingId === item.id ? (
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
              );
            })}
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