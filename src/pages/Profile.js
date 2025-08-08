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
  FiEdit3,
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
} from "react-icons/fi";

export default function Profile() {
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
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return navigate("/");
      setUser(currentUser);
      setEmail(currentUser.email);

      // Detect if user signed in with email/password
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
    if (!pwd) return true; // Empty means no change
    if (pwd.length < 8) return false;
    if (!/[A-Z]/.test(pwd)) return false;
    if (!/[0-9]/.test(pwd)) return false;
    return true;
  };

  // Retry helper: upload file with retries & exponential backoff
  const uploadWithRetry = async (fileRef, file, retries = 3, delay = 1000) => {
    try {
      console.log(`Uploading file, attempts left: ${retries}`);
      return await uploadBytes(fileRef, file);
    } catch (error) {
      console.warn(`Upload failed: ${error.message}. Retries left: ${retries}`);
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
      // Email/password user: use email + current password
      if (!currentPassword) {
        setCurrentPasswordError("Current password is required to change password or email.");
        throw new Error("Current password missing");
      }
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
    } else {
      // Google (or other OAuth) user: use popup reauth
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
      // Re-authenticate only if changing email or password
      const emailChanged = email && email !== user.email;
      const passwordChanging = !!password;
      if (emailChanged || passwordChanging) {
        await performReauthentication();
      }

      // Upload profile picture if changed
      let uploadedUrl = profileUrl;
      if (profilePicFile) {
        uploadedUrl = await uploadProfilePicture(profilePicFile);
        setProfileUrl(uploadedUrl);
        await updateDoc(doc(db, "users", user.uid), { profileUrl: uploadedUrl });
      }

      // Update username
      if (username.trim() && username !== user.displayName) {
        await updateProfile(user, { displayName: username.trim() });
        await updateDoc(doc(db, "users", user.uid), { username: username.trim() });
      }

      // Update email
      if (emailChanged) {
        await updateEmail(user, email);
      }

      // Update password
      if (passwordChanging) {
        await updatePassword(user, password);
      }

      // Clear sensitive fields
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 relative overflow-hidden">
      <div className="relative z-10 px-4 py-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-y-4 sm:gap-y-0 animate-slide-down">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <FiArrowLeft className="text-gray-700" />
            <span className="text-gray-700 font-medium">Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-800 text-center">My Profile</h1>
          <button
            onClick={() => {
              setIsEditing(!isEditing);
              if (isEditing) {
                setPassword("");
                setConfirmPassword("");
                setCurrentPassword("");
                setPasswordError("");
                setConfirmPasswordError("");
                setCurrentPasswordError("");
                setProfilePicFile(null);
              }
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${
              isEditing
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            <FiEdit3 />
            <span className="font-medium">{isEditing ? "Cancel" : "Edit"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur rounded-3xl p-8 shadow-xl border border-white/30 animate-fade-in">
              {/* Profile Picture */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  {profileUrl ? (
                    <img
                      src={profileUrl}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-white shadow-lg group-hover:scale-105 transition-transform duration-300">
                      <FiUser size={48} className="text-gray-600" />
                    </div>
                  )}

                  {isEditing && (
                    <label className="absolute bottom-1 right-1 bg-blue-500 rounded-full p-3 shadow-lg cursor-pointer hover:bg-blue-600 transition-colors duration-300">
                      <FiCamera className="text-white" />
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
                <h2 className="text-2xl font-bold text-gray-800 text-center mt-3">{username || "Anonymous User"}</h2>
                <p className="text-gray-600 text-center">{email}</p>
              </div>
              {/* Badge */}
              <div className="text-center mb-6">
                <div className={`inline-flex items-center space-x-2 bg-gradient-to-r ${currentBadge.color} text-white px-6 py-3 rounded-2xl shadow-lg`}>
                  <span className="text-2xl">{currentBadge.icon}</span>
                  <span className="font-bold">{currentBadge.name}</span>
                </div>
              </div>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-emerald-100 to-green-200 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-700">{points.toLocaleString()}</div>
                  <div className="text-sm text-emerald-600">Total Points</div>
                </div>
                <div className="bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">#{rank || "?"}</div>
                  <div className="text-sm text-blue-600">Rank</div>
                </div>
              </div>
              {/* Progress to Next Level */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Next Level</span>
                  <span className="text-sm text-gray-500">{levelProgress.remaining} points to go</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${levelProgress.progress}%` }}
                  ></div>
                </div>
              </div>
              {/* Link to My Redemptions */}
              <div className="mt-4 text-center">
                <Link
                  to="/my-redemptions"
                  className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors duration-300 shadow-lg"
                >
                  View My Redemptions
                </Link>
              </div>
            </div>
          </div>
          {/* Main Content */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Profile Form */}
            <div className="bg-white/90 backdrop-blur rounded-3xl p-8 shadow-xl border border-white/30 animate-fade-in-up">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <FiUser className="mr-3" /> Profile Information
              </h3>
              <div className="space-y-6">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
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
                          ? "border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                          : "border-gray-200 bg-gray-50"
                      }`}
                      placeholder="Enter your username"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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
                          ? "border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                          : "border-gray-200 bg-gray-50"
                      }`}
                      placeholder="Enter your email"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {/* Re-auth fields only show if editing */}
                {isEditing && (
                  <>
                    {isEmailUser && (
                      <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password <span className="text-gray-400">(required to change email or password)</span>
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
                              currentPasswordError ? "focus:ring-red-500" : "focus:ring-blue-200"
                            } bg-white transition-all duration-300`}
                            placeholder="Enter current password"
                            autoComplete="current-password"
                            required={password || (email !== user?.email)}
                            aria-describedby="currentPasswordError"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                          >
                            {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                          </button>
                        </div>
                        {currentPasswordError && (
                          <p id="currentPasswordError" className="text-xs text-red-600 mt-1">{currentPasswordError}</p>
                        )}
                      </div>
                    )}

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        New Password <span className="text-gray-400">(optional)</span>
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
                            passwordError ? "focus:ring-red-500" : "focus:ring-blue-200"
                          } bg-white transition-all duration-300`}
                          placeholder="Enter new password"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Must be at least 8 characters, with uppercase and number.
                      </p>
                      {passwordError && <p className="text-xs text-red-600 mt-1">{passwordError}</p>}
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password <span className="text-gray-400">(optional)</span>
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
                            confirmPasswordError ? "focus:ring-red-500" : "focus:ring-blue-200"
                          } bg-white transition-all duration-300`}
                          placeholder="Confirm new password"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                      {confirmPasswordError && <p className="text-xs text-red-600 mt-1">{confirmPasswordError}</p>}
                    </div>
                  </>
                )}

                {isEditing && (
                  <button
                    onClick={handleSave}
                    disabled={isSaveDisabled}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-busy={saving}
                  >
                    <FiSave />
                    <span>{saving ? "Saving..." : "Save Changes"}</span>
                  </button>
                )}
              </div>
            </div>
            {/* Achievements */}
            <div className="bg-white/90 backdrop-blur rounded-3xl p-8 shadow-xl border border-white/30 animate-fade-in-up">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <FiAward className="mr-3" /> Achievements
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {achievements.length > 0 ? (
                  achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-2xl p-6 border border-amber-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-3xl">{achievement.icon}</div>
                        <div>
                          <h4 className="font-bold text-amber-800">{achievement.name}</h4>
                          <p className="text-sm text-amber-600">{achievement.description}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    <FiTrendingUp className="mx-auto text-4xl mb-4 opacity-50" />
                    <p>Start earning points to unlock achievements!</p>
                  </div>
                )}
              </div>
            </div>
            {/* Account Actions */}
            <div className="bg-white/90 backdrop-blur rounded-3xl p-8 shadow-xl border border-white/30 animate-fade-in-up">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Account Actions</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleLogout}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <FiLogOut />
                  <span>Logout</span>
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <FiTrash2 />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(15px) rotate(-1deg); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 8s ease-in-out infinite; }
        .animate-slide-down { animation: slide-down 0.8s ease-out; }
        .animate-fade-in { animation: fade-in 1s ease-out 0.2s both; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out 0.4s both; }
      `}</style>
    </div>
  );
}
