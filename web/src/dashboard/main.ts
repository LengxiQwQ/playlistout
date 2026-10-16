/**
 * PlaylistOut Analytics & Review Maintainer Dashboard
 * Complete client-side application with authentication, in-memory slice engine,
 * interactive feedback status mutation, and forensic telemetry inspection.
 */

import { fetchSnapshot, updateFeedbackStatus, DashboardApiError } from './api';
import { getAuthToken, saveAuthToken, clearAuthToken, verifyAuthToken, isRemembered } from './auth';
import {
  buildAnalyticsSlice,
  buildFeedbackSlice,
  buildQuarantineSlice,
} from './engine';
import type {
  AnalyticsSnapshot,
  AnalyticsSlice,
  FeedbackRow,
  QuarantineRow,
  CountItem,
} from './types';

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));

const fmt = (n: unknown): string => Number(n || 0).toLocaleString();
const pct = (n: unknown): string => Number(n || 0).toFixed(1) + '%';

const COUNTRY_META: Record<string, { name: string; color: string }> = {
  CN: { name: '中国 (CN)', color: '#de2910' },
  US: { name: '美国 (US)', color: '#1e40af' },
  HK: { name: '中国香港 (HK)', color: '#e11d48' },
  TW: { name: '中国台湾 (TW)', color: '#0284c7' },
  JP: { name: '日本 (JP)', color: '#dc2626' },
  SG: { name: '新加坡 (SG)', color: '#e11d48' },
  MY: { name: '马来西亚 (MY)', color: '#f59e0b' },
  GB: { name: '英国 (GB)', color: '#1d4ed8' },
  DE: { name: '德国 (DE)', color: '#d97706' },
  FR: { name: '法国 (FR)', color: '#2563eb' },
  CA: { name: '加拿大 (CA)', color: '#dc2626' },
  AU: { name: '澳大利亚 (AU)', color: '#059669' },
  KR: { name: '韩国 (KR)', color: '#2563eb' },
  RU: { name: '俄罗斯 (RU)', color: '#0284c7' },
  NL: { name: '荷兰 (NL)', color: '#ea580c' },
  IN: { name: '印度 (IN)', color: '#ea580c' },
  VN: { name: '越南 (VN)', color: '#dc2626' },
  TH: { name: '泰国 (TH)', color: '#4f46e5' },
  ID: { name: '印尼 (ID)', color: '#dc2626' },
  PH: { name: '菲律宾 (PH)', color: '#2563eb' },
  BR: { name: '巴西 (BR)', color: '#16a34a' },
  IT: { name: '意大利 (IT)', color: '#15803d' },
  ES: { name: '西班牙 (ES)', color: '#eab308' },
  MO: { name: '中国澳门 (MO)', color: '#059669' },
  UNKNOWN: { name: '未知地区', color: '#64748b' },
};

const PROVINCE_NAMES: Record<string, string> = {
  Guangdong: '广东 (Guangdong)',
  Zhejiang: '浙江 (Zhejiang)',
  Jiangsu: '江苏 (Jiangsu)',
  Beijing: '北京 (Beijing)',
  Shanghai: '上海 (Shanghai)',
  Sichuan: '四川 (Sichuan)',
  Shandong: '山东 (Shandong)',
  Hubei: '湖北 (Hubei)',
  Hunan: '湖南 (Hunan)',
  Fujian: '福建 (Fujian)',
  Henan: '河南 (Henan)',
  Hebei: '河北 (Hebei)',
  Shaanxi: '陕西 (Shaanxi)',
  Anhui: '安徽 (Anhui)',
  Chongqing: '重庆 (Chongqing)',
  Tianjin: '天津 (Tianjin)',
  Liaoning: '辽宁 (Liaoning)',
  Jiangxi: '江西 (Jiangxi)',
  Guangxi: '广西 (Guangxi)',
  Yunnan: '云南 (Yunnan)',
  Heilongjiang: '黑龙江 (Heilongjiang)',
  Jilin: '吉林 (Jilin)',
  Shanxi: '山西 (Shanxi)',
  Guizhou: '贵州 (Guizhou)',
  Gansu: '甘肃 (Gansu)',
  Hainan: '海南 (Hainan)',
  'Inner Mongolia': '内蒙古 (Inner Mongolia)',
  Xinjiang: '新疆 (Xinjiang)',
  Ningxia: '宁夏 (Ningxia)',
  Qinghai: '青海 (Qinghai)',
  Tibet: '西藏 (Tibet)',
};

const BRAND_COLORS: Record<string, string> = {
  qqmusic: '#10b981',
  netease: '#ef4444',
  kugou: '#3b82f6',
  kuwo: '#ca8a04',
  migu: '#db2777',
  qishui: '#f59e0b',
  'plugin:musicfree': '#8b5cf6',
  musicfree: '#8b5cf6',
  plugin: '#8b5cf6',
  'plugin:bbplayer': '#fb7299',
  bbplayer: '#fb7299',
  official_web: '#0284c7',
  web: '#0284c7',
  anonymous_api: '#10b981',
  api: '#10b981',
  legacy_mixed: '#64748b',
  legacy_unknown: '#64748b',
  desktop: '#6366f1',
  mobile: '#8b5cf6',
  tablet: '#06b6d4',
  chrome: '#ea4335',
  edge: '#0078d7',
  safari: '#0284c7',
  firefox: '#f97316',
  qqbrowser: '#2563eb',
  wechat: '#07c160',
  arkweb: '#cf0a2c',
  huawei_browser: '#cf0a2c',
  miui_browser: '#ff6700',
  quark: '#0ea5e9',
  baidu: '#2932e1',
  slbrowser: '#8b5cf6',
  bot_crawler: '#64748b',
  windows: '#0078d7',
  android: '#22c55e',
  ios: '#6366f1',
  macos: '#a855f7',
  linux: '#f59e0b',
  harmonyos: '#cf0a2c',
  xlsx: '#10b981',
  csv: '#3b82f6',
  json: '#f59e0b',
  clean_link: '#10b981',
  markdown: '#3b82f6',
  '<500ms': '#10b981',
  '500-1000ms': '#06b6d4',
  '1-3s': '#3b82f6',
  '3-5s': '#f59e0b',
  '5s+': '#ef4444',
  primary: '#10b981',
  fallback: '#f59e0b',
  unsupported_url: '#f59e0b',
  incomplete_playlist: '#f97316',
  playlist_not_found: '#ef4444',
  invalid_input: '#e11d48',
  parse_error: '#dc2626',
  upstream_timeout: '#b91c1c',
  rate_limited: '#a855f7',
  forbidden: '#be123c',
};

const AUTO_PALETTE = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#a855f7', '#0ea5e9', '#e11d48', '#d946ef', '#059669',
  '#2563eb', '#7c3aed', '#d97706', '#4f46e5', '#0284c7',
];

function getBrandColor(key: string): string {
  const k = key.toLowerCase();
  if (BRAND_COLORS[k]) return BRAND_COLORS[k];
  if (COUNTRY_META[key]) return COUNTRY_META[key].color;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return AUTO_PALETTE[Math.abs(hash) % AUTO_PALETTE.length];
}

function formatHumanLabel(val: string): string {
  if (COUNTRY_META[val]) return COUNTRY_META[val].name;
  if (PROVINCE_NAMES[val]) return PROVINCE_NAMES[val];
  const map: Record<string, string> = {
    official_web: '官方 Web 网页端',
    anonymous_api: '匿名开放 API',
    musicfree: 'MusicFree 插件端',
    bbplayer: 'BBPlayer 客户端',
    legacy_mixed: '历史未细分流量 (V1)',
    legacy_unknown: '历史未细分接入端',
    web: '官方网页 (web)',
    plugin: '插件集成 (plugin)',
    api: '对外 API (api)',
    qqmusic: 'QQ 音乐',
    netease: '网易云音乐',
    kugou: '酷狗音乐',
    kuwo: '酷我音乐',
    migu: '咪咕音乐',
    qishui: '汽水音乐',
    desktop: '桌面电脑 (Desktop)',
    mobile: '移动手机 (Mobile)',
    tablet: '平板设备 (Tablet)',
    bot_crawler: '爬虫与自动化测试 (Bot)',
    xlsx: 'Excel 工作簿 (.xlsx)',
    csv: '逗号分隔符 (.csv)',
    json: '结构化数据 (.json)',
    clean_link: '纯文本歌曲清单 (.txt)',
    markdown: 'Markdown 笔记格式 (.md)',
  };
  return map[val] || val;
}

