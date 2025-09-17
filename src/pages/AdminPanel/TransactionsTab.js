import React, { useCallback, useMemo, useState } from "react";

export default function TransactionsTab({
  transactions,
  users,
  formatTimestamp,
  isDark, // Add isDark prop for theme support
}) {
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterType, setFilterType] = useState("all");

  const getUserEmail = useCallback(
    (userId) => {
      const user = users.find((u) => u.id === userId);
      return user ? user.email : "Unknown User";
    },
    [users]
  );

  const capitalizeWords = (str) =>
    str
      ? str.replace(/\_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "";

  const filteredSortedTransactions = useMemo(() => {
    let filtered = transactions;

    if (filterType === "awarded") {
      filtered = transactions.filter(
        (t) => !["points_redeemed", "redemption", "spent"].includes(t.type)
      );
    } else if (filterType === "redeemed") {
      filtered = transactions.filter((t) =>
        ["points_redeemed", "redemption", "spent"].includes(t.type)
      );
    }

    return filtered.sort((a, b) => {
      const aTime = a.timestamp?.seconds ?? 0;
      const bTime = b.timestamp?.seconds ?? 0;
      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });
  }, [transactions, filterType, sortOrder]);

  return (
    <div className={`space-y-6 ${isDark ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"}`}>
      <div>
        <h2 className={`text-xl font-bold ${isDark ? "text-gray-100" : "text-slate-800"}`}>Transaction History</h2>
        <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
          Track all point transactions and rewards
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <label className={`mr-2 text-sm font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Filter:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`text-sm border rounded-md px-2 py-1 ${isDark ? "border-gray-600 bg-gray-800 text-gray-200" : "border-slate-300 bg-white text-slate-900"}`}
          >
            <option value="all">All</option>
            <option value="awarded">Points Awarded</option>
            <option value="redeemed">Points Redeemed</option>
          </select>
        </div>

        <div>
          <label className={`mr-2 text-sm font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Sort by:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className={`text-sm border rounded-md px-2 py-1 ${isDark ? "border-gray-600 bg-gray-800 text-gray-200" : "border-slate-300 bg-white text-slate-900"}`}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl shadow-sm border overflow-hidden ${isDark ? "border-gray-700 bg-gray-800" : "border-slate-200 bg-white"}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className={isDark ? "bg-gray-700" : "bg-slate-50"}>
              <tr>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-300" : "text-slate-600"}`}>Date</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-300" : "text-slate-600"}`}>Type</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-300" : "text-slate-600"}`}>User Email</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-300" : "text-slate-600"}`}>Amount</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-300" : "text-slate-600"}`}>Description</th>
              </tr>
            </thead>
            <tbody className={`${isDark ? "divide-gray-600" : "divide-slate-200"} divide-y`}>
              {filteredSortedTransactions.length === 0 ? (
                <tr key="no-transactions">
                  <td colSpan={5} className={`px-6 py-4 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredSortedTransactions.map((transaction) => {
                  const typeStr = capitalizeWords(transaction.type);
                  const userEmail = getUserEmail(transaction.userId);

                  const isRedeemed = ["points_redeemed", "redemption", "spent"].includes(transaction.type);
                  const isAwarded = !isRedeemed;

                  const rawAmount =
                    typeof transaction.points === "number"
                      ? transaction.points
                      : typeof transaction.pointCost === "number"
                      ? transaction.pointCost
                      : 0;

                  const amount = Math.abs(rawAmount);

                  const description =
                    transaction.description ||
                    transaction.rewardName ||
                    (isRedeemed ? "Points Redeemed" : "Points Awarded");

                  const badgeClass = isAwarded
                    ? (isDark ? "bg-emerald-800 text-emerald-300" : "bg-emerald-100 text-emerald-800")
                    : (isDark ? "bg-red-800 text-red-400" : "bg-red-100 text-red-800");

                  return (
                    <tr
                      key={transaction.id}
                      className={`hover:${isDark ? "bg-gray-700" : "bg-slate-50"} transition-colors`}
                    >
                      <td className={`px-6 py-4 text-sm ${isDark ? "text-gray-300" : "text-slate-600"}`}>
                        {formatTimestamp(transaction.timestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${badgeClass}`}
                        >
                          {typeStr}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                        {userEmail}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm font-bold ${
                          isAwarded
                            ? isDark
                              ? "text-emerald-400"
                              : "text-emerald-600"
                            : isDark
                            ? "text-red-400"
                            : "text-red-600"
                        }`}
                      >
                        {amount.toLocaleString()} pts
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                        {description}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
