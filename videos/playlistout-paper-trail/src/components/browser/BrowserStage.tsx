import React from 'react';
import {LOGO_128} from '../../assets';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, FONTS} from '../../theme';
import {between, clamp, easeInOutCubic, springIn} from '../../lib/anim';
import {Tape} from '../Stationery';
import {SearchPage} from './SearchPage';
import {ResultPage} from './ResultPage';
import {BatchPage} from './BatchPage';
import {Cursor} from './BrowserBits';

const BROWSER = {left: 116, top: 58, width: 1688, height: 966, chrome: 58};

const BrowserChrome: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      position: 'absolute',
      left: BROWSER.left,
      top: BROWSER.top,
      width: BROWSER.width,
      height: BROWSER.height,
      background: '#fcf8ef',
      border: '2px solid rgba(45,52,54,0.92)',
      borderRadius: 10,
      boxShadow: '16px 20px 0 rgba(45,52,54,0.16), 0 34px 58px rgba(69,52,28,0.16)',
      overflow: 'visible',
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: BROWSER.chrome,
        background: '#f6efe2',
        borderBottom: '1.5px solid rgba(45,52,54,0.38)',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div style={{position: 'absolute', left: 18, top: 22, display: 'flex', gap: 7}}>
        {['#ef8f84', '#ecc45f', '#8bc99f'].map((c) => (
          <div key={c} style={{width: 10, height: 10, borderRadius: '50%', background: c, border: '1px solid rgba(45,52,54,0.22)'}} />
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 74,
          top: 8,
          height: 37,
          width: 330,
          background: '#fffdf7',
          border: '1.3px solid rgba(45,52,54,0.55)',
          borderBottom: 'none',
          borderRadius: '6px 6px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
        }}
      >
        <img src={LOGO_128} alt="" style={{width: 18, height: 18}} />
        <span
          style={{
            fontFamily: FONTS.sans,
            fontSize: 10.5,
            color: '#475154',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          把你的歌单带走 - 在线歌单导出工具
        </span>
        <span style={{marginLeft: 'auto', fontFamily: FONTS.sans, fontSize: 12, color: '#8a8f92'}}>×</span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 420,
          top: 16,
          width: 22,
          height: 22,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: '#697174',
          fontFamily: FONTS.sans,
          fontSize: 16,
          border: '1px dashed rgba(45,52,54,0.25)',
        }}
      >
        +
      </div>

      <div
        style={{
          position: 'absolute',
          left: 468,
          top: 13,
          width: 665,
          height: 30,
          background: '#f9f4e8',
          border: '1.2px solid rgba(45,52,54,0.16)',
          borderRadius: 99,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 7,
          color: '#6b7476',
        }}
      >
        <span style={{fontSize: 10, opacity: 0.75}}>▣</span>
        <span style={{fontFamily: FONTS.mono, fontSize: 10.5, letterSpacing: '-0.01em'}}>
          playlistout.lengxiqwq.com
        </span>
        <span style={{marginLeft: 'auto', fontSize: 9.5, color: '#a09f97', fontFamily: FONTS.sans}}>安全连接</span>
      </div>

      <div style={{position: 'absolute', right: 22, top: 18, display: 'flex', gap: 13, color: '#7d8485', fontSize: 13}}>
        <span>↻</span>
        <span>⌁</span>
        <span>⋯</span>
      </div>
    </div>

    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: BROWSER.chrome,
        bottom: 0,
        background: COLORS.paper,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(to bottom, transparent 0 50px, rgba(182,166,143,0.30) 50px 51px)',
          backgroundSize: '100% 51px',
          opacity: 0.8,
        }}
      />
      <div
        className="paper-texture"
        style={{position: 'absolute', inset: 0, opacity: 0.4, mixBlendMode: 'multiply'}}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 70,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.36), transparent)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>

    <Tape
      color="green"
      width={170}
      height={32}
      rotate={-7}
      opacity={0.84}
      style={{left: -82, top: -18, zIndex: 10}}
    />
    <Tape
      color="pink"
      width={134}
      height={27}
      rotate={5}
      opacity={0.72}
      style={{right: 92, top: -13, zIndex: 10}}
    />
  </div>
);

