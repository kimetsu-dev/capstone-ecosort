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
} from "lucide-react";

// 1. Import the Ledger Service
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
  const navigate = useNavigate();

  // State vars
  const [wasteTypes, setWasteTypes] = useState([]);
  const [type, setType] = useState("");
  const [weight, setWeight] = useState("");
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

        if (types.length > 0 && (!type || !types.find((t) => t.name === type))) {
          setType(types[0].name);
        }
      },
      (error) => {
        console.error("Failed to load waste types:", error);
      }
    );
    // Unsubscribe on cleanup
    return unsubscribe;
  }, [type]);

  // Show toast helper
  const showToast = (message, type = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "info" }), 4000);
  };

  const closeToast = () => {
    setToast({ visible: false, message: "", type: "info" });
  };

  // Calculate points for submission
  const calculatePoints = (wasteTypeName, weightKg) => {
    const wt = wasteTypes.find((wt) => wt.name === wasteTypeName);
    const pointsPerKilo = wt ? wt.pointsPerKilo : 0;
    const weightNum = parseFloat(weightKg);
    if (isNaN(weightNum) || weightNum <= 0) return 0;
    return Math.round(weightNum * pointsPerKilo);
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const weightNum = parseFloat(weight);

    if (!type) {
      showToast("Please select a waste type.", "error");
      return;
    }

    if (isNaN(weightNum) || weightNum <= 0) {
      showToast("Please enter a valid positive weight.", "error");
      return;
    }

    if (!user) {
      showToast("You need to be logged in to submit waste.", "error");
      return;
    }

    setLoading(true);
    try {
      const points = calculatePoints(type, weightNum);

      // 2. Create the DB record and capture the reference
      const docRef = await addDoc(collection(db, "waste_submissions"), {
        userId: user.uid,
        userEmail: user.email,
        type,
        weight: weightNum,
        points,
        status: "pending",
        submittedAt: serverTimestamp(),
      });

      // ---------------------------------------------------------
      // 3. BLOCKCHAIN INTEGRATION
      // ---------------------------------------------------------
      // We record the submission on the immutable ledger.
      // We include the 'docRef.id' to cryptographically link the 
      // off-chain database to the on-chain ledger.
      await addToLedger(
        user.uid, 
        "WASTE_SUBMIT", // Action Type
        points,         // Points to be earned
        { 
          wasteType: type, 
          weight: weightNum,
          firestoreId: docRef.id, // The link to the central DB
          status: 'pending_approval'
        }
      );
      // ---------------------------------------------------------

      showToast("Submission hashed & recorded! Points pending confirmation.", "success");

      // Reset form
      setWeight("");
      setType(wasteTypes.length > 0 ? wasteTypes[0].name : "");
    } catch (err) {
      console.error("Error submitting waste:", err.message || err);
      showToast(`Submission failed: ${err.message || "Unknown error"}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Helper variables
  const estimatedPoints = calculatePoints(type, weight);
  const selectedWasteType = wasteTypes.find((wt) => wt.name === type);

  return (
    <>
      {/* FIXED SECTION: 
        The fixed header with the 'Back to Dashboard' button has been removed.
        Navigation is now handled entirely by the parent Dashboard component (sidebar or PWA menu).
      */}
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
                Transform your recyclables into valuable points and make a positive environmental impact
              </p>
            </div>

            {/* Important Confirmation Note */}
            <div
              className={`mb-8 rounded-xl p-5 border ${
                isDark ? "bg-yellow-900/40 border-yellow-700 text-yellow-300" : "bg-yellow-50 border-yellow-300 text-yellow-800"
              } backdrop-blur-sm max-w-3xl mx-auto`}
            >
              <div className="flex items-start gap-3">
                <Info className={`w-7 h-7 flex-shrink-0 ${isDark ? "text-yellow-400" : "text-yellow-600"}`} />
                <div>
                  <p className="font-semibold text-lg mb-1">Blockchain Secured:</p>
                  <p className="text-sm sm:text-base leading-relaxed">
                    Your submission will be <strong>cryptographically hashed</strong> and added to our immutable ledger immediately. Points will be unlocked after onsite verification.
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
              {/* Main Form - Takes 2 columns on XL screens */}
              <div className="xl:col-span-2">
                <form
                  onSubmit={handleSubmit}
                  className={`${styles.cardBackground} ${styles.backdropBlur} rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 lg:p-10 border ${styles.cardBorder}`}
                >
                  {/* Waste Type Selection */}
                  <div className="mb-6 sm:mb-8">
                    <label
                      htmlFor="waste-type"
                      className={`flex items-center text-lg sm:text-xl font-semibold mb-4 ${styles.textPrimary}`}
                    >
                      <Recycle className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-green-600" />
                      Waste Type
                    </label>
                    <div className="relative">
                      <select
                        id="waste-type"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        disabled={loading || wasteTypes.length === 0}
                        className={`w-full p-4 sm:p-5 border rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-base sm:text-lg font-medium disabled:opacity-50 backdrop-blur-sm ${
                          isDark
                            ? "bg-gray-800 border-gray-600 text-white"
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
                      {selectedWasteType && (
                        <div
                          className={`mt-3 sm:mt-4 text-sm sm:text-base rounded-xl p-3 sm:p-4 border ${
                            isDark ? "bg-green-900/20 border-green-700/50 text-green-300" : "bg-green-50 border-green-200 text-green-700"
                          } backdrop-blur-sm`}
                        >
                          <div className="flex items-center">
                            <Award className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600 flex-shrink-0" />
                            <span>
                              <strong className="font-semibold">{selectedWasteType.pointsPerKilo}</strong> points per kilogram
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Weight Input */}
                  <div className="mb-6 sm:mb-8">
                    <label
                      htmlFor="weight"
                      className={`flex items-center text-lg sm:text-xl font-semibold mb-4 ${styles.textPrimary}`}
                    >
                      <Scale className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-green-600" />
                      Weight (kg)
                    </label>
                    <div className="relative">
                      <input
                        id="weight"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        required
                        disabled={loading}
                        className={`w-full p-4 sm:p-5 border rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 transition-all duration-300 text-base sm:text-lg font-medium disabled:opacity-50 backdrop-blur-sm pr-12 sm:pr-16 ${
                          weight && parseFloat(weight) > 0
                            ? "border-green-300 focus:ring-green-500 focus:border-transparent " + (isDark ? "bg-green-900/30 text-green-100" : "bg-green-50/30 text-green-700")
                            : weight
                            ? "border-red-300 focus:ring-red-500 " + (isDark ? "bg-red-900/30 text-red-300" : "bg-red-50/30 text-red-700")
                            : isDark
                            ? "border-gray-600 focus:ring-green-500 focus:border-transparent bg-gray-800 text-white"
                            : "border-gray-300 focus:ring-green-500 focus:border-transparent bg-white text-gray-900"
                        }`}
                        placeholder="Enter weight (e.g., 1.50)"
                      />
                      <div className={`absolute right-4 sm:right-5 top-1/2 transform -translate-y-1/2 ${isDark ? "text-gray-400" : "text-gray-500"} pointer-events-none font-medium`}>
                        kg
                      </div>
                    </div>
                    {weight && parseFloat(weight) <= 0 && (
                      <div className="mt-2 sm:mt-3 flex items-center text-red-600 text-sm sm:text-base">
                        <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                        Please enter a positive weight
                      </div>
                    )}
                  </div>

                  {/* Points Calculator */}
                  {weight && parseFloat(weight) > 0 && (
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
                              Estimated Points
                            </h3>
                            <p className={`text-sm sm:text-base`}>
                              {weight} kg × {selectedWasteType?.pointsPerKilo || 0} points/kg
                            </p>
                          </div>
                        </div>
                        <div className="text-center sm:text-right">
                          <div className="text-2xl sm:text-3xl lg:text-4xl font-bold flex items-center justify-center sm:justify-end gap-2 text-green-600">
                            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                            {estimatedPoints}
                          </div>
                          <div className="text-sm sm:text-base font-medium text-green-600">points</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !weight || parseFloat(weight) <= 0 || wasteTypes.length === 0}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-3 text-base sm:text-lg lg:text-xl"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                        <span>Hashing & Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="hidden sm:inline">Submit for {estimatedPoints} Points</span>
                        <span className="sm:hidden">Submit ({estimatedPoints} pts)</span>
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
                        Your submission will be reviewed by our admin team. Points will be credited to your account once approved. This helps us maintain quality and accuracy in our recycling program.
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
                      <div className={`mt-3 pt-3 border-t ${
                        isDark ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-600"
                      }`}>
                        <p className="text-xs sm:text-sm italic">
                          * Final points = weight × rate per kg
                        </p>
                      </div>
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
                    Every kilogram you recycle helps reduce landfill waste and conserves natural resources for future generations.
                  </p>
                  {weight && parseFloat(weight) > 0 && (
                    <div
                      className={`${isDark ? "bg-green-900/40 border-green-700/70 text-green-300" : "bg-white border-green-200 text-green-800"} rounded-lg p-3 sm:p-4 border backdrop-blur-sm`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-green-800" : "bg-green-100"}`}>
                          <Recycle className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-sm sm:text-base">
                          <strong className="text-green-700">{weight} kg</strong> of waste diverted from landfills!</p>
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