// src/components/ThemeWrapper.js
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

// HOC that forces theme application
export const withTheme = (WrappedComponent) => {
  return function ThemedComponent(props) {
    const { theme, styles, isDark } = useTheme();
    
    return (
      <div 
        className={`min-h-screen transition-all duration-300 ${styles.backgroundGradient} ${
          isDark ? 'dark' : 'light'
        }`}
        style={{
          backgroundColor: isDark ? '#0f172a' : '#f9fafb',
          color: isDark ? '#ffffff' : '#111827',
          background: isDark 
            ? 'linear-gradient(135deg, #0f172a 0%, #111827 50%, #064e3b 100%)'
            : 'linear-gradient(135deg, #f9fafb 0%, #ffffff 50%, #ecfdf5 100%)'
        }}
      >
        <WrappedComponent {...props} theme={theme} styles={styles} isDark={isDark} />
      </div>
    );
  };
};

// Alternative: Wrapper component for direct use
export const ThemeWrapper = ({ children }) => {
  const { theme, styles, isDark } = useTheme();
  
  return (
    <div 
      className={`min-h-screen transition-all duration-300 ${styles.backgroundGradient} ${
        isDark ? 'dark' : 'light'
      }`}
      style={{
        backgroundColor: isDark ? '#0f172a' : '#f9fafb',
        color: isDark ? '#ffffff' : '#111827',
        background: isDark 
          ? 'linear-gradient(135deg, #0f172a 0%, #111827 50%, #064e3b 100%)'
          : 'linear-gradient(135deg, #f9fafb 0%, #ffffff 50%, #ecfdf5 100%)'
      }}
    >
      {children}
    </div>
  );
};