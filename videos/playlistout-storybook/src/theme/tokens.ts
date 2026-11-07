export const FPS = 30;
export const BPM = 120;
export const BEAT_FRAMES = 15; // 0.5s at 30fps
export const BAR_FRAMES = 60;  // 2.0s at 30fps
export const TOTAL_FRAMES = 1680; // 56.0s (28 bars)

export const COLORS = {
  paper: '#f6f1e5',
  paperCream: '#faf5ea',
  paperWhite: '#ffffff',
  ink: '#2d3436',
  inkLight: '#636e72',
  inkMuted: '#8a8f92',
  line: '#e2dacd',
  marginRed: '#ff8a80',

  // Sticky Note & Stationery Palette (exact match to web/src/design/tokens.css)
  noteYellow: '#fff8bd',
  noteYellowDark: '#fef08a',
  highlightYellow: '#ffeaa7',
  noteMint: '#dff7ef',
  noteBlue: '#e8f8ff',
  notePink: '#fde8ec',
  noteLavender: '#f3e8ff',

  // Sticker Palette (exact match to web/src/components/ui/Sticker.tsx)
  stickerWhite: '#ffffff',
  stickerYellow: '#fef08a',
  stickerPink: '#fbcfe8',
  stickerCyan: '#81ecec',
  stickerGreen: '#bbf7d0',
  stickerBlue: '#bfdbfe',
  stickerPurple: '#e9d5ff',
  stickerRed: '#fecaca',
  stickerLime: '#d9f99d',

  // Washi Tape Palette
  tapePink: 'rgba(244, 114, 182, 0.62)',
  tapeCyan: 'rgba(86, 216, 216, 0.62)',
  tapeGreen: 'rgba(110, 231, 160, 0.58)',
  tapeYellow: 'rgba(250, 224, 90, 0.72)',
  tapePurple: 'rgba(192, 132, 252, 0.58)',

  // Brand & Platform Accents
  amber: '#d97706',
  gold: '#eab308',
  qqGreen: '#059669',
  qqBg: '#f0fdf4',
  neteaseRed: '#e11d48',
  neteaseBg: '#fff1f2',
  kugouBlue: '#2563eb',
  kugouBg: '#eff6ff',
  kuwoYellow: '#ca8a04',
  kuwoBg: '#fefce8',
  qishuiLime: '#65a30d',
  qishuiBg: '#f7fee7',
  miguPink: '#db2777',
  miguBg: '#fdf2f8',

  // Terminal Dark Stationery
  terminalBg: '#15191e',
  terminalHeader: '#22272e',
  terminalGreen: '#4ade80',
  terminalCyan: '#38bdf8',
  terminalAmber: '#fbbf24',
  terminalRed: '#f87171',
  terminalMagenta: '#e879f9',
};

export const FONTS = {
  marker: "'Permanent Marker', 'Ma Shan Zheng', 'Microsoft YaHei UI', cursive, sans-serif",
  handwriting: "'Ma Shan Zheng', 'Caveat', 'Microsoft YaHei UI', cursive, sans-serif",
  playful: "'ZCOOL KuaiLe', 'Ma Shan Zheng', 'Microsoft YaHei UI', sans-serif",
  mono: "'Space Mono', 'Microsoft YaHei UI', 'Segoe UI', monospace",
  sans: "'Microsoft YaHei UI', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
};

export const BORDERS = {
  handDrawn: '255px 15px 225px 15px / 15px 225px 15px 255px',
  handDrawnAlt: '15px 225px 15px 255px / 255px 15px 225px 15px',
  handDrawnSubtle: '18px 230px 16px 240px / 240px 16px 230px 18px',
};

export const SHADOWS = {
  paper: '8px 10px 0 rgba(45, 52, 54, 0.15)',
  paperWarm: '0 2px 3px rgba(50, 36, 6, 0.25), 6px 8px 0 rgba(65, 48, 12, 0.18)',
  cutout: '6px 6px 0 0 #2d3436',
  cutoutSm: '3.5px 3.5px 0 0 #2d3436',
  sticker: '3px 3px 0 #2d3436',
};

// Scene frame boundaries (overlapping for continuous spatial transitions)
export const ACT_TIMING = {
  act1: { start: 0, end: 240 },      // 00.0s - 08.0s: 歌单困境与项目登场
  act2: { start: 215, end: 585 },    // 07.2s - 19.5s: 网页解析歌单
  act3: { start: 560, end: 870 },    // 18.7s - 29.0s: 多格式导出
  act4: { start: 845, end: 1155 },   // 28.2s - 38.5s: 批量导出
  act5: { start: 1130, end: 1468 },  // 37.7s - 48.9s: 桌面 CLI 工具
  act6: { start: 1445, end: 1615 },  // 48.2s - 53.8s: 第三方生态与扩展能力
  act7: { start: 1595, end: 1680 },  // 53.2s - 56.0s: 品牌结尾
};