export const BrowserStage: React.FC = () => {
  const frame = useCurrentFrame();

  const entrySpring = springIn({frame, start: 150, damping: 20, stiffness: 80, mass: 1.1});
  const entry = clamp(entrySpring);
  const entryY = interpolate(entrySpring, [0, 1], [690, 0]);
  const entryRot = interpolate(entrySpring, [0, 1], [1.8, -0.08]);
  const visible = frame >= 150 && frame < 1088;

  const pageTurn = (() => {
    if (frame < 756) return 0;
    if (frame < 762) return easeInOutCubic(between(frame, 756, 762)) * 0.5;
    if (frame < 770) return 0.5;
    if (frame < 778) return 0.5 + easeInOutCubic(between(frame, 770, 778)) * 0.5;
    return 1;
  })();
  const batchIn = between(frame, 744, 768);

  const scroll = (() => {
    if (frame < 266) return 0;
    if (frame < 292) return interpolate(frame, [266, 292], [0, 270], {easing: Easing.bezier(0.4, 0, 0.2, 1)});
    if (frame < 345) return interpolate(frame, [292, 345], [270, 340]);
    if (frame < 380) return interpolate(frame, [345, 380], [340, 400]);
    if (frame < 425) return interpolate(frame, [380, 425], [400, 860], {easing: Easing.bezier(0.25, 0.6, 0.3, 1)});
    return 860;
  })();

  const unroll = easeInOutCubic(between(frame, 271, 294));
  const jsonSelected = frame >= 447;
  const selectedTick = between(frame, 447, 454);
  const exportPress = (() => {
    if (frame < 474) return 0;
    if (frame < 479) return interpolate(frame, [474, 479], [0, 1]);
    if (frame < 484) return interpolate(frame, [479, 484], [1, 0]);
    return 0;
  })();
  const toast = (() => {
    if (frame < 483) return 0;
    if (frame < 490) return interpolate(frame, [483, 490], [0, 1]);
    if (frame < 520) return 1;
    return interpolate(frame, [520, 530], [1, 0], {extrapolateRight: 'clamp'});
  })();

  const batchSelect = between(frame, 815, 833);
  const batchPress = (() => {
    if (frame < 837) return 0;
    if (frame < 842) return interpolate(frame, [837, 842], [0, 1]);
    if (frame < 850) return interpolate(frame, [842, 850], [1, 0]);
    return 0;
  })();
  const exportState = between(frame, 842, 855);
  const progress = easeInOutCubic(between(frame, 844, 900));

  const searchVeil = between(frame, 488, 500) * (1 - batchIn);
  const batchVeil = between(frame, 898, 910);

  const cursor = (() => {
    if (frame >= 236 && frame <= 272) {
      const enter = easeInOutCubic(between(frame, 236, 255));
      const out = between(frame, 264, 272);
      return {
        x: interpolate(enter, [0, 1], [1640, 1494]) + out * 24,
        y: interpolate(enter, [0, 1], [742, 458]) + out * 26,
        opacity: Math.min(1, enter * 1.4) * (1 - out),
        pressed: interpolate(frame, [253, 257, 261], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
      };
    }
    if (frame >= 416 && frame <= 494) {
      const toJson = easeInOutCubic(between(frame, 416, 447));
      const toButton = easeInOutCubic(between(frame, 457, 474));
      let xx = interpolate(toJson, [0, 1], [1640, 468]);
      let yy = interpolate(toJson, [0, 1], [760, 568]);
      if (frame >= 457) {
        xx = interpolate(toButton, [0, 1], [468, 1384]);
        yy = interpolate(toButton, [0, 1], [568, 520]);
      }
      const opacity =
        interpolate(frame, [416, 424], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) *
        (1 - between(frame, 489, 494));
      const pressed = frame >= 445 && frame < 451 ? interpolate(frame, [445, 447, 451], [0, 1, 0]) : exportPress;
      return {x: xx, y: yy, opacity, pressed};
    }
    if (frame >= 810 && frame <= 857) {
      const enter = easeInOutCubic(between(frame, 810, 838));
      return {
        x: interpolate(enter, [0, 1], [1600, 390]),
        y: interpolate(enter, [0, 1], [780, 428]),
        opacity: Math.min(1, enter * 1.6) * (1 - between(frame, 844, 851)),
        pressed: batchPress,
      };
    }
    return {x: 0, y: 0, opacity: 0, pressed: 0};
  })();

  if (!visible) return null;

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: interpolate(frame, [150, 154], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          transform: `translateY(${entryY}px) rotate(${entryRot}deg) scale(${
            1 + 0.009 * Math.sin(clamp(between(frame, 300, 470)) * Math.PI)
          })`,
          transformOrigin: '50% 60%',
        }}
      >
        <BrowserChrome>
          <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 1,
                zIndex: 5,
                display: pageTurn >= 0.5 ? 'none' : 'block',
                background: COLORS.paper,
              }}
            >
              <div
                className="paper-texture"
                style={{position: 'absolute', inset: 0, opacity: 0.28, mixBlendMode: 'multiply'}}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  transform: `translateY(${-scroll}px)`,
                }}
              >
                <SearchPage frame={frame} loading={frame >= 258 && frame < 296} />
                <div style={{position: 'absolute', left: 0, top: 635}}>
                  <ResultPage
                    frame={frame}
                    jsonSelected={jsonSelected}
                    exportPress={exportPress}
                    selectedTick={selectedTick}
                    toast={toast}
                    unroll={unroll}
                  />
                </div>
              </div>

            </div>

            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: batchIn,
                transform: `translateY(${(1 - batchIn) * 18}px)`,
                zIndex: 4,
              }}
            >
              <BatchPage
                frame={frame}
                selectedAll={batchSelect}
                press={batchPress}
                exportState={exportState}
                progress={progress}
                pageIn={batchIn}
              />
            </div>

            {pageTurn > 0 && pageTurn < 1 && (() => {
              const sheetY = pageTurn < 0.5
                ? 104 - (pageTurn / 0.5) * 104
                : -((pageTurn - 0.5) / 0.5) * 104;
              return (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 12,
                    transform: `translateY(${sheetY}%)`,
                    background: '#f7efdf',
                    boxShadow: '0 -18px 34px rgba(60,45,25,0.18)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    className="paper-texture"
                    style={{position: 'absolute', inset: 0, opacity: 0.52, mixBlendMode: 'multiply'}}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage:
                        'linear-gradient(to bottom, transparent 0 50px, rgba(182,166,143,0.35) 50px 51px)',
                      backgroundSize: '100% 51px',
                      opacity: 0.75,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 164,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: COLORS.margin,
                      opacity: 0.56,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 0,
                      height: 44,
                      background: 'linear-gradient(to bottom, rgba(45,52,54,0.17), transparent)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: '42%',
                      textAlign: 'center',
                      transform: 'rotate(-1deg)',
                    }}
                  >
                    <div style={{fontFamily: FONTS.marker, fontSize: 15, letterSpacing: '0.28em', color: '#7f6f57'}}>
                      NEXT PAGE · 02
                    </div>
                    <div style={{fontFamily: FONTS.hand, fontSize: 76, color: COLORS.ink, marginTop: 5}}>
                      批量手账
                    </div>
                    <div style={{fontFamily: FONTS.hand, fontSize: 27, color: '#4f473a', marginTop: 3}}>
                      把 12 张歌单，收进同一本。
                    </div>
                    <div style={{fontFamily: FONTS.handLatin, fontSize: 20, color: '#8a795f', marginTop: 4}}>
                      one collection, one little book.
                    </div>
                    <div style={{display: 'flex', justifyContent: 'center', marginTop: 12}}>
                      <div
                        style={{
                          width: 240,
                          height: 1.5,
                          background: '#b7a78d',
                          transform: 'rotate(-0.8deg)',
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      right: 38,
                      top: 34,
                      width: 94,
                      height: 30,
                      background: 'rgba(240,199,159,0.5)',
                      transform: 'rotate(5deg)',
                      clipPath: 'polygon(1% 12%, 99% 0%, 100% 90%, 0% 100%)',
                    }}
                  />
                </div>
              );
            })()}

            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#f6f1e5',
                opacity: searchVeil * 0.46 + batchVeil * 0.22,
                pointerEvents: 'none',
                zIndex: 20,
              }}
            />

          </div>
        </BrowserChrome>
      </div>

      <Cursor
        x={cursor.x}
        y={cursor.y}
        opacity={cursor.opacity}
        pressed={cursor.pressed}
        scale={frame > 800 ? 0.95 : 1.02}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(45,39,29,0.20)',
          opacity: between(frame, 1065, 1086),
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
