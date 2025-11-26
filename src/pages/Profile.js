import { useEffect, useState } from "react";
import { auth, db, storage } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import {
  updateProfile,
  updateEmail,
  updatePassword,
  onAuthStateChanged,
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  query,
  collection,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import {
  FiUser,
  FiCamera,
  FiEye,
  FiEyeOff,
  FiArrowLeft,
  FiLogOut,
  FiTrash2,
  FiSave,
  FiMail,
  FiLock,
  FiAward,
  FiTrendingUp,
  FiSettings,
  FiEdit3,
  FiX,
  FiCheck,
} from "react-icons/fi";
import { useTheme } from "../contexts/ThemeContext";

export default function Profile() {
  const { isDark } = useTheme() || {};
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isEmailUser, setIsEmailUser] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profileUrl, setProfileUrl] = useState("");
  const [points, setPoints] = useState(0);
  const [rank, setRank] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [currentPasswordError, setCurrentPasswordError] = useState("");
  const [scrollY, setScrollY] = useState(0);

  // Handle scroll for animations
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return navigate("/");
      setUser(currentUser);
      setEmail(currentUser.email);

      const emailProviderPresent = currentUser.providerData.some(
        (provider) => provider.providerId === "password"
      );
      setIsEmailUser(emailProviderPresent);

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUsername(data.username || "");
        setPoints(data.totalPoints || 0);
        if (data.profileUrl) setProfileUrl(data.profileUrl);
        setAchievements(generateAchievements(data.totalPoints || 0));
      }

      const q = query(collection(db, "users"), orderBy("totalPoints", "desc"));
      const snapshot = await getDocs(q);
      const ranked = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRank(ranked.findIndex((u) => u.id === currentUser.uid) + 1);
    });

    return () => unsub();
  }, [navigate]);

  const generateAchievements = (points) => {
    const allAchievements = [
      { name: "First Steps", icon: "🌱", description: "Earned your first 100 points", requiredPoints: 100, unlocked: points >= 100 },
      { name: "Eco Advocate", icon: "🌿", description: "Reached 500 points milestone", requiredPoints: 500, unlocked: points >= 500 },
      { name: "Eco Hero", icon: "🏆", description: "Achieved 1000 points!", requiredPoints: 1000, unlocked: points >= 1000 },
      { name: "Green Champion", icon: "👑", description: "Outstanding 2000+ points", requiredPoints: 2000, unlocked: points >= 2000 },
    ];
    return allAchievements;
  };

  const validatePassword = (pwd) => {
    if (!pwd) return true;
    if (pwd.length < 8) return false;
    if (!/[A-Z]/.test(pwd)) return false;
    if (!/[0-9]/.test(pwd)) return false;
    return true;
  };

  const uploadWithRetry = async (fileRef, file, retries = 3, delay = 1000) => {
    try {
      return await uploadBytes(fileRef, file);
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return uploadWithRetry(fileRef, file, retries - 1, delay * 2);
    }
  };

  const uploadProfilePicture = async (file) => {
    if (!file) return null;
    const fileRef = ref(storage, `profiles/${user.uid}/${uuidv4()}`);
    await uploadWithRetry(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  const performReauthentication = async () => {
    if (isEmailUser) {
      if (!currentPassword) {
        setCurrentPasswordError("Current password is required to change password or email.");
        throw new Error("Current password missing");
      }
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
    } else {
      const googleProvider = new GoogleAuthProvider();
      await reauthenticateWithPopup(user, googleProvider);
    }
  };

  const handleSave = async () => {
    setPasswordError("");
    setConfirmPasswordError("");
    setCurrentPasswordError("");

    if (!username.trim()) {
      alert("Username cannot be empty");
      return;
    }

    if (password && !validatePassword(password)) {
      setPasswordError("Password must be at least 8 characters, include 1 uppercase letter and 1 number.");
      return;
    }

    if (password && password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }

    setSaving(true);

    try {
      const emailChanged = email && email !== user.email;
      const passwordChanging = !!password;
      if (emailChanged || passwordChanging) {
        await performReauthentication();
      }

      const updateFields = {};
      if (profilePicFile) {
        const uploadedUrl = await uploadProfilePicture(profilePicFile);
        setProfileUrl(uploadedUrl);
        updateFields.profileUrl = uploadedUrl;
      }
      if (username.trim() && username !== user.displayName) {
        updateFields.username = username.trim();
      }
      if (Object.keys(updateFields).length > 0) {
        await updateDoc(doc(db, "users", user.uid), updateFields);
      }
      if (username.trim() && username !== user.displayName) {
        await updateProfile(user, { displayName: username.trim() });
      }
      if (emailChanged) {
        await updateEmail(user, email);
      }
      if (passwordChanging) {
        await updatePassword(user, password);
      }
      setIsEditing(false);
      setPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setProfilePicFile(null);
      alert("Profile updated successfully");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setCurrentPasswordError("Current password is incorrect.");
      } else if (err.code === "auth/requires-recent-login") {
        alert("Please log out and log back in to perform this operation.");
      } else if (err.code === "auth/popup-closed-by-user") {
        alert("Reauthentication cancelled. Please try again.");
      } else {
        alert("Failed to update profile: " + (err.message || err));
      }
    }

    setSaving(false);
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      await signOut(auth);
      navigate("/");
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This cannot be undone.")) {
      try {
        await deleteUser(auth.currentUser);
        alert("Account deleted.");
        navigate("/");
      } catch (err) {
        console.error(err);
        alert("Failed to delete account.");
      }
    }
  };

  const getBadge = () => {
    if (points >= 2000) return { name: "Green Champion", icon: "👑", color: "from-purple-500 to-pink-500" };
    if (points >= 1000) return { name: "Eco Hero", icon: "🏆", color: "from-yellow-400 to-orange-500" };
    if (points >= 500) return { name: "Eco Advocate", icon: "🌿", color: "from-green-400 to-emerald-500" };
    if (points >= 100) return { name: "Eco Starter", icon: "♻️", color: "from-blue-400 to-cyan-500" };
    return { name: "Newbie", icon: "👤", color: "from-gray-400 to-gray-500" };
  };

  const getProgressToNextLevel = () => {
    const levels = [100, 500, 1000, 2000];
    const nextLevel = levels.find((level) => points < level);
    if (!nextLevel) return { progress: 100, remaining: 0, nextLevel: 2000 };
    const prevLevel = levels[levels.indexOf(nextLevel) - 1] || 0;
    const progress = ((points - prevLevel) / (nextLevel - prevLevel)) * 100;
    return { progress, remaining: nextLevel - points, nextLevel };
  };

  const currentBadge = getBadge();
  const levelProgress = getProgressToNextLevel();

  const isSaveDisabled =
    saving ||
    !username.trim() ||
    (password && (!validatePassword(password) || password !== confirmPassword)) ||
    (isEmailUser && (password || (email !== user?.email)) && !currentPassword);

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        isDark
          ? "bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 text-gray-200"
          : "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 text-gray-900"
      } relative overflow-x-hidden`}
    >
      {/* Enhanced Sticky Header */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl transition-all duration-300 ${
          isDark 
            ? `bg-gray-900/95 border-gray-700/50` 
            : `bg-white/95 border-gray-200/50`
        } ${scrollY > 20 ? 'shadow-lg border-b' : 'shadow-sm'}`}
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Enhanced Back Button */}
            <button
              onClick={() => navigate("/dashboard")}
              className={`group flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${
                isDark 
                  ? "bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 border border-gray-600/30" 
                  : "bg-white/80 text-gray-700 hover:bg-gray-50/80 border border-gray-200/50"
              } shadow-sm hover:shadow-md`}
            >
              <FiArrowLeft className="text-lg transition-transform group-hover:-translate-x-0.5" />
              <span className="text-sm sm:text-base">Back</span>
            </button>

            {/* Enhanced Title with Animation */}
            <h1
              className={`text-xl sm:text-2xl lg:text-3xl font-bold text-center flex-grow mx-6 transition-all duration-500 ${
                isDark ? "text-gray-200" : "text-gray-800"
              }`}
              style={{ 
                userSelect: "none",
                transform: scrollY > 50 ? 'scale(0.95)' : 'scale(1)',
              }}
            >
              My Profile
            </h1>

            {/* Enhanced Settings Button */}
            <button
              onClick={() => navigate("/settings")}
              className={`group flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${
                isDark 
                  ? "bg-gray-700/80 text-gray-300 hover:bg-gray-600/80 border border-gray-600/30" 
                  : "bg-gray-100/80 text-gray-700 hover:bg-gray-200/80 border border-gray-200/50"
              } shadow-sm hover:shadow-md`}
            >
              <FiSettings className="text-lg transition-transform group-hover:rotate-90" />
              <span className="text-sm sm:text-base hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content with Top Padding */}
      <div className="pt-20 sm:pt-24 pb-6 px-4 sm:px-6 max-w-4xl mx-auto">
        {/* Floating Edit Button */}
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 ${
              isDark
                ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600"
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            } text-white group`}
            style={{
              transform: `translateY(${Math.min(scrollY * 0.1, 10)}px)`,
            }}
          >
            <FiEdit3 className="text-xl transition-transform group-hover:rotate-12" />
          </button>
        )}

        {/* Enhanced Content Layout */}
        <div className="space-y-6">
          {/* Enhanced Profile Summary Card */}
          <div
            className={`rounded-2xl p-6 sm:p-8 shadow-xl border transition-all duration-500 ${
              isDark
                ? "bg-gray-800/95 border-gray-700/50 backdrop-blur-sm"
                : "bg-white/95 border-gray-200/50 backdrop-blur-sm"
            }`}
            style={{
              transform: `translateY(${Math.min(scrollY * 0.05, 5)}px)`,
            }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              {/* Enhanced Profile Picture */}
              <div className="relative group flex-shrink-0">
                {profileUrl ? (
                  <img
                    src={profileUrl}
                    alt="Profile"
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-xl group-hover:scale-105 transition-all duration-300"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-white shadow-xl group-hover:scale-105 transition-all duration-300">
                    <FiUser size={36} className="text-gray-600" />
                  </div>
                )}

                {isEditing && (
                  <label className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full p-3 shadow-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all duration-300 hover:scale-110 group">
                    <FiCamera className="text-white text-sm" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files[0]) setProfilePicFile(e.target.files[0]);
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Enhanced User Info */}
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                  {username || "Anonymous User"}
                </h2>
                <p className={`text-base mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {email}
                </p>
                
                {/* Enhanced Badge */}
                <div
                  className={`inline-flex items-center space-x-3 px-5 py-3 rounded-2xl shadow-lg bg-gradient-to-r ${currentBadge.color} text-white text-base font-semibold transition-all duration-300 hover:scale-105`}
                >
                  <span className="text-2xl">{currentBadge.icon}</span>
                  <span>{currentBadge.name}</span>
                </div>
              </div>

              {/* Enhanced Stats */}
              <div className="flex gap-4">
                <div className={`text-center px-5 py-4 rounded-2xl shadow-md transition-all duration-300 hover:scale-105 ${isDark ? "bg-gray-700/80" : "bg-emerald-50"}`}>
                  <div className={`text-2xl font-bold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                    {points.toLocaleString()}
                  </div>
                  <div className={`text-sm ${isDark ? "text-emerald-500" : "text-emerald-600"}`}>Points</div>
                </div>
                <div className={`text-center px-5 py-4 rounded-2xl shadow-md transition-all duration-300 hover:scale-105 ${isDark ? "bg-gray-700/80" : "bg-blue-50"}`}>
                  <div className={`text-2xl font-bold ${isDark ? "text-blue-400" : "text-blue-700"}`}>
                    #{rank || "?"}
                  </div>
                  <div className={`text-sm ${isDark ? "text-blue-500" : "text-blue-600"}`}>Rank</div>
                </div>
              </div>
            </div>

            {/* Enhanced Progress Bar */}
            <div className={`mt-6 p-4 rounded-2xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  Next Level Progress
                </span>
                <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {levelProgress.remaining} points to go
                </span>
              </div>
              <div className={`w-full rounded-full h-3 ${isDark ? "bg-gray-600" : "bg-gray-200"} overflow-hidden`}>
                <div
                  className="bg-gradient-to-r from-emerald-400 to-green-500 h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${levelProgress.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <Link
                to="/my-redemptions"
                state={{ from: "/profile" }}
                className={`inline-flex items-center font-medium transition-all duration-300 hover:scale-105 ${
                  isDark 
                    ? "text-blue-400 hover:text-blue-300" 
                    : "text-blue-600 hover:text-blue-700"
                }`}
              >
                View My Redemptions →
              </Link>
            </div>
          </div>

          {/* Enhanced Profile Information Form */}
          <div
            className={`rounded-2xl p-6 sm:p-8 shadow-xl border transition-all duration-500 ${
              isDark
                ? "bg-gray-800/95 border-gray-700/50 backdrop-blur-sm"
                : "bg-white/95 border-gray-200/50 backdrop-blur-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl sm:text-2xl font-bold flex items-center ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                <FiUser className="mr-3 text-2xl" /> Profile Information
              </h3>
              
              {isEditing && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setPassword("");
                      setConfirmPassword("");
                      setCurrentPassword("");
                      setProfilePicFile(null);
                    }}
                    className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${
                      isDark
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <FiX className="text-lg" />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaveDisabled}
                    className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-2 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {saving ? (
                      <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <FiCheck className="text-lg" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Enhanced Username Input */}
              <div>
                <label htmlFor="username" className={`block text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  Username
                </label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!isEditing}
                    className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 transition-all duration-300 text-lg ${
                      isEditing
                        ? `border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-200/50 ${
                            isDark ? "bg-gray-700 text-gray-200" : "bg-white"
                          }`
                        : `border-gray-200 ${isDark ? "bg-gray-700/50 text-gray-400" : "bg-gray-50"}`
                    }`}
                    placeholder="Enter your username"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Enhanced Email Input */}
              <div>
                <label htmlFor="email" className={`block text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  Email Address
                </label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!isEditing}
                    className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 transition-all duration-300 text-lg ${
                      isEditing
                        ? `border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-200/50 ${
                            isDark ? "bg-gray-700 text-gray-200" : "bg-white"
                          }`
                        : `border-gray-200 ${isDark ? "bg-gray-700/50 text-gray-400" : "bg-gray-50"}`
                    }`}
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Enhanced Password Fields - Only show when editing */}
              {isEditing && (
                <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                  {isEmailUser && (
                    <div>
                      <label htmlFor="currentPassword" className={`block text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        Current Password <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>(required for security changes)</span>
                      </label>
                      <div className="relative">
                        <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                        <input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => {
                            setCurrentPassword(e.target.value);
                            setCurrentPasswordError("");
                          }}
                          className={`w-full pl-12 pr-14 py-4 rounded-xl border-2 text-lg ${
                            currentPasswordError ? "border-red-500" : "border-gray-300"
                          } focus:border-blue-500 focus:ring-4 ${
                            currentPasswordError ? "focus:ring-red-200/50" : "focus:ring-blue-200/50"
                          } ${isDark ? "bg-gray-700 text-gray-200" : "bg-white"} transition-all duration-300`}
                          placeholder="Enter current password"
                          autoComplete="current-password"
                          required={password || (email !== user?.email)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showCurrentPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                        </button>
                      </div>
                      {currentPasswordError && (
                        <p className="text-sm text-red-600 mt-2 flex items-center">
                          <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                          {currentPasswordError}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label htmlFor="password" className={`block text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      New Password <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>(optional)</span>
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setPasswordError("");
                        }}
                        className={`w-full pl-12 pr-14 py-4 rounded-xl border-2 text-lg ${
                          passwordError ? "border-red-500" : "border-blue-300"
                        } focus:border-blue-500 focus:ring-4 ${
                          passwordError ? "focus:ring-red-200/50" : "focus:ring-blue-200/50"
                        } ${isDark ? "bg-gray-700 text-gray-200" : "bg-white"} transition-all duration-300`}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                      </button>
                    </div>
                    <p className={`text-sm mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      Must be at least 8 characters, with uppercase and number.
                    </p>
                    {passwordError && (
                      <p className="text-sm text-red-600 mt-2 flex items-center">
                        <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                        {passwordError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className={`block text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setConfirmPasswordError("");
                        }}
                        className={`w-full pl-12 pr-14 py-4 rounded-xl border-2 text-lg ${
                          confirmPasswordError ? "border-red-500" : "border-blue-300"
                        } focus:border-blue-500 focus:ring-4 ${
                          confirmPasswordError ? "focus:ring-red-200/50" : "focus:ring-blue-200/50"
                        } ${isDark ? "bg-gray-700 text-gray-200" : "bg-white"} transition-all duration-300`}
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                      </button>
                    </div>
                    {confirmPasswordError && (
                      <p className="text-sm text-red-600 mt-2 flex items-center">
                        <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                        {confirmPasswordError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Achievements Section */}
          <div
            className={`rounded-2xl p-6 sm:p-8 shadow-xl border transition-all duration-500 ${
              isDark
                ? "bg-gray-800/95 border-gray-700/50 backdrop-blur-sm"
                : "bg-white/95 border-gray-200/50 backdrop-blur-sm"
            }`}
          >
            <h3 className={`text-xl sm:text-2xl font-bold mb-2 flex items-center ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              <FiAward className="mr-3 text-2xl" /> Achievements
            </h3>
            <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {achievements.filter(a => a.unlocked).length} of {achievements.length} unlocked
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className={`rounded-2xl p-5 border transition-all duration-300 hover:scale-105 relative overflow-hidden ${
                    achievement.unlocked
                      ? `hover:shadow-lg ${
                          isDark ? "bg-yellow-800/20 border-yellow-600/30" : "bg-yellow-50 border-amber-200"
                        }`
                      : `${
                          isDark 
                            ? "bg-gray-700/30 border-gray-600/30 opacity-60" 
                            : "bg-gray-50 border-gray-200 opacity-70"
                        }`
                  }`}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    animation: 'fadeInUp 0.6s ease-out forwards',
                  }}
                >
                  {/* Unlocked Badge */}
                  {achievement.unlocked && (
                    <div className="absolute top-3 right-3 bg-green-500 rounded-full p-1 shadow-lg">
                      <FiCheck className="text-white text-xs" />
                    </div>
                  )}

                  {/* Locked Overlay */}
                  {!achievement.unlocked && (
                    <div className="absolute top-3 right-3">
                      <FiLock className={`text-xl ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                    </div>
                  )}

                  <div className="flex items-center space-x-4">
                    <div 
                      className={`text-3xl flex-shrink-0 ${
                        achievement.unlocked ? "animate-pulse" : "grayscale opacity-40"
                      }`}
                    >
                      {achievement.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 
                        className={`font-bold text-lg ${
                          achievement.unlocked 
                            ? (isDark ? "text-yellow-300" : "text-amber-800")
                            : (isDark ? "text-gray-400" : "text-gray-600")
                        }`}
                      >
                        {achievement.name}
                      </h4>
                      <p 
                        className={`text-sm ${
                          achievement.unlocked 
                            ? (isDark ? "text-yellow-400" : "text-amber-600")
                            : (isDark ? "text-gray-500" : "text-gray-500")
                        }`}
                      >
                        {achievement.description}
                      </p>
                      
                      {/* Progress indicator for locked achievements */}
                      {!achievement.unlocked && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={isDark ? "text-gray-500" : "text-gray-500"}>
                              {points} / {achievement.requiredPoints} points
                            </span>
                            <span className={isDark ? "text-gray-500" : "text-gray-500"}>
                              {Math.round((points / achievement.requiredPoints) * 100)}%
                            </span>
                          </div>
                          <div className={`w-full rounded-full h-1.5 ${isDark ? "bg-gray-600" : "bg-gray-200"}`}>
                            <div
                              className="bg-gradient-to-r from-blue-400 to-blue-500 h-1.5 rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min((points / achievement.requiredPoints) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                            {achievement.requiredPoints - points} points to unlock
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Account Actions */}
          <div
            className={`rounded-2xl p-6 sm:p-8 shadow-xl border transition-all duration-500 ${
              isDark
                ? "bg-gray-800/95 border-gray-700/50 backdrop-blur-sm"
                : "bg-white/95 border-gray-200/50 backdrop-blur-sm"
            }`}
          >
            <h3 className={`text-xl sm:text-2xl font-bold mb-6 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              Account Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleLogout}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 px-6 rounded-2xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 hover:scale-105 active:scale-95 group"
              >
                <FiLogOut className="text-xl transition-transform group-hover:-translate-x-1" />
                <span className="text-lg">Logout</span>
              </button>
              <button
                onClick={handleDeleteAccount}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 px-6 rounded-2xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 hover:scale-105 active:scale-95 group"
              >
                <FiTrash2 className="text-xl transition-transform group-hover:rotate-12" />
                <span className="text-lg">Delete Account</span>
              </button>
            </div>
          </div>

          {/* Bottom Spacing */}
          <div className="h-8"></div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}