import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cron hits this daily (see vercel.json), same auth as the other
// /api/cron routes. Feeding logs are only ever meant to answer "was this
// meal given, and when, in roughly the last week" — keeping every day of
// feeding history forever has no use here, so this sweeps anything older
// than 7 days. UTC-safe date math, same convention as every other
// due-date comparison in this codebase (see lib/actions/tasks.ts).
const RETENTION_DAYS = 7;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - (RETENTION_DAYS - 1) * 86_400_000).toISOString().slice(0, 10);

  const { data: deleted, error } = await supabase
    .from("feeding_logs")
    .delete()
    .lt("log_date", cutoff)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: deleted?.length ?? 0, cutoff });
}
