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
  FiUsers,
} from "react-icons/fi";
import { Scale, Recycle, AlertCircle, Truck } from "lucide-react";

export default function ScheduleManager({ isDark, showToast }) {
  const [activeTab, setActiveTab] = useState("collection");
  const [collectionSchedules, setCollectionSchedules] = useState([]);
  const [submissionSchedules, setSubmissionSchedules] = useState([]);
  const [wasteTypes, setWasteTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDay, setFilterDay] = useState("all");
  const [filterWasteType, setFilterWasteType] = useState("all");

  const [collectionFormData, setCollectionFormData] = useState({
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
 
  const [submissionFormData, setSubmissionFormData] = useState({
    area: "",
    barangay: "",
    day: "monday",
    startTime: "08:00",
    endTime: "17:00",
    allowedWasteTypes: [],
    maxSubmissionsPerDay: 50,
    requiresAppointment: false,
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

  


  // Fetch waste types
  useEffect(() => {
    const wasteTypesRef = collection(db, "waste_types");
    const unsubscribe = onSnapshot(
      wasteTypesRef,
      (snapshot) => {
        const types = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          pointsPerKilo: doc.data().pointsPerKilo || 0,
        }));
        setWasteTypes(types);
      },
      (error) => {
        console.error("Error fetching waste types:", error);
        showToast?.("Failed to fetch waste types", "error");
      }
    );
    return () => unsubscribe();
  }, [showToast]);

  // Fetch collection schedules
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
        setCollectionSchedules(schedulesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching collection schedules:", error);
        showToast?.("Failed to fetch collection schedules", "error");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [showToast]);

  // Fetch submission schedules
  useEffect(() => {
    const schedulesRef = collection(db, "submission_schedules");
    const schedulesQuery = query(schedulesRef, orderBy("area"));

    const unsubscribe = onSnapshot(
      schedulesQuery,
      (snapshot) => {
        const schedulesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSubmissionSchedules(schedulesData);
      },
      (error) => {
        console.error("Error fetching submission schedules:", error);
        showToast?.("Failed to fetch submission schedules", "error");
      }
    );

    return () => unsubscribe();
  }, [showToast]);

  const resetCollectionForm = () => {
    setCollectionFormData({
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

  const resetSubmissionForm = () => {
    setSubmissionFormData({
      area: "",
      barangay: "",
      day: "monday",
      startTime: "08:00",
      endTime: "17:00",
      allowedWasteTypes: [],
      maxSubmissionsPerDay: 50,
      requiresAppointment: false,
      notes: "",
      isActive: true,
    });
  };

  const handleCollectionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const scheduleData = {
        ...collectionFormData,
        updatedAt: serverTimestamp(),
      };

      if (editingSchedule) {
        await updateDoc(
          doc(db, "collection_schedules", editingSchedule.id),
          scheduleData
        );
        showToast?.("Collection schedule updated successfully", "success");
      } else {
        await addDoc(collection(db, "collection_schedules"), {
          ...scheduleData,
          createdAt: serverTimestamp(),
        });
        showToast?.("Collection schedule created successfully", "success");
      }

      setShowModal(false);
      setEditingSchedule(null);
      resetCollectionForm();
    } catch (error) {
      console.error("Error saving collection schedule:", error);
      showToast?.("Failed to save collection schedule", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmissionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (submissionFormData.allowedWasteTypes.length === 0) {
        showToast?.("Please select at least one waste type", "error");
        setLoading(false);
        return;
      }

      const scheduleData = {
        ...submissionFormData,
        maxSubmissionsPerDay: parseInt(submissionFormData.maxSubmissionsPerDay),
        updatedAt: serverTimestamp(),
      };

      if (editingSchedule) {
        await updateDoc(
          doc(db, "submission_schedules", editingSchedule.id),
          scheduleData
        );
        showToast?.("Submission schedule updated successfully", "success");
      } else {
        await addDoc(collection(db, "submission_schedules"), {
          ...scheduleData,
          createdAt: serverTimestamp(),
        });
        showToast?.("Submission schedule created successfully", "success");
      }

      setShowModal(false);
      setEditingSchedule(null);
      resetSubmissionForm();
    } catch (error) {
      console.error("Error saving submission schedule:", error);
      showToast?.("Failed to save submission schedule", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (schedule, type) => {
    setEditingSchedule({ ...schedule, type });
    
    if (type === "collection") {
      setCollectionFormData({
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
    } else {
      setSubmissionFormData({
        area: schedule.area || "",
        barangay: schedule.barangay || "",
        day: schedule.day || "monday",
        startTime: schedule.startTime || "08:00",
        endTime: schedule.endTime || "17:00",
        allowedWasteTypes: schedule.allowedWasteTypes || [],
        maxSubmissionsPerDay: schedule.maxSubmissionsPerDay || 50,
        requiresAppointment: schedule.requiresAppointment || false,
        notes: schedule.notes || "",
        isActive: schedule.isActive !== undefined ? schedule.isActive : true,
      });
    }
    
    setShowModal(true);
  };

  const handleDelete = async (scheduleId, type) => {
    const collectionName = type === "collection" ? "collection_schedules" : "submission_schedules";
    
    if (!window.confirm(`Are you sure you want to delete this ${type} schedule?`))
      return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, collectionName, scheduleId));
      showToast?.(`${type === "collection" ? "Collection" : "Submission"} schedule deleted successfully`, "success");
    } catch (error) {
      console.error("Error deleting schedule:", error);
      showToast?.("Failed to delete schedule", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleScheduleStatus = async (schedule, type) => {
    const collectionName = type === "collection" ? "collection_schedules" : "submission_schedules";
    
    setLoading(true);
    try {
      await updateDoc(doc(db, collectionName, schedule.id), {
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

  const handleCollectionWasteTypeChange = (wasteType) => {
    setCollectionFormData((prev) => ({
      ...prev,
      wasteTypes: prev.wasteTypes.includes(wasteType)
        ? prev.wasteTypes.filter((type) => type !== wasteType)
        : [...prev.wasteTypes, wasteType],
    }));
  };

  const handleSubmissionWasteTypeChange = (wasteTypeName) => {
    setSubmissionFormData((prev) => ({
      ...prev,
      allowedWasteTypes: prev.allowedWasteTypes.includes(wasteTypeName)
        ? prev.allowedWasteTypes.filter((type) => type !== wasteTypeName)
        : [...prev.allowedWasteTypes, wasteTypeName],
    }));
  };

  const currentSchedules = activeTab === "collection" ? collectionSchedules : submissionSchedules;
  
  const filteredSchedules = currentSchedules.filter((schedule) => {
    const matchesSearch =
      schedule.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.barangay?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDay = filterDay === "all" || schedule.day === filterDay;
    
    const matchesWasteType = 
      filterWasteType === "all" || 
      (activeTab === "collection" 
        ? schedule.wasteTypes?.includes(filterWasteType)
        : schedule.allowedWasteTypes?.includes(filterWasteType));

    return matchesSearch && matchesDay && (activeTab === "collection" || matchesWasteType);
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
            Schedule Manager
          </h2>
          <p
            className={`text-sm lg:text-base ${
              isDark ? "text-gray-400" : "text-slate-600"
            }`}
          >
            Manage garbage collection and waste submission schedules
          </p>
        </div>
        <button
          onClick={() => {
            if (activeTab === "collection") {
              resetCollectionForm();
            } else {
              resetSubmissionForm();
            }
            setEditingSchedule(null);
            setShowModal(true);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-white ${
            activeTab === "collection"
              ? "bg-indigo-600 hover:bg-indigo-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          <FiPlus className="w-4 h-4" />
          Add Schedule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab("collection");
            setSearchTerm("");
            setFilterDay("all");
            setFilterWasteType("all");
          }}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === "collection"
              ? isDark
                ? "text-indigo-400 border-b-2 border-indigo-400"
                : "text-indigo-600 border-b-2 border-indigo-600"
              : isDark
              ? "text-gray-400 hover:text-gray-300"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <Truck className="w-4 h-4" />
          Collection Schedules
        </button>
        <button
          onClick={() => {
            setActiveTab("submission");
            setSearchTerm("");
            setFilterDay("all");
            setFilterWasteType("all");
          }}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === "submission"
              ? isDark
                ? "text-green-400 border-b-2 border-green-400"
                : "text-green-600 border-b-2 border-green-600"
              : isDark
              ? "text-gray-400 hover:text-gray-300"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <Recycle className="w-4 h-4" />
          Submission Schedules
        </button>
      </div>

      {/* Filters */}
      <div className={`grid gap-4 ${activeTab === "submission" ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
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
        {activeTab === "submission" && (
          <div>
            <select
              value={filterWasteType}
              onChange={(e) => setFilterWasteType(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-gray-200"
                  : "bg-white border-slate-300 text-slate-900"
              }`}
            >
              <option value="all">All Waste Types</option>
              {wasteTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name.charAt(0).toUpperCase() + type.name.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
            activeTab === "collection" ? "border-indigo-600" : "border-green-600"
          }`}></div>
          <span className={`ml-2 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
            Loading schedules...
          </span>
        </div>
      )}

      {/* Schedules List */}
      {!loading && (
        <div className="space-y-4">
          {filteredSchedules.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                isDark ? "bg-gray-700" : "bg-slate-100"
              }`}>
                {activeTab === "collection" ? (
                  <Truck className={`w-8 h-8 ${isDark ? "text-gray-500" : "text-slate-400"}`} />
                ) : (
                  <Recycle className={`w-8 h-8 ${isDark ? "text-gray-500" : "text-slate-400"}`} />
                )}
              </div>
              <h3 className={`text-lg font-medium mb-2 ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                No schedules found
              </h3>
              <p>
                {searchTerm || filterDay !== "all" || filterWasteType !== "all"
                  ? "No schedules match your filters"
                  : `Create your first ${activeTab} schedule`}
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
                        className={`font-semibold flex items-center gap-2 ${
                          isDark ? "text-gray-100" : "text-slate-900"
                        }`}
                      >
                        <FiMapPin className={`w-4 h-4 ${
                          activeTab === "collection" ? "text-indigo-600" : "text-green-600"
                        }`} />
                        {schedule.area}
                      </h3>
                      {schedule.barangay && (
                        <p
                          className={`text-sm mt-1 ${
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
                          ? activeTab === "collection"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {schedule.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <FiCalendar className={`w-4 h-4 ${
                        activeTab === "collection" ? "text-indigo-500" : "text-green-500"
                      }`} />
                      <span
                        className={isDark ? "text-gray-300" : "text-slate-700"}
                      >
                        {schedule.day?.charAt(0).toUpperCase() +
                          schedule.day?.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FiClock className={`w-4 h-4 ${
                        activeTab === "collection" ? "text-indigo-500" : "text-green-500"
                      }`} />
                      <span
                        className={isDark ? "text-gray-300" : "text-slate-700"}
                      >
                        {formatTimeRange(schedule.startTime, schedule.endTime)}
                      </span>
                    </div>
                    {activeTab === "collection" && (
                      <div className="flex items-center gap-2 text-sm">
                        <Recycle className="w-4 h-4 text-indigo-500" />
                        <span
                          className={isDark ? "text-gray-300" : "text-slate-700"}
                        >
                          {schedule.frequency}
                        </span>
                      </div>
                    )}
                    {activeTab === "submission" && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <FiUsers className="w-4 h-4 text-green-500" />
                          <span
                            className={isDark ? "text-gray-300" : "text-slate-700"}
                          >
                            Max {schedule.maxSubmissionsPerDay} submissions/day
                          </span>
                        </div>
                        {schedule.requiresAppointment && (
                          <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            <span className="text-orange-600 font-medium">
                              Requires Appointment
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {((activeTab === "collection" && schedule.wasteTypes?.length > 0) ||
                    (activeTab === "submission" && schedule.allowedWasteTypes?.length > 0)) && (
                    <div className="mb-4">
                      <p
                        className={`text-xs font-medium mb-2 flex items-center gap-1 ${
                          isDark ? "text-gray-400" : "text-slate-600"
                        }`}
                      >
                        <Scale className="w-3 h-3" />
                        {activeTab === "collection" ? "Waste Types:" : "Accepted Waste Types:"}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(activeTab === "collection" ? schedule.wasteTypes : schedule.allowedWasteTypes).map((type, index) => (
                          <span
                            key={index}
                            className={`px-2 py-1 text-xs rounded-full capitalize ${
                              activeTab === "collection"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-green-100 text-green-800"
                            }`}
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
                      onClick={() => handleEdit(schedule, activeTab)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                        activeTab === "collection"
                          ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                          : "bg-green-50 text-green-600 hover:bg-green-100"
                      }`}
                    >
                      <FiEdit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleScheduleStatus(schedule, activeTab)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        schedule.isActive
                          ? "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                          : activeTab === "collection"
                          ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                          : "bg-green-50 text-green-600 hover:bg-green-100"
                      }`}
                    >
                      {schedule.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id, activeTab)}
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
            className={`w-full max-w-2xl rounded-lg shadow-lg ${
              isDark ? "bg-gray-800" : "bg-white"
            } max-h-[90vh] overflow-y-auto`}
          >
            <div className="p-6">
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDark ? "text-gray-100" : "text-slate-900"
                }`}
              >
                {editingSchedule
                  ? `Edit ${activeTab === "collection" ? "Collection" : "Submission"} Schedule`
                  : `Add New ${activeTab === "collection" ? "Collection" : "Submission"} Schedule`}
              </h3>

              <form onSubmit={activeTab === "collection" ? handleCollectionSubmit : handleSubmissionSubmit} className="space-y-4">
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
                      value={activeTab === "collection" ? collectionFormData.area : submissionFormData.area}
                      onChange={(e) =>
                        activeTab === "collection"
                          ? setCollectionFormData((prev) => ({ ...prev, area: e.target.value }))
                          : setSubmissionFormData((prev) => ({ ...prev, area: e.target.value }))
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
                      value={activeTab === "collection" ? collectionFormData.barangay : submissionFormData.barangay}
                      onChange={(e) =>
                        activeTab === "collection"
                          ? setCollectionFormData((prev) => ({ ...prev, barangay: e.target.value }))
                          : setSubmissionFormData((prev) => ({ ...prev, barangay: e.target.value }))
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
                      value={activeTab === "collection" ? collectionFormData.day : submissionFormData.day}
                      onChange={(e) =>
                        activeTab === "collection"
                          ? setCollectionFormData((prev) => ({ ...prev, day: e.target.value }))
                          : setSubmissionFormData((prev) => ({ ...prev, day: e.target.value }))
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
                      {activeTab === "collection" ? "Frequency *" : "Max Submissions/Day *"}
                    </label>
                    {activeTab === "collection" ? (
                      <select
                        required
                        value={collectionFormData.frequency}
                        onChange={(e) =>
                          setCollectionFormData((prev) => ({ ...prev, frequency: e.target.value }))
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
                    ) : (
                      <input
                        type="number"
                        required
                        min="1"
                        value={submissionFormData.maxSubmissionsPerDay}
                        onChange={(e) =>
                          setSubmissionFormData((prev) => ({ ...prev, maxSubmissionsPerDay: e.target.value }))
                        }
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark
                            ? "bg-gray-700 border-gray-600 text-gray-200"
                            : "bg-white border-slate-300 text-slate-900"
                        }`}
                      />
                    )}
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
                      value={activeTab === "collection" ? collectionFormData.startTime : submissionFormData.startTime}
                      onChange={(e) =>
                        activeTab === "collection"
                          ? setCollectionFormData((prev) => ({ ...prev, startTime: e.target.value }))
                          : setSubmissionFormData((prev) => ({ ...prev, startTime: e.target.value }))
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
                      value={activeTab === "collection" ? collectionFormData.endTime : submissionFormData.endTime}
                      onChange={(e) =>
                        activeTab === "collection"
                          ? setCollectionFormData((prev) => ({ ...prev, endTime: e.target.value }))
                          : setSubmissionFormData((prev) => ({ ...prev, endTime: e.target.value }))
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
                    {activeTab === "collection" ? "Waste Types" : "Allowed Waste Types *"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeTab === "collection" ? (
                      wasteTypeOptions.map((type) => (
                        <label
                          key={type}
                          className={`px-3 py-2 rounded-lg text-sm cursor-pointer border ${
                            collectionFormData.wasteTypes.includes(type)
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : isDark
                              ? "bg-gray-700 border-gray-600 text-gray-300"
                              : "bg-white border-slate-300 text-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={collectionFormData.wasteTypes.includes(type)}
                            onChange={() => handleCollectionWasteTypeChange(type)}
                            className="hidden"
                          />
                          {type}
                        </label>
                      ))
                    ) : (
                      wasteTypes.map((type) => (
                        <label
                          key={type.id}
                          className={`px-3 py-2 rounded-lg text-sm cursor-pointer border ${
                            submissionFormData.allowedWasteTypes.includes(type.name)
                              ? "bg-green-600 text-white border-green-600"
                              : isDark
                              ? "bg-gray-700 border-gray-600 text-gray-300"
                              : "bg-white border-slate-300 text-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={submissionFormData.allowedWasteTypes.includes(type.name)}
                            onChange={() => handleSubmissionWasteTypeChange(type.name)}
                            className="hidden"
                          />
                          <span className="capitalize">{type.name}</span>
                          <span className={`ml-1 text-xs ${
                            submissionFormData.allowedWasteTypes.includes(type.name)
                              ? "text-green-100"
                              : "text-gray-500"
                          }`}>
                            ({type.pointsPerKilo} pts/kg)
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Requires Appointment (Submission only) */}
                {activeTab === "submission" && (
                  <div>
                    <label
                      className={`flex items-center gap-2 cursor-pointer ${
                        isDark ? "text-gray-300" : "text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={submissionFormData.requiresAppointment}
                        onChange={(e) =>
                          setSubmissionFormData((prev) => ({ ...prev, requiresAppointment: e.target.checked }))
                        }
                        className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm font-medium">Requires Appointment</span>
                    </label>
                  </div>
                )}

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
                    value={activeTab === "collection" ? collectionFormData.notes : submissionFormData.notes}
                    onChange={(e) =>
                      activeTab === "collection"
                        ? setCollectionFormData((prev) => ({ ...prev, notes: e.target.value }))
                        : setSubmissionFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-gray-200"
                        : "bg-white border-slate-300 text-slate-900"
                    }`}
                    rows="3"
                    placeholder={activeTab === "collection" ? "Additional information..." : "Additional information or instructions..."}
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingSchedule(null);
                      if (activeTab === "collection") {
                        resetCollectionForm();
                      } else {
                        resetSubmissionForm();
                      }
                    }}
                    className={`px-4 py-2 text-sm border rounded-lg transition-colors ${
                      isDark
                        ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors text-white disabled:opacity-50 ${
                      activeTab === "collection"
                        ? "bg-indigo-600 hover:bg-indigo-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
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