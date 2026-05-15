import { useEffect, useState } from "react";
import { Modality, SwimEvent } from "../lib/api";
import { renderSwimShareImage, shareOrDownload, preloadShareTemplate } from "../lib/shareRender";

const SHARE_USED_KEY = "copa:share_used";

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

export default function SwimCard({
  event,
  teamName,
  modality,
}: {
  event: SwimEvent;
  teamName: string;
  modality?: Modality;
}) {
  const [sharing, setSharing] = useState(false);
  const [shareUsed, setShareUsed] = useState(true);
  const s = statusLabel[event.status];
  const isFinished = event.status === "finished";

  useEffect(() => {
    preloadShareTemplate(modality);
  }, [modality]);

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
      const blob = await renderSwimShareImage(event, modality, teamName);
      await shareOrDownload(blob, `copa-natacao-${event.id}.png`);
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

  const resultBg = isFinished
    ? event.qualified
      ? "bg-emerald-50/80 ring-1 ring-emerald-200"
      : "bg-rose-50/80 ring-1 ring-rose-200"
    : "";

  return (
    <div className={`card p-4 ${resultBg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
          🏊 {event.distance} · {event.phase}{event.heat ? ` · ${event.heat}` : ""}
        </span>
        <span className={s.cls}>{s.text}</span>
      </div>
      <div className="font-bold text-slate-900 text-lg">{event.athlete}</div>
      <div className="mt-1 flex items-center gap-3 text-sm flex-wrap">
        <span className={`font-display text-2xl font-extrabold ${isFinished ? (event.qualified ? "text-emerald-700" : "text-rose-700") : "text-brand-700"}`}>
          {event.result_time || "—"}
        </span>
        {isFinished && (
          event.qualified ? (
            <span className="badge bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300">
              🏅 Classificado
            </span>
          ) : (
            <span className="badge bg-rose-100 text-rose-800 ring-1 ring-rose-300">
              ❌ Não classificado
            </span>
          )
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-600 text-center">
        <span>📅 {formatDate(event.match_date)}</span>
        {event.match_time && <span>🕒 {event.match_time}</span>}
      </div>
      {event.notes && <div className="mt-2 text-xs text-slate-500 italic">{event.notes}</div>}
      <div className="mt-3 flex justify-center">
        <button
          onClick={share}
          disabled={sharing}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gold-500 text-white text-sm font-semibold hover:bg-gold-600 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed ${!shareUsed && !sharing ? "share-pulse" : ""}`}
          title="Compartilhar nos Stories"
        >
          {sharing ? "Gerando..." : "📲 Compartilhar nos Stories"}
        </button>
      </div>
    </div>
  );
}
