import React, { useCallback, useMemo, useState } from "react";

export default function TransactionsTab({
  transactions,
  users,
  formatTimestamp,
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
      ? str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "";

  const filteredSortedTransactions = useMemo(() => {
    let filtered = transactions;

    if (filterType === "awarded") {
      filtered = transactions.filter((t) => !["points_redeemed", "redemption", "spent"].includes(t.type));
    } else if (filterType === "redeemed") {
      filtered = transactions.filter((t) => ["points_redeemed", "redemption", "spent"].includes(t.type));
    }

    return filtered.sort((a, b) => {
      const aTime = a.timestamp?.seconds ?? 0;
      const bTime = b.timestamp?.seconds ?? 0;
      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });
  }, [transactions, filterType, sortOrder]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Transaction History</h2>
        <p className="text-slate-500 text-sm mb-4">Track all point transactions and rewards</p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <label className="mr-2 text-sm font-medium text-slate-700">Filter:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-2 py-1"
          >
            <option value="all">All</option>
            <option value="awarded">Points Awarded</option>
            <option value="redeemed">Points Redeemed</option>
          </select>
        </div>

        <div>
          <label className="mr-2 text-sm font-medium text-slate-700">Sort by:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-2 py-1"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">User Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSortedTransactions.length === 0 ? (
                <tr key="no-transactions">
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredSortedTransactions.map((transaction) => {
                  const typeStr = capitalizeWords(transaction.type);
                  const userEmail = getUserEmail(transaction.userId);

                  const isRedeemed = ["points_redeemed", "redemption", "spent"].includes(transaction.type);
                  const isAwarded = !isRedeemed;

                  const rawAmount = typeof transaction.points === "number"
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
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800";

                  return (
                    <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatTimestamp(transaction.timestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${badgeClass}`}>
                          {typeStr}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">
                        {userEmail}
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold ${isAwarded ? "text-emerald-600" : "text-red-600"}`}>
                        {amount.toLocaleString()} pts
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{description}</td>
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
