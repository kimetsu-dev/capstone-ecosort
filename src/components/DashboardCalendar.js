import React, { useState, useEffect, useRef } from "react";
import Calendar from "react-calendar";
import { FiCalendar, FiMapPin, FiClock, FiInfo } from "react-icons/fi";
import { Truck, Recycle } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { createPortal } from "react-dom";

export function DashboardCalendar({ selectedDate, setSelectedDate, isDark, schedules }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [collectionSchedules, setCollectionSchedules] = useState([]);
  const [submissionSchedules, setSubmissionSchedules] = useState([]);
  const [selectedDateSchedules, setSelectedDateSchedules] = useState([]);
  const [showScheduleDetails, setShowScheduleDetails] = useState(false);
  const calendarRef = useRef(null);

  // Fetch collection schedules
  useEffect(() => {
    const schedulesQuery = query(
      collection(db, "collection_schedules"),
      where("isActive", "==", true)
    );
    const unsub = onSnapshot(schedulesQuery, (snapshot) => {
      const schedules = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: "collection",
        ...doc.data(),
      }));
      setCollectionSchedules(schedules);
    });
    return () => unsub();
  }, []);

  // Fetch submission schedules
  useEffect(() => {
    const schedulesQuery = query(
      collection(db, "submission_schedules"),
      where("isActive", "==", true)
    );
    const unsub = onSnapshot(schedulesQuery, (snapshot) => {
      const schedules = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: "submission",
        ...doc.data(),
      }));
      setSubmissionSchedules(schedules);
    });
    return () => unsub();
  }, []);

  // Combine all schedules
  const allSchedules = [...collectionSchedules, ...submissionSchedules];

  // Update schedules for selected date
  useEffect(() => {
    if (selectedDate && allSchedules.length > 0) {
      const dayName = selectedDate
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const schedulesForDate = allSchedules.filter(
        (schedule) =>
          schedule.day === dayName && isScheduledForDate(selectedDate, schedule)
      );
      setSelectedDateSchedules(schedulesForDate);
    } else {
      setSelectedDateSchedules([]);
    }
  }, [selectedDate, collectionSchedules, submissionSchedules]);

  // Close calendar if clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    }
    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalendar]);

  // Close on Escape key
  useEffect(() => {
    function handleEscapeKey(e) {
      if (e.key === "Escape") {
        setShowCalendar(false);
      }
    }
    if (showCalendar) {
      document.addEventListener("keydown", handleEscapeKey);
    }
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showCalendar]);

  const toggleCalendar = () => setShowCalendar((prev) => !prev);

  const isScheduledForDate = (date, schedule) => {
    const dayName = date
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    if (schedule.day !== dayName) return false;

    // Submission schedules are typically always available on their designated days
    if (schedule.type === "submission") return true;

    // Collection schedules follow frequency patterns
    const today = new Date();
    const weeksDiff = Math.floor(
      (date.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    switch (schedule.frequency) {
      case "weekly":
        return true;
      case "biweekly":
        return Math.abs(weeksDiff) % 2 === 0;
      case "monthly":
        const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstOccurrence = new Date(firstDayOfMonth);
        const targetDay = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ].indexOf(dayName);
        while (firstOccurrence.getDay() !== targetDay) {
          firstOccurrence.setDate(firstOccurrence.getDate() + 1);
        }
        return date.getDate() === firstOccurrence.getDate();
      default:
        return false;
    }
  };

  const hasSchedule = (date) => {
    const dayName = date
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    return allSchedules.some(
      (schedule) =>
        schedule.day === dayName && isScheduledForDate(date, schedule)
    );
  };

  const hasCollectionSchedule = (date) => {
    const dayName = date
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    return collectionSchedules.some(
      (schedule) =>
        schedule.day === dayName && isScheduledForDate(date, schedule)
    );
  };

  const hasSubmissionSchedule = (date) => {
    const dayName = date
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    return submissionSchedules.some(
      (schedule) =>
        schedule.day === dayName && isScheduledForDate(date, schedule)
    );
  };

  const getSchedulesForDate = (date) => {
    const dayName = date
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    return allSchedules.filter(
      (schedule) =>
        schedule.day === dayName && isScheduledForDate(date, schedule)
    );
  };

  const formatTime = (start, end) => {
    try {
      const to12Hour = (time) => {
        const [hours, minutes] = time.split(":");
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      };
      return end ? `${to12Hour(start)} - ${to12Hour(end)}` : to12Hour(start);
    } catch {
      return end ? `${start} - ${end}` : start;
    }
  };

  return (
    <>
      {/* Calendar Button */}
      <div className="relative inline-block">
        <button
          onClick={toggleCalendar}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${
            isDark
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-emerald-500 hover:bg-emerald-600 text-white"
          }`}
          aria-label={
            showCalendar ? "Close calendar popup" : "Open calendar popup"
          }
        >
          <FiCalendar className="w-5 h-5" />
        </button>
      </div>

       {/* Calendar Popup via Portal */}
      {showCalendar &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-16 px-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setShowCalendar(false)}
            />

            {/* Calendar Container */}
            <div
              ref={calendarRef}
              className={`relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border ${
                isDark
                  ? "bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-700/50"
                  : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
              } animate-calendar-appear`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl ${isDark ? "bg-blue-500/20" : "bg-blue-100"} flex items-center justify-center`}>
                    <FiCalendar className={`w-6 h-6 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-xl lg:text-2xl font-bold ${isDark ? "text-blue-200" : "text-blue-800"}`}>
                      Schedule Calendar
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className={`text-xs font-medium ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                          Collection
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className={`text-xs font-medium ${isDark ? "text-green-400" : "text-green-600"}`}>
                          Submission
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Close Button */}
                  <button
                    onClick={() => setShowCalendar(false)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isDark
                        ? "bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-gray-300"
                        : "bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-700"
                    }`}
                    aria-label="Close calendar"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* React Calendar */}
              <Calendar
                value={selectedDate}
                onChange={(date) => {
                  setSelectedDate(date);
                  setShowScheduleDetails(true);
                }}
                className={isDark ? "dark-calendar" : ""}
                tileDisabled={({ date }) =>
                  date < new Date().setHours(0, 0, 0, 0)
                }
                tileClassName={({ date }) => {
                  const today = new Date();
                  const isToday =
                    date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();

                  const hasCollection = hasCollectionSchedule(date);
                  const hasSubmission = hasSubmissionSchedule(date);

                  let classes = [];
                  if (isToday) {
                    classes.push(isDark ? "today-dark" : "today-light");
                  }
                  if (hasCollection && hasSubmission) {
                    classes.push(isDark ? "both-schedules-dark" : "both-schedules-light");
                  } else if (hasCollection) {
                    classes.push(isDark ? "collection-day-dark" : "collection-day-light");
                  } else if (hasSubmission) {
                    classes.push(isDark ? "submission-day-dark" : "submission-day-light");
                  }
                  return classes.join(" ");
                }}
                tileContent={({ date, view }) => {
                  if (view === "month" && hasSchedule(date)) {
                    const hasCollection = hasCollectionSchedule(date);
                    const hasSubmission = hasSubmissionSchedule(date);
                    
                    return (
                      <div
                        className="flex gap-1 justify-center mt-1"
                        title={
                          hasCollection && hasSubmission
                            ? "Collection & Submission - Click for details"
                            : hasCollection
                            ? "Collection day - Click for details"
                            : "Submission point open - Click for details"
                        }
                        aria-label="Schedule available, clickable"
                      >
                        {hasCollection && (
                          <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                        )}
                        {hasSubmission && (
                          <div className="w-1 h-1 rounded-full bg-green-500"></div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Schedule Details */}
              {showScheduleDetails && selectedDateSchedules.length > 0 && (
                <div
                  className={`mt-4 p-3 rounded-lg border ${
                    isDark
                      ? "bg-gray-700 border-gray-600"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FiInfo className="w-4 h-4 text-emerald-500" />
                    <h4
                      className={`font-medium ${
                        isDark ? "text-gray-100" : "text-gray-900"
                      }`}
                    >
                      Schedules on {selectedDate.toLocaleDateString()}
                    </h4>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedDateSchedules.map((schedule, index) => (
                      <div
                        key={schedule.id || index}
                        className={`p-2 rounded border ${
                          schedule.type === "collection"
                            ? isDark
                              ? "bg-blue-900/30 border-blue-700"
                              : "bg-blue-50 border-blue-200"
                            : isDark
                            ? "bg-green-900/30 border-green-700"
                            : "bg-green-50 border-green-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {schedule.type === "collection" ? (
                                <Truck className={`w-3 h-3 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                              ) : (
                                <Recycle className={`w-3 h-3 ${isDark ? "text-green-400" : "text-green-600"}`} />
                              )}
                              <span
                                className={`text-xs font-semibold uppercase ${
                                  schedule.type === "collection"
                                    ? isDark ? "text-blue-400" : "text-blue-600"
                                    : isDark ? "text-green-400" : "text-green-600"
                                }`}
                              >
                                {schedule.type === "collection" ? "Collection" : "Submission Point"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <FiMapPin className="w-3 h-3 text-gray-500" />
                              <span
                                className={`text-sm font-medium ${
                                  isDark ? "text-gray-200" : "text-gray-800"
                                }`}
                              >
                                {schedule.area}
                                {schedule.barangay && `, ${schedule.barangay}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              <FiClock className="w-3 h-3 text-gray-500" />
                              <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {schedule.startTime && schedule.endTime
                                  ? formatTime(schedule.startTime, schedule.endTime)
                                  : schedule.time
                                  ? formatTime(schedule.time)
                                  : "No time set"}
                                {schedule.frequency && ` • ${schedule.frequency}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Waste Types for Collection */}
                        {schedule.type === "collection" && schedule.wasteTypes && schedule.wasteTypes.length > 0 && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1">
                              {schedule.wasteTypes.map((type, idx) => (
                                <span
                                  key={idx}
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    isDark
                                      ? "bg-blue-500/20 text-blue-300"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {type}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Allowed Waste Types for Submission */}
                        {schedule.type === "submission" && schedule.allowedWasteTypes && schedule.allowedWasteTypes.length > 0 && (
                          <div className="mt-2">
                            <p className={`text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              Accepted waste:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {schedule.allowedWasteTypes.map((type, idx) => (
                                <span
                                  key={idx}
                                  className={`px-2 py-1 text-xs rounded-full capitalize ${
                                    isDark
                                      ? "bg-green-500/20 text-green-300"
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
                            className={`text-xs mt-1 ${
                              isDark ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            {schedule.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowScheduleDetails(false)}
                    className={`mt-2 w-full py-1 text-xs rounded ${
                      isDark
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-600 hover:text-gray-700"
                    }`}
                  >
                    Hide Details
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      <style>{`
  /* Animations */
  @keyframes calendar-appear {
    from { opacity: 0; transform: scale(0.9) translateY(-20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .animate-calendar-appear {
    animation: calendar-appear 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  @keyframes backdrop-appear {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .animate-backdrop-appear {
    animation: backdrop-appear 0.2s ease-out forwards;
  }

  /* Collection Day Styles (Blue) */
  .collection-day-light,
  .collection-day-dark {
    cursor: pointer !important;
    position: relative;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .collection-day-light:hover,
  .collection-day-dark:hover {
    transform: scale(1.08);
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
  }

  .collection-day-light {
    background: #DBEAFE !important;
    color: #1E40AF !important;
    font-weight: 600;
    border-bottom: 3px solid #3B82F6;
  }
  .collection-day-dark {
    background: #1E3A8A !important;
    color: #93C5FD !important;
    font-weight: 600;
    border-bottom: 3px solid #60A5FA;
  }

  /* Submission Day Styles (Green) */
  .submission-day-light,
  .submission-day-dark {
    cursor: pointer !important;
    position: relative;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .submission-day-light:hover,
  .submission-day-dark:hover {
    transform: scale(1.08);
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
  }

  .submission-day-light {
    background: #D1FAE5 !important;
    color: #065F46 !important;
    font-weight: 600;
    border-bottom: 3px solid #10B981;
  }
  .submission-day-dark {
    background: #064E3B !important;
    color: #6EE7B7 !important;
    font-weight: 600;
    border-bottom: 3px solid #34D399;
  }

  /* Both Schedules (Gradient) */
  .both-schedules-light,
  .both-schedules-dark {
    cursor: pointer !important;
    position: relative;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .both-schedules-light:hover,
  .both-schedules-dark:hover {
    transform: scale(1.08);
    box-shadow: 0 0 8px rgba(99, 102, 241, 0.5);
  }

  .both-schedules-light {
    background: linear-gradient(135deg, #DBEAFE 0%, #D1FAE5 100%) !important;
    color: #1E40AF !important;
    font-weight: 700;
    border-bottom: 3px solid #6366F1;
  }
  .both-schedules-dark {
    background: linear-gradient(135deg, #1E3A8A 0%, #064E3B 100%) !important;
    color: #A5B4FC !important;
    font-weight: 700;
    border-bottom: 3px solid #818CF8;
  }

  /* Today's Date Styles */
  .today-light {
    background: #FEF3C7 !important;
    color: #92400E !important;
    font-weight: 700;
    border: 2px solid #F59E0B;
  }
  .today-dark {
    background: #78350F !important;
    color: #FDE68A !important;
    font-weight: 700;
    border: 2px solid #F59E0B;
  }

  /* Custom Calendar base */
  .custom-calendar {
    width: 100%;
    background: ${isDark ? "#374151" : "white"};
    border: 1px solid ${isDark ? "#4B5563" : "#E5E7EB"};
    border-radius: 12px;
    font-family: inherit;
    line-height: 1.125em;
  }

  .custom-calendar *,
  .custom-calendar *:before,
  .custom-calendar *:after {
    -moz-box-sizing: border-box;
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
  }

  .custom-calendar button {
    margin: 0;
    border: 0;
    outline: none;
  }

  .custom-calendar button:enabled:hover,
  .custom-calendar button:enabled:focus {
    cursor: pointer;
  }

  .react-calendar__navigation {
    display: flex;
    height: 44px;
    margin-bottom: 1em;
    padding: 0 0.5em;
  }

  .react-calendar__navigation__label {
    flex: 1;
    text-align: center;
    font-weight: 600;
    font-size: 1rem;
    background: transparent;
    color: ${isDark ? '#F3F4F6' : '#111827'};
  }

  .react-calendar__navigation__arrow,
  .react-calendar__navigation__label {
    color: ${isDark ? '#F3F4F6' : '#111827'};
    min-width: 44px;
    background: transparent;
    font-size: 1.2em;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .react-calendar__navigation__arrow:enabled:hover,
  .react-calendar__navigation__arrow:enabled:focus,
  .react-calendar__navigation__label:enabled:hover,
  .react-calendar__navigation__label:enabled:focus {
    background: ${isDark ? '#4B5563' : '#F3F4F6'};
  }

  .react-calendar__navigation__arrow:disabled {
    background: transparent;
    color: ${isDark ? '#6B7280' : '#9CA3AF'};
  }

  .react-calendar__month-view__weekdays {
    text-align: center;
    text-transform: uppercase;
    font-weight: 500;
    font-size: 0.75em;
    color: ${isDark ? '#9CA3AF' : '#6B7280'};
    margin-bottom: 0.5em;
  }

  .react-calendar__month-view__weekdays__weekday {
    padding: 0.5em;
  }

  .react-calendar__month-view__weekdays__weekday abbr {
    text-decoration: none;
  }

  .react-calendar__month-view__days {
    display: grid !important;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .react-calendar__tile {
    max-width: 100%;
    padding: 0.5em 0.2em;
    background: transparent;
    color: ${isDark ? '#D1D5DB' : '#374151'};
    text-align: center;
    line-height: 16px;
    font-size: 0.875em;
    border-radius: 8px;
    border: none;
    min-height: 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all 0.2s ease;
  }

  .react-calendar__tile:enabled:hover,
  .react-calendar__tile:enabled:focus {
    background: ${isDark ? '#4B5563' : '#E5E7EB'};
    color: ${isDark ? '#F3F4F6' : '#111827'};
  }

  .react-calendar__tile--now {
    background: ${isDark ? '#78350F' : '#FEF3C7'};
    color: ${isDark ? '#FDE68A' : '#92400E'};
    font-weight: 600;
  }

  .react-calendar__tile--now:enabled:hover,
  .react-calendar__tile--now:enabled:focus {
    background: ${isDark ? '#92400E' : '#FDE047'};
  }

  .react-calendar__tile--hasActive {
    background: ${isDark ? '#6366F1' : '#4F46E5'};
    color: white;
  }

  .react-calendar__tile--hasActive:enabled:hover,
  .react-calendar__tile--hasActive:enabled:focus {
    background: ${isDark ? '#5B21B6' : '#3730A3'};
  }

  .react-calendar__tile--active {
    background: ${isDark ? '#6366F1' : '#4F46E5'};
    color: white;
    font-weight: 600;
  }

  .react-calendar__tile--active:enabled:hover,
  .react-calendar__tile--active:enabled:focus {
    background: ${isDark ? '#5B21B6' : '#3730A3'};
  }

  .react-calendar__month-view__days__day--neighboringMonth {
    color: ${isDark ? '#4B5563' : '#D1D5DB'};
  }

  .react-calendar__month-view__days__day--weekend {
    color: ${isDark ? '#f87171' : '#dc2626'};
  }

  /* Mobile optimizations */
  @media (max-width: 640px) {
    .react-calendar__tile {
      padding: 0.4em 0.1em;
      min-height: 40px;
      font-size: 0.8rem;
    }

    .react-calendar__navigation__arrow,
    .react-calendar__navigation__label {
      min-width: 40px;
      font-size: 1rem;
    }
  }

  /* Very small screens */
  @media (max-width: 374px) {
    .react-calendar__tile {
      padding: 0.3em 0.05em;
      min-height: 36px;
      font-size: 0.75rem;
    }
  }

  /* Prevent scrolling when calendar is open */
  body.calendar-open {
    overflow: hidden;
  }

  /* Custom scrollbar for schedule details */
  .max-h-40::-webkit-scrollbar {
    width: 4px;
  }
  
  .max-h-40::-webkit-scrollbar-track {
    background: ${isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(243, 244, 246, 0.3)'};
    border-radius: 8px;
  }
  
  .max-h-40::-webkit-scrollbar-thumb {
    background: ${isDark ? 'rgba(16, 185, 129, 0.6)' : 'rgba(52, 211, 153, 0.6)'};
    border-radius: 8px;
  }

  /* Ensure proper focus states */
  .react-calendar__tile:focus-visible {
    outline: 2px solid ${isDark ? '#10b981' : '#059669'};
    outline-offset: 2px;
  }

  .react-calendar__navigation button:focus-visible {
    outline: 2px solid ${isDark ? '#10b981' : '#059669'};
    outline-offset: 2px;
  }
`}</style>

    </>
  );
}