import { useEffect, useState } from "react";
import { auth, db, storage } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  updateProfile,
  updateEmail,
  updatePassword,
  onAuthStateChanged,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from "firebase/auth";
import { doc, getDoc, updateDoc, query, collection, getDocs, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import {
  FiUser,
  FiCamera,
  FiEye,
  FiEyeOff,
  FiArrowLeft,
  FiSettings,
  FiLock,
  FiMail,
  FiCheck,
  FiX,
} from "react-icons/fi";
import { useTheme } from "../contexts/ThemeContext";

export default function AdminProfile() {
  const { isDark } = useTheme() || {};
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
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
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEmailUser, setIsEmailUser] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [currentPasswordError, setCurrentPasswordError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // Handle scroll for sticky header animations
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return navigate("/");
      setAdmin(currentUser);
      setEmail(currentUser.email);

      const emailProviderPresent = currentUser.providerData.some(
        (provider) => provider.providerId === "password"
      );
      setIsEmailUser(emailProviderPresent);

      const userDoc = await getDoc(doc(db, "admins", currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUsername(data.username || "");
        if (data.profileUrl) setProfileUrl(data.profileUrl);
      }
    });
    return () => unsub();
  }, [navigate]);

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
    const fileRef = ref(storage, `admins/${admin.uid}/${uuidv4()}`);
    await uploadWithRetry(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  const performReauthentication = async () => {
    if (isEmailUser) {
      if (!currentPassword) {
        setCurrentPasswordError("Current password is required to change password or email.");
        throw new Error("Current password missing");
      }
      const credential = EmailAuthProvider.credential(admin.email, currentPassword);
      await reauthenticateWithCredential(admin, credential);
    } else {
      const googleProvider = new GoogleAuthProvider();
      await reauthenticateWithPopup(admin, googleProvider);
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
      const emailChanged = email && email !== admin.email;
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
      if (username.trim() && username !== admin.displayName) {
        updateFields.username = username.trim();
      }
      if (Object.keys(updateFields).length > 0) {
        await updateDoc(doc(db, "admins", admin.uid), updateFields);
      }
      if (username.trim() && username !== admin.displayName) {
        await updateProfile(admin, { displayName: username.trim() });
      }
      if (emailChanged) {
        await updateEmail(admin, email);
      }
      if (passwordChanging) {
        await updatePassword(admin, password);
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

  

  const isSaveDisabled =
    saving ||
    !username.trim() ||
    (password && (!validatePassword(password) || password !== confirmPassword)) ||
    (isEmailUser && (password || (email !== admin?.email)) && !currentPassword);

  return (
    <div className={`min-h-screen relative ${isDark ? "bg-gray-900 text-gray-200" : "bg-gray-50 text-gray-900"} overflow-x-hidden`}>
      {/* Sticky Header */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl transition-all duration-300 ${
          isDark ? "bg-gray-900/95 border-gray-700/50" : "bg-white/95 border-gray-200/50"
        } shadow-sm border-b`}
        style={{ backdropFilter: "blur(20px)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/adminpanel")}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium hover:scale-105 transition"
          >
            <FiArrowLeft className="text-lg" />
            <span>Back</span>
          </button>

          <h1 className="text-xl sm:text-2xl font-bold text-center flex-grow">
            Admin Profile
          </h1>

          <button
            onClick={() => navigate("/adminsettings")}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium hover:scale-105 transition"
          >
            <FiSettings className="text-lg" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 sm:pt-24 pb-6 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">
        {/* Profile Card */}
        <div className={`rounded-2xl p-6 sm:p-8 shadow-xl border ${isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-gray-200/50"} relative`}>
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            {/* Profile Image */}
            <div className="relative group flex-shrink-0">
              {profileUrl ? (
                <img
                  src={profileUrl}
                  alt="Profile"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-xl group-hover:scale-105 transition-all duration-300"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gray-300 flex items-center justify-center border-4 border-white shadow-xl">
                  <FiUser size={36} className="text-gray-600" />
                </div>
              )}
              {isEditing && (
                <label className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-3 shadow-lg cursor-pointer hover:bg-blue-700 transition-all duration-300">
                  <FiCamera className="text-white text-sm" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setProfilePicFile(e.target.files[0])}
                  />
                </label>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">{username || "Admin"}</h2>
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>{email}</p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className={`rounded-2xl p-6 sm:p-8 shadow-xl border ${isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-gray-200/50"}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl sm:text-2xl font-bold flex items-center">
              <FiUser className="mr-3 text-2xl" /> Profile Information
            </h3>
            {isEditing && (
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Username</label>
              <input
                type="text"
                className="w-full rounded-xl border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!isEditing}
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full rounded-xl border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing || !isEmailUser}
              />
            </div>

            {isEditing && isEmailUser && (
              <div>
                <label className="block font-medium mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    className="w-full rounded-xl border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-2 text-gray-500"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {currentPasswordError && <p className="text-red-500 mt-1">{currentPasswordError}</p>}
              </div>
            )}

            {isEditing && (
              <>
                <div>
                  <label className="block font-medium mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-xl border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2 text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  {passwordError && <p className="text-red-500 mt-1">{passwordError}</p>}
                </div>

                <div>
                  <label className="block font-medium mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="w-full rounded-xl border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2 text-gray-500"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  {confirmPasswordError && <p className="text-red-500 mt-1">{confirmPasswordError}</p>}
                </div>
              </>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-4 mt-6">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
              >
                Edit Profile
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaveDisabled}
                className={`px-6 py-3 rounded-xl text-white transition ${
                  isSaveDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                Save Changes
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition"
            >
              Logout
            </button>
           
          </div>
        </div>
      </div>
    </div>
  );
}