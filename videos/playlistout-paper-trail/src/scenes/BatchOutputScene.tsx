import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, FONTS} from '../theme';
import {BATCH_PLAYLISTS, BATCH_TOTAL} from '../data';
import {between, clamp, easeInOutCubic, springIn} from '../lib/anim';
import {HandDrawnCheck, Paper, Sticker, Tape} from '../components/Stationery';
import {CurlyArrow, HandArrow, ScribbleUnderline, Sparkle, Star} from '../components/Doodles';

const IntakeCards: React.FC<{frame: number}> = ({frame}) => {
  const start = 892;
  const end = 938;
  if (frame < start || frame > end + 10) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', zIndex: 5}}>
      {BATCH_PLAYLISTS.map((playlist, i) => {
        const t = clamp((frame - start - i * 1.3) / 42);
        const fromX = 285 + (i % 4) * 360;
        const fromY = 455 + Math.floor(i / 4) * 132;
        const toX = 895;
        const toY = 560;
        const x = interpolate(t, [0, 0.75, 1], [fromX, toX, toX + 32]);
        const y = interpolate(t, [0, 0.75, 1], [fromY, toY, toY + 6]);
        const opacity = interpolate(t, [0, 0.15, 0.82, 1], [0, 0.9, 0.9, 0]);
        const scale = interpolate(t, [0, 0.7, 1], [1, 0.7, 0.14]);
        return (
          <div
            key={playlist.name}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 150,
              height: 74,
              background: '#fffdf8',
              border: '1px solid rgba(45,52,54,0.22)',
              boxShadow: '2px 2px 0 rgba(45,52,54,0.09)',
              transform: `rotate(${Math.sin(i) * 7}deg) scale(${scale})`,
              opacity,
              padding: 6,
              display: 'flex',
              gap: 6,
            }}
          >
            <div style={{width: 28, height: 38, background: playlist.color, borderRadius: 2}} />
            <div style={{fontFamily: FONTS.sans, fontSize: 8.5, color: '#4f5a5b', lineHeight: 1.3}}>
              <div style={{fontWeight: 700, whiteSpace: 'nowrap'}}>{playlist.name}</div>
              <div>{playlist.count} 首</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const WorkbookCard: React.FC<{frame: number; appear: number; pack: number}> = ({frame, appear, pack}) => {
  const open = between(frame, 918, 944);
  const tabsIn = between(frame, 925, 950);
  const x = interpolate(pack, [0, 1], [535, 890]);
  const y = interpolate(pack, [0, 1], [294, 602]);
  const scale = interpolate(pack, [0, 1], [1, 0.18]);
  const opacity = 1 - between(frame, 1000, 1028);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 830,
        height: 528,
        transform: `translateY(${(1 - appear) * 32}px) scale(${(0.82 + appear * 0.18) * scale}) rotate(${
          -2.4 + (1 - appear) * -3 + pack * 2
        }deg)`,
        opacity: appear * opacity,
        zIndex: 20,
      }}
    >
      <Paper
        color="#fdfbf5"
        borderColor="#145638"
        borderWidth={2}
        style={{
          width: 830,
          height: 528,
          boxShadow: '12px 16px 0 rgba(20,86,56,0.18), 0 28px 42px rgba(47,50,35,0.16)',
          overflow: 'hidden',
        }}
      >
        <Tape color="green" width={132} height={26} rotate={-6} style={{left: 38, top: -14}} opacity={0.8} />
        <div
          style={{
            height: 53,
            background: COLORS.excelDark,
            color: '#f2fff7',
            display: 'flex',
            alignItems: 'center',
            padding: '0 18px',
            gap: 11,
          }}
        >
          <div
            style={{
              width: 27,
              height: 30,
              background: '#1b7a52',
              border: '1.2px solid #bcdfcb',
              display: 'grid',
              placeItems: 'center',
              fontFamily: FONTS.mono,
              fontWeight: 700,
              color: '#f6fff9',
              fontSize: 12,
              borderRadius: 2,
            }}
          >
            X
          </div>
          <div>
            <div style={{fontFamily: FONTS.sans, fontSize: 14, fontWeight: 600}}>
              【歌单合集】琴心月满 - 共 12 个歌单.xlsx
            </div>
            <div style={{fontFamily: FONTS.mono, fontSize: 9, color: '#a9d6bd', marginTop: 1}}>
              multi_sheet_xlsx · 12 playlist sheets + index
            </div>
          </div>
          <div style={{marginLeft: 'auto', display: 'flex', gap: 8, color: '#b8dcc9', fontSize: 13}}>
            <span>−</span>
            <span>□</span>
            <span>×</span>
          </div>
        </div>

        <div style={{display: 'flex', height: 440}}>
          <div style={{width: 215, background: '#eaf4ee', borderRight: '1px solid #cadbcf', padding: '17px 14px'}}>
            <div style={{fontFamily: FONTS.hand, fontSize: 24, color: '#145638', lineHeight: 1.1}}>
              歌单目录
            </div>
            <div style={{fontFamily: FONTS.handLatin, fontSize: 15, color: '#688173', marginTop: 2}}>
              twelve places, one book
            </div>
            <div style={{height: 1, background: '#bfd3c5', margin: '12px 0'}} />
            <div
              style={{
                background: '#1b7a52',
                color: '#f2fff8',
                borderRadius: 3,
                padding: '8px 9px',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontFamily: FONTS.sans,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <span>▤</span> 【目录】歌单索引
            </div>
            <div style={{marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2}}>
              {BATCH_PLAYLISTS.slice(0, 8).map((playlist, i) => (
                <div
                  key={playlist.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 8px',
                    fontFamily: FONTS.sans,
                    fontSize: 9.5,
                    color: '#5d6c63',
                    opacity: tabsIn,
                    transform: `translateX(${(1 - tabsIn) * -6}px)`,
                  }}
                >
                  <span style={{width: 4, height: 14, background: playlist.tab, borderRadius: 2}} />
                  <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{playlist.name}</span>
                </div>
              ))}
              <div style={{fontFamily: FONTS.mono, fontSize: 8.5, color: '#8b9c91', padding: '4px 8px'}}>+ 4 more sheets</div>
            </div>
          </div>

          <div style={{flex: 1, padding: '13px 15px 0', minWidth: 0, position: 'relative'}}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #d7e5db',
                paddingBottom: 7,
              }}
            >
              <div style={{display: 'flex', alignItems: 'baseline', gap: 9}}>
                <span style={{fontFamily: FONTS.sans, fontSize: 14, fontWeight: 700, color: '#20513e'}}>【目录】歌单索引</span>
                <span style={{fontFamily: FONTS.hand, fontSize: 13, color: '#7b8a80'}}>12 个封面，排成一页</span>
              </div>
              <span style={{fontFamily: FONTS.mono, fontSize: 8, color: '#8a9b90'}}>A1:H14</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '31px 1.8fr 65px 86px 1.2fr',
                gap: 0,
                fontSize: 9,
                fontFamily: FONTS.sans,
                color: '#3e5047',
                marginTop: 7,
              }}
            >
              <div style={{background: '#dff0e7', border: '1px solid #d0e2d7', padding: '5px 4px', fontWeight: 700}}>#</div>
              {['歌单名称', '曲目', '标签', '带走方式'].map((h) => (
                <div
                  key={h}
                  style={{
                    background: '#dff0e7',
                    border: '1px solid #d0e2d7',
                    borderLeft: 'none',
                    padding: '5px 6px',
                    fontWeight: 700,
                  }}
                >
                  {h}
                </div>
              ))}
              {BATCH_PLAYLISTS.map((playlist, i) => (
                <React.Fragment key={playlist.name}>
                  <div style={{border: '1px solid #e2ebe5', borderTop: 'none', padding: '4px', color: '#7b8b81', fontFamily: FONTS.mono, fontSize: 8}}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div
                    style={{
                      border: '1px solid #e2ebe5',
                      borderLeft: 'none',
                      borderTop: 'none',
                      padding: '4px 6px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span style={{width: 5, height: 11, background: playlist.tab, borderRadius: 1}} />
                    {playlist.name}
                  </div>
                  <div style={{border: '1px solid #e2ebe5', borderLeft: 'none', borderTop: 'none', padding: '4px 6px', fontFamily: FONTS.mono, fontSize: 8}}>
                    {playlist.count}
                  </div>
                  <div style={{border: '1px solid #e2ebe5', borderLeft: 'none', borderTop: 'none', padding: '4px 6px', color: '#7c8a81'}}>{playlist.tag}</div>
                  <div style={{border: '1px solid #e2ebe5', borderLeft: 'none', borderTop: 'none', padding: '4px 6px', color: '#55715f'}}>Sheet {i + 2}</div>
                </React.Fragment>
              ))}
            </div>

            <div style={{position: 'absolute', right: 18, bottom: 12, display: 'flex', alignItems: 'center', gap: 7}}>
              <span style={{fontFamily: FONTS.hand, fontSize: 15, color: '#3d7357'}}>每一张，都有自己的位置</span>
              <Star size={13} color="#c8a54e" />
            </div>
          </div>
        </div>

        <div
          style={{
            height: 50,
            marginTop: -21,
            background: '#f2f7f4',
            borderTop: '1px solid #d0e0d6',
            display: 'flex',
            alignItems: 'center',
            padding: '0 15px',
            gap: 5,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 33,
              alignSelf: 'flex-end',
              background: '#1b7a52',
              color: '#f4fff8',
              fontFamily: FONTS.sans,
              fontSize: 9.5,
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '3px 3px 0 0',
            }}
          >
            目录
          </div>
          {BATCH_PLAYLISTS.slice(0, 9).map((playlist, i) => (
            <div
              key={playlist.name}
              style={{
                height: 30,
                alignSelf: 'flex-end',
                background: playlist.color,
                border: '1px solid rgba(45,52,54,0.18)',
                borderBottom: 'none',
                color: '#4b5752',
                fontFamily: FONTS.sans,
                fontSize: 8,
                padding: '0 7px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '3px 3px 0 0',
                maxWidth: 60,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                opacity: tabsIn,
              }}
            >
              {playlist.name}
            </div>
          ))}
          <div style={{fontFamily: FONTS.mono, fontSize: 8, color: '#83958a', marginLeft: 4}}>+3</div>
          <div style={{marginLeft: 'auto', fontFamily: FONTS.hand, fontSize: 13, color: '#4f7e64'}}>
            {BATCH_TOTAL.toLocaleString()} 首歌 · 12 个歌单页 + 目录
          </div>
        </div>
      </Paper>

      <div
        style={{
          position: 'absolute',
          left: 870,
          top: 20,
          transform: 'rotate(3.2deg)',
          opacity: between(frame, 930, 946) * (1 - pack),
        }}
      >
        <Sticker
          bg="#dcf6e9"
          border="#3a8e68"
          ink="#12563b"
          style={{fontFamily: FONTS.hand, fontSize: 18, padding: '6px 12px', boxShadow: '2.5px 2.5px 0 #3a8e68'}}
        >
          <HandDrawnCheck size={15} /> 12 个歌单页已装好
        </Sticker>
      </div>

      <div
        style={{
          position: 'absolute',
          left: -175,
          top: 380,
          opacity: between(frame, 924, 940) * (1 - pack),
          transform: 'rotate(-3.2deg)',
        }}
      >
        <div style={{fontFamily: FONTS.hand, fontSize: 21, color: COLORS.inkSoft, textAlign: 'right', lineHeight: 1.35}}>
          一本工作簿，
          <br />
          装下十二张歌单。
        </div>
        <HandArrow width={96} height={58} d="M9 49 C 34 43, 61 31, 86 12" color="#9b8b73" style={{marginLeft: 42}} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 620,
          top: 548,
          transform: 'rotate(-2deg)',
          opacity: between(frame, 938, 952) * (1 - pack),
        }}
      >
        <div style={{fontFamily: FONTS.handLatin, fontSize: 20, color: '#6a7a70'}}>all tabs, in one place.</div>
      </div>
    </div>
  );
};

