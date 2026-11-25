/**
 * HERO VARIANTS · 首屏饱满度设计 Demo（仅 Layout A / 默认风格）
 *
 * 通过 `?hero=1..5` 切换；`?hero=0` 或不带参数 = 原版首屏。
 * 开发环境（或 URL 显式带 hero 参数时）右下角会出现浮动切换器。
 * 这是设计评审用 demo，选定方案后应删除未采用的变体与切换器。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '../../i18n';
import { fetchStats, type StatsResponse } from '../../api/client';
import { calculateRunningDays } from '../../utils/uptime';
import { AnimatedCounter } from '../stats/AnimatedCounter';

export type HeroVariantId = 0 | 1 | 2 | 3 | 4 | 5;

export const HERO_VARIANTS: { id: HeroVariantId; name: string; desc: string }[] = [
  { id: 0, name: '原版', desc: '当前线上首屏' },
  { id: 1, name: '两侧便签', desc: '左「火热数据」右「能导出什么」' },
  { id: 2, name: '分屏手账', desc: '左文案卖点 + 右搜索卡' },
  { id: 3, name: '成品预览', desc: '两侧展示解析结果与导出文件' },
  { id: 4, name: '唱片舞台', desc: '唱片机 + 平台唱片架 + 跑马灯' },
  { id: 5, name: '贴纸数据墙', desc: '平台贴纸环绕 + 实时数据条' },
];

const STORAGE_KEY = 'playlistout-hero-variant';

function parseVariant(raw: string | null | undefined): HeroVariantId | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 5 ? (n as HeroVariantId) : null;
}

function readInitialVariant(): { variant: HeroVariantId; explicit: boolean } {
  if (typeof window === 'undefined') return { variant: 1, explicit: false };
  try {
    const fromQuery = parseVariant(new URLSearchParams(window.location.search).get('hero'));
    if (fromQuery !== null) return { variant: fromQuery, explicit: true };
  } catch {
    /* ignore */
  }
  if (import.meta.env.DEV) {
    try {
      const stored = parseVariant(window.localStorage?.getItem(STORAGE_KEY));
      if (stored !== null) return { variant: stored, explicit: false };
    } catch {
      /* ignore */
    }
  }
  return { variant: 1, explicit: false };
}

/* ---------------------------------------------------------------- shared data */

const PLATFORM_STICKERS = [
  { name: 'QQ 音乐', tone: 'mint' },
  { name: '网易云音乐', tone: 'pink' },
  { name: '酷狗音乐', tone: 'sky' },
  { name: '酷我音乐', tone: 'lemon' },
  { name: '汽水音乐', tone: 'lime' },
  { name: '咪咕音乐', tone: 'pink' },
  { name: 'Spotify', tone: 'mint' },
  { name: 'Apple Music', tone: 'taro' },
] as const;

const EXPORT_FORMATS = [
  { ext: 'XLSX', tone: 'mint', hint: '表格' },
  { ext: 'CSV', tone: 'lemon', hint: '通用' },
  { ext: 'JSON', tone: 'sky', hint: '数据' },
  { ext: 'TXT', tone: 'pink', hint: '纯文本' },
  { ext: 'M3U8', tone: 'taro', hint: '播放列表' },
  { ext: 'MD', tone: 'lime', hint: '笔记' },
] as const;

const PLAYER_TARGETS = ['MusicFree', '洛雪音乐', 'Listen1'];

const SAMPLE_ROWS = [
  { title: '晚风拾遗', artist: '示例歌手 A', dur: '3:42' },
  { title: '海边的第七封信', artist: '示例乐队 B', dur: '4:15' },
  { title: '雨停之前', artist: '示例歌手 C', dur: '3:58' },
  { title: '夏夜便利店', artist: '示例歌手 D', dur: '2:51' },
];

