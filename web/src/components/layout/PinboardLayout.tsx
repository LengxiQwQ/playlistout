import React from 'react';

export interface PinboardLayoutSlots {
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
}

const PushpinSvg: React.FC<{ color: string; rim: string; className?: string }> = ({
  color,
  rim,
  className = '',
}) => (
  <svg
    className={`layout-b-pushpin ${className}`.trim()}
    width="28"
    height="28"
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
  >
    <ellipse cx="17.5" cy="24.5" rx="7.5" ry="3.2" fill="rgba(122, 86, 68, 0.22)" />
    <circle cx="15.5" cy="14.5" r="10.5" fill={color} stroke={rim} strokeWidth="2" />
    <circle cx="15.5" cy="14.5" r="5.5" fill="rgba(255,255,255,0.28)" />
    <ellipse
      cx="12"
      cy="10.5"
      rx="3.2"
      ry="1.8"
      transform="rotate(-28 12 10.5)"
      fill="rgba(255,255,255,0.85)"
    />
  </svg>
);

const BinderClipSvg: React.FC = () => (
  <svg
    className="layout-b-binder-clip"
    width="76"
    height="44"
    viewBox="0 0 76 44"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M24 22C24 8 31 3 38 3C45 3 52 8 52 22"
      stroke="#d5a48e"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    <path
      d="M29 22C29 12 33 8 38 8C43 8 47 12 47 22"
      stroke="#ebd0c2"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <rect x="13" y="21" width="50" height="20" rx="6" fill="rgba(130, 92, 76, 0.16)" />
    <rect x="12" y="18" width="52" height="20" rx="6" fill="#ffd4e1" stroke="#e48ea8" strokeWidth="2" />
    <rect x="18" y="23" width="40" height="4" rx="2" fill="rgba(255,255,255,0.72)" />
    <circle cx="22" cy="31" r="2" fill="#e48ea8" />
    <circle cx="54" cy="31" r="2" fill="#e48ea8" />
  </svg>
);

/**
 * Default mobile pinboard layout (<= 768px: 软木板拼贴).
 */
export const PinboardLayout: React.FC<{ slots: PinboardLayoutSlots }> = ({ slots }) => {
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
            <div className="layout-b-cell layout-b-cell-ecosystem">{slots.ecosystem}</div>

            <div className="layout-b-cell layout-b-cell-side-notes">
              <div className="layout-b-stamp-box">
                <PushpinSvg color="#ffb4c9" rim="#de7e9a" className="is-card-pin is-small" />
                {slots.stamp}
              </div>
              {slots.infoNotes}
            </div>

            <div className="layout-b-cell layout-b-cell-stats">{slots.stats}</div>

            <div className="layout-b-cell layout-b-cell-developer">{slots.developer}</div>
          </div>
        </section>
      </main>
      {slots.footer}
    </div>
  );
};
