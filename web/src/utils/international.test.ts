import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import type { Playlist } from '../api/types';
import { exportRegistry } from './export/registry';
import { generateJSON, generateCSV } from './export';
import { formatTracksForClipboard } from './clipboard';
import { validatePlaylistInput } from './validation';
import { getPlatformName } from './platform';

describe.each(['spotify','applemusic'])('%s product interoperability', platform => {
  const url = platform === 'spotify' ? 'https://open.spotify.com/playlist/1234567890123456789012' : 'https://music.apple.com/cn/playlist/pl.u-example';
  const playlist: Playlist = {platform,id:'example',name:'Test',sourceUrl:url,trackCount:2,tracks:[1,2].map(index=>({index,id:'same',title:'=A',artist:'B',album:'C',status:'unknown',statusText:'未知',sourceUrl:url}))};
  it('recognizes the real platform', () => {
    expect(validatePlaylistInput(url)).toMatchObject({valid:true,platform});
    expect(getPlatformName(platform)).toBe(platform==='spotify'?'Spotify':'Apple Music');
  });
  it('preserves unknown values and duplicate rows in JSON and CSV', () => {
    const parsed=JSON.parse(generateJSON(playlist));
    expect(parsed.tracks).toHaveLength(2);
    expect(parsed.tracks[0].status).toBe('unknown');
    expect(parsed.tracks[0]).not.toHaveProperty('isVip');
    expect(parsed.tracks[0]).not.toHaveProperty('isAvailable');
    expect(generateCSV(playlist)).toContain("'=A");
    expect(generateCSV(playlist)).toContain(',track,,unknown');
  });
  it('exports all six general formats and refuses incompatible player formats', async () => {
    for(const format of ['txt','csv','json','xlsx','m3u8','markdown']) {
      const result=await exportRegistry.get(format)!.export({playlist});
      expect(result.filename).toContain(platform==='spotify'?'Spotify':'Apple Music');
      expect(result.content).toBeTruthy();
      if(format==='xlsx') {
        const wb=XLSX.read(result.content,{type:'array'});
        const rows=XLSX.utils.sheet_to_json(wb.Sheets.Tracks,{header:1});
        expect(rows).toHaveLength(3);
      }
    }
    for(const format of ['lx-music','listen1']) {
      const plugin=exportRegistry.get(format);
      expect(plugin).toBeDefined();
      expect(()=>plugin!.export({playlist})).toThrow();
    }
  });
  it('copies the same number of rows for each text mode', () => {
    for(const mode of ['title','title-artist','title-artist-album'] as const) expect(formatTracksForClipboard(playlist,mode).split('\n')).toHaveLength(2);
    expect(JSON.parse(formatTracksForClipboard(playlist,'json')).tracks).toHaveLength(2);
  });
});
