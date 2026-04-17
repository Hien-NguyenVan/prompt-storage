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

export async function createStaffUser(formData: FormData) {
  const check = await assertAdmin();
  if ("error" in check) return check;

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "staff");
  const role = (["admin", "staff"].includes(roleRaw) ? roleRaw : "staff") as "admin" | "staff";
  const seeAllExisting = formData.get("see_all_existing") === "true";
  const visibleToAll = formData.get("visible_to_all") === "true";

  if (!email || !password) return { error: "Vui lòng nhập email và mật khẩu" };
  if (password.length < 6) return { error: "Mật khẩu tối thiểu 6 ký tự" };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role, see_all_existing: seeAllExisting, visible_to_all: visibleToAll },
  });
  if (error) return { error: error.message };

  // ensure profile row has correct role/full_name (trigger inserts defaults)
  await admin.from("profiles").update({ full_name, role }).eq("id", data.user!.id);

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteStaffUser(id: string) {
  const check = await assertAdmin();
  if ("error" in check) return check;
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateStaffRole(id: string, role: string) {
  const check = await assertAdmin();
  if ("error" in check) return check;
  if (!["admin", "staff"].includes(role)) return { error: "Vai trò không hợp lệ" };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && user.id === id && role !== "admin") {
    return { error: "Không thể hạ quyền tài khoản của chính bạn" };
  }

  const admin = createAdminClient();
  const { error: pErr } = await admin.from("profiles").update({ role }).eq("id", id);
  if (pErr) return { error: pErr.message };
  // cập nhật user_metadata để trigger sync luôn
  await admin.auth.admin.updateUserById(id, { user_metadata: { role } });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetStaffPassword(id: string, password: string) {
  const check = await assertAdmin();
  if ("error" in check) return check;
  if (password.length < 6) return { error: "Mật khẩu tối thiểu 6 ký tự" };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return { error: error.message };
  return { ok: true };
}
