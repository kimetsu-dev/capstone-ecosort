import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import {
  onAuthStateChanged,
} from "firebase/auth";
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

// SVG Icon Components (retained as in original)
const MapPinIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);
const ClockIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const ThumbsUpIcon = ({ filled = false, ...props }) => (
  <svg
    {...props}
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7v13m-3-4l-2 2m5-6h7"
    />
  </svg>
);
const MessageCircleIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);
const SendIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
    />
  </svg>
);
const AlertTriangleIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
);
const UserIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
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

// Firebase Storage instance
const storage = getStorage();

function Toast({ visible, message, type }) {
  if (!visible) return null;
  const bg =
    type === "error"
      ? "bg-red-600"
      : type === "success"
      ? "bg-green-600"
      : "bg-blue-600";
  return (
    <div
      className={`fixed bottom-6 right-6 px-6 py-3 rounded shadow-lg text-white z-50 select-none ${
        bg
      }`}
      role="alert"
      aria-live="assertive"
    >
      {message}
    </div>
  );
}

function FilterTabs({ filterType, setFilterType }) {
  const categoryOptions = [
    { id: "all", label: "All Reports", icon: "📋" },
    { id: "illegal_dumping", label: "Illegal Dumping", icon: "🚯" },
    { id: "littering", label: "Littering", icon: "🗑️" },
    { id: "environmental", label: "Environmental", icon: "🌳" },
    { id: "vandalism", label: "Vandalism", icon: "🚧" },
    { id: "noise", label: "Noise", icon: "🔊" },
    { id: "other", label: "Other", icon: "❓" },
  ];
  return (
    <div
      className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-indigo-400 scrollbar-track-indigo-100"
      role="tablist"
      aria-label="Report categories"
    >
      {categoryOptions.map((f) => (
        <button
          key={f.id}
          onClick={() => setFilterType(f.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            filterType === f.id
              ? "bg-indigo-500 text-white shadow-lg"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
          role="tab"
          aria-selected={filterType === f.id}
          tabIndex={filterType === f.id ? 0 : -1}
          type="button"
        >
          <span aria-hidden="true">{f.icon}</span>
          <span className="font-medium">{f.label}</span>
        </button>
      ))}
    </div>
  );
}

function CommentList({ comments = [] }) {
  const formatTimeAgo = (ts) => {
    if (!ts) return "N/A";
    const date = ts instanceof Date ? ts : new Date(ts.seconds * 1000);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div
      className="p-4 space-y-3 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-400 scrollbar-track-indigo-100"
      aria-live="polite"
    >
      {comments.length === 0 ? (
        <div className="text-slate-400 text-sm select-none">No comments yet</div>
      ) : (
        comments.map((comment, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold select-none">
              {comment.user?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-slate-800 select-text break-words">
                  {comment.user || "Anonymous"}
                </span>
                <span className="text-xs text-slate-500 select-text">{formatTimeAgo(comment.timestamp)}</span>
              </div>
              <p className="text-slate-700 text-sm whitespace-pre-wrap break-words">{comment.text}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ReportItem({
  report,
  currentUser,
  commentText,
  setCommentText,
  commentSubmit,
  toggleComments,
  isCommentsExpanded,
  handleLike,
}) {
  const likeCount = report.likes?.length || 0;
  const isLiked = report.likes?.includes(currentUser?.uid);
  const commentCount = report.comments?.length || 0;

  function getSeverityColor(severity) {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }
  function formatTimeAgo(ts) {
    if (!ts) return "N/A";
    const date = ts instanceof Date ? ts : new Date(ts.seconds * 1000);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return (
    <article
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-400"
      tabIndex={0}
      aria-label={`Report from ${report.location}`}
    >
      <div className="p-6 pb-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 gap-4 md:gap-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg select-none">
              {report.location.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <MapPinIcon className="text-slate-500 h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="font-semibold text-slate-800">{report.location}</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(
                    report.severity
                  )} whitespace-nowrap select-none`}
                >
                  {report.severity?.toUpperCase() || "REPORTED"}
                </span>
              </div>

              {/* NEW: Display author username */}
              <div className="text-sm text-slate-600 select-text mb-1">
                Reported by: <span className="font-semibold">{report.authorUsername || "Unknown"}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500 select-none">
                <ClockIcon className="h-4 w-4" aria-hidden="true" />
                <span>{formatTimeAgo(report.submittedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap break-words">{report.description}</p>

        {/* Media */}
        {report.mediaUrl && (
          <div className="mb-4 rounded-xl overflow-hidden max-h-[320px] md:max-h-80">
            {/\.(mp4|webm|ogg)$/i.test(report.mediaUrl) ? (
              <video controls className="w-full h-full object-cover rounded-xl" preload="metadata" aria-label="Reported video content">
                <source src={report.mediaUrl} type="video/mp4" />
                Sorry, your browser doesn't support embedded videos.
              </video>
            ) : (
              <img
                src={report.mediaUrl}
                alt="Report evidence"
                className="w-full max-h-80 object-cover rounded-xl hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://placehold.co/600x400/E0E7FF/4338CA?text=Image+Error`;
                }}
              />
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => handleLike(report.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isLiked ? "bg-blue-50 text-blue-600" : "hover:bg-slate-50 text-slate-600"
            }`}
            aria-pressed={isLiked}
            aria-label={`Like this report, ${likeCount} ${likeCount === 1 ? "like" : "likes"}`}
            type="button"
          >
            <ThumbsUpIcon filled={isLiked} aria-hidden="true" className="h-5 w-5" />
            <span className="font-medium">{likeCount}</span>
            <span className="text-sm select-none">Like{likeCount !== 1 ? "s" : ""}</span>
          </button>
          <button
            onClick={() => toggleComments(report.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-slate-50 text-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-expanded={isCommentsExpanded}
            aria-controls={`comments-${report.id}`}
            aria-label="Show or hide comments"
            type="button"
          >
            <MessageCircleIcon aria-hidden="true" className="h-5 w-5" />
            <span className="font-medium">{commentCount}</span>
            <span className="text-sm select-none">Comment{commentCount !== 1 ? "s" : ""}</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {(isCommentsExpanded || commentCount > 0) && (
        <section
          id={`comments-${report.id}`}
          className="border-t border-slate-100 bg-slate-50/50"
          aria-live="polite"
        >
          <CommentList comments={report.comments} />
          {/* Add new comment */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 select-none">
                {currentUser?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commentSubmit(report.id);
                }}
                className="flex-1 flex gap-2"
                aria-label="Add a new comment form"
              >
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentText[report.id] || ""}
                  onChange={(e) =>
                    setCommentText((prev) => ({
                      ...prev,
                      [report.id]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      commentSubmit(report.id);
                    }
                  }}
                  className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-shadow"
                  aria-label="Write a comment"
                  spellCheck="true"
                />
                <button
                  type="submit"
                  disabled={!commentText[report.id]?.trim()}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Send comment"
                >
                  <SendIcon aria-hidden="true" className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        </section>
      )}
    </article>
  );
}


export default function Forum() {
  const [reports, setReports] = useState([]);
  const [commentText, setCommentText] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  const [newReportLocation, setNewReportLocation] = useState("");
  const [newReportDescription, setNewReportDescription] = useState("");
  const [newReportSeverity, setNewReportSeverity] = useState("medium");
  const [newReportCategory, setNewReportCategory] = useState("illegal_dumping");
  const [newReportMediaUrl, setNewReportMediaUrl] = useState("");
  const [newReportFile, setNewReportFile] = useState(null);
  const [loadingReportSubmit, setLoadingReportSubmit] = useState(false);

  const navigate = useNavigate();
  const ArrowLeft = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );

  const reportsCollectionPath = "violation_reports";

  // Toast utility
  const showToast = useCallback((message, type = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "info" }), 4000);
  }, []);
  const [username, setUsername] = useState(null);
  // Auth state listener
  useEffect(() => {
    setLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time reports fetching for violation_reports
  useEffect(() => {
    if (loadingAuth) return;
    setLoading(true);

    const reportsCollectionRef = collection(db, reportsCollectionPath);
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
        }));
        setReports(fetchedReports);
        setLoading(false);
      },
      (err) => {
        setError("Failed to fetch reports. Check permissions and network.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [loadingAuth]);

  // File upload handler and new report submission
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setNewReportFile(e.target.files[0]);
    } else {
      setNewReportFile(null);
    }
  };

  // Use Geolocation to fill location input
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // For simplicity, just show coordinates. You can integrate geocoding here.
        setNewReportLocation(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
        showToast("Location set from your current position", "success");
      },
      (error) => {
        console.error(error);
        alert("Unable to fetch your location");
      }
    );
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showToast("Please log in to submit a report.", "error");
      return;
    }

    if (!newReportLocation.trim() || !newReportDescription.trim()) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    setLoadingReportSubmit(true);

    try {
      let uploadedMediaUrl = "";

      if (newReportFile) {
        const fileRef = storageRef(
          storage,
          `reports/${currentUser.uid}/${Date.now()}_${newReportFile.name}`
        );
        await uploadBytes(fileRef, newReportFile);
        uploadedMediaUrl = await getDownloadURL(fileRef);
      } else {
        uploadedMediaUrl = newReportMediaUrl.trim();
      }

      // Fetch username to store with report
      let username = currentUser.email || currentUser.uid;
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.username) username = userData.username;
        }
      } catch (err) {
        console.error("Failed to fetch username for report submission:", err);
      }

      await addDoc(collection(db, reportsCollectionPath), {
        location: newReportLocation,
        description: newReportDescription,
        severity: newReportSeverity,
        category: newReportCategory,
        mediaUrl: uploadedMediaUrl || "",
        submittedAt: serverTimestamp(),
        likes: [],
        comments: [],
        authorId: currentUser.uid,
        authorEmail: currentUser.email,
        authorUsername: username, // <-- add username here
      });

      // Reset form and close modal
      setShowReportModal(false);
      setNewReportLocation("");
      setNewReportDescription("");
      setNewReportSeverity("medium");
      setNewReportCategory("illegal_dumping");
      setNewReportMediaUrl("");
      setNewReportFile(null);
      showToast("Report submitted successfully!", "success");
    } catch (error) {
      showToast("Failed to submit report. Please try again.", "error");
      console.error(error);
    } finally {
      setLoadingReportSubmit(false);
    }
  };

  // Like toggle handler
  const handleLike = async (reportId) => {
    if (!currentUser) {
      showToast("Please log in to like a report.", "info");
      return;
    }
    const reportRef = doc(db, reportsCollectionPath, reportId);
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

    const reportRef = doc(db, reportsCollectionPath, reportId);

    const comment = {
      text,
      user: username || currentUser.email || currentUser.uid || "anonymous", // Use username here
      timestamp: new Date(),
    };

    try {
      await updateDoc(reportRef, {
        comments: arrayUnion(comment),
      });
      setCommentText((prev) => ({ ...prev, [reportId]: "" }));
      showToast("Comment posted!", "success");
    } catch (e) {
      console.error("Failed to add comment:", e);
      showToast("Failed to add comment. Please try again.", "error");
    }
  };

  // Toggle comment visibility
  const toggleComments = (reportId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [reportId]: !prev[reportId],
    }));
  };

  // Filtered reports by category
  const filteredReports =
    filterType === "all" ? reports : reports.filter((report) => report.category === filterType);

  // Loading and error UI
  if (loadingAuth || (loading && !error)) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4" />
        <p className="text-lg text-gray-700 select-none">Loading application...</p>
      </main>
    );
  }

  if (error && !loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-red-50 px-4">
        <section
          className="bg-white rounded-lg p-8 shadow-lg text-center max-w-md mx-auto"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangleIcon className="text-red-500 text-6xl mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Error Loading Data</h2>
          <p className="text-gray-700 select-text">{error}</p>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-slate-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Back to Dashboard"
              type="button"
            >
              <ArrowLeft />
              <span className="font-medium">Dashboard</span>
            </button>

            <button
              onClick={() => navigate("/profile")}
              className="p-2 hover:bg-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Go to Profile"
              type="button"
            >
              <UserIcon className="text-slate-600 h-6 w-6" />
            </button>
            <div className="min-w-0 overflow-hidden">
              <h1 className="font-bold text-xl text-ellipsis whitespace-nowrap overflow-hidden">
                Community Reports
              </h1>
              <p className="text-sm text-slate-600 truncate select-text">ECOSORT</p>
            </div>
          </div>
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-5 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
            aria-label="Open report submission modal"
            type="button"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Report Issue</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6" role="main">
        <FilterTabs filterType={filterType} setFilterType={setFilterType} />
        <div className="space-y-6">
          {filteredReports.length === 0 ? (
            <section
              aria-live="polite"
              className="text-center py-12 bg-white rounded-2xl shadow-sm select-none"
            >
              <AlertTriangleIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No reports found</h3>
              <p className="text-slate-500">Be the first to report an issue in your community!</p>
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
              />
            ))
          )}
        </div>
      </main>

      {/* Report Submission Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 id="report-modal-title" className="text-xl font-bold text-slate-800 select-none">
                Submit New Report
              </h2>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                aria-label="Close report submission"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="report-location"
                  className="block text-sm font-medium text-slate-700 mb-1 select-none"
                >
                  Location *
                </label>
                <div className="flex gap-2">
                  <input
                    id="report-location"
                    type="text"
                    value={newReportLocation}
                    onChange={(e) => setNewReportLocation(e.target.value)}
                    className="flex-1 p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Main Street Park"
                    required
                    autoComplete="off"
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={useMyLocation}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                    aria-label="Use my current location"
                  >
                    Use My Location
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="report-description"
                  className="block text-sm font-medium text-slate-700 mb-1 select-none"
                >
                  Description *
                </label>
                <textarea
                  id="report-description"
                  value={newReportDescription}
                  onChange={(e) => setNewReportDescription(e.target.value)}
                  rows={4}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                  placeholder="Describe the issue in detail..."
                  required
                  aria-required="true"
                  spellCheck="true"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="report-severity"
                    className="block text-sm font-medium text-slate-700 mb-1 select-none"
                  >
                    Severity
                  </label>
                  <select
                    id="report-severity"
                    value={newReportSeverity}
                    onChange={(e) => setNewReportSeverity(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="report-category"
                    className="block text-sm font-medium text-slate-700 mb-1 select-none"
                  >
                    Category
                  </label>
                  <select
                    id="report-category"
                    value={newReportCategory}
                    onChange={(e) => setNewReportCategory(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="illegal_dumping">Illegal Dumping</option>
                    <option value="littering">Littering</option>
                    <option value="environmental">Environmental</option>
                    <option value="vandalism">Vandalism</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor="report-file"
                  className="block text-sm font-medium text-slate-700 mb-1 select-none"
                >
                  Attach Proof (Optional)
                </label>
                <input
                  id="report-file"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="w-full"
                  aria-describedby="file-helptext"
                />
                <p id="file-helptext" className="text-xs text-slate-400 mt-1 select-none">
                  Upload an image or video file as proof of the issue.
                </p>
              </div>
              <div>
                <label
                  htmlFor="report-media-url"
                  className="block text-sm font-medium text-slate-700 mb-1 select-none"
                >
                  Media URL (Optional)
                </label>
                <input
                  id="report-media-url"
                  type="url"
                  value={newReportMediaUrl}
                  onChange={(e) => setNewReportMediaUrl(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="URL to an image or video (if you prefer)"
                  aria-describedby="media-url-helptext"
                  autoComplete="off"
                />
                <p id="media-url-helptext" className="text-xs text-slate-400 mt-1 select-none">
                  Provide a URL to an image or video.
                </p>
              </div>

              <button
                type="submit"
                disabled={loadingReportSubmit}
                className="w-full bg-indigo-600 text-white p-3 rounded-md font-semibold hover:bg-indigo-700 transition-colors disabled:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                aria-busy={loadingReportSubmit}
              >
                {loadingReportSubmit ? "Submitting..." : "Submit Report"}
              </button>
            </form>
          </div>
        </div>
      )}

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}
