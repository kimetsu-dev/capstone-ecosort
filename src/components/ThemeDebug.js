// Create this as src/components/ThemeDebug.js
import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeDebug = () => {
  const { theme, isDark, styles } = useTheme();

  return (
    <div 
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        color: isDark ? 'white' : 'black',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 9999,
        backdropFilter: 'blur(10px)'
      }}
    >
      <div><strong>Theme Debug</strong></div>
      <div>Current Theme: {theme}</div>
      <div>Is Dark: {isDark.toString()}</div>
      <div>HTML Class: {document.documentElement.className}</div>
      <div>Body Class: {document.body.className}</div>
      <button 
        onClick={() => {
          const { toggleTheme } = useTheme();
          toggleTheme();
        }}
        style={{
          marginTop: '5px',
          padding: '4px 8px',
          fontSize: '10px',
          backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
          color: isDark ? 'white' : 'black',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Toggle Theme
      </button>
    </div>
  );
};

export default ThemeDebug;