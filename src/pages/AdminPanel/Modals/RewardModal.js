import { Award, X } from "lucide-react";
import { useReward } from "react-rewards";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, updateDoc, doc, collection } from "firebase/firestore";
import { db, storage } from "../../../firebase";

export default function RewardModal({
  rewardModal,
  setRewardModal,
  rewardForm,
  setRewardForm,
  loading,
  setLoading,
  showToast,
}) {
  const { reward, rewardMe } = useReward("modal-reward", "confetti", {
    lifetime: 1500,
    elementCount: 30,
  });

  // Upload handler - compress + upload to Firebase Storage
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });

      const storageRef = ref(storage, `rewards/${compressedFile.name}_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      const previewURL = URL.createObjectURL(compressedFile);

      setRewardForm((prev) => ({
        ...prev,
        imageFile: compressedFile,
        imagePreview: previewURL,
        imageUrl: downloadURL,
      }));

      showToast("Image uploaded successfully", "success");
    } catch (error) {
      console.error("Error uploading image:", error);
      showToast("Failed to upload image", "error");
    } finally {
      setLoading(false);
    }
  };

  // Save reward (create or update)
  const saveReward = async () => {
    if (!rewardForm.name.trim() || !rewardForm.description.trim()) {
      showToast("Please fill all required fields", "error");
      return;
    }
    if (loading) return;

    setLoading(true);

    try {
      const rewardData = {
        name: rewardForm.name.trim(),
        description: rewardForm.description.trim(),
        cost: parseInt(rewardForm.cost, 10) || 0,
        stock: parseInt(rewardForm.stock, 10) || 0,
        category: rewardForm.category.trim() || "Uncategorized",
        imageUrl: rewardForm.imageUrl || null,  // Always save permanent URL only
        popularity: Math.floor(Math.random() * 40) + 60,
        createdAt:
          rewardModal.isEdit && rewardModal.reward && rewardModal.reward.createdAt
            ? rewardModal.reward.createdAt
            : { seconds: Math.floor(Date.now() / 1000) },
      };

      if (rewardModal.isEdit && rewardModal.reward) {
        await updateDoc(doc(db, "rewards", rewardModal.reward.id), rewardData);
        showToast("Reward updated successfully", "success");
      } else {
        await addDoc(collection(db, "rewards"), rewardData);
        showToast("Reward created successfully", "success");
      }

      closeModalAndResetForm();
    } catch (error) {
      console.error("Error saving reward:", error);
      showToast("Failed to save reward", "error");
    } finally {
      setLoading(false);
    }
  };

  // Close modal and reset form
  const closeModalAndResetForm = () => {
    setRewardModal({ visible: false, reward: null, isEdit: false });
    setRewardForm({
      name: "",
      description: "",
      cost: "",
      stock: "",
      category: "food",
      imageFile: null,
      imagePreview: null,
      imageUrl: null,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="reward-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto focus:outline-none">
        <header className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 id="reward-modal-title" className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Award className="text-purple-600" size={28} />
            {rewardModal.isEdit ? "Edit Reward" : "Create New Reward"}
          </h3>
          <button
            onClick={closeModalAndResetForm}
            aria-label="Close modal"
            className="text-slate-500 hover:text-slate-700 focus:outline-none"
            type="button"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </header>

        <form
          className="p-6 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            saveReward();
          }}
          noValidate
        >
          {/* Image Upload */}
          <div>
            <label htmlFor="reward-image-upload" className="block text-sm font-semibold text-slate-700 mb-2">
              Reward Image (optional)
            </label>
            <div className="flex items-center space-x-4">
              <input
                id="reward-image-upload"
                type="file"
                accept="image/*"
                disabled={loading}
                onChange={handleImageUpload}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl cursor-pointer transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                aria-describedby="reward-image-help"
              />
              {(rewardForm.imagePreview || rewardForm.imageUrl) ? (
                <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200 flex-shrink-0">
                  <img
                    src={rewardForm.imagePreview ? rewardForm.imagePreview : rewardForm.imageUrl}
                    alt="Reward Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  ref={reward}
                  role="button"
                  tabIndex={0}
                  onClick={() => rewardMe()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      rewardMe();
                    }
                  }}
                  aria-label="Trigger confetti animation"
                  className="w-20 h-20 rounded-xl flex items-center justify-center bg-slate-100 text-slate-400 text-4xl select-none cursor-pointer"
                  style={{ outline: "none" }}
                >
                  <Award />
                </div>
              )}
            </div>
            <p id="reward-image-help" className="text-xs text-slate-400 mt-1">
              You can skip uploading an image. A default icon will be used.
            </p>
          </div>
 {/* Buttons */}
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
              aria-busy={loading}
            >
              {loading ? (
                <span
                  className="inline-block h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                  role="status"
                  aria-label="Loading"
                />
              ) : (
                <>
                  <Award size={20} />
                  {rewardModal.isEdit ? "Update" : "Create"} Reward
                </>
              )}
            </button>
            <button
              type="button"
              onClick={closeModalAndResetForm}
              disabled={loading}
              className={`flex-1 bg-slate-200 text-slate-700 py-4 px-6 rounded-xl hover:bg-slate-300 transition-all duration-200 font-medium ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}