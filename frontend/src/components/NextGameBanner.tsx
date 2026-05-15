import { useEffect, useMemo, useState } from "react";
import { Game, Modality } from "../lib/api";

type Bucket = {
  state: "happening" | "waiting" | "upcoming";
  games: Game[];
  // for "upcoming": ms until kickoff (closest one)
  // for "happening": minutes since scheduled start
  // for "waiting": minutes since scheduled start
  delta: number;
};

const HAPPENING_WINDOW_MIN = 90; // 0-90min past scheduled = "acontecendo"
const UPCOMING_WINDOW_HOURS = 30;

function parseGame(g: Game): number | null {
  if (!g.match_date) return null;
  return new Date(`${g.match_date}T${g.match_time || "00:00"}:00`).getTime();
}

function pickBucket(games: Game[], now: number): Bucket | null {
  const candidates = games
    .filter((g) => g.status !== "finished" && g.match_date)
    .map((g) => ({ g, t: parseGame(g) }))
    .filter((x): x is { g: Game; t: number } => x.t !== null);

  // 1) HAPPENING — scheduled time passed, within 90min, no result yet
  const happening = candidates.filter(
    (x) => x.t <= now && now - x.t <= HAPPENING_WINDOW_MIN * 60 * 1000
  );
  if (happening.length > 0) {
    const groupTime = Math.min(...happening.map((x) => x.t));
    const gs = happening.filter((x) => x.t === groupTime).map((x) => x.g);
    return {
      state: "happening",
      games: gs,
      delta: Math.floor((now - groupTime) / 60000),
    };
  }

  // 2) WAITING — passed by more than 90min, no result yet
  const waiting = candidates.filter(
    (x) => x.t < now && now - x.t > HAPPENING_WINDOW_MIN * 60 * 1000
  );
  if (waiting.length > 0) {
    // most recent one
    const groupTime = Math.max(...waiting.map((x) => x.t));
    const gs = waiting.filter((x) => x.t === groupTime).map((x) => x.g);
    return {
      state: "waiting",
      games: gs,
      delta: Math.floor((now - groupTime) / 60000),
    };
  }

  // 3) UPCOMING — next future games (closest)
  const upcoming = candidates.filter(
    (x) => x.t > now && x.t - now <= UPCOMING_WINDOW_HOURS * 3600 * 1000
  );
  if (upcoming.length > 0) {
    const groupTime = Math.min(...upcoming.map((x) => x.t));
    const gs = upcoming.filter((x) => x.t === groupTime).map((x) => x.g);
    return {
      state: "upcoming",
      games: gs,
      delta: groupTime - now,
    };
  }

  return null;
}

function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return d === 1 ? "Amanhã" : `Em ${d} dias`;
  }
  if (h > 0) return `Em ${h}h ${m.toString().padStart(2, "0")}min`;
  if (m > 0) return `Em ${m}min`;
  return "Começando agora";
}

function fmtDelay(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, "0")}`;
}

export default function NextGameBanner({
  games,
  modalities,
  teamName,
}: {
  games: Game[];
  modalities: Modality[];
  teamName: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const bucket = useMemo(() => pickBucket(games, now), [games, now]);
  if (!bucket) return null;

  const modById = new Map(modalities.map((m) => [m.id, m]));

  // Style + label per state
  const styles =
    bucket.state === "happening" && bucket.delta < 15
      ? { bg: "bg-emerald-50", ring: "ring-emerald-300", text: "text-emerald-800", pill: "bg-emerald-600", label: "🟢 ACONTECENDO" }
      : bucket.state === "happening"
      ? { bg: "bg-amber-50", ring: "ring-amber-300", text: "text-amber-900", pill: "bg-amber-600", label: `🟡 ACONTECENDO · ${fmtDelay(bucket.delta)} após o horário` }
      : bucket.state === "waiting"
      ? { bg: "bg-slate-100", ring: "ring-slate-300", text: "text-slate-800", pill: "bg-slate-600", label: "⏳ AGUARDANDO RESULTADO" }
      : { bg: "bg-gold-50", ring: "ring-gold-300", text: "text-amber-900", pill: "bg-gold-500", label: `⏰ PRÓXIMO · ${fmtCountdown(bucket.delta)}` };

  const isMulti = bucket.games.length > 1;
  const headerTime =
    bucket.games[0].match_time ? ` · ${bucket.games[0].match_time}` : "";

  const subline =
    bucket.state === "happening" && bucket.delta >= 15
      ? `Marcado para ${bucket.games[0].match_time || ""} · ${fmtDelay(bucket.delta)} de atraso`
      : bucket.state === "waiting"
      ? `Era ${bucket.games[0].match_time || ""} · sem resultado oficial ainda`
      : bucket.state === "upcoming"
      ? `${bucket.games[0].match_date ? new Date(`${bucket.games[0].match_date}T00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }) : ""}${headerTime}`
      : `Início ${bucket.games[0].match_time || "—"}`;

  return (
    <div className={`rounded-2xl ${styles.bg} ring-1 ${styles.ring} p-4 md:p-5 shadow-card`}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-white ${styles.pill}`}>
          {styles.label}
        </span>
        {isMulti && (
          <span className={`text-xs font-semibold ${styles.text}`}>
            {bucket.games.length} jogos no mesmo horário
          </span>
        )}
      </div>

      <div className={`text-xs ${styles.text} mb-3 capitalize`}>{subline}</div>

      <div className="space-y-2">
        {bucket.games.map((g) => {
          const mod = modById.get(g.modality_id);
          const showScore = g.home_score !== null && g.away_score !== null;
          return (
            <div key={g.id} className="bg-white/70 backdrop-blur rounded-xl p-3 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl shrink-0">{mod?.icon || "🏟"}</span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">{mod?.name || "Modalidade"}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{g.phase}</div>
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-sm font-bold text-slate-900">
                  {teamName} {showScore && <span className="text-brand-700"> {g.home_score}×{g.away_score} </span>}{!showScore && <span className="text-slate-400 mx-1">×</span>}{g.opponent}
                </div>
                {g.venue && <div className="text-[10px] text-slate-500">📍 {g.venue}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
