"use client";
import { useEffect, useRef } from "react";

// ============================================================================
// Types — mirrors the full parameter spec. Not every renderMode/pfx key has
// a distinct implementation (documented per-branch below); unimplemented
// render modes fall back to "dither", and unimplemented pfx keys are no-ops.
// This is a from-scratch reimplementation for Canvas2D, not a port of any
// existing internal code.
// ============================================================================

export type RenderMode =
  | "characters" | "dither" | "mosaic" | "pixel" | "dots" | "cross" | "diamond"
  | "voxel" | "lego" | "mixed" | "lines" | "diagonal" | "braille" | "disco"
  | "hexdump" | "matrix" | "rings" | "hearts" | "stars" | "hexagons"
  | "triangles" | "bubbles" | "hatch" | "contour" | "halfblocks";

export type BgMode = "blur" | "solid" | "photo" | "none";
export type AnimStyle = "wave" | "pulse" | "shimmer" | "ripple" | "flicker";
export type OverlayBlend = "overlay" | "screen" | "multiply" | "source-over";

export interface PfxLayer {
  enabled: boolean;
  intensity: number; // 0-100
}

export interface AsciiEffectConfig {
  renderMode: RenderMode;
  bgMode: BgMode;
  bgBlur: number;
  bgOpacity: number;
  cellSize: number;
  coverage: number; // 0-100 % of cells drawn
  invert: boolean;
  charSet: string;
  customChars: string;
  brightness: number; // -100..100
  contrast: number; // 0..200, 100 = neutral
  edgeEmphasis: number; // 0-100
  density: number; // -100..100, scales primitive size
  tint: string; // hex color
  tintOpacity: number; // 0-100
  overlayBlend: OverlayBlend;
  saturation: number; // 0-200, 100 = neutral
  grayscale: number; // 0-100
  pfx: {
    vignette: PfxLayer;
    scanLines: PfxLayer;
    chromatic: PfxLayer;
    bloom: PfxLayer;
    filmGrain: PfxLayer;
    glitch: PfxLayer;
    pixelate: PfxLayer;
    halftone: PfxLayer;
    filmDust: PfxLayer;
  };
  animated: boolean;
  animStyle: AnimStyle;
  animSpeed: PfxLayer;
  animIntensity: PfxLayer;
}

const CHAR_SETS: Record<string, string[]> = {
  binary: ["0", "1"],
  ascii: [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"],
  blocks: ["░", "▒", "▓", "█"],
  hex: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"],
};

export const DEFAULT_ASCII_CONFIG: AsciiEffectConfig = {
  renderMode: "dither",
  bgMode: "solid",
  bgBlur: 12,
  bgOpacity: 90,
  cellSize: 14,
  coverage: 96,
  invert: false,
  charSet: "binary",
  customChars: "",
  brightness: 0,
  contrast: 115,
  edgeEmphasis: 40,
  density: 0,
  tint: "#00ff66",
  tintOpacity: 45,
  overlayBlend: "overlay",
  saturation: 100,
  grayscale: 0,
  pfx: {
    vignette: { enabled: true, intensity: 38 },
    scanLines: { enabled: true, intensity: 28 },
    chromatic: { enabled: true, intensity: 40 },
    bloom: { enabled: true, intensity: 60 },
    filmGrain: { enabled: true, intensity: 40 },
    glitch: { enabled: true, intensity: 20 },
    pixelate: { enabled: false, intensity: 15 },
    halftone: { enabled: false, intensity: 20 },
    filmDust: { enabled: false, intensity: 20 },
  },
  animated: true,
  animStyle: "flicker",
  animSpeed: { enabled: true, intensity: 100 },
  animIntensity: { enabled: true, intensity: 60 },
};

// 4x4 Bayer ordered-dither threshold matrix, normalized 0-1.
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => v / 16));

