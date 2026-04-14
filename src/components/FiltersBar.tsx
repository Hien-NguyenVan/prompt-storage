"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Staff = { id: string; email: string; full_name: string | null };

export default function FiltersBar({
  isAdmin,
  models,
  staff,
  initial,
}: {
  isAdmin: boolean;
  models: string[];
  staff: Staff[];
  initial: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(initial.q ?? "");
  const [type, setType] = useState(initial.type ?? "");
  const [model, setModel] = useState(initial.model ?? "");
  const [creator, setCreator] = useState(initial.creator ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");
  const [sort, setSort] = useState(initial.sort ?? "desc");

  function apply() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (model) params.set("model", model);
    if (creator) params.set("creator", creator);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (sort && sort !== "desc") params.set("sort", sort);
    router.push(`/?${params.toString()}`);
  }

  function reset() {
    setQ(""); setType(""); setModel(""); setCreator(""); setFrom(""); setTo(""); setSort("desc");
    router.push("/");
  }

  return (
    <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[180px]">
        <label className="text-xs text-slate-500">Tên bộ</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên..." className="w-full border rounded-md px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="text-xs text-slate-500">Loại</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded-md px-2 py-1.5 text-sm">
          <option value="">Tất cả</option>
          <option value="don">Đơn</option>
          <option value="ghep">Ghép</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500">Model</label>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="border rounded-md px-2 py-1.5 text-sm">
          <option value="">Tất cả</option>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      {isAdmin && (
        <div>
          <label className="text-xs text-slate-500">Người tạo</label>
          <select value={creator} onChange={(e) => setCreator(e.target.value)} className="border rounded-md px-2 py-1.5 text-sm">
            <option value="">Tất cả</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="text-xs text-slate-500">Từ ngày</label>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-md px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="text-xs text-slate-500">Đến ngày</label>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-md px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="text-xs text-slate-500">Sắp xếp</label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="border rounded-md px-2 py-1.5 text-sm">
          <option value="desc">Mới nhất</option>
          <option value="asc">Cũ nhất</option>
          <option value="name_asc">Tên A-Z</option>
        </select>
      </div>
      <button onClick={apply} className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-3 py-1.5 rounded-md">Lọc</button>
      <button onClick={reset} className="text-sm px-3 py-1.5 border rounded-md hover:bg-slate-50">Xóa lọc</button>
    </div>
  );
}
