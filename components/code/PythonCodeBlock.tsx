import { highlightPython313, type PythonTokenKind } from "@/lib/pythonSyntax";

const tokenClassName: Record<PythonTokenKind, string> = {
  plain: "text-slate-200",
  keyword: "text-fuchsia-300",
  builtin: "text-cyan-300",
  constant: "text-amber-300",
  number: "text-orange-300",
  string: "text-emerald-300",
  comment: "italic text-slate-500",
  operator: "text-sky-300",
  declaration: "font-semibold text-yellow-200",
  decorator: "text-violet-300",
};

export function PythonCodeBlock({
  code,
  className = "",
}: {
  code: string;
  className?: string;
}) {
  const tokens = highlightPython313(code);

  return (
    <div className={`overflow-hidden rounded-2xl bg-[#0b1724] ${className}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        <span>Python 3.13</span>
        <span>UTF-8</span>
      </div>
      <pre className="max-h-[32rem] overflow-auto p-4 font-mono text-[13px] leading-6 [tab-size:4]">
        <code>
          {tokens.map((token, index) => (
            <span key={`${index}-${token.kind}`} className={tokenClassName[token.kind]}>
              {token.content}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
