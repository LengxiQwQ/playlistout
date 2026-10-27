import { describe, it, expect } from 'vitest';
import { ExportRegistry } from './registry';
import { markdownExportPlugin } from './plugins/markdown';
import type { ExportPlugin, ExportContext, ExportResult } from './types';
import type { Playlist } from '../../api/types';

const mockPlaylist: Playlist = {
  platform: 'qqmusic',
  id: 'test_p_1',
  name: '测试歌单名称',
  creator: '测试创作者',
  trackCount: 2,
  tracks: [
    {
      index: 1,
      title: '晴天',
      artist: '周杰伦',
      album: '叶惠美',
      durationMs: 269000,
      isAvailable: true,
      status: 'playable',
    },
    {
      index: 2,
      title: '搁浅',
      artist: '周杰伦',
      album: '七里香',
      durationMs: 239000,
      isAvailable: false,
      status: 'unplayable',
    },
  ],
};

describe('ExportRegistry & Plugin System', () => {
  it('initializes with built-in export plugins', () => {
    const registry = new ExportRegistry();
    const plugins = registry.getAll();
    const ids = plugins.map((p) => p.id);

    expect(ids).toContain('txt');
    expect(ids).toContain('csv');
    expect(ids).toContain('xlsx');
    expect(ids).toContain('json');
    expect(ids).toContain('m3u8');
    expect(ids).toContain('markdown');
    expect(ids).toContain('lx-music');
    expect(ids).toContain('listen1');
  });

  it('allows registering custom third-party plugins dynamically', () => {
    const registry = new ExportRegistry();
    const customPlugin: ExportPlugin = {
      id: 'custom_format',
      name: '自定义格式',
      fileExtension: 'custom',
      mimeType: 'text/plain',
      export(ctx: ExportContext): ExportResult {
        return {
          filename: `${ctx.playlist.name}.custom`,
          content: 'custom-content',
          mimeType: this.mimeType,
        };
      },
    };

    registry.register(customPlugin);
    expect(registry.has('custom_format')).toBe(true);
    expect(registry.get('custom_format')).toBe(customPlugin);
  });

  it('generates standard markdown document via markdownExportPlugin', () => {
    const result = markdownExportPlugin.export({
      playlist: mockPlaylist,
      tracks: mockPlaylist.tracks,
    }) as ExportResult;

    expect(result.filename).toContain('.md');
    const md = String(result.content);
    expect(md).toContain('# 测试歌单名称');
    expect(md).toContain('周杰伦');
    expect(md).toContain('| 1 | 晴天 | 周杰伦 | 叶惠美 | 269s | 正常 |');
    expect(md).toContain('| 2 | 搁浅 | 周杰伦 | 七里香 | 239s | 下架/无版权 |');
  });

  it('throws error when exporting unsupported format', () => {
    const registry = new ExportRegistry();
    expect(() => {
      registry.exportSync('non_existent', mockPlaylist);
    }).toThrow('Unsupported export format: "non_existent"');
  });
});