function useHeroStats(enabled: boolean) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchStats().then((res) => {
      if (alive && res.success && res.data) setStats(res.data);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return stats;
}

/* ---------------------------------------------------------------- doodles */

const VinylDoodle: React.FC<{ size?: number; labelColor?: string; className?: string }> = ({
  size = 72,
  labelColor = '#cdefe3',
  className = '',
}) => (
  <svg className={`hv-vinyl ${className}`} width={size} height={size} viewBox="0 0 76 76" fill="none" aria-hidden="true">
    <g className="hv-spin">
      <circle cx="38" cy="38" r="34" fill="#5f4b44" stroke="#a8887c" strokeWidth="2" />
      <circle cx="38" cy="38" r="26" stroke="#8a6f64" strokeWidth="1.2" strokeDasharray="6 4" />
      <circle cx="38" cy="38" r="19" stroke="#7b6258" strokeWidth="1" strokeDasharray="3 5" opacity="0.8" />
      <circle cx="38" cy="38" r="13" fill={labelColor} stroke="#fffdf8" strokeWidth="1.6" />
      <circle cx="38" cy="38" r="3" fill="#fffdf8" />
      <path d="M16 22C21 16 27 13 34 12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.32" />
    </g>
  </svg>
);

const CassetteDoodle: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} width="92" height="62" viewBox="0 0 96 64" fill="none" aria-hidden="true">
    <rect x="4" y="6" width="88" height="52" rx="12" fill="#ffd9e4" stroke="#c87b92" strokeWidth="2" />
    <rect x="14" y="14" width="68" height="24" rx="6" fill="#fffdf9" stroke="#ddb0bd" strokeWidth="1.6" />
    <g className="hv-spin">
      <circle cx="33" cy="26" r="6.5" fill="#fff2c2" stroke="#c09154" strokeWidth="1.6" />
    </g>
    <g className="hv-spin">
      <circle cx="63" cy="26" r="6.5" fill="#cdefe3" stroke="#5aa98c" strokeWidth="1.6" />
    </g>
    <line x1="40" y1="26" x2="56" y2="26" stroke="#c89a8e" strokeWidth="1.6" strokeDasharray="3 2.5" />
    <path d="M24 58L29 45H67L72 58" fill="#ffeef3" stroke="#c87b92" strokeWidth="1.6" />
  </svg>
);

const SparkleDoodle: React.FC<{ className?: string; color?: string; size?: number }> = ({
  className = '',
  color = '#ffd466',
  size = 22,
}) => (
  <svg className={`hv-sparkle ${className}`} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8Z" fill={color} />
  </svg>
);

const CurvyArrow: React.FC<{ className?: string; flip?: boolean }> = ({ className = '', flip }) => (
  <svg
    className={`hv-curvy-arrow ${className}`}
    width="86"
    height="46"
    viewBox="0 0 86 46"
    fill="none"
    style={flip ? { transform: 'scaleX(-1)' } : undefined}
    aria-hidden="true"
  >
    <path d="M4 10C22 40 52 44 76 22" stroke="#d98aa3" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="5 5" />
    <path d="M68 16L78 21L72 31" stroke="#d98aa3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TurntableDoodle: React.FC = () => (
  <svg className="hv-turntable" width="250" height="196" viewBox="0 0 250 196" fill="none" aria-hidden="true">
    <rect x="10" y="20" width="230" height="166" rx="26" fill="#ffe3ec" stroke="#fff" strokeWidth="6" />
    <rect x="10" y="20" width="230" height="166" stroke="#d88ea4" strokeWidth="2" />
    <rect x="22" y="32" width="206" height="142" rx="18" fill="#fff8f1" stroke="#ecc6cf" strokeWidth="1.5" strokeDasharray="5 4" />
    <g className="hv-spin-slow" style={{ transformOrigin: '100px 103px' }}>
      <circle cx="100" cy="103" r="62" fill="#5f4b44" stroke="#a8887c" strokeWidth="2" />
      <circle cx="100" cy="103" r="50" stroke="#8a6f64" strokeWidth="1.3" strokeDasharray="8 5" />
      <circle cx="100" cy="103" r="38" stroke="#7b6258" strokeWidth="1" strokeDasharray="3 6" />
      <circle cx="100" cy="103" r="22" fill="#ffd6e0" stroke="#fffdf8" strokeWidth="2" />
      <path d="M90 99h20M93 106h14" stroke="#c25478" strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="103" r="3.5" fill="#fffdf8" />
      <path d="M58 70C66 60 78 53 92 51" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
    </g>
    {/* tonearm */}
    <circle cx="202" cy="56" r="12" fill="#fff2c2" stroke="#c09154" strokeWidth="2" />
    <circle cx="202" cy="56" r="4" fill="#c09154" />
    <g className="hv-tonearm">
      <path d="M202 56L196 120L160 140" stroke="#b9a08f" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="150" y="134" width="18" height="12" rx="3" transform="rotate(-28 159 140)" fill="#cdefe3" stroke="#5aa98c" strokeWidth="1.6" />
    </g>
    {/* knobs */}
    <circle cx="196" cy="160" r="7" fill="#cdefe3" stroke="#5aa98c" strokeWidth="1.6" />
    <circle cx="218" cy="160" r="7" fill="#e4d6ff" stroke="#967ed6" strokeWidth="1.6" />
    {/* floating notes */}
    <g className="hv-float-note">
      <path d="M30 20V0L46 -4V16" stroke="#e4789c" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="27" cy="20" r="4.5" fill="#ffd4e2" stroke="#e4789c" strokeWidth="1.8" />
      <circle cx="43" cy="16" r="4.5" fill="#cdefe3" stroke="#5eb494" strokeWidth="1.8" />
    </g>
  </svg>
);

