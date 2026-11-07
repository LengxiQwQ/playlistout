export const PLAYLIST = {
  title: '花谱、鎖那、鹿乃',
  creator: '琴心月满',
  platform: 'QQ 音乐',
  count: 104,
  duration: '7 小时 6 分钟',
  sourceUrl: 'https://y.qq.com/n/ryqq/playlist/9140654872',
  shortUrl: 'y.qq.com/…/9140654872',
};

export type Track = {
  index: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  vip?: boolean;
  status?: 'normal' | 'vip' | 'unavailable' | 'paid';
  color: string;
  ink: string;
};

export const TRACKS: Track[] = [
  { index: '01', title: '魔女', artist: '花谱', album: '魔女', duration: '03:47', color: '#d7d2f6', ink: '#4b4381' },
  { index: '02', title: 'さよならの速度', artist: '鎖那', album: 'Hush a by little girl', duration: '04:12', color: '#f6d9df', ink: '#8c3f55' },
  { index: '03', title: 'ハロ/ハワユ', artist: '鹿乃', album: 'one', duration: '04:25', color: '#d8eee2', ink: '#346b51' },
  { index: '04', title: '不可解', artist: '花谱', album: '不可解', duration: '04:08', vip: true, status: 'vip', color: '#f9e5b7', ink: '#80551c' },
  { index: '05', title: '愛の詩', artist: '鎖那', album: '愛の詩', duration: '03:58', color: '#d9e8f8', ink: '#365470' },
  { index: '06', title: '小夜子', artist: '鹿乃', album: '小夜子', duration: '04:31', color: '#eadcf3', ink: '#5a4172' },
  { index: '07', title: 'メルの黄昏', artist: '花谱', album: 'メルの黄昏', duration: '04:02', color: '#f5dfca', ink: '#84532f' },
  { index: '08', title: 'その可能性', artist: '鎖那', album: 'その可能性', duration: '03:44', status: 'unavailable', color: '#e6e2d8', ink: '#706b5c' },
];

export const BATCH_PLAYLISTS = [
  { name: '通勤耳机', count: 86, color: '#f6d9df', tab: '#e7a8b8', tag: '早晨' },
  { name: '雨天的窗', count: 72, color: '#d8e8f7', tab: '#93bbdf', tag: '雨天' },
  { name: '夜航星图', count: 104, color: '#d9d4f4', tab: '#a79ada', tag: '夜晚' },
  { name: '温柔摇滚', count: 63, color: '#fae5bb', tab: '#ddb866', tag: '公路' },
  { name: '写稿白噪音', count: 48, color: '#d9efe4', tab: '#8ec7ad', tag: '专注' },
  { name: '春天散步', count: 95, color: '#f7dce7', tab: '#d994ae', tag: '春日' },
  { name: '旧动画片尾', count: 118, color: '#e4e0cf', tab: '#b9ad89', tag: '怀旧' },
  { name: '海边的风', count: 77, color: '#d5eef2', tab: '#84c2ca', tag: '海边' },
  { name: '睡前低音量', count: 122, color: '#e5dcf3', tab: '#ab93cc', tag: '睡前' },
  { name: '八月的留声机', count: 91, color: '#f8e7c9', tab: '#d5b276', tag: '八月' },
  { name: '一杯热可可', count: 58, color: '#efdccd', tab: '#c49a7b', tag: '冬日' },
  { name: '想再去一次', count: 270, color: '#dde8d6', tab: '#9bb488', tag: '旅行' },
];

export const BATCH_TOTAL = BATCH_PLAYLISTS.reduce((sum, item) => sum + item.count, 0);

export const EXPORT_FORMATS = [
  { id: 'xlsx', label: 'Excel (.xlsx)', color: '#d9f2e3', border: '#7acb98', ink: '#176b48', rotate: -1 },
  { id: 'json', label: 'JSON', color: '#dcebfa', border: '#8fb7db', ink: '#274e72', rotate: 1.4 },
  { id: 'txt', label: 'TXT', color: '#faf0c4', border: '#dcc16a', ink: '#75581d', rotate: -1.8 },
  { id: 'csv', label: 'CSV', color: '#f8dde4', border: '#dca0ae', ink: '#803a4b', rotate: 1 },
  { id: 'm3u8', label: 'M3U8', color: '#e7e0f8', border: '#ad9bd3', ink: '#4d3a73', rotate: -0.7 },
  { id: 'md', label: 'Markdown', color: '#e2eee3', border: '#9cb99f', ink: '#3e6342', rotate: 1.2 },
];

export const CLI_FORMATS = [
  { key: '1', label: 'Excel (.xlsx)', desc: '适合查看、整理和备份' },
  { key: '2', label: 'JSON  (.json)', desc: '适合第三方工具和程序导入' },
  { key: '3', label: 'CSV   (.csv)', desc: '适合表格软件和迁移工具' },
  { key: '4', label: 'TXT   (.txt)', desc: '简单的歌曲清单' },
  { key: '5', label: 'M3U8  (.m3u8)', desc: '通用播放列表' },
];

export const ECOSYSTEM = {
  musicfree: {
    name: 'MusicFree',
    status: '已支持 · 插件',
    method: '导入外部歌单',
    detail: '在插件里粘贴歌单链接，或选择 Playlist Out JSON',
    color: '#d9f1e4',
    border: '#7cc49b',
    ink: '#1e6b4c',
    initials: 'MF',
  },
  lx: {
    name: '洛雪音乐',
    status: '已支持 · JSON',
    method: '我的列表 → 导入列表',
    detail: '选择【洛雪音乐】JSON，秒级还原歌单',
    color: '#e6def5',
    border: '#a895cc',
    ink: '#4a376f',
    initials: 'LX',
  },
  listen1: {
    name: 'Listen 1',
    status: '已支持 · JSON',
    method: '设置 → 备份与恢复',
    detail: '从本地文件恢复【Listen 1】JSON',
    color: '#f7dde6',
    border: '#d69bb0',
    ink: '#7d3d53',
    initials: 'L1',
  },
};

export const END = {
  url: 'playlistout.lengxiqwq.com',
  github: 'github.com/LengxiQwQ/playlistout',
  license: 'MIT License · 2026',
};
