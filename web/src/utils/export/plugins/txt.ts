import type { Playlist } from '../../../api/types';
import type { ExportPlugin, ExportContext, ExportResult } from '../types';
import { getPlatformPlaylistUrl } from '../../platform';
import {
  cleanSingleLine,
  formatArtists,
  formatDateTime,
  formatTimestamp,
  formatTotalDuration,
  getTrackStatusText,
  sanitizeFilename,
} from '../helpers';

/**
 * Generates plain text content with stationery header.
 * Creation time first, Export time second (adjacent).
 * Kept faithful to source text without formula injection escaping.
 */
export function generateTXT(playlist: Playlist): string {
  const lines: string[] = [];
  const createdStr = formatTimestamp(playlist.createTime) || '未知';
  const exportedStr = formatDateTime();
  const updatedStr = formatTimestamp(playlist.updateTime);
  const durationStr = formatTotalDuration(playlist.tracks);
  const sourceUrl = getPlatformPlaylistUrl(playlist.platform, playlist.id, playlist.sourceUrl);

  lines.push('==================================================');
  lines.push(`  创建时间: ${createdStr}`);
  lines.push(`  导出时间: ${exportedStr}`);
  lines.push('  导出工具: Playlist Out (https://playlistout.lengxiqwq.com)');
  lines.push(`  歌单名称: ${playlist.name}`);
  if (playlist.creator) {
    lines.push(`  歌单作者: ${playlist.creator}`);
  }
  if (updatedStr) {
    lines.push(`  最后更新: ${updatedStr}`);
  }
  const isPartial = playlist.tracks.length < playlist.trackCount;
  if (isPartial) {
    lines.push(
      `  已解析歌曲: ${playlist.tracks.length} / ${playlist.trackCount} 首${durationStr ? ` (已解析部分总时长 ${durationStr})` : ''}`,
    );
  } else {
    lines.push(`  歌曲总数: ${playlist.trackCount} 首${durationStr ? ` (总时长 ${durationStr})` : ''}`);
  }
  if (playlist.tags && playlist.tags.length > 0) {
    lines.push(`  风格标签: ${playlist.tags.join(' · ')}`);
  }
  if (playlist.playCount) {
    lines.push(`  总播放量: ${playlist.playCount.toLocaleString()} 次`);
  }
  lines.push(`  歌单链接: ${sourceUrl}`);
  if (playlist.description) {
    lines.push('--------------------------------------------------');
    lines.push('  歌单简介:');
    lines.push(`  ${cleanSingleLine(playlist.description)}`);
  }
  lines.push('==================================================');
  lines.push('');

  for (const track of playlist.tracks) {
    const title = cleanSingleLine(track.title || '');
    const artistStr = cleanSingleLine(formatArtists(track.artist));
    const albumStr = cleanSingleLine(track.album || '');
    const typeTag = track.isOriginalSound ? ' [视频原声]' : (track.statusText === '视频' ? ' [视频]' : '');
    const statusTag =
      track.isAvailable === false || (track.status && track.status !== 'playable')
        ? ` [${getTrackStatusText(track)}]`
        : '';

    if (albumStr && artistStr) {
      lines.push(`${title} - ${artistStr} - ${albumStr}${typeTag}${statusTag}`);
    } else if (artistStr) {
      lines.push(`${title} - ${artistStr}${typeTag}${statusTag}`);
    } else {
      lines.push(`${title}${typeTag}${statusTag}`);
    }
  }

  return lines.join('\n');
}

export const txtExportPlugin: ExportPlugin = {
  id: 'txt',
  name: '纯文本 (TXT)',
  fileExtension: 'txt',
  mimeType: 'text/plain;charset=utf-8',
  description: '标准纯文本排版，适合阅读与快速记事本备份',
  export(ctx: ExportContext): ExportResult {
    const baseName = sanitizeFilename(
      `${ctx.playlist.name || 'playlist'}${ctx.playlist.creator ? ' - ' + ctx.playlist.creator : ''}`,
    );
    const content = generateTXT(ctx.playlist);
    return {
      filename: `${baseName}.txt`,
      content,
      mimeType: this.mimeType,
    };
  },
};
