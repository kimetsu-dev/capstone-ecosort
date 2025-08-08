import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { auth, db, storage } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

function Toast({ visible, message, type }) {
  if (!visible) return null;
  const bgColors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };
  return (
    <div
      className={`fixed bottom-6 right-6 px-6 py-3 rounded shadow-lg text-white z-50 ${bgColors[type] || bgColors.info}`}
      role="alert"
      aria-live="assertive"
    >
      {message}
    </div>
  );
}

export default function Report() {
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [category, setCategory] = useState("violation");
  const [severity, setSeverity] = useState("medium");
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Toast helper
  const showToast = (message, type = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "info" }), 4000);
  };

  // Geolocation
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation not supported by your browser.", "error");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const formattedLocation = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setCurrentLocation({ lat: latitude, lng: longitude });
        setLocation(formattedLocation);
        setUseCurrentLocation(true);
        setLocationLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        showToast("Could not access your location. Please enter it manually.", "error");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setMedia(null);
      setMediaPreview(null);
      return;
    }

    const maxSizeMB = 50;
    if (file.size > maxSizeMB * 1024 * 1024) {
      showToast(`File is too large. Maximum size is ${maxSizeMB}MB.`, "error");
      e.target.value = "";
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];
    if (!allowedTypes.includes(file.type)) {
      showToast("Please upload a valid image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV).", "error");
      e.target.value = "";
      return;
    }

    setMedia(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setMediaPreview({
        url: ev.target.result,
        type: file.type.startsWith("image/") ? "image" : "video",
      });
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMedia(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!description.trim()) {
      showToast("Please provide a description of the violation.", "error");
      return;
    }
    if (description.trim().length < 10) {
      showToast("Description must be at least 10 characters.", "error");
      return;
    }
    if (!location.trim()) {
      showToast("Please specify the location of the violation.", "error");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      showToast("You must be logged in to submit a report.", "error");
      return;
    }

    setLoading(true);

    try {
      let mediaUrl = null;
      let mediaType = null;

      if (media) {
        // Upload media to Firebase Storage

        const storageRef = ref(storage, `reports/${user.uid}/${Date.now()}_${media.name}`);
        const uploadTask = uploadBytesResumable(storageRef, media);

        // Wait for upload to complete
        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              // Optionally you can track progress here
              // const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              // console.log(`Upload is ${progress}% done`);
            },
            (error) => {
              console.error("Upload failed:", error);
              showToast(`File upload failed: ${error.message}`, "error");
              reject(error);
            },
            async () => {
              mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);
              mediaType = media.type.startsWith("image/") ? "image" : "video";
              resolve();
            }
          );
        });
      }

      const reportData = {
        reportedBy: user.uid,
        reporterEmail: user.email || "unknown",
        description: description.trim(),
        location: location.trim(),
        mediaUrl,
        mediaType,
        status: "pending",
        likes: [],
        comments: [],
        submittedAt: serverTimestamp(),
        coordinates: currentLocation || null,
        severity,
        category,
        resolved: false,
        adminNotes: "",
      };

      await addDoc(collection(db, "reports"), reportData);

      showToast("Your report has been submitted successfully! Thank you.", "success");

      // Reset form
      setDescription("");
      setLocation("");
      setMedia(null);
      setMediaPreview(null);
      setUseCurrentLocation(false);
      setCurrentLocation(null);
      setCategory("violation");
      setSeverity("medium");

      navigate("/forum");
    } catch (err) {
      console.error("Submission error:", err);
      showToast(`Failed to submit report: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg mx-auto mb-4">
            📢
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
            Report a Violation
          </h1>
          <p className="text-slate-600">Help us maintain a safe and clean community</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden p-8 space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Report Category
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "violation", label: "Code Violation", icon: "⚠️" },
                  { value: "maintenance", label: "Maintenance Issue", icon: "🔧" },
                  { value: "safety", label: "Safety Concern", icon: "🚨" },
                  { value: "other", label: "Other", icon: "📝" },
                ].map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 flex items-center space-x-2 ${
                      category === cat.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                    aria-pressed={category === cat.value}
                  >
                    <span>{cat.icon}</span>
                    <span className="font-medium text-sm">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                placeholder="Please provide a detailed description..."
                maxLength={500}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none"
              />
              <div className="mt-1 text-xs text-slate-500">
                {description.length}/500 characters (minimum 10 required)
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Location *
              </label>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className={`w-full p-3 rounded-xl border-2 transition-all duration-200 flex items-center justify-center space-x-2 ${
                    useCurrentLocation
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-300 hover:border-slate-400 text-slate-600"
                  } ${locationLoading ? "opacity-50 cursor-not-allowed" : "hover:shadow-md"}`}
                >
                  {locationLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Getting location...</span>
                    </>
                  ) : useCurrentLocation ? (
                    <>
                      <span>✅</span>
                      <span>Using current location</span>
                    </>
                  ) : (
                    <>
                      <span>📍</span>
                      <span>Use current location</span>
                    </>
                  )}
                </button>

                <input
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setUseCurrentLocation(false);
                  }}
                  required
                  placeholder="Or enter address, building name, or landmark..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                />
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Severity Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "low", label: "Low", color: "text-green-700 border-green-300 bg-green-50", icon: "🟢" },
                  { value: "medium", label: "Medium", color: "text-yellow-700 border-yellow-300 bg-yellow-50", icon: "🟡" },
                  { value: "high", label: "High", color: "text-red-700 border-red-300 bg-red-50", icon: "🔴" },
                ].map((sev) => (
                  <button
                    key={sev.value}
                    type="button"
                    onClick={() => setSeverity(sev.value)}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 flex items-center justify-center space-x-2 ${
                      severity === sev.value
                        ? sev.color
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                    aria-pressed={severity === sev.value}
                  >
                    <span>{sev.icon}</span>
                    <span className="font-medium text-sm">{sev.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Media Upload */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Upload Photo or Video (Optional)
              </label>
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-slate-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaChange}
                    className="hidden"
                    id="media-upload"
                  />
                  <label
                    htmlFor="media-upload"
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      📎
                    </div>
                    <p className="text-slate-600 font-medium">Click to upload a file</p>
                    <p className="text-slate-400 text-sm">
                      Images: JPG, PNG, GIF, WebP | Videos: MP4, WebM, MOV
                    </p>
                    <p className="text-slate-400 text-xs">Maximum file size: 50MB</p>
                  </label>
                </div>

                {mediaPreview && (
                  <div className="relative border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <button
                      type="button"
                      onClick={removeMedia}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      aria-label="Remove uploaded media"
                    >
                      ✕
                    </button>
                    {mediaPreview.type === "image" ? (
                      <img
                        src={mediaPreview.url}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    ) : (
                      <video
                        src={mediaPreview.url}
                        controls
                        className="w-full h-40 rounded-lg"
                      />
                    )}
                    <p className="text-sm text-slate-600 mt-2 flex items-center space-x-2">
                      <span>📎</span>
                      <span>{media?.name}</span>
                      <span className="text-slate-400">({(media?.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={
                  loading || !description.trim() || !location.trim() || description.length < 10
                }
                className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-orange-700 focus:ring-4 focus:ring-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting Report...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>📤</span>
                    <span>Submit Report</span>
                  </div>
                )}
              </button>

              <p className="text-center text-slate-500 text-sm mt-3">
                Your report will be reviewed by our team within 24-48 hours
              </p>
            </div>
          </div>
        </form>

        {/* Back Button */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/forum")}
            className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            ← Back to Forum
          </button>
        </div>
      </div>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}
