import { C } from './theme';
import { ASSETS } from './assets';

export type PlatformInfo = {
  id: 'qq' | 'netease' | 'kugou' | 'kuwo' | 'qishui' | 'migu';
  name: string;
  short: string;
  badgeBg: string;
  badgeInk: string;
  border: string;
  note: string;
  icon: string;
};

export const PLATFORMS: PlatformInfo[] = [
  {
    id: 'qq',
    name: 'QQ 音乐',
    short: 'QQ音乐',
    badgeBg: '#dcf5cb',
    badgeInk: '#256320',
    border: '#68b85e',
    note: '单歌单 + QQ号批量',
    icon: '♪',
  },
  {
    id: 'netease',
    name: '网易云音乐',
    short: '网易云',
    badgeBg: '#ffe0e0',
    badgeInk: '#a82020',
    border: '#e06c6c',
    note: '千首大歌单 + UID批量',
    icon: '◉',
  },
  {
    id: 'kugou',
    name: '酷狗音乐',
    short: '酷狗',
    badgeBg: '#d9eeff',
    badgeInk: '#1b588c',
    border: '#5fa4db',
    note: '免登前10首 / 扫码全量 & 概念版免登',
    icon: 'K',
  },
  {
    id: 'kuwo',
    name: '酷我音乐',
    short: '酷我',
    badgeBg: '#ffebbf',
    badgeInk: '#8f510d',
    border: '#deb34b',
    note: '自动分页完整解析',
    icon: '♫',
  },
  {
    id: 'qishui',
    name: '汽水音乐',
    short: '汽水/抖音',
    badgeBg: '#d5f7ea',
    badgeInk: '#186952',
    border: '#55ba9c',
    note: '汽水 + 抖音双通道',
    icon: '≈',
  },
  {
    id: 'migu',
    name: '咪咕音乐',
    short: '咪咕',
    badgeBg: '#eee0ff',
    badgeInk: '#5c348c',
    border: '#a67cdb',
    note: '分享短链全量获取',
    icon: '✦',
  },
];

export type DemoTrack = {
  index: number;
  title: string;
  artist: string;
  album: string;
  duration: string;
  vip?: boolean;
  status: '正常' | 'VIP专享';
};

export const DEMO_PLAYLIST = {
  platform: 'QQ 音乐',
  platformId: 'qq',
  name: '日语动漫',
  creator: '冷汐QwQ',
  coverUrl: ASSETS.covers.folkSong,
  trackCount: 128,
  duration: '8 小时 42 分',
  vipCount: 6,
  sourceUrl: 'https://y.qq.com/n/ryqq/playlist/9140654872',
  excelFile: '【QQ 音乐】日语动漫 - 冷汐QwQ.xlsx',
  jsonFile: '【QQ 音乐】日语动漫 - 冷汐QwQ.json',
  tracks: [
    { index: 1, title: '残酷な天使のテーゼ', artist: '高橋洋子', album: '新世紀エヴァンゲリオン', duration: '04:05', status: '正常' },
    { index: 2, title: 'only my railgun', artist: 'fripSide', album: 'とある科学の超電磁砲', duration: '04:17', vip: true, status: 'VIP专享' },
    { index: 3, title: '打上花火', artist: 'DAOKO × 米津玄師', album: '打ち上げ花火', duration: '04:49', status: '正常' },
    { index: 4, title: '前前前世 (movie ver.)', artist: 'RADWIMPS', album: '君の名は。', duration: '04:46', status: '正常' },
    { index: 5, title: '怪物', artist: 'YOASOBI', album: 'THE BOOK 2', duration: '03:26', status: '正常' },
    { index: 6, title: '廻廻奇譚', artist: 'Eve', album: '廻人', duration: '03:41', status: '正常' },
    { index: 7, title: '青のすみか', artist: 'キタニタツヤ', album: '呪術廻戦 懐玉・玉折', duration: '03:16', status: '正常' },
    { index: 8, title: 'secret base 〜君がくれたもの〜', artist: '本間芽衣子 / 安城鳴子 / 鶴見知利子', album: 'あの日見た花の名前を僕達はまだ知らない。', duration: '05:52', status: '正常' },
    { index: 9, title: 'God knows...', artist: '涼宮ハルヒ (CV.平野綾)', album: '涼宮ハルヒの憂鬱', duration: '04:39', status: '正常' },
    { index: 10, title: '红莲华 (紅蓮華)', artist: 'LiSA', album: '鬼滅の刃', duration: '03:58', vip: true, status: 'VIP专享' },
    { index: 11, title: 'Butter-Fly', artist: '和田光司', album: 'デジモンアドベンチャー', duration: '04:18', status: '正常' },
    { index: 12, title: '鳥の詩', artist: 'Lia', album: 'AIR Original Soundtrack', duration: '06:08', status: '正常' },
    { index: 13, title: 'Sparkle (火花)', artist: 'RADWIMPS', album: '君の名は。', duration: '08:54', status: '正常' },
    { index: 14, title: 'unravel', artist: 'TK from 凛として時雨', album: '東京喰種トーキョーグール', duration: '03:58', status: '正常' },
    { index: 15, title: 'Bling-Bang-Bang-Born', artist: 'Creepy Nuts', album: 'マッシュル-MASHLE-', duration: '02:51', status: '正常' },
  ] as DemoTrack[],
};

