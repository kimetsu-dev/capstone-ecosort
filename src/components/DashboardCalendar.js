import { useState, useEffect, useRef } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { FiCalendar } from "react-icons/fi";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function DashboardCalendar({ selectedDate, setSelectedDate }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [garbageSchedule, setGarbageSchedule] = useState([]);
  const calendarRef = useRef(null);

  // Fetch garbage collection schedule from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "garbage_schedule"), (snapshot) => {
      const schedule = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGarbageSchedule(schedule);
    });
    return () => unsub();
  }, []);

  // Close calendar on outside click
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

  const toggleCalendar = () => setShowCalendar(prev => !prev);

  const parseDate = (dateStr) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const isGarbageDay = (date) => {
    return garbageSchedule.some(
      (sched) => parseDate(sched.date).toDateString() === date.toDateString()
    );
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={toggleCalendar}
        className="p-2 rounded-full bg-emerald-500 text-white shadow-md hover:bg-emerald-600"
        aria-label={showCalendar ? "Close calendar popup" : "Open calendar popup"}
      >
        <FiCalendar size={20} />
      </button>

      {showCalendar && (
        <div
          ref={calendarRef}
          className="absolute right-0 mt-2 bg-white p-4 rounded-2xl shadow-lg z-50 dark:bg-gray-800 dark:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <Calendar
            value={selectedDate}
            onChange={(date) => {
              setSelectedDate(date);
              setShowCalendar(false);
            }}
            tileClassName={({ date }) => {
              const today = new Date();
              if (
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear()
              ) {
                return "bg-blue-200 rounded-full";
              }
              if (isGarbageDay(date)) {
                return "bg-emerald-300 rounded-full text-black font-bold";
              }
              return null;
            }}
          />
        </div>
      )}
    </div>
  );
}
