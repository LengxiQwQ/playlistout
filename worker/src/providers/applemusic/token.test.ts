import { describe, expect, it } from 'vitest';
import { createAppleTokenExtractor } from './token';

function jwt(iss = 'AMPWebPlay', exp = Math.floor(Date.now() / 1000) + 3600) {
  const encode = (p: object) => btoa(JSON.stringify(p)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'ES256', typ: 'JWT' })}.${encode({ iss, exp })}.${'a'.repeat(86)}`;
}

describe('Apple public token streaming extraction', () => {
  it('preserves a token split at every possible boundary without accepting a truncated signature', () => {
    const token = jwt();
    for (let split = 1; split < token.length; split++) {
      const extract = createAppleTokenExtractor();
      expect(extract(`const key="${token.slice(0, split)}`, false)).toBeUndefined();
      expect(extract(`${token.slice(split)}";`, false)).toBe(token);
    }
  });

  it('scans a large preamble without retaining it, skips other issuers and expired tokens', () => {
    const extract = createAppleTokenExtractor();
    for (let i = 0; i < 100; i++) expect(extract('x'.repeat(65_536), false)).toBeUndefined();
    expect(extract(`"${jwt('other')}";"${jwt('AMPWebPlay', 1)}";`, false)).toBeUndefined();
    const token = jwt();
    expect(extract(`"${token}"`, false)).toBe(token);
  });

  it('only accepts an unterminated candidate at confirmed EOF', () => {
    const extract = createAppleTokenExtractor();
    const token = jwt();
    expect(extract(token, false)).toBeUndefined();
    expect(extract('', true)).toBe(token);
  });
});
