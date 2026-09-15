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
            { index: 1, title: '南山南', artists: ['马頔'], album: '孤岛', durationMs: 240000 },
            { index: 2, title: '安和桥', artists: ['宋冬野'], album: '安和桥北', durationMs: 260000 },
          ],
        },
        {
          platform: 'qqmusic',
          id: '102',
          name: '摇滚时代',
          creator: '歌手B',
          trackCount: 1,
          tracks: [
            { index: 1, title: '无地自容', artists: ['黑豹乐队'], album: '黑豹', durationMs: 310000 },
          ],
        },
      ];

      const res = exportToMultiSheetExcel(mockPlaylists, '测试用户');
      expect(res.filename).toContain('【QQ音乐歌单合集】测试用户');
      expect(res.filename).toContain('.xlsx');
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
            { index: 1, title: '南山南', artists: ['马頔'], album: '孤岛', durationMs: 240000 },
          ],
        },
      ];

      const res = await exportToZip(mockPlaylists, '测试用户', 'csv');
      expect(res.filename).toContain('【QQ音乐歌单合集】测试用户');
      expect(res.filename).toContain('.zip');
    });
  });
});
