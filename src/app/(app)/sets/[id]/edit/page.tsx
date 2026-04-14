import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PromptSetForm from "@/components/PromptSetForm";

export default async function EditSetPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: set } = await supabase.from("prompt_sets").select("*").eq("id", params.id).single();
  if (!set) notFound();

  const { data: refs } = await supabase
    .from("image_refs").select("*").eq("set_id", params.id).order("order_index");

  const { data: subs } = await supabase
    .from("sub_videos")
    .select("*, sub_video_image_refs(image_ref_id), sub_video_frame_refs(*)")
    .eq("set_id", params.id)
    .order("order_index");

  const initial = {
    id: set.id,
    name: set.name,
    model: set.model,
    image_refs: (refs ?? []).map((r: any) => ({ id: r.id, name: r.name, prompt_text: r.prompt_text })),
    sub_videos: (subs ?? []).map((sv: any) => {
      const base: any = {
        id: sv.id,
        type: sv.type,
        video_prompt: sv.video_prompt,
        video_ref_source_order: sv.video_ref_source_order,
        image_ref_ids: (sv.sub_video_image_refs ?? []).map((x: any) => x.image_ref_id),
      };
      if (sv.type === "i2v_firstlast") {
        const frames = sv.sub_video_frame_refs ?? [];
        const first = frames.find((f: any) => f.position === "first");
        const last = frames.find((f: any) => f.position === "last");
        if (first) base.first = { image_ref_id: first.image_ref_id, source_video_order: first.source_video_order };
        if (last) base.last = { image_ref_id: last.image_ref_id, source_video_order: last.source_video_order };
      }
      return base;
    }),
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Sửa bộ prompt</h1>
      <PromptSetForm initial={initial} />
    </div>
  );
}
