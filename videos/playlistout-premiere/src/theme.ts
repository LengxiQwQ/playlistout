import timeline from './timeline.json';

export const FPS = timeline.fps;
export const WIDTH = timeline.width;
export const HEIGHT = timeline.height;
export const DURATION = Math.round(timeline.duration * FPS);
export const BPM = timeline.bpm;

export const s = (seconds: number) => Math.round(seconds * FPS);
export const cue = (name: keyof typeof timeline.cues) => s(timeline.cues[name]);

export const SCENES = {
  intro: { in: s(timeline.scenes.intro.in), out: s(timeline.scenes.intro.out), end: s(timeline.scenes.intro.end) },
  parse: { in: s(timeline.scenes.parse.in), out: s(timeline.scenes.parse.out), end: s(timeline.scenes.parse.end) },
  export: { in: s(timeline.scenes.export.in), out: s(timeline.scenes.export.out), end: s(timeline.scenes.export.end) },
  batch: { in: s(timeline.scenes.batch.in), out: s(timeline.scenes.batch.out), end: s(timeline.scenes.batch.end) },
  cli: { in: s(timeline.scenes.cli.in), out: s(timeline.scenes.cli.out), end: s(timeline.scenes.cli.end) },
  eco: { in: s(timeline.scenes.eco.in), out: s(timeline.scenes.eco.out), end: s(timeline.scenes.eco.end) },
  finale: { in: s(timeline.scenes.finale.in), out: s(timeline.scenes.finale.out), end: s(timeline.scenes.finale.end) },
} as const;

export const C = {
  paper: '#f2ecdf',
  paperDeep: '#e8dfcd',
  paperCream: '#faf5e9',
  paperWhite: '#fffdf6',
  ink: '#2d3436',
  inkSoft: '#5f615b',
  inkMuted: '#8d8a7d',
  line: '#ddd3c2',
  marginRed: '#f17e76',
  yellow: '#ffe89a',
  yellowDeep: '#f4c84f',
  yellowLight: '#fff5c9',
  pink: '#f6d9df',
  pinkDeep: '#e8a8b8',
  blue: '#dceef4',
  blueDeep: '#86bdcc',
  mint: '#dff1e2',
  mintDeep: '#7ebc93',
  lilac: '#e7e0f3',
  lilacDeep: '#a695cd',
  peach: '#f7ddc8',
  black: '#20201d',
  terminal: '#171916',
  terminalGlow: '#f5e7b2',
  terminalGreen: '#8fcf9e',
  terminalCyan: '#8bc7cf',
  terminalAmber: '#e8bb76',
  white: '#ffffff',
} as const;

export const F = {
  display: '"MaShan", "NotoSansSC", "Microsoft YaHei", serif',
  hand: '"Caveat", "MaShan", "NotoSansSC", cursive',
  note: '"MaShan", "Caveat", "NotoSansSC", serif',
  marker: '"PermanentMarker", "MaShan", "NotoSansSC", cursive',
  sans: '"NotoSansSC", "Microsoft YaHei", "Segoe UI", sans-serif',
  mono: '"SpaceMono", "NotoSansSC", "Microsoft YaHei", monospace',
} as const;

export const SHADOW = {
  soft: '0 6px 14px rgba(72, 58, 37, 0.10), 0 1px 2px rgba(72, 58, 37, 0.08), 0 1px 0 rgba(255,255,255,0.35) inset',
  paper:
    '0 26px 55px rgba(66, 52, 31, 0.18), 0 8px 16px rgba(66, 52, 31, 0.08), 0 1px 0 rgba(255,255,255,0.55) inset',
  lifted: '0 18px 34px rgba(60, 46, 26, 0.14), 0 3px 7px rgba(60, 46, 26, 0.09)',
  cutout: '6px 7px 0 rgba(45, 52, 54, 0.9)',
  cutoutSm: '3px 3px 0 rgba(45, 52, 54, 0.9)',
} as const;

export const EASE = {
  journal: [0.16, 1, 0.3, 1] as const,
  soft: [0.22, 1, 0.36, 1] as const,
  snap: [0.2, 0.9, 0.2, 1] as const,
} as const;

export const beat = (seconds: number) => seconds * (BPM / 60);