/* ---------------------------------------------------------------- custom title (for split layouts) */

const SplitTitle: React.FC = () => {
  const { t } = useTranslation();
  return (
    <h2 className="font-marker journal-hero-title hv-split-title">
      {t.hero.titlePrefix}
      <br />
      <span className="scribble-line">{t.hero.titleHighlight}</span>
    </h2>
  );
};

/* ================================================================ Variant 1 · 两侧便签 */

const Variant1: React.FC<{ hero: React.ReactNode; search: React.ReactNode }> = ({ hero, search }) => {
  const stats = useHeroStats(true);
  const days = calculateRunningDays(stats?.launchedAt);

  return (
    <div className="hv-root hv-v1">
      <aside className="hv-v1-side is-left" aria-label="实时热门数据">
        <div className="hv-card hv-card-lemon hv-tilt-l">
          <span className="hv-pill is-lemon font-marker">POPULAR · 大家都在用</span>

          <div className="hv-v1-stat-hero">
            <div className="hv-v1-stat-hero-top">
              <span className="hv-v1-stat-hero-num font-marker">
                {stats ? <AnimatedCounter value={stats.totalPlaylistsParsed} /> : '—'}
              </span>
              <span className="hv-v1-stat-hero-unit font-handwriting">张</span>
            </div>
            <div className="hv-v1-stat-hero-sub font-note">🔥 累计已解析公开歌单</div>
          </div>

          <div className="hv-v1-stat-grid">
            <div className="hv-v1-stat-chip is-pink">
              <b className="font-note">{stats ? <AnimatedCounter value={stats.totalTracksProcessed} /> : '—'}</b>
              <small>已收录歌曲</small>
            </div>
            <div className="hv-v1-stat-chip is-mint">
              <b className="font-note">{stats ? <AnimatedCounter value={stats.totalExports} /> : '—'}</b>
              <small>已带走文件</small>
            </div>
            <div className="hv-v1-stat-chip is-sky">
              <b className="font-note">{stats ? <AnimatedCounter value={stats.cumulativeDailyVisitors ?? stats.totalVisitors} /> : '—'}</b>
              <small>累计使用人次</small>
            </div>
            <div className="hv-v1-stat-chip is-taro">
              <b className="font-note">{days ? `${days}天` : '—'}</b>
              <small>持续稳定服务</small>
            </div>
          </div>

          <div className="hv-divider" />
          <p className="hv-small-label font-note">今日实时动态 ↓</p>
          <div className="hv-player-row">
            <span className="hv-v1-live-badge">
              <span className="hv-v1-live-dot" aria-hidden="true" />
              今日已解析 {stats ? <AnimatedCounter value={stats.playlistsParsedToday} /> : '...'} 张
            </span>
            <span className="hv-player-chip">零排队</span>
            <span className="hv-player-chip">秒级生成</span>
          </div>
          <CassetteDoodle className="hv-v1-cassette" />
        </div>
        <span className="hv-mini-tag is-pink hv-v1-tag-a font-note">♡ 每一份歌单都被温柔备份</span>
      </aside>

      <div className="hv-center">
        {hero}
        {search}
      </div>

      <aside className="hv-v1-side is-right" aria-label="导出格式">
        <div className="hv-card hv-card-mint hv-tilt-r">
          <span className="hv-pill is-mint font-marker">EXPORT · 能带走什么</span>
          <div className="hv-format-grid">
            {EXPORT_FORMATS.map((f) => (
              <span key={f.ext} className={`hv-file-chip is-${f.tone}`}>
                <b className="font-mono">.{f.ext.toLowerCase()}</b>
                <small>{f.hint}</small>
              </span>
            ))}
          </div>
          <div className="hv-divider" />
          <p className="hv-small-label font-note">还能直接导进 ↓</p>
          <div className="hv-player-row">
            {PLAYER_TARGETS.map((p) => (
              <span key={p} className="hv-player-chip">
                {p}
              </span>
            ))}
          </div>
          <VinylDoodle size={58} className="hv-v1-vinyl" />
        </div>
        <span className="hv-mini-tag is-sky hv-v1-tag-b font-note">✦ 文件在本地生成</span>
      </aside>

      <SparkleDoodle className="hv-v1-spark-1" color="#ffb4c9" />
      <SparkleDoodle className="hv-v1-spark-2" color="#9fdcc4" size={16} />
    </div>
  );
};

