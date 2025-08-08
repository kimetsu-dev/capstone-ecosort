import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

export default function Leaderboard() {
  const navigate = useNavigate(); // Initialize navigate
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const ArrowLeft = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  // Rank badge colors for top 3 ranks
  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return "bg-yellow-400 text-yellow-900"; // Gold
      case 2:
        return "bg-gray-300 text-gray-900"; // Silver
      case 3:
        return "bg-amber-700 text-white"; // Bronze
      default:
        return "bg-gray-200 text-gray-700"; // Default
    }
  };

  return (
    <section className="max-w-md mx-auto mt-8 p-6 bg-white rounded-2xl shadow-lg ring-1 ring-gray-200">
      {/* Back to Dashboard Button */}
      <div className="mb-6">
        <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft />
            <span className="font-medium">Dashboard</span>
            </button>
      </div>

      <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-6">Leaderboard</h2>

      {loading && (
        <div className="flex justify-center items-center space-x-2">
          <svg
            className="animate-spin h-6 w-6 text-green-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span className="text-gray-700 font-medium">Loading leaderboard...</span>
        </div>
      )}

      {error && (
        <p className="text-center text-red-600 font-semibold">{error}</p>
      )}

      {!loading && !error && topUsers.length === 0 && (
        <p className="text-center text-gray-500">No users on the leaderboard yet.</p>
      )}

      {!loading && !error && topUsers.length > 0 && (
        <ol className="space-y-4">
          {topUsers.map((user, index) => (
            <li
              key={user.id}
              tabIndex={0}
              className="flex items-center justify-between p-4 rounded-xl shadow transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 cursor-pointer bg-gradient-to-r from-green-50 to-green-100"
              aria-label={`Rank ${index + 1}, ${user.username || user.email || 'Anonymous user'} with ${user.totalPoints || 0} points`}
              onClick={() => alert(`Clicked on user: ${user.username || user.email || 'Anonymous'}`)}
            >
              <div className="flex items-center space-x-4">
                {/* Rank badge */}
                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-bold ${getRankBadge(index + 1)}`}>
                  {index + 1}
                </span>
                {/* User name or email */}
                <span className="font-semibold text-gray-900 truncate max-w-[180px]">
                  {user.username || user.email || 'Anonymous'}
                </span>
              </div>
              {/* Points */}
              <span className="font-mono font-semibold text-green-700">{(user.totalPoints ?? 0).toLocaleString()} pts</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