interface Cell {
  gx: number;
  gy: number;
  x: number;
  y: number;
  lum: number; // 0-1, post color-grade
  r: number;
  g: number;
  b: number;
  on: boolean; // survives `coverage` cull
  edge: number; // 0-1 local luminance gradient magnitude, for edgeEmphasis
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const bigint = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

/// Default "subject" drawn when no photo is supplied — a community/aid emblem
/// (radial network of nodes around a heart-in-shield glyph) rendered
/// procedurally so the effect always has clear subject contrast to sample,
/// matching the "use any photo with a clear subject" guidance without
/// requiring an actual uploaded image.
function drawDefaultSubject(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
  g.addColorStop(0, "#0a2a1a");
  g.addColorStop(1, "#000000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.32;

  const nodeCount = 10;
  const nodes: [number, number][] = [];
  for (let i = 0; i < nodeCount; i++) {
    const a = (i / nodeCount) * Math.PI * 2;
    const rr = R * (0.75 + 0.25 * Math.sin(i * 2.1));
    nodes.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = Math.max(1, w * 0.0015);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i][0] - nodes[j][0];
      const dy = nodes[i][1] - nodes[j][1];
      if (Math.hypot(dx, dy) < R * 1.1) {
        ctx.beginPath();
        ctx.moveTo(nodes[i][0], nodes[i][1]);
        ctx.lineTo(nodes[j][0], nodes[j][1]);
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (const [nx, ny] of nodes) {
    ctx.beginPath();
    ctx.arc(nx, ny, Math.max(2, w * 0.004), 0, Math.PI * 2);
    ctx.fill();
  }

  const s = R * 0.9;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.9);
  ctx.quadraticCurveTo(cx + s * 0.9, cy - s * 0.6, cx + s * 0.75, cy + s * 0.1);
  ctx.quadraticCurveTo(cx + s * 0.5, cy + s * 0.85, cx, cy + s * 1.05);
  ctx.quadraticCurveTo(cx - s * 0.5, cy + s * 0.85, cx - s * 0.75, cy + s * 0.1);
  ctx.quadraticCurveTo(cx - s * 0.9, cy - s * 0.6, cx, cy - s * 0.9);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.fill();

  const hs = s * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx, cy + hs * 0.35);
  ctx.bezierCurveTo(cx - hs * 1.3, cy - hs * 0.7, cx - hs * 0.2, cy - hs * 1.5, cx, cy - hs * 0.55);
  ctx.bezierCurveTo(cx + hs * 0.2, cy - hs * 1.5, cx + hs * 1.3, cy - hs * 0.7, cx, cy + hs * 0.35);
  ctx.closePath();
  ctx.fillStyle = "#0a2a1a";
  ctx.fill();

  ctx.restore();
}

export interface AsciiPhotoEffectProps {
  className?: string;
  config?: Partial<AsciiEffectConfig>;
  /** Draw a custom source subject; defaults to the built-in community/aid emblem. */
  drawSource?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

export function AsciiPhotoEffect({ className, config, drawSource }: AsciiPhotoEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cfg: AsciiEffectConfig = { ...DEFAULT_ASCII_CONFIG, ...config, pfx: { ...DEFAULT_ASCII_CONFIG.pfx, ...config?.pfx } };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let cells: Cell[] = [];
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const source = document.createElement("canvas");
    const sctx = source.getContext("2d", { willReadFrequently: true })!;

    const [tr, tg, tb] = hexToRgb(cfg.tint);

    function buildGrid() {
      const rect = canvas!.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      source.width = w;
      source.height = h;
      (drawSource ?? drawDefaultSubject)(sctx, w, h);

      const img = sctx.getImageData(0, 0, w, h).data;
      const cell = cfg.cellSize;
      const cols = Math.ceil(w / cell);
      const rows = Math.ceil(h / cell);
      cells = [];

      const seedRand = (x: number, y: number) => {
        const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return s - Math.floor(s);
      };

      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const px0 = gx * cell;
          const py0 = gy * cell;
          const pw = Math.min(cell, w - px0);
          const ph = Math.min(cell, h - py0);
          let rSum = 0, gSum = 0, bSum = 0, n = 0;
          const step = Math.max(1, Math.floor(cell / 4));
          for (let py = py0; py < py0 + ph; py += step) {
            for (let px = px0; px < px0 + pw; px += step) {
              const idx = (py * w + px) * 4;
              rSum += img[idx];
              gSum += img[idx + 1];
              bSum += img[idx + 2];
              n++;
            }
          }
          n = Math.max(1, n);
          let r = rSum / n, g = gSum / n, b = bSum / n;

          const bAdj = cfg.brightness * 2.55;
          r += bAdj; g += bAdj; b += bAdj;
          const cFactor = cfg.contrast / 100;
          r = (r - 128) * cFactor + 128;
          g = (g - 128) * cFactor + 128;
          b = (b - 128) * cFactor + 128;
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const sFactor = cfg.saturation / 100;
          r = gray + (r - gray) * sFactor;
          g = gray + (g - gray) * sFactor;
          b = gray + (b - gray) * sFactor;
          const gsAmt = cfg.grayscale / 100;
          const gray2 = 0.299 * r + 0.587 * g + 0.114 * b;
          r = r + (gray2 - r) * gsAmt;
          g = g + (gray2 - g) * gsAmt;
          b = b + (gray2 - b) * gsAmt;
          r = Math.max(0, Math.min(255, r));
          g = Math.max(0, Math.min(255, g));
          b = Math.max(0, Math.min(255, b));

          let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          if (cfg.invert) lum = 1 - lum;

          cells.push({
            gx, gy,
            x: px0 + pw / 2,
            y: py0 + ph / 2,
            lum, r, g, b,
            on: seedRand(gx, gy) * 100 < cfg.coverage,
            edge: 0,
          });
        }
      }

