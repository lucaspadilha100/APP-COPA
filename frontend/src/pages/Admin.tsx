import { useEffect, useMemo, useState } from "react";
import { api, Game, Modality, SwimEvent } from "../lib/api";

type Tab = "games" | "swim" | "settings";

export default function Admin() {
  const [tab, setTab] = useState<Tab>("games");
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [swim, setSwim] = useState<SwimEvent[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string>("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function reload() {
    const [m, g, s, st] = await Promise.all([
      api.listModalities(),
      api.listGames(),
      api.listSwim(),
      api.allSettings(),
    ]);
    setModalities(m);
    setGames(g);
    setSwim(s);
    setSettings(st);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-slate-500">Carregando admin...</div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <h2 className="text-2xl font-bold mr-auto">Painel Admin</h2>
        <Tabs tab={tab} setTab={setTab} />
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 card p-3 px-4 bg-brand-700 text-white shadow-card">
          {toast}
        </div>
      )}

      {tab === "games" && (
        <GamesAdmin
          modalities={modalities.filter((m) => m.kind !== "swimming")}
          games={games}
          onChange={reload}
          flash={flash}
        />
      )}
      {tab === "swim" && (
        <SwimAdmin
          modalities={modalities.filter((m) => m.kind === "swimming")}
          events={swim}
          onChange={reload}
          flash={flash}
        />
      )}
      {tab === "settings" && (
        <SettingsAdmin
          modalities={modalities}
          settings={settings}
          onChange={reload}
          flash={flash}
        />
      )}
    </div>
  );
}

function Tabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const t = (k: Tab, label: string) => (
    <button
      onClick={() => setTab(k)}
      className={`px-3 py-1.5 rounded-xl text-sm font-semibold ${
        tab === k ? "bg-brand-700 text-white" : "bg-white border border-slate-200 text-slate-700"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-2 flex-wrap">
      {t("games", "Jogos")}
      {t("swim", "Natação")}
      {t("settings", "Config")}
    </div>
  );
}

function sortByDateTime(a: Game, b: Game) {
  const da = new Date(`${a.match_date || "9999-12-31"}T${a.match_time || "00:00"}`).getTime();
  const db = new Date(`${b.match_date || "9999-12-31"}T${b.match_time || "00:00"}`).getTime();
  return da - db;
}

function GamesAdmin({
  modalities,
  games,
  onChange,
  flash,
}: {
  modalities: Modality[];
  games: Game[];
  onChange: () => Promise<void>;
  flash: (m: string) => void;
}) {
  const [filterMod, setFilterMod] = useState<number | "all">("all");
  const [form, setForm] = useState<Partial<Game>>({
    modality_id: modalities[0]?.id,
    phase: modalities[0]?.phases.split(",")[0] || "Grupos",
    opponent: "",
    status: "scheduled",
    venue: "UNI-RN",
  });

  const activeMod = modalities.find((m) => m.id === form.modality_id);
  const phases = activeMod?.phases.split(",") || [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.modality_id || !form.opponent || !form.phase) return;
    await api.createGame(form);
    flash("Jogo criado!");
    setForm({ ...form, opponent: "", home_score: null, away_score: null, notes: "" });
    await onChange();
  }

  const grouped = useMemo(() => {
    return modalities
      .map((m) => ({
        modality: m,
        games: games
          .filter((g) => g.modality_id === m.id && (filterMod === "all" || filterMod === m.id))
          .sort(sortByDateTime),
      }))
      .filter((g) => g.games.length > 0);
  }, [modalities, games, filterMod]);

  const totalVisible = grouped.reduce((n, g) => n + g.games.length, 0);

  return (
    <div className="flex flex-col-reverse lg:grid lg:grid-cols-[360px_1fr] gap-6">
      {/* ── Formulário novo jogo ── */}
      <div className="card p-5 h-fit lg:sticky lg:top-4">
        <h3 className="font-bold mb-3">Novo jogo</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Modalidade</label>
            <select
              className="input"
              value={form.modality_id}
              onChange={(e) => {
                const id = Number(e.target.value);
                const mod = modalities.find((m) => m.id === id);
                setForm({
                  ...form,
                  modality_id: id,
                  phase: mod?.phases.split(",")[0] || "Grupos",
                });
              }}
            >
              {modalities.map((m) => (
                <option key={m.id} value={m.id}>{m.icon} {m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fase</label>
            <select
              className="input"
              value={form.phase}
              onChange={(e) => setForm({ ...form, phase: e.target.value })}
            >
              {phases.map((p) => <option key={p}>{p.trim()}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Adversário</label>
            <input
              className="input"
              placeholder="Nome do time adversário"
              value={form.opponent || ""}
              onChange={(e) => setForm({ ...form, opponent: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Data</label>
              <select
                className="input"
                value={form.match_date || ""}
                onChange={(e) => setForm({ ...form, match_date: e.target.value })}
              >
                <option value="">Selecione</option>
                <option value="2026-05-16">16/05/2026</option>
                <option value="2026-05-17">17/05/2026</option>
              </select>
            </div>
            <div>
              <label className="label">Horário</label>
              <input
                className="input"
                type="time"
                value={form.match_time || ""}
                onChange={(e) => setForm({ ...form, match_time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Local</label>
            <input
              className="input"
              value={form.venue || ""}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
            />
          </div>
          <button className="btn-primary w-full">Criar jogo</button>
        </form>
      </div>

      {/* ── Lista de jogos ── */}
      <div>
        {/* Filtro por modalidade */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setFilterMod("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              filterMod === "all" ? "bg-brand-700 text-white" : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            Todas ({games.length})
          </button>
          {modalities.map((m) => {
            const count = games.filter((g) => g.modality_id === m.id).length;
            return (
              <button
                key={m.id}
                onClick={() => setFilterMod(m.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  filterMod === m.id ? "bg-brand-700 text-white" : "bg-white border border-slate-200 text-slate-600"
                }`}
              >
                {m.icon} {m.name} ({count})
              </button>
            );
          })}
        </div>

        {totalVisible === 0 && (
          <div className="card p-6 text-center text-sm text-slate-400">Nenhum jogo cadastrado ainda.</div>
        )}

        {/* Grupos por modalidade */}
        <div className="space-y-8">
          {grouped.map(({ modality, games: mGames }) => (
            <div key={modality.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{modality.icon}</span>
                <h3 className="font-bold text-base">{modality.name}</h3>
                <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                  {mGames.length} jogo{mGames.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-3">
                {mGames.map((g) => (
                  <GameRow key={g.id} game={g} modality={modality} onChange={onChange} flash={flash} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GameRow({
  game,
  modality,
  onChange,
  flash,
}: {
  game: Game;
  modality: Modality;
  onChange: () => Promise<void>;
  flash: (m: string) => void;
}) {
  const [edit, setEdit] = useState<Partial<Game>>(game);
  const [busy, setBusy] = useState(false);
  const phases = modality.phases.split(",").map((p) => p.trim());

  const statusColor =
    game.status === "finished"
      ? "border-l-4 border-l-emerald-400"
      : game.status === "live"
      ? "border-l-4 border-l-red-400"
      : "border-l-4 border-l-slate-200";

  async function save() {
    setBusy(true);
    try {
      await api.updateGame(game.id, {
        phase: edit.phase,
        opponent: edit.opponent,
        match_date: edit.match_date,
        match_time: edit.match_time,
        venue: edit.venue,
        home_score: edit.home_score === ("" as any) ? null : edit.home_score,
        away_score: edit.away_score === ("" as any) ? null : edit.away_score,
        status: edit.status,
        notes: edit.notes,
      });
      flash("Salvo!");
      await onChange();
    } finally {
      setBusy(false);
    }
  }

  async function notify() {
    if (!confirm("Disparar webhook para o n8n / WhatsApp?")) return;
    setBusy(true);
    try {
      await api.notifyGame(game.id);
      flash("Webhook disparado ✅");
      await onChange();
    } catch (e: any) {
      flash(`Erro: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm("Apagar este jogo?")) return;
    await api.deleteGame(game.id);
    flash("Removido");
    await onChange();
  }

  return (
    <div className={`card p-4 ${statusColor}`}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          {game.match_date && (
            <span className="font-semibold">
              {new Date(`${game.match_date}T${game.match_time || "00:00"}`).toLocaleDateString("pt-BR", {
                weekday: "short", day: "2-digit", month: "2-digit",
              })}
              {game.match_time && ` · ${game.match_time}`}
            </span>
          )}
        </div>
        {game.notified_at && (
          <span className="text-[10px] text-brand-700 uppercase font-semibold">
            ✓ Notificado {new Date(game.notified_at).toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      {/* ── Layout mobile ── */}
      <div className="md:hidden space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={edit.phase} onChange={(e) => setEdit({ ...edit, phase: e.target.value })}>
            {phases.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as any })}>
            <option value="scheduled">Agendado</option>
            <option value="live">Ao vivo</option>
            <option value="finished">Encerrado</option>
          </select>
        </div>
        <input className="input w-full" placeholder="Adversário" value={edit.opponent || ""} onChange={(e) => setEdit({ ...edit, opponent: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={edit.match_date || ""} onChange={(e) => setEdit({ ...edit, match_date: e.target.value })}>
            <option value="">Data</option>
            <option value="2026-05-16">16/05/2026</option>
            <option value="2026-05-17">17/05/2026</option>
          </select>
          <input className="input" type="time" value={edit.match_time || ""} onChange={(e) => setEdit({ ...edit, match_time: e.target.value })} />
        </div>
        <input className="input w-full" placeholder="Local" value={edit.venue || ""} onChange={(e) => setEdit({ ...edit, venue: e.target.value })} />
        <div className="flex items-center gap-2">
          <input className="input w-16 shrink-0" type="number" placeholder="Nós" value={edit.home_score ?? ""} onChange={(e) => setEdit({ ...edit, home_score: e.target.value === "" ? null : Number(e.target.value) })} />
          <span className="text-slate-400 font-bold shrink-0">×</span>
          <input className="input w-16 shrink-0" type="number" placeholder="Eles" value={edit.away_score ?? ""} onChange={(e) => setEdit({ ...edit, away_score: e.target.value === "" ? null : Number(e.target.value) })} />
          <input className="input flex-1 min-w-0" placeholder="Observação" value={edit.notes || ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
        </div>
      </div>

      {/* ── Layout desktop ── */}
      <div className="hidden md:block space-y-2">
        <div className="grid grid-cols-6 gap-2">
          <select className="input" value={edit.phase} onChange={(e) => setEdit({ ...edit, phase: e.target.value })}>
            {phases.map((p) => <option key={p}>{p}</option>)}
          </select>
          <input className="input col-span-2" placeholder="Adversário" value={edit.opponent || ""} onChange={(e) => setEdit({ ...edit, opponent: e.target.value })} />
          <input className="input" type="date" value={edit.match_date || ""} onChange={(e) => setEdit({ ...edit, match_date: e.target.value })} />
          <input className="input" type="time" value={edit.match_time || ""} onChange={(e) => setEdit({ ...edit, match_time: e.target.value })} />
          <select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as any })}>
            <option value="scheduled">Agendado</option>
            <option value="live">Ao vivo</option>
            <option value="finished">Encerrado</option>
          </select>
        </div>
        <div className="grid grid-cols-6 gap-2">
          <input className="input col-span-2" placeholder="Local" value={edit.venue || ""} onChange={(e) => setEdit({ ...edit, venue: e.target.value })} />
          <div className="flex items-center gap-2 col-span-2">
            <input className="input" type="number" placeholder="Nós" value={edit.home_score ?? ""} onChange={(e) => setEdit({ ...edit, home_score: e.target.value === "" ? null : Number(e.target.value) })} />
            <span className="text-slate-400 font-bold">×</span>
            <input className="input" type="number" placeholder="Eles" value={edit.away_score ?? ""} onChange={(e) => setEdit({ ...edit, away_score: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
          <input className="input col-span-2" placeholder="Observação" value={edit.notes || ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
        </div>
      </div>

      <div className="mt-3 flex gap-2 flex-wrap">
        <button onClick={save} disabled={busy} className="btn-primary">Salvar</button>
        <button onClick={notify} disabled={busy} className="btn-accent">📤 Disparar webhook</button>
        <button onClick={del} className="btn-danger ml-auto">Apagar</button>
      </div>
    </div>
  );
}

function SwimAdmin({
  modalities,
  events,
  onChange,
  flash,
}: {
  modalities: Modality[];
  events: SwimEvent[];
  onChange: () => Promise<void>;
  flash: (m: string) => void;
}) {
  const swimMod = modalities[0];
  const phases = swimMod?.phases.split(",").map((p) => p.trim()) || ["Eliminatória", "Semifinal", "Final"];
  const [form, setForm] = useState<Partial<SwimEvent>>({
    modality_id: swimMod?.id,
    distance: "50m",
    athlete: "",
    phase: phases[0],
    heat: "Bateria 1",
    status: "scheduled",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.modality_id || !form.athlete) return;
    await api.createSwim(form);
    flash("Prova adicionada!");
    setForm({ ...form, athlete: "", result_time: "" });
    await onChange();
  }

  if (!swimMod) {
    return <div className="card p-6 text-sm text-slate-500">Nenhuma modalidade de natação cadastrada.</div>;
  }

  const byDistance = useMemo(() => {
    const order = (d: string) => {
      const n = parseInt(d.replace(/\D/g, ""), 10);
      return isNaN(n) ? 9999 : n;
    };
    const map: Record<string, SwimEvent[]> = {};
    events.forEach((e) => {
      const k = e.distance || "—";
      (map[k] = map[k] || []).push(e);
    });
    return Object.keys(map)
      .sort((a, b) => order(a) - order(b))
      .map((dist) => ({ dist, events: map[dist] }));
  }, [events]);

  return (
    <div className="flex flex-col-reverse lg:grid lg:grid-cols-[360px_1fr] gap-6">
      <div className="card p-5 h-fit lg:sticky lg:top-4">
        <h3 className="font-bold mb-3">Nova prova</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Prova</label>
            <select className="input" value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })}>
              <option>50m</option>
              <option>100m</option>
              <option>400m</option>
              <option>Revezamento 4x50 misto</option>
            </select>
          </div>
          <div>
            <label className="label">Atleta</label>
            <input className="input" value={form.athlete || ""} onChange={(e) => setForm({ ...form, athlete: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Fase</label>
              <select className="input" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>
                {phases.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Bateria</label>
              <input className="input" value={form.heat || ""} onChange={(e) => setForm({ ...form, heat: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Data</label>
              <input className="input" type="date" value={form.match_date || ""} onChange={(e) => setForm({ ...form, match_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Horário</label>
              <input className="input" type="time" value={form.match_time || ""} onChange={(e) => setForm({ ...form, match_time: e.target.value })} />
            </div>
          </div>
          <button className="btn-primary w-full">Criar prova</button>
        </form>
      </div>

      <div>
        {events.length === 0 && (
          <div className="card p-6 text-center text-sm text-slate-400">Nenhuma prova ainda.</div>
        )}
        <div className="space-y-8">
          {byDistance.map(({ dist, events: dEvents }) => (
            <div key={dist}>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block w-1 h-5 bg-brand-400 rounded-full" />
                <h3 className="font-bold text-brand-700 uppercase tracking-wider text-sm">{dist}</h3>
                <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{dEvents.length} prova{dEvents.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-3">
                {dEvents.map((e) => (
                  <SwimRow key={e.id} event={e} phases={phases} onChange={onChange} flash={flash} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SwimRow({
  event,
  phases,
  onChange,
  flash,
}: {
  event: SwimEvent;
  phases: string[];
  onChange: () => Promise<void>;
  flash: (m: string) => void;
}) {
  const [edit, setEdit] = useState<Partial<SwimEvent>>(event);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.updateSwim(event.id, edit);
      flash("Salvo!");
      await onChange();
    } finally { setBusy(false); }
  }
  async function notify() {
    if (!confirm("Disparar webhook?")) return;
    setBusy(true);
    try {
      await api.notifySwim(event.id);
      flash("Webhook disparado ✅");
      await onChange();
    } catch (e: any) {
      flash(`Erro: ${e.message}`);
    } finally { setBusy(false); }
  }
  async function del() {
    if (!confirm("Apagar?")) return;
    await api.deleteSwim(event.id);
    flash("Removido");
    await onChange();
  }

  return (
    <div className="card p-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <select className="input" value={edit.distance} onChange={(e) => setEdit({ ...edit, distance: e.target.value })}>
          <option>50m</option><option>100m</option><option>400m</option><option>Revezamento 4x50 misto</option>
        </select>
        <input className="input col-span-1 md:col-span-2" placeholder="Atleta" value={edit.athlete || ""} onChange={(e) => setEdit({ ...edit, athlete: e.target.value })} />
        <select className="input" value={edit.phase} onChange={(e) => setEdit({ ...edit, phase: e.target.value })}>
          {phases.map((p) => <option key={p}>{p}</option>)}
        </select>
        <input className="input" placeholder="Bateria" value={edit.heat || ""} onChange={(e) => setEdit({ ...edit, heat: e.target.value })} />
        <select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as any })}>
          <option value="scheduled">Agendado</option>
          <option value="live">Ao vivo</option>
          <option value="finished">Encerrado</option>
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-2">
        <input className="input" type="date" value={edit.match_date || ""} onChange={(e) => setEdit({ ...edit, match_date: e.target.value })} />
        <input className="input" type="time" value={edit.match_time || ""} onChange={(e) => setEdit({ ...edit, match_time: e.target.value })} />
        <input className="input md:col-span-2" placeholder="Tempo (ex: 00:55.21)" value={edit.result_time || ""} onChange={(e) => setEdit({ ...edit, result_time: e.target.value })} />
        <label className="flex items-center gap-2 text-sm col-span-1">
          <input type="checkbox" checked={!!edit.qualified} onChange={(e) => setEdit({ ...edit, qualified: e.target.checked })} />
          Classificado
        </label>
        <input className="input" placeholder="Notas" value={edit.notes || ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
      </div>
      <div className="mt-3 flex gap-2 flex-wrap">
        <button onClick={save} disabled={busy} className="btn-primary">Salvar</button>
        <button onClick={notify} disabled={busy} className="btn-accent">📤 Disparar webhook</button>
        <button onClick={del} className="btn-danger ml-auto">Apagar</button>
      </div>
      {event.notified_at && (
        <div className="text-[10px] text-brand-700 mt-2 font-semibold uppercase">
          ✓ Notificado {new Date(event.notified_at).toLocaleString("pt-BR")}
        </div>
      )}
    </div>
  );
}

function SettingsAdmin({
  modalities,
  settings,
  onChange,
  flash,
}: {
  modalities: Modality[];
  settings: Record<string, string>;
  onChange: () => Promise<void>;
  flash: (m: string) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(settings);
  const [busy, setBusy] = useState(false);
  const [modEdit, setModEdit] = useState<Record<number, string>>(
    Object.fromEntries(modalities.map((m) => [m.id, m.phases]))
  );

  async function save(key: string) {
    setBusy(true);
    try {
      await api.setSetting(key, form[key] || "");
      flash("Salvo!");
      await onChange();
    } finally { setBusy(false); }
  }

  async function testHook() {
    if (!form.webhook_url) return flash("Configure a URL primeiro");
    setBusy(true);
    try {
      await api.testWebhook(form.webhook_url, "🧪 Teste da Copa Segue-Me");
      flash("Webhook OK ✅");
    } catch (e: any) {
      flash(`Falhou: ${e.message}`);
    } finally { setBusy(false); }
  }

  async function saveModPhases(id: number) {
    setBusy(true);
    try {
      await api.updateModality(id, { phases: modEdit[id] });
      flash("Fases atualizadas!");
      await onChange();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card p-5">
        <h3 className="font-bold mb-2">Nome do time da casa</h3>
        <div className="flex gap-2">
          <input
            className="input"
            value={form.team_name || ""}
            onChange={(e) => setForm({ ...form, team_name: e.target.value })}
          />
          <button onClick={() => save("team_name")} disabled={busy} className="btn-primary">Salvar</button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-2">Webhook do n8n (WhatsApp)</h3>
        <p className="text-xs text-slate-500 mb-2">
          URL do webhook do n8n que dispara a mensagem no grupo do WhatsApp.
        </p>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="https://n8n.seu-dominio.com/webhook/..."
            value={form.webhook_url || ""}
            onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
          />
          <button onClick={() => save("webhook_url")} disabled={busy} className="btn-primary">Salvar</button>
          <button onClick={testHook} disabled={busy} className="btn-ghost">Testar</button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-2">Template da mensagem (jogos)</h3>
        <p className="text-xs text-slate-500 mb-2">
          Placeholders: <code>{`{modalidade}`}</code> <code>{`{fase}`}</code> <code>{`{data}`}</code> <code>{`{horario}`}</code> <code>{`{adversario}`}</code> <code>{`{placar_nos}`}</code> <code>{`{placar_eles}`}</code> <code>{`{status}`}</code> <code>{`{status_emoji}`}</code> <code>{`{local}`}</code> <code>{`{time_casa}`}</code> <code>{`{notas}`}</code>
        </p>
        <textarea
          className="input min-h-[120px] font-mono text-xs"
          value={form.message_template || ""}
          onChange={(e) => setForm({ ...form, message_template: e.target.value })}
        />
        <button onClick={() => save("message_template")} disabled={busy} className="btn-primary mt-2">Salvar</button>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-2">Template da mensagem (natação)</h3>
        <p className="text-xs text-slate-500 mb-2">
          Placeholders: <code>{`{modalidade}`}</code> <code>{`{distancia}`}</code> <code>{`{atleta}`}</code> <code>{`{fase}`}</code> <code>{`{bateria}`}</code> <code>{`{data}`}</code> <code>{`{horario}`}</code> <code>{`{tempo}`}</code> <code>{`{classificacao}`}</code>
        </p>
        <textarea
          className="input min-h-[120px] font-mono text-xs"
          value={form.swim_message_template || ""}
          onChange={(e) => setForm({ ...form, swim_message_template: e.target.value })}
        />
        <button onClick={() => save("swim_message_template")} disabled={busy} className="btn-primary mt-2">Salvar</button>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-3">Fases por modalidade</h3>
        <p className="text-xs text-slate-500 mb-3">
          Separe por vírgula. Ex: <code>Grupos,Quartas,Semifinal,Final</code>
        </p>
        <div className="space-y-2">
          {modalities.map((m) => (
            <div key={m.id} className="flex gap-2 items-center">
              <div className="w-48 text-sm">{m.icon} {m.name}</div>
              <input
                className="input"
                value={modEdit[m.id] || ""}
                onChange={(e) => setModEdit({ ...modEdit, [m.id]: e.target.value })}
              />
              <button onClick={() => saveModPhases(m.id)} disabled={busy} className="btn-ghost">Salvar</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
