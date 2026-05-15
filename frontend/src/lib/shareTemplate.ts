import { Modality } from "../lib/api";

const MAP: Record<string, string> = {
  "futsal masculino": "futsalmasc",
  "futsal feminino": "futsalfem",
  "minicampo masculino": "minicampo",
  "minicampo feminino": "minicampo",
  "basquete 3x3 masculino": "basquete",
  "basquete 3x3 feminino": "basquete",
  "basquete masculino": "basquete",
  "basquete feminino": "basquete",
  "vôlei masculino": "voleimasc",
  "vôlei feminino": "voleifem",
  "volei masculino": "voleimasc",
  "volei feminino": "voleifem",
  "natação": "natacao",
  "natacao": "natacao",
};

export function templateForModality(m: Modality | undefined): string {
  if (!m) return "/share/futsalmasc.png";
  const key = m.name.trim().toLowerCase();
  const file = MAP[key] || "futsalmasc";
  return `/share/${file}.png`;
}
