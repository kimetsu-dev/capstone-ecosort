export default function PointsModal({
  pointsModal,
  setPointsModal,
  pointsForm,
  setPointsForm,
  users,
  setUsers,
  transactions,
  setTransactions,
  showToast,
}) {
  const handleAwardPoints = () => {
    const amount = parseInt(pointsForm.amount);
    if (!amount || amount <= 0) {
      showToast("Please enter a valid positive amount", "error");
      return;
    }

    if (!pointsForm.reason.trim()) {
      showToast("Please enter a reason for awarding points", "error");
      return;
    }

    const newTotal = (pointsModal.user.totalPoints || 0) + amount;

    setUsers((prev) =>
      prev.map((u) =>
        u.id === pointsModal.user.id ? { ...u, totalPoints: newTotal } : u
      )
    );

    const newTransaction = {
      id: `trans_${Date.now()}`,
      type: "points_awarded",
      userName: pointsModal.user.email,
      amount: amount,
      reason: pointsForm.reason,
      timestamp: { seconds: Date.now() / 1000 },
    };

    setTransactions((prev) => [newTransaction, ...prev]);

    setPointsModal({ visible: false, user: null });
    setPointsForm({ amount: "", reason: "" });
    showToast(`${amount} points awarded to ${pointsModal.user.email}`, "success");
  };

  const handleClose = () => {
    setPointsModal({ visible: false, user: null });
    setPointsForm({ amount: "", reason: "" });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-800">Award Points</h3>
          <p className="text-slate-500 text-sm mt-1">
            Give points to {pointsModal.user?.email}
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Points Amount
            </label>
            <input
              type="number"
              value={pointsForm.amount}
              onChange={(e) =>
                setPointsForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder="Enter points to award"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Reason
            </label>
            <input
              type="text"
              value={pointsForm.reason}
              onChange={(e) =>
                setPointsForm((prev) => ({ ...prev, reason: e.target.value }))
              }
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder="Reason for awarding points"
            />
          </div>
        </div>
        <div className="p-6 bg-slate-50 rounded-b-2xl flex space-x-3">
          <button
            onClick={handleAwardPoints}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-4 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 font-medium"
          >
            Award Points
          </button>
          <button
            onClick={handleClose}
            className="flex-1 bg-slate-200 text-slate-700 py-3 px-4 rounded-xl hover:bg-slate-300 transition-all duration-200 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
