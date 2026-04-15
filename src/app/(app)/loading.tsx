import { SkelBar, SkelList } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SkelBar className="h-7 w-60" />
        <SkelBar className="h-8 w-28" />
      </div>
      <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => <SkelBar key={i} className="h-9 w-32" />)}
      </div>
      <SkelList rows={6} />
    </div>
  );
}
