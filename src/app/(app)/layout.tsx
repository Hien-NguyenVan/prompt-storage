import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import NavProgress from "@/components/NavProgress";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const user = session.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-screen">
      <NavProgress />
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-4">
          <Link href="/" className="font-semibold text-brand-700 shrink-0">Kho Prompt</Link>
          <nav className="flex-1 flex items-center gap-2 sm:gap-4 text-sm overflow-x-auto scrollbar-hide">
            <Link href="/" className="hover:text-brand-600 shrink-0">Danh sách</Link>
            <Link href="/sets/new" className="hover:text-brand-600 shrink-0">Tạo bộ</Link>
            <Link href="/tools" className="hover:text-brand-600 shrink-0">Tools</Link>
            {isAdmin && <Link href="/admin/users" className="hover:text-brand-600 shrink-0">Nhân viên</Link>}
          </nav>
          <div className="text-sm text-slate-600 flex items-center gap-2 shrink-0">
            <span className="hidden md:inline max-w-[160px] truncate">
              {profile?.full_name || profile?.email}{isAdmin && " (Admin)"}
            </span>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">{children}</main>
    </div>
  );
}
