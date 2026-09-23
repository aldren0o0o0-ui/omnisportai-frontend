import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('omnisport-theme');
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('omnisport-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('omnisport-theme', 'light');
    }
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark((value) => !value) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
