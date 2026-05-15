import Link from "next/link";
import { ArrowLeft, Footprints } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { HistoryStrip, type KickSession } from "../_components/history-strip";

export default async function KicksHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", user.id)
    .single();
  const coupleId = profile?.couple_id ?? null;

  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
  const { data: sessions } = await supabase.rpc("kick_sessions_for_couple", {
    p_couple_id: coupleId,
    p_user_id: user.id,
    p_since: sevenDaysAgo,
  });
  const list: KickSession[] = sessions ?? [];

  const totalKicks = list.reduce((acc, s) => acc + s.kick_count, 0);
  const totalSessions = list.length;
  const sessionsReachingTen = list.filter((s) => s.reached_ten_at).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-3">
        <Link
          href="/kicks"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to kicks
        </Link>
      </div>
      <PageHero
        tool="kicks"
        icon={Footprints}
        eyebrow="History"
        title="Last 7 days."
        subtitle="Daily totals and sessions that reached 10."
      />

      <div className="space-y-8">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Kicks" value={totalKicks} />
          <Stat label="Sessions" value={totalSessions} />
          <Stat label="Hit 10" value={sessionsReachingTen} />
        </div>

        <HistoryStrip sessions={list} />

        <SessionsList sessions={list} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-2xl font-semibold tabular-nums leading-tight">
        {value}
      </p>
    </div>
  );
}

function SessionsList({ sessions }: { sessions: KickSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          No kick sessions in the last 7 days.
        </p>
      </div>
    );
  }
  return (
    <section>
      <h2 className="text-sm font-semibold tracking-tight mb-3">Sessions</h2>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <SessionRow key={s.session_start} session={s} />
        ))}
      </ul>
    </section>
  );
}

function SessionRow({ session }: { session: KickSession }) {
  const start = new Date(session.session_start);
  const end = new Date(session.session_end);
  const reached = session.reached_ten_at !== null;
  const timeToTenMs = reached
    ? new Date(session.reached_ten_at!).getTime() - start.getTime()
    : null;
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {start.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
          {" · "}
          {start.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
          {" – "}
          {end.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        {timeToTenMs !== null ? (
          <p className="text-[11px] text-muted-foreground">
            10 in {fmtDuration(timeToTenMs)}
          </p>
        ) : null}
      </div>
      <span
        className={
          reached
            ? "text-sm font-semibold tabular-nums text-kicks"
            : "text-sm font-semibold tabular-nums text-muted-foreground"
        }
      >
        {session.kick_count}
      </span>
    </li>
  );
}

function fmtDuration(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}