const DASHBOARD_CSS = `
:root {
  --bg: #f4f6fa; --p: #ffffff; --t: #1e293b; --m: #64748b; --l: #e2e8f0; --a: #206bc4;
  --g: #10b981; --r: #ef4444; --w: #f59e0b; --s: 0 1px 3px rgba(0,0,0,.05); --rad: 8px;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f172a; --p: #1e293b; --t: #f8fafc; --m: #94a3b8; --l: #334155; --a: #3b82f6;
    --g: #34d399; --r: #f87171; --w: #fbbf24; --s: 0 1px 3px rgba(0,0,0,.3);
  }
}
* { box-sizing: border-box; }
html { overflow-y: scroll; scrollbar-gutter: stable; }
body { margin: 0; background: var(--bg); color: var(--t); font-family: var(--font); font-size: 13px; line-height: 1.5; }
button, select, input { font: inherit; color: inherit; }
.wrap { max-width: 1440px; margin: auto; padding: 14px 22px; }
.top { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--p) 96%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid var(--l); box-shadow: var(--s); }
.head { display: flex; align-items: center; min-height: 50px; padding: 3px 0; }
.brand { display: flex; align-items: center; gap: 9px; flex-shrink: 0; text-decoration: none; color: inherit; cursor: pointer; transition: opacity .15s; }
.brand:hover { opacity: .8; }
.logo-img { width: 32px; height: 32px; border-radius: 8px; object-fit: cover; display: block; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,.15); border: 1px solid var(--l); }
.brand-info { display: flex; flex-direction: column; line-height: 1.2; }
h1 { margin: 0; font-size: 14px; font-weight: 700; letter-spacing: -.2px; display: flex; align-items: center; gap: 6px; }
.badge-tag { font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 999px; background: color-mix(in srgb, var(--a) 12%, transparent); color: var(--a); border: 1px solid color-mix(in srgb, var(--a) 25%, transparent); }
.muted { font-size: 12px; color: var(--m); }
.headright { display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: auto; }
.health { padding: 4px 9px; border: 1px solid var(--l); background: var(--p); border-radius: 999px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; min-width: 92px; justify-content: center; }
.health.good { color: var(--g); border-color: color-mix(in srgb, var(--g) 30%, transparent); background: color-mix(in srgb, var(--g) 8%, transparent); }
.health.bad { color: var(--r); border-color: color-mix(in srgb, var(--r) 30%, transparent); background: color-mix(in srgb, var(--r) 8%, transparent); }
.ghost { height: 30px; padding: 0 10px; border: 1px solid var(--l); border-radius: 7px; background: var(--p); cursor: pointer; font-size: 12px; font-weight: 500; box-shadow: var(--s); transition: background .15s, border-color .15s; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; }
.ghost:hover { background: color-mix(in srgb, var(--p) 85%, var(--a)); border-color: var(--a); }
.ghost:disabled { opacity: 0.6; cursor: not-allowed; }
.tabs { display: flex; gap: 4px; align-items: center; padding: 0; margin: 0 0 0 16px; flex-shrink: 0; }
.tab { border: 1px solid transparent; border-radius: 8px; padding: 4px 10px; background: transparent; color: var(--m); cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; transition: background .12s, color .12s, border-color .12s; outline: none; }
.tab:hover { color: var(--t); background: color-mix(in srgb, var(--p) 65%, transparent); border-color: var(--l); }
.tab.active { background: var(--p); color: var(--a); border-color: color-mix(in srgb, var(--a) 35%, var(--l)); }
.tab-icon { font-size: 14px; line-height: 1; display: flex; align-items: center; }
.tab-text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.15; text-align: left; }
.tab-title { font-size: 12px; font-weight: 600; color: inherit; }
.tab-sub { font-size: 9.5px; font-weight: 600; color: var(--m); letter-spacing: .3px; text-transform: uppercase; }
.tab.active .tab-sub { color: color-mix(in srgb, var(--a) 70%, var(--m)); }
.tab-badge { padding: 1px 5px; border-radius: 999px; font-size: 10px; font-weight: 700; background: var(--w); color: #fff; line-height: 1.2; margin-left: 2px; }
.filter-card { padding: 12px 16px; margin-bottom: 14px; background: var(--p); border: 1px solid var(--l); border-radius: var(--rad); box-shadow: var(--s); }
.filter-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--l); min-height: 36px; }
.filter-card-title { font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px; color: var(--t); white-space: nowrap; }
.toggle-switch { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; user-select: none; font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 6px; transition: background .15s; }
.toggle-switch:hover { background: color-mix(in srgb, var(--p) 80%, var(--a)); }
.toggle-switch input { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
.toggle-slider { position: relative; width: 30px; height: 17px; background: var(--l); border-radius: 999px; transition: background .2s ease; flex-shrink: 0; }
.toggle-slider::after { content: ""; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.25); transition: transform .2s cubic-bezier(.4,0,.2,1); }
.toggle-switch input:checked + .toggle-slider { background: var(--g); }
.toggle-switch input:checked + .toggle-slider::after { transform: translateX(13px); }
.toggle-switch-text { font-size: 11.5px; font-weight: 600; color: var(--m); white-space: nowrap; }
.toggle-switch input:checked ~ .toggle-switch-text { color: var(--t); }
.filters { display: grid; grid-template-columns: repeat(5, minmax(130px, 1fr)) auto; gap: 8px; }
.date-field { grid-column: 1 / -1; }
.field label { display: block; font-size: 11px; color: var(--m); font-weight: 600; margin: 0 0 4px 2px; }
.field select, .field input { height: 34px; width: 100%; padding: 0 8px; border: 1px solid var(--l); border-radius: 7px; background: var(--p); font-size: 12px; }
.date-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.date-group { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
.date-group .date-label { font-size: 11px; color: var(--m); font-weight: 600; white-space: nowrap; }
.date-group input { width: 140px; height: 32px; }
.range { display: flex; gap: 4px; flex-wrap: wrap; }
.range button { height: 32px; padding: 0 9px; border: 1px solid var(--l); border-radius: 7px; background: var(--p); cursor: pointer; font-size: 12px; color: var(--m); transition: all .15s; }
.range button:hover { color: var(--t); border-color: var(--m); }
.range button.active { background: var(--a); color: #fff; border-color: var(--a); font-weight: 600; }
.page { display: none; min-height: calc(100vh - 220px); }
.page.active { display: block; }
.section { display: flex; justify-content: space-between; align-items: end; margin: 16px 0 10px; }
.section h2 { margin: 0; font-size: 16px; font-weight: 700; }
.kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.card, .panel { background: var(--p); border: 1px solid var(--l); border-radius: var(--rad); box-shadow: var(--s); }
.kpi-card { padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; min-height: 92px; }
.kpi-label { font-size: 11px; font-weight: 600; color: var(--m); display: flex; justify-content: space-between; align-items: center; }
.kpi-val { font-size: 22px; font-weight: 700; font-family: var(--mono); margin: 4px 0 2px; letter-spacing: -.5px; }
.kpi-sub { font-size: 11px; color: var(--m); }
.grid2 { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-top: 12px; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
.panel { padding: 14px; min-width: 0; }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--l); }
.panel h3 { font-size: 13px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 6px; }
.trend-box { position: relative; height: 260px; width: 100%; }
.trend-box canvas { width: 100% !important; height: 100% !important; display: block; cursor: crosshair; }
.trend-legend { display: flex; gap: 12px; font-size: 11px; color: var(--m); align-items: center; }
.legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.chart-tooltip { position: absolute; pointer-events: none; display: none; background: var(--p); border: 1px solid var(--l); border-radius: 7px; padding: 8px 10px; font-size: 11px; box-shadow: 0 4px 14px rgba(0,0,0,.12); z-index: 10; transform: translate(-50%, -110%); min-width: 140px; }
.chart-tooltip-title { font-weight: 600; color: var(--m); margin-bottom: 4px; border-bottom: 1px solid var(--l); padding-bottom: 3px; }
.chart-tooltip-row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
.bars { display: flex; flex-direction: column; gap: 8px; }
.bar { display: grid; grid-template-columns: 150px 1fr 70px; gap: 8px; align-items: center; font-size: 12px; }
.bn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
.b-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.track { height: 7px; background: var(--l); border-radius: 999px; overflow: hidden; }
.fill { height: 100%; border-radius: 999px; transition: width .2s; }
.num { text-align: right; color: var(--m); font-variant-numeric: tabular-nums; font-family: var(--mono); font-size: 11px; }
.num .pct { color: var(--t); font-weight: 700; margin-left: 4px; }
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chip { padding: 3px 7px; border: 1px solid var(--l); border-radius: 999px; background: var(--p); font-size: 11px; color: var(--m); }
.table-wrap { overflow: auto; max-height: 560px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
th, td { padding: 8px 10px; border-bottom: 1px solid var(--l); vertical-align: middle; }
th { color: var(--m); font-weight: 600; font-size: 11px; background: color-mix(in srgb, var(--p) 92%, var(--bg)); position: sticky; top: 0; z-index: 2; }
tbody tr:hover { background: color-mix(in srgb, var(--p) 90%, var(--a)); }
.url-cell { font-family: var(--mono); font-size: 11px; color: var(--a); max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-sm { padding: 2px 7px; border: 1px solid var(--l); border-radius: 5px; background: var(--p); font-size: 11px; cursor: pointer; font-weight: 500; transition: all .15s; }
.btn-sm:hover { background: color-mix(in srgb, var(--p) 80%, var(--a)); border-color: var(--a); }
.btn-sm.ok { background: color-mix(in srgb, var(--g) 10%, var(--p)); color: var(--g); border-color: color-mix(in srgb, var(--g) 30%, transparent); }
.badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; display: inline-block; }
.badge.pending { background: color-mix(in srgb, var(--w) 15%, var(--p)); color: var(--w); border: 1px solid color-mix(in srgb, var(--w) 30%, transparent); }
.badge.resolved { background: color-mix(in srgb, var(--g) 15%, var(--p)); color: var(--g); border: 1px solid color-mix(in srgb, var(--g) 30%, transparent); }
.badge.ignored { background: color-mix(in srgb, var(--m) 15%, var(--p)); color: var(--m); border: 1px solid color-mix(in srgb, var(--m) 30%, transparent); }
.footer { text-align: center; color: var(--m); font-size: 11px; padding: 24px 0; }

/* Login Container */
.login-card-wrap { min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.login-card { background: var(--p); border: 1px solid var(--l); border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,.08); max-width: 440px; width: 100%; padding: 28px 24px; }
.login-header { text-align: center; margin-bottom: 24px; }
.login-logo { width: 48px; height: 48px; border-radius: 12px; margin: 0 auto 10px; display: block; border: 1px solid var(--l); }
.login-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.login-subtitle { font-size: 12px; color: var(--m); margin: 0; }
.login-form-group { margin-bottom: 16px; text-align: left; }
.login-form-group label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; }
.login-input { width: 100%; height: 38px; padding: 0 10px; border: 1px solid var(--l); border-radius: 7px; background: var(--p); font-size: 13px; font-family: var(--mono); }
.login-btn { width: 100%; height: 40px; background: var(--a); color: #fff; border: none; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity .15s; margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.login-btn:hover { opacity: .9; }
.login-btn:disabled { opacity: .6; cursor: not-allowed; }
.login-notice { margin-top: 18px; font-size: 11px; color: var(--m); line-height: 1.5; border-top: 1px solid var(--l); padding-top: 12px; text-align: left; }
.alert-error { background: color-mix(in srgb, var(--r) 10%, var(--p)); border: 1px solid color-mix(in srgb, var(--r) 30%, transparent); color: var(--r); padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 14px; }

@media (max-width: 1240px) {
  .head { flex-wrap: wrap; padding: 6px 0; gap: 8px; }
  .tabs { order: 3; width: 100%; justify-content: flex-start; margin: 4px 0 0; overflow-x: auto; }
}
@media (max-width: 1100px) {
  .filters { grid-template-columns: repeat(3, 1fr); }
  .kpis { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 760px) {
  .filters { grid-template-columns: 1fr 1fr; }
  .kpis { grid-template-columns: 1fr 1fr; }
  .grid2, .grid3 { grid-template-columns: 1fr; }
  .bar { grid-template-columns: 100px 1fr 60px; }
}
`;