      if (cfg.edgeEmphasis > 0) {
        const byPos = new Map(cells.map((c) => [`${c.gx},${c.gy}`, c]));
        for (const c of cells) {
          const right = byPos.get(`${c.gx + 1},${c.gy}`);
          const below = byPos.get(`${c.gx},${c.gy + 1}`);
          const dx = right ? Math.abs(right.lum - c.lum) : 0;
          const dy = below ? Math.abs(below.lum - c.lum) : 0;
          c.edge = Math.min(1, (dx + dy) * 2);
        }
      }
    }

    function drawBackground() {
      if (cfg.bgMode === "none") return;
      if (cfg.bgMode === "solid") {
        ctx!.globalAlpha = cfg.bgOpacity / 100;
        ctx!.fillStyle = "#000000";
        ctx!.fillRect(0, 0, w, h);
        ctx!.globalAlpha = 1;
      } else if (cfg.bgMode === "photo" || cfg.bgMode === "blur") {
        ctx!.save();
        ctx!.globalAlpha = cfg.bgOpacity / 100;
        if (cfg.bgMode === "blur") ctx!.filter = `blur(${cfg.bgBlur}px)`;
        ctx!.drawImage(source, 0, 0, w, h);
        ctx!.restore();
      }
    }

    function animModulation(c: Cell, t: number): number {
      if (!cfg.animated) return 1;
      const speed = (cfg.animSpeed.enabled ? cfg.animSpeed.intensity : 0) / 100;
      const amt = (cfg.animIntensity.enabled ? cfg.animIntensity.intensity : 0) / 100;
      const tt = t * speed * 0.002;
      switch (cfg.animStyle) {
        case "flicker": {
          const n = Math.sin(c.gx * 12.9898 + c.gy * 78.233 + tt * 20) * 43758.5453;
          const rnd = n - Math.floor(n);
          return 1 - amt * (rnd > 0.85 ? rnd : 0);
        }
        case "wave":
          return 1 - amt * 0.5 * (0.5 + 0.5 * Math.sin(c.gx * 0.3 + tt * 4));
        case "pulse":
          return 1 - amt * 0.5 * (0.5 + 0.5 * Math.sin(tt * 3));
        case "shimmer":
          return 1 - amt * 0.5 * (0.5 + 0.5 * Math.sin((c.gx + c.gy) * 0.4 - tt * 6));
        case "ripple": {
          const cx = w / cfg.cellSize / 2, cy = h / cfg.cellSize / 2;
          const d = Math.hypot(c.gx - cx, c.gy - cy);
          return 1 - amt * 0.5 * (0.5 + 0.5 * Math.sin(d * 0.6 - tt * 6));
        }
        default:
          return 1;
      }
    }

