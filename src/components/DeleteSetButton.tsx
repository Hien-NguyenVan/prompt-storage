"use client";
import { useTransition } from "react";
import { deletePromptSet } from "@/app/actions/sets";

export default function DeleteSetButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  function onClick() {
    if (!confirm("Xóa bộ prompt này? Hành động này không thể hoàn tác.")) return;
    start(async () => {
      const res = await deletePromptSet(id);
      if (res && "error" in res) alert("Lỗi: " + (res as any).error);
    });
  }
  return (
    <button onClick={onClick} disabled={pending}
      className="text-sm px-3 py-1.5 border border-red-300 text-red-700 rounded hover:bg-red-50 disabled:opacity-60">
      {pending ? "Đang xóa..." : "Xóa"}
    </button>
  );
}