class DashboardApp {
  private container: HTMLElement;
  private token: string | null = null;
  private snapshot: AnalyticsSnapshot | null = null;
  private currentSlice: AnalyticsSlice | null = null;
  private excludeMy = false;
  private currentFbStatus = 'pending';
  private currentPage = 'overview';
  private activePreset = 'all';

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public async start(): Promise<void> {
    this.injectStyles();
    this.token = getAuthToken();

    if (!this.token) {
      this.renderLogin();
      return;
    }

    this.renderLoading('正在同步云端 Analytics 快照…');
    try {
      this.snapshot = await fetchSnapshot(this.token);
      this.renderDashboard();
    } catch (err) {
      if (err instanceof DashboardApiError && (err.status === 401 || err.status === 403)) {
        clearAuthToken();
        this.token = null;
        this.renderLogin('凭据已失效或无权访问，请重新登录。');
      } else {
        this.renderLogin(`连接云端失败：${(err as Error).message}`);
      }
    }
  }

  private injectStyles(): void {
    if (!document.getElementById('dashboard-injected-styles')) {
      const style = document.createElement('style');
      style.id = 'dashboard-injected-styles';
      style.textContent = DASHBOARD_CSS;
      document.head.appendChild(style);
    }
  }

  private renderLoading(msg: string): void {
    this.container.innerHTML = `
      <div class="login-card-wrap">
        <div class="login-card" style="text-align:center">
          <img src="/logo-64.png" class="login-logo" alt="PlaylistOut" onerror="this.onerror=null;this.src='/favicon.svg'">
          <div style="font-weight:700;font-size:15px;margin-bottom:8px">PlaylistOut Analytics</div>
          <div class="muted">${esc(msg)}</div>
        </div>
      </div>
    `;
  }

