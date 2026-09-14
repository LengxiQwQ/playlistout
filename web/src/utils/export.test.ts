import { describe, it, expect, vi } from 'vitest';
import type { Playlist, Track } from '../api/types';
import {
  sanitizeFilename,
  sanitizeSpreadsheetCell,
  generateTXT,
  generateCSV,
  generateXLSX,
  generateJSON,
} from './export';

import { formatTracksForClipboard, copyToClipboard } from './clipboard';
import * as XLSX from 'xlsx';

const sampleTracks: Track[] = [
  {
    index: 1,
    id: '001',
    title: '晴天',
    artists: ['周杰伦'],
    album: '叶惠美',
    durationMs: 269000,
  },
  {
    index: 2,
    id: '002',
    title: 'Shape of You',
    artists: ['Ed Sheeran'],
    album: '÷ (Divide)',
    durationMs: 233000,
  },
  {
    index: 3,
    id: '003',
    title: '사랑을 했다 (LOVE SCENARIO)',
    artists: ['iKON (아이콘)'],
    album: 'Return',
    durationMs: 209000,
  },
  {
    index: 4,
    id: '004',
    title: 'Lemon',
    artists: ['米津玄師'],
    album: 'Lemon',
    durationMs: 255000,
  },
  {
    index: 5,
    id: '005',
    title: 'Song with, "Comma" & \nNewline',
    artists: ['Artist A', 'Artist B'],
    album: 'Special Album',
    durationMs: 180000,
  },
  {
    index: 6,
    id: '006',
    title: '=SUM(A1:B1)', // Formula injection test
    artists: ['+DangerousArtist', '@AtArtist', '-MinusArtist'],
    album: '=1+1',
    durationMs: 120000,
  },
  {
    index: 7,
    id: '007',
    title: 'No Album Song',
    artists: ['Solo Artist'],
    // Missing album and duration
  },
  {
    index: 8,
    id: '001', // Legitimate duplicate track (same as track 1)
    title: '晴天',
    artists: ['周杰伦'],
    album: '叶惠美',
    durationMs: 269000,
  },
];

const samplePlaylist: Playlist = {
  platform: 'qqmusic',
  id: '9044196528',
  name: '多语言/特殊字符/重复歌单 🎵 <Test>',
  creator: 'MusicMaster / 音乐家',
  trackCount: 8,
  tracks: sampleTracks,
  createTime: 1696904605,
  updateTime: 1771679922,
  description: '这是一个测试歌单简介',
  tags: ['民谣', '流行'],
  playCount: 10516,
  sourceUrl: 'https://y.qq.com/n/ryqq/playlist/9044196528',
};

describe('Filename Sanitization', () => {
  it('removes forbidden characters and trims spaces', () => {
    expect(sanitizeFilename('My: Playlist/ <2026>? * "test" |')).toBe('My Playlist 2026 test');
  });

  it('handles reserved Windows device names safely', () => {
    expect(sanitizeFilename('CON')).toBe('CON_file');
    expect(sanitizeFilename('nul')).toBe('nul_file');
    expect(sanitizeFilename('prn')).toBe('prn_file');
    expect(sanitizeFilename('com1')).toBe('com1_file');
  });

  it('removes leading and trailing dots and whitespace', () => {
    expect(sanitizeFilename('  ...my_playlist...  ')).toBe('my_playlist');
  });

  it('caps long filenames to 100 characters', () => {
    const longName = 'a'.repeat(150);
    const sanitized = sanitizeFilename(longName);
    expect(sanitized.length).toBeLessThanOrEqual(100);
  });

  it('uses fallback when string is empty or completely illegal', () => {
    expect(sanitizeFilename('')).toBe('playlist');
    expect(sanitizeFilename('   ')).toBe('playlist');
    expect(sanitizeFilename('???')).toBe('playlist');
  });
});

