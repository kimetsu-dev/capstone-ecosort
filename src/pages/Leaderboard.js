import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Trophy, Medal, Award, Crown, Loader2, AlertTriangle, X, User as UserIcon } from 'lucide-react';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { isDark } = useTheme() || {};
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Check if running as PWA
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      setIsPWA(isStandalone || isIOSStandalone);
    };
    checkPWA();
  }, []);

  const ArrowLeft = () => (
    <svg className={`${isDark ? 'text-gray-300' : 'text-gray-700'} w-5 h-5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );

  useEffect(() => {
    const fetchTopUsers = async () => {
      try {
        const usersCollection = collection(db, 'users');
        const q = query(usersCollection, orderBy('totalPoints', 'desc'), limit(10));
        const userSnapshot = await getDocs(q);
        const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTopUsers(userList);
      } catch (err) {
        setError("Failed to fetch leaderboard. Please try again later.");
        console.error("Error fetching leaderboard: ", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopUsers();
  }, []);

  // Generate achievements based on points
  const generateAchievements = (points) => {
    const allAchievements = [
      { name: "First Steps", icon: "🌱", description: "Earned your first 100 points", requiredPoints: 100, unlocked: points >= 100 },
      { name: "Eco Advocate", icon: "🌿", description: "Reached 500 points milestone", requiredPoints: 500, unlocked: points >= 500 },
      { name: "Eco Hero", icon: "🏆", description: "Achieved 1000 points!", requiredPoints: 1000, unlocked: points >= 1000 },
      { name: "Green Champion", icon: "👑", description: "Outstanding 2000+ points", requiredPoints: 2000, unlocked: points >= 2000 },
    ];
    return allAchievements;
  };

  // Fetch user details when clicked
  const handleUserClick = async (user, rank) => {
    setModalLoading(true);
    setShowModal(true);
    
    try {
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const achievements = generateAchievements(userData.totalPoints || 0);
        
        setSelectedUser({
          ...user,
          ...userData,
          rank,
          achievements,
        });
      } else {
        setSelectedUser({
          ...user,
          rank,
          achievements: generateAchievements(user.totalPoints || 0),
        });
      }
    } catch (err) {
      console.error("Error fetching user details:", err);
      setSelectedUser({
        ...user,
        rank,
        achievements: generateAchievements(user.totalPoints || 0),
      });
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedUser(null), 300);
  };

  // Mobile rank badge colors
  const getMobileRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return isDark ? "bg-yellow-500 text-yellow-900" : "bg-yellow-400 text-yellow-900";
      case 2:
        return isDark ? "bg-gray-400 text-gray-900" : "bg-gray-300 text-gray-900";
      case 3:
        return isDark ? "bg-amber-600 text-white" : "bg-amber-700 text-white";
      default:
        return isDark ? "bg-gray-600 text-gray-200" : "bg-gray-200 text-gray-700";
    }
  };

  // Desktop rank styling
  const getDesktopRankStyle = (rank) => {
    switch (rank) {
      case 1:
        return {
          bg: "bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600",
          text: "text-yellow-900",
          icon: Crown,
          shadow: "shadow-yellow-500/30"
        };
      case 2:
        return {
          bg: "bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500",
          text: "text-gray-900",
          icon: Trophy,
          shadow: "shadow-gray-400/30"
        };
      case 3:
        return {
          bg: "bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800",
          text: "text-white",
          icon: Medal,
          shadow: "shadow-amber-600/30"
        };
      default:
        return {
          bg: isDark ? "bg-gray-800" : "bg-white",
          text: isDark ? "text-gray-200" : "text-gray-900",
          icon: Award,
          shadow: isDark ? "shadow-gray-800/30" : "shadow-gray-200/30"
        };
    }
  };

  // Mobile user card
  const renderMobileUserCard = (user, index) => {
    const rank = index + 1;
    return (
      <li
        key={user.id}
        onClick={() => handleUserClick(user, rank)}
        className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:scale-102 active:scale-98 ${
          isDark
            ? "bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70"
            : "bg-white/70 border-gray-200 hover:bg-white/90 hover:shadow-md"
        }`}
        aria-label={`Rank ${rank}, ${user.username || user.email || 'Anonymous user'} with ${user.totalPoints || 0} points`}
      >
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${getMobileRankBadge(rank)}`}>
            {rank}
          </span>
          <div>
            <p className={`font-semibold text-sm ${isDark ? "text-gray-200" : "text-gray-900"}`}>
              {user.username || user.email || 'Anonymous'}
            </p>
            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Rank #{rank}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`font-semibold text-sm ${isDark ? "text-green-400" : "text-green-600"}`}>
            {(user.totalPoints ?? 0).toLocaleString()}
          </p>
          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            points
          </p>
        </div>
      </li>
    );
  };

  // Desktop user row
  const renderDesktopUserRow = (user, index) => {
    const rank = index + 1;
    const style = getDesktopRankStyle(rank);
    const IconComponent = style.icon;
    
    return (
      <tr
        key={user.id}
        onClick={() => handleUserClick(user, rank)}
        className={`border-b transition-colors cursor-pointer ${
          isDark ? "border-gray-700 hover:bg-gray-800/50" : "border-gray-200 hover:bg-gray-50/80"
        } ${rank <= 3 ? 'bg-gradient-to-r from-transparent to-transparent' : ''}`}
      >
        <td className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${style.bg} ${style.shadow} shadow-lg`}>
              {rank <= 3 ? (
                <IconComponent className={`w-6 h-6 ${style.text}`} />
              ) : (
                <span className={`font-bold text-lg ${style.text}`}>{rank}</span>
              )}
            </div>
            <div>
              <p className={`font-semibold text-lg ${isDark ? "text-gray-200" : "text-gray-900"}`}>
                {user.username || user.email || 'Anonymous'}
              </p>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Rank #{rank}
              </p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 text-right">
          <div className={`text-2xl font-bold ${isDark ? "text-green-400" : "text-green-600"}`}>
            {(user.totalPoints ?? 0).toLocaleString()}
          </div>
          <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            points
          </div>
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center px-4 ${
          isDark ? "bg-gray-900" : "bg-gradient-to-br from-green-50 via-teal-50 to-blue-50"
        }`}
      >
        <Loader2
          className={`animate-spin w-8 h-8 mb-4 ${
            isDark ? "text-green-400" : "text-green-600"
          }`}
        />
        <p className={`text-base font-medium ${isDark ? "text-green-400" : "text-green-700"}`}>
          Loading leaderboard...
        </p>
      </div>
    );
  }

  // PWA/Mobile App Version
  if (isPWA) {
    return (
      <div
        className={`min-h-screen ${
          isDark
            ? "bg-gray-900 text-gray-200"
            : "bg-gradient-to-br from-green-50 via-teal-50 to-blue-50 text-gray-900"
        }`}
      >
        {/* Sticky Header - PWA Only */}
        <div className={`sticky top-0 z-50 px-4 py-4 border-b backdrop-blur-sm ${
          isDark 
            ? "bg-gray-900/90 border-gray-700" 
            : "bg-white/90 border-gray-200"
        }`}>
          <h1 className={`text-xl font-bold text-center ${isDark ? "text-gray-100" : "text-gray-900"}`}>
            Leaderboard
          </h1>
        </div>
        
        <div className="px-4 py-4">
          {/* Header Section */}
          <div
            className={`rounded-xl p-6 mb-6 text-center ${
              isDark ? "bg-gray-800/50" : "bg-white/70"
            }`}
          >
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
              Top Eco Champions
            </h2>
            <p className={`${isDark ? "text-gray-400" : "text-gray-600"} text-sm`}>
              See who's leading the green revolution
            </p>
          </div>

          {/* Mobile User List */}
          {error ? (
            <div className={`rounded-lg p-4 flex items-center space-x-3 ${
              isDark ? "bg-red-900/50 border border-red-700/50" : "bg-red-50 border border-red-200"
            }`}>
              <AlertTriangle className={`w-5 h-5 ${isDark ? "text-red-400" : "text-red-600"}`} />
              <span className={`text-sm ${isDark ? "text-red-300" : "text-red-700"}`}>
                {error}
              </span>
            </div>
          ) : topUsers.length > 0 ? (
            <ol className="space-y-3">
              {topUsers.map((user, index) => renderMobileUserCard(user, index))}
            </ol>
          ) : (
            <div className="text-center py-8">
              <div
                className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                  isDark ? "bg-gray-800" : "bg-gray-100"
                }`}
              >
                <Trophy className={`w-6 h-6 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
              </div>
              <h3 className={`text-base font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-900"}`}>
                No data available
              </h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Start earning points to appear on the leaderboard!
              </p>
            </div>
          )}
        </div>

        {/* User Profile Modal */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={closeModal}
          >
            <div
              className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-slideUp ${
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

              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className={`animate-spin w-12 h-12 mb-4 ${isDark ? "text-green-400" : "text-green-600"}`} />
                  <p className={`text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>Loading profile...</p>
                </div>
              ) : selectedUser ? (
                <>
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
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-white shadow-xl">
                            <UserIcon size={36} className="text-gray-600" />
                          </div>
                        )}
                        {/* Rank Badge */}
                        <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                          selectedUser.rank === 1
                            ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900"
                            : selectedUser.rank === 2
                            ? "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900"
                            : selectedUser.rank === 3
                            ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white"
                            : isDark
                            ? "bg-gray-700 text-gray-300"
                            : "bg-gray-200 text-gray-700"
                        }`}>
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
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Achievements Section */}
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className={`text-xl font-bold flex items-center ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                        <Award className="mr-2 text-2xl" /> Achievements
                      </h3>
                      <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {selectedUser.achievements?.filter(a => a.unlocked).length || 0} of {selectedUser.achievements?.length || 0} unlocked
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedUser.achievements?.map((achievement, index) => (
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
                        {selectedUser.achievements?.filter(a => a.unlocked).length === selectedUser.achievements?.length
                          ? "🎉 All achievements unlocked! You're an eco champion!"
                          : selectedUser.achievements?.filter(a => a.unlocked).length > 0
                          ? "Keep going! More achievements await!"
                          : "Start your eco journey to unlock achievements!"}
                      </p>
                    </div>
                  </div>
                </>
              ) : null}
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

          .hover\\:scale-102:hover {
            transform: scale(1.02);
          }

          .active\\:scale-98:active {
            transform: scale(0.98);
          }
        `}</style>
      </div>
    );
  }

  // Web Desktop Version (no back button, designed to work within Dashboard sidebar)
  return (
    <div
      className={`min-h-full ${
        isDark
          ? "bg-transparent text-gray-200"
          : "bg-transparent text-gray-900"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Desktop Header - No Back Button */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
            Leaderboard
          </h1>
          <p className={`text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Top eco champions making a difference
          </p>
        </div>

        {/* Hero Section */}
        <div
          className={`rounded-2xl p-8 mb-8 text-center ${
            isDark ? "bg-gray-800/50" : "bg-white/70"
          }`}
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className={`text-3xl font-bold mb-3 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
            Top Eco Champions
          </h2>
          <p className={`${isDark ? "text-gray-400" : "text-gray-600"} text-lg max-w-2xl mx-auto`}>
            Celebrate the environmental leaders making a real difference. Join the leaderboard by earning points through eco-friendly activities and sustainable choices.
          </p>
        </div>

        {/* Desktop Leaderboard Table */}
        <div className={`rounded-2xl overflow-hidden shadow-sm border ${
          isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"
        }`}>
          {error ? (
            <div className="text-center py-16">
              <AlertTriangle className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-red-400" : "text-red-600"}`} />
              <h3 className={`text-xl font-medium mb-2 ${isDark ? "text-red-300" : "text-red-700"}`}>
                Failed to Load Leaderboard
              </h3>
              <p className={`${isDark ? "text-red-400" : "text-red-600"}`}>
                {error}
              </p>
            </div>
          ) : topUsers.length > 0 ? (
            <table className="w-full">
              <thead className={`${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                <tr>
                  <th className={`px-6 py-4 text-left text-lg font-semibold ${
                    isDark ? "text-gray-200" : "text-gray-900"
                  }`}>
                    Champion
                  </th>
                  <th className={`px-6 py-4 text-right text-lg font-semibold ${
                    isDark ? "text-gray-200" : "text-gray-900"
                  }`}>
                    Points Earned
                  </th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((user, index) => renderDesktopUserRow(user, index))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16">
              <div
                className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
                  isDark ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <Trophy className={`w-10 h-10 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
              </div>
              <h3 className={`text-xl font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-900"}`}>
                No Champions Yet
              </h3>
              <p className={`text-base ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Be the first to earn points and claim your spot on the leaderboard!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={closeModal}
        >
          <div
            className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-slideUp ${
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

            {modalLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className={`animate-spin w-12 h-12 mb-4 ${isDark ? "text-green-400" : "text-green-600"}`} />
                <p className={`text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>Loading profile...</p>
              </div>
            ) : selectedUser ? (
              <>
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
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-white shadow-xl">
                          <UserIcon size={36} className="text-gray-600" />
                        </div>
                      )}
                      {/* Rank Badge */}
                      <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                        selectedUser.rank === 1
                          ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900"
                          : selectedUser.rank === 2
                          ? "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900"
                          : selectedUser.rank === 3
                          ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white"
                          : isDark
                          ? "bg-gray-700 text-gray-300"
                          : "bg-gray-200 text-gray-700"
                      }`}>
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
                      </div>
                    </div>
                  </div>
                </div>

                {/* Achievements Section */}
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-xl font-bold flex items-center ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                      <Award className="mr-2 text-2xl" /> Achievements
                    </h3>
                    <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {selectedUser.achievements?.filter(a => a.unlocked).length || 0} of {selectedUser.achievements?.length || 0} unlocked
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedUser.achievements?.map((achievement, index) => (
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
                      {selectedUser.achievements?.filter(a => a.unlocked).length === selectedUser.achievements?.length
                        ? "🎉 All achievements unlocked! You're an eco champion!"
                        : selectedUser.achievements?.filter(a => a.unlocked).length > 0
                        ? "Keep going! More achievements await!"
                        : "Start your eco journey to unlock achievements!"}
                    </p>
                  </div>
                </div>
              </>
            ) : null}
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

        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }

        .active\\:scale-98:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}