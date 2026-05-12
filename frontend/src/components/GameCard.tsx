import { Game } from "../lib/api";

const statusLabel = {
  scheduled: { cls: "badge-scheduled", text: "⏰ Agendado" },
  live: { cls: "badge-live", text: "🔴 Ao vivo" },
  finished: { cls: "badge-finished", text: "✅ Encerrado" },
};

function formatDate(d: string | null) {
  if (!d) return "Data a definir";
  try {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  } catch {
    return d;
  }
}

export default function GameCard({
  game,
  teamName,
  compact = false,
}: {
  game: Game;
  teamName: string;
  compact?: boolean;
}) {
  const s = statusLabel[game.status];
  const showScore = game.home_score !== null && game.away_score !== null;
  const we = game.home_score ?? 0;
  const them = game.away_score ?? 0;
  const win = showScore && we > them;
  const lose = showScore && we < them;
  const draw = showScore && we === them;

  return (
    <div className={`card p-4 ${compact ? "" : "md:p-5"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-700">{game.phase}</span>
        <span className={s.cls}>{s.text}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="text-right">
          <div className="font-bold text-slate-900 leading-tight">{teamName}</div>
          <div className="text-[10px] text-gold-700 uppercase tracking-wider font-semibold">Casa</div>
        </div>
        <div className="text-center min-w-[80px]">
          {showScore ? (
            <div className={`font-display text-3xl font-extrabold ${win ? "text-brand-700" : lose ? "text-crimson-600" : "text-slate-700"}`}>
              {we} <span className="text-slate-300">×</span> {them}
            </div>
          ) : (
            <div className="text-slate-400 font-display text-2xl font-bold">vs</div>
          )}
          {draw && <div className="text-[10px] uppercase tracking-wider text-slate-500">Empate</div>}
        </div>
        <div className="text-left">
          <div className="font-bold text-slate-900 leading-tight">{game.opponent}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Adversário</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
        <span>📅 {formatDate(game.match_date)}</span>
        {game.match_time && <span>🕒 {game.match_time}</span>}
        {game.venue && <span>📍 {game.venue}</span>}
      </div>
      {game.notes && <div className="mt-2 text-xs text-slate-500 italic">{game.notes}</div>}
    </div>
  );
}
