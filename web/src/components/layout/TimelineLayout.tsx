import React, { useEffect, useState } from 'react';
import { Reveal } from '../motion/Reveal';
import { fetchStats, type StatsResponse } from '../../api/client';
import { calculateRunningDays } from '../../utils/uptime';
import { AnimatedCounter } from '../stats/AnimatedCounter';
import type { PinboardLayoutSlots } from './PinboardLayout';

const EXPORT_FORMATS = [
  { ext: 'XLSX', tone: 'mint', hint: '表格' },
  { ext: 'CSV', tone: 'lemon', hint: '通用' },
  { ext: 'JSON', tone: 'sky', hint: '数据' },
  { ext: 'TXT', tone: 'pink', hint: '纯文本' },
  { ext: 'M3U8', tone: 'taro', hint: '播放列表' },
  { ext: 'MD', tone: 'lime', hint: '笔记' },
] as const;

const PLAYER_TARGETS = ['MusicFree', '洛雪音乐', 'Listen1'];

function useDesktopHeroStats(): StatsResponse | null {
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    let alive = true;
    fetchStats()
      .then((res) => {
        if (alive && res?.success && res.data) {
          setStats(res.data);
        }
      })
      .catch(() => {
        /* graceful fallback */
      });
    return () => {
      alive = false;
    };
  }, []);

  return stats;
}

const MiniCassetteSvg: React.FC = () => (
  <svg className="layout-a-svg-cassette" width="90" height="60" viewBox="0 0 96 64" fill="none" aria-hidden="true">
    <rect x="4" y="6" width="88" height="52" rx="12" fill="#ffd9e4" stroke="#c87b92" strokeWidth="2" />
    <rect x="14" y="14" width="68" height="24" rx="6" fill="#fffdf9" stroke="#ddb0bd" strokeWidth="1.6" />
    <rect x="14" y="14" width="68" height="6" rx="3" fill="#ffe9c2" />
    <g className="cassette-reel-l">
      <circle cx="33" cy="28" r="6.5" fill="#fff2c2" stroke="#c09154" strokeWidth="1.6" />
      <line x1="33" y1="22.5" x2="33" y2="33.5" stroke="#c09154" strokeWidth="1.2" />
      <line x1="27.5" y1="28" x2="38.5" y2="28" stroke="#c09154" strokeWidth="1.2" />
      <circle cx="33" cy="28" r="2.2" fill="#fffdf9" />
    </g>
    <g className="cassette-reel-r">
      <circle cx="63" cy="28" r="6.5" fill="#cdefe3" stroke="#5aa98c" strokeWidth="1.6" />
      <line x1="63" y1="22.5" x2="63" y2="33.5" stroke="#5aa98c" strokeWidth="1.2" />
      <line x1="57.5" y1="28" x2="68.5" y2="28" stroke="#5aa98c" strokeWidth="1.2" />
      <circle cx="63" cy="28" r="2.2" fill="#fffdf9" />
    </g>
    <line x1="40" y1="28" x2="56" y2="28" stroke="#c89a8e" strokeWidth="1.6" strokeDasharray="3 2.5" />
    <path d="M24 58L29 45H67L72 58" fill="#ffeef3" stroke="#c87b92" strokeWidth="1.6" />
  </svg>
);

const MiniVinylSvg: React.FC = () => (
  <svg className="layout-a-svg-vinyl" width="74" height="74" viewBox="0 0 76 76" fill="none" aria-hidden="true">
    <g className="vinyl-disc">
      <circle cx="38" cy="38" r="32" fill="#6b564e" stroke="#a8887c" strokeWidth="2" />
      <circle cx="38" cy="38" r="24" stroke="#967a6f" strokeWidth="1.3" strokeDasharray="6 4" />
      <circle cx="38" cy="38" r="18" stroke="#856b60" strokeWidth="1" strokeDasharray="3 5" opacity="0.75" />
      <circle cx="38" cy="38" r="12.5" fill="#cdefe3" stroke="#5aa98c" strokeWidth="1.6" />
      <circle cx="38" cy="38" r="3.6" fill="#fffdf9" />
      <path d="M18 22C22 17 28 14 34 13" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.34" />
      <path d="M56 54C52 59 46 62 40 63" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.22" />
    </g>
  </svg>
);

