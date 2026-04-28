import Link from "next/link";
import { TOOLS } from "@/lib/tools/registry";

export const metadata = { title: "Tools" };

export default function ToolsIndexPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Tools</h1>
        <p className="text-sm text-slate-500 mt-1">Bộ công cụ dùng chung cho cả nhóm.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TOOLS.map((t) => (
          <Link
            key={t.slug}
            href={`/tools/${t.slug}`}
            className="block bg-white border rounded-xl p-4 hover:border-brand-500 hover:shadow-sm transition"
          >
            <div className="font-medium text-brand-700">{t.name}</div>
            <p className="text-sm text-slate-500 mt-1">{t.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
