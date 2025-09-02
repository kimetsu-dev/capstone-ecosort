import { useState, useMemo } from 'react';

export default function ReportsTab({ reports, setReports, formatTimestamp, getStatusBadge, showToast, isDark }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');

  const updateReportStatus = (id, newStatus) => {
    setReports((prev) =>
      prev.map((report) =>
        report.id === id ? { ...report, status: newStatus } : report
      )
    );
    showToast(`Report status updated to ${newStatus}`, "success");
  };

  const deleteReport = (id) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      setReports((prev) => prev.filter((report) => report.id !== id));
      showToast("Report deleted", "success");
    }
  };

  const statusCounts = useMemo(() => {
    const counts = reports.reduce((acc, report) => {
      const status = typeof report.status === 'string' ? report.status.toLowerCase() : 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      all: reports.length,
      pending: counts.pending || 0,
      'in review': counts['in review'] || 0,
      resolved: counts.resolved || 0,
      unknown: counts.unknown || 0,
    };
  }, [reports]);

  const filteredAndSortedReports = useMemo(() => {
    let filtered = reports;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(report =>
        (typeof report.status === 'string' ? report.status.toLowerCase() : '') === statusFilter.toLowerCase()
      );
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(report => {
        const description = report.description || "";
        const location = report.location || "";
        const id = report.id || "";
        return (
          description.toLowerCase().includes(lowerSearch) ||
          location.toLowerCase().includes(lowerSearch) ||
          id.toLowerCase().includes(lowerSearch)
        );
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.submittedAt) - new Date(a.submittedAt);
        case 'oldest':
          return new Date(a.submittedAt) - new Date(b.submittedAt);
        case 'location':
          return (a.location || '').localeCompare(b.location || '');
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [reports, statusFilter, sortBy, searchTerm]);

  return (
    <div className={`space-y-6 ${isDark ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"}`}>
      <div>
        <h2 className={`text-xl font-bold ${isDark ? "text-gray-100" : "text-slate-800"}`}>Violation Reports</h2>
        <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
          Manage and track community violation reports
        </p>
      </div>

      {/* Filters and Search */}
      <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"} rounded-xl shadow-sm border p-6`}>
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Search */}
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

          {/* Status Filter */}
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

          {/* Sort Dropdown */}
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
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
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
            <div
              key={report.id}
              className={`${isDark ? "bg-gray-800 border-gray-700 text-gray-200 hover:shadow-lg" : "bg-white border-slate-200 text-slate-900 hover:shadow-md"} rounded-xl shadow-sm border p-6 transition-all duration-200`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className={`${isDark ? "text-gray-100" : "text-slate-800"} font-semibold`}>
                      Report #{report.id.slice(-8)}
                    </h3>
                    {getStatusBadge(report.status, isDark)}
                  </div>
                  <p className={`${isDark ? "text-gray-300" : "text-slate-700"} mb-3 leading-relaxed`}>
                    {report.description}
                  </p>
                  <div className={`flex items-center space-x-6 text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                    <div className="flex items-center space-x-2">
                      <span>📍</span>
                      <span>{report.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>📅</span>
                      <span>{formatTimestamp(report.submittedAt)}</span>
                    </div>
                  </div>
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
                    report.status === "in review"
                      ? (isDark ? "bg-blue-700 text-blue-300 cursor-default" : "bg-blue-300 text-blue-700 cursor-default")
                      : (isDark ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-500 text-white hover:bg-blue-600")
                  }`}
                  disabled={report.status === "in review"}
                >
                  Mark In Review
                </button>
                <button
                  onClick={() => updateReportStatus(report.id, "resolved")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    report.status === "resolved"
                      ? (isDark ? "bg-emerald-700 text-emerald-300 cursor-default" : "bg-emerald-300 text-emerald-700 cursor-default")
                      : (isDark ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-emerald-500 text-white hover:bg-emerald-600")
                  }`}
                  disabled={report.status === "resolved"}
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
