import { Game, Modality } from "./api";
import { templateForModality } from "./shareTemplate";

const W = 1080;
const H = 1920;

function fmtDate(d: string | null): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  shadow = true
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
  } else {
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.fillText(text, x, y);
}

const ABBREV: Array<[RegExp, string]> = [
  [/\bParóquia\b/gi, "Par."],
  [/\bParoquia\b/gi, "Par."],
  [/\bNossa Senhora\b/gi, "N. Sra."],
  [/\bSenhor\b/gi, "Sr."],
  [/\bSagrado Coração\b/gi, "Sgdo. Coração"],
  [/\bImaculada Conceição\b/gi, "Imac. Conceição"],
  [/\bPerpétuo Socorro\b/gi, "Perp. Socorro"],
  [/\bSanto\b/gi, "Sto."],
  [/\bSanta\b/gi, "Sta."],
  [/\bSão\b/gi, "S."],
];

function abbreviate(text: string): string {
  let out = text;
  for (const [re, sub] of ABBREV) out = out.replace(re, sub);
  return out;
}

function splitTwoLines(text: string): [string, string] {
  const words = text.split(/\s+/);
  if (words.length <= 1) return [text, ""];
  let best = 0;
  let bestDiff = Infinity;
  const total = text.length;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(" ").length;
    const diff = Math.abs(left - (total - left));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

function drawFittedTeamName(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxWidth: number,
  baseSize: number,
  color: string
) {
  const fontFor = (px: number) => `bold ${px}px Poppins, system-ui, sans-serif`;
  const minSize = Math.round(baseSize * 0.55);

  // 1) Try a single line, shrinking down to ~80% of base
  let size = baseSize;
  ctx.font = fontFor(size);
  let w = ctx.measureText(text).width;
  const oneLineMin = Math.round(baseSize * 0.8);
  while (w > maxWidth && size > oneLineMin) {
    size -= 2;
    ctx.font = fontFor(size);
    w = ctx.measureText(text).width;
  }
  if (w <= maxWidth) {
    drawCenteredText(ctx, text, cx, cy, fontFor(size), color);
    return;
  }

  // 2) Abbreviate and try single line again
  const abbr = abbreviate(text);
  if (abbr !== text) {
    size = baseSize;
    ctx.font = fontFor(size);
    w = ctx.measureText(abbr).width;
    while (w > maxWidth && size > oneLineMin) {
      size -= 2;
      ctx.font = fontFor(size);
      w = ctx.measureText(abbr).width;
    }
    if (w <= maxWidth) {
      drawCenteredText(ctx, abbr, cx, cy, fontFor(size), color);
      return;
    }
  }

  // 3) Two lines (use abbreviated version), shrink to fit widest line
  const source = abbr;
  const [l1, l2] = splitTwoLines(source);
  size = Math.round(baseSize * 0.82);
  ctx.font = fontFor(size);
  let widest = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width);
  while (widest > maxWidth && size > minSize) {
    size -= 2;
    ctx.font = fontFor(size);
    widest = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width);
  }
  const lineH = Math.round(size * 1.05);
  drawCenteredText(ctx, l1, cx, cy - lineH / 2, fontFor(size), color);
  drawCenteredText(ctx, l2, cx, cy + lineH / 2, fontFor(size), color);
}

export async function renderShareImage(
  game: Game,
  modality: Modality | undefined,
  teamName: string
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background template
  const bg = await loadImage(templateForModality(modality));
  ctx.drawImage(bg, 0, 0, W, H);

  // Text area: middle dark zone (~52%-82% height)
  const cx = W / 2;

  // 1) Modality (top of text area)
  const modName = (modality?.name || "").toUpperCase();
  drawCenteredText(ctx, modName, cx, H * 0.55, "bold 56px Poppins, system-ui, sans-serif", "#fbbf24");

  // 2) Fase + data (+ horário se não tem placar)
  const hasScore = game.home_score !== null && game.away_score !== null;
  const dateStr = fmtDate(game.match_date);
  const subline = hasScore
    ? `${game.phase} · ${dateStr}`
    : `${game.phase} · ${dateStr}${game.match_time ? ` · ${game.match_time}` : ""}`;
  drawCenteredText(ctx, subline, cx, H * 0.605, "500 36px Inter, system-ui, sans-serif", "#ffffff");

  // 3) Team name (auto-fit + 2 linhas se nome longo)
  const maxNameWidth = W * 0.86;
  drawFittedTeamName(ctx, teamName.toUpperCase(), cx, H * 0.68, maxNameWidth, 56, "#ffffff");

  // 4) Score (big) or "vs"
  if (hasScore) {
    const score = `${game.home_score}  ×  ${game.away_score}`;
    drawCenteredText(ctx, score, cx, H * 0.75, "900 130px Poppins, system-ui, sans-serif", "#ffffff");
  } else {
    drawCenteredText(ctx, "×", cx, H * 0.75, "900 90px Poppins, system-ui, sans-serif", "#ffffff");
  }

  // 5) Adversary (auto-fit + 2 linhas se nome longo)
  drawFittedTeamName(ctx, (game.opponent || "").toUpperCase(), cx, H * 0.82, maxNameWidth, 56, "#ffffff");

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Falha ao gerar imagem"));
    }, "image/png");
  });
}

export async function shareOrDownload(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as any;

  const canShareFiles =
    typeof nav.canShare === "function" && nav.canShare({ files: [file] });

  if (canShareFiles || typeof nav.share === "function") {
    try {
      await nav.share({
        files: [file],
        title: "Copa Segue-Me 2026",
        text: "Copa Segue-Me 2026",
      });
      return;
    } catch (err: any) {
      // AbortError = user cancelled, não cair no download
      if (err && (err.name === "AbortError" || err.code === 20)) return;
      // outros erros (NotAllowedError em http, etc) → cai para download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
