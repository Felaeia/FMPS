import React from "react";
import { Tag, type TagProps } from "./tags";

interface CardProps {
  // Name of the source; also used to derive the avatar letter.
  title: string;
  // Already-formatted text such as "just now"; formatting stays with the caller
  // so the card doesn't depend on any date library.
  timestamp?: string;
  // Body of the update. Accepts nodes (not just a string) so a page can pass
  // links or bold text without changing this component.
  children: React.ReactNode;
  // Each tag carries its own variant, which lets the caller color-code categories.
  tags?: TagProps[];
  // Tailwind gradient classes for the avatar, written as full strings (e.g.
  // "from-[#D95A2B] to-[#C9A82B]") so Tailwind can generate them. The feed
  // passes a different one per source via getAvatarGradient.
  avatarGradient?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  timestamp,
  children,
  tags,
  avatarGradient = "from-[#D95A2B] to-[#C9A82B]",
}) => {
  // The avatar shows the first letter of the source name, so there is no
  // separate prop to keep in sync with the title.
  const initial = title.charAt(0).toUpperCase();

  return (
    <article className="flex items-start gap-4 p-5 rounded-2xl bg-[#FFFBF5] border border-[#E9E2D0] font-sans">
      {/* shrink-0 keeps the avatar square when the body text is long and wraps */}
      <div
        className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-bold text-sm shadow-sm`}
      >
        {initial}
      </div>

      {/* min-w-0 lets long text wrap inside the flex row instead of
          stretching the card past its container */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="font-bold text-[15px] text-[#3E2A20]">{title}</h3>
          {timestamp && (
            <span className="text-xs text-[#A89B92]">{timestamp}</span>
          )}
        </div>

        <div className="mt-1 text-[15px] text-[#4A3A30]">{children}</div>

        {/* Only render the tag row when there are tags, so cards without
            tags don't get an empty gap at the bottom */}
        {tags && tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Tag key={tag.label} {...tag} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
};
