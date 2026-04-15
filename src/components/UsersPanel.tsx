"use client";
import { useState, useTransition } from "react";
import { createStaffUser, deleteStaffUser, resetStaffPassword } from "@/app/actions/users";

type U = { id: string; email: string; full_name: string | null; role: string; created_at: string; created_at_display: string };

export default function UsersPanel({ users, currentUserId }: { users: U[]; currentUserId: string }) {
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createStaffUser(fd);
      if ("error" in res) setMsg({ type: "err", text: res.error as string });
      else {
        setMsg({ type: "ok", text: "Tạo tài khoản thành công" });
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  function onDelete(u: U) {
    if (u.id === currentUserId) return alert("Không thể xóa tài khoản của chính bạn");
    if (!confirm(`Xóa tài khoản ${u.email}?`)) return;
    start(async () => {
      const res = await deleteStaffUser(u.id);
      if ("error" in res) setMsg({ type: "err", text: res.error as string });
      else setMsg({ type: "ok", text: "Đã xóa" });
    });
  }

  function onReset(u: U) {
    const pw = prompt(`Đặt mật khẩu mới cho ${u.email} (tối thiểu 6 ký tự):`);
    if (!pw) return;
    start(async () => {
      const res = await resetStaffPassword(u.id, pw);
      if ("error" in res) setMsg({ type: "err", text: res.error as string });
      else setMsg({ type: "ok", text: "Đã đổi mật khẩu" });
    });
  }

  return (
    <div className="space-y-4">
      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Tạo tài khoản mới</h2>
        <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <div>
            <label className="text-xs text-slate-500">Email</label>
            <input name="email" type="email" required className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Họ tên</label>
            <input name="full_name" className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Mật khẩu</label>
            <input name="password" required minLength={6} className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Vai trò</label>
            <select name="role" defaultValue="staff" className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="staff">Nhân viên</option>
              <option value="viewer">Xem tất cả</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button disabled={pending} className="bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-md py-2 disabled:opacity-60">
            {pending ? "Đang tạo..." : "Tạo"}
          </button>
        </form>
        {msg && (
          <p className={`text-sm ${msg.type === "ok" ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>
        )}
      </section>

      <section className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Họ tên</th>
              <th className="px-4 py-2 font-medium">Vai trò</th>
              <th className="px-4 py-2 font-medium">Ngày tạo</th>
              <th className="px-4 py-2 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.full_name || "-"}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    u.role === "admin" ? "bg-purple-100 text-purple-700" :
                    u.role === "viewer" ? "bg-teal-100 text-teal-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {u.role === "admin" ? "Admin" : u.role === "viewer" ? "Xem tất cả" : "Nhân viên"}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-600">{u.created_at_display}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => onReset(u)} className="text-xs px-2 py-1 border rounded hover:bg-slate-50">Đổi MK</button>
                  {u.id !== currentUserId && (
                    <button onClick={() => onDelete(u)} className="text-xs px-2 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50">Xóa</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
