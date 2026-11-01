/* Generated from src/lib/post-art.ts (the production halftone cover engine), so the
 * explorations draw the same motifs as emdashcms.com. Regenerate from the repo root:
 * node_modules/.pnpm/esbuild@<version>/node_modules/esbuild/bin/esbuild src/lib/post-art.ts \
 *   --bundle --format=iife --global-name=EmDashArt --target=es2020 --outfile=explorations/grain-gradients/halftone.js
 */
"use strict";
var EmDashArt = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/lib/post-art.ts
  var post_art_exports = {};
  __export(post_art_exports, {
    ART_CELL: () => ART_CELL,
    ART_GRIDS: () => ART_GRIDS,
    ART_VERSION: () => ART_VERSION,
    halftoneArt: () => halftoneArt
  });
  var ART_VERSION = 2;
  var ART_CELL = 10;
  var LEVEL_DIAMETERS = [0.14, 0.24, 0.34, 0.45, 0.57, 0.7];
  var ART_GRIDS = {
    card: { columns: 36, rows: 22 },
    feature: { columns: 52, rows: 38 },
    hero: { columns: 64, rows: 32 }
  };
  var dotDiameter = (level) => Math.round(LEVEL_DIAMETERS[level] * ART_CELL * 100) / 100;
  var THRESHOLD = 0.07;
  var MOTIFS = [
    "waves",
    "ripple",
    "dash",
    "sphere",
    "lines",
    "waveform",
    "braid",
    "stack",
    "horizon",
    "calendar"
  ];
  var UPRIGHT = /* @__PURE__ */ new Set(["lines", "calendar"]);
  function hash(input) {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function random(seed) {
    let state = seed;
    return () => {
      state = state + 1831565813 | 0;
      let t = Math.imul(state ^ state >>> 15, 1 | state);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var clamp = (value) => Math.min(1, Math.max(0, value));
  var between = (rand, min, max) => min + rand() * (max - min);
  var smoothstep = (edge0, edge1, value) => {
    const t = clamp((value - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  };
  var TAU = Math.PI * 2;
  var BLANK = { intensity: 0, accent: false };
  function motifField(motif, rand, aspect, pitch) {
    switch (motif) {
      case "waves": {
        const angle = between(rand, -0.6, 0.6);
        const frequency = between(rand, 3, 3.8);
        const bend = between(rand, 0.08, 0.14);
        const bendFrequency = between(rand, 0.6, 1);
        const phase = rand();
        const focus = { x: aspect * between(rand, 0.4, 0.7), y: between(rand, 0.35, 0.65) };
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const bandAt = (x, y) => {
          const along = x * cos + y * sin;
          const across = -x * sin + y * cos;
          return frequency * (across + bend * Math.sin(TAU * bendFrequency * along)) + phase;
        };
        const accentBand = Math.floor(bandAt(focus.x, focus.y));
        return (x, y) => {
          const t = bandAt(x, y);
          const wave = (0.5 + 0.5 * Math.sin(TAU * t)) ** 1.6;
          const seam = 0.3 * (0.5 - 0.5 * Math.sin(TAU * t)) ** 8;
          const distance = Math.hypot(x - focus.x, y - focus.y);
          const envelope = Math.exp(-((distance / 0.85) ** 2));
          const intensity = Math.max(wave, seam) * (0.18 + 0.82 * envelope);
          return {
            intensity,
            accent: Math.floor(t) === accentBand && wave > 0.45 && distance < 0.5
          };
        };
      }
      case "ripple": {
        const snap = (value) => (Math.floor(value / pitch) + 0.5) * pitch;
        const cx = snap(aspect * (rand() < 0.5 ? between(rand, 0.18, 0.32) : between(rand, 0.68, 0.82)));
        const cy = snap(between(rand, 0.35, 0.65));
        const frequency = between(rand, 4.2, 5.4);
        const phase = between(rand, 0, 0.3);
        const drop = Math.max(0.5 / frequency, 2.3 * pitch);
        return (x, y) => {
          const r = Math.hypot(x - cx, y - cy);
          if (r < drop) return { intensity: 1, accent: true };
          if (r < drop + pitch) return BLANK;
          const ring = 0.5 + 0.5 * Math.cos(TAU * (r * frequency - phase));
          const envelope = Math.exp(-r * 1.25);
          return { intensity: ring * (0.12 + 0.88 * envelope), accent: false };
        };
      }
      case "dash": {
        const cx = aspect / 2;
        const middleRow = Math.round(between(rand, 0.46, 0.54) / pitch - 0.5);
        const cy = (middleRow + 0.5) * pitch;
        const half = aspect * between(rand, 0.2, 0.23);
        const halfRows = Math.round(between(rand, 0.095, 0.1) / pitch - 0.5);
        const radius = (halfRows + 0.5) * pitch;
        const glow = between(rand, 3, 4) * pitch;
        return (x, y) => {
          const dx = Math.max(Math.abs(x - cx) - half, 0);
          const edge = Math.hypot(dx, y - cy) - radius;
          if (edge <= 0) return { intensity: 1, accent: true };
          if (edge >= glow) return BLANK;
          return { intensity: 0.62 * (1 - edge / glow) ** 1.5, accent: true };
        };
      }
      case "sphere": {
        const radius = between(rand, 0.36, 0.4);
        const cx = aspect * between(rand, 0.5, 0.56);
        const cy = between(rand, 0.46, 0.52);
        const light = { x: -0.55, y: -0.6, z: 0.58 };
        return (x, y) => {
          const nx = (x - cx) / radius;
          const ny = (y - cy) / radius;
          const r2 = nx * nx + ny * ny;
          if (r2 > 1) {
            const sx = (x - cx - radius * 0.45) / (radius * 1.2);
            const sy = (y - cy - radius * 0.8) / (radius * 0.42);
            return { intensity: Math.exp(-(sx * sx + sy * sy) * 1.4) * 0.42, accent: false };
          }
          const nz = Math.sqrt(1 - r2);
          const lambert = clamp(nx * light.x + ny * light.y + nz * light.z);
          if (lambert > 0.97) return BLANK;
          return { intensity: 0.2 + 0.8 * (1 - lambert), accent: r2 > 0.7 && lambert < 0.3 };
        };
      }
      case "lines": {
        const rowOf = (value) => Math.round(value / pitch);
        const left = aspect * between(rand, 0.1, 0.16);
        const top = between(rand, 0.2, 0.26);
        const count = 4 + Math.floor(rand() * 2);
        const headingRows = Math.max(2, rowOf(0.075));
        const headingTop = rowOf(top) - Math.floor(headingRows / 2);
        const bodyTop = rowOf(top + 0.2);
        const leading = Math.max(3, rowOf(0.13));
        const lines = Array.from({ length: count }, (_, i) => {
          const heading = i === 0;
          const last = i === count - 1;
          const reach = heading ? between(rand, 0.34, 0.48) : last ? between(rand, 0.3, 0.46) : between(rand, 0.6, 0.78);
          const first = heading ? headingTop : bodyTop + (i - 1) * leading;
          return { first, last: heading ? first + headingRows - 1 : first, end: left + aspect * reach };
        });
        const caretLine = lines[count - 1];
        const caretColumn = Math.floor((caretLine.end + aspect * 0.035) / pitch);
        return (x, y) => {
          const row = Math.floor(y / pitch);
          if (Math.floor(x / pitch) === caretColumn && row >= caretLine.first - 1 && row <= caretLine.last + 1) {
            return { intensity: 1, accent: true };
          }
          for (const line of lines) {
            if (row >= line.first && row <= line.last && x >= left && x <= line.end) {
              const progress = (x - left) / (line.end - left);
              return { intensity: 1 - 0.55 * smoothstep(0.35, 1, progress), accent: false };
            }
          }
          return BLANK;
        };
      }
      case "waveform": {
        const totalColumns = Math.round(aspect / pitch);
        const step = Math.max(2, Math.round(0.09 / pitch));
        const count = Math.floor((totalColumns * 0.84 + 1) / step);
        const left = Math.round((totalColumns - (count * step - 1)) / 2);
        const middleRow = Math.round(0.5 / pitch - 0.5);
        const cx = aspect / 2;
        const swells = [0, 1].map(() => ({ frequency: between(rand, 7, 13), phase: rand() * TAU }));
        const loudness = (x) => {
          const t = (x - cx) / (aspect * 0.42);
          const wobble = 0.5 + 0.3 * Math.sin(swells[0].frequency * x + swells[0].phase) + 0.2 * Math.sin(swells[1].frequency * x + swells[1].phase);
          return Math.exp(-((t / 0.62) ** 2)) * (0.55 + 0.45 * wobble);
        };
        return (x, y) => {
          const row = Math.floor(y / pitch);
          const column = Math.floor(x / pitch) - left;
          const inBar = column >= 0 && column < count * step - 1 && column % step !== step - 1;
          if (inBar) {
            const bar = Math.floor(column / step);
            const barX = (left + bar * step + (step - 1) / 2) * pitch;
            const reach = Math.round((0.04 + 0.32 * loudness(barX)) / pitch);
            const offset = Math.abs(row - middleRow);
            if (offset <= reach) {
              return {
                intensity: 0.95 - 0.4 * (offset / Math.max(1, reach)),
                accent: Math.abs(barX - cx) < 1.5 * step * pitch
              };
            }
          }
          if (row !== middleRow) return BLANK;
          return { intensity: 0.32 * smoothstep(aspect * 0.5, aspect * 0.3, Math.abs(x - cx)), accent: false };
        };
      }
      case "braid": {
        const cx = aspect / 2;
        const cy = between(rand, 0.46, 0.54);
        const tilt = between(rand, -0.14, 0.14);
        const span = aspect * 0.52;
        const amplitude = between(rand, 0.15, 0.18);
        const twists = between(rand, 1, 1.3);
        const frequency = TAU * twists / (2 * span);
        const phase = rand() * TAU;
        const width = between(rand, 0.05, 0.058);
        const cos = Math.cos(tilt);
        const sin = Math.sin(tilt);
        const depths = [0, 0, 0];
        const offsets = [0, 0, 0];
        const order = [0, 1, 2];
        const nearestFirst = (a, b) => depths[b] - depths[a];
        return (x, y) => {
          const u = (x - cx) * cos + (y - cy) * sin;
          const v = -(x - cx) * sin + (y - cy) * cos;
          const taper = smoothstep(span, span * 0.7, Math.abs(u));
          if (taper === 0) return BLANK;
          for (let k = 0; k < 3; k++) {
            const theta = frequency * u + phase + k * TAU / 3;
            depths[k] = Math.cos(theta);
            offsets[k] = amplitude * Math.sin(theta);
          }
          order.sort(nearestFirst);
          for (let i = 0; i < 3; i++) {
            const k = order[i];
            const depth = depths[k];
            const halfWidth = Math.max(0.75 * pitch, width * (0.45 + 0.55 * taper) * (0.75 + 0.25 * depth));
            const distance = Math.abs(v - offsets[k]) / Math.hypot(1, amplitude * frequency * depth);
            if (distance <= halfWidth) {
              return { intensity: (0.62 + 0.33 * depth) * (0.6 + 0.4 * taper), accent: k === 0 };
            }
            if (distance <= halfWidth + pitch) return BLANK;
          }
          return BLANK;
        };
      }
      case "stack": {
        const tones = [0.66, 0.9, 0.44];
        const slope = Math.tan(Math.PI / 6);
        const halfWidth = between(rand, 0.46, 0.5);
        const halfHeight = halfWidth * slope;
        const spacing = between(rand, 0.12, 0.135);
        const cx = aspect / 2;
        const top = 0.5 - spacing * ((tones.length - 1) / 2);
        const inside = (x, y, i) => 1 - Math.abs(x - cx) / halfWidth - Math.abs(y - (top + i * spacing)) / halfHeight;
        const gap = pitch / halfHeight;
        const cell = 2 * halfHeight / 3;
        const toLine = (value) => Math.abs(value / cell - Math.round(value / cell)) * cell * Math.cos(Math.PI / 6);
        return (x, y) => {
          for (let i = 0; i < tones.length; i++) {
            const depth = inside(x, y, i);
            if (depth >= 0) {
              const front = clamp((y - (top + i * spacing)) / halfHeight / 2 + 0.5);
              return { intensity: tones[i] * (0.82 + 0.18 * front), accent: i === 1 };
            }
            if (depth > -gap) return BLANK;
          }
          const dx = x - cx;
          const dy = y - (top - halfHeight);
          const onGrid = Math.min(toLine(dy - dx * slope), toLine(dy + dx * slope)) < pitch * 0.45;
          const fade = smoothstep(0.95, 0.25, Math.hypot(dx / aspect, (y - 0.5) * 0.9));
          return { intensity: onGrid ? 0.22 * fade : 0, accent: false };
        };
      }
      case "horizon": {
        const horizonRow = Math.round(between(rand, 0.58, 0.62) / pitch);
        const horizon = horizonRow * pitch;
        const radius = between(rand, 0.36, 0.4);
        const cx = aspect / 2;
        const cy = horizon + radius * between(rand, 0.1, 0.18);
        const sunHeight = radius - (cy - horizon);
        const glowWidth = 2.5 * pitch;
        const cuts = new Set([1, 3, 6].filter((above) => above * pitch < sunHeight * 0.6));
        const swell = rand() * TAU;
        const ripple = between(rand, 14, 20);
        return (x, y) => {
          const row = Math.floor(y / pitch);
          const r = Math.hypot(x - cx, y - cy);
          if (row < horizonRow) {
            if (r < radius + glowWidth) {
              if (cuts.has(horizonRow - row)) return BLANK;
              const inside = (radius - r) / pitch;
              if (inside >= -0.5) return { intensity: 0.55 + 0.45 * clamp(inside + 0.5), accent: true };
              return { intensity: 0.5 * (1 - (r - radius) / glowWidth) ** 1.4, accent: true };
            }
            const sky = 0.36 * smoothstep(radius * 1.12, radius * 2.4, r) * (0.55 + 0.45 * (1 - y / horizon));
            return { intensity: sky, accent: false };
          }
          if (row === horizonRow) return { intensity: 0.72, accent: false };
          const below = row - horizonRow;
          const depth = clamp((y - horizon) / (1 - horizon));
          const even = below % 2 === 0;
          const strength = even ? 1 : 0.5;
          const halfLength = radius * (0.9 - 0.45 * depth) * (even ? 1 : 0.72) * (0.85 + 0.15 * Math.cos(below * 2.3));
          const shift = radius * 0.06 * Math.sin(below * 1.7);
          const fromEnd = (halfLength - Math.abs(x - cx - shift)) / pitch;
          if (fromEnd >= -0.5) {
            return { intensity: (0.95 - 0.35 * depth) * strength * (0.6 + 0.4 * clamp(fromEnd + 0.5)), accent: true };
          }
          const wave = 0.55 + 0.45 * Math.sin(ripple * x + below * 2.39 + swell);
          return { intensity: (0.14 + 0.5 * depth) * strength * wave, accent: false };
        };
      }
      case "calendar": {
        const totalColumns = Math.round(aspect / pitch);
        const totalRows = Math.round(1 / pitch);
        const tile = Math.max(3, Math.min(Math.round(0.15 / pitch), Math.floor((totalColumns * 0.84 + 1) / 7) - 1));
        const step = tile + 1;
        const weeks = 4;
        const width = 7 * step - 1;
        const titleRows = Math.max(2, Math.round(0.08 / pitch));
        const header = titleRows + 3;
        const height = header + weeks * step - 1;
        const left = Math.round((totalColumns - width) / 2);
        const top = Math.round((totalRows - height) / 2);
        const titleLength = width * between(rand, 0.32, 0.42);
        const days = weeks * 7;
        const today = Math.floor(days * between(rand, 0.55, 0.8));
        const scheduled = Math.min(days - 1, today + 1 + Math.floor(rand() * 4));
        const shades = Array.from({ length: days }, () => rand());
        return (x, y) => {
          const column = Math.floor(x / pitch) - left;
          const row = Math.floor(y / pitch) - top;
          if (column < 0 || row < 0 || column >= width || row >= height) return BLANK;
          if (row < titleRows) {
            const progress = column / titleLength;
            return progress > 1 ? BLANK : { intensity: 0.95 - 0.5 * smoothstep(0.4, 1, progress), accent: false };
          }
          const inX = column % step;
          if (row === titleRows + 1) {
            return Math.abs(inX - (tile - 1) / 2) <= (tile - 2) / 2 ? { intensity: 0.38, accent: false } : BLANK;
          }
          if (row < header) return BLANK;
          const weekRow = row - header;
          const inY = weekRow % step;
          if (inX === tile || inY === tile) return BLANK;
          if (tile > 3 && (inX === 0 || inX === tile - 1) && (inY === 0 || inY === tile - 1)) return BLANK;
          const day = Math.floor(weekRow / step) * 7 + Math.floor(column / step);
          if (day === scheduled) return { intensity: 1, accent: true };
          const shade = shades[day];
          if (day > today || shade < 0.15) return { intensity: 0.14, accent: false };
          return { intensity: shade < 0.5 ? 0.45 : shade < 0.8 ? 0.66 : 0.88, accent: false };
        };
      }
    }
  }
  function halftoneArt(seed, columns, rows) {
    const seedHash = hash(seed);
    const motif = MOTIFS[seedHash % MOTIFS.length];
    const rand = random(seedHash);
    const aspect = columns / rows;
    const field = motifField(motif, rand, aspect, aspect / columns);
    const mirror = !UPRIGHT.has(motif) && rand() < 0.5;
    const levels = LEVEL_DIAMETERS.length;
    const paths = Array.from({ length: levels * 2 }, () => "");
    const dots = [];
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const u = (column + 0.5) / columns;
        const x = (mirror ? 1 - u : u) * aspect;
        const y = (row + 0.5) / rows;
        const { intensity, accent } = field(x, y);
        const value = clamp(intensity);
        if (value < THRESHOLD) continue;
        const level = Math.min(levels - 1, Math.floor((value - THRESHOLD) / (1 - THRESHOLD) * levels));
        const cx = column * ART_CELL + ART_CELL / 2;
        const cy = row * ART_CELL + ART_CELL / 2;
        paths[(accent ? levels : 0) + level] += `M${cx} ${cy}h0`;
        dots.push({ cx, cy, diameter: dotDiameter(level), accent });
      }
    }
    return {
      key: seedHash.toString(36),
      motif,
      width: columns * ART_CELL,
      height: rows * ART_CELL,
      layers: paths.flatMap(
        (d, index) => d ? [
          {
            level: index % levels + 1,
            accent: index >= levels,
            width: dotDiameter(index % levels),
            d
          }
        ] : []
      ),
      dots
    };
  }
  return __toCommonJS(post_art_exports);
})();
