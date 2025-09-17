import React from "react";

/**
 * Returns a styled badge component based on the status string.
 * @param {string} status - The status value to display.
 * @returns JSX element styled as a badge.
 */
export function getStatusBadge(status) {
  if (!status || typeof status !== "string") {
    status = "unknown";
  }

  const normalizedStatus = status.trim().toLowerCase();

  let colorClasses = "";
  let label = "";

  switch (normalizedStatus) {
    case "pending":
      colorClasses = "bg-yellow-100 text-yellow-800";
      label = "Pending";
      break;

    case "confirmed":
    case "approved": // optionally treat 'approved' same as confirmed
      colorClasses = "bg-green-100 text-green-800";
      label = "Confirmed";
      break;

    case "rejected":
    case "denied": // optionally treat 'denied' as rejected
      colorClasses = "bg-red-100 text-red-800";
      label = "Rejected";
      break;

    case "in progress":
    case "processing":
      colorClasses = "bg-blue-100 text-blue-800";
      label = "In Progress";
      break;

    default:
      colorClasses = "bg-gray-100 text-gray-800";
      // Capitalize first letter for unknown statuses
      label = status.charAt(0).toUpperCase() + status.slice(1);
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}
    >
      {label}
    </span>
  );
}

/**
 * Formats Firestore Timestamp into local date-time string.
 * @param {object} timestamp - Firestore Timestamp object.
 * @returns {string} formatted date-time string.
 */
export function formatTimestamp(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";
  const date = timestamp.toDate();
  // Customize formatting as you like:
  return date.toLocaleString();
}