const ZipCard: React.FC<{frame: number; appear: number; pack: number}> = ({frame, appear, pack}) => {
  const x = interpolate(pack, [0, 1], [1385, 984]);
  const y = interpolate(pack, [0, 1], [352, 611]);
  const scale = interpolate(pack, [0, 1], [1, 0.2]);
  const opacity = 1 - between(frame, 1000, 1028);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 405,
        height: 336,
        transform: `translateY(${(1 - appear) * 44}px) scale(${(0.86 + appear * 0.14) * scale}) rotate(${2.1 + (1 - appear) * 3 - pack * 2}deg)`,
        opacity: appear * opacity,
        zIndex: 18,
      }}
    >
      <Paper
        color="#fdf8df"
        borderColor="#8a773d"
        borderWidth={2}
        style={{width: 405, height: 336, boxShadow: '9px 11px 0 rgba(92,77,35,0.14), 0 24px 30px rgba(70,57,27,0.13)'}}
      >
        <Tape color="yellow" width={98} height={22} rotate={-5} style={{right: 26, top: -11}} opacity={0.75} />
        <div style={{display: 'flex', alignItems: 'center', gap: 11, padding: '18px 18px 0'}}>
          <div style={{width: 50, height: 58, background: '#e9c56d', border: '1.5px solid #6b5725', borderRadius: 3, position: 'relative'}}>
            <div style={{position: 'absolute', left: 6, right: 6, top: 0, bottom: 0, borderLeft: '1px dashed rgba(65,50,15,0.55)', borderRight: '1px dashed rgba(65,50,15,0.55)'}} />
            <div style={{position: 'absolute', left: 19, top: 15, right: 19, height: 5, background: '#8a773d', borderRadius: 99}} />
            <div style={{position: 'absolute', left: 19, bottom: 15, right: 19, height: 5, background: '#8a773d', borderRadius: 99}} />
          </div>
          <div>
            <div style={{fontFamily: FONTS.sans, fontSize: 15, fontWeight: 700, color: '#4e421f'}}>QQ音乐_歌单合集_琴心月满.zip</div>
            <div style={{fontFamily: FONTS.mono, fontSize: 9, color: '#796c45', marginTop: 3}}>
              ZIP · 12 files · UTF-8
            </div>
          </div>
        </div>

        <div style={{margin: '16px 18px 0', borderTop: '1px dashed #b7a674', paddingTop: 11}}>
          {[
            ['通勤耳机 - 琴心月满.xlsx', '31.2 KB'],
            ['雨天的窗 - 琴心月满.xlsx', '28.7 KB'],
            ['夜航星图 - 琴心月满.xlsx', '44.1 KB'],
            ['… 还有 9 个文件', ''],
          ].map(([name, size], i) => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 0',
                fontFamily: FONTS.sans,
                fontSize: 10,
                color: i === 3 ? '#82764e' : '#5b5237',
                borderBottom: '1px solid rgba(123,104,56,0.10)',
              }}
            >
              <span style={{display: 'flex', alignItems: 'center', gap: 6}}>
                <span style={{width: 6, height: 6, background: i === 3 ? '#b1a477' : '#66a47b', borderRadius: 1}} />
                {name}
              </span>
              <span style={{fontFamily: FONTS.mono, fontSize: 8, color: '#8a7d55'}}>{size}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 18,
            bottom: 15,
            right: 18,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{fontFamily: FONTS.hand, fontSize: 14, color: '#66572e'}}>一个歌单一个文件，解压就能用</span>
          <span style={{fontFamily: FONTS.mono, fontSize: 9, background: '#8a773d', color: '#fff7d8', padding: '2px 6px', borderRadius: 2}}>.zip</span>
        </div>
      </Paper>

      <Sticker
        bg="#fef0c5"
        border="#a28b4e"
        ink="#5f5025"
        rotate={3.4}
        style={{
          position: 'absolute',
          left: -42,
          top: -34,
          fontFamily: FONTS.hand,
          fontSize: 15,
          padding: '4px 9px',
          opacity: between(frame, 944, 960) * (1 - pack),
        }}
      >
        另一种打包方式 · 可选
      </Sticker>

      <div
        style={{
          position: 'absolute',
          right: -135,
          top: 72,
          transform: 'rotate(2deg)',
          fontFamily: FONTS.hand,
          fontSize: 18,
          color: COLORS.inkSoft,
          lineHeight: 1.4,
          opacity: between(frame, 950, 966) * (1 - pack),
        }}
      >
        想分开整理？
        <br />
        也可以 ZIP 打包。
        <CurlyArrow width={62} height={44} color="#a39272" rotate={-8} style={{marginLeft: 44}} />
      </div>
    </div>
  );
};

