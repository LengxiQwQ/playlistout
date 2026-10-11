/**
 * Kuwo Music Raw Upstream Response Interfaces
 */

export interface RawKuwoPayInfo {
  feeType?: {
    song?: string;
    vip?: string;
  };
  [key: string]: unknown;
}

export interface RawKuwoSong {
  rid: number | string;
  name: string;
  artist: string;
  album?: string;
  albumid?: number | string;
  duration?: number | string;
  pic?: string;
  albumpic?: string;
  pic120?: string;
  releaseDate?: string;
  isListenFee?: boolean;
  online?: number;
  hasmv?: number;
  payInfo?: RawKuwoPayInfo;
  [key: string]: unknown;
}

export interface RawKuwoPlaylistData {
  name?: string;
  uname?: string;
  uid?: string | number;
  total?: number | string;
  img?: string;
  img700?: string;
  img300?: string;
  uPic?: string;
  info?: string;
  tag?: string;
  listencnt?: number;
  ctime?: number | string;
  musicList?: RawKuwoSong[];
  [key: string]: unknown;
}

export interface RawKuwoPlaylistResponse {
  code: number;
  curTime?: number;
  msg?: string;
  data?: RawKuwoPlaylistData;
  [key: string]: unknown;
}
