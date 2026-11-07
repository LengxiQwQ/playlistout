import React from 'react';
import {COLORS, FONTS} from '../../theme';
import {PLAYLIST} from '../../data';
import {interpolate} from 'remotion';
import {between, clamp, springIn} from '../../lib/anim';
import {Paper, Sticker, Tape} from '../Stationery';
import {ScribbleUnderline, Sparkle, TinyMusicNotes, WavyDots} from '../Doodles';
import {InkSpinner, PlatformChipRow, ParseButton, SiteHeader} from './BrowserBits';

export const SearchPage: React.FC<{
  frame: number;
  loading: boolean;
}> = ({frame, loading}) => {
  const titleIn = between(frame, 150, 174);
  const noteIn = springIn({frame, start: 152, damping: 17, stiffness: 105});
  const typedChars = Math.round(interpolate(frame, [219, 246], [0, PLAYLIST.sourceUrl.length], {
    easing: (t: number) => 1 - Math.pow(1 - t, 2),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));
  const typed = PLAYLIST.sourceUrl.slice(0, typedChars);
  const press = interpolate(frame, [253, 257, 261], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const chipGlow = between(frame, 214, 228) * (1 - between(frame, 266, 282));
  const loadingNote = between(frame, 260, 274) * (1 - between(frame, 282, 296));
  const teaserOpacity = 0.97 * (1 - between(frame, 268, 280));
  const caretOn = Math.floor(frame / 10) % 2 === 0;
  const done = between(frame, 262, 275);

  return (
    <div style={{position: 'relative', width: 1680, height: 635}}>
      <SiteHeader />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 87,
          textAlign: 'center',
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 12}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.hand,
            fontSize: 88,
            lineHeight: 1.1,
            letterSpacing: '0.015em',
            color: COLORS.ink,
            textShadow: '2.5px 3.5px 0 rgba(65,48,12,0.16)',
            display: 'inline-block',
          }}
        >
          把你的歌单带走
          <Sparkle size={26} style={{position: 'absolute', marginLeft: 18, marginTop: 5}} rotate={14} />
        </div>
        <div
          style={{
            position: 'absolute',
            right: 102,
            top: -4,
            fontFamily: FONTS.hand,
            fontSize: 22,
            color: COLORS.orangeDeep,
            transform: 'rotate(2.5deg)',
            opacity: 0.9,
          }}
        >
          无需注册 · 干净清爽 :)
        </div>
        <div
          style={{
            fontFamily: FONTS.sans,
            fontSize: 17,
            color: COLORS.inkSoft,
            marginTop: 6,
            letterSpacing: '0.01em',
          }}
        >
          一本把你喜爱的歌单轻松带走的数字音乐手账。
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 320,
          top: 155,
          transform: 'rotate(-4deg)',
          background: 'rgba(225,239,249,0.86)',
          border: '1.2px solid rgba(71,123,150,0.42)',
          padding: '4px 11px',
          fontFamily: FONTS.mono,
          fontSize: 11.5,
          color: '#3d6677',
          opacity: 0.82,
        }}
      >
        ♪ music
      </div>

      <div
        style={{
          position: 'absolute',
          left: 220,
          top: 246,
          width: 1240,
          opacity: clamp(noteIn),
          transform: `translateY(${(1 - noteIn) * 64}px) rotate(${0.35 + (1 - noteIn) * -2}deg)`,
        }}
      >
        <Paper
          color="#fff8c9"
          textureOpacity={0.43}
          style={{
            width: 1240,
            height: 334,
            padding: '27px 38px 20px',
            boxShadow: '9px 11px 0 rgba(45,52,54,0.76), 0 18px 28px rgba(73,55,30,0.08)',
            borderWidth: 2.5,
          }}
        >
          <Tape color="pink" width={184} height={28} rotate={-7} style={{left: -46, top: -16}} opacity={0.82} />
          <Tape color="blue" width={104} height={24} rotate={5} style={{right: 50, bottom: -15}} opacity={0.74} />

          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div
              style={{
                fontFamily: FONTS.hand,
                fontSize: 29,
                fontWeight: 700,
                color: COLORS.ink,
                lineHeight: 1.1,
              }}
            >
              在这里粘贴歌单链接{' '}
              <span style={{fontFamily: FONTS.sans, fontSize: 23, color: COLORS.inkSoft}}>↓</span>
            </div>
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 11.5,
                fontWeight: 700,
                color: '#1d4ed8',
                border: '1.5px solid #6d9edc',
                background: '#edf5ff',
                borderRadius: 3,
                padding: '4px 8px',
                transform: 'rotate(1.3deg)',
                boxShadow: '1.5px 1.5px 0 rgba(45,52,54,0.12)',
              }}
            >
              跨平台公开歌单解析
            </div>
          </div>

          <div style={{display: 'flex', gap: 12, marginTop: 14}}>
            <div
              style={{
                height: 54,
                flex: 1,
                background: '#fffdf8',
                border: '1.5px solid rgba(45,52,54,0.22)',
                borderBottom: '2px solid rgba(45,52,54,0.3)',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                fontFamily: FONTS.mono,
                fontSize: typed ? 17 : 15,
                color: typed ? '#33404a' : '#9b9b93',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 4px rgba(82,64,39,0.045)',
              }}
            >
              {typed || '粘贴公开歌单链接、QQ 号或主页链接'}
              {typed && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 1.6,
                    height: 20,
                    background: caretOn ? COLORS.ink : 'transparent',
                    marginLeft: 2,
                  }}
                />
              )}
              {done > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: 6,
                    transform: `scale(${done}) rotate(2deg)`,
                    opacity: done,
                  }}
                >
                  <Sticker
                    bg="#dcf6e9"
                    border="#72b895"
                    ink="#176b48"
                    style={{fontFamily: FONTS.hand, fontSize: 13, padding: '3px 7px'}}
                  >
                    ✓ QQ 音乐
                  </Sticker>
                </div>
              )}
            </div>
            <ParseButton pressed={press} loading={loading} label={loading ? '解析中...' : '解析'} />
          </div>

          <div style={{marginTop: 14}}>
            <PlatformChipRow highlighted={typed.length > 4 ? 'qqmusic' : null} glow={chipGlow} />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 17,
              borderTop: '1.6px dashed rgba(45,52,54,0.22)',
              paddingTop: 12,
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: 11}}>
              {loading ? (
                <>
                  <InkSpinner size={24} frame={frame} />
                  <span style={{fontFamily: FONTS.hand, fontSize: 19, color: '#3f4d52'}}>
                    正在翻开歌单...
                  </span>
                </>
              ) : (
                <>
                  <span style={{fontSize: 14}}>✨</span>
                  <span style={{fontFamily: FONTS.hand, fontSize: 17, color: COLORS.inkSoft}}>
                    快速体验示例
                  </span>
                  <span style={{fontFamily: FONTS.sans, fontSize: 11, color: COLORS.inkMuted}}>▼</span>
                </>
              )}
            </div>
            <div
              style={{
                fontFamily: FONTS.handLatin,
                fontSize: 17,
                color: COLORS.inkMuted,
                transform: 'rotate(-1.5deg)',
                opacity: 0.88,
              }}
            >
              paste · parse · export
            </div>
          </div>
        </Paper>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 162,
          top: 452,
          transform: 'rotate(-6deg)',
          opacity: 0.9,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.handLatin,
            fontSize: 28,
            color: COLORS.inkSoft,
          }}
        >
          one link,
        </div>
        <div style={{fontFamily: FONTS.handLatin, fontSize: 28, color: COLORS.inkSoft, marginTop: -5}}>
          one little book.
        </div>
        <WavyDots width={100} style={{marginTop: 4}} rotate={-3} />
      </div>

      <div style={{position: 'absolute', right: 142, top: 392, opacity: 0.74, transform: 'rotate(5deg)'}}>
        <TinyMusicNotes />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 640,
          top: 100,
          transform: 'rotate(-9deg)',
          opacity: 0.55,
        }}
      >
        <ScribbleUnderline width={180} progress={titleIn} color="#d9b45c" strokeWidth={3} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 220,
          top: 657,
          width: 1240,
          opacity: teaserOpacity,
        }}
      >
        <Paper
          color={COLORS.paperWhite}
          style={{
            width: 1240,
            height: 405,
            padding: '24px 30px',
            boxShadow: '7px 9px 0 rgba(45,52,54,0.12)',
          }}
        >
          <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
            <div>
              <div style={{fontFamily: FONTS.hand, fontSize: 31, color: COLORS.ink, lineHeight: 1.1}}>
                把歌单带进更多地方 <span style={{fontFamily: FONTS.sans, fontSize: 22, color: COLORS.inkSoft}}>♪</span>
              </div>
              <div style={{fontFamily: FONTS.sans, fontSize: 11.5, color: COLORS.inkSoft, marginTop: 4}}>
                不只导出文件，也能继续带进支持的开源播放器。
              </div>
            </div>
            <Sticker
              bg="#fff3b7"
              border="#d3b05a"
              ink="#6e541b"
              rotate={2}
              style={{fontFamily: FONTS.hand, fontSize: 13, padding: '4px 9px', boxShadow: '2px 2px 0 rgba(45,52,54,0.15)'}}
            >
              3 款已支持
            </Sticker>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 15}}>
            {[
              {name: 'MusicFree', tag: '插件', color: '#e4f7ec', border: '#7cc49b', ink: '#1e6b4c', text: '导入外部歌单，粘贴链接'},
              {name: '洛雪音乐', tag: 'JSON', color: '#ede8fa', border: '#a895cc', ink: '#4a376f', text: '我的列表 → 导入列表'},
              {name: 'Listen 1', tag: 'JSON', color: '#fbeaf0', border: '#d69bb0', ink: '#7d3d53', text: '设置 → 备份与恢复'},
            ].map((item, i) => (
              <div
                key={item.name}
                style={{
                  height: 112,
                  background: item.color,
                  border: `1px solid ${item.border}`,
                  borderRadius: 5,
                  padding: '11px 12px',
                  transform: `rotate(${i === 1 ? 0.5 : i === 0 ? -0.4 : 0.8}deg)`,
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <span style={{fontFamily: FONTS.hand, fontSize: 21, color: item.ink}}>{item.name}</span>
                  <span style={{fontFamily: FONTS.mono, fontSize: 8.5, color: item.ink, border: `1px solid ${item.border}`, borderRadius: 10, padding: '1px 5px'}}>
                    {item.tag}
                  </span>
                </div>
                <div style={{fontFamily: FONTS.sans, fontSize: 9.5, color: '#607070', marginTop: 5}}>{item.text}</div>
              </div>
            ))}
          </div>
        </Paper>
      </div>

      {loadingNote > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 960,
            top: 586,
            transform: `translate(-50%, ${(1 - loadingNote) * -12}px) rotate(-1.5deg)`,
            opacity: loadingNote,
            zIndex: 20,
          }}
        >
          <Paper
            color="#fffdf6"
            borderWidth={1.5}
            style={{
              padding: '7px 16px',
              boxShadow: '3px 4px 0 rgba(45,52,54,0.13)',
              fontFamily: FONTS.hand,
              fontSize: 16,
              color: COLORS.inkSoft,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{width: 7, height: 7, borderRadius: '50%', background: '#e6a33e'}} />
            歌单正在从 QQ 音乐出发
            <span style={{fontFamily: FONTS.handLatin, fontSize: 17}}>…</span>
          </Paper>
        </div>
      )}
    </div>
  );
};
