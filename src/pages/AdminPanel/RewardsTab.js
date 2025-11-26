import React, { useState, useRef, useMemo } from "react";
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
  Filter,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

export default function RewardsTab({
  rewards = [
    {
      id: 1,
      name: "Premium Coffee Mug",
      description: "High-quality ceramic mug with company logo, perfect for your morning coffee or tea.",
      cost: 150,
      stock: 25,
      category: "merchandise",
      imageUrl: null,
      popularity: 85
    },
  ],
  searchTerm = "",
  setSearchTerm = () => {},
  categoryFilter = "all",
  setCategoryFilter = () => {},
  stockFilter = "all",
  setStockFilter = () => {},
  setRewardModal = () => {},
  setRewardPreview = () => {},
  deleteReward = () => {},
  rewardForm = {},
  setRewardForm = () => {},
  loading = false,
  showToast = () => {},
  isDark = false
}) {
  const [showFilters, setShowFilters] = useState(false);
  const scrollRef = useRef(null);

  const activeRewards = rewards.length > 0 ? rewards : [
    {
      id: 1,
      name: "Premium Coffee Mug",
      description: "High-quality ceramic mug with company logo, perfect for your morning coffee or tea.",
      cost: 150,
      stock: 25,
      category: "merchandise",
      imageUrl: null,
      popularity: 85
    },
  ];

  const categories = [...new Set(activeRewards.map((r) => r.category))];

  const filteredRewards = useMemo(() => {
    let filtered = activeRewards;

    if (searchTerm) {
      filtered = filtered.filter(reward =>
        reward.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reward.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(reward => reward.category === categoryFilter);
    }

    if (stockFilter !== 'all') {
      filtered = filtered.filter(reward => {
        if (stockFilter === 'in-stock') return reward.stock > 5;
        if (stockFilter === 'low-stock') return reward.stock > 0 && reward.stock <= 5;
        if (stockFilter === 'out-of-stock') return reward.stock === 0;
        return true;
      });
    }

    return filtered;
  }, [activeRewards, searchTerm, categoryFilter, stockFilter]);

  const getStockColor = (stock) => {
    if (stock === 0) return isDark ? 'text-red-400 bg-red-900/30' : 'text-red-700 bg-red-50';
    if (stock <= 5) return isDark ? 'text-amber-400 bg-amber-900/30' : 'text-amber-700 bg-amber-50';
    return isDark ? 'text-emerald-400 bg-emerald-900/30' : 'text-emerald-700 bg-emerald-50';
  };

  const getStockIcon = (stock) => {
    if (stock === 0) return <AlertTriangle size={14} />;
    if (stock <= 5) return <TrendingUp size={14} />;
    return <CheckCircle size={14} />;
  };

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
        } text-6xl flex items-center justify-center select-none cursor-pointer transition-colors hover:text-purple-500`}
        style={{ outline: "none" }}
      >
        <Award aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`sticky top-0 z-10 ${isDark ? 'bg-gray-900/95 border-gray-700' : 'bg-white/95 border-slate-200'} backdrop-blur-md border-b`}>
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 mb-1">
            <h2 className={`text-2xl font-bold ${isDark ? "text-gray-100" : "text-slate-800"}`}>
              Rewards Management
            </h2>
          </div>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div>
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-purple-900/50' : 'bg-purple-100'}`}>
                <Award className={isDark ? "text-purple-400" : "text-purple-600"} size={24} />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                  Rewards
                </h3>
                <p className={`text-xs ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                  {filteredRewards.length} of {activeRewards.length} items
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setRewardForm({
                  name: "",
                  description: "",
                  cost: "",
                  stock: "",
                  category: "general",
                  imagePreview: null,
                  imageFile: null,
                  imageUrl: null,
                });
                setRewardModal({ visible: true, reward: null, isEdit: false });
              }}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg font-medium flex items-center gap-2 text-sm"
              type="button"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Reward</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                isDark ? "text-gray-400" : "text-slate-400"
              }`}
              size={18}
            />
            <input
              type="text"
              placeholder="Search rewards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-sm ${
                isDark
                  ? "border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-400"
                  : "border-slate-300 bg-white text-slate-900 placeholder-slate-400"
              }`}
              aria-label="Search rewards"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-all duration-200 ${
                showFilters 
                  ? isDark ? 'text-purple-400 bg-purple-900/30' : 'text-purple-600 bg-purple-100'
                  : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label="Toggle filters"
              type="button"
            >
              <Filter size={16} />
            </button>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className={`mb-3 p-4 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-200'} space-y-3`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    Category
                  </label>
                  <div className="relative">
                    <Tag className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? "text-gray-400" : "text-slate-400"}`} size={16} />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className={`w-full pl-10 pr-8 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${
                        isDark
                          ? "border-gray-600 bg-gray-700 text-gray-200"
                          : "border-slate-300 bg-white text-slate-900"
                      }`}
                      aria-label="Filter by category"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    Stock Status
                  </label>
                  <div className="relative">
                    <Package className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? "text-gray-400" : "text-slate-400"}`} size={16} />
                    <select
                      value={stockFilter}
                      onChange={(e) => setStockFilter(e.target.value)}
                      className={`w-full pl-10 pr-8 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${
                        isDark
                          ? "border-gray-600 bg-gray-700 text-gray-200"
                          : "border-slate-300 bg-white text-slate-900"
                      }`}
                      aria-label="Filter by stock status"
                    >
                      <option value="all">All Stock</option>
                      <option value="in-stock">In Stock (6+)</option>
                      <option value="low-stock">Low Stock (1-5)</option>
                      <option value="out-of-stock">Out of Stock</option>
                    </select>
                  </div>
                </div>
              </div>

              {(searchTerm || categoryFilter !== "all" || stockFilter !== "all") && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCategoryFilter("all");
                      setStockFilter("all");
                    }}
                    className={`text-xs font-medium flex items-center gap-1 px-3 py-1 rounded-lg transition-all duration-200 ${
                      isDark 
                        ? "text-purple-400 hover:text-purple-300 hover:bg-purple-900/20" 
                        : "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    }`}
                    aria-label="Clear filters"
                    type="button"
                  >
                    <X size={12} />
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4" ref={scrollRef}>
        {/* Stock Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { 
              label: 'In Stock', 
              count: activeRewards.filter(r => r.stock > 5).length,
              color: isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700',
              icon: <CheckCircle size={16} />
            },
            { 
              label: 'Low Stock', 
              count: activeRewards.filter(r => r.stock > 0 && r.stock <= 5).length,
              color: isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-700',
              icon: <TrendingUp size={16} />
            },
            { 
              label: 'Out of Stock', 
              count: activeRewards.filter(r => r.stock === 0).length,
              color: isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700',
              icon: <AlertTriangle size={16} />
            }
          ].map((stat, idx) => (
            <div key={idx} className={`p-4 rounded-xl border ${isDark ? 'border-gray-700' : 'border-slate-200'} ${stat.color}`}>
              <div className="flex items-center gap-2 mb-1">
                {stat.icon}
                <span className="font-bold text-lg">{stat.count}</span>
              </div>
              <p className="text-xs opacity-90">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Rewards Grid */}
        {filteredRewards.length === 0 ? (
          <div className="text-center py-16">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isDark ? "bg-purple-900/30" : "bg-gradient-to-br from-purple-100 to-indigo-100"
              }`}
            >
              <Award className={isDark ? "text-purple-400" : "text-purple-500"} size={32} />
            </div>
            <h3
              className={`text-lg font-medium mb-2 ${
                isDark ? "text-gray-100" : "text-slate-800"
              }`}
            >
              {searchTerm || categoryFilter !== "all" || stockFilter !== "all"
                ? "No rewards match your filters"
                : "No rewards found"}
            </h3>
            <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              {searchTerm || categoryFilter !== "all" || stockFilter !== "all"
                ? "Try adjusting your search criteria"
                : "Create your first reward to get started"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    <div className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full backdrop-blur-sm ${getStockColor(reward.stock)}`}>
                      {getStockIcon(reward.stock)}
                      <span>
                        {reward.stock > 0 ? `${reward.stock} left` : "Out of stock"}
                      </span>
                    </div>
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
    </div>
  );
}