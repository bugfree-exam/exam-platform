import type { ReactNode } from "react";

type StudentControlSectionProps = {
  title: string;
  description: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function StudentControlSection({
  title,
  description,
  badge,
  defaultOpen = false,
  children,
}: StudentControlSectionProps) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm open:border-cyan-200"
    >
      <summary className="cursor-pointer list-none px-5 py-5 sm:px-6 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-slate-950 sm:text-xl">{title}</h2>
              {badge ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                  {badge}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition group-open:rotate-180 group-open:border-cyan-200 group-open:bg-cyan-50 group-open:text-cyan-800">
            ↓
          </span>
        </div>
      </summary>
      <div className="border-t border-slate-100 px-5 py-5 sm:px-6 sm:py-6">
        {children}
      </div>
    </details>
  );
}
