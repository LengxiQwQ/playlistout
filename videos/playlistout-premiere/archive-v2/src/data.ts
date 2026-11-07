import { C } from './theme';

export type Platform = {
  id: 'qq' | 'netease' | 'kugou' | 'kuwo' | 'qishui' | 'migu';
  name: string;
  short: string;
  color: string;
  ink: string;
  mark: string;
};

export const PLATFORMS: Platform[] = [
  { id: 'qq', name: 'QQ 音乐', short: 'QQ', color: '#dff0b0', ink: '#486a21', mark: '♪' },
  { id: 'netease', name: '网易云音乐', short: '网易云', color: '#f7d0d2', ink: '#a52b32', mark: '●' },
  { id: 'kugou', name: '酷狗音乐', short: '酷狗', color: '#d7e9f6', ink: '#24628a', mark: 'K' },
  { id: 'kuwo', name: '酷我音乐', short: '酷我', color: '#ffe0ad', ink: '#9c5b10', mark: '◒' },
  { id: 'qishui', name: '汽水音乐', short: '汽水', color: '#d4efe5', ink: '#1f715b', mark: '≈' },
  { id: 'migu', name: '咪咕音乐', short: '咪咕', color: '#e7ddf7', ink: '#69479b', mark: '✺' },
];

export type Track = {
  index: number;
  title: string;
  artist: string;
  album: string;
  duration: string;
  vip?: boolean;
  status: '正常' | 'VIP专享';
};

export const PLAYLIST = {
  platform: 'QQ 音乐',
  platformId: 'qq',
  name: '花谱、鎖那、鹿乃、春猿火',
  creator: '琴心月满',
  trackCount: 104,
  duration: '7 小时 06 分',
  status: 'VIP 2',
  sourceUrl: 'https://y.qq.com/n/ryqq/playlist/9140654872',
  filename: '【QQ 音乐】花谱、鎖那、鹿乃 - 琴心月满.xlsx',
  tracks: [
    { index: 1, title: '不可解', artist: '花譜', album: '不可解', duration: '4:07', vip: true, status: 'VIP专享' },
    { index: 2, title: 'ハロ/ハワユ', artist: '鹿乃', album: 'rye', duration: '4:33', status: '正常' },
    { index: 3, title: 'さよならの速度', artist: '鎖那', album: 'Hush a by little girl', duration: '4:12', status: '正常' },
    { index: 4, title: '猛独が襲う', artist: '春猿火', album: '猛独が襲う', duration: '3:52', status: '正常' },
    { index: 5, title: '食虫植物', artist: '理芽', album: '食虫植物', duration: '3:26', status: '正常' },
    { index: 6, title: 'シリウスの心臓', artist: 'ヰ世界情緒', album: 'シリウスの心臓', duration: '4:01', vip: true, status: 'VIP专享' },
    { index: 7, title: '心臓と絡繰', artist: '幸祜', album: '心臓と絡繰', duration: '3:47', status: '正常' },
    { index: 8, title: '過去を喰らう', artist: '花譜', album: '観測', duration: '4:21', status: '正常' },
  ] as Track[],
};

export type FormatCard = {
  id: 'xlsx' | 'json' | 'csv' | 'txt' | 'm3u8' | 'md';
  name: string;
  ext: string;
  tone: string;
  toneDeep: string;
  blurb: string;
  icon: 'grid' | 'braces' | 'lines' | 'text' | 'play' | 'hash';
  primary?: boolean;
};

