import { SkelBar, SkelList } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <SkelBar className="h-8 w-60" />
      <div className="bg-white border rounded-xl p-4"><SkelBar className="h-24 w-full" /></div>
      <SkelList rows={4} />
    </div>
  );
}
