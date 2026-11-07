import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, FONTS} from '../theme';
import {PLAYLIST, TRACKS} from '../data';
import {between, clamp, easeInOutCubic, springIn} from '../lib/anim';
import {Paper, Sticker, Tape} from '../components/Stationery';
import {HandArrow, ScribbleUnderline, Sparkle, Star} from '../components/Doodles';

const ROW_TEXT = [
  '魔女 / 花谱 / 魔女 / 03:47 / normal',
  'さよならの速度 / 鎖那 / Hush a by little girl / 04:12 / normal',
  'ハロ/ハワユ / 鹿乃 / one / 04:25 / normal',
  '不可解 / 花谱 / 不可解 / 04:08 / vip',
  '愛の詩 / 鎖那 / 愛の詩 / 03:58 / normal',
  '小夜子 / 鹿乃 / 小夜子 / 04:31 / normal',
  'メルの黄昏 / 花谱 / メルの黄昏 / 04:02 / normal',
  'その可能性 / 鎖那 / その可能性 / 03:44 / unplayable',
];

const FlyingRows: React.FC<{frame: number}> = ({frame}) => {
  const start = 487;
  const end = 534;
  const t = between(frame, start, end);
  if (frame < start || frame > 540) return null;
  const gather = easeInOutCubic(t);

  return (
    <AbsoluteFill style={{pointerEvents: 'none', zIndex: 10}}>
      {ROW_TEXT.map((text, i) => {
        const delay = i * 2.2;
        const local = clamp((frame - start - delay) / (end - start));
        const angle = (i / ROW_TEXT.length) * Math.PI * 2;
        const startX = 960 + Math.cos(angle) * (260 + (i % 3) * 60);
        const startY = 585 + Math.sin(angle) * (130 + (i % 2) * 45);
        const endX = 960 + (i % 2 ? 28 : -26);
        const endY = 520 + i * 2;
        const x = interpolate(local, [0, 1], [startX, endX]);
        const y = interpolate(local, [0, 1], [startY, endY]);
        const rot = interpolate(local, [0, 0.7, 1], [angle * 16, -12 + i * 4, -28 + i * 5]);
        const scale = interpolate(local, [0, 0.6, 1], [0.8, 1.05, 0.18]);
        const opacity = interpolate(local, [0, 0.15, 0.78, 1], [0, 1, 0.92, 0]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 570,
              height: 32,
              background: i % 2 ? '#fff8dc' : '#fffdf5',
              border: '1.2px solid rgba(45,52,54,0.34)',
              boxShadow: '2.5px 3.5px 0 rgba(45,52,54,0.16)',
              transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`,
              opacity,
              display: 'flex',
              alignItems: 'center',
              padding: '0 11px',
              gap: 8,
              fontFamily: FONTS.mono,
              fontSize: 10.5,
              color: '#414d51',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{color: '#a2a7a5', fontSize: 9}}>0{i + 1}</span>
            <span style={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis'}}>{text}</span>
            <span style={{fontSize: 8, color: '#a2a7a5'}}>▤</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const SyntaxLine: React.FC<{indent?: number; children: React.ReactNode; dim?: boolean}> = ({
  indent = 0,
  children,
  dim = false,
}) => (
  <div
    style={{
      paddingLeft: 12 + indent * 15,
      height: 25,
      display: 'flex',
      alignItems: 'center',
      fontFamily: FONTS.mono,
      fontSize: 12.5,
      color: dim ? '#8fa5b3' : '#d9e8f4',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

const XlsxCard: React.FC<{frame: number; appear: number}> = ({frame, appear}) => {
  const detail = between(frame, 616, 638);
  const focus = between(frame, 600, 620) * (1 - between(frame, 660, 676));
  const scale = interpolate(appear, [0, 1], [0.76, 1]);
  return (
    <div
      style={{
        position: 'absolute',
        left: 430,
        top: 278,
        width: 650,
        transform: `translateY(${(1 - appear) * 28 + Math.sin(frame / 42) * 2.2}px) scale(${scale}) rotate(${-1.4 + (1 - appear) * -4 + Math.sin(frame / 55) * 0.22}deg)`,
        opacity: appear,
        filter: focus > 0.3 ? 'drop-shadow(0 0 18px rgba(230,166,58,0.22))' : 'none',
      }}
    >
      <Paper
        color="#fbfdf9"
        borderColor={COLORS.excelDark}
        borderWidth={2}
        style={{width: 650, height: 470, boxShadow: '11px 14px 0 rgba(27,122,82,0.20), 0 24px 34px rgba(55,61,48,0.15)'}}
      >
        <Tape color="green" width={102} height={22} rotate={-6} style={{left: 20, top: -12}} opacity={0.8} />
        <div
          style={{
            height: 44,
            background: COLORS.excel,
            color: '#f8fff9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <div
              style={{
                width: 21,
                height: 23,
                background: '#37a877',
                border: '1px solid #e5fff3',
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                fontFamily: FONTS.mono,
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              X
            </div>
            <span style={{fontFamily: FONTS.sans, fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.01em'}}>
              【QQ 音乐】花谱、鎖那、鹿乃 - 琴心月满.xlsx
            </span>
          </div>
          <div style={{display: 'flex', gap: 6, fontSize: 13, opacity: 0.8}}>
            <span>−</span>
            <span>□</span>
            <span>×</span>
          </div>
        </div>

        <div style={{height: 33, background: '#e8f4ee', display: 'flex', alignItems: 'center', gap: 16, padding: '0 12px', borderBottom: '1px solid #b8d8c8'}}>
          <div style={{display: 'flex', gap: 5}}>
            {['文件', '开始', '插入', '数据'].map((tab, i) => (
              <span
                key={tab}
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 9,
                  color: i === 0 ? '#14533c' : '#6e8579',
                  borderBottom: i === 0 ? '2px solid #1b7a52' : 'none',
                  padding: '7px 3px 4px',
                }}
              >
                {tab}
              </span>
            ))}
          </div>
          <div
            style={{
              marginLeft: 'auto',
              height: 17,
              width: 430,
              background: '#fbfdf9',
              border: '1px solid #c7dacf',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              padding: '0 7px',
              fontFamily: FONTS.mono,
              fontSize: 8.5,
              color: '#6b8276',
            }}
          >
            fx &nbsp; {detail > 0.4 ? 'A1' : ''}
          </div>
        </div>

        <div
          style={{
            margin: '10px 12px 0',
            border: '1px solid #c9d9d0',
            background: '#fff',
            height: detail > 0.15 ? 300 : 268,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '26px 154px 85px 160px 50px 58px 36px 1fr',
              background: '#eaf4ee',
              borderBottom: '1px solid #b9d3c5',
              fontFamily: FONTS.mono,
              fontSize: 8.5,
              fontWeight: 700,
              color: '#405b4e',
              height: 17,
            }}
          >
            {['', 'A', 'B', 'C', 'D', 'E', 'F', 'G'].map((col) => (
              <div
                key={col || 'corner'}
                style={{
                  padding: '2px 5px',
                  borderRight: '1px solid #d5e3da',
                  textAlign: 'center',
                  background: col ? '#eaf4ee' : '#dcebe3',
                }}
              >
                {col}
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '26px 154px 85px 160px 50px 58px 36px 1fr',
              background: '#dff3e8',
              borderBottom: '1px solid #c6dacd',
              fontFamily: FONTS.mono,
              fontSize: 8.3,
              fontWeight: 700,
              color: '#1b5d43',
              height: 21,
              alignItems: 'stretch',
            }}
          >
            <div style={{padding: '5px 3px', borderRight: '1px solid #cfe2d6', textAlign: 'center', background: '#f1f7f3'}}>1</div>
            {['title', 'artist', 'album', 'duration', 'status', 'vip', 'type'].map((cell) => (
              <div
                key={cell}
                style={{
                  padding: '5px 5px',
                  borderRight: '1px solid #cfe2d6',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {cell}
              </div>
            ))}
          </div>
          {TRACKS.map((track, idx) => (
            <div
              key={track.index}
              style={{
                display: 'grid',
                gridTemplateColumns: '26px 154px 85px 160px 50px 58px 36px 1fr',
                height: 24,
                background: idx === 3 ? '#f2fbf6' : '#fff',
                borderBottom: '1px solid #e5eee8',
                fontFamily: FONTS.mono,
                fontSize: 8.1,
                color: '#485b52',
                alignItems: 'stretch',
              }}
            >
              <div style={{padding: '5px 3px', borderRight: '1px solid #e0ebe4', textAlign: 'center', background: '#f1f7f3', color: '#7c9185'}}>
                {idx + 2}
              </div>
              <div style={{padding: '5px 5px', borderRight: '1px solid #e5eee8', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: '#243c30', fontWeight: 700}}>
                {track.title}
              </div>
              <div style={{padding: '5px 5px', borderRight: '1px solid #e5eee8', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}}>
                {track.artist}
              </div>
              <div style={{padding: '5px 5px', borderRight: '1px solid #e5eee8', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}}>
                {track.album}
              </div>
              <div style={{padding: '5px 5px', borderRight: '1px solid #e5eee8'}}>{track.duration}</div>
              <div style={{padding: '5px 5px', borderRight: '1px solid #e5eee8'}}>
                {track.status === 'unavailable' ? 'unplayable' : track.status === 'vip' ? 'vip' : 'playable'}
              </div>
              <div style={{padding: '5px 5px', borderRight: '1px solid #e5eee8', color: track.vip ? '#a16a18' : '#8b9b91'}}>
                {track.vip ? 'true' : 'false'}
              </div>
              <div style={{padding: '5px 5px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: '#7d8e83'}}>track</div>
            </div>
          ))}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 7,
              background: '#e6efe9',
              borderTop: '1px solid #d0ded5',
            }}
          />
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: 4, margin: '8px 12px 0'}}>
          <div
            style={{
              background: '#1b7a52',
              color: '#fff',
              fontFamily: FONTS.sans,
              fontSize: 9,
              padding: '3px 10px 4px',
              borderRadius: '3px 3px 0 0',
            }}
          >
            Tracks
          </div>
          <div
            style={{
              background: '#f0f5f2',
              color: '#53675b',
              fontFamily: FONTS.sans,
              fontSize: 9,
              border: '1px solid #ceddd4',
              borderBottom: 'none',
              padding: '3px 10px 4px',
              borderRadius: '3px 3px 0 0',
            }}
          >
            Playlist Info
          </div>
          <div style={{marginLeft: 'auto', fontFamily: FONTS.mono, fontSize: 8, color: '#80968a'}}>
            104 rows · 1 song / row
          </div>
        </div>

        <div style={{borderTop: '1px solid #ceddd4', height: 21, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 16}}>
          {['Sheet 1 of 2', 'Ready', '104 首'].map((label) => (
            <span key={label} style={{fontFamily: FONTS.mono, fontSize: 8, color: '#819187'}}>
              {label}
            </span>
          ))}
          <span style={{marginLeft: 'auto', fontFamily: FONTS.hand, fontSize: 13, color: '#47745f'}}>
            one song, one line ♪
          </span>
        </div>
      </Paper>

      <Sticker
        bg="#ddf5e8"
        border="#3a8e68"
        ink="#12563b"
        rotate={4}
        style={{
          position: 'absolute',
          right: -42,
          top: 56,
          fontFamily: FONTS.hand,
          fontSize: 17,
          padding: '5px 11px',
          boxShadow: '2px 2px 0 #3a8e68',
        }}
      >
        Excel · .xlsx
      </Sticker>

      <div
        style={{
          position: 'absolute',
          left: -137,
          top: 356,
          transform: 'rotate(-4deg)',
          opacity: 0.95,
        }}
      >
        <div style={{fontFamily: FONTS.hand, fontSize: 22, color: COLORS.inkSoft, lineHeight: 1.35, textAlign: 'right'}}>
          一首一行，
          <br />
          翻起来很顺手。
        </div>
        <HandArrow width={94} height={60} d="M10 53 C 38 44, 55 36, 88 15" color="#9b8b73" rotate={3} style={{marginLeft: 33}} />
      </div>

      <div
        style={{
          position: 'absolute',
          right: -146,
          top: 262,
          transform: 'rotate(2deg)',
          border: '1.4px dashed #b39c77',
          borderRadius: 4,
          padding: '7px 10px',
          fontFamily: FONTS.sans,
          fontSize: 10.5,
          color: '#756a59',
          background: 'rgba(255,252,237,0.7)',
        }}
      >
        <span style={{color: COLORS.excel, fontWeight: 700}}>Tracks</span> +{' '}
        <span style={{color: COLORS.excel, fontWeight: 700}}>Playlist Info</span>
        <br />
        两个工作表，元数据不打扰歌曲列表
      </div>

      {focus > 0.08 && (
        <svg
          width="760"
          height="550"
          viewBox="0 0 760 550"
          style={{position: 'absolute', left: -48, top: -34, opacity: focus * 0.55, pointerEvents: 'none'}}
        >
          <path
            d="M25 98c-20 128 14 284 191 352 199 76 421 50 514-52 81-89 49-250-22-324C635 2 385-12 196 28 70 55 38 70 25 98Z"
            fill="none"
            stroke="#d6a13d"
            strokeWidth="2.4"
            strokeDasharray="14 10"
          />
        </svg>
      )}
    </div>
  );
};

const JsonCard: React.FC<{frame: number; appear: number}> = ({frame, appear}) => {
  const focus = between(frame, 660, 680) * (1 - between(frame, 714, 728));
  const type = between(frame, 628, 665);
  const badge = between(frame, 675, 692);

  return (
    <div
      style={{
        position: 'absolute',
        left: 1132,
        top: 304,
        width: 514,
        transform: `translateX(${(1 - appear) * 75}px) translateY(${(1 - appear) * 26 + Math.sin(frame / 46 + 1.4) * 2.4}px) rotate(${2.3 + (1 - appear) * 4 + Math.sin(frame / 53) * 0.2}deg)`,
        opacity: appear,
        filter: focus > 0.3 ? 'drop-shadow(0 0 18px rgba(78,132,180,0.26))' : 'none',
      }}
    >
      <Paper
        color="#1c3449"
        borderColor="#254e6d"
        borderWidth={2}
        style={{
          width: 514,
          height: 420,
          boxShadow: '10px 13px 0 rgba(32,65,92,0.22), 0 22px 34px rgba(26,43,56,0.18)',
          overflow: 'hidden',
        }}
      >
        <Tape color="blue" width={108} height={23} rotate={6} style={{left: 34, top: -13}} opacity={0.8} />
        <div
          style={{
            height: 45,
            background: '#284b67',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 15px',
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <div
              style={{
                width: 23,
                height: 23,
                border: '1px solid #b6dcf7',
                borderRadius: 3,
                color: '#dcf2ff',
                display: 'grid',
                placeItems: 'center',
                fontFamily: FONTS.mono,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {'{'}
            </div>
            <span style={{fontFamily: FONTS.mono, fontSize: 11.5, color: '#f1f8fc'}}>canonical-playlist.json</span>
          </div>
          <span style={{fontFamily: FONTS.mono, fontSize: 9, color: '#9ab8ca'}}>UTF-8</span>
        </div>

        <div style={{paddingTop: 11}}>
          <SyntaxLine>
            <span style={{color: '#8db7d4'}}>{'{'}</span>
          </SyntaxLine>
          <SyntaxLine indent={1}>
            <span style={{color: '#7fd3dc'}}>"name"</span>
            <span style={{color: '#d9e8f4'}}>: </span>
            <span style={{color: '#f5d58d'}}>"{PLAYLIST.title}"</span>
            <span style={{color: '#9ab8ca'}}>,</span>
          </SyntaxLine>
          <SyntaxLine indent={1}>
            <span style={{color: '#7fd3dc'}}>"platform"</span>
            <span style={{color: '#d9e8f4'}}>: </span>
            <span style={{color: '#f5d58d'}}>"qqmusic"</span>
            <span style={{color: '#9ab8ca'}}>,</span>
          </SyntaxLine>
          <SyntaxLine indent={1}>
            <span style={{color: '#7fd3dc'}}>"trackCount"</span>
            <span style={{color: '#d9e8f4'}}>: </span>
            <span style={{color: '#f3a58d'}}>104</span>
            <span style={{color: '#9ab8ca'}}>,</span>
          </SyntaxLine>
          <SyntaxLine indent={1}>
            <span style={{color: '#7fd3dc'}}>"tracks"</span>
            <span style={{color: '#d9e8f4'}}>: [</span>
          </SyntaxLine>
          {TRACKS.slice(0, 4).map((track, i) => (
            <SyntaxLine key={track.index} indent={2}>
              <span style={{color: '#8db7d4'}}>{'{'}</span>
              <span style={{color: '#7fd3dc'}}>"title"</span>
              <span>: </span>
              <span style={{color: '#f5d58d'}}>"{track.title}"</span>
              <span>, </span>
              <span style={{color: '#7fd3dc'}}>"artist"</span>
              <span>: </span>
              <span style={{color: '#f5d58d'}}>"{track.artist}"</span>
              <span style={{color: '#8db7d4'}}>{'}'}</span>
              <span style={{color: '#9ab8ca'}}>{i < 3 ? ',' : ', …'}</span>
            </SyntaxLine>
          ))}
          <SyntaxLine indent={1}>
            <span style={{color: '#8db7d4'}}>]</span>
          </SyntaxLine>
          <SyntaxLine>
            <span style={{color: '#8db7d4'}}>{'}'}</span>
            <span style={{marginLeft: 15, color: '#7b94a5', fontSize: 10}}>
              {type > 0.4 ? '// 104 tracks · one clean schema' : ''}
            </span>
          </SyntaxLine>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(164,200,221,0.22)',
            paddingTop: 9,
          }}
        >
          <span style={{fontFamily: FONTS.mono, fontSize: 9, color: '#90acbc'}}>Playlist Out · Canonical JSON</span>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 9,
              color: '#c9ecff',
              background: 'rgba(123,193,233,0.14)',
              border: '1px solid rgba(141,197,228,0.38)',
              borderRadius: 3,
              padding: '2px 6px',
              transform: `scale(${0.8 + badge * 0.2})`,
              opacity: 0.75 + badge * 0.25,
            }}
          >
            JSON
          </span>
        </div>
      </Paper>

      <div
        style={{
          position: 'absolute',
          left: -20,
          bottom: -34,
          transform: 'rotate(-2.4deg)',
          fontFamily: FONTS.hand,
          fontSize: 18,
          color: COLORS.inkSoft,
          background: '#fff8d8',
          border: '1px solid #d9c589',
          padding: '4px 9px',
          boxShadow: '2px 2px 0 rgba(45,52,54,0.1)',
        }}
      >
        播放器、脚本，都能读懂这一页
      </div>

      {focus > 0.05 && (
        <svg
          width="610"
          height="500"
          viewBox="0 0 610 500"
          style={{position: 'absolute', left: -48, top: -40, opacity: focus * 0.55, pointerEvents: 'none'}}
        >
          <path
            d="M30 104c-12 98 15 236 124 307 131 87 312 57 397-21 75-69 48-220-4-295C475 13 279-7 141 27 76 43 42 62 30 104Z"
            fill="none"
            stroke="#d5a548"
            strokeWidth="2.4"
            strokeDasharray="13 9"
          />
        </svg>
      )}
    </div>
  );
};

const MiniFormat: React.FC<{frame: number; index: number; title: string; ext: string; snippet: string; color: string; ink: string; rotate: number}> = ({
  frame,
  index,
  title,
  ext,
  snippet,
  color,
  ink,
  rotate,
}) => {
  const appear = springIn({frame, start: 560 + index * 5, damping: 16, stiffness: 130});
  const drift = Math.sin(frame / 30 + index) * 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: 352 + index * 370,
        top: 810 + (index % 2) * 12 + drift,
        width: 242,
        height: 94,
        background: color,
        border: `1.6px solid ${ink}`,
        borderRadius: 4,
        boxShadow: `4px 5px 0 rgba(45,52,54,0.14)`,
        transform: `translateY(${(1 - appear) * 45}px) rotate(${rotate}deg) scale(${0.9 + appear * 0.1})`,
        opacity: appear,
        padding: '10px 11px',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <span style={{fontFamily: FONTS.hand, fontSize: 17, color: ink}}>{title}</span>
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 8,
            color: ink,
            background: 'rgba(255,255,255,0.52)',
            border: `1px solid ${ink}66`,
            borderRadius: 2,
            padding: '1px 4px',
          }}
        >
          .{ext}
        </span>
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: FONTS.mono,
          fontSize: 8.5,
          lineHeight: 1.5,
          color: ink,
          opacity: 0.74,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {snippet}
      </div>
      <div style={{position: 'absolute', left: 11, right: 11, bottom: 7, height: 3, background: ink, opacity: 0.12}} />
    </div>
  );
};

const Folder: React.FC<{frame: number}> = ({frame}) => {
  const enter = springIn({frame, start: 720, damping: 18, stiffness: 110});
  const open = between(frame, 726, 738);
  const close = between(frame, 738, 746);
  const fly = easeInOutCubic(between(frame, 744, 754));
  const opacity = 1 - between(frame, 748, 758);
  return (
    <div
      style={{
        position: 'absolute',
        left: 960 + fly * 0,
        top: 436 - fly * 30,
        width: 700,
        height: 340,
        transform: `translate(-50%, ${(1 - enter) * 60 - fly * 40}px) rotate(${-2 + fly * 1.2}deg) scale(${0.82 + enter * 0.18 - fly * 0.28})`,
        opacity: enter * opacity,
        zIndex: 60,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 42,
          bottom: 0,
          background: '#d6b17c',
          border: '2px solid #6e5536',
          borderRadius: 5,
          boxShadow: '10px 14px 0 rgba(45,52,54,0.18), 0 26px 34px rgba(55,40,20,0.2)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 42,
          top: 0,
          width: 250,
          height: 64,
          background: '#d6b17c',
          border: '2px solid #6e5536',
          borderBottom: 'none',
          borderRadius: '7px 7px 0 0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 24,
          top: 58,
          right: 24,
          bottom: 18,
          background: '#f8edda',
          border: '1.4px solid #9a7d54',
          borderRadius: 3,
          transformOrigin: '50% 0%',
          transform: `perspective(900px) rotateX(${open * -72 + close * 72}deg)`,
          boxShadow: '0 4px 6px rgba(55,40,20,0.13)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: 1 - close * 0.3,
        }}
      >
        <div style={{fontFamily: FONTS.hand, fontSize: 34, color: '#5e4a2d', transform: 'rotate(-2deg)'}}>
          等等，不止一张歌单。
        </div>
        <div style={{fontFamily: FONTS.handLatin, fontSize: 22, color: '#8e7758'}}>
          there is a whole little library in here.
        </div>
        <Sticker
          bg="#fff5c9"
          border="#a77f37"
          ink="#6f4f1c"
          rotate={2}
          style={{fontFamily: FONTS.mono, fontSize: 10, padding: '4px 9px', marginTop: 4}}
        >
          12 playlists · 1,204 songs
        </Sticker>
        <div style={{position: 'absolute', left: 30, top: 30, transform: 'rotate(-7deg)', width: 100, height: 27, background: 'rgba(243,199,140,0.55)'}} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 68,
          bottom: 33,
          fontFamily: FONTS.hand,
          fontSize: 17,
          color: '#5b472c',
          opacity: 0.9,
        }}
      >
        批量 · 多工作表 · ZIP
      </div>
    </div>
  );
};

export const FileExportScene: React.FC = () => {
  const frame = useCurrentFrame();
  const visible = frame >= 483 && frame <= 762;
  if (!visible) return null;

  const xlsxAppear = springIn({frame, start: 521, damping: 15, stiffness: 105});
  const jsonAppear = springIn({frame, start: 552, damping: 16, stiffness: 115});
  const fan = between(frame, 557, 585);
  const wash = between(frame, 488, 510) * (1 - between(frame, 758, 775));
  const leave = 1 - between(frame, 740, 756);
  const exportLabel = between(frame, 496, 520);
  const badgePop = between(frame, 520, 535);

  return (
    <AbsoluteFill style={{overflow: 'hidden', zIndex: 80, opacity: leave}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(247,242,231,0.80)',
          opacity: wash,
          pointerEvents: 'none',
        }}
      />

      <FlyingRows frame={frame} />

      {exportLabel > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 960,
            top: 164,
            transform: `translate(-50%, ${(1 - exportLabel) * -14}px) rotate(-1deg)`,
            opacity: exportLabel,
            textAlign: 'center',
            zIndex: 30,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.hand,
              fontSize: 37,
              color: COLORS.ink,
              lineHeight: 1.1,
              textShadow: '2px 3px 0 rgba(65,48,12,0.10)',
            }}
          >
            把这一页，带成你想要的样子。
          </div>
          <div style={{fontFamily: FONTS.handLatin, fontSize: 23, color: COLORS.inkMuted, marginTop: 2}}>
            choose a shape, keep every song.
          </div>
          <div style={{display: 'flex', justifyContent: 'center', marginTop: 2}}>
            <ScribbleUnderline width={315} progress={between(frame, 505, 530)} color="#dcae4d" strokeWidth={4} />
          </div>
        </div>
      )}

      <XlsxCard frame={frame} appear={xlsxAppear} />
      <JsonCard frame={frame} appear={jsonAppear} />

      {fan > 0 && (
        <>
          <MiniFormat
            frame={frame}
            index={0}
            title="CSV"
            ext="csv"
            snippet="title,artist,album,isrc,duration"
            color="#fbe7ed"
            ink="#834254"
            rotate={-1.5}
          />
          <MiniFormat
            frame={frame}
            index={1}
            title="TXT"
            ext="txt"
            snippet="魔女 - 花谱 - 魔女"
            color="#fbf3cd"
            ink="#796020"
            rotate={1.2}
          />
          <MiniFormat
            frame={frame}
            index={2}
            title="M3U8"
            ext="m3u8"
            snippet="#EXTM3U  #EXTINF:227,花谱 - 魔女"
            color="#e9e2f6"
            ink="#503d76"
            rotate={-1}
          />
          <MiniFormat
            frame={frame}
            index={3}
            title="Markdown"
            ext="md"
            snippet="# 花谱、鎖那、鹿乃  |  歌曲表格"
            color="#e4f0e7"
            ink="#3e6246"
            rotate={1.6}
          />
        </>
      )}

      {fan > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 960,
            top: 944,
            transform: 'translateX(-50%) rotate(-0.6deg)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            opacity: fan,
          }}
        >
          <span style={{width: 55, height: 1, background: 'rgba(45,52,54,0.3)'}} />
          <span style={{fontFamily: FONTS.hand, fontSize: 16, color: COLORS.inkSoft}}>
            网页端还可以导出 CSV / TXT / M3U8 / Markdown
          </span>
          <span style={{width: 55, height: 1, background: 'rgba(45,52,54,0.3)'}} />
        </div>
      )}

      {frame >= 600 && frame < 676 && (
        <div
          style={{
            position: 'absolute',
            left: 886,
            top: 240,
            transform: `translateY(${(1 - between(frame, 600, 618)) * -12}px) rotate(1.8deg)`,
            opacity: between(frame, 600, 614) * (1 - between(frame, 658, 672)),
          }}
        >
          <Sticker
            bg="#fff4c1"
            border="#b18d3a"
            ink="#6f541f"
            style={{fontFamily: FONTS.mono, fontSize: 11, padding: '5px 9px', boxShadow: '2px 2px 0 #b18d3a'}}
          >
            ① 表格里，一首一行
          </Sticker>
        </div>
      )}

      {frame >= 674 && frame < 740 && (
        <div
          style={{
            position: 'absolute',
            left: 1070,
            top: 246,
            transform: `translateY(${(1 - between(frame, 674, 692)) * -10}px) rotate(-1.4deg)`,
            opacity: between(frame, 674, 688) * (1 - between(frame, 724, 738)),
          }}
        >
          <Sticker
            bg="#e3f0fb"
            border="#5f8fb6"
            ink="#274c6d"
            style={{fontFamily: FONTS.mono, fontSize: 11, padding: '5px 9px', boxShadow: '2px 2px 0 #5f8fb6'}}
          >
            ② 数据里，字段整整齐齐
          </Sticker>
        </div>
      )}

      {frame >= 685 && (
        <div
          style={{
            position: 'absolute',
            left: 820,
            top: 732,
            transform: `rotate(-2deg) scale(${0.9 + badgePop * 0.1})`,
            opacity: between(frame, 685, 700),
          }}
        >
          <Sticker
            bg="#fdf6d8"
            border="#b59a59"
            ink="#665128"
            style={{fontFamily: FONTS.hand, fontSize: 17, padding: '5px 11px', boxShadow: '2px 2px 0 #b59a59'}}
          >
            格式不同，歌单不变
          </Sticker>
          <Star size={13} color="#c9a248" style={{position: 'absolute', right: -19, top: -8}} rotate={8} />
        </div>
      )}

      <Folder frame={frame} />

      <Sparkle
        size={22}
        style={{position: 'absolute', left: 390, top: 300, opacity: between(frame, 527, 541) * (1 - between(frame, 555, 570))}}
        rotate={-8}
      />
      <Sparkle
        size={16}
        style={{position: 'absolute', right: 362, top: 264, opacity: between(frame, 550, 564) * (1 - between(frame, 580, 594))}}
        rotate={22}
      />
    </AbsoluteFill>
  );
};
