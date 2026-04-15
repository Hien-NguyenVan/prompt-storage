import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const VN_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
});

export function formatDate(iso: string) {
  const parts = VN_FORMATTER.formatToParts(new Date(iso));
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${p("day")}/${p("month")}/${p("year")} ${p("hour")}:${p("minute")}`;
}

export function detectSetType(subVideoCount: number): "don" | "ghep" {
  return subVideoCount <= 1 ? "don" : "ghep";
}

const VN_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric", month: "2-digit", day: "2-digit",
});

export function vnDateKey(iso: string | Date): string {
  return VN_DAY_FORMATTER.format(typeof iso === "string" ? new Date(iso) : iso);
}

export function formatDateHeading(key: string): string {
  const todayKey = vnDateKey(new Date());
  const yest = new Date();
  yest.setUTCDate(yest.getUTCDate() - 1);
  const yestKey = vnDateKey(yest);
  if (key === todayKey) return "Hôm nay";
  if (key === yestKey) return "Hôm qua";
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
}
