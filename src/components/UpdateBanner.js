// src/components/UpdateBanner.jsx
import React, { useState, useEffect } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';

export default function UpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    const handleUpdate = (event) => {
      setRegistration(event.detail);
      setShowBanner(true);
    };

    // Listen for the custom event from index.js
    window.addEventListener('swUpdated', handleUpdate);

    return () => {
      window.removeEventListener('swUpdated', handleUpdate);
    };
  }, []);

  const handleUpdateClick = () => {
    if (registration && registration.waiting) {
      // Tell the service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Show again after 5 minutes
    setTimeout(() => setShowBanner(true), 300000);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl p-4 shadow-2xl border-2 border-white/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <FiDownload className="text-white text-xl" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-base mb-1">New Update Available! 🎉</p>
              <p className="text-sm text-emerald-50 leading-snug">
                We've made improvements to enhance your experience. Update now to get the latest features!
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white p-1 flex-shrink-0"
            aria-label="Dismiss"
          >
            <FiX className="text-xl" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleUpdateClick}
            className="flex-1 bg-white text-emerald-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-50 active:scale-95 transition-transform shadow-lg"
          >
            Update Now
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2.5 rounded-xl font-medium text-sm text-white/90 hover:bg-white/10 active:scale-95 transition-transform"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}