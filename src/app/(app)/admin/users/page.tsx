import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import UsersPanel from "@/components/UsersPanel";

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session!.user;
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/");

  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Quản lý nhân viên</h1>
      <UsersPanel users={(users ?? []).map((u) => ({ ...u, created_at_display: formatDate(u.created_at) }))} currentUserId={user!.id} />
    </div>
  );
}
