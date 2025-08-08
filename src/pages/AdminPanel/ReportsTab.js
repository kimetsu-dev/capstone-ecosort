import { useState, useMemo } from 'react';

export default function ReportsTab({ reports, setReports, formatTimestamp, getStatusBadge, showToast }) {
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

  // Filter and sort reports
  const filteredAndSortedReports = useMemo(() => {
    let filtered = reports;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.submittedAt) - new Date(a.submittedAt);
        case 'oldest':
          return new Date(a.submittedAt) - new Date(b.submittedAt);
        case 'location':
          return a.location.localeCompare(b.location);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [reports, statusFilter, sortBy, searchTerm]);

  const getStatusCounts = () => {
    const counts = reports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    }, {});
    return {
      all: reports.length,
      pending: counts.pending || 0,
      'in review': counts['in review'] || 0,
      resolved: counts.resolved || 0
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Violation Reports</h2>
        <p className="text-slate-500 text-sm mb-4">
          Manage and track community violation reports
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  statusFilter === status
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
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
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-blue-800">
              Showing {filteredAndSortedReports.length} of {reports.length} reports
              {statusFilter !== 'all' && (
                <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">
                  Status: {statusFilter}
                </span>
              )}
              {searchTerm && (
                <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">
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
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Reports List */}
      {filteredAndSortedReports.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="text-slate-400 w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {searchTerm || statusFilter !== 'all' ? (
                <circle cx="11" cy="11" r="8"/>
              ) : (
                <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              )}
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">
            {searchTerm || statusFilter !== 'all' ? 'No matching reports' : 'No reports found'}
          </h3>
          <p className="text-slate-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your filters or search terms.'
              : 'All clear! No violation reports to review.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="font-semibold text-slate-800">
                      Report #{report.id.slice(-8)}
                    </h3>
                    {getStatusBadge(report.status)}
                  </div>
                  <p className="text-slate-700 mb-3 leading-relaxed">{report.description}</p>
                  <div className="flex items-center space-x-6 text-sm text-slate-500">
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
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all duration-200"
                  aria-label="Delete report"
                >
                  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" className="w-5 h-5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => updateReportStatus(report.id, "in review")}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors font-medium"
                  disabled={report.status === "in review"}
                >
                  Mark In Review
                </button>
                <button
                  onClick={() => updateReportStatus(report.id, "resolved")}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors font-medium"
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