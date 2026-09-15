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
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: -1, // Keep it behind everything
      }}
      aria-hidden="true"
    >
      {/* Top Left Area */}
      <div style={{ position: 'absolute', top: '5%', left: 'max(2%, calc(50% - 600px))' }}>
        <Sticker color="blue" rotateDeg={-15} style={{ opacity: 0.8, fontSize: '0.85rem', padding: '0.2rem 0.5rem' }}>
          🎵 music
        </Sticker>
      </div>

      <div style={{ position: 'absolute', top: '15%', left: 'max(5%, calc(50% - 700px))', fontSize: '2rem', color: '#cbd5e1', opacity: 0.6 }}>
        #
      </div>

      <div style={{ position: 'absolute', top: '12%', left: 'max(15%, calc(50% - 480px))' }}>
        <Tape color="pink" rotateDeg={-5} style={{ width: '3rem', height: '0.85rem', opacity: 0.5 }} />
      </div>

      {/* Top Right Area */}
      <div style={{ position: 'absolute', top: '8%', right: 'max(3%, calc(50% - 650px))' }}>
        <Tape color="yellow" rotateDeg={25} style={{ width: '4rem', height: '1.2rem', opacity: 0.7 }} />
      </div>

      <div style={{ position: 'absolute', top: '18%', right: 'max(12%, calc(50% - 500px))' }}>
        <Sticker color="red" rotateDeg={10} style={{ opacity: 0.75, fontSize: '0.8rem', padding: '0.15rem 0.45rem' }}>
          mix vol.1
        </Sticker>
      </div>

      <div style={{ position: 'absolute', top: '25%', right: 'max(1%, calc(50% - 750px))', fontSize: '3rem', color: '#e2e8f0', opacity: 0.5 }}>
        ✧
      </div>

      {/* Middle Left Area */}
      <div style={{ position: 'absolute', top: '35%', left: 'max(12%, calc(50% - 550px))', fontSize: '2.5rem', color: '#fca5a5', opacity: 0.5 }}>
        ❥
      </div>

      <div style={{ position: 'absolute', top: '45%', left: 'max(1%, calc(50% - 680px))' }}>
        <Sticker color="pink" rotateDeg={8} style={{ opacity: 0.9, fontSize: '0.9rem', padding: '0.25rem 0.6rem' }}>
          ♥ favorited
        </Sticker>
      </div>

      <div style={{ position: 'absolute', top: '52%', left: 'max(8%, calc(50% - 600px))' }}>
        <Tape color="cyan" rotateDeg={-22} style={{ width: '3.5rem', height: '1rem', opacity: 0.6 }} />
      </div>

      {/* Middle Right Area */}
      <div style={{ position: 'absolute', top: '42%', right: 'max(15%, calc(50% - 450px))', fontSize: '2.5rem', color: '#cbd5e1', opacity: 0.6 }}>
        〰〰
      </div>

      <div style={{ position: 'absolute', top: '55%', right: 'max(4%, calc(50% - 720px))' }}>
        <Tape color="green" rotateDeg={-45} style={{ width: '3rem', height: '1rem', opacity: 0.6 }} />
      </div>

      <div style={{ position: 'absolute', top: '65%', right: 'max(8%, calc(50% - 600px))', fontSize: '2.5rem', color: '#fef08a', opacity: 0.8 }}>
        ★
      </div>

      {/* Bottom Left Area */}
      <div style={{ position: 'absolute', top: '75%', left: 'max(18%, calc(50% - 450px))' }}>
        <Sticker color="yellow" rotateDeg={-12} style={{ opacity: 0.8, fontSize: '0.85rem', padding: '0.2rem 0.5rem' }}>
          chill vibes
        </Sticker>
      </div>

      <div style={{ position: 'absolute', bottom: '15%', left: 'max(6%, calc(50% - 650px))' }}>
        <Tape color="pink" rotateDeg={12} style={{ width: '5rem', height: '1.5rem', opacity: 0.7 }} />
      </div>

      <div style={{ position: 'absolute', bottom: '25%', left: 'max(2%, calc(50% - 750px))', fontSize: '3rem', color: '#cbd5e1', opacity: 0.5 }}>
        ♪
      </div>

      {/* Bottom Right Area */}
      <div style={{ position: 'absolute', bottom: '28%', right: 'max(6%, calc(50% - 650px))', fontSize: '2.5rem', color: '#94a3b8', opacity: 0.4 }}>
        ♬
      </div>

      <div style={{ position: 'absolute', bottom: '18%', right: 'max(18%, calc(50% - 420px))' }}>
        <Tape color="cyan" rotateDeg={8} style={{ width: '4rem', height: '1rem', opacity: 0.5 }} />
      </div>

      <div style={{ position: 'absolute', bottom: '10%', right: 'max(5%, calc(50% - 680px))' }}>
        <Sticker color="white" rotateDeg={-5} style={{ opacity: 0.8, fontSize: '0.85rem', padding: '0.2rem 0.5rem', border: '1px solid #e2e8f0' }}>
          PLAYLIST OUT
        </Sticker>
      </div>
    </div>
  );
};
