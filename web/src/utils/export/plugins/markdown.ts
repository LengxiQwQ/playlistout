import type { Playlist } from '../../../api/types';
import type { ExportPlugin, ExportContext, ExportResult } from '../types';
import { getPlatformPlaylistUrl } from '../../platform';
import {
  cleanSingleLine,
  formatArtists,
  formatDateTime,
  formatTimestamp,
  formatTotalDuration,
  getTrackDurationSeconds,
  getTrackStatusText,
  sanitizeFilename,
} from '../helpers';

/**
 * Generates beautiful Markdown documentation for the playlist.
 * Perfect for GitHub notes, Obsidian, Notion, or blog posts.
 */
export function generateMarkdown(playlist: Playlist): string {
  const lines: string[] = [];
  const createdStr = formatTimestamp(playlist.createTime) || '未知';
  const exportedStr = formatDateTime();
  const durationStr = formatTotalDuration(playlist.tracks);
  const sourceUrl = getPlatformPlaylistUrl(playlist.platform, playlist.id, playlist.sourceUrl);

  lines.push(`# ${cleanSingleLine(playlist.name)}`);
  lines.push('');
  if (playlist.creator) {
    lines.push(`> **作者**: ${cleanSingleLine(playlist.creator)}  `);
  }
  lines.push(`> **平台**: ${playlist.platform}  `);
  lines.push(`> **创建时间**: ${createdStr}  `);
  lines.push(`> **导出时间**: ${exportedStr}  `);
  lines.push(`> **歌曲总数**: ${playlist.trackCount} 首${durationStr ? ` (${durationStr})` : ''}  `);
  if (sourceUrl) {
    lines.push(`> **歌单链接**: [点击跳转](${sourceUrl})  `);
  }
  lines.push('');

  if (playlist.description) {
    lines.push('## 歌单简介');
    lines.push('');
    lines.push(cleanSingleLine(playlist.description));
    lines.push('');
  }

  lines.push('## 曲目列表');
  lines.push('');
  lines.push('| # | 歌曲名 | 歌手 | 专辑 | 时长 | 状态 |');
  lines.push('| :-: | :--- | :--- | :--- | :-: | :-: |');

  for (const track of playlist.tracks) {
    const idx = track.index;
    const title = cleanSingleLine(track.title || '').replace(/\|/g, '\\|');
    const artist = cleanSingleLine(formatArtists(track.artist)).replace(/\|/g, '\\|') || '-';
    const album = cleanSingleLine(track.album || '').replace(/\|/g, '\\|') || '-';
    const duration = track.durationMs ? `${getTrackDurationSeconds(track.durationMs)}s` : '-';
    const status = getTrackStatusText(track);

    lines.push(`| ${idx} | ${title} | ${artist} | ${album} | ${duration} | ${status} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('*由 [Playlist Out](https://playlistout.lengxiqwq.com) 生成导出*');

  return lines.join('\n');
}

export const markdownExportPlugin: ExportPlugin = {
  id: 'markdown',
  name: 'Markdown (MD)',
  fileExtension: 'md',
  mimeType: 'text/markdown;charset=utf-8',
  description: '带格式的 Markdown 文档与表格，适合 Obsidian、Notion 与博客发布',
  export(ctx: ExportContext): ExportResult {
    const baseName = sanitizeFilename(
      `${ctx.playlist.name || 'playlist'}${ctx.playlist.creator ? ' - ' + ctx.playlist.creator : ''}`,
    );
    const content = generateMarkdown(ctx.playlist);
    return {
      filename: `${baseName}.md`,
      content,
      mimeType: this.mimeType,
    };
  },
};
