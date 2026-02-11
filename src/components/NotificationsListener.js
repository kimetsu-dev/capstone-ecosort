import React, { useEffect, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

function useUserNotifications(userId) {
  // Store the time when the listener started to prevent toasting old unread notifications
  const sessionStartTime = useRef(Date.now());

  useEffect(() => {
    if (!userId) return;

    // Query unread notifications ordered by newest first
    const notifQuery = query(
      collection(db, "notifications", userId, "userNotifications"),
      where("read", "==", false),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const notification = change.doc.data();

          // ONLY Toast if the notification is newer than our session start
          // Fallback to Date.now() if createdAt isn't set yet (optimistic updates)
          const notifTime = notification.createdAt?.toMillis() || Date.now();
          
          if (notifTime > sessionStartTime.current) {
            // Show toast with notification message
            toast.info(notification.message, {
              position: "top-right",
              autoClose: 5000,
              closeOnClick: true,
              pauseOnHover: true,
            });
          }

          // NOTE: We do NOT automatically mark as read here.
          // This ensures the notification stays "unread" (bold) in the NotificationCenter
          // until the user explicitly interacts with it there.
        }
      });
    });

    return () => unsubscribe();
  }, [userId]);
}

export default function NotificationsListener({ userId }) {
  useUserNotifications(userId);

  return <ToastContainer />;
}