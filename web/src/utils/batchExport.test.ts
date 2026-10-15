import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeSheetName, exportToMultiSheetExcel, exportToZip } from './batchExport';
import type { Playlist } from '../api/types';

describe('batchExport utilities', () => {
  beforeEach(() => {
    // Mock URL and DOM download triggers
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  describe('sanitizeSheetName', () => {
    it('cleans invalid Excel characters and controls length', () => {
      expect(sanitizeSheetName('周杰伦:精选/列表*?')).toBe('周杰伦_精选_列表__');
      expect(sanitizeSheetName('')).toBe('歌单');
      const longName = '这是一个特别特别特别特别特别特别长长长长长长长长长长长长的歌单名字';
      expect(sanitizeSheetName(longName).length).toBeLessThanOrEqual(28);
    });
  });

  describe('exportToMultiSheetExcel', () => {
    it('creates workbook with index sheet and playlist sheets', () => {
      const mockPlaylists: Playlist[] = [
        {
          platform: 'qqmusic',
          id: '101',
          name: '民谣合集',
          creator: '歌手A',
          trackCount: 2,
          tracks: [
            { index: 1, title: '南山南', artist: '马頔', album: '孤岛', durationMs: 240000 },
            { index: 2, title: '安和桥', artist: '宋冬野', album: '安和桥北', durationMs: 260000 },
          ],
        },
        {
          platform: 'qqmusic',
          id: '102',
          name: '摇滚时代',
          creator: '歌手B',
          trackCount: 1,
          tracks: [
            { index: 1, title: '无地自容', artist: '黑豹乐队', album: '黑豹', durationMs: 310000 },
          ],
        },
      ];

      const res = exportToMultiSheetExcel(mockPlaylists, '测试用户');
      expect(res.filename).toContain('【QQ 音乐歌单合集】测试用户');
      expect(res.filename).toContain('.xlsx');

      const neteaseRes = exportToMultiSheetExcel(mockPlaylists, '网易云测试', 'netease');
      expect(neteaseRes.filename).toContain('【网易云音乐歌单合集】网易云测试');
    });
  });

  describe('exportToZip', () => {
    it('creates zip file with multiple playlist exports', async () => {
      const mockPlaylists: Playlist[] = [
        {
          platform: 'qqmusic',
          id: '101',
          name: '民谣合集',
          creator: '歌手A',
          trackCount: 1,
          tracks: [
            { index: 1, title: '南山南', artist: '马頔', album: '孤岛', durationMs: 240000 },
          ],
        },
      ];

      const res = await exportToZip(mockPlaylists, '测试用户', 'csv');
      expect(res.filename).toContain('【QQ 音乐歌单合集】测试用户');
      expect(res.filename).toContain('.zip');

      const neteaseRes = await exportToZip(mockPlaylists, '网易云测试', 'csv', 'netease');
      expect(neteaseRes.filename).toContain('【网易云音乐歌单合集】网易云测试');

      const m3u8Res = await exportToZip(mockPlaylists, 'M3U8用户', 'm3u8');
      expect(m3u8Res.filename).toContain('(M3U8)');
      expect(m3u8Res.filename).toContain('.zip');
    });

    it('names archive entries 歌单名 - 作者.ext and deduplicates with (2)', async () => {
      const capturedBlobs: Blob[] = [];
      window.URL.createObjectURL = vi.fn((blob: Blob) => {
        capturedBlobs.push(blob);
        return 'blob:mock-url';
      });

      const mockPlaylists: Playlist[] = [
        {
          platform: 'qqmusic',
          id: '101',
          name: '民谣合集',
          creator: '歌手A',
          trackCount: 1,
          tracks: [{ index: 1, title: '南山南', artist: '马頔', durationMs: 240000 }],
        },
        {
          platform: 'qqmusic',
          id: '102',
          name: '民谣合集',
          creator: '歌手A',
          trackCount: 1,
          tracks: [{ index: 1, title: '安和桥', artist: '宋冬野', durationMs: 260000 }],
        },
      ];

      await exportToZip(mockPlaylists, '测试用户', 'csv');

      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(await capturedBlobs[0].arrayBuffer());
      expect(Object.keys(zip.files).sort()).toEqual(['民谣合集 - 歌手A (2).csv', '民谣合集 - 歌手A.csv']);
    });
  });

  describe('fetchMultiplePlaylists', () => {
    it('passes batchTicket to parsePlaylist and collects successful playlists', async () => {
      const { fetchMultiplePlaylists } = await import('./batchExport');
      const client = await import('../api/client');

      const parseSpy = vi.spyOn(client, 'parsePlaylist').mockResolvedValue({
        success: true,
        data: {
          platform: 'qqmusic',
          id: '101',
          name: '民谣合集',
          trackCount: 1,
          tracks: [],
        } as any,
      });

      const summaries = [
        { id: '101', name: '民谣合集', trackCount: 1, sourceUrl: 'https://test.com/101' },
      ];

      const res = await fetchMultiplePlaylists(summaries, undefined, undefined, 'qqmusic', 'mock_batch_ticket_123');

      expect(res.successfulPlaylists.length).toBe(1);
      expect(res.failedCount).toBe(0);
      expect(parseSpy).toHaveBeenCalledWith(
        'https://test.com/101',
        undefined,
        'qqmusic',
        undefined,
        false,
        undefined,
        'mock_batch_ticket_123',
      );
    });
  });
});