  private renderLogin(errorMsg = ''): void {
    this.container.innerHTML = `
      <div class="login-card-wrap">
        <div class="login-card">
          <div class="login-header">
            <img src="/logo-64.png" class="login-logo" alt="PlaylistOut" onerror="this.onerror=null;this.src='/favicon.svg'">
            <h2 class="login-title">PlaylistOut Maintainer</h2>
            <p class="login-subtitle">数据与审查控制台 · 身份认证</p>
          </div>
          ${errorMsg ? `<div class="alert-error">${esc(errorMsg)}</div>` : ''}
          <form id="loginForm">
            <div class="login-form-group">
              <label for="adminToken">管理员密码 (Password)</label>
              <input type="password" id="adminToken" class="login-input" placeholder="请输入管理员密码或口令" required autofocus autocomplete="current-password">
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
              <input type="checkbox" id="rememberMe" ${isRemembered() ? 'checked' : ''} style="cursor:pointer">
              <label for="rememberMe" style="font-size:12px;color:var(--m);cursor:pointer;user-select:none">记住此设备（永久保持登录，除非主动退出）</label>
            </div>
            <button type="submit" id="loginSubmitBtn" class="login-btn">
              <span>🔐</span>
              <span id="loginBtnText">验证并进入控制台</span>
            </button>
          </form>
          <div class="login-notice">
            <strong>🔒 安全提示</strong><br>
            凭据直接与 Cloudflare Worker 进行常量时间安全校验（SHA-256 Digest），只保存在您本机的浏览器本地存储中，退出登录即可完全清除。
          </div>
        </div>
      </div>
    `;

    const form = document.getElementById('loginForm') as HTMLFormElement;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const input = document.getElementById('adminToken') as HTMLInputElement;
      const rememberCheckbox = document.getElementById('rememberMe') as HTMLInputElement;
      const submitBtn = document.getElementById('loginSubmitBtn') as HTMLButtonElement;
      const btnText = document.getElementById('loginBtnText') as HTMLSpanElement;

      const tokenValue = input.value.trim();
      if (!tokenValue) return;

      submitBtn.disabled = true;
      btnText.textContent = '验证中…';

      try {
        const ok = await verifyAuthToken(tokenValue);
        if (!ok) {
          submitBtn.disabled = false;
          btnText.textContent = '验证并进入控制台';
          this.renderLogin('口令错误，请重新输入。');
          return;
        }

        this.token = tokenValue;
        saveAuthToken(tokenValue, rememberCheckbox.checked);
        this.renderLoading('验证通过，正在加载最新快照…');
        this.snapshot = await fetchSnapshot(tokenValue);
        this.renderDashboard();
      } catch (err) {
        submitBtn.disabled = false;
        btnText.textContent = '验证并进入控制台';
        this.renderLogin(`验证异常：${(err as Error).message}`);
      }
    };
  }

  private renderDashboard(): void {
    if (!this.snapshot) return;

    this.container.innerHTML = `
      <header class="top">
        <div class="wrap">
          <div class="head">
            <a href="https://playlistout.lengxiqwq.com/" class="brand" title="访问 PlaylistOut 官方主页 ↗">
              <img src="/logo-64.png" width="32" height="32" class="logo-img" alt="PlaylistOut" onerror="this.onerror=null;this.src='/favicon.svg'">
              <div class="brand-info">
                <h1>PlaylistOut <span class="badge-tag">Analytics</span></h1>
                <div class="muted" style="font-size:10px;white-space:nowrap">云端数据大盘 · 点击返回官网 ↗</div>
              </div>
            </a>
            <nav class="tabs">
              <button class="tab ${this.currentPage === 'overview' ? 'active' : ''}" data-page="overview">
                <span class="tab-icon">📊</span>
                <span class="tab-text"><span class="tab-title">业务总览</span><span class="tab-sub">Overview</span></span>
              </button>
              <button class="tab ${this.currentPage === 'feedback' ? 'active' : ''}" data-page="feedback">
                <span class="tab-icon">🐛</span>
                <span class="tab-text"><span class="tab-title">待审歌单</span><span class="tab-sub">Feedback</span></span>
                <span id="navPendingBadge" class="tab-badge" style="display:none">0</span>
              </button>
              <button class="tab ${this.currentPage === 'web' ? 'active' : ''}" data-page="web">
                <span class="tab-icon">💻</span>
                <span class="tab-text"><span class="tab-title">终端地域</span><span class="tab-sub">Web</span></span>
              </button>
              <button class="tab ${this.currentPage === 'reliability' ? 'active' : ''}" data-page="reliability">
                <span class="tab-icon">🛡️</span>
                <span class="tab-text"><span class="tab-title">稳定偏好</span><span class="tab-sub">Reliability</span></span>
              </button>
              <button class="tab ${this.currentPage === 'integrations' ? 'active' : ''}" data-page="integrations">
                <span class="tab-icon">🔌</span>
                <span class="tab-text"><span class="tab-title">生态集成</span><span class="tab-sub">Integrations</span></span>
              </button>
              <button class="tab ${this.currentPage === 'security' ? 'active' : ''}" data-page="security">
                <span class="tab-icon">🔒</span>
                <span class="tab-text"><span class="tab-title">安全风控</span><span class="tab-sub">Security</span></span>
              </button>
              <button class="tab ${this.currentPage === 'dau' ? 'active' : ''}" data-page="dau">
                <span class="tab-icon">📈</span>
                <span class="tab-text"><span class="tab-title">日活 DAU</span><span class="tab-sub">Daily Active</span></span>
              </button>
            </nav>
            <div class="headright">
              <div id="healthBadge" class="health good">● Healthy</div>
              <div id="updatedTime" class="muted" style="font-size:11px"></div>
              <button id="refreshCloudBtn" class="ghost" title="重新从 Cloudflare Worker 提取最新聚合快照">刷新云端数据</button>
              <button id="logoutBtn" class="ghost" style="color:var(--r);border-color:color-mix(in srgb,var(--r) 30%,transparent)" title="清除本地凭据退出">退出</button>
            </div>
          </div>
        </div>
      </header>

      <main class="wrap">
        <div id="globalError"></div>

        <!-- 维度与时间筛选工具栏 -->
        <div class="card filter-card">
          <div class="filter-card-head">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="filter-card-title"><span>⚙️</span> 维度与时间筛选工具栏 (Filters)</div>
              <div class="muted">单日自动显示小时趋势；在客户端内存高速切片，不消耗额外 D1 请求</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
              <label class="toggle-switch" title="一键排除所有来自马来西亚的测试记录（默认关闭）">
                <input type="checkbox" id="switchExcludeMy" ${this.excludeMy ? 'checked' : ''}>
                <span class="toggle-slider"></span>
                <span class="toggle-switch-text">排除 MY 测试</span>
              </label>
              <div id="filterChips" class="chips"></div>
            </div>
          </div>
          <div class="filters">
            <div class="field date-field">
              <div class="date-tools">
                <div class="range">
                  <button data-range="today">今天</button>
                  <button data-range="yesterday">昨天</button>
                  <button data-range="daybefore">前天</button>
                  <button data-range="day3">大前天</button>
                  <button data-range="7">近7天</button>
                  <button data-range="30">近30天</button>
                  <button data-range="all" class="active">全部历史</button>
                </div>
                <div class="date-group">
                  <span class="date-label">单日</span>
                  <input id="singleDateInput" type="date" aria-label="查看单日">
                  <button id="applySingleDateBtn" class="ghost">查看这一天</button>
                </div>
                <div class="date-group">
                  <span class="date-label">范围</span>
                  <input id="fromDateInput" type="date" aria-label="开始日期">
                  <span class="date-label">至</span>
                  <input id="toDateInput" type="date" aria-label="结束日期">
                  <button id="applyDateRangeBtn" class="ghost">应用范围</button>
                </div>
              </div>
            </div>
            <div class="field"><label for="filterChannel">来源渠道 Channel</label><select id="filterChannel"><option value="">全部</option><option>web</option><option>plugin</option><option>api</option><option>legacy_mixed</option></select></div>
            <div class="field"><label for="filterClient">接入端 Client</label><select id="filterClient"><option value="">全部</option></select></div>
            <div class="field"><label for="filterPlatform">目标平台 Platform</label><select id="filterPlatform"><option value="">全部</option><option>qqmusic</option><option>netease</option><option>kugou</option><option>kuwo</option><option>qishui</option><option>migu</option></select></div>
            <div class="field"><label for="filterCountry">国家 Country</label><select id="filterCountry"><option value="">全部</option></select></div>
            <div class="field"><label for="filterRegion">地区 Region</label><select id="filterRegion"><option value="">全部</option></select></div>
            <div class="field" style="display:flex;align-items:end"><button id="resetFiltersBtn" class="ghost" style="width:100%">重置</button></div>
          </div>
        </div>

        <!-- 1. 业务总览 (Overview) -->
        <section class="page ${this.currentPage === 'overview' ? 'active' : ''}" id="page-overview">
          <div class="section">
            <div><h2>整体情况 Overview</h2><div class="muted">先看结果，再下钻原因。</div></div>
          </div>
          <div id="overviewKpis" class="kpis"></div>
          <div class="grid2">
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>📈 请求趋势 (Request Trend)</h3>
                  <div class="muted" style="font-size:11px">单日范围显示小时趋势，多日范围显示每日趋势；全画幅滑动，纵向磁吸对准。</div>
                </div>
                <div class="trend-legend">
                  <span><span class="legend-dot" style="background:var(--g)"></span>成功解析</span>
                  <span><span class="legend-dot" style="background:var(--r)"></span>最终失败</span>
                </div>
              </div>
              <div class="trend-box" id="trendBox">
                <canvas id="trendCanvas"></canvas>
                <div id="trendTip" class="chart-tooltip">
                  <div id="tipTitle" class="chart-tooltip-title"></div>
                  <div class="chart-tooltip-row"><span style="color:var(--g)">● 成功解析:</span><strong id="tipOk"></strong></div>
                  <div class="chart-tooltip-row"><span style="color:var(--r)">● 最终失败:</span><strong id="tipFail"></strong></div>
                  <div class="chart-tooltip-row" style="border-top:1px solid var(--l);padding-top:2px"><span class="muted">成功率:</span><strong id="tipRate"></strong></div>
                </div>
              </div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🎵 请求目标平台</h3><span class="muted" style="font-size:11px">Platform Share</span></div>
              <div id="platformBars" class="bars"></div>
            </div>
          </div>
          <div class="grid2" style="margin-top:12px">
            <div class="panel">
              <div class="panel-head"><h3>🌍 访问国家 Top 10</h3><span class="muted" style="font-size:11px">Country</span></div>
              <div id="countryBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🏙️ 活跃省份 / 地区 Top 10</h3><span class="muted" style="font-size:11px">Region</span></div>
              <div id="regionBars" class="bars"></div>
            </div>
          </div>
          <div class="grid2" style="margin-top:12px">
            <div class="panel">
              <div class="panel-head"><h3>🔌 Resolve Clients 接入端</h3><span class="muted" style="font-size:11px">生态分流</span></div>
              <div id="clientBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🩺 数据完整性 Data Quality</h3><span class="muted" style="font-size:11px">守恒与约束</span></div>
              <div id="qualityChecks"></div>
            </div>
          </div>
        </section>

        <!-- 2. 待审歌单 (Feedback) -->
        <section class="page ${this.currentPage === 'feedback' ? 'active' : ''}" id="page-feedback">
          <div class="section">
            <div>
              <h2>待审歌单与失败排查 (Review & Feedback)</h2>
              <div class="muted">解析失败反馈工作流：审查用户上报的真实失败歌单链接，快速复现、一键标记修复并同步 Cloudflare D1。</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <button class="ghost fb-tab ${this.currentFbStatus === 'pending' ? 'active' : ''}" data-fb-status="pending">待处理 Pending (<span id="fbCountPending">0</span>)</button>
              <button class="ghost fb-tab ${this.currentFbStatus === 'all' ? 'active' : ''}" data-fb-status="all">全部 All (<span id="fbCountAll">0</span>)</button>
              <button class="ghost fb-tab ${this.currentFbStatus === 'resolved' ? 'active' : ''}" data-fb-status="resolved">已修复 Resolved (<span id="fbCountResolved">0</span>)</button>
              <button class="ghost fb-tab ${this.currentFbStatus === 'ignored' ? 'active' : ''}" data-fb-status="ignored">已忽略 Ignored (<span id="fbCountIgnored">0</span>)</button>
              <button id="reloadFeedbackBtn" class="ghost">刷新列表</button>
            </div>
          </div>
          <div class="panel">
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:50px">ID</th>
                    <th style="width:90px">平台</th>
                    <th>歌单链接 (Playlist URL) · 支持一键测试复现</th>
                    <th style="width:130px">错误代码</th>
                    <th style="width:160px">地域 / 城市</th>
                    <th style="width:60px;text-align:center">频次</th>
                    <th style="width:130px">最近上报时间</th>
                    <th style="width:70px">状态</th>
                    <th style="width:130px;text-align:right">操作</th>
                  </tr>
                </thead>
                <tbody id="feedbackRows"></tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- 3. 终端与地域 (Web) -->
        <section class="page ${this.currentPage === 'web' ? 'active' : ''}" id="page-web">
          <div class="section">
            <div><h2>官网访客与终端环境 Web</h2><div class="muted">官网访问、来源与客户端环境。</div></div>
          </div>
          <div id="webKpis" class="kpis"></div>
          <div class="grid3">
            <div class="panel">
              <div class="panel-head"><h3>🔗 访问来源分类 Referrer</h3></div>
              <div id="referrerBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🌐 主流浏览器 Browser</h3></div>
              <div id="browserBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>💻 设备终端与系统 Device / OS</h3></div>
              <div id="deviceBars" class="bars"></div>
              <hr style="border:0;border-top:1px solid var(--l);margin:10px 0">
              <div id="osBars" class="bars"></div>
            </div>
          </div>
          <div class="grid2">
            <div class="panel">
              <div class="panel-head"><h3>🌍 全球访问国家分布 Top 15</h3><span class="muted" style="font-size:11px">Country</span></div>
              <div id="webCountryBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🏙️ 境内省份与主要城市分布 Top 15</h3><span class="muted" style="font-size:11px">Region</span></div>
              <div id="webRegionBars" class="bars"></div>
            </div>
          </div>
        </section>

        <!-- 4. 稳定性与偏好 (Reliability) -->
        <section class="page ${this.currentPage === 'reliability' ? 'active' : ''}" id="page-reliability">
          <div class="section">
            <div><h2>稳定性诊断与偏好 Reliability</h2><div class="muted">失败原因、阶段、链路与耗时；可靠性 breakdown 不做地理关联。</div></div>
          </div>
          <div id="reliabilityKpis" class="kpis"></div>
          <div class="grid3">
            <div class="panel">
              <div class="panel-head"><h3>⚠️ 失败错误代码 Failure Code</h3></div>
              <div id="failureCodeBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🚦 失败触发阶段 Failure Stage</h3></div>
              <div id="failureStageBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>⏱️ 解析耗时分布桶 Latency</h3></div>
              <div id="latencyBars" class="bars"></div>
            </div>
          </div>
          <div class="grid3">
            <div class="panel">
              <div class="panel-head"><h3>📥 用户输入方式 Requested Type</h3></div>
              <div id="requestedTypeBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🛣️ 解析链路路径 Provider Path</h3></div>
              <div id="providerBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🎯 业务调用端点 Endpoint</h3></div>
              <div id="endpointBars" class="bars"></div>
            </div>
          </div>
          <div class="grid3">
            <div class="panel">
              <div class="panel-head"><h3>📊 导出歌单规模分布 Playlist Size</h3></div>
              <div id="exportSizeBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>📄 导出文件格式偏好 Export Format</h3></div>
              <div id="exportFormatBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>📋 剪贴板快速复制偏好 Clipboard</h3></div>
              <div id="clipboardModeBars" class="bars"></div>
            </div>
          </div>
        </section>

        <!-- 5. 生态集成与插件接入 (Integrations) -->
        <section class="page ${this.currentPage === 'integrations' ? 'active' : ''}" id="page-integrations">
          <div class="section">
            <div><h2>生态集成与插件接入 Integrations</h2><div class="muted">客户端生态、MusicFree 与 BBPlayer 专区。</div></div>
          </div>
          <div class="grid2">
            <div class="panel">
              <div class="panel-head"><h3>🔌 接入端全貌分布 Resolve Clients</h3><span class="muted" style="font-size:11px">渠道分流</span></div>
              <div id="integrationClients" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🚀 迁移跳转目标平台 Migration Destinations</h3><span class="muted" style="font-size:11px">服务分流</span></div>
              <div id="migrationBars" class="bars"></div>
            </div>
          </div>
          <div class="grid2" style="margin-top:12px">
            <div class="panel" style="border-top:3px solid #8b5cf6">
              <div class="panel-head">
                <h3 style="color:#8b5cf6">🟣 MusicFree · 插件声明版本 Versions</h3>
                <span class="badge" style="background:color-mix(in srgb,#8b5cf6 15%,var(--p));color:#8b5cf6">Plugin: musicfree</span>
              </div>
              <div id="versionBars" class="bars"></div>
            </div>
            <div class="panel" style="border-top:3px solid #8b5cf6">
              <div class="panel-head">
                <h3 style="color:#8b5cf6">📱 MusicFree · 宿主客户端环境 Host Platforms</h3>
                <span class="badge" style="background:color-mix(in srgb,#8b5cf6 15%,var(--p));color:#8b5cf6">Attributed Hosts</span>
              </div>
              <div id="hostBars" class="bars"></div>
            </div>
          </div>
          <div class="grid2" style="margin-top:12px">
            <div class="panel" style="border-top:3px solid #fb7299">
              <div class="panel-head">
                <h3 style="color:#fb7299">🌸 BBPlayer · 客户端声明版本 Versions</h3>
                <span class="badge" style="background:color-mix(in srgb,#fb7299 15%,var(--p));color:#fb7299">Client: bbplayer</span>
              </div>
              <div id="bbplayerVersionBars" class="bars"></div>
            </div>
            <div class="panel" style="border-top:3px solid #fb7299">
              <div class="panel-head">
                <h3 style="color:#fb7299">📱 BBPlayer · 宿主客户端环境 Host Platforms</h3>
                <span class="badge" style="background:color-mix(in srgb,#fb7299 15%,var(--p));color:#fb7299">Attributed Hosts</span>
              </div>
              <div id="bbplayerHostBars" class="bars"></div>
            </div>
          </div>
        </section>

        <!-- 6. 安全风控 (Security) -->
        <section class="page ${this.currentPage === 'security' ? 'active' : ''}" id="page-security">
          <div class="section">
            <div><h2>安全防护与防爬隔离 Security</h2><div class="muted">API 是产品流量；Bot、429、Quarantine 才是安全层 · 速率限流与遥测沙盒隔离。</div></div>
          </div>
          <div class="grid2">
            <div class="panel">
              <div class="panel-head"><h3>🛑 429 限流触发端点 Rate-limit Endpoints</h3><span class="muted" style="font-size:11px">频控拦截</span></div>
              <div id="rateBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🛡️ 异常隔离原因汇总 Quarantine Summary</h3><span class="muted" style="font-size:11px">规则分类</span></div>
              <div id="quarantineSummary" class="bars"></div>
            </div>
          </div>
          <div class="panel" style="margin-top:12px">
            <div class="panel-head">
              <div>
                <h3>🔍 隔离取证记录 Quarantine Forensics</h3>
                <div class="muted" style="font-size:11px">精确展示触发时间、风控处置规则、地理城市、客户端特征与底层报文。</div>
              </div>
              <span class="badge" style="background:var(--l);font-family:var(--mono)" id="quarantineCountBadge">0 条记录</span>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:130px">发生时间 (Time)</th>
                    <th style="width:190px">风控原因与处置结论</th>
                    <th style="width:150px">来源地域与城市 (Geo)</th>
                    <th style="width:140px">客户端特征 (Signature)</th>
                    <th style="width:130px">目标行为与平台</th>
                    <th style="width:90px;text-align:center">拦截频次</th>
                    <th style="width:90px;text-align:right">操作</th>
                  </tr>
                </thead>
                <tbody id="quarantineRows"></tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- 7. 日活 DAU (Daily Active Users) -->
        <section class="page ${this.currentPage === 'dau' ? 'active' : ''}" id="page-dau">
          <div class="section">
            <div><h2>全端日活与触达 DAU</h2><div class="muted">Web 去重访客 + 插件 / CLI 每日去重活跃 · 按 UTC 日期统计（北京时间约等于 UTC+8，清晨计入新一天）。</div></div>
          </div>
          <div id="dauKpis" class="kpis"></div>
          <div class="panel">
            <div class="panel-head">
              <div>
                <h3>📈 全端日活趋势 (DAU Trend)</h3>
                <div class="muted" style="font-size:11px">柱状为分端堆叠（Web / 插件 / CLI），折线为全端合计；最多展示最近 30 个数据日。</div>
              </div>
              <div class="trend-legend">
                <span><span class="legend-dot" style="background:#0284c7"></span>Web</span>
                <span><span class="legend-dot" style="background:#8b5cf6"></span>插件</span>
                <span><span class="legend-dot" style="background:#10b981"></span>CLI</span>
                <span><span class="legend-dot" style="background:#f97316"></span>全端合计</span>
              </div>
            </div>
            <div class="trend-box" id="dauTrendBox">
              <canvas id="dauTrendCanvas"></canvas>
            </div>
          </div>
          <div class="grid2" style="margin-top:12px">
            <div class="panel">
              <div class="panel-head"><h3>🧩 分端接入明细 Clients</h3><span class="muted" style="font-size:11px">插件 / CLI 声明客户端</span></div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>客户端 Client</th>
                      <th style="width:70px">渠道</th>
                      <th style="text-align:right;width:80px">今日</th>
                      <th style="text-align:right;width:80px">昨日</th>
                      <th style="text-align:right;width:96px">窗口累计</th>
                    </tr>
                  </thead>
                  <tbody id="dauClientRows"></tbody>
                </table>
              </div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🕐 当日小时分布 (UTC)</h3><span class="muted" style="font-size:11px">选中单日时展示 · 北京时间 +8h</span></div>
              <div id="dauHourBars" class="bars"></div>
            </div>
          </div>
          <div class="grid2" style="margin-top:12px">
            <div class="panel">
              <div class="panel-head"><h3>🌍 活跃来源国家 Top 10</h3><span class="muted" style="font-size:11px">Country</span></div>
              <div id="dauCountryBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🏙️ 活跃来源地区 Top 10</h3><span class="muted" style="font-size:11px">Region</span></div>
              <div id="dauRegionBars" class="bars"></div>
            </div>
          </div>
          <div class="panel" style="margin-top:12px;border-left:3px solid var(--a)">
            <div class="panel-head"><h3>📐 口径说明 Metric Semantics</h3></div>
            <div class="muted" style="font-size:12px;line-height:1.9">
              <div>• <strong>Web</strong>：每日去重访客（服务端匿名哈希去重，渠道 web）。</div>
              <div>• <strong>插件</strong>：插件被加载即计（新版本：每日一次加载心跳；旧版本：当天首次使用行为由服务端派生计入；升级过渡期两种口径混排）。</div>
              <div>• <strong>CLI</strong>：实际使用即计（解析 / 导出时由服务端派生计入；<code>--no-telemetry</code> 用户不计入）。</div>
              <div>• 去重键：UTC 日期 × 渠道 × 客户端 × 匿名截断哈希；同一人同日在不同渠道可各计一次，跨天不保持身份（不做跨天追踪）。</div>
              <div>• 已知边界：NAT / 共享出口可能低估；移动端冷启动跨 IP 可能轻微高估。插件升级当天已按「去版本号」归一，不会把同一人重复计入。</div>
            </div>
          </div>
        </section>

        <!-- 取证报文模态框 -->
        <div id="forensicModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:99;align-items:center;justify-content:center">
          <div style="background:var(--p);border:1px solid var(--l);border-radius:10px;max-width:640px;width:92%;padding:18px;box-shadow:0 12px 30px rgba(0,0,0,.25);max-height:85vh;display:flex;flex-direction:column">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid var(--l);padding-bottom:8px">
              <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px">
                <span>🛡️</span> 安全风控底层取证报文 (Forensic Details)
              </div>
              <button id="closeForensicModal" class="btn-sm" style="font-size:14px;padding:2px 8px;cursor:pointer">✕</button>
            </div>
            <div id="forensicContent" style="overflow:auto;font-family:var(--mono);font-size:11px;background:var(--bg);padding:12px;border-radius:6px;white-space:pre-wrap;word-break:break-all;line-height:1.5"></div>
          </div>
        </div>

        <div class="footer">PlaylistOut Analytics · 遵循 Tabler 设计语言 · 线上无感秒级切片</div>
      </main>
    `;

    this.bindEvents();
    this.setPreset(this.activePreset);
  }

  private bindEvents(): void {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab');
    tabBtns.forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const page = (btn as HTMLElement).dataset.page || 'overview';
        this.switchPage(page);
      };
    });

    // Feedback tab switching
    const fbBtns = document.querySelectorAll('.fb-tab');
    fbBtns.forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        this.currentFbStatus = (btn as HTMLElement).dataset.fbStatus || 'pending';
        fbBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderFeedbackView();
      };
    });

    // Exclude MY checkbox
    const excludeMySwitch = document.getElementById('switchExcludeMy') as HTMLInputElement;
    if (excludeMySwitch) {
      excludeMySwitch.onchange = () => {
        this.excludeMy = excludeMySwitch.checked;
        const countrySelect = document.getElementById('filterCountry') as HTMLSelectElement;
        if (this.excludeMy && countrySelect?.value === 'MY') {
          countrySelect.value = '';
        }
        this.applyFilters();
      };
    }

    // Presets
    document.querySelectorAll('.range button').forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const r = (btn as HTMLElement).dataset.range || 'all';
        this.setPreset(r);
      };
    });

    // Single Date
    const applySingleDateBtn = document.getElementById('applySingleDateBtn');
    const singleDateInput = document.getElementById('singleDateInput') as HTMLInputElement;
    if (applySingleDateBtn && singleDateInput) {
      applySingleDateBtn.onclick = () => {
        const d = singleDateInput.value;
        if (!d) return;
        this.setDateInputs(d, d);
        this.markPreset('');
        this.applyFilters();
      };
      singleDateInput.onchange = () => {
        const d = singleDateInput.value;
        if (!d) return;
        this.setDateInputs(d, d);
        this.markPreset('');
        this.applyFilters();
      };
    }

    // Date Range
    const applyDateRangeBtn = document.getElementById('applyDateRangeBtn');
    if (applyDateRangeBtn) {
      applyDateRangeBtn.onclick = () => {
        this.markPreset('');
        this.applyFilters();
      };
    }

    // Dropdowns
    ['filterChannel', 'filterClient', 'filterPlatform', 'filterCountry', 'filterRegion'].forEach((id) => {
      const el = document.getElementById(id) as HTMLSelectElement;
      if (el) {
        el.onchange = () => {
          if (id === 'filterCountry') {
            const reg = document.getElementById('filterRegion') as HTMLSelectElement;
            if (reg) reg.value = '';
          }
          this.applyFilters();
        };
      }
    });

    // Reset button
    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        ['filterChannel', 'filterClient', 'filterPlatform', 'filterCountry', 'filterRegion'].forEach((id) => {
          const el = document.getElementById(id) as HTMLSelectElement;
          if (el) el.value = '';
        });
        this.excludeMy = false;
        const sw = document.getElementById('switchExcludeMy') as HTMLInputElement;
        if (sw) sw.checked = false;
        this.setPreset('all');
      };
    }

    // Refresh Cloud Snapshot button
    const refreshBtn = document.getElementById('refreshCloudBtn') as HTMLButtonElement;
    if (refreshBtn) {
      refreshBtn.onclick = async () => {
        if (!this.token || refreshBtn.disabled) return;
        refreshBtn.disabled = true;
        refreshBtn.textContent = '同步中…';
        try {
          this.snapshot = await fetchSnapshot(this.token);
          this.applyFilters();
        } catch (err) {
          alert(`刷新失败：${(err as Error).message}`);
        } finally {
          refreshBtn.disabled = false;
          refreshBtn.textContent = '刷新云端数据';
        }
      };
    }

    // Reload Feedback button
    const reloadFbBtn = document.getElementById('reloadFeedbackBtn');
    if (reloadFbBtn) {
      reloadFbBtn.onclick = () => {
        this.renderFeedbackView();
      };
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        clearAuthToken();
        this.token = null;
        this.snapshot = null;
        this.currentSlice = null;
        this.renderLogin();
      };
    }

    // Forensic Modal
    const modal = document.getElementById('forensicModal');
    const closeBtn = document.getElementById('closeForensicModal');
    if (closeBtn && modal) {
      closeBtn.onclick = () => {
        modal.style.display = 'none';
      };
    }
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
      };
    }

    window.addEventListener('resize', () => {
      if (this.currentPage === 'overview') {
        this.drawCanvasChart();
      } else if (this.currentPage === 'dau') {
        this.drawDauChart();
      }
    });
  }

  private switchPage(page: string): void {
    this.currentPage = page;
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.toggle('active', (tab as HTMLElement).dataset.page === page);
    });
    document.querySelectorAll('.page').forEach((pg) => {
      pg.classList.toggle('active', pg.id === `page-${page}`);
    });

    if (window.scrollY > 150) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }

    if (page === 'overview') {
      requestAnimationFrame(() => this.drawCanvasChart());
    } else if (page === 'feedback') {
      this.renderFeedbackView();
    } else if (page === 'security') {
      this.renderSecurityView();
    } else if (page === 'dau') {
      requestAnimationFrame(() => this.drawDauChart());
    }
  }

  private markPreset(name: string): void {
    this.activePreset = name;
    document.querySelectorAll('.range button').forEach((b) => {
      b.classList.toggle('active', (b as HTMLElement).dataset.range === name);
    });
  }

  private isoDayOffset(offset: number): string {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  private setDateInputs(from: string, to: string): void {
    const f = document.getElementById('fromDateInput') as HTMLInputElement;
    const t = document.getElementById('toDateInput') as HTMLInputElement;
    const s = document.getElementById('singleDateInput') as HTMLInputElement;
    const max = this.isoDayOffset(0);

    if (f) { f.max = max; f.value = from || ''; }
    if (t) { t.max = max; t.value = to || ''; }
    if (s) { s.max = max; s.value = (from && from === to) ? from : ''; }
  }

  private setPreset(name: string): void {
    let to = this.isoDayOffset(0);
    let from = to;
    if (name === 'today') {
      from = to = this.isoDayOffset(0);
    } else if (name === 'yesterday') {
      from = to = this.isoDayOffset(-1);
    } else if (name === 'daybefore') {
      from = to = this.isoDayOffset(-2);
    } else if (name === 'day3') {
      from = to = this.isoDayOffset(-3);
    } else if (name === '7') {
      from = this.isoDayOffset(-6);
    } else if (name === '30') {
      from = this.isoDayOffset(-29);
    } else if (name === 'all') {
      from = '';
      to = '';
    }

    this.setDateInputs(from, to);
    this.markPreset(name);
    this.applyFilters();
  }

  private getFilterParams() {
    const f = (document.getElementById('fromDateInput') as HTMLInputElement)?.value || '';
    const t = (document.getElementById('toDateInput') as HTMLInputElement)?.value || '';
    const channel = (document.getElementById('filterChannel') as HTMLSelectElement)?.value || '';
    const client = (document.getElementById('filterClient') as HTMLSelectElement)?.value || '';
    const platform = (document.getElementById('filterPlatform') as HTMLSelectElement)?.value || '';
    const country = (document.getElementById('filterCountry') as HTMLSelectElement)?.value || '';
    const region = (document.getElementById('filterRegion') as HTMLSelectElement)?.value || '';

    return {
      from: f,
      to: t,
      channel,
      client,
      platform,
      country,
      region,
      exclude_my: this.excludeMy,
    };
  }

  private applyFilters(): void {
    if (!this.snapshot) return;

    const params = this.getFilterParams();
    this.currentSlice = buildAnalyticsSlice(this.snapshot, params);

    // Update updated time string
    const updatedEl = document.getElementById('updatedTime');
    if (updatedEl) {
      const genAt = this.snapshot.generatedAt;
      updatedEl.textContent = genAt
        ? `快照时间: ${new Date(genAt).toLocaleString()}`
        : '快照已载入';
    }

    // Populate dynamic filter options if select is empty
    this.populateSelect('filterClient', this.currentSlice.availableFilters.clients, params.client);
    this.populateSelect('filterCountry', this.currentSlice.availableFilters.countries, params.country);
    this.populateSelect('filterRegion', this.currentSlice.availableFilters.regions, params.region);

    this.renderChips(params);
    this.renderOverviewTab();
    this.renderWebTab();
    this.renderReliabilityTab();
    this.renderIntegrationsTab();
    this.renderDauTab();
    this.renderFeedbackView();
    this.renderSecurityView();

    if (this.currentPage === 'overview') {
      requestAnimationFrame(() => this.drawCanvasChart());
    } else if (this.currentPage === 'dau') {
      requestAnimationFrame(() => this.drawDauChart());
    }
  }

  private populateSelect(id: string, items: CountItem[], currentVal: string): void {
    const el = document.getElementById(id) as HTMLSelectElement;
    if (!el) return;
    const selected = currentVal || el.value;
    const opts = ['<option value="">全部</option>'];
    for (const it of items) {
      const isSel = it.name === selected ? 'selected' : '';
      const label = formatHumanLabel(it.name);
      opts.push(`<option value="${esc(it.name)}" ${isSel}>${esc(label)} (${fmt(it.count)})</option>`);
    }
    el.innerHTML = opts.join('');
  }

  private renderChips(params: Record<string, unknown>): void {
    const chipsDiv = document.getElementById('filterChips');
    if (!chipsDiv || !this.currentSlice) return;

    const items: string[] = [];
    if (params.from && params.to) {
      items.push(`📅 ${params.from} ~ ${params.to}`);
    }
    if (params.channel) items.push(`渠道: ${formatHumanLabel(String(params.channel))}`);
    if (params.client) items.push(`端: ${formatHumanLabel(String(params.client))}`);
    if (params.platform) items.push(`平台: ${formatHumanLabel(String(params.platform))}`);
    if (params.country) items.push(`国家: ${formatHumanLabel(String(params.country))}`);
    if (params.region) items.push(`地区: ${formatHumanLabel(String(params.region))}`);

    chipsDiv.innerHTML = items.map((t) => `<span class="chip">${esc(t)}</span>`).join('');
  }

  private renderBars(targetId: string, items: CountItem[], totalOverride?: number): void {
    const el = document.getElementById(targetId);
    if (!el) return;
    if (!items || items.length === 0) {
      el.innerHTML = '<div style="color:var(--m);padding:8px 0;font-size:12px">暂无匹配数据</div>';
      return;
    }

    const total = totalOverride || items.reduce((acc, it) => acc + it.count, 0) || 1;
    const html = items
      .map((it) => {
        const p = Math.min(100, Math.round((it.count / total) * 1000) / 10);
        const color = getBrandColor(it.name);
        const label = formatHumanLabel(it.name);
        return `
          <div class="bar">
            <div class="bn" title="${esc(label)}">
              <span class="b-dot" style="background:${color}"></span>
              <span>${esc(label)}</span>
            </div>
            <div class="track"><div class="fill" style="width:${p}%;background:${color}"></div></div>
            <div class="num">${fmt(it.count)}<span class="pct">${p}%</span></div>
          </div>
        `;
      })
      .join('');
    el.innerHTML = html;
  }

  private renderOverviewTab(): void {
    if (!this.currentSlice) return;
    const ov = this.currentSlice.overview;
    const dau = this.currentSlice.dau;

    const kpiItems = [
      { label: '解析请求量', val: fmt(ov.resolve_request), sub: 'Resolve Request', color: 'var(--t)' },
      { label: '成功解析', val: fmt(ov.playlist_success + ov.user_success), sub: 'Success Rate', color: 'var(--g)' },
      { label: '终端成功率', val: pct(ov.success_rate), sub: `${fmt(ov.resolve_failure)} 失败`, color: ov.success_rate >= 80 ? 'var(--g)' : 'var(--w)' },
      { label: '导出 / 复制', val: fmt(ov.export + ov.clipboard), sub: `${fmt(ov.export)} 导出 · ${fmt(ov.clipboard)} 剪贴`, color: 'var(--a)' },
      { label: '今日活跃', val: fmt(dau.today.total), sub: `Web ${fmt(dau.today.web)} · 插件 ${fmt(dau.today.plugin)} · CLI ${fmt(dau.today.cli)}`, color: 'var(--a)' },
      { label: '活跃接入端', val: fmt(ov.active_clients), sub: 'Active Clients', color: 'var(--t)' },
      { label: '待审歌单', val: fmt(ov.pending_feedback), sub: 'Pending Review', color: ov.pending_feedback > 0 ? 'var(--w)' : 'var(--g)' },
    ];

    const kpiEl = document.getElementById('overviewKpis');
    if (kpiEl) {
      kpiEl.innerHTML = kpiItems
        .map(
          (k) => `
          <div class="card kpi-card">
            <div class="kpi-label">${esc(k.label)}</div>
            <div class="kpi-val" style="color:${k.color}">${esc(k.val)}</div>
            <div class="kpi-sub">${esc(k.sub)}</div>
          </div>
        `,
        )
        .join('');
    }

    // Pending feedback nav badge
    const navBadge = document.getElementById('navPendingBadge');
    if (navBadge) {
      if (ov.pending_feedback > 0) {
        navBadge.style.display = 'inline-block';
        navBadge.textContent = String(ov.pending_feedback);
      } else {
        navBadge.style.display = 'none';
      }
    }

    // Bars
    this.renderBars('platformBars', this.currentSlice.distributions.platforms);
    this.renderBars('countryBars', this.currentSlice.geo.countries.slice(0, 10));
    this.renderBars('regionBars', this.currentSlice.geo.regions.slice(0, 10));
    this.renderBars('clientBars', this.currentSlice.distributions.clients);

    // Data Quality
    const dq = this.currentSlice.dataQuality;
    const qEl = document.getElementById('qualityChecks');
    if (qEl) {
      qEl.innerHTML = dq.checks
        .map(
          (c) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--l);font-size:12px">
            <div>
              <span style="font-weight:600;font-family:var(--mono)">${esc(c.id)}</span>
              <div class="muted" style="font-size:11px">${esc(c.note)}</div>
            </div>
            <span class="badge ${c.ok ? 'resolved' : 'pending'}" style="font-size:11px">${c.ok ? '✔ PASSED' : '✖ MISMATCH'}</span>
          </div>
        `,
        )
        .join('');
    }
  }

  private drawCanvasChart(): void {
    if (!this.currentSlice) return;
    const canvas = document.getElementById('trendCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    const data =
      this.currentSlice.hourlyTimeseries.length > 0
        ? this.currentSlice.hourlyTimeseries
        : this.currentSlice.timeseries;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    if (data.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('当前时间范围无趋势数据', w / 2, h / 2);
      return;
    }

    const padLeft = 40;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;

    let maxVal = 1;
    for (const d of data) {
      const ok = Number(d.playlist_success || 0) + Number(d.user_success || 0);
      const fail = Number(d.resolve_failure || 0);
      const tot = ok + fail;
      if (tot > maxVal) maxVal = tot;
    }
    maxVal = Math.ceil(maxVal * 1.15);

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (plotH / 4) * i;
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      const labelVal = Math.round(maxVal * (1 - i / 4));
      ctx.fillText(String(labelVal), padLeft - 6, y + 3);
    }
    ctx.stroke();

    const getX = (i: number) => {
      if (data.length <= 1) return padLeft + plotW / 2;
      return padLeft + (plotW / (data.length - 1)) * i;
    };
    const getY = (val: number) => padTop + plotH - (val / maxVal) * plotH;

    // Draw Success Line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    data.forEach((d, i) => {
      const ok = Number(d.playlist_success || 0) + Number(d.user_success || 0);
      const x = getX(i);
      const y = getY(ok);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Failure Line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    data.forEach((d, i) => {
      const fail = Number(d.resolve_failure || 0);
      const x = getX(i);
      const y = getY(fail);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw X-axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    const step = Math.ceil(data.length / 8);
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        const x = getX(i);
        const label = d.hour !== undefined ? `${d.hour}:00` : String(d.date || '').slice(5);
        ctx.fillText(label, x, h - 8);
      }
    });
  }

  private renderWebTab(): void {
    if (!this.currentSlice) return;
    const b = this.currentSlice.breakdowns;
    const env = this.currentSlice.environment;

    this.renderBars('referrerBars', b['referrer_source'] || []);
    this.renderBars('browserBars', env.browsers);
    this.renderBars('deviceBars', env.devices);
    this.renderBars('osBars', env.operatingSystems);
    this.renderBars('webCountryBars', this.currentSlice.geo.countries.slice(0, 15));
    this.renderBars('webRegionBars', this.currentSlice.geo.regions.slice(0, 15));
  }

  private renderReliabilityTab(): void {
    if (!this.currentSlice) return;
    const b = this.currentSlice.breakdowns;

    this.renderBars('failureCodeBars', b['failure_code'] || []);
    this.renderBars('failureStageBars', b['failure_stage'] || []);
    this.renderBars('latencyBars', b['latency_bucket'] || []);
    this.renderBars('requestedTypeBars', b['requested_type'] || []);
    this.renderBars('providerBars', b['provider_failure_path'] || []);
    this.renderBars('endpointBars', b['endpoint'] || []);
    this.renderBars('exportSizeBars', b['export_playlist_size'] || []);
    this.renderBars('exportFormatBars', b['export_format'] || []);
    this.renderBars('clipboardModeBars', b['clipboard_mode'] || []);
  }

  private renderIntegrationsTab(): void {
    if (!this.currentSlice) return;
    const b = this.currentSlice.breakdowns;

    this.renderBars('integrationClients', this.currentSlice.distributions.clients);
    this.renderBars('migrationBars', b['migration_destination'] || []);
    this.renderBars('versionBars', b['musicfree_version'] || b['client_version'] || []);
    this.renderBars('hostBars', b['musicfree_host'] || b['host_platform'] || []);
    this.renderBars('bbplayerVersionBars', b['bbplayer_version'] || []);
    this.renderBars('bbplayerHostBars', b['bbplayer_host'] || []);
  }

  private renderDauTab(): void {
    if (!this.currentSlice) return;
    const dau = this.currentSlice.dau;

    const delta = (today: number, yesterday: number): string => {
      if (yesterday <= 0) return today > 0 ? '昨日无数据' : '较昨日持平';
      const d = Math.round(((today - yesterday) / yesterday) * 1000) / 10;
      return `较昨日 ${d >= 0 ? '+' : ''}${d.toFixed(1)}%`;
    };

    const recent = dau.series.slice(-30);
    const peak = recent.reduce((acc, p) => Math.max(acc, p.total), 0);

    const kpiItems = [
      {
        label: '今日全端活跃',
        val: fmt(dau.today.total),
        sub: `昨日 ${fmt(dau.yesterday.total)} · ${delta(dau.today.total, dau.yesterday.total)}`,
        color: 'var(--t)',
      },
      { label: '今日 Web 访客', val: fmt(dau.today.web), sub: delta(dau.today.web, dau.yesterday.web), color: '#0284c7' },
      { label: '今日插件活跃', val: fmt(dau.today.plugin), sub: delta(dau.today.plugin, dau.yesterday.plugin), color: '#8b5cf6' },
      { label: '今日 CLI 活跃', val: fmt(dau.today.cli), sub: delta(dau.today.cli, dau.yesterday.cli), color: 'var(--g)' },
      { label: '窗口内客户端', val: fmt(dau.clients.length), sub: 'Distinct Active Clients', color: 'var(--a)' },
      { label: '近 30 天峰值', val: fmt(peak), sub: '30-day Peak', color: 'var(--w)' },
    ];

    const kpiEl = document.getElementById('dauKpis');
    if (kpiEl) {
      kpiEl.innerHTML = kpiItems
        .map(
          (k) => `
          <div class="card kpi-card">
            <div class="kpi-label">${esc(k.label)}</div>
            <div class="kpi-val" style="color:${k.color}">${esc(k.val)}</div>
            <div class="kpi-sub">${esc(k.sub)}</div>
          </div>
        `,
        )
        .join('');
    }

    const tbody = document.getElementById('dauClientRows');
    if (tbody) {
      if (dau.clients.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="5" style="text-align:center;padding:18px;color:var(--m)">当前筛选无插件 / CLI 活跃记录（等待心跳与使用遥测上报）</td></tr>';
      } else {
        tbody.innerHTML = dau.clients
          .map(
            (c) => `
          <tr>
            <td>
              <span style="font-weight:600;color:${getBrandColor(c.client)}">${esc(formatHumanLabel(c.client))}</span>
              <div class="muted" style="font-size:11px;font-family:var(--mono)">${esc(c.client)}</div>
            </td>
            <td><span class="badge" style="background:var(--l)">${c.channel === 'plugin' ? '插件' : 'CLI'}</span></td>
            <td style="text-align:right;font-family:var(--mono);font-weight:700">${fmt(c.today)}</td>
            <td style="text-align:right;font-family:var(--mono)">${fmt(c.yesterday)}</td>
            <td style="text-align:right;font-family:var(--mono)">${fmt(c.total)}</td>
          </tr>
        `,
          )
          .join('');
      }
    }

    this.renderBars('dauCountryBars', dau.countries);
    this.renderBars('dauRegionBars', dau.regions);
    this.renderDauHourBars();
  }

  private renderDauHourBars(): void {
    const el = document.getElementById('dauHourBars');
    if (!el || !this.currentSlice) return;
    const hours = this.currentSlice.dau.hours;
    if (hours.length === 0) {
      el.innerHTML = '<div style="color:var(--m);padding:8px 0;font-size:12px">筛选「单日」时展示该日的小时分布</div>';
      return;
    }
    const max = Math.max(...hours.map((h) => h.total), 1);
    el.innerHTML = hours
      .map((h) => {
        const p = Math.min(100, Math.round((h.total / max) * 1000) / 10);
        return `
          <div class="bar">
            <div class="bn"><span>${String(h.hour).padStart(2, '0')}:00</span></div>
            <div class="track"><div class="fill" style="width:${p}%;background:var(--a)"></div></div>
            <div class="num">${fmt(h.total)}</div>
          </div>
        `;
      })
      .join('');
  }

  private drawDauChart(): void {
    if (!this.currentSlice) return;
    const canvas = document.getElementById('dauTrendCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = this.currentSlice.dau.series.slice(-30);

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    if (data.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('当前筛选无日活数据', w / 2, h / 2);
      return;
    }

    const padLeft = 40;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;

    let maxVal = 1;
    for (const d of data) {
      if (d.total > maxVal) maxVal = d.total;
    }
    maxVal = Math.ceil(maxVal * 1.15);

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Grid + Y-axis labels
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (plotH / 4) * i;
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(maxVal * (1 - i / 4))), padLeft - 6, y + 3);
    }
    ctx.stroke();

    const stepX = plotW / data.length;
    const barW = Math.max(3, Math.min(22, stepX * 0.62));
    const stackOrder: Array<{ key: 'cli' | 'plugin' | 'web'; color: string }> = [
      { key: 'cli', color: '#10b981' },
      { key: 'plugin', color: '#8b5cf6' },
      { key: 'web', color: '#0284c7' },
    ];

    // Stacked channel bars
    const totalPoints: Array<{ x: number; y: number }> = [];
    data.forEach((d, i) => {
      const cx = padLeft + stepX * i + stepX / 2;
      const x0 = cx - barW / 2;
      let yBase = padTop + plotH;
      for (const seg of stackOrder) {
        const val = Number(d[seg.key] || 0);
        if (val <= 0) continue;
        const segH = (val / maxVal) * plotH;
        ctx.fillStyle = seg.color;
        ctx.fillRect(x0, yBase - segH, barW, segH);
        yBase -= segH;
      }
      totalPoints.push({ x: cx, y: padTop + plotH - (Number(d.total || 0) / maxVal) * plotH });
    });

    // Total DAU line
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    totalPoints.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    ctx.fillStyle = '#f97316';
    for (const pt of totalPoints) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // X-axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    const step = Math.ceil(data.length / 8);
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        ctx.fillText(String(d.date || '').slice(5), padLeft + stepX * i + stepX / 2, h - 8);
      }
    });
  }

  private renderFeedbackView(): void {
    if (!this.snapshot) return;
    const params = this.getFilterParams();
    const fbSlice = buildFeedbackSlice(this.snapshot, {
      ...params,
      status: this.currentFbStatus,
    });

    const pendingCountEl = document.getElementById('fbCountPending');
    const allCountEl = document.getElementById('fbCountAll');
    const resolvedCountEl = document.getElementById('fbCountResolved');
    const ignoredCountEl = document.getElementById('fbCountIgnored');

    if (pendingCountEl) pendingCountEl.textContent = String(fbSlice.counts.pending);
    if (allCountEl) allCountEl.textContent = String(fbSlice.counts.all);
    if (resolvedCountEl) resolvedCountEl.textContent = String(fbSlice.counts.resolved);
    if (ignoredCountEl) ignoredCountEl.textContent = String(fbSlice.counts.ignored);

    const tbody = document.getElementById('feedbackRows');
    if (!tbody) return;

    if (fbSlice.entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--m)">当前分类无反馈记录</td></tr>';
      return;
    }

    tbody.innerHTML = fbSlice.entries
      .map((x: FeedbackRow) => {
        let stCls = 'pending';
        let stTxt = '待处理';
        if (x.status === 'resolved') {
          stCls = 'resolved';
          stTxt = '已修复';
        } else if (x.status === 'ignored') {
          stCls = 'ignored';
          stTxt = '已忽略';
        }

        const geoParts: string[] = [];
        if (x.country && x.country !== 'UNKNOWN') geoParts.push(formatHumanLabel(x.country));
        if (x.region && x.region !== 'UNKNOWN') geoParts.push(formatHumanLabel(x.region));
        if (x.city && x.city !== 'UNKNOWN') geoParts.push(esc(x.city));
        const geoStr = geoParts.length ? geoParts.join(' · ') : '—';

        let actions = '';
        if (x.status === 'pending') {
          actions = `
            <button class="btn-sm ok status-btn" data-id="${x.id}" data-status="resolved">标记已修复</button>
            <button class="btn-sm status-btn" data-id="${x.id}" data-status="ignored" style="margin-left:4px">忽略</button>
          `;
        } else if (x.status === 'resolved') {
          actions = `<button class="btn-sm status-btn" data-id="${x.id}" data-status="pending">重置为待处理</button>`;
        } else {
          actions = `
            <button class="btn-sm ok status-btn" data-id="${x.id}" data-status="resolved">标记已修复</button>
            <button class="btn-sm status-btn" data-id="${x.id}" data-status="pending" style="margin-left:4px">重置</button>
          `;
        }

        return `
          <tr>
            <td style="font-family:var(--mono)">#${esc(x.id)}</td>
            <td><span style="font-weight:600;color:${getBrandColor(x.platform)}">${esc(formatHumanLabel(x.platform || 'unknown'))}</span></td>
            <td>
              <div style="display:flex;align-items:center;gap:6px">
                <a href="${esc(x.source_url)}" target="_blank" rel="noopener noreferrer" class="url-cell" title="${esc(x.source_url)}">${esc(x.source_url)}</a>
                <button class="btn-sm cp-btn" data-url="${esc(x.source_url)}" style="font-size:10px;padding:1px 5px">复制</button>
              </div>
            </td>
            <td><span class="badge" style="background:var(--l);font-family:var(--mono)">${esc(x.error_code || '—')}</span></td>
            <td style="font-size:11px;color:var(--m)"><span title="${esc(geoStr)}">${esc(geoStr)}</span></td>
            <td style="text-align:center;font-weight:700;font-family:var(--mono)">${fmt(x.report_count)}</td>
            <td class="muted" style="font-size:11px">${esc(String(x.last_reported_at || x.first_reported_at || '').replace('T', ' ').slice(0, 19))}</td>
            <td><span class="badge ${stCls}">${stTxt}</span></td>
            <td style="text-align:right;white-space:nowrap">${actions}</td>
          </tr>
        `;
      })
      .join('');

    // Bind Feedback Status Update Actions
    tbody.querySelectorAll('.status-btn').forEach((btn) => {
      (btn as HTMLButtonElement).onclick = async () => {
        const id = Number((btn as HTMLElement).dataset.id);
        const status = (btn as HTMLElement).dataset.status || 'pending';
        if (!this.token) return;

        (btn as HTMLButtonElement).disabled = true;
        const origText = btn.textContent;
        btn.textContent = '同步中…';

        try {
          await updateFeedbackStatus(this.token, id, status);
          // Update in local memory snapshot
          if (this.snapshot?.feedback) {
            const target = this.snapshot.feedback.find((r) => r.id === id);
            if (target) {
              target.status = status as 'pending' | 'resolved' | 'ignored';
              if (status !== 'resolved') target.resolved_at = null;
            }
          }
          this.renderFeedbackView();
        } catch (err) {
          btn.textContent = origText;
          (btn as HTMLButtonElement).disabled = false;
          alert(`更新失败：${(err as Error).message}`);
        }
      };
    });

    // Copy URL
    tbody.querySelectorAll('.cp-btn').forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const url = (btn as HTMLElement).dataset.url || '';
        navigator.clipboard.writeText(url).then(() => {
          const o = btn.textContent;
          btn.textContent = '已复制';
          setTimeout(() => { btn.textContent = o; }, 1200);
        });
      };
    });
  }

  private renderSecurityView(): void {
    if (!this.snapshot || !this.currentSlice) return;
    const b = this.currentSlice.breakdowns;

    this.renderBars('rateBars', b['rate_limit_endpoint'] || []);

    const params = this.getFilterParams();
    const qSlice = buildQuarantineSlice(this.snapshot, params);

    const badge = document.getElementById('quarantineCountBadge');
    if (badge) badge.textContent = `${fmt(qSlice.totalRecords)} 条记录 · ${fmt(qSlice.totalEvents)} 次拦截`;

    // Summary bars by reason
    const reasonsMap = new Map<string, number>();
    for (const r of qSlice.quarantine) {
      reasonsMap.set(r.reason, (reasonsMap.get(r.reason) || 0) + Number(r.count || 0));
    }
    const reasonItems = Array.from(reasonsMap.entries()).map(([name, count]) => ({ name, count }));
    this.renderBars('quarantineSummary', reasonItems);

    const tbody = document.getElementById('quarantineRows');
    if (!tbody) return;

    if (qSlice.quarantine.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--m)">当前筛选范围内无拦截记录</td></tr>';
      return;
    }

    tbody.innerHTML = qSlice.quarantine
      .map((row: QuarantineRow) => {
        const geoParts: string[] = [];
        if (row.country && row.country !== 'UNKNOWN') geoParts.push(formatHumanLabel(row.country));
        if (row.region && row.region !== 'UNKNOWN') geoParts.push(formatHumanLabel(row.region));
        if (row.city && row.city !== 'UNKNOWN') geoParts.push(esc(row.city));
        const geoStr = geoParts.length ? geoParts.join(' · ') : '—';

        return `
          <tr>
            <td style="font-family:var(--mono);font-size:11px">${esc(row.incident_date)}</td>
            <td><span class="badge" style="background:color-mix(in srgb,var(--r) 15%,var(--p));color:var(--r)">${esc(row.reason)}</span></td>
            <td style="font-size:11px;color:var(--m)">${esc(geoStr)}</td>
            <td style="font-family:var(--mono);font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis" title="${esc(row.user_agent || '')}">${esc(row.user_agent || '—')}</td>
            <td><span style="font-weight:600;color:${getBrandColor(row.platform || '')}">${esc(row.platform || row.endpoint || '—')}</span></td>
            <td style="text-align:center;font-weight:700;font-family:var(--mono)">${fmt(row.count)}</td>
            <td style="text-align:right">
              <button class="btn-sm view-forensic-btn" data-id="${row.id}">查看报文</button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('.view-forensic-btn').forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const id = Number((btn as HTMLElement).dataset.id);
        const target = qSlice.quarantine.find((r) => r.id === id);
        if (target) {
          this.openForensicModal(target);
        }
      };
    });
  }

  private openForensicModal(row: QuarantineRow): void {
    const modal = document.getElementById('forensicModal');
    const content = document.getElementById('forensicContent');
    if (!modal || !content) return;

    let details = row.forensic_details;
    if (details) {
      try {
        const parsed = JSON.parse(details);
        details = JSON.stringify(parsed, null, 2);
      } catch {
        // Keep raw text
      }
    } else {
      details = JSON.stringify(row, null, 2);
    }

    content.textContent = details;
    modal.style.display = 'flex';
  }
}

// Boot Dashboard on DOM Ready
if (typeof document !== 'undefined') {
  const root = document.getElementById('app') || document.body;
  const app = new DashboardApp(root);
  app.start().catch((err) => {
    console.error('Fatal Dashboard Error:', err);
  });
}