    function drawCells(t: number) {
      const cell = cfg.cellSize;
      const densityScale = 1 + cfg.density / 100;
      const chars = CHAR_SETS[cfg.charSet] ?? CHAR_SETS.binary;

      ctx!.save();
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      ctx!.font = `${Math.floor(cell * 0.85)}px monospace`;

      for (const c of cells) {
        if (!c.on) continue;
        const mod = animModulation(c, t);
        const value = Math.max(0, Math.min(1, c.lum * mod + c.edge * (cfg.edgeEmphasis / 100) * 0.3));
        if (value < 0.02) continue;

        const alpha = value;
        const color = `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${alpha})`;

        switch (cfg.renderMode) {
          case "characters": {
            const idx = Math.min(chars.length - 1, Math.floor(value * chars.length));
            ctx!.fillStyle = color;
            ctx!.fillText(chars[idx] ?? chars[0], c.x, c.y);
            break;
          }
          case "pixel":
          case "mosaic": {
            const size = cell * densityScale;
            ctx!.fillStyle = color;
            ctx!.fillRect(c.x - size / 2, c.y - size / 2, size, size);
            break;
          }
          case "dots":
          case "hearts":
          case "stars":
          case "bubbles": {
            ctx!.fillStyle = color;
            ctx!.beginPath();
            ctx!.arc(c.x, c.y, (cell * 0.4 * value) * densityScale, 0, Math.PI * 2);
            ctx!.fill();
            break;
          }
          case "hexdump": {
            const hexChars = CHAR_SETS.hex;
            const idx = Math.min(hexChars.length - 1, Math.floor(value * hexChars.length));
            ctx!.fillStyle = color;
            ctx!.fillText(hexChars[idx], c.x, c.y);
            break;
          }
          case "matrix": {
            const bin = CHAR_SETS.binary;
            ctx!.fillStyle = `rgba(0,255,102,${alpha})`;
            ctx!.fillText(bin[Math.round((c.gx + Math.floor(t / 100)) % 2)], c.x, c.y);
            break;
          }
          case "cross": {
            ctx!.strokeStyle = color;
            ctx!.lineWidth = Math.max(1, cell * 0.12 * densityScale);
            const r = cell * 0.35 * value;
            ctx!.beginPath();
            ctx!.moveTo(c.x - r, c.y); ctx!.lineTo(c.x + r, c.y);
            ctx!.moveTo(c.x, c.y - r); ctx!.lineTo(c.x, c.y + r);
            ctx!.stroke();
            break;
          }
          case "diamond":
          case "hexagons":
          case "triangles":
          case "voxel":
          case "lego": {
            const s = cell * 0.4 * value * densityScale;
            ctx!.fillStyle = color;
            ctx!.beginPath();
            ctx!.moveTo(c.x, c.y - s); ctx!.lineTo(c.x + s, c.y);
            ctx!.lineTo(c.x, c.y + s); ctx!.lineTo(c.x - s, c.y);
            ctx!.closePath();
            ctx!.fill();
            break;
          }
          case "lines":
          case "diagonal":
          case "hatch": {
            ctx!.strokeStyle = color;
            ctx!.lineWidth = Math.max(1, cell * 0.15 * value);
            ctx!.beginPath();
            const r = cell * 0.4;
            ctx!.moveTo(c.x - r, c.y - r);
            ctx!.lineTo(c.x + r, c.y + r);
            ctx!.stroke();
            break;
          }
          case "braille":
          case "halfblocks": {
            ctx!.fillStyle = color;
            ctx!.fillRect(c.x - cell * 0.3, c.y - cell * 0.45 * value, cell * 0.6, cell * 0.9 * value);
            break;
          }
          case "rings":
          case "contour": {
            ctx!.strokeStyle = color;
            ctx!.lineWidth = Math.max(1, cell * 0.1);
            ctx!.beginPath();
            ctx!.arc(c.x, c.y, cell * 0.4 * value, 0, Math.PI * 2);
            ctx!.stroke();
            break;
          }
          case "disco": {
            const hue = (value * 300 + t * 0.05) % 360;
            ctx!.fillStyle = `hsla(${hue},80%,55%,${alpha})`;
            ctx!.beginPath();
            ctx!.arc(c.x, c.y, cell * 0.35 * value, 0, Math.PI * 2);
            ctx!.fill();
            break;
          }
          case "mixed": {
            if ((c.gx + c.gy) % 2 === 0) {
              ctx!.fillStyle = color;
              ctx!.fillRect(c.x - cell * 0.3 * value, c.y - cell * 0.3 * value, cell * 0.6 * value, cell * 0.6 * value);
            } else {
              ctx!.fillStyle = color;
              ctx!.beginPath();
              ctx!.arc(c.x, c.y, cell * 0.35 * value, 0, Math.PI * 2);
              ctx!.fill();
            }
            break;
          }
          case "dither":
          default: {
            const threshold = BAYER_4X4[c.gy % 4][c.gx % 4];
            if (value > threshold * 0.6) {
              const size = cell * Math.min(1, value + 0.15) * densityScale;
              ctx!.fillStyle = color;
              ctx!.fillRect(c.x - size / 2, c.y - size / 2, size, size);
            }
            break;
          }
        }
      }
      ctx!.restore();
    }

