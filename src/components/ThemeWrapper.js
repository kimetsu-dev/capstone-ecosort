// src/contexts/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("ecosort-theme") || "system";
  });

  const [systemTheme, setSystemTheme] = useState("light");

  // Detect system theme and update reactively
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystem = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    updateSystem(); // set on load
    mediaQuery.addEventListener("change", updateSystem);

    return () => mediaQuery.removeEventListener("change", updateSystem);
  }, []);

  // Apply theme globally
  useEffect(() => {
    const root = document.documentElement; // <html>
    const body = document.body;
    const activeTheme = theme === "system" ? systemTheme : theme;

    // Persist
    localStorage.setItem("ecosort-theme", theme);

    // Remove previous classes
    root.classList.remove("light", "dark");
    body.classList.remove("light", "dark", "light-theme", "dark-theme");

    // Apply
    root.classList.add(activeTheme);
    body.classList.add(activeTheme, `${activeTheme}-theme`);

    // Update CSS vars (works both in browser & PWA)
    root.style.setProperty("--theme-mode", activeTheme);

    if (activeTheme === "dark") {
      root.style.setProperty("--bg-primary", "#0f172a");
      root.style.setProperty("--bg-secondary", "rgba(255,255,255,0.05)");
      root.style.setProperty("--text-primary", "#ffffff");
      root.style.setProperty("--accent-color", "#10b981");
    } else {
      root.style.setProperty("--bg-primary", "#f9fafb");
      root.style.setProperty("--bg-secondary", "rgba(255,255,255,0.8)");
      root.style.setProperty("--text-primary", "#111827");
      root.style.setProperty("--accent-color", "#059669");
    }

    // Set browser/PWA toolbar color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", activeTheme === "dark" ? "#0f172a" : "#f9fafb");
    }
  }, [theme, systemTheme]);

  // Cycle theme for quick toggle
  const toggleTheme = () => {
    setTheme((prev) =>
      prev === "light" ? "dark" : prev === "dark" ? "system" : "light"
    );
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        systemTheme,
        activeTheme: theme === "system" ? systemTheme : theme,
        isDark: theme === "dark" || (theme === "system" && systemTheme === "dark"),
        isLight: theme === "light" || (theme === "system" && systemTheme === "light"),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
