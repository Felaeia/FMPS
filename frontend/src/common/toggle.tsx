type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

// Switch with its label inside the button, so clicking the text toggles it
// and screen readers announce the label as the switch's name.
export default function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-sm text-stone-700"
    >
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-600" : "bg-stone-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </span>
      {label}
    </button>
  );
}