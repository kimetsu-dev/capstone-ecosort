import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
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
  TrendingUp,
  ArrowLeft,
  Leaf,
  Target,
  Sparkles,
} from "lucide-react";

function Toast({ visible, message, type, onClose }) {
  if (!visible) return null;
  
  const configs = {
    success: {
      bg: "bg-green-600",
      icon: CheckCircle,
      iconColor: "text-green-100"
    },
    error: {
      bg: "bg-red-600", 
      icon: AlertCircle,
      iconColor: "text-red-100"
    },
    info: {
      bg: "bg-blue-600",
      icon: Info,
      iconColor: "text-blue-100"
    }
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;
  
  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:top-6 z-50 animate-slide-in">
      <div className={`${config.bg} text-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-xl flex items-center space-x-3 max-w-sm mx-auto sm:mx-0`}>
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0`} />
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

  const [wasteTypes, setWasteTypes] = useState([]);
  const [type, setType] = useState("");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  const [showPointsReference, setShowPointsReference] = useState(false);

  const navigate = useNavigate();

  // Real-time subscribe to 'waste_types' collection
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

  // Calculate estimated points
  const calculatePoints = (wasteTypeName, weightKg) => {
    const wt = wasteTypes.find((wt) => wt.name === wasteTypeName);
    const pointsPerKilo = wt ? wt.pointsPerKilo : 0;
    const weightNum = parseFloat(weightKg);
    if (isNaN(weightNum) || weightNum <= 0) return 0;
    return Math.round(weightNum * pointsPerKilo);
  };

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

      await addDoc(collection(db, "waste_submissions"), {
        userId: user.uid,
        userEmail: user.email,
        type,
        weight: weightNum,
        points,
        status: "pending",
        submittedAt: serverTimestamp(),
      });

      showToast("Submission received! Points will be awarded after admin confirmation.", "success");

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

  const estimatedPoints = calculatePoints(type, weight);
  const selectedWasteType = wasteTypes.find(wt => wt.name === type);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Back Button */}
            <div className="mb-6 sm:mb-8">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Dashboard</span>
              </button>
            </div>

            {/* Header Section */}
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4 sm:mb-6 shadow-xl">
                <Recycle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-4">
                Submit Waste
              </h1>
              <p className="text-gray-600 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto">
                Transform your recyclables into valuable points and make a positive environmental impact
              </p>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
              
              {/* Main Form - Takes 2 columns on XL screens */}
              <div className="xl:col-span-2">
                <form
                  onSubmit={handleSubmit}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 lg:p-10 border border-white/50"
                >
                  {/* Waste Type Selection */}
                  <div className="mb-6 sm:mb-8">
                    <label htmlFor="waste-type" className="flex items-center text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                      <Recycle className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-green-600" />
                      Waste Type
                    </label>
                    <div className="relative">
                      <select
                        id="waste-type"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        disabled={loading || wasteTypes.length === 0}
                        className="w-full p-4 sm:p-5 bg-gray-50/80 border border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-base sm:text-lg font-medium disabled:opacity-50 backdrop-blur-sm"
                        required
                      >
                        {wasteTypes.map(({ id, name }) => (
                          <option key={id} value={name}>
                            {name.charAt(0).toUpperCase() + name.slice(1)}
                          </option>
                        ))}
                      </select>
                      {selectedWasteType && (
                        <div className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-700 bg-green-50/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-green-200">
                          <div className="flex items-center">
                            <Award className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600 flex-shrink-0" />
                            <span>
                              <strong className="text-green-700">{selectedWasteType.pointsPerKilo} points</strong> per kilogram
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Weight Input */}
                  <div className="mb-6 sm:mb-8">
                    <label htmlFor="weight" className="flex items-center text-lg sm:text-xl font-semibold text-gray-900 mb-4">
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
                        className={`w-full p-4 sm:p-5 bg-gray-50/80 border rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 transition-all duration-300 text-base sm:text-lg font-medium disabled:opacity-50 backdrop-blur-sm pr-12 sm:pr-16 ${
                          weight && parseFloat(weight) > 0 
                            ? "border-green-300 focus:ring-green-500 focus:border-transparent bg-green-50/30" 
                            : weight 
                              ? "border-red-300 focus:ring-red-500 bg-red-50/30" 
                              : "border-gray-200 focus:ring-green-500 focus:border-transparent"
                        }`}
                        placeholder="Enter weight (e.g., 1.50)"
                      />
                      <div className="absolute right-4 sm:right-5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none font-medium">
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
                    <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-green-200 shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                            <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-base sm:text-lg">Estimated Points</h3>
                            <p className="text-sm sm:text-base text-gray-600">
                              {weight} kg × {selectedWasteType?.pointsPerKilo || 0} points/kg
                            </p>
                          </div>
                        </div>
                        <div className="text-center sm:text-right">
                          <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 flex items-center justify-center sm:justify-end gap-2">
                            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                            {estimatedPoints}
                          </div>
                          <div className="text-sm sm:text-base text-gray-600 font-medium">points</div>
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
                        <span>Processing...</span>
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
                <div className="mt-6 p-4 sm:p-6 bg-blue-50/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-blue-200">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1 sm:mb-2 text-base sm:text-lg">Submission Process</h4>
                      <p className="text-blue-800 text-sm sm:text-base leading-relaxed">
                        Your submission will be reviewed by our admin team. Points will be credited to your account once approved. This helps us maintain quality and accuracy in our recycling program.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Points Reference */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-white/50">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 sm:mr-3 text-green-600" />
                    Points Reference
                  </h3>
                  <button
                    onClick={() => setShowPointsReference(!showPointsReference)}
                    className="w-full text-left p-3 sm:p-4 bg-gray-50/80 backdrop-blur-sm rounded-lg hover:bg-gray-100/80 transition-all duration-200 flex items-center justify-between group"
                  >
                    <span className="font-medium text-gray-700 text-sm sm:text-base">View All Rates</span>
                    <ArrowRight className={`w-4 h-4 text-gray-500 transition-transform duration-200 group-hover:translate-x-1 ${showPointsReference ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {showPointsReference && wasteTypes.length > 0 && (
                    <div className="mt-4 space-y-2 animate-slide-down">
                      {wasteTypes.map(({ id, name, pointsPerKilo }) => (
                        <div key={id} className="flex justify-between items-center py-2 sm:py-3 px-3 sm:px-4 bg-gray-50/80 backdrop-blur-sm rounded-lg border border-gray-100">
                          <span className="font-medium text-gray-700 capitalize text-sm sm:text-base">{name}</span>
                          <span className="font-bold text-green-600 text-sm sm:text-base">{pointsPerKilo} pts/kg</span>
                        </div>
                      ))}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs sm:text-sm text-gray-600 italic">
                          * Final points = weight × rate per kg
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pro Tips */}
                <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-amber-200 shadow-lg">
                  <h3 className="text-base sm:text-lg font-semibold text-amber-900 mb-3 sm:mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 sm:mr-3 text-amber-600" />
                    Pro Tips
                  </h3>
                  <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-amber-800">
                    <li className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>Clean materials earn more points</span>
                    </li>
                    <li className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>Separate different waste types</span>
                    </li>
                    <li className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>Weigh accurately for best results</span>
                    </li>
                    <li className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>Submit regularly to maximize points</span>
                    </li>
                  </ul>
                </div>

                {/* Environmental Impact */}
                <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-200 shadow-lg">
                  <h3 className="text-base sm:text-lg font-semibold text-green-900 mb-3 sm:mb-4 flex items-center">
                    <Leaf className="w-5 h-5 mr-2 sm:mr-3 text-green-600" />
                    Your Impact
                  </h3>
                  <p className="text-sm sm:text-base text-green-800 mb-3 sm:mb-4 leading-relaxed">
                    Every kilogram you recycle helps reduce landfill waste and conserves natural resources for future generations.
                  </p>
                  {weight && parseFloat(weight) > 0 && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-green-200">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Recycle className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-sm sm:text-base text-green-800">
                          <strong className="text-green-700">{weight} kg</strong> of waste diverted from landfills!
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

      <Toast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type}
        onClose={closeToast}
      />

      <style>{`
        @keyframes slide-in {
          from { 
            opacity: 0; 
            transform: translateY(-20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes slide-down {
          from { 
            opacity: 0; 
            transform: translateY(-10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-slide-in { 
          animation: slide-in 0.3s ease-out forwards; 
        }
        
        .animate-slide-down { 
          animation: slide-down 0.3s ease-out forwards; 
        }

        /* Custom scrollbar for mobile */
        @media (max-width: 640px) {
          ::-webkit-scrollbar {
            width: 4px;
          }
          ::-webkit-scrollbar-track {
            background: #f1f5f9;
          }
          ::-webkit-scrollbar-thumb {
            background: #10b981;
            border-radius: 2px;
          }
        }
      `}</style>
    </>
  );
}