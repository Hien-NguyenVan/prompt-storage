"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

const STORAGE_KEY = "saved_login";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.email) setEmail(saved.email);
        if (saved.password) setPassword(saved.password);
        setRemember(true);
      }
    } catch {}
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErr("Sai email hoặc mật khẩu");
      return;
    }
    try {
      if (remember) localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, password }));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Đăng nhập</h1>
          <p className="text-sm text-slate-500 mt-1">Kho Prompt Video AI</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Mật khẩu</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <label className="flex items-center gap-2 text-sm select-none">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Lưu mật khẩu
        </label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-md py-2 text-sm font-medium">
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
