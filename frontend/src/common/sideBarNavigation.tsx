import React from "react";
import { NavLink } from "react-router-dom";
import { Sun, Moon, Eye, List, Plus } from "lucide-react";
import { useTheme, type Theme } from "../context/ThemeContext.types";

export interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SideBarNavigationProps {
  onAddPage?: () => void;
}

// Every color the sidebar uses lives here, so a theme is one object instead of
// ternaries scattered through the JSX. Class strings are written out in full
// (not built by concatenation) because Tailwind only generates classes it can
// find as complete strings in the source.
// Dark palette is an approximation of Hoshimi Miyabi (ZZZ): midnight navy base,
// pale frost-cyan accent (her Frost attribute), cool lavender-grey text.
const themes: Record<
  Theme,
  {
    sidebar: string;
    brandText: string;
    logoBg: string;
    logoRing: string;
    track: string;
    knob: string;
    navActive: string;
    navInactive: string;
    navIcon: string;
    badge: string;
  }
> = {
  light: {
    sidebar: "bg-[#FDFBF7] border-[#F2EADF]",
    brandText: "text-[#3E2A20]",
    logoBg: "bg-[#D95A2B]",
    logoRing: "border-white",
    track: "bg-white border-[#F2EADF]",
    knob: "bg-[#D95A2B] text-white",
    navActive: "bg-[#F5EFE6] text-[#3E2A20] font-semibold",
    navInactive:
      "text-[#8C7A6B] hover:bg-[#F5EFE6] hover:text-[#3E2A20] font-medium",
    navIcon: "text-[#A89B92]",
    badge: "bg-[#D95A2B] text-white",
  },
  dark: {
    sidebar: "bg-[#0B0F1E] border-[#1B2340]",
    brandText: "text-[#E8EEFF]",
    logoBg: "bg-[#7FD6F5]",
    logoRing: "border-[#0B0F1E]",
    track: "bg-[#161D38] border-[#1B2340]",
    knob: "bg-[#7FD6F5] text-[#0B0F1E]",
    navActive: "bg-[#161D38] text-[#F2F5FF] font-semibold",
    navInactive:
      "text-[#8E9AC0] hover:bg-[#131A33] hover:text-[#E8EEFF] font-medium",
    navIcon: "text-[#6F7BA8]",
    badge: "bg-[#7FD6F5] text-[#0B0F1E]",
  },
};

export const SideBarNavigation: React.FC<SideBarNavigationProps> = () => {
  const {theme, toggleTheme} = useTheme();

  // Single source of truth for the active palette; everything below reads from `t`.
  const t = themes[theme];
  const isDark = theme === "dark";

  // Define your navigation items here
  const navItems: NavItem[] = [
    { path: "/feed", label: "Feed", icon: <Eye size={18} /> },
    { path: "/monitored", label: "Monitored pages", icon: <List size={18} /> },
    { path: "/addPage", label: "Add Page", icon: <Plus size={18} /> },
  ];

  return (
    <aside
      className={`w-64 h-screen flex flex-col p-4 border-r font-sans shrink-0 transition-colors duration-300 ${t.sidebar}`}
    >
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors duration-300 ${t.logoBg}`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full border-[3px] ${t.logoRing}`}
            />
          </div>
          <span
            className={`font-bold text-lg tracking-tight transition-colors duration-300 ${t.brandText}`}
          >
            Scoutline
          </span>
        </div>

        {/* Slider toggle: role="switch" tells screen readers this is an on/off
            control; "on" here means dark mode. The knob slides across the track
            and shows the icon of the theme that is currently active. */}
        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          aria-label="Toggle dark mode"
          onClick={toggleTheme}
          className={`relative w-15 h-7 rounded-full border shadow-sm transition-colors duration-300 ${t.track}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow transition-all duration-300 ${t.knob} ${
              isDark ? "translate-x-7" : "translate-x-0"
            }`}
          >
            {isDark ? <Moon size={14} /> : <Sun size={14} />}
          </span>
        </button>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                isActive ? t.navActive : t.navInactive
              }`
            }
          >
            <div className="flex items-center gap-3">
              <span className={t.navIcon}>{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </div>
            {item.badge !== undefined && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.badge}`}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
