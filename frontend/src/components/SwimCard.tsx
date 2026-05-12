import { SwimEvent } from "../lib/api";

const statusLabel = {
  scheduled: { cls: "badge-scheduled", text: "⏰ Agendado" },
  live: { cls: "badge-live", text: "🔴 Ao vivo" },
  finished: { cls: "badge-finished", text: "✅ Encerrado" },
};

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  } catch {
    return d;
  }
}

export default function SwimCard({ event }: { event: SwimEvent }) {
  const s = statusLabel[event.status];
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
          🏊 {event.distance} · {event.phase}{event.heat ? ` · ${event.heat}` : ""}
        </span>
        <span className={s.cls}>{s.text}</span>
      </div>
      <div className="font-bold text-slate-900 text-lg">{event.athlete}</div>
      <div className="mt-1 flex items-center gap-3 text-sm">
        <span className="font-display text-2xl font-extrabold text-brand-700">
          {event.result_time || "—"}
        </span>
        {event.qualified && (
          <span className="badge bg-gold-100 text-gold-800 ring-1 ring-gold-300">
            🏅 Classificado
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
        <span>📅 {formatDate(event.match_date)}</span>
        {event.match_time && <span>🕒 {event.match_time}</span>}
      </div>
      {event.notes && <div className="mt-2 text-xs text-slate-500 italic">{event.notes}</div>}
    </div>
  );
}
