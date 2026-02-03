import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  Recycle,
  Scale,
  Award,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  ArrowRight,
  Trophy,
  Calculator,
  X,
  ArrowLeft,
  Leaf,
  Target,
  Sparkles,
  TrendingUp,
  Plus,
  Trash2,
  Layers
} from "lucide-react";

// Import the Ledger Service
import { addToLedger } from '../utils/ledgerService';

function Toast({ visible, message, type, onClose }) {
  if (!visible) return null;

  const configs = {
    success: {
      bg: "bg-green-600",
      icon: CheckCircle,
      iconColor: "text-green-100",
    },
    error: {
      bg: "bg-red-600",
      icon: AlertCircle,
      iconColor: "text-red-100",
    },
    info: {
      bg: "bg-blue-600",
      icon: Info,
      iconColor: "text-blue-100",
    },
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:top-6 z-50 animate-slide-in">
      <div
        className={`${config.bg} text-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-xl flex items-center space-x-3 max-w-sm mx-auto sm:mx-0`}
      >
        <Icon className={`${config.iconColor} w-5 h-5 flex-shrink-0`} />
        <span className="font-medium text-sm sm:text-base flex-1">{message}</span>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors flex-shrink-0"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function SubmitWaste() {
  const { user } = useUser();
  const { styles, isDark } = useTheme();
  
  // State vars
  const [wasteTypes, setWasteTypes] = useState([]);
  
  // Array of entries: { id: timestamp, wasteType: string, weight: string }
  const [entries, setEntries] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  const [showPointsReference, setShowPointsReference] = useState(false);

  // Fetch waste types real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "waste_types"),
      (snapshot) => {
        const types = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            pointsPerKilo: data.pointsPerKilo ?? 0,
          };
        });
        setWasteTypes(types);

        // Initialize with one empty row if no entries exist and types are loaded
        if (entries.length === 0 && types.length > 0) {
          setEntries([{ id: Date.now(), wasteType: types[0].name, weight: "" }]);
        }
      },
      (error) => {
        console.error("Failed to load waste types:", error);
      }
    );
    return unsubscribe;
  }, []);

  // Show toast helper
  const showToast = (message, type = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "info" }), 4000);
  };

  const closeToast = () => {
    setToast({ visible: false, message: "", type: "info" });
  };

  // --- ENTRY MANAGEMENT ---

  const handleAddEntry = () => {
    if (wasteTypes.length === 0) return;
    setEntries([
      ...entries,
      { id: Date.now(), wasteType: wasteTypes[0].name, weight: "" }
    ]);
  };

  const handleRemoveEntry = (id) => {
    if (entries.length <= 1) {
      showToast("You must have at least one item.", "info");
      return;
    }
    setEntries(entries.filter(entry => entry.id !== id));
  };

  const handleEntryChange = (id, field, value) => {
    setEntries(entries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  // --- CALCULATIONS ---

  const getPointsRate = (typeName) => {
    const wt = wasteTypes.find(t => t.name === typeName);
    return wt ? wt.pointsPerKilo : 0;
  };

  // Calculate totals for the summary
  const totals = entries.reduce((acc, entry) => {
    const weightNum = parseFloat(entry.weight);
    if (!isNaN(weightNum) && weightNum > 0) {
      const points = Math.round(weightNum * getPointsRate(entry.wasteType));
      return {
        weight: acc.weight + weightNum,
        points: acc.points + points
      };
    }
    return acc;
  }, { weight: 0, points: 0 });

  // Check if this is truly a mixed bundle (2+ items)
  const isMixedBundle = entries.length > 1;

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      showToast("You need to be logged in to submit waste.", "error");
      return;
    }

    // Validation
    const invalidEntry = entries.find(ent => !ent.wasteType || isNaN(parseFloat(ent.weight)) || parseFloat(ent.weight) <= 0);
    if (invalidEntry) {
      showToast("Please ensure all items have valid positive weights.", "error");
      return;
    }

    setLoading(true);
    try {
      let payload = {
        userId: user.uid,
        userEmail: user.email,
        status: "pending",
        submittedAt: serverTimestamp(),
      };

      // REFINED LOGIC: Only create bundle structure if multiple items
      if (entries.length === 1) {
        // SINGLE ITEM - Simple structure
        const singleItem = entries[0];
        const weight = parseFloat(singleItem.weight);
        const points = Math.round(weight * getPointsRate(singleItem.wasteType));
        
        payload = {
          ...payload,
          type: singleItem.wasteType,
          weight: weight,
          points: points
          // No 'items' array - clean single submission
        };
      } else {
        // MIXED BUNDLE - Only when 2+ items
        const itemsPayload = entries.map(ent => ({
          wasteType: ent.wasteType,
          weight: parseFloat(ent.weight),
          points: Math.round(parseFloat(ent.weight) * getPointsRate(ent.wasteType))
        }));

        payload = {
          ...payload,
          type: "Mixed Bundle",
          items: itemsPayload,
          totalWeight: totals.weight,
          points: totals.points
        };
      }

      // Save to Firestore
      const docRef = await addDoc(collection(db, "waste_submissions"), payload);

      // Add to Blockchain Ledger
      await addToLedger(
        user.uid, 
        "WASTE_SUBMIT", 
        payload.points,
        { 
          summary: payload.type, 
          weight: payload.weight || payload.totalWeight,
          items: payload.items || null,
          firestoreId: docRef.id,
          status: 'pending_approval'
        }
      );

      showToast(
        entries.length > 1 
          ? "Mixed bundle submitted successfully!" 
          : "Waste submission successful!", 
        "success"
      );
      
      // Reset to single empty entry
      setEntries([{ id: Date.now(), wasteType: wasteTypes[0]?.name || "", weight: "" }]);
      
    } catch (err) {
      console.error("Error:", err);
      showToast("Submission failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`App min-h-screen transition-all duration-300 ${styles.backgroundGradient}`}>
         <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">

            {/* Header Section */}
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4 sm:mb-6 shadow-xl">
                <Recycle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 sm:mb-4 ${styles.textPrimary}`}>
                Submit Waste
              </h1>
              <p className={`text-base sm:text-lg lg:text-xl max-w-2xl mx-auto ${styles.textSecondary}`}>
                Transform your recyclables into valuable points and make a positive environmental impact. {isMixedBundle ? "Bundle multiple items together!" : "Submit single items or create bundles."}
              </p>
            </div>

            

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
              {/* Main Form - Takes 2 columns on XL screens */}
              <div className="xl:col-span-2">
                <form
                  onSubmit={handleSubmit}
                  className={`${styles.cardBackground} ${styles.backdropBlur} rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 lg:p-10 border ${styles.cardBorder}`}
                >
                  
                  {/* Dynamic Entries List */}
                  <div className="space-y-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <label className={`flex items-center text-lg sm:text-xl font-semibold ${styles.textPrimary}`}>
                        {isMixedBundle ? (
                          <>
                            <Layers className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-green-600" />
                            Mixed Bundle
                          </>
                        ) : (
                          <>
                            <Recycle className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-green-600" />
                            Waste Item
                          </>
                        )}
                      </label>
                      <span className={`text-sm ${styles.textSecondary}`}>
                        {entries.length} {entries.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    {entries.map((entry, index) => {
                      const currentRate = getPointsRate(entry.wasteType);
                      const currentWeight = parseFloat(entry.weight);
                      const itemPoints = (!isNaN(currentWeight) && currentWeight > 0) 
                        ? Math.round(currentWeight * currentRate) 
                        : 0;

                      return (
                        <div 
                          key={entry.id} 
                          className={`relative p-4 rounded-xl border transition-all duration-300 animate-slide-down ${
                            isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          {/* Row Layout: Stack on mobile, Flex on desktop */}
                          <div className="flex flex-col sm:flex-row gap-4">
                            
                            {/* Waste Type Select */}
                            <div className="flex-1">
                              <label className={`block text-xs font-medium mb-1.5 ${styles.textSecondary}`}>
                                Type
                              </label>
                              <select
                                value={entry.wasteType}
                                onChange={(e) => handleEntryChange(entry.id, "wasteType", e.target.value)}
                                disabled={loading}
                                className={`w-full p-3 rounded-lg border focus:ring-2 focus:ring-green-500 outline-none transition-colors ${
                                  isDark
                                    ? "bg-gray-900 border-gray-600 text-white"
                                    : "bg-white border-gray-300 text-gray-900"
                                }`}
                                required
                              >
                                {wasteTypes.map(({ id, name }) => (
                                  <option key={id} value={name}>
                                    {name.charAt(0).toUpperCase() + name.slice(1)}
                                  </option>
                                ))}
                              </select>
                              <div className={`text-xs mt-1.5 flex items-center ${isDark ? "text-green-400" : "text-green-600"}`}>
                                <Award className="w-3 h-3 mr-1" />
                                {currentRate} pts/kg
                              </div>
                            </div>

                            {/* Weight Input */}
                            <div className="flex-1">
                              <label className={`block text-xs font-medium mb-1.5 ${styles.textSecondary}`}>
                                Weight (kg)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={entry.weight}
                                  onChange={(e) => handleEntryChange(entry.id, "weight", e.target.value)}
                                  placeholder="0.00"
                                  disabled={loading}
                                  className={`w-full p-3 rounded-lg border focus:ring-2 focus:ring-green-500 outline-none pr-10 ${
                                    isDark
                                      ? "bg-gray-900 border-gray-600 text-white"
                                      : "bg-white border-gray-300 text-gray-900"
                                  }`}
                                  required
                                />
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${styles.textSecondary}`}>kg</span>
                              </div>
                            </div>

                            {/* Estimated Points for this Row */}
                            <div className={`flex items-center justify-between sm:justify-end sm:w-32 rounded-lg px-4 py-2 sm:py-0 ${
                              isDark ? "bg-green-900/20" : "bg-green-50"
                            }`}>
                              <span className="sm:hidden text-sm font-medium text-green-600">Est. Points:</span>
                              <div className="text-right">
                                <div className="text-lg font-bold text-green-600">{itemPoints}</div>
                                <div className="text-[10px] uppercase tracking-wider text-green-600/70 hidden sm:block">Points</div>
                              </div>
                            </div>

                            {/* Remove Button */}
                            {isMixedBundle && (
                              <button
                                type="button"
                                onClick={() => handleRemoveEntry(entry.id)}
                                className="self-end sm:self-center p-2 rounded-lg transition-colors text-red-500 hover:bg-red-500/10"
                                title="Remove item"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Button */}
                    <button
                      type="button"
                      onClick={handleAddEntry}
                      disabled={loading}
                      className={`w-full py-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${
                        isDark 
                          ? "border-gray-700 hover:border-green-500/50 hover:bg-gray-800 text-gray-400 hover:text-green-400" 
                          : "border-gray-300 hover:border-green-500/50 hover:bg-gray-50 text-gray-600 hover:text-green-600"
                      }`}
                    >
                      <Plus className="w-5 h-5" />
                      {isMixedBundle ? "Add Another Item to Bundle" : "Create Mixed Bundle (Add Item)"}
                    </button>
                  </div>

                  {/* Grand Total Summary - Only show for bundles */}
                  {isMixedBundle && totals.points > 0 && (
                    <div
                      className={`mb-6 sm:mb-8 rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-inner ${
                        isDark
                          ? "bg-green-900/20 border-green-700/50 text-green-300"
                          : "bg-green-50 border-green-200 text-green-700"
                      } backdrop-blur-sm`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0 ${
                            isDark ? "bg-green-800" : "bg-green-100"
                          }`}>
                            <Calculator className={`w-5 h-5 sm:w-6 sm:h-6 text-green-600`} />
                          </div>
                          <div>
                            <h3 className={`font-semibold text-base sm:text-lg`}>
                              Bundle Total
                            </h3>
                            <p className={`text-sm sm:text-base opacity-90`}>
                              {entries.length} items • {totals.weight.toFixed(2)} kg total
                            </p>
                          </div>
                        </div>
                        <div className="text-center sm:text-right">
                          <div className="text-3xl sm:text-4xl lg:text-5xl font-bold flex items-center justify-center sm:justify-end gap-2 text-green-600">
                            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                            {totals.points}
                          </div>
                          <div className="text-sm sm:text-base font-medium text-green-600">total points</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Single Item Summary - Only show for single items */}
                  {!isMixedBundle && totals.points > 0 && (
                    <div
                      className={`mb-6 sm:mb-8 rounded-xl p-4 border ${
                        isDark
                          ? "bg-green-900/20 border-green-700/50 text-green-300"
                          : "bg-green-50 border-green-200 text-green-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm opacity-90">Estimated Points</div>
                          <div className="text-2xl font-bold text-green-600 mt-1">{totals.points} pts</div>
                        </div>
                        <Trophy className="w-8 h-8 text-green-600 opacity-60" />
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || totals.points === 0}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-3 text-base sm:text-lg lg:text-xl"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                        <span>Submitting {isMixedBundle ? "Bundle" : "Waste"}...</span>
                      </>
                    ) : (
                      <>
                        <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="hidden sm:inline">
                          {isMixedBundle ? "Submit Bundle" : "Submit Waste"}
                        </span>
                        <span className="sm:hidden">Submit ({totals.points} pts)</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Info Notice */}
                <div
                  className={`mt-6 rounded-xl sm:rounded-2xl p-4 sm:p-6 border ${
                    isDark ? "bg-blue-900/30 border-blue-700/50 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-800"
                  } backdrop-blur-sm`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isDark ? "bg-blue-800" : "bg-blue-100"
                    }`}>
                      <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 sm:mb-2 text-base sm:text-lg">
                        Submission Process
                      </h4>
                      <p className="text-sm sm:text-base leading-relaxed">
                        {isMixedBundle 
                          ? "Your submission will be reviewed by our admin team. Points will be credited to your account once approved. This helps us maintain quality and accuracy in our recycling program."
                          : "Your submission will be reviewed by our admin team. Points will be credited to your account once approved. This helps us maintain quality and accuracy in our recycling program."
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Points Reference */}
                <div className={`${styles.cardBackground} ${styles.backdropBlur} rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border ${styles.cardBorder}`}>
                  <h3 className={`text-base sm:text-lg font-semibold mb-4 ${styles.textPrimary} flex items-center`}>
                    <TrendingUp className="w-5 h-5 mr-2 sm:mr-3 text-green-600" />
                    Points Reference
                  </h3>
                  <button
                    onClick={() => setShowPointsReference(!showPointsReference)}
                    className={`w-full text-left p-3 sm:p-4 rounded-lg transition-all duration-200 flex items-center justify-between ${
                      isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    } backdrop-blur-sm`}
                  >
                    <span className="font-medium text-sm sm:text-base">View All Rates</span>
                    <ArrowRight
                      className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                        showPointsReference ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {showPointsReference && wasteTypes.length > 0 && (
                    <div className="mt-4 space-y-2 animate-slide-down overflow-auto max-h-64">
                      {wasteTypes.map(({ id, name, pointsPerKilo }) => (
                        <div
                          key={id}
                          className={`flex justify-between items-center py-2 sm:py-3 px-3 sm:px-4 rounded-lg border ${
                            isDark ? "bg-gray-900 border-gray-700 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"
                          }`}
                        >
                          <span className="font-medium capitalize text-sm sm:text-base">{name}</span>
                          <span className="font-bold text-green-600 text-sm sm:text-base">{pointsPerKilo} pts/kg</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Environmental Impact */}
                <div
                  className={`${styles.cardBackground} ${styles.backdropBlur} rounded-xl sm:rounded-2xl p-4 sm:p-6 border ${styles.cardBorder} shadow-lg`}
                >
                  <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center ${styles.textPrimary}`}>
                    <Leaf className="w-5 h-5 mr-2 sm:mr-3 text-green-600" />
                    Your Impact
                  </h3>
                  <p className={`text-sm sm:text-base mb-3 sm:mb-4 leading-relaxed ${styles.textSecondary}`}>
                    {isMixedBundle 
                      ? "Bundle multiple recyclables to maximize your environmental contribution."
                      : "Every kilogram of waste recycled makes a difference for our planet."
                    }
                  </p>
                  {totals.weight > 0 && (
                    <div
                      className={`${isDark ? "bg-green-900/40 border-green-700/70 text-green-300" : "bg-white border-green-200 text-green-800"} rounded-lg p-3 sm:p-4 border backdrop-blur-sm`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-green-800" : "bg-green-100"}`}>
                          <Recycle className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-sm sm:text-base">
                          <strong className="text-green-700">{totals.weight.toFixed(2)} kg</strong> waste diverted!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={closeToast} />

      {/* Animation keyframes */}
      <style>{`
    @keyframes slide-in {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slide-down {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-in { animation: slide-in 0.3s ease-out forwards; }
    .animate-slide-down { animation: slide-down 0.3s ease-out forwards; }
  `}</style>
    </>
  );
}