/* ================================================================ Variant 2 · 分屏手账 */

const Variant2: React.FC<{ search: React.ReactNode }> = ({ search }) => {
  const { t } = useTranslation();
  const stats = useHeroStats(true);
  return (
    <div className="hv-root hv-v2">
      <div className="hv-v2-left">
        <span className="hv-v2-kicker font-note">♪ {t.hero.noLoginDoodle}</span>
        <SplitTitle />
        <p className="hv-v2-sub">{t.hero.subtitle}</p>

        <ul className="hv-v2-checks">
          <li>
            <span className="hv-check is-pink">✓</span>
            <span>
              <b>粘贴即解析</b> · 公开歌单链接、QQ 号或主页链接都行
            </span>
          </li>
          <li>
            <span className="hv-check is-mint">✓</span>
            <span>
              <b>导出留在本地</b> · 文件由你的浏览器生成
            </span>
          </li>
          <li>
            <span className="hv-check is-lemon">✓</span>
            <span>
              <b>继续听下去</b> · 可导入 MusicFree、洛雪音乐等开源播放器
            </span>
          </li>
        </ul>

        <div className="hv-v2-stats">
          <div>
            <b className="font-note">{stats ? <AnimatedCounter value={stats.totalPlaylistsParsed} /> : '—'}</b>
            <small>张歌单被解析</small>
          </div>
          <span className="hv-v2-stats-sep" />
          <div>
            <b className="font-note">{stats ? <AnimatedCounter value={stats.totalTracksProcessed} /> : '—'}</b>
            <small>首歌被记下</small>
          </div>
          <span className="hv-v2-stats-sep" />
          <div>
            <b className="font-note">{stats ? <AnimatedCounter value={stats.totalExports} /> : '—'}</b>
            <small>份文件被带走</small>
          </div>
        </div>
      </div>

      <div className="hv-v2-right">
        {/* peeking paper sheets behind the search card */}
        <div className="hv-v2-sheet is-back" aria-hidden="true">
          <span className="font-mono">TRACKLIST.xlsx</span>
        </div>
        <div className="hv-v2-sheet is-mid" aria-hidden="true">
          <span className="font-mono">mixtape.m3u8</span>
        </div>
        <div className="hv-v2-search">{search}</div>
        <span className="hv-mini-tag is-lemon hv-v2-tag font-note">从这里开始 ↓</span>
        <SparkleDoodle className="hv-v2-spark" color="#ffb4c9" size={26} />
      </div>
    </div>
  );
};

/* ================================================================ Variant 3 · 成品预览 */

