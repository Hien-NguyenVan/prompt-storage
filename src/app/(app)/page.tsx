import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { AI_MODELS } from "@/lib/constants";
import FiltersBar from "@/components/FiltersBar";

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Danh sách bộ prompt</h1>
        <Link href="/sets/new" className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-md">
          + Tạo bộ mới
        </Link>
      </div>

      <FiltersBar
        isAdmin={canSeeAll}
        models={AI_MODELS as unknown as string[]}
        staff={allStaff ?? []}
        initial={searchParams}
      />

      {error && <p className="text-red-600 text-sm">Lỗi: {error.message}</p>}

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Tên bộ</th>
              <th className="px-4 py-2 font-medium">Loại</th>
              <th className="px-4 py-2 font-medium">Model</th>
              <th className="px-4 py-2 font-medium">Số video</th>
              {canSeeAll && <th className="px-4 py-2 font-medium">Người tạo</th>}
              <th className="px-4 py-2 font-medium">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const count = s.sub_videos?.[0]?.count ?? 0;
              const loai = count <= 1 ? "Đơn" : "Ghép";
              return (
                <tr key={s.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/sets/${s.id}`} className="text-brand-700 hover:underline font-medium">{s.name}</Link>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${loai === "Đơn" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>{loai}</span>
                  </td>
                  <td className="px-4 py-2">{s.model}</td>
                  <td className="px-4 py-2">{count}</td>
                  {canSeeAll && <td className="px-4 py-2 text-slate-600">{s.profiles?.full_name || s.profiles?.email}</td>}
                  <td className="px-4 py-2 text-slate-600">{formatDate(s.created_at)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={canSeeAll ? 6 : 5} className="px-4 py-8 text-center text-slate-500">Chưa có bộ prompt nào</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
