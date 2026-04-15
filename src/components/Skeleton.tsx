export function SkelBar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`} />;
}

export function SkelList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white border rounded-lg p-3 flex items-center gap-3">
          <SkelBar className="h-4 w-1/3" />
          <SkelBar className="h-4 w-16" />
          <SkelBar className="h-4 w-20" />
          <SkelBar className="h-4 w-24 ml-auto" />
        </div>
      ))}
    </div>
  );
}
