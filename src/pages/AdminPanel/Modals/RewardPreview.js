import { Edit3, X } from "lucide-react";

export default function RewardPreview({
  rewardPreview,
  setRewardPreview,
  setRewardModal,
  setRewardForm,
}) {
  if (!rewardPreview.reward) return null;

  const reward = rewardPreview.reward;

  const handleEdit = () => {
    setRewardForm({
      name: reward.name,
      description: reward.description,
      cost: reward.cost,
      stock: reward.stock,
      category: reward.category,
      imagePreview: reward.imageUrl,
    });
    setRewardModal({ visible: true, reward, isEdit: true });
    setRewardPreview({ visible: false, reward: null });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="relative">
          <img
            src={reward.imageUrl}
            alt={reward.name}
            className="w-full h-64 object-cover rounded-t-2xl"
          />
          <button
            onClick={() => setRewardPreview({ visible: false, reward: null })}
            className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-full hover:bg-white transition-all duration-200 shadow-lg"
            aria-label="Close Preview"
          >
            <X size={20} />
          </button>
          <div className="absolute bottom-4 left-4">
            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-slate-700 text-sm font-medium rounded-full">
              {reward.category}
            </span>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-2xl font-bold text-slate-800 mb-2">{reward.name}</h3>
          <p className="text-slate-600 leading-relaxed mb-4">{reward.description}</p>

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-purple-600">{reward.cost}</span>
              <span className="text-slate-500 font-medium">points</span>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                reward.stock > 10
                  ? "bg-emerald-100 text-emerald-800"
                  : reward.stock > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {reward.stock > 0 ? `${reward.stock} in stock` : "Out of stock"}
            </span>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-500">Popularity</span>
              <span className="text-sm font-bold text-slate-700">{reward.popularity}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="h-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${reward.popularity}%` }}
              ></div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={handleEdit}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium flex items-center justify-center gap-2"
            >
              <Edit3 size={18} />
              Edit Reward
            </button>
            <button
              onClick={() => setRewardPreview({ visible: false, reward: null })}
              className="flex-1 bg-slate-200 text-slate-700 py-3 px-4 rounded-xl hover:bg-slate-300 transition-all duration-200 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
