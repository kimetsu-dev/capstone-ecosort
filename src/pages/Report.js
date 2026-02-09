import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { auth, db } from "../firebase"; 
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";

function Toast({ visible, message, type }) {
  if (!visible) return null;
  const bgColors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };
  return (
    <div
      className={`fixed bottom-6 right-6 px-6 py-3 rounded shadow-lg text-white z-50 ${bgColors[type] || bgColors.info} animate-bounce`}
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
  
  const [loading, setLoading] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  // Dynamic configuration states
  const [categories, setCategories] = useState([]);
  const [severityLevels, setSeverityLevels] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);

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
          const reportCategories = loadedCategories.filter(cat => cat.id !== 'all');
          setCategories(reportCategories);
          
          if (reportCategories.length > 0) {
            setFormData(prev => ({ ...prev, category: reportCategories[0].id }));
          }
        } else {
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
          setSeverityLevels([
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]);
        }
      } catch (error) {
        console.error("Error loading configuration:", error);
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

  const showToast = (message, type = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "info" }), 4000);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.description.trim()) return showToast("Please provide a description.", "error");
    if (formData.description.trim().length < 10) return showToast("Description too short (min 10 chars).", "error");
    if (!formData.location.trim()) return showToast("Please specify location.", "error");
    if (!formData.category) return showToast("Please select a category.", "error");

    const user = auth.currentUser;
    if (!user) return showToast("Login required.", "error");

    setLoading(true);

    try {
      // --- FETCH USER PROFILE DATA HERE ---
      let usernameToSave = user.email ? user.email.split('@')[0] : "Anonymous"; 
      let photoUrlToSave = user.photoURL || ""; 

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Use the username from profile if available
          if (userData.username) usernameToSave = userData.username;
          // Use the profileUrl from profile if available
          if (userData.profileUrl) photoUrlToSave = userData.profileUrl;
        }
      } catch (err) {
        console.error("Failed to fetch username details:", err);
      }
      // -------------------------------------

      const reportData = {
        type: 'report', // Explicitly set type
        reportedBy: user.uid,
        reporterEmail: user.email || "unknown",
        authorId: user.uid,
        authorEmail: user.email,
        authorUsername: usernameToSave, // Use fetched username
        authorPhotoUrl: photoUrlToSave, // Use fetched photo URL
        description: formData.description.trim(),
        location: formData.location.trim(),
        category: formData.category,
        severity: formData.severity,
        mediaUrl: null,
        mediaType: null,
        status: "pending",
        likes: [],
        comments: [],
        submittedAt: serverTimestamp(),
        coordinates: currentLocation || null,
        resolved: false,
        adminNotes: "",
      };

      await addDoc(collection(db, "violation_reports"), reportData);

      showToast("Report submitted successfully!", "success");

      setFormData({
        description: "",
        location: "",
        category: categories[0]?.id || "",
        severity: "medium"
      });
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

  if (configLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-slate-900'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Categories Not Configured</h2>
          <button onClick={() => navigate("/forum")} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">
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
              ? 'text-white'
              : 'text-slate-900'
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
              <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>
                Report Category *
              </label>
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
                  >
                    <span>{cat.icon || "📝"}</span>
                    <span className="font-medium text-sm">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>
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
            </div>

            {/* Location */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>
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
                  }`}
                >
                  {locationLoading ? (
                     <span>Getting location...</span>
                  ) : (
                    <>
                      <span>📍</span>
                      <span>{useCurrentLocation ? "Using Current Location" : "Use Current Location"}</span>
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
                  placeholder="Or enter address manually..."
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
              <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>
                Severity Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {severityLevels.map((sev) => (
                    <button
                      key={sev.value}
                      type="button"
                      onClick={() => handleInputChange("severity", sev.value)}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 capitalize ${
                        formData.severity === sev.value
                          ? isDark ? "border-indigo-500 bg-indigo-900/30 text-white" : "border-indigo-500 bg-indigo-50 text-indigo-900"
                          : isDark ? "border-gray-600 text-gray-300" : "border-gray-200 text-gray-600"
                      }`}
                    >
                      {sev.label}
                    </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </form>
        
        <div className="text-center mt-6">
          <button onClick={() => navigate("/forum")} className={`px-6 py-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            ← Back to Forum
          </button>
        </div>
      </div>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}