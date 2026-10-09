import { useId, useState, type ReactNode } from "react";
import { FaChevronDown } from "react-icons/fa";

type DropdownCardProps = {
  title: string;
  subtitle?: string;
  avatar?: ReactNode;
  tags?: ReactNode;
  // Small outlined chips on the right of the header ("15 min", "3/run", ...).
  meta?: string[];
  // Right-side status block (e.g. the "Live / checked 3m ago" indicator).
  status?: ReactNode;
  defaultOpen?: boolean;
  // Expanded content. Rendered below the header, outside the toggle button.
  children: ReactNode;
};

export default function DropdownCard({
  title,
  subtitle,
  avatar,
  tags,
  meta = [],
  status,
  defaultOpen = false,
  children,
}: DropdownCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  // Links the toggle button to its panel for screen readers.
  const panelId = useId();

  return (
    <section className="rounded-2xl border border-orange-100 bg-[#fffdf9] shadow-sm">
      {/* Only the header is the button: the body holds its own inputs and
          buttons, and interactive elements must not nest inside a <button>. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left transition hover:bg-orange-50/40"
      >
        <div className="flex min-w-0 items-center gap-4">
          {avatar}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-stone-800">
              {title}
            </p>
            {subtitle && (
              <p className="truncate text-xs text-stone-400">{subtitle}</p>
            )}
            {tags && <div className="mt-2 flex flex-wrap gap-2">{tags}</div>}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {meta.map((item) => (
            <span
              key={item}
              className="rounded-lg border border-orange-100 px-2.5 py-1 text-xs text-stone-500"
            >
              {item}
            </span>
          ))}
          {status}
          {/* Classes live on a wrapper because this icon type rejects className.
    The icon inherits the wrapper's text color via currentColor. */}
          <span
            className={`inline-flex text-stone-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          >
            <FaChevronDown size={12} />
          </span>
        </div>
      </button>

      {/* Animating grid rows from 0fr to 1fr gives a smooth expand without
          measuring the content height in JS. The visibility transition takes
          collapsed controls out of the tab order once the animation finishes. */}
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows,visibility] duration-200 ${
          open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-orange-100 p-5">{children}</div>
        </div>
      </div>
    </section>
  );
}
