import React from 'react';
import { Sticker } from '../ui/Sticker';
import { Tape } from '../ui/Tape';

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
      {/* Top Left: Strawberry Macaron Cassette Sticker (anchored beside Hero & SearchNote regardless of page height) */}
      <div style={{ position: 'absolute', top: '185px', left: '0.5rem' }}>
        <Sticker color="pink" rotateDeg={-12} style={{ opacity: 0.92, fontSize: '0.88rem', padding: '0.24rem 0.65rem' }}>
          🍓 sweet mix
        </Sticker>
      </div>

      <div
        className="stationery-sticker delay-1"
        style={{
          position: 'absolute',
          top: '390px',
          left: '0.5rem',
          ['--sticker-rot' as any]: '-9deg',
          opacity: 0.9,
        }}
      >
        {/* Hand-drawn Strawberry Cassette Tape SVG Sticker */}
        <svg width="78" height="54" viewBox="0 0 78 54" fill="none">
          <rect x="3" y="3" width="72" height="48" rx="9" fill="#fffdf9" stroke="#fffdf9" strokeWidth="5" />
          <rect x="5" y="5" width="68" height="44" rx="7" fill="#ffd8e6" stroke="#6e5a50" strokeWidth="2.2" />
          <rect x="11" y="11" width="56" height="22" rx="4" fill="#fffaf2" stroke="#6e5a50" strokeWidth="1.8" />
          <path d="M11 18H67" stroke="#f4a7b9" strokeWidth="2.5" />
          <circle cx="26" cy="24" r="5.5" fill="#d8f3e8" stroke="#6e5a50" strokeWidth="1.8" />
          <circle cx="26" cy="24" r="2" fill="#6e5a50" />
          <circle cx="52" cy="24" r="5.5" fill="#d8f3e8" stroke="#6e5a50" strokeWidth="1.8" />
          <circle cx="52" cy="24" r="2" fill="#6e5a50" />
          <rect x="34" y="21" width="10" height="6" rx="1.5" fill="#fff0b3" stroke="#6e5a50" strokeWidth="1.4" />
          <path d="M20 49L25 39H53L58 49" fill="#ffe9dc" stroke="#6e5a50" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="31" cy="44" r="1.6" fill="#6e5a50" />
          <circle cx="47" cy="44" r="1.6" fill="#6e5a50" />
        </svg>
      </div>

      {/* Top Right: Lemon Washi Tape + Mint Vinyl Disc Sticker (anchored beside SearchNote) */}
      <div style={{ position: 'absolute', top: '215px', right: '1rem' }}>
        <Tape color="yellow" rotateDeg={22} style={{ width: '4.4rem', height: '1.25rem', opacity: 0.82 }} />
      </div>

      <div
        className="stationery-sticker delay-2"
        style={{
          position: 'absolute',
          top: '380px',
          right: '1.1rem',
          ['--sticker-rot' as any]: '11deg',
          opacity: 0.9,
        }}
      >
        {/* Hand-drawn Mint & Lemon Vinyl Record Sticker */}
        <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
          <circle cx="34" cy="34" r="30" fill="#fffdf9" stroke="#fffdf9" strokeWidth="5" />
          <circle cx="34" cy="34" r="28" fill="#5a4a42" stroke="#6e5a50" strokeWidth="2.2" />
          <path d="M16 24C20 17 26 13 34 13" stroke="#8a7569" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M52 44C48 51 42 55 34 55" stroke="#8a7569" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="34" cy="34" r="12" fill="#cdeee0" stroke="#fffdf9" strokeWidth="2" />
          <circle cx="34" cy="34" r="7" fill="#ffd8e6" />
          <circle cx="34" cy="34" r="2.8" fill="#fffdf9" stroke="#6e5a50" strokeWidth="1.6" />
        </svg>
      </div>

      {/* Middle Left: Sakura Blossom + Taro Lavender Headphones Sticker (in outer gutter) */}
      <div style={{ position: 'absolute', top: '38%', left: '-1.5rem', fontSize: '2.1rem', color: '#f39bb5', opacity: 0.78 }}>
        ✿
      </div>

      <div
        className="stationery-sticker delay-3"
        style={{
          position: 'absolute',
          top: '57%',
          left: '-3.2rem',
          ['--sticker-rot' as any]: '-8deg',
          opacity: 0.88,
        }}
      >
        {/* Hand-drawn Taro Headphones Sticker */}
        <svg width="68" height="64" viewBox="0 0 68 64" fill="none">
          <path d="M14 36V30C14 18.9543 22.9543 10 34 10C45.0457 10 54 18.9543 54 30V36" stroke="#fffdf9" strokeWidth="9" strokeLinecap="round" />
          <path d="M14 36V30C14 18.9543 22.9543 10 34 10C45.0457 10 54 18.9543 54 30V36" stroke="#6e5a50" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M19 25C22 18 27.5 14 34 14C40.5 14 46 18 49 25" stroke="#e8ddff" strokeWidth="4" strokeLinecap="round" />
          <rect x="7" y="31" width="13" height="22" rx="6.5" fill="#e8ddff" stroke="#6e5a50" strokeWidth="2.2" />
          <rect x="48" y="31" width="13" height="22" rx="6.5" fill="#ffd8e6" stroke="#6e5a50" strokeWidth="2.2" />
          <circle cx="13.5" cy="42" r="2.5" fill="#fffdf9" />
          <circle cx="54.5" cy="42" r="2.5" fill="#fffdf9" />
        </svg>
      </div>

      {/* Middle Right: Perforated Music Postage Stamp + Matcha Tape + Star (in outer gutter) */}
      <div
        className="stationery-sticker"
        style={{
          position: 'absolute',
          top: '37.5%',
          right: '-3.2rem',
          ['--sticker-rot' as any]: '7deg',
          opacity: 0.88,
        }}
      >
        {/* Perforated Music Postage Stamp */}
        <svg width="64" height="74" viewBox="0 0 64 74" fill="none">
          <rect x="5" y="5" width="54" height="64" rx="4" fill="#fffdf9" stroke="#e8a0b4" strokeWidth="2.2" strokeDasharray="4 3" />
          <rect x="11" y="11" width="42" height="44" rx="3" fill="#fff4c7" stroke="#6e5a50" strokeWidth="1.6" />
          <path d="M27 41V23L41 20V38" stroke="#6e5a50" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="24" cy="41" r="4" fill="#ec7f9f" stroke="#6e5a50" strokeWidth="1.6" />
          <circle cx="38" cy="38" r="4" fill="#7fcfaa" stroke="#6e5a50" strokeWidth="1.6" />
          <text x="32" y="64" textAnchor="middle" fill="#8a7569" fontSize="8.5" fontWeight="700" fontFamily="Space Mono, monospace">80¢ NOTE</text>
        </svg>
      </div>

      <div style={{ position: 'absolute', top: '54.5%', right: '-1.5rem' }}>
        <Tape color="green" rotateDeg={-38} style={{ width: '3.4rem', height: '1.05rem', opacity: 0.72 }} />
      </div>

      <div style={{ position: 'absolute', top: '65%', right: '-0.8rem', fontSize: '2.2rem', color: '#f2c94c', opacity: 0.82 }}>
        ★
      </div>

      {/* Bottom Left: Washi Tape + Floating Musical Note Badge */}
      <div style={{ position: 'absolute', bottom: '15%', left: 'max(5.5%, calc(50% - 645px))' }}>
        <Tape color="pink" rotateDeg={12} style={{ width: '4.8rem', height: '1.35rem', opacity: 0.78 }} />
      </div>

      <div style={{ position: 'absolute', bottom: '24%', left: 'max(2.5%, calc(50% - 690px))', fontSize: '2.4rem', color: '#e8955a', opacity: 0.68 }}>
        ♪
      </div>

      {/* Bottom Right: Taro Washi Tape + PLAYLIST OUT Stamp Sticker */}
      <div style={{ position: 'absolute', bottom: '27%', right: 'max(6%, calc(50% - 645px))', fontSize: '2.1rem', color: '#b99ef0', opacity: 0.68 }}>
        ♬
      </div>

      <div style={{ position: 'absolute', bottom: '18%', right: 'max(16%, calc(50% - 430px))' }}>
        <Tape color="taro" rotateDeg={8} style={{ width: '4rem', height: '1.05rem', opacity: 0.72 }} />
      </div>

      <div className="background-decoration-playlistout" style={{ position: 'absolute', bottom: '14.5%', right: 'max(5.5%, calc(50% - 645px))' }}>
        <Sticker color="yellow" rotateDeg={-5} style={{ opacity: 0.9, fontSize: '0.82rem', padding: '0.22rem 0.6rem' }}>
          ✦ PLAYLIST OUT
        </Sticker>
      </div>
    </div>
  );
};
