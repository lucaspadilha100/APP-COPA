const BASE_URL = "";

function getToken(): string | null {
  return localStorage.getItem("copa_token");
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = false
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {}
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Modality {
  id: number;
  name: string;
  kind: "bracket" | "swimming";
  icon: string | null;
  phases: string;
  order: number;
}

export interface Game {
  id: number;
  modality_id: number;
  phase: string;
  opponent: string;
  match_date: string | null;
  match_time: string | null;
  venue: string | null;
  home_score: number | null;
  away_score: number | null;
  status: "scheduled" | "finished";
  notes: string | null;
  notified_at: string | null;
}

export interface SwimEvent {
  id: number;
  modality_id: number;
  distance: string;
  athlete: string;
  phase: string;
  heat: string | null;
  match_date: string | null;
  match_time: string | null;
  result_time: string | null;
  qualified: boolean;
  status: "scheduled" | "finished";
  notes: string | null;
  notified_at: string | null;
}

export interface HomeBundle {
  modalities: Modality[];
  games: Game[];
  swim: SwimEvent[];
  settings: Record<string, string>;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<{ username: string }>("/api/auth/me", {}, true),

  home: () => request<HomeBundle>("/api/home"),
  publicSettings: () => request<Record<string, string>>("/api/settings/public"),
  allSettings: () => request<Record<string, string>>("/api/settings", {}, true),
  setSetting: (key: string, value: string) =>
    request<{ ok: boolean }>(
      "/api/settings",
      { method: "PUT", body: JSON.stringify({ key, value }) },
      true
    ),
  testWebhook: (url: string, message: string) =>
    request<{ ok: boolean }>(
      "/api/settings/webhook/test",
      { method: "POST", body: JSON.stringify({ url, message }) },
      true
    ),

  listModalities: () => request<Modality[]>("/api/modalities"),
  updateModality: (id: number, data: Partial<Modality>) =>
    request<Modality>(
      `/api/modalities/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
      true
    ),

  listGames: (modalityId?: number) =>
    request<Game[]>(`/api/games${modalityId ? `?modality_id=${modalityId}` : ""}`),
  createGame: (data: Partial<Game>) =>
    request<Game>("/api/games", { method: "POST", body: JSON.stringify(data) }, true),
  updateGame: (id: number, data: Partial<Game>) =>
    request<Game>(`/api/games/${id}`, { method: "PATCH", body: JSON.stringify(data) }, true),
  deleteGame: (id: number) =>
    request<{ ok: boolean }>(`/api/games/${id}`, { method: "DELETE" }, true),
  notifyGame: (id: number) =>
    request<{ ok: boolean; message: string }>(
      `/api/games/${id}/notify`,
      { method: "POST" },
      true
    ),

  listSwim: (modalityId?: number) =>
    request<SwimEvent[]>(`/api/swim${modalityId ? `?modality_id=${modalityId}` : ""}`),
  createSwim: (data: Partial<SwimEvent>) =>
    request<SwimEvent>("/api/swim", { method: "POST", body: JSON.stringify(data) }, true),
  updateSwim: (id: number, data: Partial<SwimEvent>) =>
    request<SwimEvent>(`/api/swim/${id}`, { method: "PATCH", body: JSON.stringify(data) }, true),
  deleteSwim: (id: number) =>
    request<{ ok: boolean }>(`/api/swim/${id}`, { method: "DELETE" }, true),
  notifySwim: (id: number) =>
    request<{ ok: boolean; message: string }>(
      `/api/swim/${id}/notify`,
      { method: "POST" },
      true
    ),
};
