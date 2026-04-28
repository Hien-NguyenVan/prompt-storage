import Link from "next/link";
import ImageGridSplitter from "@/components/tools/ImageGridSplitter";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("image-grid-splitter")!;

export const metadata = { title: tool.name };

export default function ImageGridSplitterPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/tools" className="text-slate-500 hover:text-brand-700">
          Tools
        </Link>
        <span className="text-slate-400">/</span>
        <span className="font-medium">{tool.name}</span>
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">{tool.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{tool.description}</p>
      </div>
      <ImageGridSplitter />
    </div>
  );
}
