import React, { useEffect, useState, useRef } from "react";
import {
  FiBell,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiDollarSign,
  FiGift,
  FiTrash,
  FiChevronRight,
  FiClock,
  FiCheckCircle,
  FiChevronLeft,
} from "react-icons/fi";

import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

export default function NotificationCenter({ userId = "demo-user" }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [screenSize, setScreenSize] = useState("desktop");
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // Firestore real-time notification fetch
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    const notificationsRef = collection(
      db,
      "notifications",
      userId,
      "userNotifications"
    );
    const notificationsQuery = query(
      notificationsRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notifList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotifications(notifList);
      },
      (error) => {
        console.error("Notifications listener error:", error);
        setNotifications([]);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Screen size detection
  useEffect(() => {
    const getScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) return "mobile";
      if (width < 1024) return "tablet";
      return "desktop";
    };

    const updateScreenSize = () => {
      setScreenSize(getScreenSize());
    };

    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    return () => window.removeEventListener("resize", updateScreenSize);
  }, []);

  // Update unread count safely
  useEffect(() => {
    setUnreadCount(
      Array.isArray(notifications)
        ? notifications.filter((n) => !n.read).length
        : 0
    );
  }, [notifications]);

  // Close dropdown and handle escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        if (screenSize === "mobile") setSelectedNotif(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        if (selectedNotif && screenSize === "mobile") {
          setSelectedNotif(null);
        } else {
          setIsOpen(false);
          setSelectedNotif(null);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      if (screenSize === "mobile") {
        document.body.style.overflow = "hidden";
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, selectedNotif, screenSize]);

  // Mark single notification as read and persist in Firestore
  const markAsRead = async (notificationId) => {
    try {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );

      if (!userId) return;
      const notifRef = doc(db, "notifications", userId, "userNotifications", notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Mark all notifications as read and persist in Firestore batch
  const markAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

      if (!userId) return;
      const batch = writeBatch(db);
      notifications
        .filter((notif) => !notif.read)
        .forEach((notif) => {
          const notifRef = doc(db, "notifications", userId, "userNotifications", notif.id);
          batch.update(notifRef, { read: true });
        });

      await batch.commit();
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  // Clear all notifications locally (optionally add Firestore deletion)
  const clearAll = async () => {
    try {
      setNotifications([]);
      setSelectedNotif(null);
      // Optionally delete notifications from Firestore here
    } catch (err) {
      console.error("Failed to clear all notifications:", err);
    }
  };

  // Delete single notification locally (optionally add Firestore deletion)
  const deleteNotification = async (notificationId) => {
    try {
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId)
      );
      if (selectedNotif?.id === notificationId) setSelectedNotif(null);
      // Optionally delete from Firestore here
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const handleNotifClick = (notif) => {
    if (!notif.read) markAsRead(notif.id);

    if (screenSize === "mobile") {
      setSelectedNotif(notif);
    } else {
      setSelectedNotif(selectedNotif?.id === notif.id ? null : notif);
    }
  };

  const getNotificationIcon = (type, status) => {
    const iconClass = "w-5 h-5 flex-shrink-0";

    if (status === "success") {
      return <FiCheck className={`${iconClass} text-green-500`} />;
    } else if (status === "failed" || status === "error") {
      return <FiAlertCircle className={`${iconClass} text-red-500`} />;
    } else if (status === "pending") {
      return <FiClock className={`${iconClass} text-yellow-500`} />;
    }

    switch (type) {
      case "transaction":
        return <FiDollarSign className={`${iconClass} text-blue-500`} />;
      case "redemption":
        return <FiGift className={`${iconClass} text-purple-500`} />;
      case "waste_submission":
        return <FiTrash className={`${iconClass} text-green-500`} />;
      default:
        return <FiBell className={`${iconClass} text-gray-500`} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-700";
      case "failed":
      case "error":
        return "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-700";
      case "pending":
        return "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-700";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-600";
    }
  };

  const renderNotificationDetails = (notif) => {
    const data = notif.data || {};

    return (
      <div className="flex flex-col h-full max-h-full">
        {screenSize === "mobile" && (
          <div className="flex-shrink-0 bg-white dark:bg-gray-900 z-10 p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setSelectedNotif(null)}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <FiChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to notifications</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight flex-1">
                {notif.title || notif.message}
              </h3>
              <div className="flex items-center space-x-2 flex-shrink-0">
                {getNotificationIcon(notif.type, notif.status)}
              </div>
            </div>

            {notif.status && (
              <div className="mb-4">
                <span
                  className={`inline-flex px-3 py-1.5 text-sm font-medium rounded-lg border ${getStatusColor(
                    notif.status
                  )}`}
                >
                  {notif.status.charAt(0).toUpperCase() + notif.status.slice(1)}
                </span>
              </div>
            )}

            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-base">
              {notif.message}
            </p>

            {(notif.status === "failed" || notif.status === "error") && data.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2 flex items-center">
                  <FiAlertCircle className="w-4 h-4 mr-2" />
                  Error Details
                </h4>
                <p className="text-red-700 dark:text-red-400 text-sm leading-relaxed">{data.error}</p>
                {data.errorCode && (
                  <p className="text-red-600 dark:text-red-500 text-xs mt-2 font-mono bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded break-all">
                    Error Code: {data.errorCode}
                  </p>
                )}
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
              <time className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <FiClock className="w-4 h-4 mr-2 flex-shrink-0" />
                {formatTimestamp(notif.createdAt)}
              </time>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Mobile full screen notification detail view
  if (screenSize === "mobile" && selectedNotif) {
    return (
      <div className="fixed inset-0 z-[99999] bg-white dark:bg-gray-900">
        {renderNotificationDetails(selectedNotif)}
      </div>
    );
  }

  return (
    <div className="relative z-50">
      <button
        ref={bellRef}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Notifications (${unreadCount} unread)`}
        // ⬇️ MODIFIED: Cleaner styling for the bell button
        className={`relative p-2.5 rounded-xl 
                   text-gray-500 dark:text-gray-400 
                   hover:text-gray-800 dark:hover:text-white 
                   hover:bg-gray-100 dark:hover:bg-gray-800 
                   transition-all duration-200 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-gray-900
                   active:scale-95
                   ${isOpen ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white' : ''}`}
      >
        <FiBell className="w-5 h-5" />
        
        {unreadCount > 0 && (
          // ⬇️ MODIFIED: Cleaner, more modern badge
          <div 
            className="absolute -top-1.5 -right-1.5 h-[18px] min-w-[18px] px-1 
                       flex items-center justify-center 
                       bg-red-600 rounded-full 
                       border-2 border-white dark:border-gray-900"
          >
            <span className="text-white text-[10px] font-bold leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </div>
        )}
      </button>

      {isOpen && (
        <>
          {(screenSize === "mobile" || screenSize === "tablet") && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
              onClick={() => setIsOpen(false)}
            />
          )}

          <div
            ref={dropdownRef}
            className={`bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden ${
              screenSize === "mobile"
                ? "fixed top-4 left-4 right-4 bottom-4 z-[9999] flex flex-col"
                : screenSize === "tablet"
                ? "fixed top-16 left-4 right-4 bottom-20 z-[9999] flex flex-col"
                // This class is from the previous fix and is correct
                : "absolute right-0 mt-2 w-screen max-w-lg lg:max-w-xl max-h-[70vh] flex flex-col z-[9999]"
            }`}
            role="region"
            aria-label="Notifications panel"
            style={{
              animation: 'slideInScale 0.2s ease-out'
            }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <FiBell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center space-x-1 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <FiCheckCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mark all read</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Clear
                  </button>
                )}
                {(screenSize === "mobile" || screenSize === "tablet") && (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Close notifications"
                  >
                    <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex h-full"> 
              {/* Notifications List */}
              <div
                className={`overflow-y-auto ${
                  screenSize === "desktop" && selectedNotif
                    ? "w-1/2 border-r border-gray-200 dark:border-gray-700 h-full" 
                    : "flex-1 w-full"
                }`}
              >
                {notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiBell className="w-10 h-10 text-blue-400 dark:text-blue-500" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No notifications
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      You're all caught up! Check back later.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={`p-4 cursor-pointer transition-all duration-150 relative group ${
                          notif.read 
                            ? "hover:bg-gray-50 dark:hover:bg-gray-800/50" 
                            : "bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-950/30"
                        } ${
                          selectedNotif?.id === notif.id && screenSize === "desktop"
                            ? "bg-blue-100 dark:bg-blue-900/30 border-r-4 border-blue-500"
                            : ""
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notif.type, notif.status)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1.5">
                              <h4
                                className={`text-sm font-medium text-gray-900 dark:text-white pr-2 ${
                                  !notif.read ? "font-semibold" : ""
                                }`}
                              >
                                {notif.title || notif.message}
                              </h4>
                              {!notif.read && (
                                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                              )}
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed mb-2">
                              {notif.message}
                            </p>

                            <div className="flex items-center justify-between gap-2">
                              <time className="text-xs text-gray-500 dark:text-gray-500 flex items-center">
                                <FiClock className="w-3 h-3 mr-1" />
                                {formatTimestamp(notif.createdAt)}
                              </time>
                              {notif.status && (
                                <span
                                  className={`px-2 py-0.5 text-xs font-medium rounded-md border ${getStatusColor(
                                    notif.status
                                  )}`}
                                >
                                  {notif.status}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                              aria-label={`Delete notification: ${notif.message}`}
                              className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                            >
                              <FiX className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
                            </button>

                            {screenSize !== "desktop" && (
                              <FiChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop Details Panel */}
              {screenSize === "desktop" && selectedNotif && (
                <div className="w-1/2 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 overflow-y-auto h-full">
                  {renderNotificationDetails(selectedNotif)}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInScale {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}