import { useEffect, useState } from "react";
import { currentPermission, isSubscribed, pushSupported, subscribePush } from "../lib/push";

const DISMISSED_KEY = "copa:push_optin_dismissed";

export default function PushOptin() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!pushSupported()) return;
      const perm = currentPermission();
      if (perm !== "default") return;
      try {
        if (localStorage.getItem(DISMISSED_KEY) === "1") return;
      } catch {}
      const already = await isSubscribed();
      if (already) return;
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    })();
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const ok = await subscribePush();
      if (ok) {
        setVisible(false);
      } else {
        setError("Permissão negada. Pode habilitar nas configurações do navegador.");
      }
    } catch (e: any) {
      setError(e?.message || "Falha ao ativar notificações.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 pointer-events-none">
      <div className="mx-auto max-w-xl rounded-2xl bg-brand-700 text-white shadow-2xl ring-1 ring-brand-900/40 p-4 pointer-events-auto">
        <div className="flex items-start gap-3">
          <div className="text-2xl leading-none">🔔</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">Receber resultados na hora?</div>
            <div className="text-xs text-brand-100 mt-0.5">
              Avisamos no seu celular sempre que um resultado for postado.
            </div>
            {error && <div className="text-xs text-rose-200 mt-2">{error}</div>}
            <div className="mt-3 flex gap-2">
              <button
                onClick={enable}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-gold-500 text-slate-900 text-sm font-bold hover:bg-gold-400 disabled:opacity-60"
              >
                {busy ? "Ativando..." : "Ativar"}
              </button>
              <button
                onClick={dismiss}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm font-semibold hover:bg-white/20"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
