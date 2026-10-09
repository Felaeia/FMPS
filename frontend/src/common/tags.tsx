import React from "react";

const tagVariants = {
  teal: "bg-[#D9F5F2] text-[#1E9A97]",
  rose: "bg-[#FCDDE2] text-[#C2415C]",
  green: "bg-[#DDF5D3] text-[#3C9A2E]",
  blue: "bg-[#DCE8F8] text-[#2F5FA8]",
} as const;

export type TagVariant = keyof typeof tagVariants;

export interface TagProps {
  label: string;
  variant?: TagVariant;
  onRemove?: () => void;
}

export const Tag: React.FC<TagProps> = ({
  label,
  variant = "teal",
  onRemove,
}) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${tagVariants[variant]}`}
  >
    {label}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove tag ${label}`}
        // Inherits the variant's text color; dimmed until hovered.
        className="leading-none opacity-60 hover:opacity-100"
      >
        ×
      </button>
    )}
  </span>
);
