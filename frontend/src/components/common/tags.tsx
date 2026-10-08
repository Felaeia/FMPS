import React from "react";

// Each variant is a full class string (not built by concatenation) so Tailwind
// can find and generate every class. Adding a new tag color means adding one
// entry here and nothing else.
const variants = {
  teal: "bg-[#D9F5F2] text-[#1E9A97]",
  rose: "bg-[#FCDDE2] text-[#C2415C]",
  green: "bg-[#DDF5D3] text-[#3C9A2E]",
  blue: "bg-[#DCE8F8] text-[#2F5FA8]",
} as const;

export type TagVariant = keyof typeof variants;

export interface TagProps {
  label: string;
  variant?: TagVariant;
}

// Small pill used to categorize a card (e.g. "Announcements", "Local").
// Purely presentational: color is chosen by the caller via `variant`, so the
// same component works for any category without knowing what it means.
export const Tag: React.FC<TagProps> = ({ label, variant = "teal" }) => (
  <span
    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${variants[variant]}`}
  >
    {label}
  </span>
);