// ThemeContext.jsx
import React, { createContext, useEffect, useState } from 'react';
import './ThemeContext.css';
export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    // Toggle a CSS class on <body>; CSS uses this to apply colors
    // document.body.style.background = darkMode ? "#0f172a" : "#f8fafc";
    if (darkMode) {
      document.body.classList.add('dark-theme'); // enables dark rules in CSS (e.g., body.dark-theme ...)
      localStorage.setItem('theme', 'dark');     // persist choice
    } else {
      document.body.classList.remove('dark-theme'); // fall back to light rules
      localStorage.setItem('theme', 'light');       // persist choice
    }
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