describe('Spreadsheet Formula Injection Protection', () => {
  it('prepends single quote to formulas starting with =, +, -, @, \\t, \\r', () => {
    expect(sanitizeSpreadsheetCell('=1+1')).toBe("'=1+1");
    expect(sanitizeSpreadsheetCell('+cmd')).toBe("'+cmd");
    expect(sanitizeSpreadsheetCell('-100')).toBe("'-100");
    expect(sanitizeSpreadsheetCell('@SUM')).toBe("'@SUM");
    expect(sanitizeSpreadsheetCell('\tTabStart')).toBe("'\tTabStart");
  });

  it('leaves normal text unchanged', () => {
    expect(sanitizeSpreadsheetCell('晴天')).toBe('晴天');
    expect(sanitizeSpreadsheetCell('Shape of You')).toBe('Shape of You');
  });
});

describe('TXT Export', () => {
  it('generates stationery header with createTime first and exportTime second, followed by track list', () => {
    const txt = generateTXT(samplePlaylist);

    expect(txt).toContain('创建时间: 2023-10-10');
    expect(txt).toContain('导出时间: ');
    expect(txt).toContain('歌单名称: 多语言/特殊字符/重复歌单 🎵 <Test>');
    expect(txt).toContain('歌单作者: MusicMaster / 音乐家');
    expect(txt).toContain('风格标签: 民谣 · 流行');
    expect(txt).toContain('总播放量: 10,516 次');
    expect(txt).toContain('歌单简介:');
    expect(txt).toContain('这是一个测试歌单简介');

    // Verify createTime is before exportTime
    const createIdx = txt.indexOf('创建时间:');
    const exportIdx = txt.indexOf('导出时间:');
    expect(createIdx).toBeGreaterThan(-1);
    expect(exportIdx).toBeGreaterThan(createIdx);

    // Track 1
    expect(txt).toContain('晴天 - 周杰伦 - 叶惠美');
    // Track 3 (Korean)
    expect(txt).toContain('사랑을 했다 (LOVE SCENARIO) - iKON (아이콘) - Return');
    // Track 4 (Japanese)
    expect(txt).toContain('Lemon - 米津玄師 - Lemon');
    // Track 6 (Formula raw text preserved faithfully in TXT)
    expect(txt).toContain('=SUM(A1:B1) - +DangerousArtist, @AtArtist, -MinusArtist - =1+1');
    // Track 7 (Missing album)
    expect(txt).toContain('No Album Song - Solo Artist');
    // Track 8 (Legitimate duplicate survives)
    expect(txt).toContain('晴天 - 周杰伦 - 叶惠美');
  });
});

describe('CSV Export', () => {
  it('generates RFC-compliant CSV with UTF-8 BOM, metadata comments with createTime first, and formula mitigation', () => {
    const csv = generateCSV(samplePlaylist);

    // Verify UTF-8 BOM is present
    expect(csv.charCodeAt(0)).toBe(0xfeff);

    const content = csv.slice(1);
    // Comments check
    expect(content).toContain('# 创建时间: 2023-10-10');
    expect(content).toContain('# 导出时间: ');
    expect(content).toContain('# 歌单名称: 多语言/特殊字符/重复歌单 🎵 <Test>');
    expect(content).toContain('# 歌单作者: MusicMaster / 音乐家');

    const createIdx = content.indexOf('# 创建时间:');
    const exportIdx = content.indexOf('# 导出时间:');
    expect(createIdx).toBeGreaterThan(-1);
    expect(exportIdx).toBeGreaterThan(createIdx);

    // Header check
    expect(content).toContain('序号,歌曲标题,歌手,专辑,时长');

    // Check track with comma and newline escaping
    expect(content).toContain('"Song with, ""Comma"" & \nNewline"');

    // Check formula injection mitigation in CSV
    expect(content).toContain("'=SUM(A1:B1)");
    expect(content).toContain("'+DangerousArtist");

    // Check Korean & Japanese & Unicode
    expect(content).toContain('사랑을 했다 (LOVE SCENARIO)');
    expect(content).toContain('米津玄師');

    // Check duplicate track preserved
    expect(content).toContain('8,晴天,周杰伦,叶惠美');
  });
});

