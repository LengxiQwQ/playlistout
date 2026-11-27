import React from 'react';

export const BackgroundDecorations: React.FC = () => {
  return (
    <div
      className="background-decorations"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: -1,
      }}
      aria-hidden="true"
    >
      {/* Act 0 Sticker 1 (Top Left): Strawberry Macaron Cassette Sticker */}
      <div
        className="hero-deco-pop-1"
        style={{
          position: 'absolute',
          top: '185px',
          left: '0.5rem',
          ['--rot' as any]: '-9deg',
        }}
      >
        <div
          className="stationery-sticker delay-1"
          style={{
            ['--sticker-rot' as any]: '-9deg',
            opacity: 0.92,
          }}
        >
          <svg width="78" height="54" viewBox="0 0 78 54" fill="none">
            <rect x="3" y="3" width="72" height="48" rx="9" fill="var(--bg-surface)" stroke="var(--bg-surface)" strokeWidth="5" />
            <rect x="5" y="5" width="68" height="44" rx="7" fill="var(--tint-strawberry-bg)" stroke="var(--line-ink)" strokeWidth="2.2" />
            <rect x="11" y="11" width="56" height="22" rx="4" fill="var(--bg-sunken)" stroke="var(--line-ink)" strokeWidth="1.8" />
            <path d="M11 18H67" stroke="var(--accent-strawberry)" strokeWidth="2.5" />
            <circle cx="26" cy="24" r="5.5" fill="var(--tint-mint-bg)" stroke="var(--line-ink)" strokeWidth="1.8" />
            <circle cx="26" cy="24" r="2" fill="var(--line-ink)" />
            <circle cx="52" cy="24" r="5.5" fill="var(--tint-mint-bg)" stroke="var(--line-ink)" strokeWidth="1.8" />
            <circle cx="52" cy="24" r="2" fill="var(--line-ink)" />
            <rect x="34" y="21" width="10" height="6" rx="1.5" fill="var(--tint-lemon-bg)" stroke="var(--line-ink)" strokeWidth="1.4" />
            <path d="M20 49L25 39H53L58 49" fill="var(--sticker-orange)" stroke="var(--line-ink)" strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="31" cy="44" r="1.6" fill="var(--line-ink)" />
            <circle cx="47" cy="44" r="1.6" fill="var(--line-ink)" />
          </svg>
        </div>
      </div>

      {/* Act 0 Sticker 2 (Top Right): Mint & Lemon Vinyl Disc Sticker */}
      <div
        className="hero-deco-pop-2"
        style={{
          position: 'absolute',
          top: '215px',
          right: '1.1rem',
          ['--rot' as any]: '11deg',
        }}
      >
        <div
          className="stationery-sticker delay-2"
          style={{
            ['--sticker-rot' as any]: '11deg',
            opacity: 0.92,
          }}
        >
          <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
            <circle cx="34" cy="34" r="30" fill="var(--bg-surface)" stroke="var(--bg-surface)" strokeWidth="5" />
            <circle cx="34" cy="34" r="28" fill="var(--text)" stroke="var(--line-ink)" strokeWidth="2.2" />
            <path d="M16 24C20 17 26 13 34 13" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M52 44C48 51 42 55 34 55" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="34" cy="34" r="12" fill="var(--tint-mint-bg)" stroke="var(--bg-surface)" strokeWidth="2" />
            <circle cx="34" cy="34" r="7" fill="var(--tint-strawberry-bg)" />
            <circle cx="34" cy="34" r="2.8" fill="var(--bg-surface)" stroke="var(--line-ink)" strokeWidth="1.6" />
          </svg>
        </div>
      </div>
    </div>
  );
};
