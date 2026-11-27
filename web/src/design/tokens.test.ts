import { describe, it, expect } from 'vitest';
// @ts-expect-error node:fs is available in the Vitest runner
import { readFileSync } from 'node:fs';
// @ts-expect-error node:path is available in the Vitest runner
import { resolve } from 'node:path';

const TOKENS_PATH = resolve('src/design/tokens.css');
const tokensCss = readFileSync(TOKENS_PATH, 'utf8');

function extractBlock(css: string, selectorRegex: RegExp): string {
  const match = selectorRegex.exec(css);
  if (!match) return '';
  const startIdx = match.index + match[0].length;
  let depth = 1;
  let i = startIdx;
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
    i++;
  }
  return css.slice(startIdx, i - 1);
}

function parseVars(block: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.slice(0, 6);
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('design/tokens.css contract & contrast', () => {
  const lightBlock = extractBlock(tokensCss, /:root\s*\{/);
  const darkBlock = extractBlock(tokensCss, /:root\[data-theme="dark"\]\s*\{/);
  const lightVars = parseVars(lightBlock);
  const darkVars = parseVars(darkBlock);

  it('defines all required semantic variables and 8 raw hues in light :root', () => {
    const required = [
      '--bg-page',
      '--bg-surface',
      '--bg-raised',
      '--bg-sunken',
      '--bg-backdrop',
      '--text',
      '--text-muted',
      '--text-faint',
      '--text-on-accent',
      '--line',
      '--line-strong',
      '--line-ink',
      '--shadow-color',
      '--gloss',
      '--focus-ring',
      '--hue-strawberry',
      '--hue-peach',
      '--hue-lemon',
      '--hue-mint',
      '--hue-sky',
      '--hue-taro',
      '--hue-matcha',
      '--hue-error',
    ];
    for (const name of required) {
      expect(lightVars[name], `${name} should be defined in light :root`).toBeDefined();
    }
  });

  it('dark block only overrides variables defined in light :root and contains no color-mix()', () => {
    expect(darkBlock).not.toContain('color-mix(');
    for (const key of Object.keys(darkVars)) {
      expect(
        lightVars[key],
        `Dark variable ${key} must also exist in light :root`
      ).toBeDefined();
    }
  });

  it('meets WCAG contrast requirements in both light and dark themes', () => {
    const themes = [
      { name: 'light', vars: lightVars },
      { name: 'dark', vars: darkVars },
    ];
    for (const { name, vars } of themes) {
      expect(
        contrastRatio(vars['--text'], vars['--bg-surface']),
        `${name}: --text vs --bg-surface`
      ).toBeGreaterThanOrEqual(7);
      expect(
        contrastRatio(vars['--text'], vars['--bg-page']),
        `${name}: --text vs --bg-page`
      ).toBeGreaterThanOrEqual(7);
      expect(
        contrastRatio(vars['--text-muted'], vars['--bg-surface']),
        `${name}: --text-muted vs --bg-surface`
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(vars['--text-faint'], vars['--bg-surface']),
        `${name}: --text-faint vs --bg-surface`
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrastRatio(vars['--text-on-accent'], vars['--btn-primary-bg']),
        `${name}: --text-on-accent vs --btn-primary-bg`
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrastRatio(vars['--line-ink'], vars['--bg-page']),
        `${name}: --line-ink vs --bg-page`
      ).toBeGreaterThanOrEqual(2);
    }
  });
});
