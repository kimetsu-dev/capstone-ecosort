// src/contexts/ThemeContext.js - Enhanced version
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('ecosort-theme');
      // Check system preference if no saved theme
      if (!savedTheme) {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return systemPrefersDark ? 'dark' : 'light';
      }
      return savedTheme;
    }
    return 'dark';
  });

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('ecosort-theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // Apply theme changes
  useEffect(() => {
    localStorage.setItem('ecosort-theme', theme);

    const root = document.documentElement;
    const body = document.body;
    
    // Clear all theme classes
    root.classList.remove('dark', 'light');
    body.classList.remove('dark', 'light', 'dark-theme', 'light-theme');
    
    // Apply theme classes
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark', 'dark-theme');
    } else {
      root.classList.add('light');
      body.classList.add('light', 'light-theme');
    }

    // Set CSS custom properties
    root.style.setProperty('--theme-mode', theme);
    
    if (theme === 'dark') {
      root.style.setProperty('--bg-primary', '#0f172a');
      root.style.setProperty('--bg-secondary', 'rgba(255, 255, 255, 0.05)');
      root.style.setProperty('--bg-tertiary', 'rgba(255, 255, 255, 0.1)');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#d1d5db');
      root.style.setProperty('--text-muted', '#9ca3af');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.1)');
      root.style.setProperty('--accent-color', '#10b981');
      root.style.setProperty('--accent-color-light', '#34d399');
      root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.05)');
      root.style.setProperty('--backdrop-blur', 'blur(20px)');
    } else {
      root.style.setProperty('--bg-primary', '#f9fafb');
      root.style.setProperty('--bg-secondary', 'rgba(255, 255, 255, 0.8)');
      root.style.setProperty('--bg-tertiary', 'rgba(0, 0, 0, 0.05)');
      root.style.setProperty('--text-primary', '#111827');
      root.style.setProperty('--text-secondary', '#4b5563');
      root.style.setProperty('--text-muted', '#6b7280');
      root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--accent-color', '#059669');
      root.style.setProperty('--accent-color-light', '#10b981');
      root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.8)');
      root.style.setProperty('--backdrop-blur', 'blur(20px)');
    }

    // Set meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f172a' : '#f9fafb');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = theme === 'dark' ? '#0f172a' : '#f9fafb';
      document.getElementsByTagName('head')[0].appendChild(meta);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const setSpecificTheme = (newTheme) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      setTheme(newTheme);
    }
  };

  // Comprehensive theme styles
  const getThemeStyles = () => ({
    // Common classes for consistent theming
    page: theme === 'dark' 
      ? 'min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900 text-white'
      : 'min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 text-gray-900',
    
    card: theme === 'dark'
      ? 'bg-white/5 backdrop-blur-xl border border-white/10'
      : 'bg-white/80 backdrop-blur-xl border border-black/10',
    
    cardHover: theme === 'dark'
      ? 'hover:bg-white/10 hover:border-white/20'
      : 'hover:bg-white/90 hover:border-black/20',
    
    button: theme === 'dark'
      ? 'bg-white/10 hover:bg-white/20 border border-white/10 text-gray-300 hover:text-white'
      : 'bg-black/10 hover:bg-black/20 border border-black/10 text-gray-700 hover:text-black',
    
    buttonPrimary: theme === 'dark'
      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white'
      : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white',
    
    input: theme === 'dark'
      ? 'bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-emerald-500'
      : 'bg-white/80 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-emerald-500',
    
    text: {
      primary: theme === 'dark' ? 'text-white' : 'text-gray-900',
      secondary: theme === 'dark' ? 'text-gray-300' : 'text-gray-700',
      muted: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
      accent: theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700',
    },
    
    background: {
      primary: theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50',
      secondary: theme === 'dark' ? 'bg-gray-800' : 'bg-white',
      gradient: theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900'
        : 'bg-gradient-to-br from-gray-50 via-white to-emerald-50',
    },
    
    border: theme === 'dark' ? 'border-white/10' : 'border-black/10',
    divider: theme === 'dark' ? 'border-gray-700' : 'border-gray-200',
    
    // Status indicators
    status: {
      online: theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600',
      offline: theme === 'dark' ? 'text-red-400' : 'text-red-500',
    },
  });

  const value = {
    theme,
    toggleTheme,
    setTheme: setSpecificTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    styles: getThemeStyles(),
  };

  return (
    <ThemeContext.Provider value={value}>
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

// ===========================
// Usage Examples:
// ===========================

// 1. Wrap your entire app with ThemeProvider:
// function App() {
//   return (
//     <ThemeProvider>
//       <Router>
//         <Routes>
//           <Route path="/settings" element={<Settings />} />
//           <Route path="/dashboard" element={<Dashboard />} />
//         </Routes>
//       </Router>
//     </ThemeProvider>
//   );
// }

// 2. Use BaseLayout in your components:
// function Dashboard() {
//   return (
//     <BaseLayout>
//       <div className="container mx-auto px-4 py-8">
//         <YourContent />
//       </div>
//     </BaseLayout>
//   );
// }

// 3. Or use withTheme HOC:
// export default withTheme(Dashboard);

// 4. Or use ThemeWrapper directly:
// function Dashboard() {
//   const { styles } = useTheme();
//   return (
//     <ThemeWrapper>
//       <div className={`container mx-auto px-4 py-8 ${styles.card} rounded-3xl`}>
//         <YourContent />
//       </div>
//     </ThemeWrapper>
//   );
// }