const Variant3: React.FC<{ hero: React.ReactNode; search: React.ReactNode }> = ({ hero, search }) => (
  <div className="hv-root hv-v3">
    <div className="hv-v3-side is-left" aria-hidden="true">
      <span className="hv-v3-caption font-note">导出后长这样 ↘</span>
      <div className="hv-v3-files">
        {(['XLSX', 'CSV', 'M3U8'] as const).map((ext, i) => (
          <div key={ext} className={`hv-v3-file is-${i}`}>
            <div className="hv-v3-file-ear" />
            <b className="font-mono">.{ext.toLowerCase()}</b>
            <div className="hv-v3-file-lines">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        ))}
      </div>
      <CurvyArrow className="hv-v3-arrow-l" />
    </div>

    <div className="hv-center">
      {hero}
      {search}
    </div>

    <div className="hv-v3-side is-right" aria-hidden="true">
      <span className="hv-v3-caption font-note">↙ 粘贴后先预览</span>
      <div className="hv-v3-ticket">
        <div className="hv-v3-ticket-head">
          <div className="hv-v3-cover">
            <VinylDoodle size={40} labelColor="#ffd6e0" />
          </div>
          <div>
            <b>深夜循环 · 示例歌单</b>
            <small className="font-mono">42 TRACKS · 2h 38m</small>
          </div>
        </div>
        <ul className="hv-v3-rows">
          {SAMPLE_ROWS.map((r, i) => (
            <li key={r.title}>
              <span className="font-mono hv-v3-idx">{String(i + 1).padStart(2, '0')}</span>
              <span className="hv-v3-song">
                {r.title}
                <small>{r.artist}</small>
              </span>
              <span className="font-mono hv-v3-dur">{r.dur}</span>
            </li>
          ))}
        </ul>
        <div className="hv-v3-ticket-foot font-mono">··· 还有 38 首</div>
        <span className="hv-v3-stamp font-marker">PREVIEW</span>
      </div>
      <CurvyArrow className="hv-v3-arrow-r" flip />
    </div>
  </div>
);

/* ================================================================ Variant 4 · 唱片舞台 */

const RECORD_COLORS = ['#cdefe3', '#ffd6e0', '#d8ecff', '#fff2c2', '#e8f7c8', '#ffe0ec', '#c8f2e2', '#e4d6ff'];

