import React from "react";
import { useReward } from "react-rewards";
import {
  Search,
  Plus,
  Award,
  Edit3,
  Trash2,
  Eye,
  X,
  Tag,
  Package,
} from "lucide-react";

export default function RewardsTab({
  rewards,
  filteredRewards,
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  stockFilter,
  setStockFilter,
  setRewardModal,
  setRewardPreview,
  deleteReward,
  rewardForm,
  setRewardForm,
  loading,
  showToast,
}) {
  // Collect unique categories from rewards for filter dropdown
  const categories = [...new Set(rewards.map((r) => r.category))];

  // Component for fallback icon with confetti animation when no image is present
  function RewardFallbackIcon({ rewardId }) {
    const { reward, rewardMe } = useReward(rewardId, "confetti", {
      lifetime: 1500,
      elementCount: 30,
    });

    return (
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
        aria-label="Trigger reward confetti animation"
        className="text-slate-400 text-6xl flex items-center justify-center select-none cursor-pointer"
        style={{ outline: "none" }}
      >
        <Award aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Add button */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Award className="text-purple-600" size={28} />
            Rewards Management
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Create, manage, and track reward items for your community
          </p>
        </div>
        <button
          onClick={() => {
            setRewardForm({
              name: "",
              description: "",
              cost: "",
              stock: "",
              category: categories[0] || "general",
              imagePreview: null,
              imageFile: null,
              imageUrl: null,
            });
            setRewardModal({ visible: true, reward: null, isEdit: false });
          }}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg font-medium flex items-center gap-2"
          type="button"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-200" />
          Add New Reward
        </button>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search rewards by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              aria-label="Search rewards"
            />
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <Tag className="text-slate-400" size={20} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Stock filter */}
          <div className="flex items-center gap-2">
            <Package className="text-slate-400" size={20} />
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
              aria-label="Filter by stock status"
            >
              <option value="all">All Stock</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Filter summary and clear button */}
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            Showing {filteredRewards.length} of {rewards.length} rewards
          </span>
          {(searchTerm || categoryFilter !== "all" || stockFilter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCategoryFilter("all");
                setStockFilter("all");
              }}
              className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
              aria-label="Clear filters"
              type="button"
            >
              <X size={16} />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Rewards display grid or empty state */}
      {filteredRewards.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="text-purple-500" size={40} />
          </div>
          <h3 className="text-xl font-medium text-slate-800 mb-2">
            {searchTerm || categoryFilter !== "all" || stockFilter !== "all"
              ? "No rewards match your filters"
              : "No rewards found"}
          </h3>
          <p className="text-slate-500 mb-6">
            {searchTerm || categoryFilter !== "all" || stockFilter !== "all"
              ? "Try adjusting your search criteria or filters"
              : "Create your first reward to get started"}
          </p>
          {!searchTerm && categoryFilter === "all" && stockFilter === "all" && (
            <button
              onClick={() => {
                setRewardForm({
                  name: "",
                  description: "",
                  cost: "",
                  stock: "",
                  category: categories[0] || "general",
                  imagePreview: null,
                  imageFile: null,
                  imageUrl: null,
                });
                setRewardModal({ visible: true, reward: null, isEdit: false });
              }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg font-medium"
              type="button"
            >
              Create First Reward
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRewards.map((reward) => (
            <div
              key={reward.id}
              className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Image container */}
              <div
                className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center cursor-pointer"
                aria-label={reward.name}
              >
                {reward.imageUrl ? (
                  <img
                    src={reward.imageUrl} // Use permanent Firebase Storage URL here
                    alt={reward.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <RewardFallbackIcon rewardId={`reward-${reward.id}`} />
                )}

                {/* Overlay actions on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setRewardPreview({ visible: true, reward })}
                      className="p-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg hover:bg-white transition-all duration-200 shadow-lg"
                      aria-label={`Preview reward ${reward.name}`}
                      type="button"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setRewardForm({
                          name: reward.name,
                          description: reward.description,
                          cost: reward.cost,
                          stock: reward.stock,
                          category: reward.category,
                          imagePreview: reward.imageUrl || null,
                          imageFile: null,
                          imageUrl: reward.imageUrl || null,
                        });
                        setRewardModal({ visible: true, reward, isEdit: true });
                      }}
                      className="p-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg hover:bg-white transition-all duration-200 shadow-lg"
                      aria-label={`Edit reward ${reward.name}`}
                      type="button"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => deleteReward(reward.id)}
                      className="p-2 bg-white/90 backdrop-blur-sm text-red-600 rounded-lg hover:bg-white transition-all duration-200 shadow-lg"
                      aria-label={`Delete reward ${reward.name}`}
                      type="button"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Category badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-medium rounded-full capitalize">
                    {reward.category}
                  </span>
                </div>

                {/* Stock status */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      reward.stock > 10
                        ? "bg-emerald-100 text-emerald-800"
                        : reward.stock > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {reward.stock > 0 ? `${reward.stock} left` : "Out of stock"}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-purple-600 transition-colors duration-200 truncate">
                    {reward.name}
                  </h3>
                </div>

                <p className="text-slate-600 text-sm mb-4 leading-relaxed line-clamp-2">
                  {reward.description}
                </p>

                {/* Popularity bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-slate-500">Popularity</span>
                    <span className="text-xs font-bold text-slate-700">{reward.popularity}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="h-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${reward.popularity}%` }}
                    />
                  </div>
                </div>

                {/* Cost and actions */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-purple-600">{reward.cost}</span>
                    <span className="text-sm text-slate-500 font-medium">points</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setRewardForm({
                          name: reward.name,
                          description: reward.description,
                          cost: reward.cost,
                          stock: reward.stock,
                          category: reward.category,
                          imagePreview: reward.imageUrl || null,
                          imageFile: null,
                          imageUrl: reward.imageUrl || null,
                        });
                        setRewardModal({ visible: true, reward, isEdit: true });
                      }}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      aria-label={`Edit reward ${reward.name}`}
                      type="button"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => deleteReward(reward.id)}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                      aria-label={`Delete reward ${reward.name}`}
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
