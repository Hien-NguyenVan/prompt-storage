"use client";
import { useEffect, useState, useTransition } from "react";
import { getVisibilityRules, setVisibilityRules, setAutoSeeNewUsers } from "@/app/actions/visibility";

type User = { id: string; email: string; full_name: string | null };

export default function VisibilityConfig({
  user,
  allUsers,
  autoSee,
  onMsg,
}: {
  user: User;
  allUsers: User[];
  autoSee: boolean;
  onMsg: (m: { type: "ok" | "err"; text: string }) => void;
}) {
  const others = allUsers.filter((u) => u.id !== user.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [auto, setAuto] = useState(autoSee);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    getVisibilityRules(user.id).then((res) => {
      if ("error" in res && res.error) onMsg({ type: "err", text: res.error });
      else setSelected(new Set(res.targets));
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function selectAll() { setSelected(new Set(others.map((u) => u.id))); }
  function deselectAll() { setSelected(new Set()); }

  function save() {
    start(async () => {
      const res = await setVisibilityRules(user.id, Array.from(selected));
      if ("error" in res) onMsg({ type: "err", text: res.error as string });
      else onMsg({ type: "ok", text: `Đã lưu quyền xem cho ${user.full_name || user.email}` });
    });
  }

  function toggleAuto() {
    const next = !auto;
    setAuto(next);
    start(async () => {
      const res = await setAutoSeeNewUsers(user.id, next);
      if ("error" in res) { setAuto(!next); onMsg({ type: "err", text: res.error as string }); }
    });
  }

  const filtered = others.filter((u) =>
    !search || (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()),
  );

  if (!loaded) return <div className="text-sm text-slate-500 py-4">Đang tải...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Quyền xem prompt của: <span className="text-brand-700">{user.full_name || user.email}</span>
        </h3>
        <span className="text-xs text-slate-400">{selected.size}/{others.length} người</span>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" onClick={selectAll} className="text-xs px-2 py-1 border rounded hover:bg-slate-50">Chọn tất cả</button>
        <button type="button" onClick={deselectAll} className="text-xs px-2 py-1 border rounded hover:bg-slate-50">Bỏ chọn tất cả</button>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm nhanh..."
          className="flex-1 min-w-[140px] border rounded px-2 py-1 text-xs" />
      </div>

      <div className="max-h-56 overflow-y-auto border rounded-md divide-y">
        {filtered.length === 0 ? (
          <div className="text-xs text-slate-400 p-3 text-center">Không tìm thấy</div>
        ) : (
          filtered.map((u) => (
            <label key={u.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
              <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
              <span className="truncate">{u.full_name || u.email}</span>
              {u.full_name && <span className="text-xs text-slate-400 truncate">{u.email}</span>}
            </label>
          ))
        )}
      </div>

      <label className="flex items-center gap-2 text-xs select-none text-slate-600">
        <input type="checkbox" checked={auto} onChange={toggleAuto} />
        Tự động thấy user mới khi được tạo
      </label>

      <button onClick={save} disabled={pending}
        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm px-4 py-1.5 rounded-md">
        {pending ? "Đang lưu..." : "Lưu quyền xem"}
      </button>
    </div>
  );
}
