/**
 * Migu Music (咪咕音乐) Raw Upstream Response Interfaces
 */

export interface RawMiguSinger {
  id?: string;
  name: string;
  img?: string;
  nameSpelling?: string;
  [key: string]: unknown;
}

export interface RawMiguAudioFormat {
  formatType?: string;
  showTagsNew?: string[];
  isize?: string;
  asize?: string;
  iformat?: string;
  aformat?: string;
  [key: string]: unknown;
}

export interface RawMiguSongItem {
  songId: string;
  contentId?: string;
  songName: string;
  singerList?: RawMiguSinger[];
  album?: string;
  albumId?: string;
  duration?: number; // In seconds
  img1?: string;
  img2?: string;
  img3?: string;
  mvId?: string;
  showTags?: string[];
  audioFormats?: RawMiguAudioFormat[];
  copyrightType?: number;
  restrictType?: number;
  [key: string]: unknown;
}

export interface RawMiguPlaylistMeta {
  resourceType?: string;
  title?: string;
  musicListId?: string;
  ownerId?: string;
  ownerName?: string;
  musicNum?: number;
  imgItem?: {
    img?: string;
    imgOri?: string;
    webpImg?: string;
  };
  originalImgUrl?: string;
  opNumItem?: {
    playNum?: number;
    playNumDesc?: string;
    shareNum?: number;
    [key: string]: unknown;
  };
  createTime?: string;
  publishTime?: string;
  summary?: string;
  intro?: string;
  [key: string]: unknown;
}

export interface RawMiguPlaylistResponse {
  code: string;
  info?: string;
  data?: RawMiguPlaylistMeta;
  [key: string]: unknown;
}

export interface RawMiguSongListResponse {
  code: string;
  info?: string;
  data?: {
    totalCount?: number;
    publishTime?: string;
    songList?: RawMiguSongItem[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
