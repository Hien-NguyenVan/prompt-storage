"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập" };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return { error: "Chỉ admin mới có quyền này" };
  return { ok: true as const };
}

export async function getVisibilityRules(viewerId: string) {
  const check = await assertAdmin();
  if ("error" in check) return { error: check.error, targets: [] };
  const admin = createAdminClient();
  const { data } = await admin
    .from("visibility_rules")
    .select("target_id")
    .eq("viewer_id", viewerId);
  return { targets: (data ?? []).map((r) => r.target_id) };
}

export async function setVisibilityRules(viewerId: string, targetIds: string[]) {
  const check = await assertAdmin();
  if ("error" in check) return check;
  const admin = createAdminClient();

  // Xóa rules cũ
  await admin.from("visibility_rules").delete().eq("viewer_id", viewerId);

  // Insert rules mới (bỏ chính mình)
  const rows = targetIds
    .filter((t) => t !== viewerId)
    .map((target_id) => ({ viewer_id: viewerId, target_id }));
  if (rows.length > 0) {
    const { error } = await admin.from("visibility_rules").insert(rows);
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setAutoSeeNewUsers(userId: string, value: boolean) {
  const check = await assertAdmin();
  if ("error" in check) return check;
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ auto_see_new_users: value }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}
