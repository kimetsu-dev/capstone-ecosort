import { useState, useMemo } from 'react';
import { Crown, Trophy, Medal, Award, ChevronDown, ChevronUp, Search, Filter, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function UsersTab({ users, setUsers }) {
  const { isDark } = useTheme();
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState('rank'); // rank, points, email
  const [sortOrder, setSortOrder] = useState('asc');

  // Generate achievements based on points
  const generateAchievements = (points) => {
    const allAchievements = [
      { name: "First Steps", icon: "🌱", description: "Earned first 100 points", requiredPoints: 100, unlocked: points >= 100 },
      { name: "Eco Advocate", icon: "🌿", description: "Reached 500 points", requiredPoints: 500, unlocked: points >= 500 },
      { name: "Eco Hero", icon: "🏆", description: "Achieved 1000 points", requiredPoints: 1000, unlocked: points >= 1000 },
      { name: "Green Champion", icon: "👑", description: "Outstanding 2000+ points", requiredPoints: 2000, unlocked: points >= 2000 },
    ];
    return allAchievements;
  };

  // Calculate ranks
  const rankedUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    return sorted.map((user, index) => ({
      ...user,
      rank: index + 1,
      achievements: generateAchievements(user.totalPoints || 0)
    }));
  }, [users]);

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = rankedUsers.filter(user => {
      const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.username?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      return matchesSearch && matchesRole;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'rank') {
        comparison = a.rank - b.rank;
      } else if (sortBy === 'points') {
        comparison = (b.totalPoints || 0) - (a.totalPoints || 0);
      } else if (sortBy === 'email') {
        comparison = (a.email || '').localeCompare(b.email || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [rankedUsers, searchTerm, filterRole, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return Crown;
      case 2: return Trophy;
      case 3: return Medal;
      default: return Award;
    }
  };

  const getRankStyle = (rank) => {
    switch (rank) {
      case 1:
        return {
          bg: "bg-gradient-to-r from-yellow-400 to-yellow-500",
          text: "text-yellow-900",
          border: "border-yellow-300"
        };
      case 2:
        return {
          bg: "bg-gradient-to-r from-gray-300 to-gray-400",
          text: "text-gray-900",
          border: "border-gray-300"
        };
      case 3:
        return {
          bg: "bg-gradient-to-r from-amber-600 to-amber-700",
          text: "text-white",
          border: "border-amber-500"
        };
      default:
        return {
          bg: isDark ? "bg-gray-700" : "bg-gray-200",
          text: isDark ? "text-gray-300" : "text-gray-700",
          border: isDark ? "border-gray-600" : "border-gray-300"
        };
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedUser(null), 300);
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

 return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className={`sticky top-0 z-10 ${isDark ? 'bg-gray-900/95 border-gray-700' : 'bg-white/95 border-slate-200'} backdrop-blur-md border-b`}>
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 mb-1">
            <h2 className={`text-2xl font-bold ${isDark ? "text-gray-100" : "text-slate-800"}`}>
              User Management
            </h2>
          </div>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Total Users: {users.length} • Filtered: {filteredAndSortedUsers.length}
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-xl shadow-sm border ${isDark ? "border-gray-700" : "border-slate-200"} p-4`}>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
            <input
              type="text"
              placeholder="Search by email or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-10 py-2.5 rounded-lg border ${
                isDark 
                  ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400" 
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Filter className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className={`pl-10 pr-8 py-2.5 rounded-lg border ${
                isDark 
                  ? "bg-gray-700 border-gray-600 text-gray-200" 
                  : "bg-white border-gray-300 text-gray-900"
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer`}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="resident">Resident</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-xl shadow-sm border ${isDark ? "border-gray-700" : "border-slate-200"} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className={isDark ? "bg-gray-900" : "bg-slate-50"}>
              <tr>
                <th 
                  onClick={() => handleSort('rank')}
                  className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-300" : "text-slate-600"} cursor-pointer hover:bg-opacity-80 transition-colors`}
                >
                  <div className="flex items-center space-x-2">
                    <span>Rank</span>
                    <SortIcon field="rank" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('email')}
                  className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-300" : "text-slate-600"} cursor-pointer hover:bg-opacity-80 transition-colors`}
                >
                  <div className="flex items-center space-x-2">
                    <span>User</span>
                    <SortIcon field="email" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('points')}
                  className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-300" : "text-slate-600"} cursor-pointer hover:bg-opacity-80 transition-colors`}
                >
                  <div className="flex items-center space-x-2">
                    <span>Points</span>
                    <SortIcon field="points" />
                  </div>
                </th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-300" : "text-slate-600"}`}>
                  Achievements
                </th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-300" : "text-slate-600"}`}>
                  Role
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-slate-200"}`}>
              {filteredAndSortedUsers.map((user) => {
                const RankIcon = getRankIcon(user.rank);
                const rankStyle = getRankStyle(user.rank);
                const unlockedCount = user.achievements.filter(a => a.unlocked).length;

                return (
                  <tr 
                    key={user.id} 
                    onClick={() => handleUserClick(user)}
                    className={`${isDark ? "hover:bg-gray-700" : "hover:bg-slate-50"} transition-colors cursor-pointer`}
                  >
                    {/* Rank */}
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${rankStyle.bg} border-2 ${rankStyle.border} shadow-md`}>
                        {user.rank <= 3 ? (
                          <RankIcon className={`w-6 h-6 ${rankStyle.text}`} />
                        ) : (
                          <span className={`font-bold text-lg ${rankStyle.text}`}>{user.rank}</span>
                        )}
                      </div>
                    </td>

                    {/* User Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {user.profileUrl ? (
                          <img
                            src={user.profileUrl}
                            alt="Profile"
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            {user.email ? user.email.charAt(0).toUpperCase() : "?"}
                          </div>
                        )}
                        <div>
                          <div className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-slate-800"}`}>
                            {user.username || user.email}
                          </div>
                          {user.username && (
                            <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                              {user.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Points */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                        isDark ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {(user.totalPoints || 0).toLocaleString()} pts
                      </span>
                    </td>

                    {/* Achievements */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`text-2xl ${unlockedCount === 0 ? 'grayscale opacity-40' : ''}`}>
                          {user.achievements[unlockedCount - 1]?.icon || '🏅'}
                        </span>
                        <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          {unlockedCount}/{user.achievements.length}
                        </span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                          user.role === "admin" 
                            ? isDark ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-800"
                            : isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {user.role || "resident"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredAndSortedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className={`text-center py-12 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    <div className="flex flex-col items-center space-y-2">
                      <Search className="w-12 h-12 opacity-50" />
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Modal */}
      {showModal && selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={closeModal}
        >
          <div
            className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-slideUp ${
              isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeModal}
              className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                isDark
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Section */}
            <div className={`p-8 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Profile Picture */}
                <div className="relative">
                  {selectedUser.profileUrl ? (
                    <img
                      src={selectedUser.profileUrl}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-xl">
                      {selectedUser.email?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  {/* Rank Badge */}
                  <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                    getRankStyle(selectedUser.rank).bg
                  } ${getRankStyle(selectedUser.rank).text}`}>
                    #{selectedUser.rank}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 text-center sm:text-left">
                  <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                    {selectedUser.username || selectedUser.email || 'Anonymous'}
                  </h2>
                  <p className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {selectedUser.email}
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-4">
                    <div className={`px-4 py-2 rounded-xl ${isDark ? "bg-gray-700" : "bg-emerald-50"}`}>
                      <div className={`text-2xl font-bold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                        {(selectedUser.totalPoints || 0).toLocaleString()}
                      </div>
                      <div className={`text-xs ${isDark ? "text-emerald-500" : "text-emerald-600"}`}>Points</div>
                    </div>
                    <div className={`px-4 py-2 rounded-xl ${isDark ? "bg-gray-700" : "bg-blue-50"}`}>
                      <div className={`text-2xl font-bold ${isDark ? "text-blue-400" : "text-blue-700"}`}>
                        #{selectedUser.rank}
                      </div>
                      <div className={`text-xs ${isDark ? "text-blue-500" : "text-blue-600"}`}>Rank</div>
                    </div>
                    <div className={`px-4 py-2 rounded-xl ${
                      selectedUser.role === 'admin'
                        ? isDark ? "bg-purple-900/30" : "bg-purple-50"
                        : isDark ? "bg-blue-900/30" : "bg-blue-50"
                    }`}>
                      <div className={`text-lg font-bold ${
                        selectedUser.role === 'admin'
                          ? isDark ? "text-purple-400" : "text-purple-700"
                          : isDark ? "text-blue-400" : "text-blue-700"
                      }`}>
                        {selectedUser.role || 'resident'}
                      </div>
                      <div className={`text-xs ${
                        selectedUser.role === 'admin'
                          ? isDark ? "text-purple-500" : "text-purple-600"
                          : isDark ? "text-blue-500" : "text-blue-600"
                      }`}>Role</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievements Section */}
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-bold flex items-center ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                  <Award className="mr-2 w-6 h-6" /> Achievements
                </h3>
                <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {selectedUser.achievements.filter(a => a.unlocked).length} of {selectedUser.achievements.length} unlocked
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedUser.achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className={`rounded-xl p-4 border transition-all duration-300 relative ${
                      achievement.unlocked
                        ? `${
                            isDark ? "bg-yellow-800/20 border-yellow-600/30" : "bg-yellow-50 border-amber-200"
                          }`
                        : `${
                            isDark 
                              ? "bg-gray-700/30 border-gray-600/30 opacity-60" 
                              : "bg-gray-50 border-gray-200 opacity-70"
                          }`
                    }`}
                  >
                    {/* Unlocked indicator */}
                    {achievement.unlocked && (
                      <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                        <Award className="w-3 h-3 text-white" />
                      </div>
                    )}

                    <div className="flex items-start space-x-3">
                      <div 
                        className={`text-3xl flex-shrink-0 ${
                          achievement.unlocked ? "" : "grayscale opacity-40"
                        }`}
                      >
                        {achievement.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 
                          className={`font-bold text-base mb-1 ${
                            achievement.unlocked 
                              ? (isDark ? "text-yellow-300" : "text-amber-800")
                              : (isDark ? "text-gray-400" : "text-gray-600")
                          }`}
                        >
                          {achievement.name}
                        </h4>
                        <p 
                          className={`text-xs ${
                            achievement.unlocked 
                              ? (isDark ? "text-yellow-400" : "text-amber-600")
                              : (isDark ? "text-gray-500" : "text-gray-500")
                          }`}
                        >
                          {achievement.description}
                        </p>

                        {/* Progress for locked achievements */}
                        {!achievement.unlocked && (
                          <div className="mt-2">
                            <div className={`w-full rounded-full h-1 ${isDark ? "bg-gray-600" : "bg-gray-200"}`}>
                              <div
                                className="bg-gradient-to-r from-blue-400 to-blue-500 h-1 rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${Math.min(((selectedUser.totalPoints || 0) / achievement.requiredPoints) * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                              {achievement.requiredPoints - (selectedUser.totalPoints || 0)} points to unlock
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Motivational Message */}
              <div className={`mt-6 p-4 rounded-xl ${isDark ? "bg-blue-900/20 border border-blue-700/30" : "bg-blue-50 border border-blue-200"}`}>
                <p className={`text-center text-sm ${isDark ? "text-blue-300" : "text-blue-800"}`}>
                  {selectedUser.achievements.filter(a => a.unlocked).length === selectedUser.achievements.length
                    ? "🎉 All achievements unlocked! True eco champion!"
                    : selectedUser.achievements.filter(a => a.unlocked).length > 0
                    ? "Great progress! Keep earning points!"
                    : "Start the eco journey to unlock achievements!"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}