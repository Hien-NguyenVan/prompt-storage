export type Gap = { s: number; e: number };
export type Segment = { start: number; end: number };
export type Cell = { r: number; c: number; x: number; y: number; w: number; h: number };

export type SplitParams = {
  sensitivity: number;
  minLine: number;
  extraTrim: number;
};

export type SplitResult = {
  rowSegs: Segment[];
  colSegs: Segment[];
  visualGapsY: Gap[];
  visualGapsX: Gap[];
};

export function computeUniformity(imageData: ImageData, axis: "h" | "v"): Float32Array {
  const w = imageData.width;
  const h = imageData.height;
  const data = imageData.data;
  const length = axis === "h" ? h : w;
  const cross = axis === "h" ? w : h;
  const scores = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    let sum = 0;
    let sumSq = 0;
    const step = Math.max(1, Math.floor(cross / 200));
    let n = 0;
    for (let j = 0; j < cross; j += step) {
      const x = axis === "h" ? j : i;
      const y = axis === "h" ? i : j;
      const idx = (y * w + x) * 4;
      const v = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      sum += v;
      sumSq += v * v;
      n++;
    }
    const mean = sum / n;
    const variance = Math.max(0, sumSq / n - mean * mean);
    const std = Math.sqrt(variance);
    scores[i] = 1 / (1 + std / 8);
  }
  return scores;
}

export function findSeparators(
  scores: Float32Array,
  sensitivity: number,
  minWidth: number,
  totalLength: number,
): { innerGaps: Gap[]; startCrop: number; endCrop: number } {
  let max = 0;
  let min = 1;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > max) max = scores[i];
    if (scores[i] < min) min = scores[i];
  }
  const threshold = min + (max - min) * sensitivity;

  const groups: Gap[] = [];
  let start = -1;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] >= threshold) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      if (i - start >= minWidth) groups.push({ s: start, e: i - 1 });
      start = -1;
    }
  }
  if (start !== -1 && scores.length - start >= minWidth) {
    groups.push({ s: start, e: scores.length - 1 });
  }

  let startCrop = 0;
  let endCrop = totalLength;
  const innerGaps: Gap[] = [];
  for (const g of groups) {
    if (g.s <= 1) startCrop = Math.max(startCrop, g.e + 1);
    else if (g.e >= totalLength - 2) endCrop = Math.min(endCrop, g.s);
    else innerGaps.push(g);
  }
  return { innerGaps, startCrop, endCrop };
}

function sampleLine(imageData: ImageData, axis: "h" | "v", idx: number): [number, number, number] {
  const w = imageData.width;
  const h = imageData.height;
  const data = imageData.data;
  const cross = axis === "h" ? w : h;
  const step = Math.max(1, Math.floor(cross / 120));
  let sR = 0;
  let sG = 0;
  let sB = 0;
  let n = 0;
  for (let j = 0; j < cross; j += step) {
    const x = axis === "h" ? j : idx;
    const y = axis === "h" ? idx : j;
    const di = (y * w + x) * 4;
    sR += data[di];
    sG += data[di + 1];
    sB += data[di + 2];
    n++;
  }
  return [sR / n, sG / n, sB / n];
}

export function expandGap(
  imageData: ImageData,
  gap: Gap,
  axis: "h" | "v",
  totalLength: number,
  tolerance = 14,
  maxExpand = 30,
): Gap {
  const center = Math.floor((gap.s + gap.e) / 2);
  const [cr, cg, cb] = sampleLine(imageData, axis, center);
  const close = (idx: number) => {
    const [r, g, b] = sampleLine(imageData, axis, idx);
    return Math.max(Math.abs(r - cr), Math.abs(g - cg), Math.abs(b - cb)) <= tolerance;
  };
  let s = gap.s;
  let e = gap.e;
  let steps = 0;
  while (s > 0 && steps < maxExpand && close(s - 1)) {
    s--;
    steps++;
  }
  steps = 0;
  while (e < totalLength - 1 && steps < maxExpand && close(e + 1)) {
    e++;
    steps++;
  }
  return { s, e };
}

export function buildSegments(start: number, end: number, gaps: Gap[], pad: number, total: number): Segment[] {
  const segs: Segment[] = [];
  let cur = Math.max(0, start + pad);
  for (const g of gaps) {
    const segEnd = g.s - pad;
    if (segEnd > cur) segs.push({ start: cur, end: segEnd });
    cur = g.e + 1 + pad;
  }
  const lastEnd = Math.min(total, end - pad);
  if (lastEnd > cur) segs.push({ start: cur, end: lastEnd });
  return segs;
}

export function splitGrid(imageData: ImageData, params: SplitParams): SplitResult {
  const W = imageData.width;
  const H = imageData.height;
  const sens = params.sensitivity;
  const minWidth = Math.max(1, params.minLine);
  const pad = Math.max(0, params.extraTrim);

  const rowScores = computeUniformity(imageData, "h");
  const colScores = computeUniformity(imageData, "v");
  const r = findSeparators(rowScores, sens, minWidth, H);
  const c = findSeparators(colScores, sens, minWidth, W);

  const rGaps = r.innerGaps.map((g) => expandGap(imageData, g, "h", H));
  const cGaps = c.innerGaps.map((g) => expandGap(imageData, g, "v", W));

  let topCrop = r.startCrop;
  let bottomCrop = r.endCrop;
  let leftCrop = c.startCrop;
  let rightCrop = c.endCrop;
  if (topCrop > 0) topCrop = expandGap(imageData, { s: 0, e: topCrop - 1 }, "h", H).e + 1;
  if (bottomCrop < H) bottomCrop = expandGap(imageData, { s: bottomCrop, e: H - 1 }, "h", H).s;
  if (leftCrop > 0) leftCrop = expandGap(imageData, { s: 0, e: leftCrop - 1 }, "v", W).e + 1;
  if (rightCrop < W) rightCrop = expandGap(imageData, { s: rightCrop, e: W - 1 }, "v", W).s;

  const rowSegs = buildSegments(topCrop, bottomCrop, rGaps, pad, H);
  const colSegs = buildSegments(leftCrop, rightCrop, cGaps, pad, W);

  const visualGapsY: Gap[] = [];
  const visualGapsX: Gap[] = [];
  if (topCrop > 0) visualGapsY.push({ s: 0, e: topCrop - 1 });
  visualGapsY.push(...rGaps);
  if (bottomCrop < H) visualGapsY.push({ s: bottomCrop, e: H - 1 });
  if (leftCrop > 0) visualGapsX.push({ s: 0, e: leftCrop - 1 });
  visualGapsX.push(...cGaps);
  if (rightCrop < W) visualGapsX.push({ s: rightCrop, e: W - 1 });

  return { rowSegs, colSegs, visualGapsY, visualGapsX };
}

export function segmentsToCells(rowSegs: Segment[], colSegs: Segment[]): Cell[] {
  const cells: Cell[] = [];
  rowSegs.forEach((rs, r) => {
    colSegs.forEach((cs, c) => {
      const w = cs.end - cs.start;
      const h = rs.end - rs.start;
      if (w > 0 && h > 0) cells.push({ r, c, x: cs.start, y: rs.start, w, h });
    });
  });
  return cells;
}
