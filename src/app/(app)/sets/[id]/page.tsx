import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import CopyButton from "@/components/CopyButton";
import DeleteSetButton from "@/components/DeleteSetButton";

export default async function SetDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session!.user;

  // Parallelize all queries
  const [meRes, setRes, refsRes, subsRes] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("prompt_sets")
      .select("id, name, model, created_at, updated_at, created_by, profiles:created_by(email, full_name)")
      .eq("id", params.id).single(),
    supabase.from("image_refs").select("*").eq("set_id", params.id).order("order_index"),
    supabase.from("sub_videos")
      .select("*, sub_video_image_refs(image_ref_id), sub_video_frame_refs(*)")
      .eq("set_id", params.id).order("order_index"),
  ]);
  const isAdmin = meRes.data?.role === "admin";
  const set = setRes.data;
  if (!set) notFound();
  const isOwner = set.created_by === user.id;
  const canEdit = isOwner || isAdmin;
  const refs = refsRes.data;
  const subs = subsRes.data;

  const refMap = new Map((refs ?? []).map((r, i) => [r.id, { ...r, display: i + 1 }]));
  const loai = (subs?.length ?? 0) <= 1 ? "Đơn" : "Ghép";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-brand-600">← Quay lại danh sách</Link>
          <h1 className="text-2xl font-semibold mt-1">{set.name}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-slate-600 mt-1">
            <span>Loại: <b>{loai}</b></span>
            <span>Model: <b>{set.model}</b></span>
            <span>Số video: <b>{subs?.length ?? 0}</b></span>
            <span>Người tạo: <b>{(set as any).profiles?.full_name || (set as any).profiles?.email}</b></span>
            <span>Tạo: {formatDate(set.created_at)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && <Link href={`/sets/${set.id}/edit`} className="text-sm px-3 py-1.5 border rounded hover:bg-slate-50">Sửa</Link>}
          {isAdmin && <DeleteSetButton id={set.id} />}
        </div>
      </div>

      {/* Kho ref */}
      {(refs?.length ?? 0) > 0 && (
        <section className="bg-white border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold">Kho ảnh tham chiếu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {refs!.map((r, i) => (
              <div key={r.id} className="border rounded p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="bg-slate-200 text-xs px-2 py-0.5 rounded mr-2">img-{i + 1}</span>
                    <b>{r.name}</b>
                  </div>
                  <CopyButton text={r.prompt_text} label="Copy prompt" />
                </div>
                <pre className="text-xs whitespace-pre-wrap font-mono bg-white border rounded p-2">{r.prompt_text}</pre>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Video con */}
      <section className="space-y-3">
        <h2 className="font-semibold">Prompt video</h2>
        {(subs ?? []).map((sv: any, idx: number) => {
          const typeLabel = sv.type === "t2v" ? "T2V" : sv.type === "i2v_multiref" ? "I2V Multi Ref" : "I2V First & Last";
          const linkedRefs: any[] = (sv.sub_video_image_refs ?? []).map((x: any) => refMap.get(x.image_ref_id)).filter(Boolean);
          const frames: any[] = sv.sub_video_frame_refs ?? [];
          return (
            <div key={sv.id} className="bg-white border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-brand-50 text-brand-700 text-xs font-medium px-2 py-1 rounded">Video #{idx + 1}</span>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded">{typeLabel}</span>
                </div>
                <CopyButton text={sv.video_prompt} label="Copy prompt video" />
              </div>
              <pre className="text-sm whitespace-pre-wrap font-mono bg-slate-50 border rounded p-3">{sv.video_prompt}</pre>

              {sv.type === "i2v_multiref" && (
                <div className="text-sm space-y-1">
                  <div><b>Ảnh tham chiếu:</b> {linkedRefs.length === 0 ? <i className="text-slate-400">không có</i> : linkedRefs.map((r) => `img-${r.display} (${r.name})`).join(", ")}</div>
                  {sv.video_ref_source_order && <div><b>Video ref:</b> Dùng Video #{sv.video_ref_source_order} cùng bộ</div>}
                </div>
              )}
              {sv.type === "i2v_firstlast" && (
                <div className="text-sm space-y-1">
                  {["first", "last"].map((pos) => {
                    const fr = frames.find((f: any) => f.position === pos);
                    if (!fr) return <div key={pos}><b>{pos === "first" ? "First" : "Last"} frame:</b> <i className="text-slate-400">không có</i></div>;
                    const detail = fr.image_ref_id
                      ? `img-${refMap.get(fr.image_ref_id)?.display} (${refMap.get(fr.image_ref_id)?.name})`
                      : `End frame của Video #${fr.source_video_order}`;
                    return <div key={pos}><b>{pos === "first" ? "First" : "Last"} frame:</b> {detail}</div>;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
