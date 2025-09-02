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
  isDark, // Added prop for theme
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
        className={`${
          isDark ? "text-gray-400" : "text-slate-400"
        } text-6xl flex items-center justify-center select-none cursor-pointer`}
        style={{ outline: "none" }}
      >
        <Award aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Add button */}
      <div
        className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-xl p-6 border ${
          isDark
            ? "bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border-gray-700"
            : "bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-100"
        }`}
      >
        <div>
          <h2
            className={`text-2xl font-bold flex items-center gap-3 ${
              isDark ? "text-gray-100" : "text-slate-800"
            }`}
          >
            <Award className={isDark ? "text-purple-400" : "text-purple-600"} size={28} />
            Rewards Management
          </h2>
          <p
            className={`${
              isDark ? "text-gray-400" : "text-slate-600"
            } text-sm mt-1`}
          >
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
      <div
        className={`rounded-xl shadow-sm border p-6 ${
          isDark
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                isDark ? "text-gray-400" : "text-slate-400"
              }`}
              size={20}
            />
            <input
              type="text"
              placeholder="Search rewards by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${
                isDark
                  ? "border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400"
                  : "border-slate-300 bg-white text-slate-900 placeholder-slate-400"
              }`}
              aria-label="Search rewards"
            />
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <Tag className={isDark ? "text-gray-400" : "text-slate-400"} size={20} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${
                isDark
                  ? "border-gray-600 bg-gray-700 text-gray-200"
                  : "border-slate-300 bg-white text-slate-900"
              }`}
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
            <Package className={isDark ? "text-gray-400" : "text-slate-400"} size={20} />
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className={`px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${
                isDark
                  ? "border-gray-600 bg-gray-700 text-gray-200"
                  : "border-slate-300 bg-white text-slate-900"
              }`}
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
        <div
          className={`mt-4 flex items-center justify-between text-sm ${
            isDark ? "text-gray-400" : "text-slate-600"
          }`}
        >
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
              className={`font-medium flex items-center gap-1 ${
                isDark ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-700"
              }`}
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
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
              isDark ? "bg-purple-900" : "bg-gradient-to-br from-purple-100 to-indigo-100"
            }`}
          >
            <Award className={isDark ? "text-purple-400" : "text-purple-500"} size={40} />
          </div>
          <h3
            className={`text-xl font-medium mb-2 ${
              isDark ? "text-gray-100" : "text-slate-800"
            }`}
          >
            {searchTerm || categoryFilter !== "all" || stockFilter !== "all"
              ? "No rewards match your filters"
              : "No rewards found"}
          </h3>
          <p className={isDark ? "text-gray-400 mb-6" : "text-slate-500 mb-6"}>
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
              className={`group rounded-2xl shadow-sm border overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
                isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
              }`}
            >
              {/* Image container */}
              <div
                className={`relative h-48 overflow-hidden flex items-center justify-center cursor-pointer ${
                  isDark ? "bg-gradient-to-br from-gray-700 to-gray-800" : "bg-gradient-to-br from-slate-100 to-slate-200"
                }`}
                aria-label={reward.name}
              >
                {reward.imageUrl ? (
                  <img
                    src={reward.imageUrl}
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
                      className={`p-2 rounded-lg transition-all duration-200 shadow-lg ${
                        isDark
                          ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                          : "bg-white text-slate-700 hover:bg-white"
                      }`}
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
                      className={`p-2 rounded-lg transition-all duration-200 shadow-lg ${
                        isDark
                          ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                          : "bg-white text-slate-700 hover:bg-white"
                      }`}
                      aria-label={`Edit reward ${reward.name}`}
                      type="button"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => deleteReward(reward.id)}
                      className="p-2 rounded-lg transition-all duration-200 shadow-lg text-red-600 hover:bg-red-50"
                      aria-label={`Delete reward ${reward.name}`}
                      type="button"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Category badge */}
                <div className="absolute top-3 left-3">
                  <span
                    className={`px-3 py-1 rounded-full capitalize text-xs font-medium ${
                      isDark
                        ? "bg-gray-700 bg-opacity-90 text-gray-200 backdrop-blur-sm"
                        : "bg-white/90 text-slate-700 backdrop-blur-sm"
                    }`}
                  >
                    {reward.category}
                  </span>
                </div>

                {/* Stock status */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      reward.stock > 10
                        ? isDark
                          ? "bg-emerald-800 text-emerald-300"
                          : "bg-emerald-100 text-emerald-800"
                        : reward.stock > 0
                        ? isDark
                          ? "bg-amber-800 text-amber-300"
                          : "bg-amber-100 text-amber-800"
                        : isDark
                        ? "bg-red-800 text-red-400"
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
                  <h3
                    className={`font-bold text-lg leading-tight truncate transition-colors duration-200 group-hover:text-purple-500 ${
                      isDark ? "text-gray-100" : "text-slate-800"
                    }`}
                  >
                    {reward.name}
                  </h3>
                </div>

                <p
                  className={`text-sm mb-4 leading-relaxed line-clamp-2 ${
                    isDark ? "text-gray-400" : "text-slate-600"
                  }`}
                >
                  {reward.description}
                </p>

                {/* Popularity bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-xs font-medium ${
                        isDark ? "text-gray-500" : "text-slate-500"
                      }`}
                    >
                      Popularity
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        isDark ? "text-gray-100" : "text-slate-700"
                      }`}
                    >
                      {reward.popularity}%
                    </span>
                  </div>
                  <div
                    className={`w-full rounded-full h-2 ${
                      isDark ? "bg-gray-700" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className="h-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${reward.popularity}%` }}
                    />
                  </div>
                </div>

                {/* Cost and actions */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-2xl font-bold ${
                        isDark ? "text-purple-400" : "text-purple-600"
                      }`}
                    >
                      {reward.cost}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        isDark ? "text-gray-400" : "text-slate-500"
                      }`}
                    >
                      points
                    </span>
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
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        isDark
                          ? "text-gray-300 hover:text-blue-400 hover:bg-blue-900"
                          : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                      }`}
                      aria-label={`Edit reward ${reward.name}`}
                      type="button"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => deleteReward(reward.id)}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        isDark
                          ? "text-red-500 hover:text-red-400 hover:bg-red-900"
                          : "text-slate-500 hover:text-red-600 hover:bg-red-50"
                      }`}
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
