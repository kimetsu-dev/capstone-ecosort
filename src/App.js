import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import "./index.css";

// Import your pages
import Welcome from './pages/Welcome';
import Signup from './pages/Signup';
import Login from './pages/Login';

import AdminPanel from './pages/AdminPanel';
import AdminProfile from "./pages/AdminProfile";
import Dashboard from './pages/Dashboard';
import Forum from './pages/Forum';
import SubmitWaste from './pages/SubmitWaste';
import Rewards from './pages/Rewards';
import Report from './pages/Report';
import Profile from './pages/Profile';
import Transactions from './pages/Transactions';
import Leaderboard from './pages/Leaderboard';
import MyRedemptions from "./pages/MyRedemptions";

// Import auth hook
import { useAuth } from './contexts/AuthContext';

// ProtectedRoute component to guard certain routes
const ProtectedRoute = ({ element, isAdminRoute = false }) => {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (isAdminRoute && !isAdmin) return <Navigate to="/dashboard" replace />;

  return element;
};


export default function App() {
  return (
    <div className="no-select">
      <Router>
        <Routes>

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/welcome" replace />} />

          {/* Public routes */}
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          {/* Protected user routes */}
          <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
          <Route path="/forum" element={<ProtectedRoute element={<Forum />} />} />
          <Route path="/submitwaste" element={<ProtectedRoute element={<SubmitWaste />} />} />
          <Route path="/rewards" element={<ProtectedRoute element={<Rewards />} />} />
          <Route path="/report" element={<ProtectedRoute element={<Report />} />} />
          <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
          <Route path="/transactions" element={<ProtectedRoute element={<Transactions />} />} />
          <Route path="/leaderboard" element={<ProtectedRoute element={<Leaderboard />} />} />
          <Route path="/my-redemptions" element={<ProtectedRoute element={<MyRedemptions />} />} />
          <Route path="/adminprofile" element={<AdminProfile />} />

          {/* Protected admin route */}
          <Route path="/adminpanel" element={<ProtectedRoute element={<AdminPanel />} isAdminRoute />} />

          {/* Catch-all fallback to welcome */}
          <Route path="*" element={<Navigate to="/welcome" replace />} />

        </Routes>
      </Router>
    </div>
  );
}
