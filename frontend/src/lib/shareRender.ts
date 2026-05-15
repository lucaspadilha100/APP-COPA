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

  // 3) Team name
  drawCenteredText(ctx, teamName.toUpperCase(), cx, H * 0.68, "bold 56px Poppins, system-ui, sans-serif", "#ffffff");

  // 4) Score (big) or "vs"
  if (hasScore) {
    const score = `${game.home_score}  ×  ${game.away_score}`;
    drawCenteredText(ctx, score, cx, H * 0.75, "900 130px Poppins, system-ui, sans-serif", "#ffffff");
  } else {
    drawCenteredText(ctx, "×", cx, H * 0.75, "900 90px Poppins, system-ui, sans-serif", "#ffffff");
  }

  // 5) Adversary
  drawCenteredText(ctx, (game.opponent || "").toUpperCase(), cx, H * 0.82, "bold 56px Poppins, system-ui, sans-serif", "#ffffff");

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
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Copa Segue-Me 2026" });
      return;
    } catch {
      // user cancelled or share failed → fallback to download
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
