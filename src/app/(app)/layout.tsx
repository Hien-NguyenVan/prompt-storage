import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <Link href="/" className="font-semibold text-brand-700">Kho Prompt</Link>
          <nav className="flex-1 flex items-center gap-4 text-sm">
            <Link href="/" className="hover:text-brand-600">Danh sách</Link>
            <Link href="/sets/new" className="hover:text-brand-600">Tạo bộ mới</Link>
            {isAdmin && <Link href="/admin/users" className="hover:text-brand-600">Quản lý nhân viên</Link>}
          </nav>
          <div className="text-sm text-slate-600 flex items-center gap-3">
            <span>{profile?.full_name || profile?.email}{isAdmin && " (Admin)"}</span>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
