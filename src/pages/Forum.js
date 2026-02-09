import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { doc, getDoc, deleteDoc } from "firebase/firestore"; 
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
import { db, auth, storage } from "../firebase";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import { ThumbsUp } from "lucide-react";

// --- Icons ---
const MapPinIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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

const FileTextIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ShieldIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const TrashIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const MoreHorizontalIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
  </svg>
);

const uploadWithTimeout = (ref, file, timeoutMs = 20000) =>
  Promise.race([
    uploadBytes(ref, file),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Upload timed out")), timeoutMs)
    ),
  ]);

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
    medium: isDark ? "bg-orange-900/50 text-orange-200 border-orange-500/50" : "bg-orange-100 text-orange-800 border-orange-200",
    low: isDark ? "bg-yellow-900/50 text-yellow-200 border-yellow-500/50" : "bg-yellow-100 text-yellow-800 border-yellow-200",
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

// --- Toast Component ---
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

// --- Delete Confirmation Modal ---
function DeleteConfirmationModal({ isOpen, onClose, onConfirm, isDark, isDeleting }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
      <div 
        className={`rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 ${isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="text-center">
          <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-5 ${isDark ? "bg-red-900/30" : "bg-red-100"}`}>
            {isDeleting ? (
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <TrashIcon className={`h-7 w-7 ${isDark ? "text-red-400" : "text-red-600"}`} />
            )}
          </div>
          
          <h3 className="text-xl font-bold mb-2">Delete this Post?</h3>
          <p className={`text-sm mb-8 leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Are you sure you want to permanently remove this content? This action cannot be undone.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-colors w-full sm:w-auto ${
                isDark ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              } ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className={`px-5 py-2.5 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 transition-all w-full sm:w-auto ${
                isDeleting ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isDeleting ? "Deleting..." : "Yes, Delete It"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Comment List Component ---
function CommentList({ comments = [], isDark }) {
  return (
    <div className={`p-4 space-y-4 max-h-80 overflow-y-auto ${isDark ? "bg-gray-800/50" : "bg-gray-50/50"}`}>
      {comments.length === 0 ? (
        <div className={`text-center py-6 ${isDark ? "text-gray-400" : "text-slate-400"}`}>
          <MessageCircleIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No comments yet. Be the first to join the discussion!</p>
        </div>
      ) : (
        comments.map((comment, idx) => (
          <div key={idx} className="flex gap-3 animate-fade-in">
            {/* User Avatar */}
            <div className="flex-shrink-0">
               {comment.userProfileUrl ? (
                  <img 
                    src={comment.userProfileUrl} 
                    alt={comment.user} 
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                  />
               ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold select-none">
                    {comment.user?.charAt(0).toUpperCase() || "U"}
                  </div>
               )}
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

// --- Post Form Modal ---
function PostFormModal({ isOpen, onClose, isDark, currentUser, showToast }) {
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [mediaFile, setMediaFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFormData({ title: "", description: "" });
    setMediaFile(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) setMediaFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return showToast("Please log in.", "error");
    setLoading(true);

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};
      
      const username = userData.username || currentUser.displayName || currentUser.email.split('@')[0];
      const photoUrl = userData.profileUrl || currentUser.photoURL || "";

      let uploadedMediaUrl = "";
      if (mediaFile) {
        const fileRef = storageRef(storage, `posts/${currentUser.uid}/${Date.now()}_${mediaFile.name}`);
        await uploadWithTimeout(fileRef, mediaFile);
        uploadedMediaUrl = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, "violation_reports"), {
        type: 'post', 
        title: formData.title,
        description: formData.description, 
        mediaUrl: uploadedMediaUrl,
        submittedAt: serverTimestamp(),
        likes: [],
        comments: [],
        authorId: currentUser.uid,
        authorUsername: username, 
        authorPhotoUrl: photoUrl, 
      });

      resetForm();
      onClose();
      showToast("Post created successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to create post: " + error.message, "error");
    } finally {
      setLoading(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className={`rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden ${isDark ? "bg-gray-900 text-white" : "bg-white text-slate-900"}`}>
        <div className={`px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"} flex justify-between items-center`}>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-blue-500">✍️</span> Create New Post
          </h2>
          <button onClick={onClose}><XIcon className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
              placeholder="What's on your mind?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea 
              required
              rows={4}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
              placeholder="Share your thoughts, ideas, or questions..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Attach Media (Optional)</label>
            <input type="file" onChange={handleFileChange} className="w-full text-sm" accept="image/*,video/*" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold transition-colors">
            {loading ? "Posting..." : "Post to Community"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Report Form Modal ---
function ReportFormModal({ isOpen, onClose, categories, severityLevels, isDark, currentUser, showToast }) {
  const [formData, setFormData] = useState({
    location: "",
    description: "",
    severity: "medium",
    category: "",
  });
  const [mediaFile, setMediaFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const reportCategories = useMemo(() => categories.filter(cat => cat.id !== 'all'), [categories]);

  useEffect(() => {
    if (reportCategories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: reportCategories[0].id }));
    }
  }, [reportCategories, formData.category]);

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const useMyLocation = () => {
    if (!navigator.geolocation) return showToast("Geolocation not supported", "error");
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleInputChange("location", `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
        setLocationLoading(false);
      },
      () => {
        showToast("Unable to access location", "error");
        setLocationLoading(false);
      }
    );
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) setMediaFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return showToast("Please log in.", "error");
    setLoading(true);

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};
      
      const username = userData.username || currentUser.displayName || currentUser.email.split('@')[0];
      const photoUrl = userData.profileUrl || currentUser.photoURL || "";

      let uploadedMediaUrl = "";
      if (mediaFile) {
        const fileRef = storageRef(storage, `reports/${currentUser.uid}/${Date.now()}_${mediaFile.name}`);
        await uploadWithTimeout(fileRef, mediaFile);
        uploadedMediaUrl = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, "violation_reports"), {
        type: 'report',
        location: formData.location.trim(),
        description: formData.description.trim(),
        severity: formData.severity,
        category: formData.category,
        mediaUrl: uploadedMediaUrl,
        submittedAt: serverTimestamp(),
        likes: [],
        comments: [],
        authorId: currentUser.uid,
        authorUsername: username,
        authorPhotoUrl: photoUrl,
        status: 'pending',
      });

      setFormData({
        location: "",
        description: "",
        severity: "medium",
        category: reportCategories[0]?.id || "",
      });
      setMediaFile(null);
      onClose();
      showToast("Report submitted successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to submit report: " + error.message, "error");
    } finally {
      setLoading(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden ${isDark ? "bg-gray-900 text-white" : "bg-white text-slate-900"}`}>
        <div className={`px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"} flex justify-between items-center bg-red-50 dark:bg-red-900/10`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? "text-red-400" : "text-red-700"}`}>
            <AlertTriangleIcon className="h-6 w-6" /> Submit Violation Report
          </h2>
          <button onClick={onClose}><XIcon className="h-5 w-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Location *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className={`flex-1 p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
                  placeholder="e.g., Main Street Park"
                  required
                />
                <button type="button" onClick={useMyLocation} className="px-4 py-2 bg-gray-600 text-white rounded-xl">
                  {locationLoading ? "..." : "📍"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Details of Violation *</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={4}
                className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
                placeholder="Describe the issue clearly for admins..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => handleInputChange("severity", e.target.value)}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
                >
                  {severityLevels.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
                >
                  {reportCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Evidence (Image/Video)</label>
              <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="w-full" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl font-bold">
              {loading ? "Submitting..." : "Submit Violation Report"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// --- Action Menu Component (The "Three Dots" Menu) ---
function ActionMenu({ isDark, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`p-1.5 rounded-full transition-colors ${
          isDark 
            ? "text-gray-400 hover:bg-gray-700 hover:text-white" 
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        }`}
        aria-label="More options"
      >
        <MoreHorizontalIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl border z-20 overflow-hidden animate-fade-in ${
          isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
        }`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDelete();
            }}
            className={`w-full text-left px-4 py-3 flex items-center gap-2 text-sm font-medium transition-colors ${
              isDark 
                ? "text-red-400 hover:bg-red-900/20" 
                : "text-red-600 hover:bg-red-50"
            }`}
          >
            <TrashIcon className="h-4 w-4" />
            Delete Post
          </button>
        </div>
      )}
    </div>
  );
}

// --- Combined Item Component (Handles both Posts and Reports) ---
function FeedItem({ 
  item, 
  currentUser, 
  commentText, 
  setCommentText, 
  commentSubmit, 
  toggleComments, 
  isCommentsExpanded, 
  handleLike,
  triggerDelete, 
  isDark, 
  submittingComment 
}) {
  const isReport = item.type === 'report' || !item.type;
  const likeCount = item.likes?.length || 0;
  const isLiked = item.likes?.includes(currentUser?.uid);
  const commentCount = item.comments?.length || 0;
  
  // Check if current user is the author
  const isAuthor = currentUser && item.authorId === currentUser.uid;

  // Dynamic Styles based on Type
  const borderColor = isReport 
    ? (isDark ? "border-red-900/30" : "border-red-100") 
    : (isDark ? "border-blue-900/30" : "border-blue-100");
    
  const accentBg = isReport
    ? (isDark ? "bg-red-900/10" : "bg-red-50")
    : (isDark ? "bg-blue-900/10" : "bg-blue-50");

  return (
    <article className={`rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-visible border-2 ${borderColor} ${
        isDark ? "bg-gray-800" : "bg-white"
      } animate-fade-in relative group`}>
      
      {/* Type Indicator Stripe */}
      <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l-2xl ${isReport ? "bg-red-500" : "bg-blue-500"}`}></div>

      <div className="p-4 sm:p-6 pl-6 sm:pl-8">
        
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            {item.authorPhotoUrl ? (
               <img 
                 src={item.authorPhotoUrl} 
                 alt={item.authorUsername} 
                 className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600"
               />
            ) : (
               <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold select-none ${
                 isReport ? "bg-gradient-to-br from-red-500 to-orange-600" : "bg-gradient-to-br from-blue-500 to-indigo-600"
               }`}>
                 {isReport ? "!" : (item.authorUsername?.charAt(0) || "U").toUpperCase()}
               </div>
            )}
            
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                  {item.authorUsername || "Anonymous"}
                </span>
                {isReport && (
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Violation
                  </span>
                )}
              </div>
              <div className={`flex items-center gap-2 text-xs ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                <span>{formatTimeAgo(item.submittedAt)}</span>
                {item.location && isReport && (
                   <>• <span className="flex items-center gap-1"><MapPinIcon className="h-3 w-3" /> {item.location}</span></>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
                {/* Report Badges */}
                {isReport && (
                  <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(item.status, isDark)}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSeverityColor(item.severity, isDark)}`}>
                        {item.severity?.toUpperCase()}
                      </span>
                  </div>
                )}

                {/* Dropdown Menu (Only for Author) */}
                {isAuthor && (
                  <ActionMenu 
                    isDark={isDark} 
                    onDelete={() => triggerDelete(item)} 
                  />
                )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="mb-4">
          {item.title && (
            <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
              {item.title}
            </h3>
          )}
          <p className={`${isDark ? "text-gray-300" : "text-slate-700"} text-sm sm:text-base leading-relaxed whitespace-pre-wrap`}>
            {item.description}
          </p>
        </div>

        {/* Media */}
        {item.mediaUrl && (
          <div className={`mb-4 rounded-xl overflow-hidden ${accentBg} p-1`}>
            {/\.(mp4|webm|ogg)$/i.test(item.mediaUrl) ? (
              <video controls className="w-full max-h-80 object-cover rounded-lg">
                <source src={item.mediaUrl} type="video/mp4" />
              </video>
            ) : (
              <img src={item.mediaUrl} alt="Attachment" className="w-full max-h-80 object-cover rounded-lg" />
            )}
          </div>
        )}

        {/* Actions */}
        <div className={`flex items-center gap-4 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => handleLike(item.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isLiked ? "text-blue-500 bg-blue-50 dark:bg-blue-900/20" : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            <ThumbsUp className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likeCount}</span>
          </button>
          
          <button
            onClick={() => toggleComments(item.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700`}
          >
            <MessageCircleIcon className="h-4 w-4" />
            <span>{commentCount}</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {isCommentsExpanded && (
        <section className={`border-t ${isDark ? "border-gray-700" : "border-gray-100"} animate-slide-down`}>
          <CommentList comments={item.comments} isDark={isDark} />
          <div className={`p-4 border-t ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-gray-50"}`}>
            <form onSubmit={(e) => { e.preventDefault(); commentSubmit(item.id); }} className="flex gap-2">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText[item.id] || ""}
                onChange={(e) => setCommentText(prev => ({ ...prev, [item.id]: e.target.value }))}
                className={`flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                  isDark ? "bg-gray-700 border-gray-600 text-gray-300 focus:ring-blue-500" : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                }`}
              />
              <button type="submit" disabled={submittingComment} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                 <SendIcon className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      )}
    </article>
  );
}

// --- Main Forum Component ---
export default function Forum() {
  const [items, setItems] = useState([]); 
  const [activeTab, setActiveTab] = useState("posts");
  const [commentText, setCommentText] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Modals
  const [showPostModal, setShowPostModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Deletion State
  const [deleteModal, setDeleteModal] = useState({ 
    isOpen: false, 
    itemToDelete: null, 
    isDeleting: false 
  });

  const [submittingComment, setSubmittingComment] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  
  // Config
  const [categories, setCategories] = useState([{ id: "all", label: "All Categories", icon: "📋" }]);
  const [severityLevels, setSeverityLevels] = useState([
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ]);
  
  const themeContext = useTheme();
  const { isDark } = themeContext || {};

  const showToast = useCallback((message, type = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "info" }), 4000);
  }, []);

  // Auth & Config Loading
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setCurrentUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
       try {
        const categoriesDoc = await getDoc(doc(db, "report_categories", "categories"));
        if (categoriesDoc.exists()) {
          const data = categoriesDoc.data();
          setCategories([{ id: "all", label: "All Categories", icon: "📋" }, ...data.categories]);
        }
      } catch (e) { console.error(e); }
    };
    loadConfig();
  }, []);

  // Fetching Data
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "violation_reports"), orderBy("submittedAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate() || new Date(),
        type: doc.data().type || 'report', 
      }));
      setItems(fetched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Handlers
  const handleLike = async (id) => {
    if (!currentUser) return showToast("Login required", "info");
    const docRef = doc(db, "violation_reports", id);
    const item = items.find(r => r.id === id);
    if (!item) return;
    const isLiked = item.likes?.includes(currentUser.uid);
    await updateDoc(docRef, { likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) });
  };

  const commentSubmit = async (id) => {
    if (!currentUser) return showToast("Login required", "info");
    const text = commentText[id]?.trim();
    if (!text) return;
    setSubmittingComment(id);
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};
      
      const username = userData.username || currentUser.displayName || currentUser.email.split('@')[0];
      const photoUrl = userData.profileUrl || currentUser.photoURL || "";

      await updateDoc(doc(db, "violation_reports", id), {
        comments: arrayUnion({ 
          text, 
          user: username, 
          userProfileUrl: photoUrl,
          timestamp: new Date() 
        })
      });
      setCommentText(prev => ({...prev, [id]: ""}));
      showToast("Comment added", "success");
    } catch(e) { 
      console.error(e);
      showToast("Error adding comment", "error"); 
    }
    finally { setSubmittingComment(null); }
  };

  // --- Deletion Handlers ---
  const triggerDelete = (item) => {
    setDeleteModal({ isOpen: true, itemToDelete: item, isDeleting: false });
  };

  const confirmDelete = async () => {
    const { itemToDelete } = deleteModal;
    if (!itemToDelete) return;
    
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      // 1. Delete associated media from Storage if it exists
      if (itemToDelete.mediaUrl) {
        try {
          const fileRef = storageRef(storage, itemToDelete.mediaUrl);
          await deleteObject(fileRef);
        } catch (storageError) {
          console.warn("Media deletion failed (might already be gone):", storageError);
          // Continue to delete the document even if storage fails
        }
      }

      // 2. Delete the document from Firestore
      await deleteDoc(doc(db, "violation_reports", itemToDelete.id));
      showToast("Post deleted successfully", "success");

    } catch (error) {
      console.error("Error deleting document: ", error);
      showToast("Failed to delete. Please try again.", "error");
    } finally {
      setDeleteModal({ isOpen: false, itemToDelete: null, isDeleting: false });
    }
  };

  const toggleComments = (id) => setExpandedComments(prev => ({...prev, [id]: !prev[id]}));

  // Filtering Logic
  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => {
      if (activeTab === 'posts') return item.type === 'post';
      if (activeTab === 'reports') return item.type === 'report' || !item.type;
      return true;
    });

    if (filterType !== 'all' && activeTab === 'reports') {
      filtered = filtered.filter(item => item.category === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [items, activeTab, filterType, searchQuery]);

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-slate-900"}`}>
      
      {/* --- HEADER --- */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b shadow-sm ${isDark ? "bg-gray-900/90 border-gray-700" : "bg-white/90 border-slate-200"}`}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
              Community Forum
            </h1>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPostModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transform hover:scale-[1.02]"
              >
                <FileTextIcon className="h-5 w-5" />
                <span>New Post</span>
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 transform hover:scale-[1.02]"
              >
                <AlertTriangleIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Report Violation</span>
                <span className="sm:hidden">Report</span>
              </button>
            </div>
          </div>

          {/* Improved Tab Switcher */}
          <div className="flex mt-6 gap-8">
            <button
              onClick={() => setActiveTab("posts")}
              className={`pb-3 px-1 text-sm font-bold flex items-center gap-2 transition-all relative ${
                activeTab === "posts"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              <FileTextIcon className="h-4 w-4" /> User Discussions
              {activeTab === "posts" && (
                <span className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`pb-3 px-1 text-sm font-bold flex items-center gap-2 transition-all relative ${
                activeTab === "reports"
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              <ShieldIcon className="h-4 w-4" /> Violation Reports
              {activeTab === "reports" && (
                <span className="absolute bottom-0 left-0 w-full h-1 bg-red-600 dark:bg-red-400 rounded-t-full"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Search & Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <SearchIcon className={`absolute left-4 top-3.5 h-5 w-5 transition-colors ${isDark ? "text-gray-500 group-focus-within:text-blue-400" : "text-gray-400 group-focus-within:text-blue-500"}`} />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'posts' ? 'discussions' : 'reports'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-11 pr-4 py-3 rounded-2xl border transition-all shadow-sm focus:ring-2 focus:ring-offset-2 ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500 focus:ring-offset-gray-900' 
                  : 'bg-white border-gray-200 focus:ring-blue-500'
              }`}
            />
          </div>
          
          {/* Only show Category filters for Reports */}
          {activeTab === 'reports' && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`p-3 rounded-2xl border min-w-[180px] shadow-sm cursor-pointer outline-none focus:ring-2 ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-white focus:ring-red-500' 
                  : 'bg-white border-gray-200 focus:ring-red-500'
              }`}
            >
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
            </select>
          )}
        </div>

        {/* Feed Grid */}
        <div className="space-y-6">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 opacity-60">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p>Loading community feed...</p>
             </div>
          ) : filteredItems.length === 0 ? (
            <div className={`text-center py-20 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center ${isDark ? "border-gray-700 bg-gray-800/30 text-gray-400" : "border-gray-200 bg-gray-50/50 text-gray-400"}`}>
              <div className={`p-4 rounded-full mb-4 ${isDark ? "bg-gray-800" : "bg-white shadow-sm"}`}>
                 {activeTab === 'posts' ? <MessageCircleIcon className="h-8 w-8 opacity-50"/> : <ShieldIcon className="h-8 w-8 opacity-50"/>}
              </div>
              <h3 className="text-xl font-bold mb-1">No {activeTab} found</h3>
              <p className="max-w-xs mx-auto">
                {activeTab === 'posts' 
                  ? "Be the first to start a conversation in the community." 
                  : "No violations match your current filters."}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <FeedItem
                key={item.id}
                item={item}
                currentUser={currentUser}
                commentText={commentText}
                setCommentText={setCommentText}
                commentSubmit={commentSubmit}
                toggleComments={toggleComments}
                isCommentsExpanded={expandedComments[item.id]}
                handleLike={handleLike}
                triggerDelete={triggerDelete}
                isDark={isDark}
                submittingComment={submittingComment === item.id}
              />
            ))
          )}
        </div>
      </main>

      {/* Modals */}
      <PostFormModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        isDark={isDark}
        currentUser={currentUser}
        showToast={showToast}
      />

      <ReportFormModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        categories={categories}
        severityLevels={severityLevels}
        isDark={isDark}
        currentUser={currentUser}
        showToast={showToast}
      />

      {/* Confirmation Modal */}
      <DeleteConfirmationModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, itemToDelete: null, isDeleting: false })}
        onConfirm={confirmDelete}
        isDark={isDark}
        isDeleting={deleteModal.isDeleting} 
      />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
      
      {/* Animations Styles */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        @keyframes slide-down { from { opacity: 0; transform: translateY(-5px); max-height: 0; } to { opacity: 1; transform: translateY(0); max-height: 500px; } }
        .animate-slide-down { animation: slide-down 0.3s ease-out; overflow: hidden; }
      `}</style>
    </div>
  );
}