const Variant4: React.FC<{ hero: React.ReactNode; search: React.ReactNode }> = ({ hero, search }) => (
  <div className="hv-root hv-v4">
    <div className="hv-v4-stage">
      <div className="hv-v4-left" aria-hidden="true">
        <TurntableDoodle />
        <span className="hv-mini-tag is-pink hv-v4-tag-a font-note">♪ now parsing…</span>
      </div>

      <div className="hv-center">
        {hero}
        {search}
      </div>

      <div className="hv-v4-right" aria-hidden="true">
        <span className="hv-v4-rack-title font-marker">唱片架 · 8 个平台</span>
        <div className="hv-v4-rack">
          {PLATFORM_STICKERS.map((p, i) => (
            <div key={p.name} className="hv-v4-record">
              <span className="hv-v4-sleeve" style={{ background: RECORD_COLORS[i] }}>
                <span className="hv-v4-sleeve-name">{p.name}</span>
              </span>
              <span className="hv-v4-disc" />
            </div>
          ))}
        </div>
        <span className="hv-mini-tag is-mint hv-v4-tag-b font-note">挑一张，带回家 ✿</span>
      </div>
    </div>

    <div className="hv-marquee" aria-hidden="true">
      <div className="hv-marquee-track">
        {[0, 1].map((k) => (
          <React.Fragment key={k}>
            {PLATFORM_STICKERS.map((p) => (
              <span key={`${k}-${p.name}`} className={`hv-marquee-item is-${p.tone}`}>
                {p.name}
              </span>
            ))}
            {EXPORT_FORMATS.map((f) => (
              <span key={`${k}-${f.ext}`} className="hv-marquee-item is-file font-mono">
                .{f.ext.toLowerCase()}
              </span>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  </div>
);

/* ================================================================ Variant 5 · 贴纸数据墙 */

const ORBIT_POSITIONS: { left: string; top: string; rot: number }[] = [
  { left: '2%', top: '8%', rot: -9 },
  { left: '11%', top: '28%', rot: 6 },
  { left: '1%', top: '50%', rot: -4 },
  { left: '10%', top: '72%', rot: 8 },
  { left: '86%', top: '6%', rot: 7 },
  { left: '90%', top: '28%', rot: -6 },
  { left: '84%', top: '50%', rot: 5 },
  { left: '88%', top: '72%', rot: -8 },
];

const Variant5: React.FC<{ hero: React.ReactNode; search: React.ReactNode }> = ({ hero, search }) => {
  const stats = useHeroStats(true);
  const days = calculateRunningDays(stats?.launchedAt);
  const cells = [
    { label: '张歌单被解析', value: stats?.totalPlaylistsParsed, tone: 'pink' },
    { label: '首歌被记下', value: stats?.totalTracksProcessed, tone: 'mint' },
    { label: '份文件被带走', value: stats?.totalExports, tone: 'lemon' },
    { label: '天温暖相伴', value: stats ? days ?? undefined : undefined, tone: 'taro' },
  ];
  return (
    <div className="hv-root hv-v5">
      <div className="hv-v5-orbit" aria-hidden="true">
        {PLATFORM_STICKERS.map((p, i) => {
          const pos = ORBIT_POSITIONS[i];
          return (
            <span
              key={p.name}
              className={`hv-v5-sticker is-${p.tone}`}
              style={{ left: pos.left, top: pos.top, '--rot': `${pos.rot}deg`, '--d': `${i * 0.45}s` } as React.CSSProperties}
            >
              {p.name}
            </span>
          );
        })}
        <VinylDoodle size={86} className="hv-v5-vinyl" labelColor="#ffd6e0" />
        <CassetteDoodle className="hv-v5-cassette" />
        <SparkleDoodle className="hv-v5-spark-1" color="#ffd466" size={26} />
        <SparkleDoodle className="hv-v5-spark-2" color="#ffb4c9" size={18} />
        <SparkleDoodle className="hv-v5-spark-3" color="#9fdcc4" size={20} />
      </div>

      <div className="hv-center">
        {hero}
        {search}
        <div className="hv-v5-ribbon">
          {cells.map((c) => (
            <div key={c.label} className={`hv-v5-cell is-${c.tone}`}>
              <b className="font-note">{c.value !== undefined ? <AnimatedCounter value={c.value} /> : '—'}</b>
              <small>{c.label}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ================================================================ Switcher + Stage */

const HeroVariantSwitcher: React.FC<{ value: HeroVariantId; onChange: (v: HeroVariantId) => void }> = ({
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(true);
  return (
    <div className={`hv-switcher${open ? ' is-open' : ''}`}>
      {open && (
        <div className="hv-switcher-list">
          {HERO_VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`hv-switcher-item${v.id === value ? ' is-active' : ''}`}
              onClick={() => onChange(v.id)}
            >
              <b className="font-mono">{v.id}</b>
              <span>
                {v.name}
                <small>{v.desc}</small>
              </span>
            </button>
          ))}
        </div>
      )}
      <button type="button" className="hv-switcher-toggle font-marker" onClick={() => setOpen((o) => !o)}>
        首屏方案 {value} · {HERO_VARIANTS[value].name} {open ? '▾' : '▴'}
      </button>
    </div>
  );
};

export const HeroVariantStage: React.FC<{
  hero: React.ReactNode;
  search: React.ReactNode;
  /** original wrapper used when variant = 0 */
  fallback: React.ReactNode;
}> = ({ hero, search, fallback }) => {
  const [{ variant, explicit }, setState] = useState(readInitialVariant);
  const isTest = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
  const showSwitcher = !isTest && (import.meta.env.DEV || explicit);

  const handleChange = useCallback((next: HeroVariantId) => {
    setState((s) => ({ ...s, variant: next }));
    try {
      window.localStorage?.setItem(STORAGE_KEY, String(next));
      const url = new URL(window.location.href);
      url.searchParams.set('hero', String(next));
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    } catch {
      /* ignore */
    }
  }, []);

  let body: React.ReactNode;
  switch (variant) {
    case 1:
      body = <Variant1 hero={hero} search={search} />;
      break;
    case 2:
      body = <Variant2 search={search} />;
      break;
    case 3:
      body = <Variant3 hero={hero} search={search} />;
      break;
    case 4:
      body = <Variant4 hero={hero} search={search} />;
      break;
    case 5:
      body = <Variant5 hero={hero} search={search} />;
      break;
    default:
      body = fallback;
  }

  return (
    <>
      <div key={variant} className="hv-stage" data-hero-variant={variant}>
        {body}
      </div>
      {showSwitcher && <HeroVariantSwitcher value={variant} onChange={handleChange} />}
    </>
  );
};
