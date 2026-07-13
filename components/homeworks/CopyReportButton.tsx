"use client";

import { useState } from "react";

type CopyReportButtonProps = {
  text: string;
};

export function CopyReportButton({ text }: CopyReportButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);

    window.setTimeout(() => {
      setIsCopied(false);
    }, 1800);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      {isCopied ? "Скопировано" : "Скопировать отчёт"}
    </button>
  );
}