    function applyTint() {
      if (cfg.tintOpacity <= 0) return;
      ctx!.save();
      ctx!.globalCompositeOperation = cfg.overlayBlend === "source-over" ? "source-over" : (cfg.overlayBlend as GlobalCompositeOperation);
      ctx!.globalAlpha = cfg.tintOpacity / 100;
      ctx!.fillStyle = `rgb(${tr},${tg},${tb})`;
      ctx!.fillRect(0, 0, w, h);
      ctx!.restore();
    }

    function applyPostEffects(t: number) {
      const { pfx } = cfg;

      if (pfx.bloom.enabled) {
        ctx!.save();
        ctx!.globalCompositeOperation = "screen";
        ctx!.globalAlpha = pfx.bloom.intensity / 200;
        ctx!.filter = `blur(${6 + pfx.bloom.intensity / 8}px)`;
        ctx!.drawImage(canvas!, 0, 0, canvas!.width, canvas!.height, 0, 0, w, h);
        ctx!.restore();
      }

      if (pfx.chromatic.enabled) {
        const shift = pfx.chromatic.intensity / 25;
        ctx!.save();
        ctx!.globalCompositeOperation = "screen";
        ctx!.globalAlpha = 0.5;
        ctx!.drawImage(canvas!, 0, 0, canvas!.width, canvas!.height, shift, 0, w, h);
        ctx!.drawImage(canvas!, 0, 0, canvas!.width, canvas!.height, -shift, 0, w, h);
        ctx!.restore();
      }

      if (pfx.scanLines.enabled) {
        ctx!.save();
        ctx!.globalAlpha = pfx.scanLines.intensity / 200;
        ctx!.fillStyle = "#000000";
        for (let y = 0; y < h; y += 3) ctx!.fillRect(0, y, w, 1);
        ctx!.restore();
      }

      if (pfx.vignette.enabled) {
        ctx!.save();
        const vg = ctx!.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, `rgba(0,0,0,${pfx.vignette.intensity / 100})`);
        ctx!.fillStyle = vg;
        ctx!.fillRect(0, 0, w, h);
        ctx!.restore();
      }

      if (pfx.filmGrain.enabled) {
        ctx!.save();
        const density = Math.floor((pfx.filmGrain.intensity / 100) * (w * h) / 800);
        ctx!.fillStyle = "rgba(255,255,255,0.5)";
        for (let i = 0; i < density; i++) {
          const gx = Math.random() * w;
          const gy = Math.random() * h;
          ctx!.globalAlpha = Math.random() * 0.5;
          ctx!.fillRect(gx, gy, 1, 1);
        }
        ctx!.restore();
      }

      if (pfx.glitch.enabled && Math.random() * 100 < pfx.glitch.intensity * 0.15) {
        ctx!.save();
        const sliceH = 4 + Math.random() * 12;
        const sy = Math.random() * h;
        const dx = (Math.random() - 0.5) * pfx.glitch.intensity;
        ctx!.drawImage(canvas!, 0, sy * dpr, canvas!.width, sliceH * dpr, dx, sy, w, sliceH);
        ctx!.restore();
      }

      if (pfx.pixelate.enabled) {
        const factor = Math.max(2, Math.floor(pfx.pixelate.intensity / 5));
        ctx!.save();
        ctx!.imageSmoothingEnabled = false;
        ctx!.drawImage(canvas!, 0, 0, canvas!.width, canvas!.height, 0, 0, w / factor, h / factor);
        ctx!.drawImage(canvas!, 0, 0, w / factor, h / factor, 0, 0, w, h);
        ctx!.restore();
      }
    }

    function frame(t: number) {
      ctx!.clearRect(0, 0, w, h);
      drawBackground();
      drawCells(t);
      applyTint();
      applyPostEffects(t);
      raf = requestAnimationFrame(frame);
    }

    buildGrid();
    raf = requestAnimationFrame(frame);

    const resizeObserver = new ResizeObserver(() => buildGrid());
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cfg), drawSource]);

  return <canvas ref={canvasRef} className={className} />;
}