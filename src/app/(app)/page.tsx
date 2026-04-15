import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatTime, vnDateKey, formatDateHeading } from "@/lib/utils";
import { AI_MODELS } from "@/lib/constants";
import FiltersBar from "@/components/FiltersBar";

function groupByDate(items: any[]): { dateKey: string; items: any[] }[] {
  const map = new Map<string, any[]>();
  for (const it of items) {
    const key = vnDateKey(it.created_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }
  return Array.from(map.entries()).map(([dateKey, items]) => ({ dateKey, items }));
}

type SearchParams = {
  q?: string;
  type?: string;
  model?: string;
  creator?: string;
  from?: string;
  to?: string;
  sort?: string;
};

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session!.user;
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = me?.role === "admin";
  const canSeeAll = me?.role === "admin" || me?.role === "viewer";

  let query = supabase
    .from("prompt_sets")
    .select("id, name, model, created_at, created_by, profiles:created_by(email, full_name), sub_videos(count)")
    .order("created_at", { ascending: searchParams.sort === "asc" });

  if (searchParams.q) query = query.ilike("name", `%${searchParams.q}%`);
  if (searchParams.model) query = query.eq("model", searchParams.model);
  if (searchParams.creator && canSeeAll) query = query.eq("created_by", searchParams.creator);
  if (searchParams.from) query = query.gte("created_at", searchParams.from);
  if (searchParams.to) query = query.lte("created_at", new Date(searchParams.to + "T23:59:59").toISOString());
  if (searchParams.sort === "name_asc") query = supabase
    .from("prompt_sets")
    .select("id, name, model, created_at, created_by, profiles:created_by(email, full_name), sub_videos(count)")
    .order("name", { ascending: true });

  const { data: sets, error } = await query;

  let filtered = (sets ?? []) as any[];
  if (searchParams.type === "don") filtered = filtered.filter((s) => (s.sub_videos?.[0]?.count ?? 0) <= 1);
  if (searchParams.type === "ghep") filtered = filtered.filter((s) => (s.sub_videos?.[0]?.count ?? 0) >= 2);

  const { data: allStaff } = canSeeAll
    ? await supabase.from("profiles").select("id, email, full_name").order("email")
    : { data: null };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-semibold truncate">Danh sách bộ prompt</h1>
        <Link href="/sets/new" className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-3 py-2 rounded-md whitespace-nowrap shrink-0">
          + Tạo bộ
        </Link>
      </div>

      <FiltersBar
        isAdmin={canSeeAll}
        models={AI_MODELS as unknown as string[]}
        staff={allStaff ?? []}
        initial={searchParams}
      />

      {error && <p className="text-red-600 text-sm">Lỗi: {error.message}</p>}

      {filtered.length === 0 ? (
        <div className="bg-white border rounded-xl py-12 text-center text-slate-500 text-sm">Chưa có bộ prompt nào</div>
      ) : (
        <div className="space-y-6">
          {groupByDate(filtered).map(({ dateKey, items }) => (
            <div key={dateKey} className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-slate-600">{formatDateHeading(dateKey)}</h2>
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">{items.length} bộ</span>
              </div>
              <div className="space-y-2">
                {items.map((s: any) => {
                  const count = s.sub_videos?.[0]?.count ?? 0;
                  const loai = count <= 1 ? "Đơn" : "Ghép";
                  return (
                    <Link key={s.id} href={`/sets/${s.id}`}
                      className="block bg-white border rounded-xl p-3 hover:border-brand-500 hover:shadow-sm transition">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-brand-700 truncate">{s.name}</div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] ${loai === "Đơn" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>{loai}</span>
                            <span>{s.model}</span>
                            <span>{count} video</span>
                            {canSeeAll && <span className="truncate">· {s.profiles?.full_name || s.profiles?.email}</span>}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 whitespace-nowrap">{formatTime(s.created_at)}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