export const FORMATS: FormatCard[] = [
  { id: 'xlsx', name: 'Excel', ext: '.xlsx', tone: C.mint, toneDeep: C.mintDeep, blurb: '表格归档', icon: 'grid', primary: true },
  { id: 'json', name: 'JSON', ext: '.json', tone: C.blue, toneDeep: C.blueDeep, blurb: '程序与播放器', icon: 'braces', primary: true },
  { id: 'csv', name: 'CSV', ext: '.csv', tone: C.peach, toneDeep: '#d69a6f', blurb: '通用交换', icon: 'lines' },
  { id: 'txt', name: 'TXT', ext: '.txt', tone: C.yellowLight, toneDeep: C.yellowDeep, blurb: '纯文本清单', icon: 'text' },
  { id: 'm3u8', name: 'M3U8', ext: '.m3u8', tone: C.lilac, toneDeep: C.lilacDeep, blurb: '播放列表', icon: 'play' },
  { id: 'md', name: 'MD', ext: '.md', tone: C.pink, toneDeep: C.pinkDeep, blurb: '笔记与博客', icon: 'hash' },
];

export type BatchPlaylist = {
  id: string;
  name: string;
  count: number;
  artist: string;
  tone: string;
  deep: string;
  motif: 'flower' | 'moon' | 'wave';
};

export const BATCH_PLAYLISTS: BatchPlaylist[] = [
  { id: 'hana', name: '花谱 BEST', count: 52, artist: '琴心月满', tone: '#f7e2a3', deep: '#b9913a', motif: 'flower' },
  { id: 'sana', name: '鎖那 · 深夜散步', count: 38, artist: '琴心月满', tone: '#d7e8ee', deep: '#5b8c9c', motif: 'moon' },
  { id: 'jpop', name: '日系女声私藏', count: 61, artist: '琴心月满', tone: '#efd9df', deep: '#a56a7e', motif: 'wave' },
];

export const BATCH_TOTAL = BATCH_PLAYLISTS.reduce((total, item) => total + item.count, 0);

export type PlayerCard = {
  id: 'musicfree' | 'lx' | 'listen1';
  name: string;
  kind: string;
  status: string;
  route: string;
  tone: string;
  ink: string;
  logo: 'musicfree' | 'lx' | 'listen1';
};

export const PLAYER_CARDS: PlayerCard[] = [
  {
    id: 'musicfree',
    name: 'MusicFree',
    kind: '官方插件',
    status: '已支持',
    route: '插件设置 → 从网络安装',
    tone: '#e4f2f7',
    ink: '#2d6676',
    logo: 'musicfree',
  },
  {
    id: 'lx',
    name: '洛雪音乐',
    kind: '专用 JSON',
    status: '已支持',
    route: '我的列表 → 导入列表',
    tone: '#f8edc6',
    ink: '#856a22',
    logo: 'lx',
  },
  {
    id: 'listen1',
    name: 'Listen 1',
    kind: '备份 JSON',
    status: '已支持',
    route: '设置 → 备份与恢复',
    tone: '#e9e2f4',
    ink: '#67558b',
    logo: 'listen1',
  },
];

export const CLI_LINES = {
  banner: [
    'Playlist Out CLI v3.0.0',
    '把你的歌单带走 - 命令行版',
  ],
  details: [
    '♫ 歌单详情',
    '  歌单：花谱、鎖那、鹿乃、春猿火',
    '  作者：琴心月满',
    '  歌曲：104 首',
    '  时长：7 小时 6 分钟',
  ],
  formats: [
    '1  Excel (.xlsx)  适合查看、整理和备份',
    '2  JSON  (.json)  适合第三方工具和程序导入',
    '3  CSV   (.csv)   适合表格软件和迁移工具',
    '4  TXT   (.txt)   简单的歌曲清单',
    '5  M3U8  (.m3u8)  通用播放列表',
  ],
  exported: [
    '✅ Excel  【QQ 音乐】花谱、鎖那、鹿乃 - 琴心月满.xlsx',
    '✅ JSON   【QQ 音乐】花谱、鎖那、鹿乃 - 琴心月满.json',
  ],
};

export const OS = [
  { name: 'Windows', mark: '⊞' },
  { name: 'macOS', mark: '⌘' },
  { name: 'Linux', mark: '>_' },
] as const;

export const URL_DISPLAY = 'playlistout.lengxiqwq.com';
export const GITHUB_DISPLAY = 'github.com/LengxiQwQ/playlistout';
