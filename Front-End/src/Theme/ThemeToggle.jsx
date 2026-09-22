// ThemeToggle.jsx
import React, { useContext } from 'react';
import './ThemeToggle.css';
import { ThemeContext } from './ThemeContext'; // ✅ Import ThemeContext

const ThemeToggle = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext); // ✅ Use context

  return (
    <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
      <span>{darkMode ? '🌙 Dark' : '☀️ Light'}</span>
    </button>
  );
};

export default ThemeToggle;
