import { createContext, useContext } from "react";

export type Theme = "light" | "dark";

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}
export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);
export const STORAGE_KEY = "scoutline-theme";
// Components call this instead of useContext directly. The error makes a
// missing <ThemeProvider> obvious right away instead of failing later on
// `undefined.theme`.
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return context;
};
