type SegmentedControlProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
};

// Generic over the option type, so callers get their own union type back
// (e.g. Frequency) in onChange instead of a plain string.
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-0.5 self-start rounded-xl border border-orange-100 bg-orange-50/60 p-1"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={`rounded-lg px-3.5 py-2 text-sm transition ${
            option === value
              ? "bg-orange-700 text-white"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}