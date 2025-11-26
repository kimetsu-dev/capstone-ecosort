// src/contexts/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ecosort-theme") || "light"; // default
    }
    return "light";
  });

  const getEffectiveTheme = (value) => {
    if (value === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return value;
  };

  const applyTheme = (value) => {
    const effectiveTheme = getEffectiveTheme(value);

    // Save preference
    localStorage.setItem("ecosort-theme", value);

    // Reset classes
    document.documentElement.classList.remove("dark", "light");
    document.body.classList.remove("dark", "light", "dark-theme", "light-theme");

    // Apply new theme classes
    if (effectiveTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark", "dark-theme");
    } else {
      document.documentElement.classList.add("light");
      document.body.classList.add("light", "light-theme");
    }

    // Update browser UI meta color
    const meta = document.querySelector('meta[name="theme-color"]');
    const color = effectiveTheme === "dark" ? "#0f172a" : "#f9fafb";
    if (meta) {
      meta.setAttribute("content", color);
    } else {
      const newMeta = document.createElement("meta");
      newMeta.name = "theme-color";
      newMeta.content = color;
      document.head.appendChild(newMeta);
    }
  };

  // Apply theme on change
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system changes if theme is set to "system"
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const getThemeStyles = () => {
    const effectiveTheme = getEffectiveTheme(theme);
    return {
      page:
        effectiveTheme === "dark"
          ? "min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900 text-white"
          : "min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 text-gray-900",

      card:
        effectiveTheme === "dark"
          ? "bg-white/5 backdrop-blur-xl border border-white/10"
          : "bg-white/80 backdrop-blur-xl border border-black/10",

      buttonPrimary:
        effectiveTheme === "dark"
          ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
          : "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white",

      text: {
        primary: effectiveTheme === "dark" ? "text-white" : "text-gray-900",
        secondary: effectiveTheme === "dark" ? "text-gray-300" : "text-gray-700",
        muted: effectiveTheme === "dark" ? "text-gray-400" : "text-gray-600",
      },
    };
  };

  return (
    <ThemeContext.Provider
      value={{
        theme, // "light" | "dark" | "system"
        setTheme, // fixed: now directly exposed
        toggleTheme,
        isDark: getEffectiveTheme(theme) === "dark",
        isLight: getEffectiveTheme(theme) === "light",
        isSystem: theme === "system",
        styles: getThemeStyles(),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

/* =========================================================
   Extra Utilities
========================================================= */

// HOC wrapper
export const withTheme = (WrappedComponent) => {
  return function ThemedComponent(props) {
    const { theme, styles, isDark } = useTheme();
    return (
      <div className={`${styles.page} transition-all duration-300`}>
        <WrappedComponent {...props} theme={theme} styles={styles} isDark={isDark} />
      </div>
    );
  };
};

// Direct wrapper component
export const ThemeWrapper = ({ children, className = "" }) => {
  const { styles } = useTheme();
  return (
    <div className={`${styles.page} transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
};

// Hook for syncing theme
export const useThemeSync = () => {
  const { theme, styles } = useTheme();
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("themeChange", { detail: { theme, styles } }));
  }, [theme, styles]);
  return { theme, styles };
};
