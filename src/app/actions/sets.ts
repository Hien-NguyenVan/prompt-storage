"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ImageRefInput = {
  id: string; // client-gen uuid
  name: string;
  prompt_text: string;
  order_index: number;
};

export type SubVideoInput = {
  id: string;
  order_index: number;
  type: "t2v" | "i2v_multiref" | "i2v_firstlast";
  video_prompt: string;
  video_ref_source_order: number | null;
  image_ref_ids: string[];
  frame_refs: {
    first?: { image_ref_id: string | null; source_video_order: number | null };
    last?: { image_ref_id: string | null; source_video_order: number | null };
  };
};

export type SavePayload = {
  id?: string; // set id for edit
  name: string;
  model: string;
  image_refs: ImageRefInput[];
  sub_videos: SubVideoInput[];
};

export async function savePromptSet(payload: SavePayload) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập" };

  if (!payload.name.trim()) return { error: "Vui lòng nhập tên bộ" };
  if (!payload.model) return { error: "Vui lòng chọn model" };
  if (payload.sub_videos.length === 0) return { error: "Phải có ít nhất 1 video" };

  let setId = payload.id;

  if (!setId) {
    const { data, error } = await supabase
      .from("prompt_sets")
      .insert({ name: payload.name.trim(), model: payload.model, created_by: user.id })
      .select("id")
      .single();
    if (error) return { error: error.message };
    setId = data.id;
  } else {
    const { error } = await supabase
      .from("prompt_sets")
      .update({ name: payload.name.trim(), model: payload.model })
      .eq("id", setId);
    if (error) return { error: error.message };

    // fetch existing image_refs to detect deletions
    const { data: existingRefs } = await supabase
      .from("image_refs")
      .select("id")
      .eq("set_id", setId);
    const newIds = new Set(payload.image_refs.map((r) => r.id));
    const toDelete = (existingRefs ?? []).filter((r) => !newIds.has(r.id)).map((r) => r.id);

    // delete all sub_videos first (cascades svir/svfr) — lets us rebuild and also frees up image_ref FK refs
    const { error: delSvErr } = await supabase.from("sub_videos").delete().eq("set_id", setId);
    if (delSvErr) return { error: delSvErr.message };

    // now we can delete image_refs safely (unless referenced — but we just cleared all)
    if (toDelete.length > 0) {
      const { error: delRefErr } = await supabase.from("image_refs").delete().in("id", toDelete);
      if (delRefErr) return { error: "Không thể xóa ảnh tham chiếu: " + delRefErr.message };
    }
  }

  // Upsert image_refs
  if (payload.image_refs.length > 0) {
    const rows = payload.image_refs.map((r) => ({
      id: r.id,
      set_id: setId,
      name: r.name.trim() || "Chưa đặt tên",
      prompt_text: r.prompt_text,
      order_index: r.order_index,
    }));
    const { error } = await supabase.from("image_refs").upsert(rows);
    if (error) return { error: "Lỗi lưu ảnh tham chiếu: " + error.message };
  }

  // Insert sub_videos
  const svRows = payload.sub_videos.map((sv) => ({
    id: sv.id,
    set_id: setId,
    order_index: sv.order_index,
    type: sv.type,
    video_prompt: sv.video_prompt,
    video_ref_source_order: sv.type === "i2v_multiref" ? sv.video_ref_source_order : null,
  }));
  const { error: svErr } = await supabase.from("sub_videos").insert(svRows);
  if (svErr) return { error: "Lỗi lưu video: " + svErr.message };

  // Insert sub_video_image_refs
  const svirRows: { sub_video_id: string; image_ref_id: string }[] = [];
  for (const sv of payload.sub_videos) {
    if (sv.type === "i2v_multiref") {
      for (const rid of sv.image_ref_ids) {
        svirRows.push({ sub_video_id: sv.id, image_ref_id: rid });
      }
    }
  }
  if (svirRows.length > 0) {
    const { error } = await supabase.from("sub_video_image_refs").insert(svirRows);
    if (error) return { error: "Lỗi lưu liên kết ảnh: " + error.message };
  }

  // Insert frame_refs
  const frRows: any[] = [];
  for (const sv of payload.sub_videos) {
    if (sv.type === "i2v_firstlast") {
      for (const pos of ["first", "last"] as const) {
        const fr = sv.frame_refs[pos];
        if (!fr) continue;
        if (!fr.image_ref_id && fr.source_video_order == null) continue;
        frRows.push({
          sub_video_id: sv.id,
          position: pos,
          image_ref_id: fr.image_ref_id,
          source_video_order: fr.source_video_order,
        });
      }
    }
  }
  if (frRows.length > 0) {
    const { error } = await supabase.from("sub_video_frame_refs").insert(frRows);
    if (error) return { error: "Lỗi lưu frame: " + error.message };
  }

  revalidatePath("/");
  revalidatePath(`/sets/${setId}`);
  redirect(`/sets/${setId}`);
}

export async function deletePromptSet(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("prompt_sets").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  redirect("/");
}
