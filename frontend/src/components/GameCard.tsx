import { useEffect, useState } from "react";
import { Game, Modality } from "../lib/api";
import { renderShareImage, shareOrDownload } from "../lib/shareRender";

const SHARE_USED_KEY = "copa:share_used";

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
  modality,
}: {
  game: Game;
  teamName: string;
  compact?: boolean;
  modality?: Modality;
}) {
  const [sharing, setSharing] = useState(false);
  const [shareUsed, setShareUsed] = useState(true);
  const s = statusLabel[game.status];
  const showScore = game.home_score !== null && game.away_score !== null;

  useEffect(() => {
    try {
      setShareUsed(localStorage.getItem(SHARE_USED_KEY) === "1");
    } catch {
      setShareUsed(true);
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === SHARE_USED_KEY) setShareUsed(e.newValue === "1");
    };
    const onCustom = () => setShareUsed(true);
    window.addEventListener("storage", onStorage);
    window.addEventListener("copa:share-used", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("copa:share-used", onCustom);
    };
  }, []);

  async function share() {
    setSharing(true);
    try {
      const blob = await renderShareImage(game, modality, teamName);
      const slug = (modality?.name || "jogo").toLowerCase().replace(/\s+/g, "-");
      await shareOrDownload(blob, `copa-${slug}-${game.id}.png`);
      try {
        localStorage.setItem(SHARE_USED_KEY, "1");
      } catch {}
      setShareUsed(true);
      window.dispatchEvent(new Event("copa:share-used"));
    } catch (e) {
      console.error(e);
      alert("Não foi possível gerar a imagem. Tente novamente.");
    } finally {
      setSharing(false);
    }
  }
  const we = game.home_score ?? 0;
  const them = game.away_score ?? 0;
  const win = showScore && we > them;
  const lose = showScore && we < them;
  const draw = showScore && we === them;

  const resultBg = win
    ? "bg-emerald-50/80 ring-1 ring-emerald-200"
    : lose
    ? "bg-rose-50/80 ring-1 ring-rose-200"
    : draw
    ? "bg-amber-50/80 ring-1 ring-amber-200"
    : "";

  return (
    <div className={`card p-4 ${compact ? "" : "md:p-5"} ${resultBg}`}>
      {modality && (
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-600">
          <span className="text-base leading-none">{modality.icon}</span>
          <span>{modality.name}</span>
        </div>
      )}
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
            <div className={`font-display text-3xl font-extrabold ${win ? "text-emerald-700" : lose ? "text-rose-700" : "text-amber-700"}`}>
              {we} <span className="text-slate-300">×</span> {them}
            </div>
          ) : (
            <div className="text-slate-400 font-display text-2xl font-bold">vs</div>
          )}
          {win && <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Vitória</div>}
          {lose && <div className="text-[10px] uppercase tracking-wider text-rose-700 font-bold">Derrota</div>}
          {draw && <div className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">Empate</div>}
        </div>
        <div className="text-left">
          <div className="font-bold text-slate-900 leading-tight">{game.opponent}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Adversário</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-600 text-center">
        <span>📅 {formatDate(game.match_date)}</span>
        {game.match_time && <span>🕒 {game.match_time}</span>}
        {game.venue && <span>📍 {game.venue}</span>}
      </div>
      {game.notes && <div className="mt-2 text-xs text-slate-500 italic">{game.notes}</div>}
      <button
        onClick={share}
        disabled={sharing}
        className={`mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gold-500 text-white text-sm font-semibold hover:bg-gold-600 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed ${!shareUsed && !sharing ? "share-pulse" : ""}`}
        title="Compartilhar nos Stories"
      >
        {sharing ? "Gerando..." : "📲 Compartilhar nos Stories"}
      </button>
    </div>
  );
}
