import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';

const projectRoot = path.resolve(import.meta.dirname, '..');
const entry = path.join(projectRoot, 'src/index.tsx');
const outDir = path.join(projectRoot, 'qa/stills');
mkdirSync(outDir, { recursive: true });

const frames = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n));
const toRender = frames.length ? frames : [45, 90, 155, 300, 340, 390, 430, 480, 540, 620, 700, 800, 900, 1000, 1080, 1160, 1240, 1320, 1400, 1480, 1560, 1620, 1670];
const browserExecutable = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('Bundling...');
const serveUrl = await bundle({ entryPoint: entry, publicDir: path.join(projectRoot, 'public') });
console.log('Opening browser...');
const browser = await openBrowser('chrome', {
  browserExecutable,
  chromiumOptions: { gl: 'angle' },
  logLevel: 'error',
});
const composition = await selectComposition({
  serveUrl,
  id: 'PlaylistOutPremiere',
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
  console.log(`frame ${frame} -> ${path.relative(projectRoot, output)} (${Date.now() - start}ms)`);
}
await browser.close({ silent: true });
console.log('done');
