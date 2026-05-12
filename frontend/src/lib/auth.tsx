import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";

interface AuthCtx {
  token: string | null;
  username: string | null;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("copa_token"));
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      api.me().then((d) => setUsername(d.username)).catch(() => {
        localStorage.removeItem("copa_token");
        setToken(null);
      });
    }
  }, [token]);

  const login = async (u: string, p: string) => {
    const res = await api.login(u, p);
    localStorage.setItem("copa_token", res.access_token);
    setToken(res.access_token);
  };

  const logout = () => {
    localStorage.removeItem("copa_token");
    setToken(null);
    setUsername(null);
  };

  return <Ctx.Provider value={{ token, username, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