const Envelope: React.FC<{frame: number}> = ({frame}) => {
  const enter = springIn({frame, start: 986, damping: 17, stiffness: 100});
  const seal = between(frame, 1022, 1040);
  const lift = easeInOutCubic(between(frame, 1040, 1064));
  if (frame < 986) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 960,
        top: 520,
        width: 760,
        height: 382,
        transform: `translate(-50%, -50%) translateY(${(1 - enter) * 100 - lift * 150}px) rotate(${-1.8 + (1 - enter) * 4 + lift * 3}deg) scale(${0.86 + enter * 0.14 - lift * 0.03})`,
        opacity: enter * (1 - between(frame, 1055, 1072)),
        zIndex: 40,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#dcbf91',
          border: '2px solid #6b5331',
          boxShadow: '14px 18px 0 rgba(45,52,54,0.17), 0 28px 48px rgba(55,40,20,0.18)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(34deg, transparent 49%, rgba(121,94,55,0.18) 49.4%, rgba(255,255,255,0.13) 50%, transparent 50.6%), linear-gradient(-34deg, transparent 49%, rgba(121,94,55,0.16) 49.4%, rgba(255,255,255,0.12) 50%, transparent 50.6%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 260,
            background: '#ecd4ae',
            borderTop: '1.5px solid #7d6139',
            transformOrigin: '50% 0%',
            transform: `perspective(900px) rotateX(${seal * -34}deg)`,
            boxShadow: 'inset 0 10px 22px rgba(90,65,30,0.10)',
          }}
        />
        <div style={{position: 'absolute', left: 32, top: 30, right: 32, display: 'flex', justifyContent: 'space-between'}}>
          <div>
            <div style={{fontFamily: FONTS.hand, fontSize: 30, color: '#4d3b21'}}>把歌单带走</div>
            <div style={{fontFamily: FONTS.handLatin, fontSize: 19, color: '#7b6441'}}>to wherever you listen next.</div>
          </div>
          <div
            style={{
              width: 87,
              height: 63,
              border: '2px solid #6c5430',
              background: '#f4e7ce',
              transform: 'rotate(4deg)',
              padding: 6,
              boxShadow: '2px 2px 0 rgba(45,52,54,0.16)',
            }}
          >
            <div style={{fontFamily: FONTS.mono, fontSize: 7, color: '#6c5430', borderBottom: '1px dashed #9c855f', paddingBottom: 3}}>PLAYLIST OUT</div>
            <div style={{fontFamily: FONTS.hand, fontSize: 12, color: '#6c5430', marginTop: 4}}>下一站 ♪</div>
          </div>
        </div>
        <div style={{position: 'absolute', left: 34, bottom: 32, right: 34, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
          <div style={{fontFamily: FONTS.hand, fontSize: 21, color: '#4c3a21'}}>
            收件人：正在听歌的你
            <br />
            <span style={{fontFamily: FONTS.handLatin, fontSize: 17, color: '#836c49'}}>music is a place you can carry.</span>
          </div>
          <div
            style={{
              width: 70,
              height: 38,
              border: '2px dashed #785d35',
              color: '#785d35',
              fontFamily: FONTS.sans,
              fontSize: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-4deg)',
              opacity: 0.8,
            }}
          >
            已打包
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 192,
            transform: `translate(-50%, -50%) scale(${seal}) rotate(-5deg)`,
            width: 130,
            height: 50,
            background: '#c96e62',
            border: '1px solid #8e4138',
            opacity: 0.9,
            display: 'grid',
            placeItems: 'center',
            fontFamily: FONTS.hand,
            color: '#fff0e2',
            fontSize: 17,
          }}
        >
          封好，出发 ✦
        </div>
      </div>
    </div>
  );
};

