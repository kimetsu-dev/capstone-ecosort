// src/contexts/ThemeContext.js - Enhanced with system theme support
import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("ecosort-theme");
      return savedTheme || "system";
    }
    return "system";
  });

  const applyTheme = (value) => {
    const root = document.documentElement;
    const body = document.body;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    let effectiveTheme = value;
    if (value === "system") {
      effectiveTheme = systemPrefersDark ? "dark" : "light";
    }

    // Save user preference
    localStorage.setItem("ecosort-theme", value);

    // Clear classes
    root.classList.remove("dark", "light");
    body.classList.remove("dark", "light", "dark-theme", "light-theme");

    // Apply new classes
    if (effectiveTheme === "dark") {
      root.classList.add("dark");
      body.classList.add("dark", "dark-theme");
    } else {
      root.classList.add("light");
      body.classList.add("light", "light-theme");
    }

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const color = effectiveTheme === "dark" ? "#0f172a" : "#f9fafb";
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", color);
    } else {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = color;
      document.head.appendChild(meta);
    }
  };

  // Apply whenever theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // React to system preference change
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : prev === "light" ? "system" : "dark"));
  };

  const setSpecificTheme = (newTheme) => {
    if (["light", "dark", "system"].includes(newTheme)) {
      setTheme(newTheme);
    }
  };

  const getThemeStyles = () => {
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effectiveTheme = theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

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
        theme,
        toggleTheme,
        setTheme: setSpecificTheme,
        isDark: theme === "dark",
        isLight: theme === "light",
        isSystem: theme === "system",
        styles: getThemeStyles(),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// ===========================
// src/components/ThemeWrapper.js - Enhanced version
// ===========================

// HOC that forces theme application to any component
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
export const ThemeWrapper = ({ children, className = '' }) => {
  const { styles } = useTheme();
  
  return (
    <div className={`${styles.page} transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
};

// ===========================
// src/components/BaseLayout.js - Layout component for consistent theming
// ===========================

export const BaseLayout = ({ children, className = '', showBackground = true }) => {
  const { styles, theme } = useTheme();
  
  return (
    <div className={`${styles.page} relative overflow-hidden ${className}`}>
      {showBackground && (
        <>
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className={`absolute top-20 left-10 w-32 h-32 ${
              theme === "dark" ? "bg-emerald-500/5" : "bg-emerald-500/10"
            } rounded-full blur-xl animate-pulse-slow`}></div>
            <div className={`absolute top-40 right-20 w-48 h-48 ${
              theme === "dark" ? "bg-blue-500/5" : "bg-blue-500/10"
            } rounded-full blur-2xl animate-float`}></div>
            <div className={`absolute bottom-32 left-1/4 w-24 h-24 ${
              theme === "dark" ? "bg-purple-500/5" : "bg-purple-500/10"
            } rounded-full blur-lg animate-bounce-slow`}></div>
            
            {/* Grid pattern overlay */}
            <div className={`absolute inset-0 ${
              theme === "dark" ? "opacity-[0.02]" : "opacity-[0.05]"
            }`} 
                 style={{
                   backgroundImage: `radial-gradient(circle at 1px 1px, ${
                     theme === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"
                   } 1px, transparent 0)`,
                   backgroundSize: '50px 50px'
                 }}>
            </div>
          </div>
        </>
      )}
      
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Global theme-aware styles */}
      <style>{`
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${theme === "dark" ? "rgba(31, 41, 55, 0.5)" : "rgba(243, 244, 246, 0.5)"};
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #10b981, #0d9488);
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #059669, #0f766e);
        }

        /* Selection styling */
        ::selection {
          background: rgba(16, 185, 129, 0.3);
          color: ${theme === "dark" ? "#ffffff" : "#000000"};
        }

        /* Global animations */
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-15px) rotate(1deg); }
          66% { transform: translateY(-8px) rotate(-1deg); }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-10px) scale(1.05); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

// ===========================
// src/hooks/useThemeSync.js - Hook to ensure theme consistency
// ===========================

export const useThemeSync = () => {
  const { theme, styles } = useTheme();

  useEffect(() => {
    // Force re-render of theme-dependent elements
    const event = new CustomEvent('themeChange', { 
      detail: { theme, styles } 
    });
    window.dispatchEvent(event);
  }, [theme, styles]);

  return { theme, styles };
};

