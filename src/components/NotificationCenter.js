import React, { useEffect, useState, useRef } from "react";
import { FiBell } from "react-icons/fi";
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

export default function NotificationCenter({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // Query notifications ordered by latest first
    const notificationsRef = collection(db, "notifications", userId, "userNotifications");
    const notifQuery = query(notificationsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    });

    return () => unsubscribe();
  }, [userId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      const notifDocRef = doc(db, "notifications", userId, "userNotifications", notificationId);
      await updateDoc(notifDocRef, { read: true });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Format timestamp nicely
  const formatTimestamp = (timestamp) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    return date.toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Notifications (${unreadCount} unread)`}
        className="relative p-2 rounded-full hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <FiBell className="text-gray-700 w-6 h-6" />
        {unreadCount > 0 && (
          <span
            className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2 select-none"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-96 max-h-[400px] overflow-y-auto bg-white shadow-lg rounded-xl border border-gray-200 z-50 animate-fade-in"
          role="region"
          aria-label="Notifications panel"
        >
          <h2 className="px-4 py-3 font-semibold text-gray-900 border-b border-gray-200">
            Notifications
          </h2>
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-gray-500">No notifications</p>
          ) : (
            <ul>
              {notifications.map((notif) => (
                <li
                  key={notif.id}
                  tabIndex={0}
                  role="button"
                  aria-pressed={notif.read}
                  onClick={() => markAsRead(notif.id)}
                  className={`cursor-pointer px-4 py-3 border-b last:border-b-0 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
                    notif.read ? "bg-white" : "bg-blue-50 font-semibold"
                  }`}
                >
                  <p className="text-gray-900">{notif.message}</p>
                  <time className="text-xs text-gray-400">{formatTimestamp(notif.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px);}
          to { opacity: 1; transform: translateY(0);}
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease forwards;
        }
      `}</style>
    </div>
  );
}
