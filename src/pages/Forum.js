import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { useTheme } from "../contexts/ThemeContext";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { ThumbsUp } from "lucide-react";

// SVG Icon Components
const MapPinIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ClockIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MessageCircleIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const SendIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const AlertTriangleIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const PlusIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const XIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SearchIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const storage = getStorage();

// Utility Functions
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "N/A";
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp.seconds * 1000);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const getSeverityColor = (severity, isDark) => {
  const severityMap = {
    high: isDark ? "bg-red-900/50 text-red-200 border-red-500/50" : "bg-red-100 text-red-800 border-red-200",
    medium: isDark ? "bg-yellow-900/50 text-yellow-200 border-yellow-500/50" : "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: isDark ? "bg-green-900/50 text-green-200 border-green-500/50" : "bg-green-100 text-green-800 border-green-200",
  };
  return severityMap[severity] || (isDark ? "bg-gray-700/50 text-gray-300 border-gray-500/50" : "bg-gray-100 text-gray-800 border-gray-200");
};

const getStatusBadge = (status, isDark) => {
  if (!status || status === 'unknown' || status === 'pending') return null;

  const statusConfig = {
    'in review': {
      bg: isDark ? 'bg-blue-700/80' : 'bg-blue-100',
      text: isDark ? 'text-blue-200' : 'text-blue-800',
      border: isDark ? 'border-blue-500/50' : 'border-blue-200',
      label: 'In Review'
    },
    resolved: {
      bg: isDark ? 'bg-emerald-700/80' : 'bg-emerald-100',
      text: isDark ? 'text-emerald-200' : 'text-emerald-800',
      border: isDark ? 'border-emerald-500/50' : 'border-emerald-200',
      label: 'Resolved'
    }
  };

  const config = statusConfig[status.toLowerCase()] || {
    bg: isDark ? 'bg-gray-700/80' : 'bg-gray-100',
    text: isDark ? 'text-gray-200' : 'text-gray-800',
    border: isDark ? 'border-gray-500/50' : 'border-gray-200',
    label: status
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap select-none ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
};

// Toast Component
function Toast({ visible, message, type }) {
  if (!visible) return null;
  
  const typeStyles = {
    error: "bg-red-500 border-red-400",
    success: "bg-emerald-500 border-emerald-400",
    info: "bg-blue-500 border-blue-400",
  };

  return (
    <div className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 px-4 py-3 rounded-lg shadow-lg text-white z-50 select-none border-l-4 ${typeStyles[type] || typeStyles.info} animate-fade-in`} role="alert" aria-live="assertive">
      <div className="flex items-center gap-2">
        {type === "error" && <AlertTriangleIcon className="h-5 w-5 flex-shrink-0" />}
        {type === "success" && <div className="h-5 w-5 flex-shrink-0 rounded-full bg-white/20 flex items-center justify-center">✓</div>}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

// Comment List Component
function CommentList({ comments = [], isDark }) {
  return (
    <div className={`p-4 space-y-4 max-h-80 overflow-y-auto ${isDark ? "bg-gray-800/50" : "bg-gray-50/50"}`}>
      {comments.length === 0 ? (
        <div className={`text-center py-6 ${isDark ? "text-gray-400" : "text-slate-400"}`}>
          <MessageCircleIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        comments.map((comment, idx) => (
          <div key={idx} className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold select-none flex-shrink-0">
              {comment.user?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className={`flex-1 rounded-xl p-3 shadow-sm ${isDark ? "bg-gray-700" : "bg-white"}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`font-semibold text-sm ${isDark ? "text-gray-200" : "text-slate-800"}`}>
                  {comment.user || "Anonymous"}
                </span>
                <span className={`text-xs ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  {formatTimeAgo(comment.timestamp)}
                </span>
              </div>
              <p className={`${isDark ? "text-gray-300" : "text-slate-700"} text-sm leading-relaxed break-words`}>
                {comment.text}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Report Form Modal Component
function ReportFormModal({ isOpen, onClose, categories, severityLevels, isDark, currentUser, showToast }) {
  const [formData, setFormData] = useState({
    location: "",
    description: "",
    severity: "medium",
    category: "",
    mediaUrl: "",
  });
  const [mediaFile, setMediaFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const reportCategories = useMemo(() => categories.filter(cat => cat.id !== 'all'), [categories]);

  const resetForm = useCallback(() => {
    setFormData({
      location: "",
      description: "",
      severity: severityLevels[Math.floor(severityLevels.length / 2)]?.value || "medium",
      category: reportCategories[0]?.id || "",
      mediaUrl: "",
    });
    setMediaFile(null);
  }, [reportCategories, severityLevels]);

  // Effect to set default category once categories are loaded
  useEffect(() => {
    if (reportCategories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: reportCategories[0].id }));
    }
  }, [reportCategories, formData.category]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser", "error");
      return;
    }
    
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleInputChange("location", `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
        showToast("Location set from your current position", "success");
        setLocationLoading(false);
      },
      (error) => {
        console.error(error);
        showToast("Unable to access your location. Please enter manually.", "error");
        setLocationLoading(false);
      }
    );
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (file.size > maxSize) {
        showToast("File size must be less than 10MB", "error");
        e.target.value = '';
        return;
      }
      
      setMediaFile(file);
    } else {
      setMediaFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showToast("Please log in to submit a report.", "error");
      return;
    }

    if (!formData.location.trim() || !formData.description.trim() || !formData.category) {
      showToast("Please fill in all required fields (Location, Description, Category).", "error");
      return;
    }

    setLoading(true);

    try {
      let uploadedMediaUrl = "";

      if (mediaFile) {
        const fileRef = storageRef(storage, `reports/${currentUser.uid}/${Date.now()}_${mediaFile.name}`);
        await uploadBytes(fileRef, mediaFile);
        uploadedMediaUrl = await getDownloadURL(fileRef);
      } else if (formData.mediaUrl.trim()) {
        uploadedMediaUrl = formData.mediaUrl.trim();
      }

      // Fetch username
      let usernameToSave = currentUser.email || currentUser.uid;
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists() && userDoc.data().username) {
          usernameToSave = userDoc.data().username;
        }
      } catch (err) {
        console.error("Failed to fetch username:", err);
      }

      await addDoc(collection(db, "violation_reports"), {
        location: formData.location.trim(),
        description: formData.description.trim(),
        severity: formData.severity,
        category: formData.category,
        mediaUrl: uploadedMediaUrl,
        submittedAt: serverTimestamp(),
        likes: [],
        comments: [],
        authorId: currentUser.uid,
        authorEmail: currentUser.email,
        authorUsername: usernameToSave,
        status: 'pending',
      });

      resetForm();
      onClose();
      showToast("Report submitted successfully!", "success");
    } catch (error) {
      console.error("Error submitting report:", error);
      showToast("Failed to submit report. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden ${
        isDark ? "bg-gray-900 text-white" : "bg-white text-slate-900"
      }`}>
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Submit New Report</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                isDark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Location Field */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                Location *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className={`flex-1 p-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark
                      ? "bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  }`}
                  placeholder="e.g., Main Street Park, Building A"
                  required
                />
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={locationLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:bg-gray-400 text-sm whitespace-nowrap"
                >
                  {locationLoading ? "..." : "📍"}
                </button>
              </div>
            </div>

            {/* Description Field */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={4}
                className={`w-full p-3 rounded-xl border resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? "bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
                placeholder="Describe the issue in detail..."
                required
              />
            </div>

            {/* Severity and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                  Severity
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => handleInputChange("severity", e.target.value)}
                  className={`w-full p-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark
                      ? "bg-gray-800 border-gray-600 text-gray-100"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  {severityLevels.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  className={`w-full p-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark
                      ? "bg-gray-800 border-gray-600 text-gray-100"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  required
                >
                  <option value="" disabled>Select a category</option>
                  {reportCategories.map(category => (
                    <option key={category.id} value={category.id}>{category.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                Attach Media (Optional)
              </label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className={`w-full p-3 rounded-xl border transition-colors ${
                  isDark
                    ? "bg-gray-800 border-gray-600 text-gray-100 file:bg-gray-700 file:text-gray-200"
                    : "bg-white border-gray-300 text-gray-900 file:bg-gray-100 file:text-gray-700"
                } file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4`}
              />
              <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                Upload images or videos (max 10MB)
              </p>
            </div>

            {/* Media URL */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                Or paste media URL
              </label>
              <input
                type="url"
                value={formData.mediaUrl}
                onChange={(e) => handleInputChange("mediaUrl", e.target.value)}
                className={`w-full p-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? "bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Submitting...
                </div>
              ) : (
                "Submit Report"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Report Item Component
function ReportItem({ 
  report, 
  currentUser, 
  commentText, 
  setCommentText, 
  commentSubmit, 
  toggleComments, 
  isCommentsExpanded, 
  handleLike, 
  isDark, 
  submittingComment 
}) {
  const likeCount = report.likes?.length || 0;
  const isLiked = report.likes?.includes(currentUser?.uid);
  const commentCount = report.comments?.length || 0;

  return (
    <article className={`rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border ${
        isDark 
          ? "bg-gray-800 border-gray-700 hover:border-gray-600" 
          : "bg-white border-gray-100 hover:border-gray-200"
      } animate-fade-in`}>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold select-none flex-shrink-0">
              {(report.authorUsername?.charAt(0) || "U").toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <MapPinIcon className={`h-4 w-4 flex-shrink-0 ${isDark ? "text-gray-400" : "text-slate-500"}`} />
                  <span className={`font-semibold text-sm sm:text-base ${isDark ? "text-gray-200" : "text-slate-800"}`}>
                    {report.location}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getSeverityColor(report.severity, isDark)}`}>
                  {report.severity?.toUpperCase() || "REPORTED"}
                </span>
                {getStatusBadge(report.status, isDark)}
              </div>

              <div className={`text-xs sm:text-sm mb-1 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                Reported by: <span className="font-medium">{report.authorUsername || "Unknown"}</span>
              </div>

              <div className={`flex items-center gap-1.5 text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                <ClockIcon className="h-3.5 w-3.5" />
                <span>{formatTimeAgo(report.submittedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {report.description && (
          <div className="mb-4">
            <p className={`${isDark ? "text-gray-300" : "text-slate-700"} text-sm sm:text-base leading-relaxed break-words`}>
              {report.description}
            </p>
          </div>
        )}

        {/* Media */}
        {report.mediaUrl && (
          <div className="mb-4 rounded-xl overflow-hidden">
            {/\.(mp4|webm|ogg)$/i.test(report.mediaUrl) ? (
              <video
                controls
                className="w-full max-h-64 sm:max-h-80 object-cover rounded-xl"
                preload="metadata"
              >
                <source src={report.mediaUrl} type="video/mp4" />
                Sorry, your browser doesn't support embedded videos.
              </video>
            ) : (
              <img
                src={report.mediaUrl}
                alt="Report evidence"
                className="w-full max-h-64 sm:max-h-80 object-cover rounded-xl hover:scale-105 transition-transform duration-300 cursor-pointer"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://placehold.co/600x400/E0E7FF/4338CA?text=Image+Error`;
                }}
              />
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}">
          <button
            onClick={() => handleLike(report.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isLiked
                ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                : isDark
                ? "hover:bg-gray-700 text-gray-300"
                : "hover:bg-gray-100 text-slate-600"
            }`}
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <ThumbsUp className={`h-4 w-4 flex-shrink-0 ${isLiked ? 'fill-current' : ''}`} />
            <span className="font-medium">{likeCount}</span>
          </button>
          
          <button
            onClick={() => toggleComments(report.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-slate-600"
            }`}
            aria-label={`${commentCount} comments`}
          >
            <MessageCircleIcon className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">{commentCount}</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {isCommentsExpanded && (
        <section className={`border-t ${isDark ? "border-gray-700" : "border-gray-100"} animate-slide-down`}>
          <CommentList comments={report.comments} isDark={isDark} />
          
          {/* Add Comment Form */}
          <div className={`p-4 border-t ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-gray-50"}`}>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {currentUser?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commentSubmit(report.id);
                }}
                className="flex-1 flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentText[report.id] || ""}
                  onChange={(e) => setCommentText(prev => ({ ...prev, [report.id]: e.target.value }))}
                  disabled={submittingComment}
                  className={`flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                    isDark 
                      ? "bg-gray-700 border-gray-600 text-gray-300 placeholder-gray-400 disabled:bg-gray-800" 
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 disabled:bg-gray-100"
                  }`}
                />
                <button
                  type="submit"
                  disabled={!commentText[report.id]?.trim() || submittingComment}
                  className="p-2 w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-shrink-0"
                  aria-label="Submit comment"
                >
                  {submittingComment ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <SendIcon className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>
      )}
    </article>
  );
}

// Filter Tabs Component
function FilterTabs({ filterType, setFilterType, isDark, searchQuery, setSearchQuery, categories }) {
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  return (
    <div className="mb-6">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <SearchIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <input
            type="text"
            placeholder="Search reports by location or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isDark 
                ? 'bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-400' 
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>
      </div>

      {/* Desktop Filters */}
      <div className="hidden sm:flex gap-2 overflow-x-auto pb-2">
        {categories.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setFilterType(filter.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              filterType === filter.id
                ? "bg-indigo-500 text-white shadow-lg transform scale-105"
                : isDark
                ? "bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-600"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm hover:shadow"
            }`}
          >
            <span className="text-sm">{filter.icon}</span>
            <span className="font-medium text-sm">{filter.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile Filter Toggle */}
      <div className="sm:hidden">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
            isDark 
              ? 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700' 
              : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            <span className="font-medium">
              {categories.find(f => f.id === filterType)?.label || 'Filter'}
            </span>
          </div>
          <div className={`transform transition-transform ${showMobileFilters ? 'rotate-180' : ''}`}>↓</div>
        </button>

        {/* Show configuration warning */}
        {categories.length <= 1 && (
          <div className={`mt-2 p-3 rounded-lg border text-xs ${
            isDark ? 'bg-yellow-900/30 border-yellow-700 text-yellow-200' : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}>
            <p>No report categories configured. Contact an admin to add categories.</p>
          </div>
        )}

        {/* Mobile Filter Options */}
        {showMobileFilters && (
          <div className={`mt-2 rounded-xl border overflow-hidden ${
            isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
          }`}>
            {categories.map((filter, index) => (
              <button
                key={filter.id}
                onClick={() => {
                  setFilterType(filter.id);
                  setShowMobileFilters(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  filterType === filter.id
                    ? 'bg-indigo-500 text-white'
                    : isDark
                    ? 'text-gray-200 hover:bg-gray-700'
                    : 'text-gray-900 hover:bg-gray-50'
                } ${index !== categories.length - 1 ? 'border-b' : ''} ${
                  isDark ? 'border-gray-600' : 'border-gray-200'
                }`}
              >
                <span className="text-lg">{filter.icon}</span>
                <span className="font-medium">{filter.label}</span>
                {filterType === filter.id && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Main Forum Component
export default function Forum() {
  // State management
  const [reports, setReports] = useState([]);
  const [commentText, setCommentText] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(null);
  const [isPWA, setIsPWA] = useState(false);
  
  // Configuration states
  const [categories, setCategories] = useState([{ id: "all", label: "All Reports", icon: "📋" }]);
  const [severityLevels, setSeverityLevels] = useState([
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ]);
  
  const themeContext = useTheme();
  const { isDark } = themeContext || {};
  const navigate = useNavigate();

  // PWA Check
  useEffect(() => {
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      setIsPWA(isStandalone || isIOSStandalone);
    };
    checkPWA();
  }, []);

  // Toast utility
  const showToast = useCallback((message, type = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "info" }), 4000);
  }, []);

  // Load configuration from Firebase
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        // Load categories
        const categoriesDoc = await getDoc(doc(db, "report_categories", "categories"));
        
        if (categoriesDoc.exists()) {
          const data = categoriesDoc.data();
          const loadedCategories = data.categories || [];
          
          // Check if "all" category already exists in loaded categories
          const hasAllCategory = loadedCategories.some(cat => cat.id === "all");
          
          if (hasAllCategory) {
            // If "all" exists in Firebase, use only loaded categories
            setCategories(loadedCategories);
          } else {
            // If "all" doesn't exist, prepend it
            setCategories([{ id: "all", label: "All Reports", icon: "📋" }, ...loadedCategories]);
          }
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
        }
      } catch (error) {
        console.error("Error loading configuration:", error);
        // Use default values if Firebase fails
        setCategories([{ id: "all", label: "All Reports", icon: "📋" }]);
        setSeverityLevels([
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ]);
      }
    };

    loadConfiguration();
  }, []);

  // Auth state listener
  useEffect(() => {
    setLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Simplified reports fetching with better error handling
  useEffect(() => {
    if (loadingAuth) return;
    setLoading(true);
    setError(null);

    try {
      const reportsCollectionRef = collection(db, "violation_reports");
      const qReports = query(reportsCollectionRef, orderBy("submittedAt", "desc"));

      const unsubscribe = onSnapshot(
        qReports,
        (snapshot) => {
          const fetchedReports = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            submittedAt: doc.data().submittedAt?.toDate ? doc.data().submittedAt.toDate() : new Date(),
            likes: doc.data().likes || [],
            comments: doc.data().comments || [],
            status: doc.data().status || 'pending',
          }));
          setReports(fetchedReports);
          setLoading(false);
        },
        (err) => {
          console.error("Error fetching reports:", err);
          setError("Failed to fetch reports. Please check your connection and try again.");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up reports listener:", err);
      setError("Failed to connect to the database. Please try again later.");
      setLoading(false);
    }
  }, [loadingAuth]);

  // Like toggle handler
  const handleLike = async (reportId) => {
    if (!currentUser) {
      showToast("Please log in to like reports.", "info");
      return;
    }
    
    const reportRef = doc(db, "violation_reports", reportId);
    const report = reports.find((r) => r.id === reportId);

    if (report) {
      const isLiked = report.likes.includes(currentUser.uid);
      try {
        await updateDoc(reportRef, {
          likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
        });
      } catch (e) {
        console.error("Failed to update like:", e);
        showToast("Failed to update like. Please try again.", "error");
      }
    }
  };

  // Comment submit handler
  const commentSubmit = async (reportId) => {
    if (!currentUser) {
      showToast("Please log in to comment.", "info");
      return;
    }
    
    const text = commentText[reportId]?.trim();
    if (!text) {
      showToast("Comment cannot be empty.", "error");
      return;
    }

    setSubmittingComment(reportId);

    try {
      let usernameToSave = currentUser.email || currentUser.uid;
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists() && userDoc.data().username) {
          usernameToSave = userDoc.data().username;
        }
      } catch (err) {
        console.error("Failed to fetch username:", err);
      }
      
      const reportRef = doc(db, "violation_reports", reportId);
      const comment = {
        text,
        user: usernameToSave,
        timestamp: new Date(),
      };

      await updateDoc(reportRef, {
        comments: arrayUnion(comment),
      });
      setCommentText((prev) => ({ ...prev, [reportId]: "" }));
      showToast("Comment posted!", "success");
    } catch (e) {
      console.error("Failed to add comment:", e);
      showToast("Failed to add comment. Please try again.", "error");
    } finally {
      setSubmittingComment(null);
    }
  };

  // Toggle comment visibility
  const toggleComments = (reportId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [reportId]: !prev[reportId],
    }));
  };

  // Filtered and searched reports
  const filteredReports = useMemo(() => {
    return reports
      .filter((report) => filterType === "all" || report.category === filterType)
      .filter((report) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          report.location?.toLowerCase().includes(query) ||
          report.description?.toLowerCase().includes(query) ||
          report.authorUsername?.toLowerCase().includes(query)
        );
      });
  }, [reports, filterType, searchQuery]);

  // Loading state
  if (loadingAuth || (loading && !error)) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center ${
        isDark ? "bg-gray-900 text-white" : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-slate-900"
      } px-4`}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500 mb-4" />
        <p className="text-lg font-medium">Loading reports...</p>
      </main>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <main className={`min-h-screen flex items-center justify-center px-4 ${
        isDark ? "bg-gray-900" : "bg-red-50"
      }`}>
        <section className={`rounded-2xl p-8 shadow-lg text-center max-w-md mx-auto ${
          isDark ? "bg-gray-800 text-white" : "bg-white"
        }`}>
          <AlertTriangleIcon className={`w-16 h-16 mx-auto mb-4 ${
            isDark ? "text-red-400" : "text-red-500"
          }`} />
          <h2 className={`text-xl font-bold mb-2 ${
            isDark ? "text-red-300" : "text-red-700"
          }`}>Error Loading Reports</h2>
          <p className={isDark ? "text-gray-300" : "text-gray-700"}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark
        ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
        : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-slate-900"
    }`}>
      {/* Header */}
      <header className={`${
        isDark ? "bg-gray-800/90" : "bg-white/90"
      } backdrop-blur-md border-b ${
        isDark ? "border-gray-700" : "border-slate-200"
      } sticky top-0 z-40 shadow-sm`}>
        <div className={`${isPWA ? 'px-4' : 'max-w-6xl mx-auto px-4'} py-4`}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-xl sm:text-2xl truncate">
                Community Reports
              </h1>
            </div>

            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
              aria-label="Report an issue"
            >
              <PlusIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Report Issue</span>
              <span className="sm:hidden">Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <FilterTabs 
          filterType={filterType} 
          setFilterType={setFilterType} 
          isDark={isDark}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categories={categories}
        />

        {/* Reports Grid */}
        <div className="space-y-6">
          {filteredReports.length === 0 ? (
            <section className={`text-center py-16 rounded-2xl shadow-sm ${
              isDark ? "bg-gray-800 text-gray-400" : "bg-white text-slate-600"
            }`}>
              {searchQuery ? (
                <div>
                  <SearchIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No reports found</h3>
                  <p className="mb-4">No reports match your search criteria.</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div>
                  <AlertTriangleIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No reports yet</h3>
                  <p className="mb-6">Be the first to report an issue in your community!</p>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-full hover:bg-indigo-700 transition-colors"
                  >
                    Submit First Report
                  </button>
                </div>
              )}
            </section>
          ) : (
            filteredReports.map((report) => (
              <ReportItem
                key={report.id}
                report={report}
                currentUser={currentUser}
                commentText={commentText}
                setCommentText={setCommentText}
                commentSubmit={commentSubmit}
                toggleComments={toggleComments}
                isCommentsExpanded={expandedComments[report.id]}
                handleLike={handleLike}
                isDark={isDark}
                submittingComment={submittingComment === report.id}
              />
            ))
          )}
        </div>
      </main>

      <ReportFormModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        categories={categories}
        severityLevels={severityLevels}
        isDark={isDark}
        currentUser={currentUser}
        showToast={showToast}
      />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); max-height: 0; }
          to { opacity: 1; transform: translateY(0); max-height: 1000px; }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}