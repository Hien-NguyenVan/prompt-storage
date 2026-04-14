"use client";
import { useMemo, useState, useTransition } from "react";
import { AI_MODELS } from "@/lib/constants";
import { savePromptSet, type SavePayload } from "@/app/actions/sets";

type ImageRef = { id: string; name: string; prompt_text: string };
type FrameRef = { image_ref_id: string | null; source_video_order: number | null };
type SubVideo = {
  id: string;
  type: "t2v" | "i2v_multiref" | "i2v_firstlast";
  video_prompt: string;
  video_ref_source_order: number | null;
  image_ref_ids: string[];
  first?: FrameRef;
  last?: FrameRef;
};

type Initial = {
  id: string;
  name: string;
  model: string;
  image_refs: ImageRef[];
  sub_videos: SubVideo[];
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now();
}

export default function PromptSetForm({ initial }: { initial?: Initial }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [model, setModel] = useState(initial?.model ?? AI_MODELS[0]);
  const [imageRefs, setImageRefs] = useState<ImageRef[]>(initial?.image_refs ?? []);
  const [subVideos, setSubVideos] = useState<SubVideo[]>(
    initial?.sub_videos ?? [
      { id: uid(), type: "t2v", video_prompt: "", video_ref_source_order: null, image_ref_ids: [] },
    ],
  );
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setType = useMemo(() => (subVideos.length <= 1 ? "Đơn" : "Ghép"), [subVideos.length]);

  function addImageRef(preset?: Partial<ImageRef>) {
    const r: ImageRef = { id: uid(), name: preset?.name ?? "", prompt_text: preset?.prompt_text ?? "" };
    setImageRefs((x) => [...x, r]);
    return r.id;
  }
  function updateImageRef(id: string, patch: Partial<ImageRef>) {
    setImageRefs((x) => x.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeImageRef(id: string) {
    const usedIn: number[] = [];
    subVideos.forEach((sv, idx) => {
      if (sv.image_ref_ids.includes(id)) usedIn.push(idx + 1);
      if (sv.first?.image_ref_id === id) usedIn.push(idx + 1);
      if (sv.last?.image_ref_id === id) usedIn.push(idx + 1);
    });
    if (usedIn.length > 0) {
      alert(`Không thể xóa: ảnh này đang được Video ${[...new Set(usedIn)].join(", ")} sử dụng. Vui lòng bỏ chọn trước khi xóa.`);
      return;
    }
    setImageRefs((x) => x.filter((r) => r.id !== id));
  }

  function addSubVideo() {
    setSubVideos((x) => [
      ...x,
      { id: uid(), type: "t2v", video_prompt: "", video_ref_source_order: null, image_ref_ids: [] },
    ]);
  }
  function removeSubVideo(id: string) {
    if (subVideos.length <= 1) return;
    setSubVideos((x) => x.filter((s) => s.id !== id));
  }
  function updateSubVideo(id: string, patch: Partial<SubVideo>) {
    setSubVideos((x) => x.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function toggleImgRefOnSub(svId: string, refId: string) {
    setSubVideos((x) =>
      x.map((s) => {
        if (s.id !== svId) return s;
        const has = s.image_ref_ids.includes(refId);
        return { ...s, image_ref_ids: has ? s.image_ref_ids.filter((r) => r !== refId) : [...s.image_ref_ids, refId] };
      }),
    );
  }
  function moveSubVideo(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= subVideos.length) return;
    setSubVideos((x) => {
      const arr = [...x];
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return arr;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const payload: SavePayload = {
      id: initial?.id,
      name: name.trim(),
      model,
      image_refs: imageRefs.map((r, i) => ({
        id: r.id,
        name: r.name,
        prompt_text: r.prompt_text,
        order_index: i,
      })),
      sub_videos: subVideos.map((sv, i) => ({
        id: sv.id,
        order_index: i,
        type: sv.type,
        video_prompt: sv.video_prompt,
        video_ref_source_order: sv.video_ref_source_order,
        image_ref_ids: sv.type === "i2v_multiref" ? sv.image_ref_ids : [],
        frame_refs:
          sv.type === "i2v_firstlast"
            ? {
                first: sv.first ?? undefined,
                last: sv.last ?? undefined,
              }
            : {},
      })),
    };
    startTransition(async () => {
      const res = await savePromptSet(payload);
      if (res && "error" in res) setErr(res.error as string);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Thông tin chung */}
      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Thông tin chung</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Tên bộ <span className="text-red-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full border rounded-md px-3 py-2 text-sm mt-1" placeholder="VD: TVC nước hoa hè 2026" />
          </div>
          <div>
            <label className="text-sm font-medium">Model AI</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm mt-1">
              {AI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="text-xs text-slate-500">Loại bộ (tự suy ra): <b>{setType}</b></div>
      </section>

      {/* Kho ảnh tham chiếu */}
      <section className="bg-white border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Kho ảnh tham chiếu</h2>
            <p className="text-xs text-slate-500">Dùng chung cho cả bộ. Tạo trước ở đây hoặc thêm mới ngay trong từng video.</p>
          </div>
          <button type="button" onClick={() => addImageRef()} className="text-sm px-3 py-1.5 border rounded-md hover:bg-slate-50">+ Thêm ảnh</button>
        </div>
        {imageRefs.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Chưa có ảnh tham chiếu.</p>
        ) : (
          <div className="space-y-2">
            {imageRefs.map((r, i) => (
              <div key={r.id} className="border rounded-md p-3 space-y-2 bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-200 px-2 py-0.5 rounded">img-{i + 1}</span>
                  <input value={r.name} onChange={(e) => updateImageRef(r.id, { name: e.target.value })}
                    placeholder="Tên ngắn (VD: Ảnh cô gái)" className="flex-1 border rounded px-2 py-1 text-sm bg-white" />
                  <button type="button" onClick={() => removeImageRef(r.id)} className="text-xs text-red-600 hover:underline">Xóa</button>
                </div>
                <textarea value={r.prompt_text} onChange={(e) => updateImageRef(r.id, { prompt_text: e.target.value })}
                  placeholder="Prompt dùng để tạo ảnh này..." rows={3}
                  className="w-full border rounded px-2 py-1 text-sm bg-white font-mono" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Video con */}
      <section className="bg-white border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Prompt video</h2>
          <button type="button" onClick={addSubVideo} className="text-sm px-3 py-1.5 bg-brand-600 text-white rounded-md hover:bg-brand-700">+ Thêm video</button>
        </div>

        {subVideos.map((sv, idx) => (
          <div key={sv.id} className="border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-brand-50 text-brand-700 text-xs font-medium px-2 py-1 rounded">Video #{idx + 1}</span>
                <select value={sv.type} onChange={(e) => updateSubVideo(sv.id, { type: e.target.value as any })}
                  className="border rounded px-2 py-1 text-sm">
                  <option value="t2v">T2V (Text to Video)</option>
                  <option value="i2v_multiref">I2V - Multi Reference</option>
                  <option value="i2v_firstlast">I2V - First & Last Frames</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" disabled={idx === 0} onClick={() => moveSubVideo(idx, -1)} className="text-xs px-2 py-1 border rounded disabled:opacity-40">↑</button>
                <button type="button" disabled={idx === subVideos.length - 1} onClick={() => moveSubVideo(idx, 1)} className="text-xs px-2 py-1 border rounded disabled:opacity-40">↓</button>
                {subVideos.length > 1 && (
                  <button type="button" onClick={() => removeSubVideo(sv.id)} className="text-xs text-red-600 hover:underline ml-2">Xóa</button>
                )}
              </div>
            </div>

            <textarea value={sv.video_prompt} onChange={(e) => updateSubVideo(sv.id, { video_prompt: e.target.value })}
              placeholder="Dán prompt tạo video ở đây..." rows={4}
              className="w-full border rounded px-2 py-1.5 text-sm font-mono" />

            {sv.type === "i2v_multiref" && (
              <div className="space-y-2 bg-slate-50 p-3 rounded">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Ảnh tham chiếu sử dụng</h4>
                  <button type="button" onClick={() => {
                    const newId = addImageRef({ name: `Ảnh mới cho V${idx + 1}` });
                    setTimeout(() => toggleImgRefOnSub(sv.id, newId), 0);
                  }} className="text-xs text-brand-700 hover:underline">+ Thêm ảnh mới vào kho</button>
                </div>
                {imageRefs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Kho chưa có ảnh nào. Bấm "Thêm ảnh mới vào kho" ở trên.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {imageRefs.map((r, ri) => (
                      <label key={r.id} className="flex items-start gap-2 text-sm bg-white border rounded px-2 py-1.5 cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={sv.image_ref_ids.includes(r.id)}
                          onChange={() => toggleImgRefOnSub(sv.id, r.id)} className="mt-0.5" />
                        <span><b>img-{ri + 1}</b> {r.name || <i className="text-slate-400">chưa đặt tên</i>}</span>
                      </label>
                    ))}
                  </div>
                )}
                {idx > 0 && (
                  <div className="pt-2 border-t">
                    <label className="text-sm">Video ref (tùy chọn): </label>
                    <select value={sv.video_ref_source_order ?? ""} onChange={(e) => updateSubVideo(sv.id, { video_ref_source_order: e.target.value ? Number(e.target.value) : null })}
                      className="border rounded px-2 py-1 text-sm">
                      <option value="">Không dùng</option>
                      {Array.from({ length: idx }).map((_, i) => (
                        <option key={i} value={i + 1}>Dùng Video #{i + 1} của bộ này</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {sv.type === "i2v_firstlast" && (
              <div className="space-y-3 bg-slate-50 p-3 rounded">
                {(["first", "last"] as const).map((pos) => {
                  const fr = sv[pos];
                  const mode = fr == null ? "" : fr.image_ref_id ? "img" : fr.source_video_order != null ? "end" : "";
                  return (
                    <div key={pos} className="space-y-1">
                      <h4 className="text-sm font-medium">{pos === "first" ? "First frame" : "Last frame"}</h4>
                      <select value={mode} onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") updateSubVideo(sv.id, { [pos]: undefined } as any);
                        else if (v === "img") updateSubVideo(sv.id, { [pos]: { image_ref_id: imageRefs[0]?.id ?? null, source_video_order: null } } as any);
                        else if (v === "end") updateSubVideo(sv.id, { [pos]: { image_ref_id: null, source_video_order: 1 } } as any);
                      }} className="border rounded px-2 py-1 text-sm">
                        <option value="">Không có</option>
                        <option value="img">Dùng ảnh từ kho</option>
                        {idx > 0 && <option value="end">Dùng end frame của video khác</option>}
                      </select>
                      {mode === "img" && (
                        <select value={fr?.image_ref_id ?? ""} onChange={(e) => updateSubVideo(sv.id, { [pos]: { image_ref_id: e.target.value, source_video_order: null } } as any)}
                          className="border rounded px-2 py-1 text-sm ml-2">
                          {imageRefs.length === 0 && <option value="">Kho chưa có ảnh</option>}
                          {imageRefs.map((r, ri) => (
                            <option key={r.id} value={r.id}>img-{ri + 1} — {r.name || "chưa đặt tên"}</option>
                          ))}
                        </select>
                      )}
                      {mode === "end" && (
                        <select value={fr?.source_video_order ?? ""} onChange={(e) => updateSubVideo(sv.id, { [pos]: { image_ref_id: null, source_video_order: Number(e.target.value) } } as any)}
                          className="border rounded px-2 py-1 text-sm ml-2">
                          {Array.from({ length: idx }).map((_, i) => (
                            <option key={i} value={i + 1}>End frame của Video #{i + 1}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </section>

      {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded">{err}</div>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-md">
          {pending ? "Đang lưu..." : initial ? "Lưu thay đổi" : "Tạo bộ prompt"}
        </button>
      </div>
    </form>
  );
}
