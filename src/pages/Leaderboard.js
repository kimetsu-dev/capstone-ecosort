import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Trophy, Medal, Award, Crown, Loader2, AlertTriangle } from 'lucide-react';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { isDark } = useTheme() || {};
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
          isDark
            ? "bg-gray-800/50 border-gray-700/50"
            : "bg-white/70 border-gray-200"
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
        className={`border-b transition-colors ${
          isDark ? "border-gray-700 hover:bg-gray-800/30" : "border-gray-200 hover:bg-gray-50"
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

  return (
    <div
      className={`min-h-screen ${
        isDark
          ? "bg-gray-900 text-gray-200"
          : "bg-gradient-to-br from-green-50 via-teal-50 to-blue-50 text-gray-900"
      }`}
    >
      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Sticky Header */}
        <div className={`sticky top-0 z-50 px-4 py-3 border-b backdrop-blur-sm ${
          isDark 
            ? "bg-gray-900/90 border-gray-700" 
            : "bg-white/90 border-gray-200"
        }`}>
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate("/dashboard")}
                className={`flex items-center gap-2 transition-colors ${
                  isDark ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
                aria-label="Back to Dashboard"
              >
                <ArrowLeft />
                <span className="font-medium">Back</span>
              </button>
              <h1 className={`text-lg font-semibold ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                Leaderboard
              </h1>
            </div>
          </div>
        </div>
        
        <div className="max-w-md mx-auto px-4 py-4">
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
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Desktop Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className={`flex items-center gap-2 transition-colors ${
                  isDark ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
                aria-label="Back to Dashboard"
              >
                <ArrowLeft />
                <span className="font-medium">Dashboard</span>
              </button>
              <div className={`w-px h-6 ${isDark ? "bg-gray-700" : "bg-gray-300"}`}></div>
              <h1 className={`text-2xl font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                Leaderboard
              </h1>
            </div>
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
      </div>
    </div>
  );
}