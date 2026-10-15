import { describe, it, expect } from 'vitest';
import {
  generateBatchTicket,
  verifyBatchTicket,
  isPlaylistIdAllowedInTicket,
  MAX_BATCH_TICKET_IDS,
} from './batch-ticket';

describe('Batch Ticket Attestation & Security Verification', () => {
  const secret = 'test-secret-batch-key-12345';
  const clientIp = '192.168.1.100';
  const platform = 'netease';
  const sampleIds = ['1001', '1002', '1003', '2439182390'];

  it('generates a valid batch ticket string formatted as b1.<payload>.<sig>', async () => {
    const ticket = await generateBatchTicket({
      clientIp,
      platform,
      playlistIds: sampleIds,
      secret,
    });

    expect(ticket).toBeTypeOf('string');
    const parts = ticket.split('.');
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('b1');
    expect(parts[1].length).toBeGreaterThan(10);
    expect(parts[2].length).toBe(64); // SHA-256 hex length
  });

  it('successfully verifies a valid batch ticket matching exact ID', async () => {
    const ticket = await generateBatchTicket({
      clientIp,
      platform,
      playlistIds: sampleIds,
      secret,
    });

    const result = await verifyBatchTicket(ticket, clientIp, '1002', secret);
    expect(result.valid).toBe(true);
    expect(result.claims).toBeDefined();
    expect(result.claims?.ids).toEqual(sampleIds);
    expect(result.claims?.plt).toBe('netease');
    expect(result.claims?.delay).toBe(450);
  });

  it('successfully verifies when playlistParam is a full URL containing the allowed ID', async () => {
    const ticket = await generateBatchTicket({
      clientIp,
      platform,
      playlistIds: sampleIds,
      secret,
    });

    const fullUrl = 'https://music.163.com/#/playlist?id=2439182390';
    const result = await verifyBatchTicket(ticket, clientIp, fullUrl, secret);
    expect(result.valid).toBe(true);
  });

  it('rejects a ticket when requested playlist ID is not in the allowed list', async () => {
    const ticket = await generateBatchTicket({
      clientIp,
      platform,
      playlistIds: sampleIds,
      secret,
    });

    const result = await verifyBatchTicket(ticket, clientIp, '999999999', secret);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('RESOURCE_NOT_IN_TICKET');
  });

  it('rejects a ticket when requested URL contains a different ID', async () => {
    const ticket = await generateBatchTicket({
      clientIp,
      platform,
      playlistIds: sampleIds,
      secret,
    });

    const differentUrl = 'https://music.163.com/#/playlist?id=88888888';
    const result = await verifyBatchTicket(ticket, clientIp, differentUrl, secret);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('RESOURCE_NOT_IN_TICKET');
  });

  it('rejects a ticket when client IP does not match the ticket binding', async () => {
    const ticket = await generateBatchTicket({
      clientIp: '192.168.1.100',
      platform,
      playlistIds: sampleIds,
      secret,
    });

    const result = await verifyBatchTicket(ticket, '10.0.0.1', '1001', secret);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('IP_MISMATCH');
  });

  it('rejects a tampered payload', async () => {
    const ticket = await generateBatchTicket({
      clientIp,
      platform,
      playlistIds: sampleIds,
      secret,
    });

    const parts = ticket.split('.');
    // Modify one byte in the base64 payload
    const tamperedPayload = parts[1].slice(0, -2) + 'AA';
    const tamperedTicket = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const result = await verifyBatchTicket(tamperedTicket, clientIp, '1001', secret);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('INVALID_SIGNATURE');
  });

  it('rejects a tampered signature', async () => {
    const ticket = await generateBatchTicket({
      clientIp,
      platform,
      playlistIds: sampleIds,
      secret,
    });

    const parts = ticket.split('.');
    const tamperedSig = 'a'.repeat(64);
    const tamperedTicket = `${parts[0]}.${parts[1]}.${tamperedSig}`;

    const result = await verifyBatchTicket(tamperedTicket, clientIp, '1001', secret);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('INVALID_SIGNATURE');
  });

  it('rejects an expired ticket', async () => {
    // Generate ticket with negative TTL (already expired)
    const ticket = await generateBatchTicket({
      clientIp,
      platform,
      playlistIds: sampleIds,
      secret,
      ttlSeconds: -10,
    });

    const result = await verifyBatchTicket(ticket, clientIp, '1001', secret);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('EXPIRED');
  });

  it('caps the allowed playlist IDs at MAX_BATCH_TICKET_IDS (60)', async () => {
    const hugeList = Array.from({ length: 100 }, (_, i) => `id_${i}`);
    const ticket = await generateBatchTicket({
      clientIp,
      platform,
      playlistIds: hugeList,
      secret,
    });

    const result = await verifyBatchTicket(ticket, clientIp, 'id_0', secret);
    expect(result.valid).toBe(true);
    expect(result.claims?.ids.length).toBe(MAX_BATCH_TICKET_IDS);
    expect(result.claims?.ids).toContain('id_59');
    expect(result.claims?.ids).not.toContain('id_60');
  });

  it('correctly handles boundary-checked substring match in isPlaylistIdAllowedInTicket', () => {
    const allowed = ['1', '2439182390', 'special_123'];

    // Exact matches
    expect(isPlaylistIdAllowedInTicket('1', allowed)).toBe(true);
    expect(isPlaylistIdAllowedInTicket('2439182390', allowed)).toBe(true);

    // URL parameter matches
    expect(isPlaylistIdAllowedInTicket('https://music.163.com/playlist?id=2439182390', allowed)).toBe(true);
    expect(isPlaylistIdAllowedInTicket('https://m.kugou.com/songlist/?listid=special_123', allowed)).toBe(true);
    expect(isPlaylistIdAllowedInTicket('https://y.qq.com/n/ryqq/playlist/2439182390.html', allowed)).toBe(true);

    // Partial substring attacks must be rejected
    // e.g. ID "1" should NOT match "100" or "9182"
    expect(isPlaylistIdAllowedInTicket('https://music.163.com/playlist?id=100', allowed)).toBe(false);
    expect(isPlaylistIdAllowedInTicket('1000', allowed)).toBe(false);
    expect(isPlaylistIdAllowedInTicket('https://music.163.com/playlist?id=9992439182390', allowed)).toBe(false);
  });
});
