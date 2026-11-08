import timeline from './timeline.json';

export const FPS = timeline.fps;
export const WIDTH = timeline.width;
export const HEIGHT = timeline.height;
export const DURATION = timeline.duration;
export const TOTAL_FRAMES = Math.round(DURATION * FPS); // 1740 frames
export const BPM = timeline.bpm;
export const FRAMES_PER_BEAT = (60 / BPM) * FPS; // 15 frames per beat at 120 BPM, 30 fps

export const s = (seconds: number) => Math.round(seconds * FPS);

export const SCENES = Object.fromEntries(
  Object.entries(timeline.scenes).map(([k, v]) => {
    const item = v as { in: number; out: number; end: number };
    return [k, { in: s(item.in), out: s(item.out), end: s(item.end) }];
  }),
) as Record<keyof typeof timeline.scenes, { in: number; out: number; end: number }>;

export const CUES = Object.fromEntries(
  Object.entries(timeline.cues).map(([k, v]) => [k, s(v as number)]),
) as Record<keyof typeof timeline.cues, number>;

export const cue = (name: keyof typeof timeline.cues) => CUES[name];

export const C = {
  // Journal Paper Palette
  paper: '#F7F3E9',
  paperCream: '#FFFDF6',
  paperWhite: '#FFFFFF',
  paperKraft: '#EBD9BA',
  paperDarkKraft: '#D4BC93',
  ink: '#2B3942',
  inkSoft: '#4A5B66',
  inkMuted: '#788994',
  notebookLine: 'rgba(92, 134, 168, 0.12)',
  notebookMargin: 'rgba(239, 107, 107, 0.35)',

  // Sky Cloud Mascot Official Blue Palette
  skyBlueLight: '#F4FBFF',
  skyBlueMain: '#BDE6FA',
  skyBlueDeep: '#8AC5E6',
  skyBlueOutline: '#567F99',
  skyBlueAccent: '#FF9EB5',
  skyBlueCheeks: '#FF8FA8',
  skyBlueSparkle: '#FFE07D',

  // Washi Tape & Accent Colors
  tapePink: 'rgba(255, 175, 195, 0.85)',
  tapeCyan: 'rgba(154, 230, 245, 0.85)',
  tapeYellow: 'rgba(255, 232, 140, 0.90)',
  tapeGreen: 'rgba(168, 236, 185, 0.85)',
  tapePurple: 'rgba(215, 185, 245, 0.85)',
  tapeOrange: 'rgba(255, 205, 155, 0.85)',

  // Six Music Platform Brand Colors
  platformQQ: '#10B981',        // Emerald Green
  platformNetEase: '#EF4444',   // Crimson Red
  platformKuGou: '#0EA5E9',     // Azure Blue
  platformKuWo: '#F59E0B',      // Amber Gold
  platformQiShui: '#06B6D4',    // Bubble Cyan
  platformMiGu: '#8B5CF6',      // Royal Purple

  // Terminal & Geeks
  terminalBg: '#181E24',
  terminalHeader: '#242C35',
  terminalCyan: '#38BDF8',
  terminalGreen: '#4ADE80',
  terminalYellow: '#FDE047',
  terminalPink: '#F472B6',

  // Status & Badges
  badgeVIP: '#F59E0B',
  badgeLossless: '#0EA5E9',
  badgeNormal: '#10B981',
  badgeOffline: '#94A3B8',
};

export const F = {
  display: "'MaShan', 'ZCOOLKuaiLe', 'NotoSansSC', cursive, sans-serif",
  kuaile: "'ZCOOLKuaiLe', 'MaShan', 'NotoSansSC', cursive, sans-serif",
  hand: "'MaShan', 'Caveat', 'NotoSansSC', cursive",
  marker: "'PermanentMarker', 'ZCOOLKuaiLe', 'MaShan', 'NotoSansSC', cursive",
  sans: "'NotoSansSC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'SpaceMono', 'Courier New', monospace",
};
