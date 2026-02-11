import React, { useState, useMemo, useEffect } from 'react';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  arrayUnion, 
  arrayRemove, 
  addDoc, 
  collection, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage";
import { db, auth } from '../../firebase';

// --- Icons ---
const MessageCircleIcon = ({ className }) => <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const ThumbsUpIcon = ({ filled, className }) => <svg fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>;
const TrashIcon = ({ className }) => <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const XIcon = ({ className }) => <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const ShieldCheckIcon = ({ className }) => <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ClockIcon = ({ className }) => <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// --- Helper Functions ---
const formatTimeAgo = (dateInput) => {
  if (!dateInput) return "Unknown date";
  
  // Handle Firestore Timestamp or JS Date or string
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (isNaN(diffInSeconds)) return "Invalid date";

  if (diffInSeconds < 60) return "Just now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  
  return date.toLocaleDateString();
};

// --- Admin Post Modal ---
function AdminPostModal({ isOpen, onClose, isDark, showToast }) {
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [mediaFile, setMediaFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const storage = getStorage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return showToast("Admin authentication lost.", "error");
    setLoading(true);

    try {
      // Fetch admin profile to attach to post
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const adminName = userData.displayName || "Admin";
      const adminPhoto = userData.profileUrl || userData.photoURL || "";

      let uploadedMediaUrl = "";
      if (mediaFile) {
        const fileRef = storageRef(storage, `posts/admin/${Date.now()}_${mediaFile.name}`);
        await uploadBytes(fileRef, mediaFile);
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
        authorId: auth.currentUser.uid,
        authorUsername: adminName,
        authorPhotoUrl: adminPhoto,
        isAdminPost: true,
        status: 'approved'
      });

      setFormData({ title: "", description: "" });
      setMediaFile(null);
      onClose();
      showToast("Admin announcement posted!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to create post.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden ${isDark ? "bg-gray-800 text-white" : "bg-white text-slate-900"}`}>
        <div className={`px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"} flex justify-between items-center`}>
          <h2 className="text-lg font-bold flex items-center gap-2">
            📢 Create Announcement
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><XIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">Title</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-700 border-gray-600 focus:border-blue-500" : "bg-white border-gray-300 focus:border-blue-500"} focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
              placeholder="e.g., Collection Schedule Update"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">Message</label>
            <textarea 
              rows={4}
              required
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-700 border-gray-600 focus:border-blue-500" : "bg-white border-gray-300 focus:border-blue-500"} focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none`}
              placeholder="What's the update?"
            />
          </div>
          <div>
             <label className="block text-sm font-medium mb-1 opacity-70">Attachment (Optional)</label>
             <input 
              type="file" 
              onChange={e => e.target.files[0] && setMediaFile(e.target.files[0])} 
              className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${isDark ? "file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600" : "file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"}`} 
             />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold transition-transform active:scale-95">
            {loading ? "Posting..." : "Post Announcement"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ReportsTab({ reports, setReports, showToast, isDark }) {
  // Navigation State
  const [mainTab, setMainTab] = useState('content'); // 'content' or 'configuration'
  const [contentTab, setContentTab] = useState('reports'); // 'reports' or 'posts'

  // Data & Filtering State
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [processedItems, setProcessedItems] = useState([]);
  const [usersCache, setUsersCache] = useState({}); // Cache for fetched user data
  
  // Interaction State
  const [commentText, setCommentText] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [showPostModal, setShowPostModal] = useState(false);

  // Configuration State
  const [categories, setCategories] = useState([]);
  const [severityLevels, setSeverityLevels] = useState([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [newCategory, setNewCategory] = useState({ id: '', label: '' });
  const [newSeverity, setNewSeverity] = useState({ value: '', label: '' });

  // --- 1. Data Processing & User Fetching ---
  useEffect(() => {
    let isMounted = true;

    async function enrichData() {
      // Create a map of items, identifying which need user fetching
      const itemsToProcess = reports.map(item => ({
        ...item,
        type: item.type || 'report', // Default to report if type missing
        // Use existing author data if available, otherwise mark for fetch
        authorName: item.authorUsername || item.userName || null,
        authorPic: item.authorPhotoUrl || item.userProfileUrl || null,
        originalDate: item.submittedAt
      }));

      // Identify IDs needing fetch (missing name or pic) AND not in cache
      const uniqueUserIds = [...new Set(itemsToProcess
        .filter(i => (!i.authorName || !i.authorPic) && i.authorId)
        .map(i => i.authorId)
      )];

      // Fetch missing users
      const newCache = { ...usersCache };
      let hasUpdates = false;

      await Promise.all(uniqueUserIds.map(async (uid) => {
        if (!newCache[uid]) {
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              newCache[uid] = userDoc.data();
              hasUpdates = true;
            }
          } catch (e) {
            console.error(`Error fetching user ${uid}`, e);
          }
        }
      }));

      if (isMounted) {
        if (hasUpdates) setUsersCache(newCache);
        
        // Final Merge
        const enriched = itemsToProcess.map(item => {
          const cachedUser = newCache[item.authorId] || {};
          return {
            ...item,
            // Priority: Document Data -> Cache -> Fallback
            displayUsername: item.authorName || cachedUser.username || cachedUser.displayName || "Unknown User",
            displayAvatar: item.authorPic || cachedUser.profileUrl || cachedUser.photoURL || null,
          };
        });
        
        setProcessedItems(enriched);
      }
    }

    enrichData();
    return () => { isMounted = false; };
  }, [reports]); // Intentionally not including usersCache to avoid loops

  // --- Configuration Loading ---
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setConfigLoading(true);
      const catDoc = await getDoc(doc(db, "report_categories", "categories"));
      if (catDoc.exists()) {
        const data = catDoc.data();
        setCategories(data.categories || []);
      } else {
        setCategories([{ id: "all", label: "All Reports", icon: "📋" }]);
      }

      const sevDoc = await getDoc(doc(db, "report_categories", "severity_levels"));
      if (sevDoc.exists()) {
        setSeverityLevels(sevDoc.data().levels || []);
      } else {
        setSeverityLevels([
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" }
        ]);
      }
    } catch (e) { console.error(e); } finally { setConfigLoading(false); }
  };

  const saveConfiguration = async () => {
    try {
      setConfigSaving(true);
      await setDoc(doc(db, "report_categories", "categories"), { categories, updatedAt: new Date() });
      await setDoc(doc(db, "report_categories", "severity_levels"), { levels: severityLevels, updatedAt: new Date() });
      showToast("Configuration saved successfully!", "success");
    } catch (e) { showToast("Save failed", "error"); } finally { setConfigSaving(false); }
  };

  // --- Actions ---
  const handleLike = async (id) => {
    if (!auth.currentUser) return;
    const item = processedItems.find(i => i.id === id);
    if (!item) return;
    const isLiked = item.likes?.includes(auth.currentUser.uid);
    const docRef = doc(db, "violation_reports", id);
    
    try {
        await updateDoc(docRef, { likes: isLiked ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid) });
    } catch (e) { showToast("Action failed", "error"); }
  };

  const handleSubmitComment = async (id) => {
    const text = commentText[id]?.trim();
    if (!text || !auth.currentUser) return;

    try {
      // Get Admin details
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      const newComment = { 
        text, 
        user: userData.displayName || "Admin",
        userProfileUrl: userData.profileUrl || "",
        timestamp: new Date() 
      };

      await updateDoc(doc(db, "violation_reports", id), {
        comments: arrayUnion(newComment)
      });
      setCommentText(prev => ({ ...prev, [id]: "" }));
      showToast("Comment posted", "success");
    } catch (e) { showToast("Failed to comment", "error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this item?")) return;
    try {
      await deleteDoc(doc(db, "violation_reports", id));
      // Handled by parent snapshot listener
      showToast("Item deleted", "success");
    } catch (e) { showToast("Delete failed", "error"); }
  };

  // Updated to include notification logic
  const handleStatusUpdate = async (id, newStatus, authorId) => {
    try {
      await updateDoc(doc(db, "violation_reports", id), { status: newStatus, updatedAt: new Date() });
      
      // Notify the user of the resolution/status update
      if (authorId) {
        await addDoc(collection(db, "notifications", authorId, "userNotifications"), {
          message: `Your report status has been updated to: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
          type: "report_status",
          createdAt: serverTimestamp(),
          read: false,
        });
      }

      showToast(`Status updated to ${newStatus}`, "success");
    } catch (e) { 
      console.error(e);
      showToast("Status update failed", "error"); 
    }
  };

  // --- Filtering Logic ---
  const filteredItems = useMemo(() => {
    let items = processedItems.filter(item => {
      // 1. Content Type Filter
      if (contentTab === 'posts') return item.type === 'post';
      if (contentTab === 'reports') return item.type === 'report' || !item.type;
      return true;
    });

    // 2. Search Filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      items = items.filter(i => 
        (i.title?.toLowerCase().includes(q)) ||
        (i.description?.toLowerCase().includes(q)) ||
        (i.displayUsername?.toLowerCase().includes(q)) ||
        (i.location?.toLowerCase().includes(q))
      );
    }

    // 3. Status Filter (Reports Only)
    if (contentTab === 'reports' && statusFilter !== 'all') {
      items = items.filter(i => (i.status || 'pending').toLowerCase() === statusFilter);
    }

    // 4. Sort
    items.sort((a, b) => {
        // Handle various date formats (Timestamp, Date, string)
        const getDate = (d) => d?.seconds ? new Date(d.seconds * 1000) : new Date(d || 0);
        return sortBy === 'newest' 
          ? getDate(b.submittedAt) - getDate(a.submittedAt)
          : getDate(a.submittedAt) - getDate(b.submittedAt);
    });

    return items;
  }, [processedItems, contentTab, searchTerm, statusFilter, sortBy]);

  // --- Render Helpers ---
  const getSeverityBadge = (severity) => {
    const config = {
      high: { bg: 'bg-red-500', text: 'text-white', label: 'High Priority' },
      medium: { bg: 'bg-orange-500', text: 'text-white', label: 'Medium' },
      low: { bg: 'bg-yellow-500', text: 'text-white', label: 'Low' }
    }[severity?.toLowerCase()] || { bg: 'bg-gray-500', text: 'text-white', label: 'Normal' };

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const renderItem = (item) => {
    const isReport = item.type === 'report';
    const isLiked = item.likes?.includes(auth.currentUser?.uid);
    const isExpanded = expandedComments[item.id];
    const isAdminPost = item.isAdminPost;
    
    // Theme Colors based on Type
    const accentColor = isReport ? "red" : isAdminPost ? "purple" : "blue";
    const borderClass = isDark 
      ? `border-${accentColor}-900/30` 
      : `border-${accentColor}-100`;

    return (
      <div key={item.id} className={`group relative rounded-2xl border-l-4 p-5 transition-all duration-300 ${isDark ? `bg-gray-800 border-gray-700 hover:bg-gray-750` : `bg-white border-slate-200 shadow-sm hover:shadow-md`} ${isReport ? 'border-l-red-500' : isAdminPost ? 'border-l-purple-500' : 'border-l-blue-500'}`}>
        
        {/* Top Meta Bar */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              {item.displayAvatar ? (
                <img 
                  src={item.displayAvatar} 
                  alt={item.displayUsername} 
                  className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-sm"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm bg-gradient-to-br ${isReport ? "from-red-400 to-red-600" : "from-blue-400 to-blue-600"}`}>
                  {(item.displayUsername?.charAt(0) || "U").toUpperCase()}
                </div>
              )}
              {isAdminPost && (
                <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white p-0.5 rounded-full border-2 border-white dark:border-gray-800" title="Admin Post">
                  <ShieldCheckIcon className="w-3 h-3" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-sm ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                  {item.displayUsername}
                </span>
                {isAdminPost && (
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-[10px] font-bold uppercase">
                    Admin
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs opacity-60">
                 <span className="flex items-center gap-1">
                   <ClockIcon className="w-3 h-3" />
                   {formatTimeAgo(item.submittedAt)}
                 </span>
                 {item.location && <span>• 📍 {item.location}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
             {isReport && (
                <div className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${
                   item.status === 'resolved' 
                     ? (isDark ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                     : item.status === 'in review'
                     ? (isDark ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200')
                     : (isDark ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-200')
                }`}>
                  {item.status || 'Pending'}
                </div>
             )}
             <button 
                onClick={() => handleDelete(item.id)} 
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete"
             >
               <TrashIcon className="w-4 h-4" />
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="pl-[52px]"> {/* Align with text start */}
           {item.title && <h3 className={`text-base font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>{item.title}</h3>}
           
           <div className={`text-sm leading-relaxed mb-4 whitespace-pre-wrap ${isDark ? "text-gray-300" : "text-gray-600"}`}>
             {item.description}
           </div>

           {item.mediaUrl && (
             <div className="mb-4 rounded-xl overflow-hidden border dark:border-gray-700 max-w-lg bg-black/5">
                {/\.(mp4|webm|ogg)$/i.test(item.mediaUrl) ? (
                   <video controls className="w-full max-h-80 object-cover"><source src={item.mediaUrl} /></video>
                ) : (
                   <img src={item.mediaUrl} alt="Attachment" className="w-full max-h-80 object-cover" />
                )}
             </div>
           )}

           {isReport && (
             <div className="flex items-center gap-2 mb-4">
                {getSeverityBadge(item.severity)}
                {item.category && item.category !== 'all' && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-200"}`}>
                    Category: {categories.find(c => c.id === item.category)?.label || item.category}
                  </span>
                )}
             </div>
           )}

           {/* Admin Action Bar (Reports Only) */}
           {isReport && (
             <div className={`flex flex-wrap items-center gap-3 p-3 rounded-xl mb-4 ${isDark ? "bg-gray-700/30" : "bg-gray-50 border border-gray-100"}`}>
                <span className="text-xs font-semibold uppercase opacity-50">Admin Actions:</span>
                <button 
                   onClick={() => handleStatusUpdate(item.id, 'in review', item.authorId)}
                   className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                     item.status === 'in review' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                   }`}
                >
                  Mark In Review
                </button>
                <button 
                   onClick={() => handleStatusUpdate(item.id, 'resolved', item.authorId)}
                   className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                     item.status === 'resolved' 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                   }`}
                >
                  Mark Resolved
                </button>
             </div>
           )}

           {/* Social Footer */}
           <div className={`flex items-center gap-6 pt-3 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}>
              <button onClick={() => handleLike(item.id)} className={`flex items-center gap-2 text-sm transition-colors ${isLiked ? "text-blue-500 font-medium" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}>
                 <ThumbsUpIcon filled={isLiked} className="w-4 h-4" />
                 <span>{item.likes?.length || 0}</span>
              </button>
              <button onClick={() => setExpandedComments(p => ({...p, [item.id]: !p[item.id]}))} className={`flex items-center gap-2 text-sm transition-colors ${isExpanded ? "text-blue-500" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}>
                 <MessageCircleIcon className="w-4 h-4" />
                 <span>{item.comments?.length || 0} Comments</span>
              </button>
           </div>
        </div>

        {/* Expanded Comments */}
        {isExpanded && (
           <div className="mt-4 pl-[52px] animate-fade-in">
              <div className={`p-4 rounded-xl mb-3 space-y-3 max-h-60 overflow-y-auto ${isDark ? "bg-black/20" : "bg-slate-50"}`}>
                 {item.comments?.length === 0 && <div className="text-center text-xs opacity-50 italic">No comments yet.</div>}
                 {item.comments?.map((c, idx) => (
                    <div key={idx} className="flex gap-2.5 text-sm">
                       {c.userProfileUrl ? (
                          <img src={c.userProfileUrl} className="w-6 h-6 rounded-full object-cover" alt="u" />
                       ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-700">{c.user?.charAt(0)}</div>
                       )}
                       <div className="flex-1">
                          <div className="flex items-center gap-2">
                             <span className={`font-semibold text-xs ${isDark ? "text-gray-200" : "text-slate-800"}`}>{c.user}</span>
                             <span className="text-[10px] opacity-50">{formatTimeAgo(c.timestamp)}</span>
                          </div>
                          <p className={`opacity-80 text-sm ${isDark ? "text-gray-300" : "text-slate-600"}`}>{c.text}</p>
                       </div>
                    </div>
                 ))}
              </div>
              <div className="flex gap-2">
                 <input 
                    value={commentText[item.id] || ""}
                    onChange={e => setCommentText({...commentText, [item.id]: e.target.value})}
                    placeholder="Write an official response..." 
                    className={`flex-1 px-4 py-2 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500/20 outline-none ${isDark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`}
                 />
                 <button onClick={() => handleSubmitComment(item.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                    Send
                 </button>
              </div>
           </div>
        )}
      </div>
    );
  };

  // --- Helpers for Config Tab ---
  const addCategory = () => {
    if (!newCategory.id || !newCategory.label) return;
    setCategories([...categories, newCategory]);
    setNewCategory({id:'', label:''});
  };
  const addSeverity = () => {
     if (!newSeverity.value || !newSeverity.label) return;
     setSeverityLevels([...severityLevels, newSeverity]);
     setNewSeverity({value:'', label:''});
  };

  return (
    <div className={`space-y-6 ${isDark ? "text-gray-200" : "text-gray-900"}`}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Community Forum</h2>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Manage discussions, posts, and resolve reported violations.
          </p>
        </div>
        
        {mainTab === 'content' && contentTab === 'posts' && (
          <button 
             onClick={() => setShowPostModal(true)}
             className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
          >
             <span>📢</span> New Announcement
          </button>
        )}
      </div>

      {/* Main Tab Switcher */}
      <div className={`inline-flex rounded-xl p-1 border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"}`}>
        <button 
          onClick={() => setMainTab('content')} 
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${mainTab === 'content' ? (isDark ? 'bg-gray-700 text-white shadow' : 'bg-gray-100 text-slate-900 shadow-sm') : 'text-gray-500 hover:text-gray-700'}`}
        >
          Content Moderation
        </button>
        <button 
          onClick={() => setMainTab('configuration')} 
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${mainTab === 'configuration' ? (isDark ? 'bg-gray-700 text-white shadow' : 'bg-gray-100 text-slate-900 shadow-sm') : 'text-gray-500 hover:text-gray-700'}`}
        >
          Configuration
        </button>
      </div>

      {/* --- CONTENT TAB --- */}
      {mainTab === 'content' && (
        <div className="animate-fade-in space-y-6">
          
          {/* Sub-Tabs (Posts vs Reports) */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
             <button 
                onClick={() => setContentTab('reports')}
                className={`flex-1 sm:flex-none pb-3 px-6 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${contentTab === 'reports' ? "border-red-500 text-red-500" : "border-transparent text-gray-500 hover:text-gray-400"}`}
             >
                <ShieldCheckIcon className="w-4 h-4" /> Reports
             </button>
             <button 
                onClick={() => setContentTab('posts')}
                className={`flex-1 sm:flex-none pb-3 px-6 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${contentTab === 'posts' ? "border-blue-500 text-blue-500" : "border-transparent text-gray-500 hover:text-gray-400"}`}
             >
                <MessageCircleIcon className="w-4 h-4" /> Discussions
             </button>
          </div>

          {/* Filters Bar */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row gap-3 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"}`}>
             <input 
                type="text" 
                placeholder={`Search ${contentTab}...`} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`flex-1 px-4 py-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500/20 ${isDark ? "bg-gray-700 border-gray-600 focus:border-blue-500" : "bg-gray-50 border-gray-200 focus:border-blue-500"}`}
             />
             {contentTab === 'reports' && (
                 <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)}
                    className={`px-4 py-2.5 rounded-lg border outline-none cursor-pointer ${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}
                 >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in review">In Review</option>
                    <option value="resolved">Resolved</option>
                 </select>
             )}
             <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)}
                className={`px-4 py-2.5 rounded-lg border outline-none cursor-pointer ${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}
             >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
             </select>
          </div>

          {/* List Area */}
          <div className="space-y-4">
            {filteredItems.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
                    <div className="text-4xl mb-3 opacity-50">📭</div>
                    <p className="text-lg font-medium opacity-60">No items found</p>
                    <p className="text-sm opacity-40">Try adjusting your search or filters</p>
                </div>
            ) : (
                filteredItems.map(item => renderItem(item))
            )}
          </div>
        </div>
      )}

      {/* --- CONFIGURATION TAB --- */}
      {mainTab === 'configuration' && (
        <div className="animate-fade-in space-y-6">
           <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
             <p className="text-sm text-blue-800 dark:text-blue-300">Customize the categories and severity options users see when reporting.</p>
             <button onClick={saveConfiguration} disabled={configSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold shadow-sm transition-colors">
               {configSaving ? "Saving..." : "Save Changes"}
             </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Categories Config */}
             <div className={`p-6 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"}`}>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">📂 Categories</h3>
                <div className="flex gap-2 mb-4">
                   <input placeholder="ID (e.g. litter)" value={newCategory.id} onChange={e=>setNewCategory({...newCategory, id:e.target.value})} className={`flex-1 p-2 rounded border text-sm ${isDark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`} />
                   <input placeholder="Label (e.g. Littering)" value={newCategory.label} onChange={e=>setNewCategory({...newCategory, label:e.target.value})} className={`flex-1 p-2 rounded border text-sm ${isDark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`} />
                   <button onClick={addCategory} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 rounded text-sm font-bold">+</button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                   {categories.map((c, i) => (
                      <div key={i} className={`flex justify-between items-center p-3 rounded-lg border ${isDark ? "bg-gray-750 border-gray-700" : "bg-gray-50 border-gray-100"}`}>
                         <div className="text-sm"><span className="font-bold">{c.label}</span> <span className="opacity-50 text-xs">({c.id})</span></div>
                         {c.id !== 'all' && <button onClick={() => setCategories(categories.filter((_, idx) => idx !== i))} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded"><TrashIcon className="w-4 h-4"/></button>}
                      </div>
                   ))}
                </div>
             </div>

             {/* Severity Config */}
             <div className={`p-6 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"}`}>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">⚠️ Severity Levels</h3>
                <div className="flex gap-2 mb-4">
                   <input placeholder="Value" value={newSeverity.value} onChange={e=>setNewSeverity({...newSeverity, value:e.target.value})} className={`flex-1 p-2 rounded border text-sm ${isDark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`} />
                   <input placeholder="Label" value={newSeverity.label} onChange={e=>setNewSeverity({...newSeverity, label:e.target.value})} className={`flex-1 p-2 rounded border text-sm ${isDark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`} />
                   <button onClick={addSeverity} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 rounded text-sm font-bold">+</button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                   {severityLevels.map((s, i) => (
                      <div key={i} className={`flex justify-between items-center p-3 rounded-lg border ${isDark ? "bg-gray-750 border-gray-700" : "bg-gray-50 border-gray-100"}`}>
                         <span className="text-sm font-bold">{s.label}</span>
                         <button onClick={() => setSeverityLevels(severityLevels.filter((_, idx) => idx !== i))} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded"><TrashIcon className="w-4 h-4"/></button>
                      </div>
                   ))}
                </div>
             </div>
           </div>
        </div>
      )}

      {/* Modals */}
      <AdminPostModal isOpen={showPostModal} onClose={() => setShowPostModal(false)} isDark={isDark} showToast={showToast} />
      
      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}