export const BatchOutputScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 890 || frame > 1076) return null;

  const workbookAppear = springIn({frame, start: 901, damping: 16, stiffness: 105});
  const zipAppear = springIn({frame, start: 946, damping: 17, stiffness: 100});
  const pack = easeInOutCubic(between(frame, 1000, 1028));
  const heading = between(frame, 900, 920);
  const wash = between(frame, 892, 910) * (1 - between(frame, 1008, 1030));

  return (
    <AbsoluteFill style={{overflow: 'hidden', zIndex: 82}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(247,242,231,0.72)',
          opacity: wash,
          pointerEvents: 'none',
        }}
      />
      <IntakeCards frame={frame} />

      <div
        style={{
          position: 'absolute',
          left: 960,
          top: 155,
          transform: `translate(-50%, ${(1 - heading) * -12}px)`,
          textAlign: 'center',
          opacity: heading * (1 - between(frame, 990, 1012)),
        }}
      >
        <div style={{fontFamily: FONTS.hand, fontSize: 38, color: COLORS.ink, lineHeight: 1.15}}>
          不止一张歌单，也能一起收好。
        </div>
        <div style={{fontFamily: FONTS.handLatin, fontSize: 21, color: COLORS.inkMuted, marginTop: 2}}>
          one collection, twelve little worlds.
        </div>
        <div style={{display: 'flex', justifyContent: 'center', marginTop: 3}}>
          <ScribbleUnderline width={330} color="#d9ab4d" strokeWidth={4} progress={between(frame, 908, 934)} />
        </div>
      </div>

      <WorkbookCard frame={frame} appear={workbookAppear} pack={pack} />
      <ZipCard frame={frame} appear={zipAppear} pack={pack} />
      <Envelope frame={frame} />

      {frame < 1000 && (
        <div
          style={{
            position: 'absolute',
            left: 960,
            top: 938,
            transform: 'translateX(-50%) rotate(-0.5deg)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            opacity: between(frame, 950, 966) * (1 - between(frame, 986, 1000)),
          }}
        >
          <span style={{width: 55, height: 1, background: 'rgba(45,52,54,0.25)'}} />
          <span style={{fontFamily: FONTS.hand, fontSize: 16, color: COLORS.inkSoft}}>
            两种方式：多工作表 Excel，或 ZIP 打包
          </span>
          <span style={{width: 55, height: 1, background: 'rgba(45,52,54,0.25)'}} />
        </div>
      )}

      <Sparkle size={22} style={{position: 'absolute', right: 270, top: 240, opacity: between(frame, 915, 930) * (1 - between(frame, 952, 970))}} rotate={17} />
      <Sparkle size={16} style={{position: 'absolute', left: 300, top: 642, opacity: between(frame, 960, 974) * (1 - between(frame, 1000, 1016))}} rotate={-13} />
    </AbsoluteFill>
  );
};
