import { useEffect, useMemo, useState } from "react";
import { api, Game, Modality, SwimEvent } from "../lib/api";
import GameCard from "../components/GameCard";
import SwimCard from "../components/SwimCard";

export default function Home() {
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [swim, setSwim] = useState<SwimEvent[]>([]);
  const [teamName, setTeamName] = useState("São Mateus Moreira");
  const [activeMod, setActiveMod] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listModalities(),
      api.listGames(),
      api.listSwim(),
      api.publicSettings().catch(() => ({} as Record<string, string>)),
    ])
      .then(([m, g, s, settings]) => {
        setModalities(m);
        setGames(g);
        setSwim(s);
        if (settings.team_name) setTeamName(settings.team_name);
      })
      .finally(() => setLoading(false));
  }, []);

  const next = useMemo(() => {
    const now = Date.now();
    return [...games]
      .filter((g) => g.status !== "finished" && g.match_date)
      .sort((a, b) => {
        const da = new Date(`${a.match_date}T${a.match_time || "00:00"}`).getTime();
        const db = new Date(`${b.match_date}T${b.match_time || "00:00"}`).getTime();
        return da - db;
      })
      .filter((g) => new Date(`${g.match_date}T${g.match_time || "23:59"}`).getTime() >= now - 1000 * 60 * 60 * 6)
      .slice(0, 3);
  }, [games]);

  const lastResults = useMemo(() => {
    return [...games]
      .filter((g) => g.status === "finished" && g.match_date && g.home_score !== null && g.away_score !== null)
      .sort((a, b) => {
        const da = new Date(`${a.match_date}T${a.match_time || "00:00"}`).getTime();
        const db = new Date(`${b.match_date}T${b.match_time || "00:00"}`).getTime();
        return db - da;
      })
      .slice(0, 3);
  }, [games]);

  const filteredMods = activeMod === "all" ? modalities : modalities.filter((m) => m.id === activeMod);

  if (loading) {
    return <div className="text-center py-20 text-slate-500">Carregando...</div>;
  }

  return (
    <div className="space-y-10">
      {next.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="inline-block w-1.5 h-6 bg-gold-400 rounded-full" />
            Próximos jogos
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {next.map((g) => (
              <GameCard key={g.id} game={g} teamName={teamName} compact />
            ))}
          </div>
        </section>
      )}

      {lastResults.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="inline-block w-1.5 h-6 bg-emerald-500 rounded-full" />
            Últimos resultados
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {lastResults.map((g) => (
              <GameCard key={g.id} game={g} teamName={teamName} compact />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="inline-block w-1.5 h-6 bg-brand-600 rounded-full" />
            Modalidades
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveMod("all")}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                activeMod === "all" ? "bg-brand-700 text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              Todas
            </button>
            {modalities.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveMod(m.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  activeMod === m.id ? "bg-brand-700 text-white" : "bg-white border border-slate-200 text-slate-600"
                }`}
              >
                {m.icon} {m.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {filteredMods.map((m) => {
            const isSwim = m.kind === "swimming";
            const mGames = games.filter((g) => g.modality_id === m.id);
            const mSwim = swim.filter((s) => s.modality_id === m.id);
            const empty = isSwim ? mSwim.length === 0 : mGames.length === 0;

            const swimByDistance = isSwim
              ? mSwim.reduce<Record<string, SwimEvent[]>>((acc, s) => {
                  const key = s.distance || "—";
                  (acc[key] = acc[key] || []).push(s);
                  return acc;
                }, {})
              : {};

            const distanceOrder = (d: string) => {
              const num = parseInt(d.replace(/\D/g, ""), 10);
              return isNaN(num) ? 9999 : num;
            };

            return (
              <div key={m.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{m.icon}</span>
                  <h3 className="text-lg font-bold">{m.name}</h3>
                  <span className="text-xs text-slate-400">{m.phases.replace(/,/g, " · ")}</span>
                </div>
                {empty ? (
                  <div className="card p-6 text-center text-sm text-slate-400">
                    Nenhum jogo cadastrado ainda.
                  </div>
                ) : isSwim ? (
                  <div className="space-y-6">
                    {Object.keys(swimByDistance)
                      .sort((a, b) => distanceOrder(a) - distanceOrder(b))
                      .map((dist) => (
                        <div key={dist}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-block w-1 h-5 bg-brand-400 rounded-full" />
                            <h4 className="text-sm font-bold text-brand-700 uppercase tracking-wider">{dist}</h4>
                            <span className="text-xs text-slate-400">({swimByDistance[dist].length} provas)</span>
                          </div>
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {swimByDistance[dist].map((s) => (
                              <SwimCard key={s.id} event={s} />
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {mGames.map((g) => (
                      <GameCard key={g.id} game={g} teamName={teamName} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
