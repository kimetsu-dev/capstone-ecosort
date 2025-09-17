import React, { useState, useEffect, useRef } from "react";
import Calendar from "react-calendar";
import { FiCalendar, FiMapPin, FiClock, FiInfo } from "react-icons/fi";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { createPortal } from "react-dom";

export function DashboardCalendar({ selectedDate, setSelectedDate, isDark }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [collectionSchedules, setCollectionSchedules] = useState([]);
  const [selectedDateSchedules, setSelectedDateSchedules] = useState([]);
  const [showScheduleDetails, setShowScheduleDetails] = useState(false);
  const calendarRef = useRef(null);

  // Fetch schedules
  useEffect(() => {
    const schedulesQuery = query(
      collection(db, "collection_schedules"),
      where("isActive", "==", true)
    );
    const unsub = onSnapshot(schedulesQuery, (snapshot) => {
      const schedules = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCollectionSchedules(schedules);
    });
    return () => unsub();
  }, []);

  // Update schedules for selected date
  useEffect(() => {
    if (selectedDate && collectionSchedules.length > 0) {
      const dayName = selectedDate
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const schedulesForDate = collectionSchedules.filter(
        (schedule) =>
          schedule.day === dayName && isScheduledForDate(selectedDate, schedule)
      );
      setSelectedDateSchedules(schedulesForDate);
    } else {
      setSelectedDateSchedules([]);
    }
  }, [selectedDate, collectionSchedules]);

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

  const hasCollectionSchedule = (date) => {
    const dayName = date
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    return collectionSchedules.some(
      (schedule) =>
        schedule.day === dayName && isScheduledForDate(date, schedule)
    );
  };

  const getSchedulesForDate = (date) => {
    const dayName = date
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    return collectionSchedules.filter(
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
    return `${to12Hour(start)} - ${to12Hour(end)}`;
  } catch {
    return `${start} - ${end}`;
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
              className={`relative w-full max-w-sm p-4 rounded-2xl shadow-2xl border ${
                isDark
                  ? "bg-gray-800 text-white border-gray-700"
                  : "bg-white text-gray-900 border-gray-200"
              } animate-calendar-appear`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3
                      className={`text-lg font-semibold ${
                        isDark ? "text-gray-100" : "text-gray-900"
                      }`}
                    >
                      Collection Calendar
                    </h3>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Green dates are scheduled collection days
                    </p>
                  </div>
                  {/* Close Button */}
                  <button
                    onClick={() => setShowCalendar(false)}
                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      isDark
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-600 hover:text-gray-700"
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

    let classes = [];
    if (isToday) {
      classes.push(isDark ? "today-dark" : "today-light");
    }
    if (hasCollection) {
      classes.push(
        isDark ? "collection-day-dark" : "collection-day-light"
      );
    }
    return classes.join(" ");
  }}
  tileContent={({ date, view }) => {
    if (view === "month" && hasCollectionSchedule(date)) {
      return (
        <div
          title="Collection day - Click for details"
          aria-label="Collection day, clickable"
          style={{ width: "100%", height: "100%" }}
        />
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
                      Collections on {selectedDate.toLocaleDateString()}
                    </h4>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedDateSchedules.map((schedule, index) => (
                      <div
                        key={schedule.id || index}
                        className={`p-2 rounded border ${
                          isDark
                            ? "bg-gray-800 border-gray-600"
                            : "bg-white border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
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
                                • {schedule.frequency}

                                </span>

                            </div>
                          </div>
                        </div>

                        {schedule.wasteTypes &&
                          schedule.wasteTypes.length > 0 && (
                            <div className="mt-2">
                              <div className="flex flex-wrap gap-1">
                                {schedule.wasteTypes.map((type, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded-full"
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

  /* Remove pulsing animation on collection days */
  .collection-day-light,
  .collection-day-dark {
    cursor: pointer !important;
    position: relative;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    animation: none; /* Removed infinite pulse animation */
  }
  /* Subtle scale and shadow on hover */
  .collection-day-light:hover,
  .collection-day-dark:hover {
    transform: scale(1.08);
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
  }

  /* Distinct Collection Day Styles */
  .collection-day-light {
    background: #BBF7D0 !important;   /* Soft pastel green background */
    color: #065F46 !important;        /* Dark green text */
    font-weight: 600;
    border-bottom: 3px solid #10B981; /* Green underline */
  }
  .collection-day-dark {
    background: #064E3B !important;  /* Dark green background */
    color: #A7F3D0 !important;       /* Light turquoise text */
    font-weight: 600;
    border-bottom: 3px solid #34D399; /* Lighter green underline */
  }

  /* Today's Date Styles */
  .today-light {
    background: #DBEAFE !important;
    color: #1E40AF !important;
    font-weight: 700;
    border: 2px solid #2563EB; /* Blue border highlight */
  }
  .today-dark {
    background: #1E3A8A !important;
    color: #93C5FD !important;
    font-weight: 700;
    border: 2px solid #3B82F6; /* Blue border highlight */
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
    background: ${isDark ? '#1E3A8A' : '#DBEAFE'};
    color: ${isDark ? '#93C5FD' : '#1E40AF'};
    font-weight: 600;
  }

  .react-calendar__tile--now:enabled:hover,
  .react-calendar__tile--now:enabled:focus {
    background: ${isDark ? '#1E40AF' : '#BFDBFE'};
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