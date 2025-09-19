import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

const BackButtonHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const lastBackPress = useRef(0);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const { isAdmin, currentUser, loading, authInitialized } = useAuth();

  useEffect(() => {
    // Don't handle navigation while authentication is loading or not initialized
    if (loading || !authInitialized) return;

    const handlePopState = (e) => {
      const now = Date.now();
      const currentPath = location.pathname;

      // Define root paths for each user type
      const userRootPaths = ["/dashboard"];
      const adminRootPaths = ["/adminpanel"];
      const publicRootPaths = ["/welcome", "/login", "/signup"];

      // Check if current path is a root path for the user type
      let isRoot = false;
      if (currentUser) {
        if (isAdmin) {
          isRoot = adminRootPaths.includes(currentPath);
        } else {
          isRoot = userRootPaths.includes(currentPath);
        }
      } else {
        isRoot = publicRootPaths.includes(currentPath);
      }

      // Double back press to exit logic (only on root pages)
      if (isRoot) {
        if (now - lastBackPress.current < 2000) {
          // Second back press within 2 seconds - allow default behavior (exit app)
          return;
        } else {
          // First back press or after timeout - prevent navigation and show prompt
          e.preventDefault();
          lastBackPress.current = now;
          setShowExitPrompt(true);
          
          // Hide prompt after 2 seconds
          setTimeout(() => {
            setShowExitPrompt(false);
          }, 2000);
        }
      }
    };

    // Add event listener
    window.addEventListener("popstate", handlePopState);

    // Cleanup function
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [location, navigate, isAdmin, currentUser, loading, authInitialized]);

  return (
    <>
      {showExitPrompt && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-lg shadow-xl z-50 animate-pulse">
          Press back again to exit
        </div>
      )}
    </>
  );
};

export default BackButtonHandler;