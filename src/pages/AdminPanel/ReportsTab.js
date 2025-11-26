import { useState, useMemo, useEffect } from 'react';
import { doc, getDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ReportsTab({ reports, setReports, formatTimestamp, getStatusBadge, showToast, isDark }) {
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' or 'configuration'
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [reportsWithUserNames, setReportsWithUserNames] = useState([]);
  
  // Configuration states
  const [categories, setCategories] = useState([]);
  const [severityLevels, setSeverityLevels] = useState([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  
  // New category/severity form states
  const [newCategory, setNewCategory] = useState({ id: '', label: '' });
  const [newSeverity, setNewSeverity] = useState({ value: '', label: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSeverity, setEditingSeverity] = useState(null);

  // Load configuration on component mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  // Load configuration from Firebase
  const loadConfiguration = async () => {
    try {
      setConfigLoading(true);
      
      console.log("Attempting to load configuration...");
      
      // Load categories
      const categoriesDoc = await getDoc(doc(db, "report_categories", "categories"));
      if (categoriesDoc.exists()) {
        const data = categoriesDoc.data();
        console.log("Categories loaded:", data);
        const loadedCategories = data.categories || [];
        // Always ensure 'all' category exists for filtering
        if (!loadedCategories.find(cat => cat.id === 'all')) {
          setCategories([{ id: "all", label: "All Reports", icon: "📋" }, ...loadedCategories]);
        } else {
          setCategories(loadedCategories);
        }
      } else {
        console.log("Categories document does not exist, using defaults");
        // Only the 'all' category for filtering - admin must create actual categories
        setCategories([{ id: "all", label: "All Reports", icon: "📋" }]);
      }

      // Load severity levels
      const severityDoc = await getDoc(doc(db, "report_categories", "severity_levels"));
      if (severityDoc.exists()) {
        const data = severityDoc.data();
        console.log("Severity levels loaded:", data);
        setSeverityLevels(data.levels || []);
      } else {
        console.log("Severity levels document does not exist, using defaults");
        // Default severity levels if none found
        setSeverityLevels([
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ]);
      }
      
      console.log("Configuration loaded successfully");
    } catch (error) {
      console.error("Detailed error loading configuration:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      showToast(`Failed to load configuration: ${error.message}`, "error");
      
      // Use defaults on error
      setCategories([{ id: "all", label: "All Reports", icon: "📋" }]);
      setSeverityLevels([
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ]);
    } finally {
      setConfigLoading(false);
    }
  };

  // Save configuration to Firebase
  const saveConfiguration = async () => {
    try {
      setConfigSaving(true);
      
      console.log("Attempting to save categories:", categories);
      console.log("Attempting to save severity levels:", severityLevels);
      
      // Save categories
      await setDoc(doc(db, "report_categories", "categories"), {
        categories: categories,
        updatedAt: new Date()
      });
      console.log("Categories saved successfully");

      // Save severity levels
      await setDoc(doc(db, "report_categories", "severity_levels"), {
        levels: severityLevels,
        updatedAt: new Date()
      });
      console.log("Severity levels saved successfully");

      showToast("Configuration saved successfully!", "success");
    } catch (error) {
      console.error("Detailed error saving configuration:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      showToast(`Failed to save configuration: ${error.message}`, "error");
    } finally {
      setConfigSaving(false);
    }
  };

  // Category management functions
  const addCategory = () => {
    if (!newCategory.id || !newCategory.label) {
      showToast("Please fill in all category fields", "error");
      return;
    }
    
    if (categories.find(cat => cat.id === newCategory.id)) {
      showToast("Category ID already exists", "error");
      return;
    }

    setCategories([...categories, { ...newCategory }]);
    setNewCategory({ id: '', label: '' });
  };

  const updateCategory = (index, updatedCategory) => {
    const newCategories = [...categories];
    newCategories[index] = updatedCategory;
    setCategories(newCategories);
    setEditingCategory(null);
  };

  const deleteCategory = (index) => {
    if (categories[index].id === 'all') {
      showToast("Cannot delete 'All Reports' category", "error");
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this category?")) {
      const newCategories = categories.filter((_, i) => i !== index);
      setCategories(newCategories);
    }
  };

  // Severity level management functions
  const addSeverityLevel = () => {
    if (!newSeverity.value || !newSeverity.label) {
      showToast("Please fill in all severity fields", "error");
      return;
    }
    
    if (severityLevels.find(sev => sev.value === newSeverity.value)) {
      showToast("Severity value already exists", "error");
      return;
    }

    setSeverityLevels([...severityLevels, { ...newSeverity }]);
    setNewSeverity({ value: '', label: '' });
  };

  const updateSeverityLevel = (index, updatedSeverity) => {
    const newSeverityLevels = [...severityLevels];
    newSeverityLevels[index] = updatedSeverity;
    setSeverityLevels(newSeverityLevels);
    setEditingSeverity(null);
  };

  const deleteSeverityLevel = (index) => {
    if (window.confirm("Are you sure you want to delete this severity level?")) {
      const newSeverityLevels = severityLevels.filter((_, i) => i !== index);
      setSeverityLevels(newSeverityLevels);
    }
  };

  // Existing report management functions
  useEffect(() => {
    async function fetchUserNames() {
      const newReports = await Promise.all(
        reports.map(async (report) => {
          if (report.userName || report.authorUsername) return report;

          try {
            const userDoc = await getDoc(doc(db, 'users', report.reportedBy || report.authorId));
            const userData = userDoc.exists() ? userDoc.data() : null;
            return {
              ...report,
              userName: userData?.username || report.authorUsername || "Unknown User",
            };
          } catch (err) {
            console.error('Error fetching username for report:', report.id, err);
            return {
              ...report,
              userName: report.authorUsername || "Unknown User",
            };
          }
        })
      );
      setReportsWithUserNames(newReports);
    }

    if (reports.length > 0) {
      fetchUserNames();
    } else {
      setReportsWithUserNames([]);
    }
  }, [reports]);

  const updateReportStatus = async (id, newStatus) => {
    try {
      const reportRef = doc(db, 'violation_reports', id);
      await updateDoc(reportRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      setReports((prev) =>
        prev.map((report) =>
          report.id === id ? { ...report, status: newStatus } : report
        )
      );
      
      showToast(`Report status updated to ${newStatus}`, "success");
    } catch (error) {
      console.error('Error updating report status:', error);
      showToast('Failed to update report status', "error");
    }
  };

  const deleteReport = async (id) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      try {
        const reportRef = doc(db, 'violation_reports', id);
        await deleteDoc(reportRef);

        setReports((prev) => prev.filter((report) => report.id !== id));
        showToast("Report deleted", "success");
      } catch (error) {
        console.error('Error deleting report:', error);
        showToast('Failed to delete report', "error");
      }
    }
  };

  // Time formatting function
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp.seconds * 1000);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Severity color function
  const getSeverityColor = (severity, isDark) => {
    const severityMap = {
      high: isDark ? "bg-red-900/50 text-red-200 border-red-500/50" : "bg-red-100 text-red-800 border-red-200",
      medium: isDark ? "bg-yellow-900/50 text-yellow-200 border-yellow-500/50" : "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: isDark ? "bg-green-900/50 text-green-200 border-green-500/50" : "bg-green-100 text-green-800 border-green-200",
    };
    return severityMap[severity] || (isDark ? "bg-gray-700/50 text-gray-300 border-gray-500/50" : "bg-gray-100 text-gray-800 border-gray-200");
  };

  const statusCounts = useMemo(() => {
    const counts = reportsWithUserNames.reduce((acc, report) => {
      const status = typeof report.status === 'string' ? report.status.toLowerCase() : 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      all: reportsWithUserNames.length,
      pending: counts.pending || 0,
      'in review': counts['in review'] || 0,
      resolved: counts.resolved || 0,
    };
  }, [reportsWithUserNames]);

  const filteredAndSortedReports = useMemo(() => {
    let filtered = reportsWithUserNames;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => {
        const reportStatus = typeof report.status === 'string' ? report.status.toLowerCase() : 'pending';
        return reportStatus === statusFilter.toLowerCase();
      });
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(report => {
        const description = report.description || "";
        const location = report.location || "";
        const id = report.id || "";
        const userName = report.authorUsername || report.userName || "";
        const severity = report.severity || "";
        const category = report.category || "";
        return (
          description.toLowerCase().includes(lowerSearch) ||
          location.toLowerCase().includes(lowerSearch) ||
          id.toLowerCase().includes(lowerSearch) ||
          userName.toLowerCase().includes(lowerSearch) ||
          severity.toLowerCase().includes(lowerSearch) ||
          category.toLowerCase().includes(lowerSearch)
        );
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          const dateA = a.submittedAt instanceof Date ? a.submittedAt : new Date(a.submittedAt?.seconds * 1000 || 0);
          const dateB = b.submittedAt instanceof Date ? b.submittedAt : new Date(b.submittedAt?.seconds * 1000 || 0);
          return dateB - dateA;
        case 'oldest':
          const oldDateA = a.submittedAt instanceof Date ? a.submittedAt : new Date(a.submittedAt?.seconds * 1000 || 0);
          const oldDateB = b.submittedAt instanceof Date ? b.submittedAt : new Date(b.submittedAt?.seconds * 1000 || 0);
          return oldDateA - oldDateB;
        case 'location':
          return (a.location || '').localeCompare(b.location || '');
        case 'status':
          const statusA = typeof a.status === 'string' ? a.status : 'pending';
          const statusB = typeof b.status === 'string' ? b.status : 'pending';
          return statusA.localeCompare(statusB);
        case 'likes':
          return (b.likes?.length || 0) - (a.likes?.length || 0);
        case 'comments':
          return (b.comments?.length || 0) - (a.comments?.length || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [reportsWithUserNames, statusFilter, sortBy, searchTerm]);

  return (
    <div className={`space-y-6 ${isDark ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"}`}>
      <div>
        <h2 className={`text-xl font-bold ${isDark ? "text-gray-100" : "text-slate-800"}`}>Forum Management</h2>
        <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
          Manage reports and configure form options
        </p>
      </div>

      {/* Tab Navigation */}
      <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"} rounded-xl shadow-sm border p-1 flex`}>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'reports'
              ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
              : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-slate-600 hover:text-slate-800')
          }`}
        >
          View Reports ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('configuration')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'configuration'
              ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
              : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-slate-600 hover:text-slate-800')
          }`}
        >
          Form Configuration
        </button>
      </div>

      {/* Reports Tab Content */}
      {activeTab === 'reports' && (
        <>
          {/* Search and Filters */}
          <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"} rounded-xl shadow-sm border p-6`}>
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <svg className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? "text-gray-400" : "text-slate-400"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                      isDark ? "border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400" : "border-slate-300 bg-white text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter reports by status">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      statusFilter === status
                        ? (isDark ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-500 text-white shadow-sm')
                        : (isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                    }`}
                    aria-pressed={statusFilter === status}
                  >
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                  </button>
                ))}
              </div>

              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                    isDark ? "border-gray-600 bg-gray-700 text-gray-200" : "border-slate-300 bg-white text-slate-900"
                  }`}
                  disabled={reports.length === 0}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="location">By Location</option>
                  <option value="status">By Status</option>
                  <option value="likes">By Likes</option>
                  <option value="comments">By Comments</option>
                </select>
              </div>
            </div>
          </div>

          {/* Filter Results Info */}
          {(statusFilter !== 'all' || searchTerm) && (
            <div className={`${isDark ? "bg-blue-900 border-blue-800 text-blue-200" : "bg-blue-50 border-blue-200 text-blue-800"} border rounded-lg p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  Showing {filteredAndSortedReports.length} of {reports.length} reports
                  {statusFilter !== 'all' && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs text-blue-800">
                      Status: {statusFilter}
                    </span>
                  )}
                  {searchTerm && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs text-blue-800">
                      Search: "{searchTerm}"
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchTerm('');
                    setSortBy('newest');
                  }}
                  className={`${isDark ? "text-blue-400 hover:text-blue-200" : "text-blue-600 hover:text-blue-800"} text-sm font-medium`}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Reports List */}
          {filteredAndSortedReports.length === 0 ? (
            <div className={`text-center py-16 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              <div className={`${isDark ? "bg-gray-700" : "bg-slate-100"} w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4`}>
                <svg className={`w-8 h-8 ${isDark ? "text-gray-400" : "text-slate-400"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  {(searchTerm || statusFilter !== 'all') ? (
                    <circle cx="11" cy="11" r="8"/>
                  ) : (
                    <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  )}
                </svg>
              </div>
              <h3 className={`text-lg font-medium mb-2 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                {(searchTerm || statusFilter !== 'all') ? 'No matching reports' : 'No reports found'}
              </h3>
              <p>
                {(searchTerm || statusFilter !== 'all') 
                  ? 'Try adjusting your filters or search terms.' 
                  : 'All clear! No violation reports to review.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedReports.map((report) => (
                <article
                  key={report.id}
                  className={`${isDark ? "bg-gray-800 border-gray-700 text-gray-200 hover:shadow-lg" : "bg-white border-slate-200 text-slate-900 hover:shadow-md"} rounded-xl shadow-sm border p-6 transition-all duration-200`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                          {(report.authorUsername?.charAt(0) || "U").toUpperCase()}
                        </div>
                        <div>
                          <h3 className={`${isDark ? "text-gray-100" : "text-slate-800"} font-semibold`}>
                            Report #{report.id.slice(-8)}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getSeverityColor(report.severity, isDark)}`}>
                              {report.severity?.toUpperCase() || "MEDIUM"}
                            </span>
                            {getStatusBadge(report.status, isDark)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className={`flex items-center gap-1.5 mb-2 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="font-medium">{report.location}</span>
                        </div>
                      </div>

                      {report.description && (
                        <div className="mb-4">
                          <h4 className={`${isDark ? "text-gray-400" : "text-gray-700"} font-semibold mb-2 text-sm`}>
                            Description:
                          </h4>
                          <p className={`${isDark ? "text-gray-300" : "text-slate-700"} whitespace-pre-wrap break-words leading-relaxed`}>
                            {report.description}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          {report.category && (
                            <p className={`${isDark ? "text-gray-300" : "text-slate-700"} mb-1 text-sm`}>
                              <span className="font-medium">Category:</span> {report.category}
                            </p>
                          )}
                          <p className={`${isDark ? "text-gray-300" : "text-slate-700"} mb-1 text-sm`}>
                            <span className="font-medium">Submitted by:</span> {report.authorUsername || report.userName || "Unknown User"}
                          </p>
                        </div>
                        <div>
                          <p className={`${isDark ? "text-gray-300" : "text-slate-700"} mb-1 text-sm`}>
                            <span className="font-medium">Likes:</span> {report.likes?.length || 0}
                          </p>
                          <p className={`${isDark ? "text-gray-300" : "text-slate-700"} mb-1 text-sm`}>
                            <span className="font-medium">Comments:</span> {report.comments?.length || 0}
                          </p>
                          <p className={`${isDark ? "text-gray-300" : "text-slate-700"} mb-1 text-sm`}>
                            <span className="font-medium">Submitted:</span> {formatTimeAgo(report.submittedAt)}
                          </p>
                        </div>
                      </div>

                      {/* Show recent comments if any */}
                      {report.comments && report.comments.length > 0 && (
                        <div className={`mb-4 p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                          <h5 className={`${isDark ? "text-gray-300" : "text-gray-700"} font-medium mb-2 text-sm`}>
                            Recent Comments ({report.comments.length}):
                          </h5>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {report.comments.slice(-3).map((comment, idx) => (
                              <div key={idx} className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                <span className="font-medium">{comment.user}:</span> {comment.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Media Display */}
                      {report.mediaUrl && (
                        <div className="mb-4 rounded-xl overflow-hidden">
                          {/\.(mp4|webm|ogg)$/i.test(report.mediaUrl) ? (
                            <video
                              controls
                              className="w-full max-h-64 object-cover rounded-lg"
                              preload="metadata"
                            >
                              <source src={report.mediaUrl} type="video/mp4" />
                              Your browser does not support video playback.
                            </video>
                          ) : (
                            <img
                              src={report.mediaUrl}
                              alt="Report evidence"
                              className="w-full max-h-64 object-cover rounded-lg"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI0VFRSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+SW1hZ2UgRXJyb3I8L3RleHQ+PC9zdmc+';
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteReport(report.id)}
                      className={`${isDark ? "text-red-400 hover:text-red-600 hover:bg-red-900" : "text-red-500 hover:text-red-700 hover:bg-red-50"} p-2 rounded-lg transition-all duration-200`}
                      aria-label="Delete report"
                    >
                      <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" className="w-5 h-5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>

                  <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => updateReportStatus(report.id, "in review")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        report.status === "in review" || report.status === "resolved"
                          ? (isDark ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-gray-300 text-gray-500 cursor-not-allowed")
                          : (isDark ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-500 text-white hover:bg-blue-600")
                      }`}
                      disabled={report.status === "in review" || report.status === "resolved"}
                    >
                      {report.status === "in review" ? "In Review" : report.status === "resolved" ? "Already Resolved" : "Mark In Review"}
                    </button>
                    <button
                      onClick={() => updateReportStatus(report.id, "resolved")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        report.status === "resolved"
                          ? (isDark ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-gray-300 text-gray-500 cursor-not-allowed")
                          : (isDark ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-emerald-500 text-white hover:bg-emerald-600")
                      }`}
                      disabled={report.status === "resolved"}
                    >
                      {report.status === "resolved" ? "Resolved" : "Mark Resolved"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* Configuration Tab Content */}
      {activeTab === 'configuration' && (
        <div className="space-y-6">
          {configLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mb-4" />
              <p>Loading configuration...</p>
            </div>
          ) : (
            <>
              {/* Save Configuration Button */}
              <div className="text-right">
                <button
                  onClick={saveConfiguration}
                  disabled={configSaving}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    isDark 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {configSaving ? 'Saving...' : 'Save All Changes'}
                </button>
              </div>

              {/* Categories Configuration */}
              <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"} rounded-xl shadow-sm border p-6`}>
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                  Report Categories
                </h3>
                <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  Configure the categories available in the report form. The "All Reports" category is used for filtering and cannot be deleted.
                </p>

                {/* Add New Category */}
                <div className={`mb-6 p-4 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                  <h4 className={`font-medium mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Add New Category</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Category ID (e.g., noise_complaint)"
                      value={newCategory.id}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, id: e.target.value }))}
                      className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                        isDark ? "border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-400" : "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="Category Name"
                      value={newCategory.label}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, label: e.target.value }))}
                      className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                        isDark ? "border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-400" : "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                      }`}
                    />
                   
                    <button
                      onClick={addCategory}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      Add Category
                    </button>
                  </div>
                </div>

                {/* Existing Categories */}
                <div className="space-y-3">
                  {categories.map((category, index) => (
                    <div key={category.id} className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                      {editingCategory === index ? (
                        <>
                          <input
                            type="text"
                            value={category.id}
                            onChange={(e) => updateCategory(index, { ...category, id: e.target.value })}
                            disabled={category.id === 'all'}
                            className={`flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${
                              isDark ? "border-gray-600 bg-gray-800 text-gray-200" : "border-gray-300 bg-white text-gray-900"
                            } ${category.id === 'all' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <input
                            type="text"
                            value={category.label}
                            onChange={(e) => updateCategory(index, { ...category, label: e.target.value })}
                            className={`flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${
                              isDark ? "border-gray-600 bg-gray-800 text-gray-200" : "border-gray-300 bg-white text-gray-900"
                            }`}
                          />
                          
                          <button
                            onClick={() => setEditingCategory(null)}
                            className={`px-3 py-2 rounded font-medium ${isDark ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-lg w-8 text-center">{category.icon || '📝'}</span>
                          <span className={`flex-1 font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                            {category.label}
                          </span>
                          <span className={`flex-1 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            ID: {category.id}
                          </span>
                          <button
                            onClick={() => setEditingCategory(index)}
                            className={`px-3 py-1 rounded text-sm font-medium ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteCategory(index)}
                            disabled={category.id === 'all'}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              category.id === 'all' 
                                ? 'opacity-50 cursor-not-allowed bg-gray-400 text-gray-600'
                                : isDark 
                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                : 'bg-red-500 hover:bg-red-600 text-white'
                            }`}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Severity Levels Configuration */}
              <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"} rounded-xl shadow-sm border p-6`}>
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                  Severity Levels
                </h3>
                <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  Configure the severity levels available in the report form.
                </p>

                {/* Add New Severity Level */}
                <div className={`mb-6 p-4 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                  <h4 className={`font-medium mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Add New Severity Level</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Value (e.g., critical)"
                      value={newSeverity.value}
                      onChange={(e) => setNewSeverity(prev => ({ ...prev, value: e.target.value }))}
                      className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                        isDark ? "border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-400" : "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="Display Label"
                      value={newSeverity.label}
                      onChange={(e) => setNewSeverity(prev => ({ ...prev, label: e.target.value }))}
                      className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                        isDark ? "border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-400" : "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                      }`}
                    />
                    <button
                      onClick={addSeverityLevel}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      Add Level
                    </button>
                  </div>
                </div>

                {/* Existing Severity Levels */}
                <div className="space-y-3">
                  {severityLevels.map((severity, index) => (
                    <div key={severity.value} className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                      {editingSeverity === index ? (
                        <>
                          <input
                            type="text"
                            value={severity.value}
                            onChange={(e) => updateSeverityLevel(index, { ...severity, value: e.target.value })}
                            className={`flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${
                              isDark ? "border-gray-600 bg-gray-800 text-gray-200" : "border-gray-300 bg-white text-gray-900"
                            }`}
                          />
                          <input
                            type="text"
                            value={severity.label}
                            onChange={(e) => updateSeverityLevel(index, { ...severity, label: e.target.value })}
                            className={`flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${
                              isDark ? "border-gray-600 bg-gray-800 text-gray-200" : "border-gray-300 bg-white text-gray-900"
                            }`}
                          />
                          <button
                            onClick={() => setEditingSeverity(null)}
                            className={`px-3 py-2 rounded font-medium ${isDark ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <>
                          <span className={`flex-1 font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                            {severity.label}
                          </span>
                          <span className={`flex-1 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            Value: {severity.value}
                          </span>
                          <button
                            onClick={() => setEditingSeverity(index)}
                            className={`px-3 py-1 rounded text-sm font-medium ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteSeverityLevel(index)}
                            className={`px-3 py-1 rounded text-sm font-medium ${isDark ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuration Preview */}
              <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"} rounded-xl shadow-sm border p-6`}>
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                  Configuration Preview
                </h3>
                <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  This is how the form options will appear to users:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Categories Preview */}
                  <div>
                    <h4 className={`font-medium mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Categories</h4>
                    <div className="space-y-2">
                      {categories.filter(cat => cat.id !== 'all').length === 0 ? (
                        <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} italic`}>
                          No categories created yet. Add categories above.
                        </div>
                      ) : (
                        categories.filter(cat => cat.id !== 'all').map((category) => (
                          <div key={category.id} className={`px-3 py-2 rounded-lg flex items-center space-x-2 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                            <span>{category.icon || '📝'}</span>
                            <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                              {category.label}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Severity Levels Preview */}
                  <div>
                    <h4 className={`font-medium mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Severity Levels</h4>
                    <div className="space-y-2">
                      {severityLevels.length === 0 ? (
                        <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} italic`}>
                          No severity levels created yet. Add severity levels above.
                        </div>
                      ) : (
                        severityLevels.map((severity) => (
                          <div key={severity.value} className={`px-3 py-2 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                            <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                              {severity.label}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}