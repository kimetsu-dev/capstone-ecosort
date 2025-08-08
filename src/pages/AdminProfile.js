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
  deleteUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import {
  FiUser,
  FiCamera,
  FiEdit3,
  FiArrowLeft,
  FiLogOut,
  FiTrash2,
  FiSave,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
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
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [currentPasswordError, setCurrentPasswordError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Load user and profile info on auth state change
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/");
        return;
      }
      setUser(currentUser);
      setEmail(currentUser.email);

      const isEmailProvider = currentUser.providerData.some(
        (provider) => provider.providerId === "password"
      );
      setIsEmailUser(isEmailProvider);

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUsername(data.username || "");
        if (data.profileUrl) setProfileUrl(data.profileUrl);
      }
    });
    return () => unsub();
  }, [navigate]);

  // Password validation (at least 8 chars, 1 uppercase, 1 number)
  const validatePassword = (pwd) => {
    if (!pwd) return true; // no change means OK
    if (pwd.length < 8) return false;
    if (!/[A-Z]/.test(pwd)) return false;
    if (!/[0-9]/.test(pwd)) return false;
    return true;
  };

  // Upload with retries and exponential backoff
  const uploadWithRetry = async (fileRef, file, retries = 3, delay = 1000) => {
    try {
      return await uploadBytes(fileRef, file);
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise((res) => setTimeout(res, delay));
      return uploadWithRetry(fileRef, file, retries - 1, delay * 2);
    }
  };

  // Upload profile picture helper
  const uploadProfilePicture = async (file) => {
    if (!file) return null;
    const fileRef = ref(storage, `profiles/${user.uid}/${uuidv4()}`);
    await uploadWithRetry(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  // Re-authenticate user securely before sensitive operations
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

  // Main save handler
  const handleSave = async () => {
    setPasswordError("");
    setConfirmPasswordError("");
    setCurrentPasswordError("");
    setMessage("");

    if (!username.trim()) {
      alert("Username cannot be empty");
      return;
    }
    if (password && !validatePassword(password)) {
      setPasswordError("Password must be at least 8 chars, with uppercase and number.");
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

      let uploadedUrl = profileUrl;
      if (profilePicFile) {
        uploadedUrl = await uploadProfilePicture(profilePicFile);
        setProfileUrl(uploadedUrl);
        await updateDoc(doc(db, "users", user.uid), { profileUrl: uploadedUrl });
      }

      if (username.trim() && username !== user.displayName) {
        await updateProfile(user, { displayName: username.trim() });
        await updateDoc(doc(db, "users", user.uid), { username: username.trim() });
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
      setMessage("Profile updated successfully.");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setCurrentPasswordError("Current password is incorrect.");
      } else if (err.code === "auth/requires-recent-login") {
        alert("Please log out and log back in to perform this operation.");
      } else if (err.code === "auth/popup-closed-by-user") {
        alert("Reauthentication cancelled. Please try again.");
      } else {
        setMessage("Failed to update profile: " + (err.message || err));
      }
    } finally {
      setSaving(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      await signOut(auth);
      navigate("/");
    }
  };

  // Delete account handler
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

  const isSaveDisabled =
    saving ||
    !username.trim() ||
    (password && (!validatePassword(password) || password !== confirmPassword)) ||
    (isEmailUser && (password || (email !== user?.email)) && !currentPassword);

  if (!user)
    return <p className="text-center mt-10 text-gray-600">Please log in to view profile.</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 relative overflow-hidden p-4 sm:p-8">
      {/* Header */}
      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-y-4 sm:gap-y-0">
          <button
            onClick={() => navigate("/adminpanel")}
            className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <FiArrowLeft className="text-gray-700" />
            <span className="text-gray-700 font-medium">Back</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-800 text-center flex-1 sm:flex-none">My Profile</h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${
              isEditing ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            <FiEdit3 />
            <span className="font-medium">{isEditing ? "Cancel" : "Edit"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur rounded-3xl p-8 shadow-xl border border-white/30">
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
                        onChange={(e) => e.target.files[0] && setProfilePicFile(e.target.files[0])}
                        disabled={saving}
                      />
                    </label>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-800 text-center mt-3">{username || "Anonymous User"}</h2>
                <p className="text-gray-600 text-center">{email}</p>
              </div>
            </div>
          </div>

          {/* Main Content Form for Editing */}
          <div className="lg:col-span-2 flex flex-col gap-8 bg-white/90 backdrop-blur rounded-3xl p-8 shadow-xl border border-white/30">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <FiUser className="mr-3" /> Profile Information
            </h3>
            <div className="space-y-6">
              {/* Username */}
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

              {/* Email */}
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
                    disabled={!isEditing || !isEmailUser}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-300 ${
                      isEditing && isEmailUser
                        ? "border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                        : "border-gray-200 bg-gray-50"
                    }`}
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Current Password for Re-authentication only for email/password users */}
              {isEmailUser && isEditing && (
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
                      disabled={!isEditing}
                      className={`w-full pl-10 pr-12 py-3 rounded-xl border ${
                        currentPasswordError ? "border-red-500" : "border-blue-300"
                      } focus:border-blue-500 focus:ring-2 ${
                        currentPasswordError ? "focus:ring-red-500" : "focus:ring-blue-200"
                      } bg-white transition-all duration-300`}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                      aria-describedby="currentPasswordError"
                      required={password || (email !== user?.email)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                    >
                      {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  {currentPasswordError && (
                    <p id="currentPasswordError" className="text-sm text-red-600 mt-1">
                      {currentPasswordError}
                    </p>
                  )}
                </div>
              )}

              {/* New Password */}
              {isEditing && (
                <>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      New Password (optional)
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
                        disabled={!isEditing}
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
                        aria-label={showPassword ? "Hide new password" : "Show new password"}
                      >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Must be at least 8 characters, include uppercase and number.
                    </p>
                    {passwordError && <p className="text-sm text-red-600 mt-1">{passwordError}</p>}
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password (optional)
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
                        disabled={!isEditing}
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
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    {confirmPasswordError && <p className="text-sm text-red-600 mt-1">{confirmPasswordError}</p>}
                  </div>
                </>
              )}

              {/* Buttons */}
              <div className="flex flex-wrap gap-4 mt-6">
                <button
                  onClick={handleSave}
                  disabled={isSaveDisabled}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${
                    isSaveDisabled ? "bg-gray-400 cursor-not-allowed text-gray-200" : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
                  }`}
                >
                  <FiSave />
                  <span className="font-semibold">Save Changes</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg bg-red-600 text-white hover:bg-red-700 transition-colors duration-300"
                >
                  <FiLogOut />
                  <span className="font-semibold">Logout</span>
                </button>

                <button
                  onClick={handleDeleteAccount}
                  className="flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg bg-gray-300 text-gray-700 hover:bg-gray-400 transition-colors duration-300"
                >
                  <FiTrash2 />
                  <span className="font-semibold">Delete Account</span>
                </button>
              </div>

              {message && (
                <div
                  className={`mt-6 p-3 rounded-lg text-center font-medium ${
                    message === "Profile updated successfully."
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                  role="alert"
                >
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
