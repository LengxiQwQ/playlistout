import type { Playlist, Track } from '../../api/types';

export interface ExportContext {
  playlist: Playlist;
  tracks?: Track[];
  options?: Record<string, unknown>;
}

export interface ExportResult {
  filename: string;
  content: BlobPart;
  mimeType: string;
}

export interface ExportPlugin {
  readonly id: string;
  readonly name: string;
  readonly fileExtension: string;
  readonly mimeType: string;
  readonly description?: string;
  export(ctx: ExportContext): ExportResult | Promise<ExportResult>;
}
