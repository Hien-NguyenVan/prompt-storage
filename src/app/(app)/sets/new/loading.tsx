import { SkelBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <SkelBar className="h-8 w-60" />
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <SkelBar className="h-5 w-40" />
        <SkelBar className="h-10 w-full" />
        <SkelBar className="h-10 w-48" />
      </div>
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <SkelBar className="h-5 w-40" />
        <SkelBar className="h-24 w-full" />
      </div>
    </div>
  );
}
