import React, { useState } from 'react';
import type { Playlist } from '../api/types';
import { exportPlaylist } from '../utils/export';
import { formatTracksForClipboard, copyToClipboard, type ClipboardMode } from '../utils/clipboard';

interface ExportToolbarProps {
  playlist: Playlist | null;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({ playlist }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleExport = (format: 'txt' | 'csv' | 'xlsx' | 'json') => {
    if (!playlist) return;
    try {
      const { filename } = exportPlaylist(playlist, format);
      showToast(`已成功导出 ${filename}`);
    } catch {
      showToast('导出文件生成失败，请重试。');
    }
  };

  const handleCopy = async (mode: ClipboardMode, label: string) => {
    if (!playlist) return;
    const text = formatTracksForClipboard(playlist, mode);
    const ok = await copyToClipboard(text);
    if (ok) {
      showToast(`已复制 ${playlist.tracks.length} 首歌曲（${label}）到剪贴板！`);
    } else {
      showToast('复制失败，请检查浏览器剪贴板权限。');
    }
  };

  const isDisabled = !playlist || playlist.tracks.length === 0;

  return (
    <div className="export-toolbar-card" data-testid="export-toolbar">
      <div className="toolbar-section">
        <div className="section-title">
          <span className="section-icon">📥</span>
          <h4>本地文件导出</h4>
        </div>
        <div className="button-group">
          <button
            type="button"
            className="btn-export"
            disabled={isDisabled}
            onClick={() => handleExport('txt')}
            title="导出纯文本 TXT 格式"
          >
            TXT
          </button>
          <button
            type="button"
            className="btn-export"
            disabled={isDisabled}
            onClick={() => handleExport('csv')}
            title="导出 CSV 格式（带 UTF-8 BOM，支持 Excel 直接打开）"
          >
            CSV
          </button>
          <button
            type="button"
            className="btn-export btn-export-highlight"
            disabled={isDisabled}
            onClick={() => handleExport('xlsx')}
            title="导出标准 Excel 表格 (.xlsx)"
          >
            Excel (.xlsx)
          </button>
          <button
            type="button"
            className="btn-export"
            disabled={isDisabled}
            onClick={() => handleExport('json')}
            title="导出完整 JSON 结构化数据"
          >
            JSON
          </button>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <div className="section-title">
          <span className="section-icon">📋</span>
          <h4>快捷复制到剪贴板</h4>
        </div>
        <div className="button-group">
          <button
            type="button"
            className="btn-copy"
            disabled={isDisabled}
            onClick={() => handleCopy('title', '仅歌名')}
          >
            仅歌名
          </button>
          <button
            type="button"
            className="btn-copy"
            disabled={isDisabled}
            onClick={() => handleCopy('title-artist', '歌名 - 歌手')}
          >
            歌名 - 歌手
          </button>
          <button
            type="button"
            className="btn-copy"
            disabled={isDisabled}
            onClick={() => handleCopy('title-artist-album', '歌名 - 歌手 - 专辑')}
          >
            歌名 - 歌手 - 专辑
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="export-toast" role="status" aria-live="polite" data-testid="export-toast">
          <span>✓</span> {toastMessage}
        </div>
      )}
    </div>
  );
};
