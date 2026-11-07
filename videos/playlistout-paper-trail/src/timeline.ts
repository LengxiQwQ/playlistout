export const FPS = 30;
export const DURATION_SECONDS = 56;
export const DURATION_FRAMES = FPS * DURATION_SECONDS;

export const at = (seconds: number) => Math.round(seconds * FPS);

/**
 * Master cue map. The score and the edit share these numbers:
 * 120 BPM, one beat = 0.5 s, one bar = 2 s.
 */
export const CUES = {
  intro: at(0),
  escape: at(3.6),
  brand: at(5.0),
  browser: at(5.8),
  paste: at(7.3),
  parse: at(8.5),
  result: at(9.1),
  table: at(10.4),
  exportReveal: at(13.8),
  selectExcel: at(14.25),
  selectJson: at(14.85),
  exportClick: at(15.9),
  exportMorph: at(16.3),
  excelBorn: at(17.4),
  jsonBorn: at(18.45),
  formatsFan: at(19.35),
  excelDetail: at(20.55),
  jsonDetail: at(22.1),
  batchDoor: at(25.4),
  batch: at(26.0),
  batchSelect: at(27.3),
  batchClick: at(28.1),
  batchProgress: at(28.45),
  workbook: at(30.0),
  zip: at(31.4),
  packUp: at(33.1),
  terminal: at(35.55),
  cliCommand: at(37.0),
  cliMenu: at(38.0),
  cliPaste: at(38.9),
  cliFetch: at(39.8),
  cliDetails: at(40.45),
  cliFormats: at(41.35),
  cliChoice: at(42.25),
  cliExport: at(43.05),
  cliDone: at(43.9),
  cliOutro: at(44.7),
  ecosystem: at(45.55),
  players: at(46.2),
  nextStops: at(48.0),
  finaleWipe: at(51.35),
  finale: at(51.9),
  finalHit: at(54.0),
  end: DURATION_FRAMES,
} as const;

export const SCENE_SPANS = {
  intro: { from: 0, duration: at(6.0) },
  browser: { from: at(5.0), duration: at(31.2) },
  terminal: { from: at(35.55), duration: at(10.7) },
  ecosystem: { from: at(45.55), duration: at(6.6) },
  finale: { from: at(51.35), duration: at(4.65) },
} as const;

export const BEAT = 0.5;
export const beatFrame = (beat: number) => at(beat * BEAT);
