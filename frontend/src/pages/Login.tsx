import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(u, p);
      nav("/admin");
    } catch (e: any) {
      setErr(e.message || "Falha ao entrar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto card p-6 mt-8">
      <h2 className="text-2xl font-bold mb-1">Entrar no admin</h2>
      <p className="text-sm text-slate-500 mb-6">Acesso restrito da Copa Moreirão.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Usuário</label>
          <input className="input" value={u} onChange={(e) => setU(e.target.value)} required />
        </div>
        <div>
          <label className="label">Senha</label>
          <input className="input" type="password" value={p} onChange={(e) => setP(e.target.value)} required />
        </div>
        {err && <div className="text-sm text-crimson-600">{err}</div>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