const MiniEnvelopeSvg: React.FC = () => (
  <svg className="layout-a-svg-envelope" width="80" height="58" viewBox="0 0 84 62" fill="none" aria-hidden="true">
    <rect x="4" y="8" width="76" height="48" rx="11" fill="#fff4cf" stroke="#cda450" strokeWidth="2" />
    <path d="M6 14L42 36L78 14" stroke="#cda450" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <g className="envelope-seal">
      <circle cx="42" cy="35" r="9.5" fill="#ffd6e0" stroke="#dc7494" strokeWidth="1.7" />
      <text x="42" y="38.5" textAnchor="middle" fill="#a84062" fontSize="9.5" fontWeight="700" fontFamily="Space Mono, monospace">&lt;/&gt;</text>
    </g>
  </svg>
);

const DieCutHeadphonesSvg: React.FC = () => (
  <svg width="58" height="54" viewBox="0 0 64 60" fill="none" aria-hidden="true">
    <path d="M12 34C12 19 20 10 32 10C44 10 52 19 52 34" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" />
    <path d="M12 34C12 19 20 10 32 10C44 10 52 19 52 34" stroke="#b99ce8" strokeWidth="5.5" strokeLinecap="round" />
    <rect x="6" y="29" width="13" height="22" rx="6.5" fill="#ffd6e0" stroke="#ffffff" strokeWidth="3.5" />
    <rect x="45" y="29" width="13" height="22" rx="6.5" fill="#cdefe3" stroke="#ffffff" strokeWidth="3.5" />
    <rect x="8" y="31" width="9" height="18" rx="4.5" fill="#ffd6e0" stroke="#d97d99" strokeWidth="1.6" />
    <rect x="47" y="31" width="9" height="18" rx="4.5" fill="#cdefe3" stroke="#5aa98c" strokeWidth="1.6" />
  </svg>
);

const DieCutPaperPlaneSvg: React.FC = () => (
  <svg width="62" height="46" viewBox="0 0 68 50" fill="none" aria-hidden="true">
    <path d="M8 24L58 8L42 42L29 30L8 24Z" fill="#ffffff" stroke="#ffffff" strokeWidth="7" strokeLinejoin="round" />
    <path d="M8 24L58 8L42 42L29 30L8 24Z" fill="#dff3ff" stroke="#7aaad8" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M58 8L29 30V41L36 34" fill="#c2e4ff" stroke="#7aaad8" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const DieCutCoffeeSvg: React.FC = () => (
  <svg width="54" height="52" viewBox="0 0 58 56" fill="none" aria-hidden="true">
    <path d="M22 13C22 9 25 9 25 5M31 13C31 9 34 9 34 5" stroke="#e496ad" strokeWidth="2.2" strokeLinecap="round" />
    <rect x="10" y="18" width="32" height="28" rx="9" fill="#ffffff" stroke="#ffffff" strokeWidth="6" />
    <path d="M42 23H46C49.5 23 51.5 25.5 51.5 28.5C51.5 31.5 49.5 34 46 34H42" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
    <rect x="10" y="18" width="32" height="28" rx="9" fill="#fff4cf" stroke="#d4a448" strokeWidth="1.8" />
    <path d="M42 23H46C49 23 51 25.2 51 28.5C51 31.8 49 34 46 34H42" stroke="#d4a448" strokeWidth="2" strokeLinecap="round" />
    <path d="M26 27.5C24.5 25.5 21 26.8 22 29.8C22.8 32.2 26 34.5 26 34.5C26 34.5 29.2 32.2 30 29.8C31 26.8 27.5 25.5 26 27.5Z" fill="#f289a8" />
  </svg>
);

