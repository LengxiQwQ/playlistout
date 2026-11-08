import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';

const projectRoot = path.resolve(import.meta.dirname, '..');
const entry = path.join(projectRoot, 'src/index.tsx');
const outDir = path.join(projectRoot, 'qa/stills');
mkdirSync(outDir, { recursive: true });

const defaultFrames = [
  40,   // Scene 1A: Trapped inside the birdcage
  90,   // Scene 1A->B: Golden key unlocks padlock
  190,  // Scene 1B: Breakout + Brand Hero + 6 Platforms showcase
  295,  // Scene 2A: Mascot running & pasting URL into Yellow Sticky Note
  430,  // Scene 2B: Parsed 104-track playlist table & mascot guiding
  610,  // Scene 3A: Excel dual-sheet card focus
  780,  // Scene 3B:Excel + Canonical JSON + 6-format dock fan
  920,  // Scene 4A: Batch 3 playlists selected
  1045, // Scene 4B: Multi-sheet workbook + ZIP zipper sealed
  1220, // Scene 5A: CLI interactive + Mascot typing on laptop
  1345, // Scene 5B: CLI exported + Windows/macOS/Linux/npm badges
  1540, // Scene 6: Open-source players (MusicFree, LX Music, Listen 1) + Public API
  1690, // Scene 7: Finale brand card + Mascot holding golden star
];

const args = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n));
const toRender = args.length ? args : defaultFrames;
const browserExecutable = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('Bundling Remotion project...');
const serveUrl = await bundle({ entryPoint: entry, publicDir: path.join(projectRoot, 'public') });
console.log('Opening headless Chrome...');
const browser = await openBrowser('chrome', {
  browserExecutable,
  chromiumOptions: { gl: 'angle' },
  logLevel: 'error',
});
const composition = await selectComposition({
  serveUrl,
  id: 'PlaylistOutFilm',
  puppeteerInstance: browser,
  browserExecutable,
});

for (const frame of toRender) {
  const output = path.join(outDir, `frame-${String(frame).padStart(4, '0')}.png`);
  const start = Date.now();
  await renderStill({
    composition,
    serveUrl,
    output,
    frame,
    puppeteerInstance: browser,
    browserExecutable,
    imageFormat: 'png',
  });
  console.log(`Rendered frame ${frame} -> ${path.relative(projectRoot, output)} (${Date.now() - start}ms)`);
}

await browser.close({ silent: true });
console.log('All stills rendered.');
