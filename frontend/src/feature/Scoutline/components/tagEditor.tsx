import { useState, type KeyboardEvent } from "react";
import { Tag } from "../../../common/tags";
import { variantFor } from "../constant/tags";

type TagEditorProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  // Tags already used on other monitored pages, offered as one-click adds.
  suggestions?: string[];
};

export default function TagEditor({
  tags,
  onChange,
  suggestions = [],
}: TagEditorProps) {
  const [draft, setDraft] = useState("");

  const has = (list: string[], label: string) =>
    list.some((t) => t.toLowerCase() === label.toLowerCase());

  function commit() {
    // Commas are stripped and length capped so pasted text can't create
    // unwieldy labels; duplicates are ignored case-insensitively.
    const label = draft.replace(/,/g, "").trim().slice(0, 20);
    setDraft("");
    if (!label || has(tags, label)) return;
    onChange([...tags, label]);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && tags.length > 0) {
      // Backspace on an empty input removes the last tag, like most tag inputs.
      onChange(tags.slice(0, -1));
    }
  }

  const available = suggestions.filter((s) => !has(tags, s));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-orange-100 bg-orange-50/60 px-3 py-2 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-200">
        {tags.map((tag) => (
          <Tag
            key={tag}
            label={tag}
            variant={variantFor(tag)}
            onRemove={() => onChange(tags.filter((t) => t !== tag))}
          />
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag, press Enter"
          aria-label="Add tag"
          className="min-w-[120px] flex-1 bg-transparent p-1 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none"
        />
      </div>

      {available.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-400">
          Your tags:
          {available.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onChange([...tags, tag])}
            >
              <Tag label={tag} variant={variantFor(tag)} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}