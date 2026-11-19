import React, { useState, useEffect, useRef } from 'react';
import type { JournalStyleId } from '../settings/StyleContext';
import { Reveal } from '../motion/Reveal';

export interface LayoutDemoSlots {
  header: React.ReactNode;
  hero: React.ReactNode;
  search: React.ReactNode;
  result: React.ReactNode;
  ecosystem: React.ReactNode;
  infoNotes: React.ReactNode;
  stats: React.ReactNode;
  developer: React.ReactNode;
  stamp: React.ReactNode;
  footer: React.ReactNode;
  onBrandClick: () => void;
}

interface LayoutDemoViewProps {
  mode: Exclude<JournalStyleId, 'legacy'>;
  slots: LayoutDemoSlots;
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

/* ============ Layout A: 之字形日记 (Modern Cozy Macaron Stationery) ============ */
const LayoutADemo: React.FC<{ slots: LayoutDemoSlots }> = ({ slots }) => {
  return (
    <div className="layout-a-root">
      {slots.header}
      <main>
        <div className="layout-a-hero-wrap">
          {slots.hero}
          {slots.search}
        </div>

        {slots.result && <div className="layout-a-result-wrap">{slots.result}</div>}

        <div className="layout-a-zigzag">
          {/* Decorative winding pastel ribbon path */}
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

          {/* Row 1: Left Story Card + Right Macaron Cassette Rack + 2 delayed mini stickers */}
          <div className="layout-a-row layout-a-row-right">
            <div className="layout-a-aside-slot">
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

          {/* Row 2: Left Bespoke Stationery Trio + Right Story Card + 2 delayed mini stickers */}
          <div className="layout-a-row layout-a-row-left">
            <div className="layout-a-main">{slots.infoNotes}</div>
            <div className="layout-a-aside-slot">
              <Reveal effect="pop" delay={580} rot={-6} data-deco-mobile="hide" className="layout-a-pop-sticker is-ch2-top" aria-hidden="true">
                <span className="layout-a-mini-tag is-pink">♡ keep safe</span>
              </Reveal>
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
              <Reveal effect="pop" delay={760} rot={9} data-deco-mobile="hide" className="layout-a-pop-sticker is-ch2-bottom" aria-hidden="true">
                <span className="layout-a-mini-tag is-mint">✿ pure local</span>
              </Reveal>
            </div>
          </div>

          {/* Row 3: Left Postage Stamp + Right Silky Bento Stats + 4 delayed festive stickers! */}
          <div className="layout-a-row layout-a-row-right">
            <div className="layout-a-aside-slot">
              <Reveal effect="pop" delay={520} rot={-10} data-deco-mobile="hide" className="layout-a-pop-sticker is-ch3-headphones" aria-hidden="true">
                <DieCutHeadphonesSvg />
              </Reveal>
              <Reveal effect="pop" rot={-2} className="layout-a-aside">
                <span className="layout-a-step-pill is-taro font-marker">03 · 温暖足迹</span>
                <div className="layout-a-stamp-slot">{slots.stamp}</div>
                <p className="layout-a-aside-text">
                  每一张被带走的歌单，都会在这里留下一枚温柔的小印章 ♥
                </p>
              </Reveal>
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

          {/* Row 4: Left Cream Folder (DeveloperPanel) + Right Story Card + 3 delayed stickers! */}
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
              <Reveal effect="toss-right" rot={1.5} className="layout-a-aside layout-a-aside-right">
                <span className="layout-a-step-pill is-lemon font-marker">04 · 封底附录</span>
                <div className="layout-a-aside-doodle">
                  <MiniEnvelopeSvg />
                </div>
                <p className="layout-a-aside-text">
                  开放 API、本地 Python CLI 与标准 JSON 协议，随时接进你的音乐工具
                </p>
              </Reveal>
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

/* Bespoke SVGs for Layout B (Pastel Enamel Pushpin & Rose-Gold Binder Clip) */
const PushpinSvg: React.FC<{ color: string; rim: string; className?: string }> = ({ color, rim, className = '' }) => (
  <svg className={`layout-b-pushpin ${className}`.trim()} width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <ellipse cx="17.5" cy="24.5" rx="7.5" ry="3.2" fill="rgba(122, 86, 68, 0.22)" />
    <circle cx="15.5" cy="14.5" r="10.5" fill={color} stroke={rim} strokeWidth="2" />
    <circle cx="15.5" cy="14.5" r="5.5" fill="rgba(255,255,255,0.28)" />
    <ellipse cx="12" cy="10.5" rx="3.2" ry="1.8" transform="rotate(-28 12 10.5)" fill="rgba(255,255,255,0.85)" />
  </svg>
);

const BinderClipSvg: React.FC = () => (
  <svg className="layout-b-binder-clip" width="76" height="44" viewBox="0 0 76 44" fill="none" aria-hidden="true">
    {/* Wire handles */}
    <path d="M24 22C24 8 31 3 38 3C45 3 52 8 52 22" stroke="#d5a48e" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M29 22C29 12 33 8 38 8C43 8 47 12 47 22" stroke="#ebd0c2" strokeWidth="1.6" strokeLinecap="round" />
    {/* Soft drop shadow */}
    <rect x="13" y="21" width="50" height="20" rx="6" fill="rgba(130, 92, 76, 0.16)" />
    {/* Pastel strawberry-cream clip body */}
    <rect x="12" y="18" width="52" height="20" rx="6" fill="#ffd4e1" stroke="#e48ea8" strokeWidth="2" />
    <rect x="18" y="23" width="40" height="4" rx="2" fill="rgba(255,255,255,0.72)" />
    <circle cx="22" cy="31" r="2" fill="#e48ea8" />
    <circle cx="54" cy="31" r="2" fill="#e48ea8" />
  </svg>
);

/* ============ Layout B: 软木板拼贴 (Pastel Linen Pinboard Bento Collage) ============ */
const LayoutBDemo: React.FC<{ slots: LayoutDemoSlots }> = ({ slots }) => {
  return (
    <div className="layout-b-root">
      {slots.header}
      <main>
        <div className="layout-b-hero-wrap">
          {slots.hero}
          <div className="layout-b-search-clipped">
            <BinderClipSvg />
            {slots.search}
          </div>
        </div>

        {slots.result && <div className="layout-b-result-wrap">{slots.result}</div>}

        <section className="layout-b-board" aria-label="马卡龙剪贴簿拼贴墙">
          {/* 4 Corner Enamel Pushpins holding the Linen Pinboard Mat */}
          <PushpinSvg color="#ffb4c9" rim="#de7e9a" className="is-corner-tl" />
          <PushpinSvg color="#a8e8d0" rim="#5cb394" className="is-corner-tr" />
          <PushpinSvg color="#ffe08c" rim="#d4a43e" className="is-corner-bl" />
          <PushpinSvg color="#d1beff" rim="#957ad4" className="is-corner-br" />

          <div className="layout-b-board-header">
            <span className="layout-b-board-washi is-left" aria-hidden="true" />
            <span className="font-marker layout-b-board-title">✿ 音乐剪贴墙 · Scrapbook Pinboard ✿</span>
            <span className="layout-b-board-washi is-right" aria-hidden="true" />
          </div>

          <div className="layout-b-bento-grid">
            {/* Top-left 8-col: Unwrapped PluginEcosystem — each vinyl sleeve pinned individually on board */}
            <div className="layout-b-cell layout-b-cell-ecosystem">
              {slots.ecosystem}
            </div>

            {/* Top-right 4-col: Coaster Stamp + 3 individual Scrapbook Clippings */}
            <div className="layout-b-cell layout-b-cell-side-notes">
              <div className="layout-b-stamp-box">
                <PushpinSvg color="#ffb4c9" rim="#de7e9a" className="is-card-pin is-small" />
                {slots.stamp}
              </div>
              {slots.infoNotes}
            </div>

            {/* Bottom-left 7-col: Unwrapped StatsJournal — each stat card pinned directly on board */}
            <div className="layout-b-cell layout-b-cell-stats">
              {slots.stats}
            </div>

            {/* Bottom-right 5-col: Unwrapped DeveloperPanel — 4 mini spiral cards pinned directly on board */}
            <div className="layout-b-cell layout-b-cell-developer">
              {slots.developer}
            </div>
          </div>
        </section>
      </main>
      {slots.footer}
    </div>
  );
};

/* Bespoke SVGs for Layout C (Pastel Fountain Pen & Ribbon Bookmark) */
const PastelPenSvg: React.FC = () => (
  <svg className="layout-c-pen-svg" width="128" height="28" viewBox="0 0 132 28" fill="none" aria-hidden="true">
    <rect x="18" y="7" width="84" height="14" rx="7" fill="#ffe1eb" stroke="#d88ea4" strokeWidth="1.8" />
    <rect x="64" y="7" width="8" height="14" fill="#f7d388" stroke="#c89a48" strokeWidth="1.4" />
    <path d="M102 9L122 14L102 19V9Z" fill="#fffaf2" stroke="#c89a48" strokeWidth="1.6" strokeLinejoin="round" />
    <circle cx="122" cy="14" r="1.8" fill="#8f6758" />
    <path d="M28 5H54" stroke="#e4a96b" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="28" cy="5" r="2.2" fill="#f7d388" />
    <rect x="10" y="9" width="10" height="10" rx="4" fill="#cdefe3" stroke="#74bfa3" strokeWidth="1.6" />
  </svg>
);

const LAYOUT_C_TABS = [
  { id: 'demo-c-search', num: '01', label: '粘贴歌单', tone: 'is-lemon' },
  { id: 'demo-c-ecosystem', num: '02', label: '开源播放器', tone: 'is-sky' },
  { id: 'demo-c-notes', num: '03', label: '手帐便签', tone: 'is-pink' },
  { id: 'demo-c-stats', num: '04', label: '运行统计', tone: 'is-mint' },
  { id: 'demo-c-dev', num: '05', label: '开发者附录', tone: 'is-taro' },
] as const;

/* ============ Layout C: 侧栏手帐 (Open Hobonichi Loose-Leaf Planner Book) ============ */
const LayoutCDemo: React.FC<{ slots: LayoutDemoSlots }> = ({ slots }) => {
  const [activeId, setActiveId] = useState<string>('demo-c-search');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    const elements = LAYOUT_C_TABS.map((tab) => document.getElementById(tab.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (!elements.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-12% 0px -55% 0px', threshold: 0.05 },
    );
    elements.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="layout-c-shell">
      {/* Left Sticky Leather-Cream Planner Cover */}
      <aside className="layout-c-sidebar" aria-label="手帐侧边目录">
        {/* Decorative Rose-Gold Metal Binder Rings bridging cover and page */}
        <div className="layout-c-rings" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="layout-c-ring" />
          ))}
        </div>

        <div className="layout-c-brand-card" onClick={slots.onBrandClick} role="button" tabIndex={0}>
          <img src="/logo-128.png" alt="Playlist Out Logo" width={46} height={46} />
          <div>
            <div className="font-marker layout-c-brand-name">Playlist Out</div>
            <div className="font-handwriting layout-c-brand-sub">粘贴 · 解析 · 导出</div>
          </div>
        </div>

        <div className="layout-c-index-heading font-mono">INDEX · 目录书签</div>

        <nav className="layout-c-bookmarks" aria-label="手帐书签导航">
          {LAYOUT_C_TABS.map((tab) => {
            const isActive = activeId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`layout-c-bookmark ${tab.tone}${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => scrollTo(tab.id)}
              >
                <span className="layout-c-tab-num font-mono">{tab.num}</span>
                <span className="layout-c-tab-label">{tab.label}</span>
                <span className="layout-c-tab-dot" aria-hidden="true" />
              </button>
            );
          })}
        </nav>

        <div className="layout-c-sidebar-stamp">{slots.stamp}</div>

        <div className="layout-c-sidebar-pen" aria-hidden="true">
          <PastelPenSvg />
        </div>
      </aside>

      {/* Right Open Ivory Cotton Notebook Page (No nested boxes!) */}
      <div className="layout-c-content">
        <div className="layout-c-topbar">{slots.header}</div>
        <main className="layout-c-page-body">
          <div id="demo-c-search" className="layout-c-section layout-c-section-hero">
            <div className="layout-c-chapter-bar">
              <span className="layout-c-chapter-code font-mono">PAGE 01</span>
              <span className="layout-c-chapter-line" />
            </div>
            {slots.hero}
            {slots.search}
          </div>

          {slots.result && (
            <div className="layout-c-section layout-c-section-result">
              {slots.result}
            </div>
          )}

          <div id="demo-c-ecosystem" className="layout-c-section">
            <div className="layout-c-chapter-bar">
              <span className="layout-c-chapter-code font-mono">PAGE 02 · PLAYERS</span>
              <span className="layout-c-chapter-line" />
            </div>
            {slots.ecosystem}
          </div>

          <div id="demo-c-notes" className="layout-c-section">
            <div className="layout-c-chapter-bar">
              <span className="layout-c-chapter-code font-mono">PAGE 03 · NOTES</span>
              <span className="layout-c-chapter-line" />
            </div>
            {slots.infoNotes}
          </div>

          <div id="demo-c-stats" className="layout-c-section">
            <div className="layout-c-chapter-bar">
              <span className="layout-c-chapter-code font-mono">PAGE 04 · JOURNAL LOG</span>
              <span className="layout-c-chapter-line" />
            </div>
            {slots.stats}
          </div>

          <div id="demo-c-dev" className="layout-c-section">
            <div className="layout-c-chapter-bar">
              <span className="layout-c-chapter-code font-mono">PAGE 05 · APPENDIX</span>
              <span className="layout-c-chapter-line" />
            </div>
            {slots.developer}
          </div>
        </main>
        {slots.footer}
      </div>
    </div>
  );
};

/* Bespoke Anime Cel-Shaded Pastel Walkman & Sparkle Charm for Layout D */
const AnimeWalkmanCharmSvg: React.FC = () => (
  <svg className="layout-d-walkman-svg" width="168" height="94" viewBox="0 0 180 100" fill="none" aria-hidden="true">
    {/* Soft cel-shaded pastel drop shadow */}
    <rect x="22" y="24" width="110" height="68" rx="16" fill="#d9e8ff" opacity="0.7" />
    {/* Soda-Blue Walkman Body */}
    <rect x="16" y="18" width="110" height="68" rx="16" fill="#e5f4ff" stroke="#7eaed9" strokeWidth="2.2" />
    {/* Sakura Side Accent Band */}
    <path d="M16 34C16 25.1634 23.1634 18 32 18H44V86H32C23.1634 86 16 78.8366 16 70V34Z" fill="#ffd8e6" stroke="#e089a7" strokeWidth="2" />
    {/* Glossy anime highlight streak */}
    <path d="M24 28V44" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    {/* Top play/stop buttons */}
    <rect x="52" y="11" width="18" height="7" rx="3" fill="#ffe99c" stroke="#d4a442" strokeWidth="1.8" />
    <rect x="74" y="12" width="14" height="6" rx="3" fill="#c8f2e2" stroke="#5eb494" strokeWidth="1.8" />
    <rect x="92" y="12" width="14" height="6" rx="3" fill="#e4d6ff" stroke="#967ed6" strokeWidth="1.8" />
    {/* Cream Cassette Window */}
    <rect x="52" y="28" width="64" height="36" rx="9" fill="#fffdf8" stroke="#8eb6db" strokeWidth="2" />
    <rect x="56" y="32" width="56" height="8" rx="4" fill="#fff2c4" />
    {/* Spinning Anime Reels */}
    <g className="layout-d-reel-l">
      <circle cx="71" cy="50" r="8" fill="#ffd8e6" stroke="#dd84a3" strokeWidth="1.8" />
      <line x1="71" y1="44" x2="71" y2="56" stroke="#dd84a3" strokeWidth="1.4" />
      <line x1="65" y1="50" x2="77" y2="50" stroke="#dd84a3" strokeWidth="1.4" />
      <circle cx="71" cy="50" r="2.6" fill="#fffdf8" />
    </g>
    <g className="layout-d-reel-r">
      <circle cx="97" cy="50" r="8" fill="#cdefe3" stroke="#5eb494" strokeWidth="1.8" />
      <line x1="97" y1="44" x2="97" y2="56" stroke="#5eb494" strokeWidth="1.4" />
      <line x1="91" y1="50" x2="103" y2="50" stroke="#5eb494" strokeWidth="1.4" />
      <circle cx="97" cy="50" r="2.6" fill="#fffdf8" />
    </g>
    <line x1="79" y1="50" x2="89" y2="50" stroke="#a6b9cc" strokeWidth="1.6" strokeDasharray="3 2" />
    {/* Bottom decorative dots & label */}
    <circle cx="62" cy="75" r="3" fill="#ff9bb8" />
    <circle cx="72" cy="75" r="3" fill="#ffd978" />
    <circle cx="82" cy="75" r="3" fill="#82dbb9" />
    <rect x="92" y="72.5" width="22" height="5" rx="2.5" fill="#d0e4f8" />
    {/* Floating Anime Sparkles & Music Note */}
    <g className="layout-d-float-note">
      <path d="M148 56V30L166 25V51" stroke="#e4789c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="144" cy="56" r="5" fill="#ffd4e2" stroke="#e4789c" strokeWidth="2" />
      <circle cx="162" cy="51" r="5" fill="#cdefe3" stroke="#5eb494" strokeWidth="2" />
    </g>
    {/* 4-point anime sparkles */}
    <path className="layout-d-sparkle-1" d="M136 12L138 18L144 20L138 22L136 28L134 22L128 20L134 18Z" fill="#ffd466" />
    <path className="layout-d-sparkle-2" d="M158 72L159.5 76.5L164 78L159.5 79.5L158 84L156.5 79.5L152 78L156.5 76.5Z" fill="#ff9bb8" />
    <path className="layout-d-sparkle-3" d="M8 22L9.2 25.8L13 27L9.2 28.2L8 32L6.8 28.2L3 27L6.8 25.8Z" fill="#8ad8ff" />
  </svg>
);

/* ============ Layout D: 分屏首页 + 横向货架 (Fresh Anime Sticky-Note Edition) ============ */
const LayoutDDemo: React.FC<{ slots: LayoutDemoSlots }> = ({ slots }) => {
  const shelfRef = useRef<HTMLDivElement>(null);

  const scrollShelf = (delta: number) => {
    const grid = shelfRef.current?.querySelector('.plugin-app-grid') as HTMLElement | null;
    if (grid) {
      grid.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  return (
    <div className="layout-d-root">
      {slots.header}
      <main>
        {/* Split Hero Spread */}
        <section className="layout-d-split-hero">
          <div className="layout-d-split-left">
            {slots.hero}

            {/* Fresh Anime 3-Step Sticky Tags */}
            <div className="layout-d-steps">
              <span className="layout-d-step is-lemon">
                <b className="font-mono">01</b> 粘贴链接
              </span>
              <span className="layout-d-step-arrow" aria-hidden="true">✦</span>
              <span className="layout-d-step is-pink">
                <b className="font-mono">02</b> 预览曲目
              </span>
              <span className="layout-d-step-arrow" aria-hidden="true">✦</span>
              <span className="layout-d-step is-mint">
                <b className="font-mono">03</b> 一键带走
              </span>
            </div>

            <div className="layout-d-hero-charm">
              <AnimeWalkmanCharmSvg />
              <div className="layout-d-charm-note font-handwriting">
                <span className="layout-d-charm-tag font-mono">SIDE A · 46MIN</span>
                <span>把喜欢的旋律折成便签，随身带走 ♪</span>
              </div>
            </div>
          </div>

          <div className="layout-d-split-right">{slots.search}</div>
        </section>

        {slots.result && <div className="layout-d-result-wrap">{slots.result}</div>}

        {/* Shelf 1: Horizontal Anime Sticky-Note Cassette Rack (No outer box!) */}
        <section className="layout-d-shelf-wrap" ref={shelfRef}>
          <div className="layout-d-section-ribbon">
            <span className="layout-d-ribbon-pill is-sky font-mono">TRACK 01 · CASSETTE SHELF</span>
            <span className="layout-d-ribbon-line" />
            <div className="layout-d-shelf-controls">
              <span className="layout-d-shelf-hint font-handwriting">左右滑动翻看</span>
              <button
                type="button"
                className="layout-d-shelf-btn"
                onClick={() => scrollShelf(-360)}
                aria-label="向左滚动卡带架"
              >
                ‹
              </button>
              <button
                type="button"
                className="layout-d-shelf-btn"
                onClick={() => scrollShelf(360)}
                aria-label="向右滚动卡带架"
              >
                ›
              </button>
            </div>
          </div>
          {slots.ecosystem}
        </section>

        {/* Shelf 2: Fanned Anime Pastel Sticky Notes */}
        <section className="layout-d-fan-wrap">
          <div className="layout-d-section-ribbon">
            <span className="layout-d-ribbon-pill is-pink font-mono">TRACK 02 · STICKY MEMOS</span>
            <span className="layout-d-ribbon-line" />
          </div>
          {slots.infoNotes}
        </section>

        {/* Spread 3: Unwrapped Fresh Anime Stats Notes */}
        <section className="layout-d-stats-wrap">
          <div className="layout-d-section-ribbon">
            <span className="layout-d-ribbon-pill is-mint font-mono">TRACK 03 · MUSIC LOG</span>
            <span className="layout-d-ribbon-line" />
          </div>
          {slots.stats}
        </section>

        {/* Spread 4: Unwrapped Developer Sticky Row + Star Ribbon Stamp */}
        <section className="layout-d-dev-wrap">
          <div className="layout-d-section-ribbon">
            <span className="layout-d-ribbon-pill is-taro font-mono">TRACK 04 · FOR DEVELOPERS</span>
            <span className="layout-d-ribbon-line" />
          </div>
          {slots.developer}
          <div className="layout-d-stamp-row">{slots.stamp}</div>
        </section>
      </main>
      {slots.footer}
    </div>
  );
};

export const LayoutDemoView: React.FC<LayoutDemoViewProps> = ({ mode, slots }) => {
  switch (mode) {
    case 'a':
      return <LayoutADemo slots={slots} />;
    case 'b':
      return <LayoutBDemo slots={slots} />;
    case 'c':
      return <LayoutCDemo slots={slots} />;
    case 'd':
      return <LayoutDDemo slots={slots} />;
  }
};
