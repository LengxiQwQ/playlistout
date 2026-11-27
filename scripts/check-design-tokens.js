#!/usr/bin/env node
/**
 * Design Token & Dark Mode Policy Checker
 *
 * Enforces the two-layer semantic token architecture in web/src/:
 *   R1: No color literals (hex, rgb/hsl/oklch with digits, named colors) in CSS outside tokens.css
 *   R2: No color literals (hex, rgb/hsl/oklch with digits) in TS/TSX outside tests & dashboard/
 *   R3: No data-theme selectors or prefers-color-scheme outside tokens.css & theme/
 *   R4: tokens.css must define color-scheme: light & dark, no prefers-color-scheme, no light-dark()
 *   R5: No filter: invert(...) in CSS
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const WEB_SRC = join(REPO_ROOT, 'web', 'src');
const TOKENS_CSS = join(WEB_SRC, 'design', 'tokens.css');

/**
 * Explicit allowlist for exceptional cases.
 * Expected to remain empty. Format: { file: string, pattern: RegExp, reason: string }
 */
const ALLOWLIST = [];

const NAMED_COLOR_RE =
  /:\s*[^;{}]*\b(white|black|gray|grey|red|blue|green|yellow|pink|purple|orange|silver|maroon|navy|teal|aqua|fuchsia|lime|olive)\b/i;
const HEX_COLOR_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;
const FUNC_COLOR_RE = /\b(?:rgba?|hsla?|oklch)\(\s*\d/i;
const DATA_THEME_OR_MEDIA_RE = /\bdata-theme\b|prefers-color-scheme/i;
const FILTER_INVERT_RE = /filter\s*:[^;{}]*\binvert\s*\(/i;

function walkFiles(dir, exts, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkFiles(full, exts, results);
    } else if (exts.some((ext) => entry.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

function isAllowlisted(relPath, lineText) {
  return ALLOWLIST.some(
    (item) => relPath.replace(/\\/g, '/') === item.file && item.pattern.test(lineText)
  );
}

function stripBlockComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '));
}

function stripLineComments(text) {
  return text.replace(/^\s*\/\/.*$/gm, '');
}

export function checkDesignTokens({ report = false } = {}) {
  const violations = [];

  function addViolation(rule, file, lineNum, content) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
    const trimmed = content.trim();
    if (isAllowlisted(rel, trimmed)) return;
    violations.push({ rule, file: rel, line: lineNum, content: trimmed });
  }

  // R1, R3, R5 on CSS files (excluding tokens.css and dashboard/)
  const cssFiles = walkFiles(WEB_SRC, ['.css']);
  for (const file of cssFiles) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
    if (rel.includes('/dashboard/')) continue;

    const raw = readFileSync(file, 'utf8');
    const cleaned = stripBlockComments(raw);
    const lines = cleaned.split(/\r?\n/);

    if (file === TOKENS_CSS) {
      // R4: tokens.css structural checks
      if (!/color-scheme\s*:\s*light\b/.test(cleaned)) {
        addViolation('R4', file, 1, 'tokens.css missing "color-scheme: light"');
      }
      if (!/color-scheme\s*:\s*dark\b/.test(cleaned)) {
        addViolation('R4', file, 1, 'tokens.css missing "color-scheme: dark"');
      }
      lines.forEach((line, idx) => {
        if (/prefers-color-scheme/i.test(line)) {
          addViolation('R4', file, idx + 1, line);
        }
        if (/\blight-dark\s*\(/i.test(line)) {
          addViolation('R4', file, idx + 1, line);
        }
        if (FILTER_INVERT_RE.test(line)) {
          addViolation('R5', file, idx + 1, line);
        }
      });
      continue;
    }

    lines.forEach((line, idx) => {
      if (HEX_COLOR_RE.test(line) || FUNC_COLOR_RE.test(line) || NAMED_COLOR_RE.test(line)) {
        addViolation('R1', file, idx + 1, line);
      }
      if (DATA_THEME_OR_MEDIA_RE.test(line)) {
        addViolation('R3', file, idx + 1, line);
      }
      if (FILTER_INVERT_RE.test(line)) {
        addViolation('R5', file, idx + 1, line);
      }
    });
  }

  // R2, R3 on TS/TSX files (excluding *.test.* and dashboard/)
  const tsFiles = walkFiles(WEB_SRC, ['.ts', '.tsx']);
  for (const file of tsFiles) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
    if (rel.includes('.test.') || rel.includes('/dashboard/')) continue;

    const raw = readFileSync(file, 'utf8');
    const cleaned = stripLineComments(stripBlockComments(raw));
    const lines = cleaned.split(/\r?\n/);
    const isThemeLogic = rel.startsWith('web/src/theme/');

    lines.forEach((line, idx) => {
      // R2: check string literals or inline style values for hex / rgb(digit)
      // Match only inside quotes or template literals to avoid false positives on comments/regex
      const stringMatches = line.match(/(['"`])(?:\\.|(?!\1).)*\1/g) || [];
      for (const str of stringMatches) {
        if (HEX_COLOR_RE.test(str) || FUNC_COLOR_RE.test(str)) {
          addViolation('R2', file, idx + 1, line);
          break;
        }
      }
      if (!isThemeLogic && DATA_THEME_OR_MEDIA_RE.test(line)) {
        addViolation('R3', file, idx + 1, line);
      }
    });
  }

  if (violations.length > 0) {
    for (const v of violations) {
      console.log(`[${v.rule}] ${v.file}:${v.line}: ${v.content}`);
    }
  }
  console.log(`\nDesign token check: ${violations.length} violation(s) found.`);

  if (!report && violations.length > 0) {
    throw new Error(`Design token check failed with ${violations.length} violation(s).`);
  }

  return violations;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = process.argv.includes('--report');
  try {
    checkDesignTokens({ report });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