export type ExportFormatInfo = {
  id: 'xlsx' | 'json' | 'csv' | 'txt' | 'm3u8' | 'md';
  name: string;
  ext: string;
  tag: string;
  desc: string;
  bg: string;
  ink: string;
  primary?: boolean;
};

export const EXPORT_FORMATS: ExportFormatInfo[] = [
  { id: 'xlsx', name: 'Excel', ext: '.xlsx', tag: '推荐归档', desc: 'Tracks + Playlist Info 双工作表', bg: C.mint, ink: C.mintDeep, primary: true },
  { id: 'json', name: 'JSON', ext: '.json', tag: '推荐接入', desc: 'Canonical JSON 统一数据格式', bg: C.blue, ink: C.blueDeep, primary: true },
  { id: 'csv', name: 'CSV', ext: '.csv', tag: '通用表格', desc: 'UTF-8 BOM 迁移与表格兼容', bg: C.peach, ink: C.peachDeep },
  { id: 'txt', name: 'TXT', ext: '.txt', tag: '轻量清单', desc: '歌名 - 歌手 - 专辑 纯文本', bg: C.yellowCard, ink: C.yellowDeep },
  { id: 'm3u8', name: 'M3U8', ext: '.m3u8', tag: '播放列表', desc: 'Extended M3U 兼容本地播放器', bg: C.lilac, ink: C.lilacDeep },
  { id: 'md', name: 'Markdown', ext: '.md', tag: '笔记语法', desc: 'Obsidian / Notion 知识库表格', bg: C.pink, ink: C.pinkDeep },
];

export type BatchSheetItem = {
  id: string;
  title: string;
  count: number;
  creator: string;
  tag: string;
  bg: string;
  accent: string;
  cover: string;
};

export const BATCH_PLAYLISTS: BatchSheetItem[] = [
  { id: 'p1', title: '中文民谣', count: 48, creator: '冷汐QwQ', tag: '自建公开歌单', bg: '#fff5c0', accent: '#c48b1b', cover: ASSETS.covers.folkPlaylist },
  { id: 'p2', title: '英语流行', count: 62, creator: '冷汐QwQ', tag: '自建公开歌单', bg: '#dff2fa', accent: '#2b6f91', cover: ASSETS.covers.englishPlaylist },
  { id: 'p3', title: '日语动漫', count: 128, creator: '冷汐QwQ', tag: '自建公开歌单', bg: '#fde2ea', accent: '#ad4967', cover: ASSETS.covers.animePlaylist },
];

export const BATCH_TOTAL_TRACKS = 238;

export type EcosystemItem = {
  id: 'musicfree' | 'lx' | 'listen1';
  name: string;
  badge: string;
  status: string;
  method: string;
  detail: string;
  bg: string;
  ink: string;
  accent: string;
};

export const ECOSYSTEM_CARDS: EcosystemItem[] = [
  {
    id: 'musicfree',
    name: 'MusicFree',
    badge: '官方插件接入',
    status: '已支持',
    method: '粘贴歌单链接 / 导入 JSON',
    detail: '安装「把你的歌单带走」插件，一键导入多平台外部歌单',
    bg: '#e3f4fc',
    ink: '#1e5878',
    accent: '#4aa3d1',
  },
  {
    id: 'lx',
    name: '洛雪音乐 LX Music',
    badge: '专用格式导出',
    status: '已支持',
    method: '我的列表 → 导入列表 (.json)',
    detail: '网页端原生生成洛雪专属 playList 协议 JSON，直接还原曲库',
    bg: '#eef9e6',
    ink: '#2d6b34',
    accent: '#5cb866',
  },
  {
    id: 'listen1',
    name: 'Listen 1',
    badge: '专用备份导出',
    status: '已支持',
    method: '设置 → 备份与恢复 (.json)',
    detail: '自动映射平台音源码前缀，生成 myplaylist 本地恢复字典',
    bg: '#f2e8fc',
    ink: '#5a3d85',
    accent: '#946ed1',
  },
];
