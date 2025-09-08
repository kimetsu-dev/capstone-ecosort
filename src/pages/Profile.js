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
    const achievements = [];
    if (points >= 100)
      achievements.push({ name: "First Steps", icon: "🌱", description: "Earned your first 100 points" });
    if (points >= 500)
      achievements.push({ name: "Eco Advocate", icon: "🌿", description: "Reached 500 points milestone" });
    if (points >= 1000)
      achievements.push({ name: "Eco Hero", icon: "🏆", description: "Achieved 1000 points!" });
    if (points >= 2000)
      achievements.push({ name: "Green Champion", icon: "👑", description: "Outstanding 2000+ points" });
    return achievements;
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
      <div className="relative z-10 px-3 sm:px-4 py-4 sm:py-6 max-w-6xl mx-auto">
        {/* Mobile-optimized Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          {/* Left side - Back button */}
          <button
            onClick={() => navigate("/dashboard")}
            className={`flex items-center space-x-2 px-3 py-2 sm:px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 ${
              isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FiArrowLeft className="text-sm sm:text-base" />
            <span className="text-sm sm:text-base">Back</span>
          </button>

          {/* Center - Title */}
          <h1
            className={`text-xl sm:text-2xl lg:text-3xl font-bold text-center ${
              isDark ? "text-gray-200" : "text-gray-800"
            }`}
          >
            My Profile
          </h1>

          {/* Right side - Settings button */}
          <button
            onClick={() => navigate("/settings")}
            className={`flex items-center space-x-2 px-3 py-2 sm:px-4 rounded-xl shadow-md transition-all duration-300 hover:scale-105 ${
              isDark
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <FiSettings className="text-sm sm:text-base" />
            <span className="text-sm sm:text-base hidden sm:inline">Settings</span>
          </button>
        </div>  

       
            {/* Mobile-optimized Profile Layout */}
            <div className="space-y-6">
              {/* Profile Summary Card - Always on top for mobile */}
              <div
                className={`rounded-2xl p-4 sm:p-6 shadow-lg border transition-colors duration-500 ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-gray-200"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  {/* Profile Picture */}
                  <div className="relative group flex-shrink-0">
                    {profileUrl ? (
                      <img
                        src={profileUrl}
                        alt="Profile"
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-3 border-white shadow-md group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-3 border-white shadow-md group-hover:scale-105 transition-transform duration-300">
                        <FiUser size={32} className="text-gray-600" />
                      </div>
                    )}

                    {isEditing && (
                      <label className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-2 shadow-lg cursor-pointer hover:bg-blue-600 transition-colors duration-300">
                        <FiCamera className="text-white text-xs" />
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

                  {/* User Info */}
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-lg sm:text-xl font-bold mb-1">
                      {username || "Anonymous User"}
                    </h2>
                    <p className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {email}
                    </p>
                    
                    {/* Badge */}
                    <div
                      className={`inline-flex items-center space-x-2 px-3 py-1 sm:px-4 sm:py-2 rounded-xl shadow-md bg-gradient-to-r ${currentBadge.color} text-white text-sm`}
                    >
                      <span className="text-lg">{currentBadge.icon}</span>
                      <span className="font-semibold">{currentBadge.name}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-3 sm:gap-4">
                    <div className={`text-center px-3 py-2 rounded-xl ${isDark ? "bg-gray-700" : "bg-emerald-50"}`}>
                      <div className={`text-lg font-bold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                        {points.toLocaleString()}
                      </div>
                      <div className={`text-xs ${isDark ? "text-emerald-500" : "text-emerald-600"}`}>Points</div>
                    </div>
                    <div className={`text-center px-3 py-2 rounded-xl ${isDark ? "bg-gray-700" : "bg-blue-50"}`}>
                      <div className={`text-lg font-bold ${isDark ? "text-blue-400" : "text-blue-700"}`}>
                        #{rank || "?"}
                      </div>
                      <div className={`text-xs ${isDark ? "text-blue-500" : "text-blue-600"}`}>Rank</div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className={`mt-4 p-3 rounded-xl ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      Next Level
                    </span>
                    <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {levelProgress.remaining} points to go
                    </span>
                  </div>
                  <div className={`w-full rounded-full h-2 ${isDark ? "bg-gray-600" : "bg-gray-200"}`}>
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${levelProgress.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <Link
                    to="/my-redemptions"
                    state={{ from: "/profile" }}
                    className={`inline-flex items-center text-sm font-medium transition-colors ${
                      isDark 
                        ? "text-blue-400 hover:text-blue-300" 
                        : "text-blue-600 hover:text-blue-700"
                    }`}
                  >
                    View My Redemptions →
                  </Link>
                </div>
              </div>

              {/* Profile Information Form */}
              <div
                className={`rounded-2xl p-4 sm:p-6 shadow-lg border transition-colors duration-500 ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-gray-200"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
              >
                <h3 className={`text-lg sm:text-xl font-bold mb-4 flex items-center ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                  <FiUser className="mr-2" /> Profile Information
                </h3>

                <div className="space-y-4">
                  {/* Username */}
                  <div>
                    <label htmlFor="username" className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Username
                    </label>
                    <div className="relative">
                      <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={!isEditing}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-300 ${
                          isEditing
                            ? `border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                                isDark ? "bg-gray-700 text-gray-200" : "bg-white"
                              }`
                            : `border-gray-200 ${isDark ? "bg-gray-700 text-gray-400" : "bg-gray-50"}`
                        }`}
                        placeholder="Enter your username"
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Email Address
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={!isEditing}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-300 ${
                          isEditing
                            ? `border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                                isDark ? "bg-gray-700 text-gray-200" : "bg-white"
                              }`
                            : `border-gray-200 ${isDark ? "bg-gray-700 text-gray-400" : "bg-gray-50"}`
                        }`}
                        placeholder="Enter your email"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Fields - Only show when editing */}
                  {isEditing && (
                    <>
                      {isEmailUser && (
                        <div>
                          <label htmlFor="currentPassword" className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            Current Password <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>(required to change email or password)</span>
                          </label>
                          <div className="relative">
                            <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              id="currentPassword"
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => {
                                setCurrentPassword(e.target.value);
                                setCurrentPasswordError("");
                              }}
                              className={`w-full pl-10 pr-12 py-3 rounded-xl border ${
                                currentPasswordError ? "border-red-500" : "border-gray-300"
                              } focus:border-blue-500 focus:ring-2 ${
                                currentPasswordError ? "focus:ring-red-200" : "focus:ring-blue-200"
                              } ${isDark ? "bg-gray-700 text-gray-200" : "bg-white"} transition-all duration-300`}
                              placeholder="Enter current password"
                              autoComplete="current-password"
                              required={password || (email !== user?.email)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                          </div>
                          {currentPasswordError && (
                            <p className="text-xs text-red-600 mt-1">{currentPasswordError}</p>
                          )}
                        </div>
                      )}

                      <div>
                        <label htmlFor="password" className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          New Password <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>(optional)</span>
                        </label>
                        <div className="relative">
                          <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setPasswordError("");
                            }}
                            className={`w-full pl-10 pr-12 py-3 rounded-xl border ${
                              passwordError ? "border-red-500" : "border-blue-300"
                            } focus:border-blue-500 focus:ring-2 ${
                              passwordError ? "focus:ring-red-200" : "focus:ring-blue-200"
                            } ${isDark ? "bg-gray-700 text-gray-200" : "bg-white"} transition-all duration-300`}
                            placeholder="Enter new password"
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                          </button>
                        </div>
                        <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          Must be at least 8 characters, with uppercase and number.
                        </p>
                        {passwordError && <p className="text-xs text-red-600 mt-1">{passwordError}</p>}
                      </div>

                      <div>
                        <label htmlFor="confirmPassword" className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              setConfirmPasswordError("");
                            }}
                            className={`w-full pl-10 pr-12 py-3 rounded-xl border ${
                              confirmPasswordError ? "border-red-500" : "border-blue-300"
                            } focus:border-blue-500 focus:ring-2 ${
                              confirmPasswordError ? "focus:ring-red-200" : "focus:ring-blue-200"
                            } ${isDark ? "bg-gray-700 text-gray-200" : "bg-white"} transition-all duration-300`}
                            placeholder="Confirm new password"
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                          </button>
                        </div>
                        {confirmPasswordError && <p className="text-xs text-red-600 mt-1">{confirmPasswordError}</p>}
                      </div>
                    </>
                  )}

                  {/* Save Button - Only show when editing */}
                  {isEditing && (
                    <button
                      onClick={handleSave}
                      disabled={isSaveDisabled}
                      className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                    >
                      <FiSave />
                      <span>{saving ? "Saving..." : "Save Changes"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Achievements Section */}
              <div
                className={`rounded-2xl p-4 sm:p-6 shadow-lg border transition-colors duration-500 ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-gray-200"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
              >
                <h3 className={`text-lg sm:text-xl font-bold mb-4 flex items-center ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                  <FiAward className="mr-2" /> Achievements
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {achievements.length > 0 ? (
                    achievements.map((achievement, index) => (
                      <div
                        key={index}
                        className={`rounded-xl p-4 border ${
                          isDark ? "bg-yellow-800/20 border-yellow-600/30" : "bg-yellow-50 border-amber-200"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl flex-shrink-0">{achievement.icon}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-sm sm:text-base ${isDark ? "text-yellow-300" : "text-amber-800"}`}>
                              {achievement.name}
                            </h4>
                            <p className={`text-xs sm:text-sm ${isDark ? "text-yellow-400" : "text-amber-600"} truncate`}>
                              {achievement.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      <FiTrendingUp className="mx-auto text-3xl mb-3 opacity-50" />
                      <p className="text-sm">Start earning points to unlock achievements!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Actions */}
              <div
                className={`rounded-2xl p-4 sm:p-6 shadow-lg border transition-colors duration-500 ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-gray-200"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
              >
                <h3 className={`text-lg sm:text-xl font-bold mb-4 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                  Account Actions
                </h3>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleLogout}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                  >
                    <FiLogOut />
                    <span>Logout</span>
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                  >
                    <FiTrash2 />
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>

              {/* Bottom Spacing for Mobile */}
              <div className="h-4"></div>
            </div>
          
  
      </div>
    </div>
  );
}