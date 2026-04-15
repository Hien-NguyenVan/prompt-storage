import { SkelBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div>
        <SkelBar className="h-4 w-40 mb-2" />
        <SkelBar className="h-7 w-80" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => <SkelBar key={i} className="h-4 w-32" />)}
      </div>
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <SkelBar className="h-5 w-40" />
        <SkelBar className="h-24 w-full" />
      </div>
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <SkelBar className="h-5 w-40" />
        <SkelBar className="h-24 w-full" />
      </div>
    </div>
  );
}
