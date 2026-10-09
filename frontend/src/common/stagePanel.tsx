import type { ReactNode } from "react";

type StagePanelProps = {
  step: number;
  title: string;
  // Locked panels are visible but dimmed and unusable until the earlier step is done.
  locked?: boolean;
  children: ReactNode;
};

export default function StagePanel({
  step,
  title,
  locked = false,
  children,
}: StagePanelProps) {
  return (
    <section
      className={`rounded-2xl border border-orange-100 bg-[#fffdf9] p-5 shadow-sm transition-[opacity,filter] duration-500 ${
        locked ? "opacity-40 saturate-50" : ""
      }`}
    >
      <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-stone-800">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-700 text-xs text-white">
          {step}
        </span>
        {title}
      </h2>
      {/* A disabled fieldset disables every control inside it natively, so a
          locked step can't be clicked or tabbed into early. That is safer than
          only blocking pointer events, which keyboard users would bypass. */}
      <fieldset disabled={locked} className="m-0 min-w-0 border-0 p-0">
        {children}
      </fieldset>
    </section>
  );
}