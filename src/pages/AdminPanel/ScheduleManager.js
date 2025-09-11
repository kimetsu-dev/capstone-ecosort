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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiMapPin,
  FiClock,
  FiCalendar,
} from "react-icons/fi";

export default function ScheduleManager({ isDark, showToast }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDay, setFilterDay] = useState("all");

  const [formData, setFormData] = useState({
    area: "",
    barangay: "",
    day: "monday",
    startTime: "08:00",
    endTime: "10:00",
    frequency: "weekly",
    wasteTypes: [],
    notes: "",
    isActive: true,
  });

  const daysOfWeek = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const wasteTypeOptions = [
    "Biodegradable",
    "Non-biodegradable",
    "Recyclable",
    "Hazardous",
    "Electronic",
  ];

  const frequencyOptions = [
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Bi-weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  useEffect(() => {
    const schedulesRef = collection(db, "collection_schedules");
    const schedulesQuery = query(schedulesRef, orderBy("area"));

    const unsubscribe = onSnapshot(
      schedulesQuery,
      (snapshot) => {
        const schedulesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSchedules(schedulesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching schedules:", error);
        showToast?.("Failed to fetch schedules", "error");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [showToast]);

  const resetForm = () => {
    setFormData({
      area: "",
      barangay: "",
      day: "monday",
      startTime: "08:00",
      endTime: "10:00",
      frequency: "weekly",
      wasteTypes: [],
      notes: "",
      isActive: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const scheduleData = {
        ...formData,
        updatedAt: serverTimestamp(),
      };

      if (editingSchedule) {
        await updateDoc(
          doc(db, "collection_schedules", editingSchedule.id),
          scheduleData
        );
        showToast?.("Schedule updated successfully", "success");
      } else {
        await addDoc(collection(db, "collection_schedules"), {
          ...scheduleData,
          createdAt: serverTimestamp(),
        });
        showToast?.("Schedule created successfully", "success");
      }

      setShowModal(false);
      setEditingSchedule(null);
      resetForm();
    } catch (error) {
      console.error("Error saving schedule:", error);
      showToast?.("Failed to save schedule", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      area: schedule.area || "",
      barangay: schedule.barangay || "",
      day: schedule.day || "monday",
      startTime: schedule.startTime || "08:00",
      endTime: schedule.endTime || "10:00",
      frequency: schedule.frequency || "weekly",
      wasteTypes: schedule.wasteTypes || [],
      notes: schedule.notes || "",
      isActive: schedule.isActive !== undefined ? schedule.isActive : true,
    });
    setShowModal(true);
  };

  const handleDelete = async (scheduleId) => {
    if (!window.confirm("Are you sure you want to delete this schedule?"))
      return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, "collection_schedules", scheduleId));
      showToast?.("Schedule deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting schedule:", error);
      showToast?.("Failed to delete schedule", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleScheduleStatus = async (schedule) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "collection_schedules", schedule.id), {
        isActive: !schedule.isActive,
        updatedAt: serverTimestamp(),
      });
      showToast?.(
        `Schedule ${!schedule.isActive ? "activated" : "deactivated"}`,
        "success"
      );
    } catch (error) {
      console.error("Error updating schedule status:", error);
      showToast?.("Failed to update schedule status", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleWasteTypeChange = (wasteType) => {
    setFormData((prev) => ({
      ...prev,
      wasteTypes: prev.wasteTypes.includes(wasteType)
        ? prev.wasteTypes.filter((type) => type !== wasteType)
        : [...prev.wasteTypes, wasteType],
    }));
  };

  const filteredSchedules = schedules.filter((schedule) => {
    const matchesSearch =
      schedule.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.barangay?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDay = filterDay === "all" || schedule.day === filterDay;

    return matchesSearch && matchesDay;
  });

  const formatTime = (time) => {
    try {
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return time;
    }
  };

  const formatTimeRange = (start, end) => {
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2
            className={`text-lg lg:text-2xl font-bold ${
              isDark ? "text-gray-100" : "text-slate-800"
            }`}
          >
            Collection Schedules
          </h2>
          <p
            className={`text-sm lg:text-base ${
              isDark ? "text-gray-400" : "text-slate-600"
            }`}
          >
            Manage garbage collection schedules for different areas
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingSchedule(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          Add Schedule
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <input
            type="text"
            placeholder="Search by area or barangay..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border text-sm ${
              isDark
                ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                : "bg-white border-slate-300 text-slate-900 placeholder-slate-500"
            }`}
          />
        </div>
        <div>
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border text-sm ${
              isDark
                ? "bg-gray-700 border-gray-600 text-gray-200"
                : "bg-white border-slate-300 text-slate-900"
            }`}
          >
            <option value="all">All Days</option>
            {daysOfWeek.map((day) => (
              <option key={day} value={day}>
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-slate-600">Loading schedules...</span>
        </div>
      )}

      {/* Schedules List */}
      {!loading && (
        <div className="space-y-4">
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <FiCalendar className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No schedules found
              </h3>
              <p className="text-slate-500">
                {searchTerm || filterDay !== "all"
                  ? "No schedules match your filters"
                  : "Create your first collection schedule"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`rounded-lg p-4 shadow-sm border ${
                    isDark
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-slate-200"
                  } ${!schedule.isActive ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3
                        className={`font-semibold ${
                          isDark ? "text-gray-100" : "text-slate-900"
                        }`}
                      >
                        {schedule.area}
                      </h3>
                      {schedule.barangay && (
                        <p
                          className={`text-sm ${
                            isDark ? "text-gray-400" : "text-slate-600"
                          }`}
                        >
                          {schedule.barangay}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        schedule.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {schedule.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <FiCalendar className="w-4 h-4 text-indigo-500" />
                      <span
                        className={isDark ? "text-gray-300" : "text-slate-700"}
                      >
                        {schedule.day?.charAt(0).toUpperCase() +
                          schedule.day?.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FiClock className="w-3 h-3 text-gray-500" />
                      <span
                        className={`text-xs ${
                          isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {formatTimeRange(schedule.startTime, schedule.endTime)} •{" "}
                        {schedule.frequency}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FiMapPin className="w-4 h-4 text-indigo-500" />
                      <span
                        className={isDark ? "text-gray-300" : "text-slate-700"}
                      >
                        {schedule.frequency}
                      </span>
                    </div>
                  </div>

                  {schedule.wasteTypes && schedule.wasteTypes.length > 0 && (
                    <div className="mb-4">
                      <p
                        className={`text-xs font-medium mb-2 ${
                          isDark ? "text-gray-400" : "text-slate-600"
                        }`}
                      >
                        Waste Types:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {schedule.wasteTypes.map((type, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {schedule.notes && (
                    <p
                      className={`text-xs mb-4 ${
                        isDark ? "text-gray-400" : "text-slate-600"
                      }`}
                    >
                      {schedule.notes}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <FiEdit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleScheduleStatus(schedule)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        schedule.isActive
                          ? "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                          : "bg-green-50 text-green-600 hover:bg-green-100"
                      }`}
                    >
                      {schedule.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div
            className={`w-full max-w-md rounded-lg shadow-lg ${
              isDark ? "bg-gray-800" : "bg-white"
            } max-h-[90vh] overflow-y-auto`}
          >
            <div className="p-6">
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDark ? "text-gray-100" : "text-slate-900"
                }`}
              >
                {editingSchedule ? "Edit Schedule" : "Add New Schedule"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        isDark ? "text-gray-300" : "text-slate-700"
                      }`}
                    >
                      Area *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.area}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, area: e.target.value }))
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-gray-200"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                      placeholder="Enter area name"
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        isDark ? "text-gray-300" : "text-slate-700"
                      }`}
                    >
                      Barangay
                    </label>
                    <input
                      type="text"
                      value={formData.barangay}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          barangay: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-gray-200"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                      placeholder="Enter barangay"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        isDark ? "text-gray-300" : "text-slate-700"
                      }`}
                    >
                      Day *
                    </label>
                    <select
                      required
                      value={formData.day}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, day: e.target.value }))
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-gray-200"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                    >
                      {daysOfWeek.map((day) => (
                        <option key={day} value={day}>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        isDark ? "text-gray-300" : "text-slate-700"
                      }`}
                    >
                      Frequency *
                    </label>
                    <select
                      required
                      value={formData.frequency}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          frequency: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-gray-200"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                    >
                      {frequencyOptions.map((freq) => (
                        <option key={freq.value} value={freq.value}>
                          {freq.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        isDark ? "text-gray-300" : "text-slate-700"
                      }`}
                    >
                      Start Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          startTime: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-gray-200"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        isDark ? "text-gray-300" : "text-slate-700"
                      }`}
                    >
                      End Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          endTime: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-gray-200"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                    />
                  </div>
                </div>

                {/* Waste Types */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-slate-700"
                    }`}
                  >
                    Waste Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {wasteTypeOptions.map((type) => (
                      <label
                        key={type}
                        className={`px-3 py-1 rounded-lg text-sm cursor-pointer border ${
                          formData.wasteTypes.includes(type)
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : isDark
                            ? "bg-gray-700 border-gray-600 text-gray-300"
                            : "bg-white border-slate-300 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.wasteTypes.includes(type)}
                          onChange={() => handleWasteTypeChange(type)}
                          className="hidden"
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      isDark ? "text-gray-300" : "text-slate-700"
                    }`}
                  >
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-gray-200"
                        : "bg-white border-slate-300 text-slate-900"
                    }`}
                    rows="2"
                    placeholder="Additional information..."
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingSchedule(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : editingSchedule ? "Update" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
