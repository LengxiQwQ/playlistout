import timeline from './timeline.json';

export const FPS = timeline.fps;
export const WIDTH = timeline.width;
export const HEIGHT = timeline.height;
export const DURATION = timeline.duration;
export const TOTAL_FRAMES = Math.round(DURATION * FPS);
export const BPM = timeline.bpm;
export const FRAMES_PER_BEAT = (60 / BPM) * FPS; // 15 frames per beat at 120 BPM, 30 fps

export const s = (seconds: number) => Math.round(seconds * FPS);

export const SCENES = Object.fromEntries(
  Object.entries(timeline.scenes).map(([k, v]) => [
    k,
    { in: s(v.in), out: s(v.out), end: s(v.end) },
  ]),
) as Record<keyof typeof timeline.scenes, { in: number; out: number; end: number }>;

export const CUES = Object.fromEntries(
  Object.entries(timeline.cues).map(([k, v]) => [k, s(v)]),
) as Record<keyof typeof timeline.cues, number>;

export const cue = (name: keyof typeof timeline.cues) => CUES[name];

export const C = {
  paper: '#f5efe2',
  paperCream: '#faf5e8',
  paperWhite: '#fffdf8',
  ink: '#2d3436',
  inkSoft: '#4e585b',
  inkMuted: '#737d80',
  line: '#dfd5c3',
  marginRed: '#ee6f65',

  yellow: '#fff4a3',
  yellowCard: '#fff8bd',
  yellowLight: '#fffbe0',
  yellowDeep: '#9e7012',

  pink: '#fde6ee',
  pinkSoft: '#fbd2df',
  pinkAccent: '#f498b2',
  pinkDeep: '#a63e5b',

  mint: '#dff6ec',
  mintDeep: '#266b4e',

  blue: '#e3f4fc',
  blueDeep: '#215a7d',

  lilac: '#eee5fb',
  lilacDeep: '#61438a',

  peach: '#ffe8d4',
  peachDeep: '#a35620',

  terminal: '#1e2226',
  terminalHeader: '#2a3036',

  tapePink: 'rgba(244, 114, 182, 0.54)',
  tapeCyan: 'rgba(116, 218, 224, 0.56)',
  tapeGreen: 'rgba(134, 228, 172, 0.54)',
  tapeYellow: 'rgba(253, 228, 120, 0.68)',
};

export const F = {
  display: "'MaShan', 'ZCOOLKuaiLe', 'NotoSansSC', cursive, sans-serif",
  kuaile: "'ZCOOLKuaiLe', 'MaShan', 'NotoSansSC', cursive, sans-serif",
  hand: "'MaShan', 'Caveat', 'NotoSansSC', cursive",
  marker: "'PermanentMarker', 'ZCOOLKuaiLe', 'MaShan', 'NotoSansSC', cursive",
  sans: "'NotoSansSC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'SpaceMono', 'NotoSansSC', monospace",
};

export const SHADOW = {
  cutout: '6px 6px 0 0 #2d3436',
  cutoutSm: '4px 4px 0 0 #2d3436',
  cutoutLg: '9px 10px 0 0 #2d3436',
  paper: '0 2px 3px rgba(55, 40, 12, 0.25), 6px 8px 0 rgba(45, 52, 54, 0.16)',
  lifted: '0 6px 14px rgba(55, 40, 12, 0.18), 8px 10px 0 rgba(45, 52, 54, 0.22)',
  sticker: '3px 4px 0 #2d3436',
};
