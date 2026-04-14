"use client";
import { useState } from "react";

export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("Không thể copy");
    }
  }
  return (
    <button onClick={copy} type="button"
      className="text-xs px-2 py-1 border rounded hover:bg-slate-50 text-slate-700">
      {copied ? "✓ Đã copy" : label}
    </button>
  );
}