describe('XLSX Export', () => {
  it('generates valid XLSX workbook with metadata card and song table', () => {
    const bytes = generateXLSX(samplePlaylist);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);

    // Read back workbook to verify integrity
    const wb = XLSX.read(bytes, { type: 'array' });
    expect(wb.SheetNames).toContain('歌单歌曲');
    const ws = wb.Sheets['歌单歌曲'];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

    // Verify metadata rows
    expect(rows[0][0]).toBe('歌单名称');
    expect(rows[0][1]).toBe('多语言/特殊字符/重复歌单 🎵 <Test>');
    expect(rows[1][0]).toBe('创建时间');
    expect(rows[1][1]).toContain('2023-10-10');
    expect(rows[1][2]).toBe('导出时间');
    expect(rows[2][0]).toBe('歌单作者');
    expect(rows[2][1]).toBe('MusicMaster / 音乐家');
  });
});

describe('JSON Export', () => {
  it('generates faithful normalized JSON with metadata, createTime first and exportedAt second', () => {
    const jsonStr = generateJSON(samplePlaylist);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.createTime).toContain('2023-10-10');
    expect(parsed.exportedAt).toBeTruthy();
    expect(parsed.name).toBe('多语言/特殊字符/重复歌单 🎵 <Test>');
    expect(parsed.creator).toBe('MusicMaster / 音乐家');
    expect(parsed.updateTime).toBeTruthy();
    expect(parsed.tags).toEqual(['民谣', '流行']);
    expect(parsed.playCount).toBe(10516);
    expect(parsed.platform).toBe('qqmusic');
    expect(parsed.id).toBe('9044196528');
    expect(parsed.trackCount).toBe(8);
    expect(parsed.tracks).toHaveLength(8);

    // Raw source text preserved faithfully without formula quote prefix
    expect(parsed.tracks[5].title).toBe('=SUM(A1:B1)');
    expect(parsed.tracks[5].album).toBe('=1+1');

    // Both copies of duplicate track survive
    expect(parsed.tracks[0].title).toBe('晴天');
    expect(parsed.tracks[7].title).toBe('晴天');
    expect(parsed.tracks[7].index).toBe(8);
  });
});

describe('Clipboard Copying Modes', () => {
  it('formats title only', () => {
    const text = formatTracksForClipboard(samplePlaylist, 'title');
    const lines = text.split('\n');
    expect(lines).toHaveLength(8);
    expect(lines[0]).toBe('晴天');
    expect(lines[1]).toBe('Shape of You');
    expect(lines[7]).toBe('晴天');
  });

  it('formats title - artist', () => {
    const text = formatTracksForClipboard(samplePlaylist, 'title-artist');
    const lines = text.split('\n');
    expect(lines).toHaveLength(8);
    expect(lines[0]).toBe('晴天 - 周杰伦');
    expect(lines[1]).toBe('Shape of You - Ed Sheeran');
    expect(lines[4]).toBe('Song with, "Comma" &  Newline - Artist A, Artist B');
  });


  it('formats title - artist - album', () => {
    const text = formatTracksForClipboard(samplePlaylist, 'title-artist-album');
    const lines = text.split('\n');
    expect(lines).toHaveLength(8);
    expect(lines[0]).toBe('晴天 - 周杰伦 - 叶惠美');
    expect(lines[6]).toBe('No Album Song - Solo Artist'); // Missing album handled cleanly
  });

  it('copies to clipboard via navigator.clipboard when available', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
    // Set isSecureContext
    (window as any).isSecureContext = true;

    const ok = await copyToClipboard('test copy content');
    expect(ok).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('test copy content');
  });
});
