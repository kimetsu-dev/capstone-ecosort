import { useState, useMemo, useEffect, useCallback } from 'react';
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
import { db, auth } from '../../firebase'; // Adjust path if necessary based on your project structure

// --- Icons ---
const MessageCircleIcon = () => <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const ThumbsUpIcon = ({ filled }) => <svg fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>;
const TrashIcon = () => <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const XIcon = () => <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;

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
      let uploadedMediaUrl = "";
      if (mediaFile) {
        const fileRef = storageRef(storage, `posts/admin/${Date.now()}_${mediaFile.name}`);
        await uploadBytes(fileRef, mediaFile);
        uploadedMediaUrl = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, "violation_reports"), { // Saving to same collection as per Forum architecture
        type: 'post',
        title: formData.title,
        description: formData.description,
        mediaUrl: uploadedMediaUrl,
        submittedAt: serverTimestamp(),
        likes: [],
        comments: [],
        authorId: auth.currentUser.uid,
        authorUsername: "Admin", // Explicitly marking as Admin
        isAdminPost: true
      });

      setFormData({ title: "", description: "" });
      setMediaFile(null);
      onClose();
      showToast("Admin post created successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to create post.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`rounded-2xl shadow-2xl w-full max-w-lg ${isDark ? "bg-gray-800 text-white" : "bg-white text-slate-900"}`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold">Create Admin Announcement</h2>
          <button onClick={onClose}><XIcon /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input 
            type="text" 
            placeholder="Title"
            required
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`}
          />
          <textarea 
            rows={4}
            placeholder="Content..."
            required
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`}
          />
          <input type="file" onChange={e => e.target.files[0] && setMediaFile(e.target.files[0])} className="text-sm" />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold">
            {loading ? "Posting..." : "Post"}
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
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSeverity, setEditingSeverity] = useState(null);

  // --- Initial Data Processing & User Fetching ---
  useEffect(() => {
    async function processData() {
      const itemsWithUsers = await Promise.all(
        reports.map(async (item) => {
          // Normalize type (legacy support)
          const type = item.type || 'report';
          
          if (item.userName || item.authorUsername) return { ...item, type };

          try {
            const userDoc = await getDoc(doc(db, 'users', item.reportedBy || item.authorId));
            const userData = userDoc.exists() ? userDoc.data() : null;
            return {
              ...item,
              type,
              userName: userData?.username || item.authorUsername || "Unknown User",
            };
          } catch (err) {
            return { ...item, type, userName: item.authorUsername || "Unknown User" };
          }
        })
      );
      setProcessedItems(itemsWithUsers);
    }
    processData();
  }, [reports]);

  // --- Configuration Loading (Preserved) ---
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
        if (!data.categories?.find(c => c.id === 'all')) {
          setCategories(prev => [{ id: "all", label: "All", icon: "📋" }, ...prev]);
        }
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
      showToast("Configuration saved!", "success");
    } catch (e) { showToast("Save failed", "error"); } finally { setConfigSaving(false); }
  };

  // --- Actions: Like, Comment, Delete, Status ---
  const handleLike = async (id) => {
    if (!auth.currentUser) return;
    const item = processedItems.find(i => i.id === id);
    if (!item) return;
    const isLiked = item.likes?.includes(auth.currentUser.uid);
    const docRef = doc(db, "violation_reports", id);
    
    try {
        await updateDoc(docRef, { likes: isLiked ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid) });
        // Optimistic update
        setProcessedItems(prev => prev.map(i => i.id === id ? {
            ...i, likes: isLiked ? i.likes.filter(uid => uid !== auth.currentUser.uid) : [...(i.likes || []), auth.currentUser.uid]
        } : i));
    } catch (e) { showToast("Action failed", "error"); }
  };

  const handleSubmitComment = async (id) => {
    const text = commentText[id]?.trim();
    if (!text || !auth.currentUser) return;

    try {
      const newComment = { text, user: "Admin", timestamp: new Date() };
      await updateDoc(doc(db, "violation_reports", id), {
        comments: arrayUnion(newComment)
      });
      setCommentText(prev => ({ ...prev, [id]: "" }));
      // Optimistic update handled by snapshot listener in parent, but we can do it here too
      showToast("Comment added", "success");
    } catch (e) { showToast("Failed to comment", "error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this content permanently?")) return;
    try {
      await deleteDoc(doc(db, "violation_reports", id));
      setReports(prev => prev.filter(r => r.id !== id));
      showToast("Content deleted", "success");
    } catch (e) { showToast("Delete failed", "error"); }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "violation_reports", id), { status: newStatus, updatedAt: new Date() });
      setProcessedItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
      showToast(`Status updated to ${newStatus}`, "success");
    } catch (e) { showToast("Status update failed", "error"); }
  };

  // --- Filtering & Sorting Logic ---
  const getSeverityColor = (severity) => {
    const map = {
      high: isDark ? "bg-red-900/50 text-red-200" : "bg-red-100 text-red-800",
      medium: isDark ? "bg-orange-900/50 text-orange-200" : "bg-orange-100 text-orange-800",
      low: isDark ? "bg-yellow-900/50 text-yellow-200" : "bg-yellow-100 text-yellow-800",
    };
    return map[severity] || (isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800");
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    const config = {
      'in review': { color: 'blue', label: 'In Review' },
      resolved: { color: 'emerald', label: 'Resolved' },
      pending: { color: 'gray', label: 'Pending' }
    }[status.toLowerCase()] || { color: 'gray', label: status };

    const style = isDark 
      ? `bg-${config.color}-900/50 text-${config.color}-200 border-${config.color}-500/50`
      : `bg-${config.color}-100 text-${config.color}-800 border-${config.color}-200`;

    return <span className={`px-2 py-0.5 rounded text-xs border ${style}`}>{config.label}</span>;
  };

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
        (i.userName?.toLowerCase().includes(q)) ||
        (i.location?.toLowerCase().includes(q))
      );
    }

    // 3. Status Filter (Reports Only)
    if (contentTab === 'reports' && statusFilter !== 'all') {
      items = items.filter(i => (i.status || 'pending').toLowerCase() === statusFilter);
    }

    // 4. Sort
    items.sort((a, b) => {
        const dateA = a.submittedAt?.seconds ? new Date(a.submittedAt.seconds * 1000) : new Date();
        const dateB = b.submittedAt?.seconds ? new Date(b.submittedAt.seconds * 1000) : new Date();
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return items;
  }, [processedItems, contentTab, searchTerm, statusFilter, sortBy]);

  // --- Render Helpers ---
  const renderItem = (item) => {
    const isReport = contentTab === 'reports';
    const isLiked = item.likes?.includes(auth.currentUser?.uid);
    const isExpanded = expandedComments[item.id];

    return (
      <div key={item.id} className={`rounded-xl border p-5 transition-all ${isDark ? "bg-gray-800 border-gray-700 hover:border-gray-600" : "bg-white border-slate-200 hover:shadow-md"}`}>
        
        {/* Header: User & Meta */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isReport ? "bg-red-500" : "bg-blue-500"}`}>
              {(item.userName?.charAt(0) || "U").toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${isDark ? "text-gray-100" : "text-gray-900"}`}>{item.userName}</span>
                {isReport && (
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${getSeverityColor(item.severity)}`}>
                    {item.severity || 'Medium'}
                  </span>
                )}
              </div>
              <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {item.submittedAt?.seconds ? new Date(item.submittedAt.seconds * 1000).toLocaleString() : 'Just now'}
                {isReport && item.location && ` • ${item.location}`}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {isReport && getStatusBadge(item.status || 'pending')}
            <button 
                onClick={() => handleDelete(item.id)}
                className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Delete Permanently"
            >
                <TrashIcon />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mb-4 pl-12 sm:pl-12">
            {item.title && <h3 className={`text-lg font-bold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>{item.title}</h3>}
            <p className={`text-sm ${isDark ? "text-gray-300" : "text-slate-700"} whitespace-pre-wrap`}>{item.description}</p>
            
            {item.mediaUrl && (
                <div className="mt-3 rounded-lg overflow-hidden max-w-md bg-black/5">
                     {/\.(mp4|webm|ogg)$/i.test(item.mediaUrl) ? (
                        <video controls className="w-full max-h-60 object-cover"><source src={item.mediaUrl} /></video>
                     ) : (
                        <img src={item.mediaUrl} alt="Attachment" className="w-full max-h-60 object-cover" />
                     )}
                </div>
            )}
        </div>

        {/* Admin Controls (Status) - Only for Reports */}
        {isReport && (
          <div className={`ml-12 mb-4 p-3 rounded-lg flex gap-2 items-center ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
             <span className="text-xs font-semibold uppercase opacity-60">Update Status:</span>
             <button 
                onClick={() => handleStatusUpdate(item.id, 'in review')}
                className={`text-xs px-3 py-1 rounded transition ${item.status === 'in review' ? 'bg-blue-500 text-white' : 'hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-500'}`}
             >In Review</button>
             <button 
                onClick={() => handleStatusUpdate(item.id, 'resolved')}
                className={`text-xs px-3 py-1 rounded transition ${item.status === 'resolved' ? 'bg-emerald-500 text-white' : 'hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-500'}`}
             >Resolved</button>
          </div>
        )}

        {/* Social Actions */}
        <div className={`ml-12 pt-3 border-t flex items-center gap-4 ${isDark ? "border-gray-700" : "border-slate-100"}`}>
            <button 
                onClick={() => handleLike(item.id)}
                className={`flex items-center gap-1.5 text-sm ${isLiked ? "text-blue-500" : "text-gray-500"}`}
            >
                <ThumbsUpIcon filled={isLiked} /> <span>{item.likes?.length || 0}</span>
            </button>
            <button 
                onClick={() => setExpandedComments(prev => ({...prev, [item.id]: !prev[item.id]}))}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-500"
            >
                <MessageCircleIcon /> <span>{item.comments?.length || 0} Comments</span>
            </button>
        </div>

        {/* Comments Section */}
        {isExpanded && (
            <div className="mt-4 ml-12 animate-fade-in">
                <div className={`max-h-40 overflow-y-auto mb-3 space-y-2 p-2 rounded ${isDark ? "bg-black/20" : "bg-gray-50"}`}>
                    {item.comments?.length === 0 && <div className="text-xs opacity-50 text-center py-2">No comments yet.</div>}
                    {item.comments?.map((c, i) => (
                        <div key={i} className="text-sm">
                            <span className="font-bold mr-2">{c.user}:</span>
                            <span className="opacity-80">{c.text}</span>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Write an admin comment..." 
                        value={commentText[item.id] || ""}
                        onChange={e => setCommentText({...commentText, [item.id]: e.target.value})}
                        className={`flex-1 text-sm px-3 py-1.5 rounded border ${isDark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`}
                    />
                    <button 
                        onClick={() => handleSubmitComment(item.id)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
                    >Send</button>
                </div>
            </div>
        )}
      </div>
    );
  };

  // --- Category Management (Preserved Logic Helpers) ---
  const addCategory = () => {
    if (!newCategory.id || !newCategory.label || categories.find(c => c.id === newCategory.id)) return showToast("Invalid Category", "error");
    setCategories([...categories, newCategory]);
    setNewCategory({id:'', label:''});
  };
  const deleteCategory = (idx) => {
    if (categories[idx].id === 'all') return;
    setCategories(categories.filter((_, i) => i !== idx));
  };
  const addSeverity = () => {
     if (!newSeverity.value || !newSeverity.label) return;
     setSeverityLevels([...severityLevels, newSeverity]);
     setNewSeverity({value:'', label:''});
  };
  const deleteSeverity = (idx) => setSeverityLevels(severityLevels.filter((_, i) => i !== idx));

  // --- MAIN RENDER ---
  return (
    <div className={`space-y-6 ${isDark ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"}`}>
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? "text-gray-100" : "text-slate-800"}`}>Forum & Reports</h2>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>Moderate user discussions and manage violation reports.</p>
        </div>
        
        {/* New Admin Post Button */}
        {mainTab === 'content' && contentTab === 'posts' && (
            <button 
                onClick={() => setShowPostModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30 flex items-center gap-2"
            >
                <span>+</span> New Admin Post
            </button>
        )}
      </div>

      {/* Main Tabs (Content vs Config) */}
      <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"} rounded-xl shadow-sm border p-1 flex mb-4`}>
        <button onClick={() => setMainTab('content')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mainTab === 'content' ? (isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-slate-900') : 'text-gray-500'}`}>Content Management</button>
        <button onClick={() => setMainTab('configuration')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mainTab === 'configuration' ? (isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-slate-900') : 'text-gray-500'}`}>Form Configuration</button>
      </div>

      {/* --- CONTENT TAB --- */}
      {mainTab === 'content' && (
        <div className="space-y-4">
          
          {/* Sub-Tabs: Posts vs Reports */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
             <button 
                onClick={() => setContentTab('reports')}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${contentTab === 'reports' ? "border-red-500 text-red-500" : "border-transparent text-gray-500 hover:text-gray-400"}`}
             >Violation Reports</button>
             <button 
                onClick={() => setContentTab('posts')}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${contentTab === 'posts' ? "border-blue-500 text-blue-500" : "border-transparent text-gray-500 hover:text-gray-400"}`}
             >User Discussions</button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
             <input 
                type="text" 
                placeholder={`Search ${contentTab}...`} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`flex-1 px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
             />
             {contentTab === 'reports' && (
                 <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)}
                    className={`px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
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
                className={`px-4 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
             >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
             </select>
          </div>

          {/* Feed List */}
          <div className="space-y-4">
            {filteredItems.length === 0 ? (
                <div className="text-center py-10 opacity-50 border-2 border-dashed rounded-xl">
                    No {contentTab} found matching your filters.
                </div>
            ) : (
                filteredItems.map(item => renderItem(item))
            )}
          </div>
        </div>
      )}

      {/* --- CONFIGURATION TAB (Logic Preserved) --- */}
      {mainTab === 'configuration' && (
        <div className="space-y-6 animate-fade-in">
           <div className="flex justify-end"><button onClick={saveConfiguration} disabled={configSaving} className="bg-green-600 text-white px-4 py-2 rounded shadow">{configSaving ? "Saving..." : "Save Changes"}</button></div>
           
           {/* Categories */}
           <div className={`p-6 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"}`}>
              <h3 className="font-bold mb-4">Categories</h3>
              <div className="flex gap-2 mb-4">
                 <input placeholder="ID" value={newCategory.id} onChange={e=>setNewCategory({...newCategory, id:e.target.value})} className={`p-2 rounded border ${isDark ? "bg-gray-700 border-gray-600" : "bg-white"}`} />
                 <input placeholder="Label" value={newCategory.label} onChange={e=>setNewCategory({...newCategory, label:e.target.value})} className={`p-2 rounded border ${isDark ? "bg-gray-700 border-gray-600" : "bg-white"}`} />
                 <button onClick={addCategory} className="bg-blue-600 text-white px-4 rounded">Add</button>
              </div>
              <div className="space-y-2">
                 {categories.map((c, i) => (
                    <div key={i} className={`flex justify-between p-2 rounded ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                       <span>{c.label} ({c.id})</span>
                       {c.id !== 'all' && <button onClick={() => deleteCategory(i)} className="text-red-500 text-sm">Delete</button>}
                    </div>
                 ))}
              </div>
           </div>

           {/* Severity */}
           <div className={`p-6 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"}`}>
              <h3 className="font-bold mb-4">Severity Levels</h3>
              <div className="flex gap-2 mb-4">
                 <input placeholder="Value" value={newSeverity.value} onChange={e=>setNewSeverity({...newSeverity, value:e.target.value})} className={`p-2 rounded border ${isDark ? "bg-gray-700 border-gray-600" : "bg-white"}`} />
                 <input placeholder="Label" value={newSeverity.label} onChange={e=>setNewSeverity({...newSeverity, label:e.target.value})} className={`p-2 rounded border ${isDark ? "bg-gray-700 border-gray-600" : "bg-white"}`} />
                 <button onClick={addSeverity} className="bg-blue-600 text-white px-4 rounded">Add</button>
              </div>
              <div className="space-y-2">
                 {severityLevels.map((s, i) => (
                    <div key={i} className={`flex justify-between p-2 rounded ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                       <span>{s.label}</span>
                       <button onClick={() => deleteSeverity(i)} className="text-red-500 text-sm">Delete</button>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Modals */}
      <AdminPostModal isOpen={showPostModal} onClose={() => setShowPostModal(false)} isDark={isDark} showToast={showToast} />
    </div>
  );
}