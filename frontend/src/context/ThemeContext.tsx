import React, { useEffect, useState } from "react";
import { STORAGE_KEY, ThemeContext, type Theme } from "./ThemeContext.types";

// Reads the saved choice so the theme survives a page reload. The try/catch is
// needed because localStorage can throw (private browsing, blocked storage),
// and the app should just fall back to light instead of crashing.
const getInitialTheme = (): Theme => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Passing the function (not its result) means the storage read happens once,
  // on first render, instead of on every render.
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // Runs whenever the theme changes: saves the choice and mirrors it onto
  // <html data-theme="...">, so plain CSS (or Tailwind's dark variant, once it
  // is pointed at this attribute) can react to it without any component
  // having to pass the theme down.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Saving is best-effort; the theme still works for this session.
    }
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
