import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { auth, db } from "../firebase"; // Removed storage
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
// Removed storage-related imports

function Toast({ visible, message, type }) {
  if (!visible) return null;
  const bgColors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };
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

export default function Report() {
  const [formData, setFormData] = useState({
    description: "",
    location: "",
    category: "",
    severity: "medium"
  });
  
  // Removed media and mediaPreview states
  
  const [loading, setLoading] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  // Dynamic configuration states
  const [categories, setCategories] = useState([]);
  const [severityLevels, setSeverityLevels] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);

  // Removed fileInputRef
  const navigate = useNavigate();

  const themeContext = useTheme();
  const { isDark } = themeContext || {};

  // Load dynamic configuration from admin settings
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        setConfigLoading(true);
        
        // Load categories
        const categoriesDoc = await getDoc(doc(db, "report_categories", "categories"));
        if (categoriesDoc.exists()) {
          const data = categoriesDoc.data();
          const loadedCategories = data.categories || [];
          // Filter out 'all' category for report form
          const reportCategories = loadedCategories.filter(cat => cat.id !== 'all');
          setCategories(reportCategories);
          
          // Set default category if available
          if (reportCategories.length > 0) {
            setFormData(prev => ({ ...prev, category: reportCategories[0].id }));
          }
        } else {
          // No categories available
          setCategories([]);
        }

        // Load severity levels
        const severityDoc = await getDoc(doc(db, "report_categories", "severity_levels"));
        if (severityDoc.exists()) {
          const data = severityDoc.data();
          setSeverityLevels(data.levels || [
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]);
        } else {
          // Default severity levels if none found
          setSeverityLevels([
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]);
        }
      } catch (error) {
        console.error("Error loading configuration:", error);
        // Use defaults on error
        setCategories([]);
        setSeverityLevels([
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ]);
      } finally {
        setConfigLoading(false);
      }
    };

    loadConfiguration();
  }, []);

  // Toast helper
  const showToast = (message, type = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "info" }), 4000);
  };

  // Form input handler
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Geolocation
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation not supported by your browser.", "error");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const formattedLocation = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setCurrentLocation({ lat: latitude, lng: longitude });
        handleInputChange("location", formattedLocation);
        setUseCurrentLocation(true);
        setLocationLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        showToast("Could not access your location. Please enter it manually.", "error");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Removed handleMediaChange and removeMedia functions

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.description.trim()) {
      showToast("Please provide a description of the violation.", "error");
      return;
    }
    if (formData.description.trim().length < 10) {
      showToast("Description must be at least 10 characters.", "error");
      return;
    }
    if (!formData.location.trim()) {
      showToast("Please specify the location of the violation.", "error");
      return;
    }
    if (!formData.category) {
      showToast("Please select a category.", "error");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      showToast("You must be logged in to submit a report.", "error");
      return;
    }

    setLoading(true);

    try {
      // Removed media upload logic

      // Fetch username
      let usernameToSave = user.email || user.uid;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().username) {
          usernameToSave = userDoc.data().username;
        }
      } catch (err) {
        console.error("Failed to fetch username:", err);
      }

      const reportData = {
        reportedBy: user.uid,
        reporterEmail: user.email || "unknown",
        authorId: user.uid,
        authorEmail: user.email,
        authorUsername: usernameToSave,
        description: formData.description.trim(),
        location: formData.location.trim(),
        category: formData.category,
        severity: formData.severity,
        mediaUrl: null, // Set to null as feature is removed
        mediaType: null, // Set to null as feature is removed
        status: "pending",
        likes: [],
        comments: [],
        submittedAt: serverTimestamp(),
        coordinates: currentLocation || null,
        resolved: false,
        adminNotes: "",
      };

      await addDoc(collection(db, "violation_reports"), reportData);

      showToast("Your report has been submitted successfully! Thank you.", "success");

      // Reset form
      setFormData({
        description: "",
        location: "",
        category: categories[0]?.id || "",
        severity: "medium"
      });
      // Removed media reset logic
      setUseCurrentLocation(false);
      setCurrentLocation(null);

      navigate("/forum");
    } catch (err) {
      console.error("Submission error:", err);
      showToast(`Failed to submit report: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Loading state for configuration
  if (configLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500 mb-4 mx-auto" />
          <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Loading form configuration...
          </p>
        </div>
      </div>
    );
  }

  // Show message if no categories are configured
  if (categories.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'
      }`}>
        <div className={`text-center p-8 rounded-xl shadow-lg max-w-md mx-4 ${
          isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}>
          <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 mx-auto">
            ⚠️
          </div>
          <h2 className="text-xl font-bold mb-4">Categories Not Configured</h2>
          <p className="mb-6 text-sm opacity-75">
            An admin needs to configure report categories before you can submit reports. 
            Please contact your administrator or check back later.
          </p>
          <button
            onClick={() => navigate("/forum")}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Forum
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-8 px-4 transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'
    }`}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg mx-auto mb-4 ${
            isDark ? 'shadow-red-500/25' : 'shadow-lg'
          }`}>
            📢
          </div>
          <h1 className={`text-3xl font-bold mb-2 ${
            isDark 
              ? 'bg-gradient-to-r from-white via-emerald-200 to-teal-300 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent'
          }`}>
            Report a Violation
          </h1>
          <p className={isDark ? 'text-gray-300' : 'text-slate-600'}>
            Help us maintain a safe and clean community
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit}>
          <div className={`${
            isDark 
              ? 'bg-gray-800/80 border-gray-700/50' 
              : 'bg-white/80 border-white/50'
          } backdrop-blur-sm rounded-2xl shadow-xl border overflow-hidden p-8 space-y-6 transition-colors duration-300`}>
            
            {/* Category Selection */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                isDark ? 'text-gray-200' : 'text-slate-700'
              }`}>
                Report Category *
              </label>
              {categories.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleInputChange("category", cat.id)}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 flex items-center space-x-2 ${
                        formData.category === cat.id
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          : isDark
                          ? "border-gray-600 hover:border-gray-500 text-gray-300 hover:bg-gray-700"
                          : "border-slate-200 hover:border-slate-300 text-slate-600"
                      }`}
                      aria-pressed={formData.category === cat.id}
                    >
                      <span>{cat.icon || "📝"}</span>
                      <span className="font-medium text-sm">{cat.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={`p-4 rounded-lg border ${
                  isDark ? 'border-yellow-700 bg-yellow-900/30 text-yellow-200' : 'border-yellow-300 bg-yellow-50 text-yellow-800'
                }`}>
                  <p className="text-sm">No categories available. Please contact an administrator.</p>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                isDark ? 'text-gray-200' : 'text-slate-700'
              }`}>
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                required
                rows={4}
                placeholder="Please provide a detailed description..."
                maxLength={500}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <div className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                {formData.description.length}/500 characters (minimum 10 required)
              </div>
            </div>

            {/* Location */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                isDark ? 'text-gray-200' : 'text-slate-700'
              }`}>
                Location *
              </label>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className={`w-full p-3 rounded-xl border-2 transition-all duration-200 flex items-center justify-center space-x-2 ${
                    useCurrentLocation
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : isDark
                      ? "border-gray-600 hover:border-gray-500 text-gray-300 hover:bg-gray-700"
                      : "border-slate-300 hover:border-slate-400 text-slate-600"
                  } ${locationLoading ? "opacity-50 cursor-not-allowed" : "hover:shadow-md"}`}
                >
                  {locationLoading ? (
                    <>
                      <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                        isDark ? 'border-gray-400' : 'border-slate-400'
                      }`}></div>
                      <span>Getting location...</span>
                    </>
                  ) : useCurrentLocation ? (
                    <>
                      <span>✅</span>
                      <span>Using current location</span>
                    </>
                  ) : (
                    <>
                      <span>📍</span>
                      <span>Use current location</span>
                    </>
                  )}
                </button>

                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => {
                    handleInputChange("location", e.target.value);
                    setUseCurrentLocation(false);
                  }}
                  required
                  placeholder="Or enter address, building name, or landmark..."
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                isDark ? 'text-gray-200' : 'text-slate-700'
              }`}>
                Severity Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {severityLevels.map((sev) => {
                  const getSeverityStyles = (value) => {
                    switch(value.toLowerCase()) {
                      case 'low':
                        return {
                          color: "text-green-700 border-green-300 bg-green-50",
                          darkColor: "dark:text-green-300 dark:border-green-700 dark:bg-green-900/30",
                          icon: "🟢"
                        };
                      case 'medium':
                        return {
                          color: "text-yellow-700 border-yellow-300 bg-yellow-50",
                          darkColor: "dark:text-yellow-300 dark:border-yellow-700 dark:bg-yellow-900/30",
                          icon: "🟡"
                        };
                      case 'high':
                        return {
                          color: "text-red-700 border-red-300 bg-red-50",
                          darkColor: "dark:text-red-300 dark:border-red-700 dark:bg-red-900/30",
                          icon: "🔴"
                        };
                      default:
                        return {
                          color: "text-gray-700 border-gray-300 bg-gray-50",
                          darkColor: "dark:text-gray-300 dark:border-gray-700 dark:bg-gray-900/30",
                          icon: "⚪"
                        };
                    }
                  };

                  const styles = getSeverityStyles(sev.value);
                  
                  return (
                    <button
                      key={sev.value}
                      type="button"
                      onClick={() => handleInputChange("severity", sev.value)}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 flex items-center justify-center space-x-2 ${
                        formData.severity === sev.value
                          ? `${styles.color} ${styles.darkColor}`
                          : isDark
                          ? "border-gray-600 hover:border-gray-500 text-gray-300"
                          : "border-slate-200 hover:border-slate-300 text-slate-600"
                      }`}
                      aria-pressed={formData.severity === sev.value}
                    >
                      <span>{styles.icon}</span>
                      <span className="font-medium text-sm">{sev.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Removed Media Upload UI Section */}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={
                  loading || 
                  !formData.description.trim() || 
                  !formData.location.trim() || 
                  formData.description.length < 10 ||
                  !formData.category ||
                  categories.length === 0
                }
                className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-orange-700 focus:ring-4 focus:ring-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting Report...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>📤</span>
                    <span>Submit Report</span>
                  </div>
                )}
              </button>

              <p className={`text-center text-sm mt-3 ${
                isDark ? 'text-gray-400' : 'text-slate-500'
              }`}>
                Your report will be reviewed by our team within 24-48 hours
              </p>
            </div>
          </div>
        </form>

        {/* Back Button */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/forum")}
            className={`px-6 py-2 transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-gray-200' 
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            ← Back to Forum
          </button>
        </div>
      </div>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}