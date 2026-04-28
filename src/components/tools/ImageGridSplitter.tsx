"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  splitGrid,
  segmentsToCells,
  type Cell,
  type SplitResult,
} from "@/lib/tools/grid-split";

export default function ImageGridSplitter() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [sensitivity, setSensitivity] = useState(0.55);
  const [minLine, setMinLine] = useState(1);
  const [extraTrim, setExtraTrim] = useState(0);
  const [showLines, setShowLines] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);

  function loadFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setFileName(file.name);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      setImgEl(img);
      setImageData(data);
    };
    img.src = url;
  }

  const split = useMemo<SplitResult | null>(() => {
    if (!imageData) return null;
    return splitGrid(imageData, { sensitivity, minLine, extraTrim });
  }, [imageData, sensitivity, minLine, extraTrim]);

  const cells = useMemo<Cell[]>(() => {
    if (!split) return [];
    return segmentsToCells(split.rowSegs, split.colSegs);
  }, [split]);

  useEffect(() => {
    const wrap = previewWrapRef.current;
    if (!wrap || !imgEl || !imageData || !split) return;
    wrap.innerHTML = "";
    const W = imageData.width;
    const H = imageData.height;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(imgEl, 0, 0);
    if (showLines) {
      ctx.fillStyle = "rgba(255, 70, 90, 0.35)";
      for (const g of split.visualGapsY) ctx.fillRect(0, g.s, W, g.e - g.s + 1);
      for (const g of split.visualGapsX) ctx.fillRect(g.s, 0, g.e - g.s + 1, H);
      ctx.strokeStyle = "rgba(79,140,255,0.95)";
      ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.0025);
      for (const rs of split.rowSegs) {
        for (const cs of split.colSegs) {
          ctx.strokeRect(
            cs.start + 0.5,
            rs.start + 0.5,
            cs.end - cs.start - 1,
            rs.end - rs.start - 1,
          );
        }
      }
    }
    canvas.style.maxWidth = "100%";
    canvas.style.height = "auto";
    canvas.style.display = "block";
    wrap.appendChild(canvas);
  }, [imgEl, imageData, split, showLines]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxSrc(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const W = imageData?.width ?? 0;
  const H = imageData?.height ?? 0;

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4">
      <aside className="bg-white border rounded-xl p-4 space-y-5 self-start">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            1. Chọn ảnh
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm px-3 py-2 rounded-md"
          >
            Chọn ảnh từ máy...
          </button>
          <p className="text-xs text-slate-500 mt-2 break-words">
            {fileName ? `Đã chọn: ${fileName}` : "Chưa chọn ảnh nào."}
          </p>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            2. Tham số phát hiện
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-600 flex justify-between">
                <span>Độ nhạy phát hiện đường lưới</span>
                <span className="font-mono text-slate-700">{sensitivity.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min={0.1}
                max={0.95}
                step={0.01}
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="w-full accent-brand-600"
              />
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Kéo phải nếu đường lưới mờ, kéo trái nếu nhận quá nhiều dòng.
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">
                Độ dày tối thiểu của đường lưới (px)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={minLine}
                onChange={(e) => setMinLine(parseInt(e.target.value) || 1)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Padding bổ sung (px)</label>
              <input
                type="number"
                min={0}
                max={50}
                value={extraTrim}
                onChange={(e) => setExtraTrim(parseInt(e.target.value) || 0)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Để <b>0</b> = tự dò rìa chính xác. Chỉ tăng nếu vẫn còn dính viền.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showLines}
                onChange={(e) => setShowLines(e.target.checked)}
                className="accent-brand-600"
              />
              Hiện đường lưới phát hiện
            </label>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-snug">
          💡 Mỗi ảnh con sẽ có nút <b>Copy</b> để sao chép ảnh vào clipboard. Yêu cầu Chrome/Edge/Firefox mới.
        </p>
      </aside>

      <section className="space-y-4 min-w-0">
        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Xem trước
          </h2>
          {imageData ? (
            <>
              <div
                ref={previewWrapRef}
                className="bg-slate-100 border rounded-lg overflow-hidden flex items-center justify-center min-h-[200px]"
              />
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
                <span>
                  Kích thước: <b className="text-slate-700">{W} × {H}</b>
                </span>
                <span>
                  Phát hiện:{" "}
                  <b className="text-slate-700">
                    {split?.rowSegs.length ?? 0} hàng × {split?.colSegs.length ?? 0} cột
                  </b>
                </span>
                <span>
                  Tổng: <b className="text-slate-700">{cells.length}</b> ảnh con
                </span>
              </div>
            </>
          ) : (
            <div className="bg-slate-100 border rounded-lg text-slate-500 text-sm py-16 text-center">
              Chưa có ảnh — bấm "Chọn ảnh từ máy" để bắt đầu
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Các ảnh con đã cắt
          </h2>
          {cells.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có ảnh để hiển thị.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
              {imgEl &&
                cells.map((cell, i) => (
                  <CropCard
                    key={`${cell.r}-${cell.c}-${i}`}
                    cell={cell}
                    img={imgEl}
                    onZoom={setLightboxSrc}
                  />
                ))}
            </div>
          )}
        </div>
      </section>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-5 w-9 h-9 rounded-full border bg-white text-slate-700 text-lg leading-none"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxSrc(null);
            }}
            aria-label="Đóng"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt=""
            className="max-w-full max-h-full rounded shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

function CropCard({
  cell,
  img,
  onZoom,
}: {
  cell: Cell;
  img: HTMLImageElement;
  onZoom: (src: string) => void;
}) {
  const dataUrl = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = cell.w;
    c.height = cell.h;
    c.getContext("2d")!.drawImage(img, cell.x, cell.y, cell.w, cell.h, 0, 0, cell.w, cell.h);
    return c.toDataURL("image/png");
  }, [cell, img]);

  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  async function copy() {
    try {
      if (!navigator.clipboard || !window.ClipboardItem) {
        throw new Error("Trình duyệt không hỗ trợ copy ảnh.");
      }
      const blob = await new Promise<Blob | null>((res) => {
        const c = document.createElement("canvas");
        c.width = cell.w;
        c.height = cell.h;
        c.getContext("2d")!.drawImage(img, cell.x, cell.y, cell.w, cell.h, 0, 0, cell.w, cell.h);
        c.toBlob(res, "image/png");
      });
      if (!blob) throw new Error("Không tạo được ảnh.");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 1200);
    } catch (err) {
      console.error(err);
      setStatus("err");
      setTimeout(() => setStatus("idle"), 1500);
    }
  }

  const wrapClass =
    status === "ok"
      ? "border-emerald-400 ring-1 ring-emerald-400"
      : "border-slate-200";

  return (
    <div className={`bg-slate-50 border rounded-lg overflow-hidden ${wrapClass}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt=""
        title="Bấm để xem ảnh lớn"
        className="block w-full h-auto cursor-zoom-in"
        onClick={() => onZoom(dataUrl)}
      />
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-[11px] text-slate-500">
        <span>
          {cell.w}×{cell.h}
        </span>
        <div className="flex items-center gap-1.5">
          {status === "ok" && (
            <span className="text-emerald-600 font-semibold">đã copy</span>
          )}
          <button
            type="button"
            onClick={copy}
            className={`px-2 py-0.5 text-[11px] rounded border transition ${
              status === "ok"
                ? "bg-emerald-500 border-emerald-500 text-white"
                : status === "err"
                ? "bg-rose-500 border-rose-500 text-white"
                : "border-slate-300 hover:bg-brand-600 hover:border-brand-600 hover:text-white"
            }`}
          >
            {status === "ok" ? "✓" : status === "err" ? "✗ Lỗi" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
