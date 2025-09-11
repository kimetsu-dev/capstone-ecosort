import React, { useEffect, useState, useRef } from "react";
import { FiBell, FiX } from "react-icons/fi";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function NotificationCenter({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedNotif(null);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const markAsRead = async (notificationId) => {
    try {
      const notifDocRef = doc(db, "notifications", userId, "userNotifications", notificationId);
      await updateDoc(notifDocRef, { read: true });
      // Optimistically update UI
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllRead = async () => {
    try {
      const unreadNotifs = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifs.map((notif) =>
          updateDoc(doc(db, "notifications", userId, "userNotifications", notif.id), {
            read: true,
          })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const clearAll = async () => {
    try {
      await Promise.all(
        notifications.map((notif) =>
          deleteDoc(doc(db, "notifications", userId, "userNotifications", notif.id))
        )
      );
      setNotifications([]);
      setSelectedNotif(null);
    } catch (err) {
      console.error("Failed to clear all notifications:", err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(db, "notifications", userId, "userNotifications", notificationId));
      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
      if (selectedNotif?.id === notificationId) setSelectedNotif(null);
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

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

  const handleNotifClick = (notif) => {
    if (!notif.read) markAsRead(notif.id);
    setSelectedNotif(notif);
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
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-96 max-h-[500px] overflow-hidden bg-white shadow-lg rounded-xl border border-gray-200 z-50 animate-fade-in flex flex-col"
          role="region"
          aria-label="Notifications panel"
        >
          <div className="px-4 py-3 font-semibold text-gray-900 border-b border-gray-200 flex justify-between items-center">
            <span>Notifications</span>
            <div className="flex space-x-2">
              <button
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="text-sm text-indigo-600 hover:underline disabled:text-gray-400"
                aria-label="Mark all notifications as read"
              >
                Mark all read
              </button>
              <button
                onClick={clearAll}
                disabled={notifications.length === 0}
                className="text-sm text-red-600 hover:underline disabled:text-gray-400"
                aria-label="Clear all notifications"
              >
                Clear all
              </button>
            </div>
          </div>
          <div className="flex overflow-hidden flex-1">
            <ul
              className="w-1/2 overflow-y-auto border-r border-gray-200"
              role="list"
              aria-label="Notifications list"
            >
              {notifications.length === 0 ? (
                <p className="p-4 text-center text-gray-500">No notifications</p>
              ) : (
                notifications.map((notif) => (
                  <li
                    key={notif.id}
                    tabIndex={0}
                    role="button"
                    aria-pressed={notif.read}
                    onClick={() => handleNotifClick(notif)}
                    className={`cursor-pointer px-4 py-3 border-b last:border-b-0 flex justify-between items-start hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
                      notif.read ? "bg-white" : "bg-blue-50 font-semibold"
                    }`}
                  >
                    <div>
                      <p className="text-gray-900 truncate">{notif.message}</p>
                      <time className="text-xs text-gray-400">{formatTimestamp(notif.createdAt)}</time>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      aria-label={`Delete notification: ${notif.message}`}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Delete notification"
                    >
                      <FiX size={16} />
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="w-1/2 p-4 overflow-auto">
              {selectedNotif ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notification Details</h3>
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">{selectedNotif.details || selectedNotif.message}</p>
                  {/* Adjust "details" field according to your data structure;
                  fallback to message if no details */}
                  <time className="text-xs text-gray-400 block mb-2">{formatTimestamp(selectedNotif.createdAt)}</time>
                  {/* Add more transaction content or structured info here if available */}
                </>
              ) : (
                <p className="text-gray-500">Select a notification to see details</p>
              )}
            </div>
          </div>
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
