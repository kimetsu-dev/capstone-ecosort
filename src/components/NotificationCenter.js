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
        // No icon for unknown type/status
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "text-green-700 bg-green-50 border-green-200";
      case "failed":
      case "error":
        return "text-red-700 bg-red-50 border-red-200";
      case "pending":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      default:
        // Return empty string to not show label "Info"
        return "";
    }
  };

  const renderNotificationDetails = (notif) => {
    const data = notif.data || {};

    return (
      <div className="space-y-4 h-full overflow-auto p-4">
        {screenSize === "mobile" && (
          <div className="sticky top-0 bg-white z-10 pb-4 border-b border-gray-200">
            <button
              onClick={() => setSelectedNotif(null)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <FiChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to notifications</span>
            </button>
          </div>
        )}

        <div>
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 pr-4 leading-tight">
              {notif.title || notif.message}
            </h3>
            {/* Bell icon removed from here */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {getNotificationIcon(notif.type, notif.status)}
              {notif.status && (
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                    notif.status
                  )}`}
                >
                  {notif.status.charAt(0).toUpperCase() + notif.status.slice(1)}
                </span>
              )}
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed mb-6">{notif.message}</p>

          {(notif.status === "failed" || notif.status === "error") && data.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <h4 className="font-semibold text-red-900 mb-2 flex items-center">
                <FiAlertCircle className="w-4 h-4 mr-2" />
                Error Details
              </h4>
              <p className="text-red-700 text-sm leading-relaxed">{data.error}</p>
              {data.errorCode && (
                <p className="text-red-600 text-xs mt-2 font-mono bg-red-100 px-2 py-1 rounded break-all">
                  Error Code: {data.errorCode}
                </p>
              )}
            </div>
          )}

          <div className="border-t border-gray-200 pt-3">
            <time className="text-sm text-gray-500 flex items-center">
              <FiClock className="w-3 h-3 mr-1 flex-shrink-0" />
              {formatTimestamp(notif.createdAt)}
            </time>
          </div>
        </div>
      </div>
    );
  };

  // Mobile full screen notification detail view
  if (screenSize === "mobile" && selectedNotif) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white">
        <div className="h-full flex flex-col">{renderNotificationDetails(selectedNotif)}</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Notifications (${unreadCount} unread)`}
        className="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95"
      >
        <FiBell className="text-gray-700 dark:text-gray-300 w-5 h-5" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-white text-xs font-bold leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </div>
        )}
      </button>

      {isOpen && (
        <>
          {(screenSize === "mobile" || screenSize === "tablet") && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]" />
          )}

          <div
            ref={dropdownRef}
            className={`bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 rounded-2xl animate-fade-in overflow-hidden ${
              screenSize === "mobile"
                ? "fixed top-4 left-4 right-4 bottom-4 z-[9999] flex flex-col max-h-none w-auto"
                : screenSize === "tablet"
                ? "fixed top-16 left-4 right-4 bottom-20 z-[9999] flex flex-col max-h-none w-auto"
                : "absolute right-0 mt-2 w-96 max-h-[80vh] flex flex-col z-[9999]"
            }`}
            role="region"
            aria-label="Notifications panel"
          >
            <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center space-x-2">
                <FiBell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center space-x-1 hover:underline transition-colors"
                  >
                    <FiCheckCircle className="w-3 h-3" />
                    <span className="hidden sm:inline">Mark all read</span>
                    <span className="sm:hidden">Read all</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium hover:underline transition-colors"
                  >
                    <span className="hidden sm:inline">Clear all</span>
                    <span className="sm:hidden">Clear</span>
                  </button>
                )}
                {(screenSize === "mobile" || screenSize === "tablet") && (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                    aria-label="Close notifications"
                  >
                    <FiX className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <div
              className={`flex-1 overflow-hidden ${
                screenSize === "desktop" ? "flex" : "flex flex-col"
              }`}
            >
              {/* Notifications List */}
              <div
                className={`overflow-y-auto ${
                  screenSize === "desktop" && selectedNotif
                    ? "w-1/2 border-r border-gray-200 dark:border-gray-700"
                    : "flex-1 w-full"
                }`}
              >
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiBell className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No notifications
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      You're all caught up!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 relative group ${
                          notif.read ? "" : "bg-blue-50/50 dark:bg-blue-950/20"
                        } ${
                          selectedNotif?.id === notif.id && screenSize === "desktop"
                            ? "bg-blue-100 dark:bg-blue-900/30 border-r-2 border-blue-500"
                            : ""
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notif.type, notif.status)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <h4
                                className={`text-sm font-medium text-gray-900 dark:text-white truncate pr-2 ${
                                  !notif.read ? "font-semibold" : ""
                                }`}
                              >
                                {notif.title || notif.message}
                              </h4>
                              {!notif.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                              )}
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed mb-2">
                              {notif.message}
                            </p>

                            <div className="flex items-center justify-between">
                              <time className="text-xs text-gray-500 dark:text-gray-500">
                                {formatTimestamp(notif.createdAt)}
                              </time>
                              {notif.status && (
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                                    notif.status
                                  )} hidden sm:inline-flex`}
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
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all duration-200 min-w-[32px] min-h-[32px] flex items-center justify-center"
                            >
                              <FiX className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
                            </button>

                            {screenSize !== "desktop" && (
                              <FiChevronRight className="w-4 h-4 text-gray-400 mt-1" />
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
                <div className="w-1/2 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto">
                  {renderNotificationDetails(selectedNotif)}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
