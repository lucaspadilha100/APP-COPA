import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";

export default function App() {
  const { token, logout } = useAuth();
  const loc = useLocation();
  const isHome = loc.pathname === "/";

  return (
    <div className="min-h-full flex flex-col">
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/moreirao.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/85 via-brand-800/80 to-brand-700/90" />
        <div className="relative max-w-6xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/brasao.png"
              alt="Paróquia São Mateus Moreira"
              className="h-12 w-12 rounded-full bg-white/10 ring-2 ring-white/30 object-contain p-0.5"
              onError={(e) => ((e.currentTarget.style.display = "none"))}
            />
            <div className="text-white">
              <div className="text-[10px] uppercase tracking-[0.2em] text-gold-300 font-semibold">
                Paróquia São Mateus Moreira
              </div>
              <div className="font-display text-xl md:text-2xl font-extrabold leading-tight">
                Torcida <span className="text-gold-300">Moreirão</span>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <img
              src="/segue-me.png"
              alt="Segue-Me"
              className="hidden sm:block h-12 w-12 rounded-full object-cover ring-2 ring-gold-400/60"
              onError={(e) => ((e.currentTarget.style.display = "none"))}
            />
            {token ? (
              <>
                <Link to="/admin" className="btn-accent">Admin</Link>
                <button onClick={logout} className="btn-ghost">Sair</button>
              </>
            ) : (
              <Link to="/login" className="btn-ghost">Entrar</Link>
            )}
          </div>
        </div>
        {isHome && (
          <div className="relative max-w-6xl mx-auto px-4 pb-10 pt-2 text-white">
            <h1 className="font-display text-3xl md:text-5xl font-extrabold drop-shadow">
              Copa <span className="text-gold-300">Segue-Me 2026</span> está rolando!
            </h1>
            <p className="mt-2 text-white/80 max-w-2xl">
              Acompanhe os jogos, horários e resultados de todas as modalidades em que estamos disputando.
            </p>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white/60 backdrop-blur py-6">
        <div className="max-w-6xl mx-auto px-4 text-xs text-slate-500 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>© Paróquia São Mateus Moreira · Parnamirim/RN</div>
            <div className="text-gold-700 font-semibold">Segue-Me ✝</div>
          </div>
          <div className="text-[11px] text-slate-400 text-center">
            Desenvolvido por <span className="font-semibold text-slate-600">Lucas Padilha</span> · <a href="https://instagram.com/automic.tech" target="_blank" rel="noopener noreferrer" className="hover:text-brand-700 underline-offset-2 hover:underline">Automic.tech</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