const HeroVinylDoodle: React.FC<{ size?: number; labelColor?: string; className?: string }> = ({
  size = 58,
  labelColor = '#cdefe3',
  className = '',
}) => (
  <svg className={`hv-vinyl ${className}`.trim()} width={size} height={size} viewBox="0 0 76 76" fill="none" aria-hidden="true">
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

const HeroCassetteDoodle: React.FC<{ className?: string }> = ({ className = '' }) => (
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
  <svg className={`hv-sparkle ${className}`.trim()} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8Z" fill={color} />
  </svg>
);

const DesktopHeroStage: React.FC<{ hero: React.ReactNode; search: React.ReactNode }> = ({ hero, search }) => {
  const stats = useDesktopHeroStats();
  const days = calculateRunningDays(stats?.launchedAt);

  return (
    <div className="hv-stage">
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
                <b className="font-note">
                  {stats ? <AnimatedCounter value={stats.cumulativeDailyVisitors ?? stats.totalVisitors} /> : '—'}
                </b>
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
            <HeroCassetteDoodle className="hv-v1-cassette" />
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
            <HeroVinylDoodle size={58} className="hv-v1-vinyl" />
          </div>
          <span className="hv-mini-tag is-sky hv-v1-tag-b font-note">✦ 文件在本地生成</span>
        </aside>

        <SparkleDoodle className="hv-v1-spark-1" color="#ffb4c9" />
        <SparkleDoodle className="hv-v1-spark-2" color="#9fdcc4" size={16} />
      </div>
    </div>
  );
};

/**
 * Default desktop zigzag timeline layout (Layout A: 之字形日记).
 */
export const TimelineLayout: React.FC<{ slots: PinboardLayoutSlots }> = ({ slots }) => {
  return (
    <div className="layout-a-root">
      {slots.header}
      <main>
        <DesktopHeroStage hero={slots.hero} search={slots.search} />

        {slots.result && <div className="layout-a-result-wrap">{slots.result}</div>}

        <div className="layout-a-zigzag">
          <svg
            className="layout-a-path-svg"
            viewBox="0 0 1000 1600"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M 500 0 C 830 130, 840 270, 670 400 S 160 580, 270 760 S 820 960, 690 1160 S 240 1380, 500 1600"
              fill="none"
              stroke="var(--accent-strawberry, #e8789a)"
              strokeWidth="2.5"
              strokeDasharray="8 10"
              strokeLinecap="round"
              opacity="0.38"
            />
          </svg>

          {/* Row 1: Left Story Card + Right Macaron Cassette Rack */}
          <div className="layout-a-row layout-a-row-right">
            <div className="layout-a-aside-slot">
              <div className="layout-a-aside-hit">
                <Reveal effect="toss-left" rot={-1.5} className="layout-a-aside">
                  <span className="layout-a-step-pill font-marker">01 · 卡带上架</span>
                  <div className="layout-a-aside-doodle">
                    <MiniCassetteSvg />
                  </div>
                  <p className="layout-a-aside-text">
                    导出后的歌单不只是一份文件，还能直接装进开源播放器里继续听 ♪
                  </p>
                  <span className="layout-a-arrow font-note" aria-hidden="true">右侧卡带架 ↷</span>
                </Reveal>
              </div>
              <Reveal effect="pop" delay={680} rot={-8} data-deco-mobile="hide" className="layout-a-pop-sticker is-ch1-left" aria-hidden="true">
                <span className="layout-a-mini-tag is-lemon">✦ replay</span>
              </Reveal>
            </div>
            <div className="layout-a-main">
              {slots.ecosystem}
              <Reveal effect="pop" delay={560} rot={7} data-deco-mobile="hide" className="layout-a-pop-sticker is-ch1-right" aria-hidden="true">
                <span className="layout-a-mini-tag is-pink">♪ mixtape</span>
              </Reveal>
            </div>
          </div>

          {/* Row 2: Left Bespoke Stationery Trio + Right Story Card */}
          <div className="layout-a-row layout-a-row-left">
            <div className="layout-a-main">{slots.infoNotes}</div>
            <div className="layout-a-aside-slot">
              <Reveal effect="pop" delay={580} rot={-6} data-deco-mobile="hide" className="layout-a-pop-sticker is-ch2-top" aria-hidden="true">
                <span className="layout-a-mini-tag is-pink">♡ keep safe</span>
              </Reveal>
              <div className="layout-a-aside-hit">
                <Reveal effect="toss-right" rot={1.5} className="layout-a-aside layout-a-aside-right">
                  <span className="layout-a-step-pill is-mint font-marker">02 · 剪贴小记</span>
                  <div className="layout-a-aside-doodle">
                    <MiniVinylSvg />
                  </div>
                  <p className="layout-a-aside-text">
                    航空明信片、草莓票根和薄荷软垫，记录这本音乐手帐的初心 ✿
                  </p>
                  <span className="layout-a-arrow font-note" aria-hidden="true">↶ 左侧剪贴</span>
                </Reveal>
              </div>
              <Reveal effect="pop" delay={760} rot={9} data-deco-mobile="hide" className="layout-a-pop-sticker is-ch2-bottom" aria-hidden="true">
                <span className="layout-a-mini-tag is-mint">✿ pure local</span>
              </Reveal>
            </div>
          </div>

          {/* Row 3: Left Postage Stamp + Right Silky Bento Stats */}
          <div className="layout-a-row layout-a-row-right">
            <div className="layout-a-aside-slot">
              <Reveal effect="pop" delay={520} rot={-10} data-deco-mobile="hide" className="layout-a-pop-sticker is-ch3-headphones" aria-hidden="true">
                <DieCutHeadphonesSvg />
              </Reveal>
              <div className="layout-a-aside-hit">
                <Reveal effect="pop" rot={-2} className="layout-a-aside">
                  <span className="layout-a-step-pill is-taro font-marker">03 · 温暖足迹</span>
                  <div className="layout-a-stamp-slot">{slots.stamp}</div>
                  <p className="layout-a-aside-text">
                    每一张被带走的歌单，都会在这里留下一枚温柔的小印章 ♥
                  </p>
                </Reveal>
              </div>
              <Reveal effect="pop" delay={760} rot={6} data-deco-mobile="hide" className="layout-a-pop-sticker is-ch3-tag" aria-hidden="true">
                <span className="layout-a-mini-tag is-taro">♫ good vibes</span>
              </Reveal>
            </div>
            <div className="layout-a-main">
              {slots.stats}
              <Reveal effect="pop" delay={660} rot={8} data-deco-mobile="hide" className="layout-a-pop-sticker is-ch3-coffee" aria-hidden="true">
                <DieCutCoffeeSvg />
              </Reveal>
              <Reveal effect="pop" delay={900} rot={-5} data-deco-mobile="hide" className="layout-a-pop-sticker is-ch3-stars" aria-hidden="true">
                <span className="layout-a-mini-tag is-sky">✦ daily note ⋆</span>
              </Reveal>
            </div>
          </div>

          {/* Row 4: Left Cream Folder (DeveloperPanel) + Right Story Card */}
          <div className="layout-a-row layout-a-row-left">
            <div className="layout-a-main">
              {slots.developer}
              <Reveal effect="pop" delay={540} rot={7} data-deco-mobile="hide" className="layout-a-pop-sticker is-ch4-code" aria-hidden="true">
                <span className="layout-a-mini-tag is-mint">&lt;/&gt; open API</span>
              </Reveal>
              <Reveal effect="pop" delay={720} rot={-9} data-deco-mobile="hide" className="layout-a-pop-sticker is-ch4-plane" aria-hidden="true">
                <DieCutPaperPlaneSvg />
              </Reveal>
            </div>
            <div className="layout-a-aside-slot">
              <div className="layout-a-aside-hit">
                <Reveal effect="toss-right" rot={1.5} className="layout-a-aside layout-a-aside-right">
                  <span className="layout-a-step-pill is-lemon font-marker">04 · 封底附录</span>
                  <div className="layout-a-aside-doodle">
                    <MiniEnvelopeSvg />
                  </div>
                  <p className="layout-a-aside-text">
                    开放 API、本地 Python CLI 与标准 JSON 协议，随时接进你的音乐工具
                  </p>
                </Reveal>
              </div>
              <Reveal effect="pop" delay={840} rot={-6} data-deco-mobile="hide" className="layout-a-pop-sticker is-ch4-mail" aria-hidden="true">
                <span className="layout-a-mini-tag is-pink">✉ hello dev!</span>
              </Reveal>
            </div>
          </div>
        </div>
      </main>
      <div className="layout-a-footer-wrap">
        <Reveal effect="pop" delay={420} rot={-10} data-deco-mobile="hide" className="layout-a-pop-sticker is-footer-left" aria-hidden="true">
          <span className="layout-a-mini-tag is-pink">✿ thank you</span>
        </Reveal>
        <Reveal effect="pop" delay={560} rot={8} data-deco-mobile="hide" className="layout-a-pop-sticker is-footer-right" aria-hidden="true">
          <span className="layout-a-mini-tag is-lemon">♪ see you</span>
        </Reveal>
        {slots.footer}
      </div>
    </div>
  );
};
