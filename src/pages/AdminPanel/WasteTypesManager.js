import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function WasteTypesManager() {
  const [wasteTypes, setWasteTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWasteTypeName, setNewWasteTypeName] = useState("");
  const [newWastePoints, setNewWastePoints] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPoints, setEditPoints] = useState("");

  // Real-time snapshot of waste_types
  useEffect(() => {
    const q = query(collection(db, "waste_types"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWasteTypes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Add a new waste type
  const addWasteType = async () => {
    const nameTrimmed = newWasteTypeName.trim();
    if (!nameTrimmed || isNaN(Number(newWastePoints)) || Number(newWastePoints) < 0) {
      alert("Enter valid name and non-negative points per kilo.");
      return;
    }
    const exists = wasteTypes.some(
      (wt) => wt.name.toLowerCase() === nameTrimmed.toLowerCase()
    );
    if (exists) {
      alert("Waste type already exists.");
      return;
    }
    try {
      await addDoc(collection(db, "waste_types"), {
        name: nameTrimmed,
        pointsPerKilo: Number(newWastePoints),
      });
      setNewWasteTypeName("");
      setNewWastePoints("");
    } catch (e) {
      console.error("Failed to add waste type:", e);
      alert("Error adding waste type.");
    }
  };

  // Start editing a waste type
  const startEdit = (wt) => {
    setEditingId(wt.id);
    setEditName(wt.name);
    setEditPoints(wt.pointsPerKilo);
  };

  // Cancel editing UI
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPoints("");
  };

  // Save waste type changes
  const saveEdit = async (id) => {
    const nameTrimmed = editName.trim();
    if (!nameTrimmed || isNaN(Number(editPoints)) || Number(editPoints) < 0) {
      alert("Enter valid name and non-negative points per kilo.");
      return;
    }
    const exists = wasteTypes.some(
      (wt) => wt.id !== id && wt.name.toLowerCase() === nameTrimmed.toLowerCase()
    );
    if (exists) {
      alert("Waste type name already exists.");
      return;
    }
    try {
      const docRef = doc(db, "waste_types", id);
      await updateDoc(docRef, {
        name: nameTrimmed,
        pointsPerKilo: Number(editPoints),
      });
      cancelEdit();
    } catch (e) {
      console.error("Failed to update waste type:", e);
      alert("Error updating waste type.");
    }
  };

  // Delete a waste type
  const deleteWasteType = async (id) => {
    if (!window.confirm("Are you sure to delete this waste type?")) return;
    try {
      await deleteDoc(doc(db, "waste_types", id));
      if (editingId === id) cancelEdit();
    } catch (e) {
      console.error("Failed to delete waste type:", e);
      alert("Error deleting waste type.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="text-gray-600">Loading waste types...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Waste Types Management</h2>
        <p className="text-gray-600">Manage waste types and their points per kilogram</p>
      </div>

      {/* Add new waste type form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Waste Type</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Waste Type Name
            </label>
            <input
              type="text"
              placeholder="e.g., Plastic Bottles"
              value={newWasteTypeName}
              onChange={(e) => setNewWasteTypeName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Points per kg
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={newWastePoints}
              onChange={(e) => setNewWastePoints(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addWasteType}
              className="w-full sm:w-auto bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium"
              aria-label="Add new waste type"
            >
              Add Type
            </button>
          </div>
        </div>
      </div>

      {/* Waste types list */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Current Waste Types</h3>
          <p className="text-sm text-gray-600 mt-1">
            {wasteTypes.length} waste type{wasteTypes.length !== 1 ? 's' : ''} configured
          </p>
        </div>

        {wasteTypes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No waste types yet</h3>
            <p className="text-gray-500">Add your first waste type to get started.</p>
          </div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waste Type Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Points per kg
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {wasteTypes.map((wt) => (
                    <tr key={wt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        {editingId === wt.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            aria-label="Edit waste type name"
                          />
                        ) : (
                          <span className="text-gray-900 font-medium">{wt.name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === wt.id ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editPoints}
                            onChange={(e) => setEditPoints(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            aria-label="Edit points per kilogram"
                          />
                        ) : (
                          <span className="text-gray-900">{wt.pointsPerKilo}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center space-x-2">
                          {editingId === wt.id ? (
                            <>
                              <button
                                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm font-medium"
                                onClick={() => saveEdit(wt.id)}
                                aria-label={`Save edits for ${wt.name}`}
                              >
                                Save
                              </button>
                              <button
                                className="bg-gray-400 text-white px-3 py-1.5 rounded-lg hover:bg-gray-500 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors text-sm font-medium"
                                onClick={cancelEdit}
                                aria-label={`Cancel edits for ${wt.name}`}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors text-sm font-medium"
                                onClick={() => startEdit(wt)}
                                aria-label={`Edit ${wt.name}`}
                              >
                                Edit
                              </button>
                              <button
                                className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-sm font-medium"
                                onClick={() => deleteWasteType(wt.id)}
                                aria-label={`Delete ${wt.name}`}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden divide-y divide-gray-200">
              {wasteTypes.map((wt) => (
                <div key={wt.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Waste Type Name
                        </label>
                        {editingId === wt.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            aria-label="Edit waste type name"
                          />
                        ) : (
                          <span className="text-gray-900 font-medium">{wt.name}</span>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Points per kg
                        </label>
                        {editingId === wt.id ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editPoints}
                            onChange={(e) => setEditPoints(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            aria-label="Edit points per kilogram"
                          />
                        ) : (
                          <span className="text-gray-900">{wt.pointsPerKilo}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editingId === wt.id ? (
                      <>
                        <button
                          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm font-medium"
                          onClick={() => saveEdit(wt.id)}
                          aria-label={`Save edits for ${wt.name}`}
                        >
                          Save
                        </button>
                        <button
                          className="flex-1 bg-gray-400 text-white px-3 py-2 rounded-lg hover:bg-gray-500 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors text-sm font-medium"
                          onClick={cancelEdit}
                          aria-label={`Cancel edits for ${wt.name}`}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors text-sm font-medium"
                          onClick={() => startEdit(wt)}
                          aria-label={`Edit ${wt.name}`}
                        >
                          Edit
                        </button>
                        <button
                          className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-sm font-medium"
                          onClick={() => deleteWasteType(wt.id)}
                          aria-label={`Delete ${wt.name}`}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}