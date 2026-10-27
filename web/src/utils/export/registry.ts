import type { Playlist } from '../../api/types';
import type { ExportPlugin, ExportContext, ExportResult } from './types';
import { triggerDownload } from './helpers';
import { txtExportPlugin } from './plugins/txt';
import { csvExportPlugin } from './plugins/csv';
import { xlsxExportPlugin } from './plugins/xlsx';
import { jsonExportPlugin } from './plugins/json';
import { m3u8ExportPlugin } from './plugins/m3u8';
import { markdownExportPlugin } from './plugins/markdown';
import { lxMusicExportPlugin } from './plugins/lxMusic';
import { listen1ExportPlugin } from './plugins/listen1';

export class ExportRegistry {
  private plugins = new Map<string, ExportPlugin>();

  constructor() {
    // Register built-in default formats
    this.register(txtExportPlugin);
    this.register(csvExportPlugin);
    this.register(xlsxExportPlugin);
    this.register(jsonExportPlugin);
    this.register(m3u8ExportPlugin);
    this.register(markdownExportPlugin);
    this.register(lxMusicExportPlugin);
    this.register(listen1ExportPlugin);
  }

  register(plugin: ExportPlugin): this {
    this.plugins.set(plugin.id.toLowerCase(), plugin);
    return this;
  }

  get(id: string): ExportPlugin | undefined {
    return this.plugins.get(id.toLowerCase());
  }

  getAll(): ExportPlugin[] {
    return Array.from(this.plugins.values());
  }

  has(id: string): boolean {
    return this.plugins.has(id.toLowerCase());
  }

  exportSync(
    format: string,
    playlist: Playlist,
    options?: Record<string, unknown>,
  ): { filename: string } {
    const plugin = this.get(format);
    if (!plugin) {
      throw new Error(`Unsupported export format: "${format}"`);
    }

    const ctx: ExportContext = {
      playlist,
      tracks: playlist.tracks,
      options,
    };

    const result = plugin.export(ctx);
    if (result instanceof Promise) {
      throw new Error(`Plugin "${format}" is asynchronous, use async export() instead`);
    }

    triggerDownload(result.content, result.filename, result.mimeType);
    return { filename: result.filename };
  }

  async export(
    format: string,
    playlist: Playlist,
    options?: Record<string, unknown>,
  ): Promise<{ filename: string }> {
    const plugin = this.get(format);
    if (!plugin) {
      throw new Error(`Unsupported export format: "${format}"`);
    }

    const ctx: ExportContext = {
      playlist,
      tracks: playlist.tracks,
      options,
    };

    const result: ExportResult = await plugin.export(ctx);
    triggerDownload(result.content, result.filename, result.mimeType);

    return { filename: result.filename };
  }
}

export const exportRegistry = new ExportRegistry();
