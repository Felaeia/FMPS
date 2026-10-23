import React from "react";

const tagVariants = {
  teal: "theme-tag theme-tag-teal",
  rose: "theme-tag theme-tag-rose",
  green: "theme-tag theme-tag-green",
  blue: "theme-tag theme-tag-blue",
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
