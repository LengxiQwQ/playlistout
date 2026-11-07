import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, FONTS} from '../theme';
import {between, clamp, easeInOutCubic, springIn} from '../lib/anim';
import {Tape} from '../components/Stationery';
import {CurlyArrow, HandArrow, Sparkle, Star} from '../components/Doodles';

const T = {
  bg: '#09131b',
  chrome: '#17242e',
  ink: '#d9e4eb',
  dim: '#7890a0',
  amber: '#e2a455',
  green: '#6ddaa2',
  blue: '#76b8f3',
  red: '#f28f8b',
  yellow: '#e9c66c',
  cyan: '#76d4d8',
  magenta: '#eda2c8',
  divider: '#314553',
};

const mono = (size = 16.5, color = T.ink, weight: 400 | 700 = 400): React.CSSProperties => ({
  fontFamily: FONTS.mono,
  fontSize: size,
  lineHeight: '24px',
  color,
  fontWeight: weight,
  whiteSpace: 'pre',
});

const Line: React.FC<{
  frame: number;
  reveal: number;
  children: React.ReactNode;
  height?: number;
  opacityMax?: number;
}> = ({frame, reveal, children, height = 24, opacityMax = 1}) => {
  const p = clamp((frame - reveal) / 6);
  return (
    <div
      style={{
        height,
        display: 'flex',
        alignItems: 'center',
        opacity: p * opacityMax,
        transform: `translateY(${(1 - p) * 4}px)`,
      }}
    >
      {children}
    </div>
  );
};

const Divider: React.FC = () => (
  <div style={{height: 24, display: 'flex', alignItems: 'center'}}>
    <div style={{width: 880, height: 1, background: '#3a4b57'}} />
  </div>
);

const PlatformMenuLine: React.FC<{num: string; name: string; color: string; desc: string; gap?: number}> = ({
  num,
  name,
  color,
  desc,
  gap = 14,
}) => (
  <div style={{display: 'flex', alignItems: 'center', whiteSpace: 'pre'}}>
    <span style={mono(16.5, T.ink, 700)}>{num.padStart(3, ' ')}</span>
    <span style={{width: 8}} />
    <span style={mono(16.5, color, 700)}>{name}</span>
    <span style={{width: gap}} />
    <span style={mono(15.5, T.dim)}>{desc}</span>
  </div>
);

const WindowsGlyph: React.FC<{size?: number}> = ({size = 22}) => (
  <div style={{width: size, height: size, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2}}>
    {[0, 1, 2, 3].map((i) => (
      <div key={i} style={{background: '#5ba9e0', borderRadius: 1, opacity: 0.95}} />
    ))}
  </div>
);

const OsBadge: React.FC<{label: string; symbol: string; detail: string; color: string; appear: number}> = ({
  label,
  symbol,
  detail,
  color,
  appear,
}) => (
  <div
    style={{
      width: 205,
      height: 55,
      background: '#fffdf6',
      border: '1.5px solid rgba(45,52,54,0.6)',
      borderRadius: 4,
      boxShadow: '3px 4px 0 rgba(45,52,54,0.18)',
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '0 11px',
      opacity: appear,
      transform: `translateY(${(1 - appear) * 15}px) rotate(${label === 'Linux' ? 1.4 : label === 'macOS' ? -0.8 : -2}deg)`,
    }}
  >
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 5,
        background: color,
        color: '#fffdf5',
        display: 'grid',
        placeItems: 'center',
        fontFamily: FONTS.sans,
        fontWeight: 800,
        fontSize: 14,
        flexShrink: 0,
      }}
    >
      {symbol}
    </div>
    <div>
      <div style={{fontFamily: FONTS.sans, fontSize: 11.5, fontWeight: 700, color: COLORS.ink}}>{label}</div>
      <div style={{fontFamily: FONTS.sans, fontSize: 8.5, color: COLORS.inkMuted, marginTop: 1}}>{detail}</div>
    </div>
  </div>
);

export const TerminalScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 1064 || frame > 1395) return null;

  const entry = springIn({frame, start: 1064, damping: 19, stiffness: 90, mass: 1.0});
  const pull = between(frame, 1064, 1082);
  const typingStart = 1078;
  const typedCount = Math.round(interpolate(frame, [typingStart, 1096], [0, 10], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));
  const cmd = 'playlistout'.slice(0, typedCount);
  const cmdComplete = typedCount >= 10;
  const urlStart = 1138;
  const url = 'https://y.qq.com/n/ryqq/playlist/9140654872';
  const urlCount = Math.round(interpolate(frame, [urlStart, 1158], [0, url.length], {
    easing: (t) => 1 - Math.pow(1 - t, 1.7),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));
  const typedUrl = url.slice(0, urlCount);
  const urlComplete = urlCount >= url.length;
  const choiceStart = 1234;
  const typedChoice = '1, 2'.slice(
    0,
    Math.round(interpolate(frame, [choiceStart, 1245], [0, 4], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})),
  );
  const choiceComplete = typedChoice.length === 4;
  const fetchDots = '.'.repeat(1 + (Math.floor(frame / 5) % 3));
  const scroll = (() => {
    if (frame < 1158) return 0;
    if (frame < 1172) return interpolate(frame, [1158, 1172], [0, 120], {easing: Easing.bezier(0.3, 0.7, 0.3, 1)});
    if (frame < 1188) return 120;
    if (frame < 1208) return interpolate(frame, [1188, 1208], [120, 370], {easing: Easing.bezier(0.3, 0.7, 0.3, 1)});
    if (frame < 1230) return 370;
    if (frame < 1248) return interpolate(frame, [1230, 1248], [370, 500], {easing: Easing.bezier(0.3, 0.7, 0.3, 1)});
    if (frame < 1258) return 500;
    if (frame < 1278) return interpolate(frame, [1258, 1278], [500, 610]);
    return 610;
  })();
  const exit = between(frame, 1364, 1388);
  const chromeIn = between(frame, 1072, 1090);
  const noteVisible = frame > 1272 && frame < 1360;
  const fetching = frame >= 1162 && frame < 1180;
  const blink = Math.floor(frame / 9) % 2 === 0;

  return (
    <AbsoluteFill style={{overflow: 'hidden', zIndex: 120}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 64% 65% at 50% 43%, rgba(232,164,83,0.11), transparent 72%), rgba(17, 14, 11, 0.38)',
          opacity: between(frame, 1064, 1085) * (1 - between(frame, 1358, 1382)) * 0.92,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 238,
          top: 145,
          width: 1444,
          height: 802,
          transform: `translateY(${(1 - entry) * 82}px) rotate(${0.18 + (1 - entry) * -1.2}deg) translateY(${-exit * 50}px)`,
          opacity: interpolate(frame, [1064, 1066], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * (1 - exit),
          filter: 'drop-shadow(16px 22px 0 rgba(34,26,18,0.24)) drop-shadow(0 30px 50px rgba(0,0,0,0.20))',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 7,
            overflow: 'hidden',
            background: T.bg,
            border: '2px solid #202b33',
          }}
        >
          <div
            style={{
              height: 47,
              background: T.chrome,
              display: 'flex',
              alignItems: 'center',
              padding: '0 15px',
              gap: 10,
              borderBottom: '1px solid #2a3a46',
            }}
          >
            <WindowsGlyph size={17} />
            <div
              style={{
                height: 33,
                marginTop: 14,
                background: '#0d1720',
                border: '1px solid #33434e',
                borderBottom: 'none',
                borderRadius: '5px 5px 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '0 16px',
                minWidth: 340,
              }}
            >
              <span style={{fontFamily: FONTS.sans, fontSize: 11.5, color: '#dce7ee'}}>Windows PowerShell</span>
              <span style={{fontFamily: FONTS.mono, fontSize: 9.5, color: '#6f8797'}}>— Playlist Out</span>
              <span style={{marginLeft: 'auto', color: '#7e939f', fontSize: 12}}>×</span>
            </div>
            <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 19, color: '#9db0bc', fontSize: 13}}>
              <span>−</span>
              <span>□</span>
              <span>×</span>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 47,
              bottom: 0,
              overflow: 'hidden',
              background:
                'radial-gradient(ellipse 70% 60% at 52% 15%, rgba(68,104,117,0.12), transparent 70%), #09131b',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'repeating-linear-gradient(to bottom, rgba(255,255,255,0.018) 0 1px, transparent 1px 4px)',
                pointerEvents: 'none',
                zIndex: 4,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 28,
                right: 28,
                top: 19,
                transform: `translateY(${-scroll}px)`,
              }}
            >
              <Line frame={frame} reveal={1068}>
                <span style={mono(15.5, '#b7c9d4')}>Windows PowerShell</span>
              </Line>
              <Line frame={frame} reveal={1069}>
                <span style={mono(14.2, '#7f96a4')}>Copyright (C) Microsoft Corporation. All rights reserved.</span>
              </Line>
              <div style={{height: 13}} />
              <Line frame={frame} reveal={1078}>
                <span style={mono(16.2, '#9ab0bd')}>PS C:\Users\LengxiQwQ&gt; </span>
                <span style={mono(16.2, T.ink)}>{cmd}</span>
                {frame > 1078 && !cmdComplete && blink && <span style={{...mono(16.2, T.ink), opacity: 0.85}}>▌</span>}
                {cmdComplete && <span style={{...mono(16.2, T.dim), opacity: blink ? 0.8 : 0.3}}>▌</span>}
              </Line>

              <Line frame={frame} reveal={1096}>
                <span style={mono(20, T.amber, 700)}>Playlist Out CLI v3.0.0</span>
              </Line>
              <Line frame={frame} reveal={1098}>
                <span style={mono(16.5, '#d7e2e9')}>把你的歌单带走 - 命令行版</span>
              </Line>
              <div style={{height: 10}} />
              <Line frame={frame} reveal={1100}>
                <span style={mono(15.5, '#bdccd5')}>你的歌单，不应该只困在一个音乐平台里。</span>
              </Line>
              <Line frame={frame} reveal={1102}>
                <span style={mono(15.5, '#bdccd5')}>解析、导出，并把歌单继续带进支持的开源播放器。</span>
              </Line>
              <div style={{height: 10}} />
              <Line frame={frame} reveal={1105}>
                <span style={mono(14.2, T.blue)}>作者：LengxiQwQ</span>
                <span style={mono(14.2, T.dim)}> · </span>
                <span style={mono(14.2, T.blue)}>GitHub 开源仓库</span>
                <span style={mono(14.2, T.dim)}> · </span>
                <span style={mono(14.2, T.blue)}>在线网页版</span>
              </Line>
              <Line frame={frame} reveal={1108}>
                <Divider />
              </Line>

              <Line frame={frame} reveal={1112}>
                <PlatformMenuLine num="1" name="网易云音乐" color={T.red} desc="歌单链接 / 分享短链 / 歌单 ID / 用户 UID" gap={9} />
              </Line>
              <Line frame={frame} reveal={1114}>
                <PlatformMenuLine num="2" name="QQ 音乐" color={T.green} desc="歌单链接 / 分享短链 / 歌单 ID / 用户 QQ号" gap={12} />
              </Line>
              <Line frame={frame} reveal={1116}>
                <PlatformMenuLine num="3" name="酷狗音乐" color={T.blue} desc="歌单链接 / 分享短链 / 歌单 ID（普通版需登录，概念版免登全量）" gap={12} />
              </Line>
              <Line frame={frame} reveal={1118}>
                <PlatformMenuLine num="4" name="酷我音乐" color={T.yellow} desc="歌单链接 / 分享短链 / 歌单 ID" gap={12} />
              </Line>
              <Line frame={frame} reveal={1120}>
                <PlatformMenuLine num="5" name="汽水音乐" color={T.cyan} desc="歌单链接 / 抖音分享文案 / 歌单 ID" gap={12} />
              </Line>
              <Line frame={frame} reveal={1122}>
                <PlatformMenuLine num="6" name="咪咕音乐" color={T.magenta} desc="歌单链接 / 分享短链 / 歌单 ID" gap={12} />
              </Line>
              <div style={{height: 8}} />
              <Line frame={frame} reveal={1124}>
                <span style={mono(14.5, T.yellow)}>💡 直接粘贴链接或分享文案即可自动识别平台。</span>
              </Line>
              <Line frame={frame} reveal={1126}>
                <span style={mono(14.5, T.yellow)}>💡 只有歌单 ID？先输入平台编号。</span>
              </Line>
              <div style={{height: 10}} />
              <Line frame={frame} reveal={1128}>
                <span style={mono(15.5, '#b7c8d2')}>粘贴歌单链接，或输入平台编号：</span>
              </Line>
              <Line frame={frame} reveal={1129}>
                <span style={mono(16.2, '#7dd4a5')}>&gt; </span>
                <span style={mono(16.2, T.ink)}>{typedUrl}</span>
                {frame > 1138 && !urlComplete && blink && <span style={mono(16.2, T.ink)}>▌</span>}
                {urlComplete && <span style={{...mono(16.2, T.dim), opacity: blink ? 0.8 : 0.25}}>▌</span>}
              </Line>
              <Line frame={frame} reveal={1152}>
                <Divider />
              </Line>
              <Line frame={frame} reveal={1156}>
                <span style={mono(15.8, '#73e4a6')}>✅ 已识别：</span>
                <span style={mono(15.8, '#73e4a6', 700)}>QQ 音乐</span>
              </Line>
              <Line frame={frame} reveal={1161}>
                <span style={mono(15.6, T.cyan)}>🚀 正在获取歌单</span>
                <span style={mono(15.6, T.cyan)}>{fetching ? fetchDots : '...'}</span>
              </Line>
              <div style={{height: 8}} />
              <Line frame={frame} reveal={1178}>
                <span style={mono(17.5, T.cyan, 700)}>🎵 歌单详情</span>
              </Line>
              <Line frame={frame} reveal={1181}>
                <span style={mono(15.8, '#c8d5dd')}>  歌单：</span>
                <span style={mono(15.8, '#f1e5cc')}>花谱、鎖那、鹿乃</span>
              </Line>
              <Line frame={frame} reveal={1183}>
                <span style={mono(15.8, '#c8d5dd')}>  作者：</span>
                <span style={mono(15.8, '#f1e5cc')}>琴心月满</span>
              </Line>
              <Line frame={frame} reveal={1185}>
                <span style={mono(15.8, '#c8d5dd')}>  歌曲：</span>
                <span style={mono(15.8, '#f1e5cc')}>104 首</span>
              </Line>
              <Line frame={frame} reveal={1187}>
                <span style={mono(15.8, '#c8d5dd')}>  时长：</span>
                <span style={mono(15.8, '#f1e5cc')}>7 小时 6 分钟</span>
              </Line>
              <Line frame={frame} reveal={1189}>
                <span style={mono(15.8, '#c8d5dd')}>  状态：</span>
                <span style={mono(15.8, T.yellow)}>VIP 2</span>
              </Line>
              <div style={{height: 9}} />
              <Line frame={frame} reveal={1204}>
                <span style={mono(17.5, T.cyan, 700)}>📦 导出格式</span>
              </Line>
              {[
                ['1', 'Excel (.xlsx)', '适合查看、整理和备份'],
                ['2', 'JSON  (.json)', '适合第三方工具和程序导入'],
                ['3', 'CSV   (.csv) ', '适合表格软件和迁移工具'],
                ['4', 'TXT   (.txt) ', '简单的歌曲清单'],
                ['5', 'M3U8  (.m3u8)', '通用播放列表'],
              ].map(([num, label, desc], i) => (
                <Line key={num} frame={frame} reveal={1206 + i * 2}>
                  <span style={mono(15.8, T.ink, 700)}>  {num}  </span>
                  <span style={mono(15.8, '#dce6ec')}>{label}</span>
                  <span style={{width: 11}} />
                  <span style={mono(14.8, '#91a4b0')}>{desc}</span>
                </Line>
              ))}
              <div style={{height: 8}} />
              <Line frame={frame} reveal={1218}>
                <span style={mono(15, '#a8b8c2')}>
                  <span style={{color: '#f0f6fa', fontWeight: 700}}>Enter</span>  全部导出
                </span>
              </Line>
              <Line frame={frame} reveal={1220}>
                <span style={mono(15, '#a8b8c2')}>
                  <span style={{color: '#f0f6fa', fontWeight: 700}}>0</span>      返回
                </span>
              </Line>
              <div style={{height: 8}} />
              <Line frame={frame} reveal={1223}>
                <span style={mono(15.3, '#c8d5dd')}>选择格式，可多选，例如 (1, 2)：</span>
              </Line>
              <Line frame={frame} reveal={1224}>
                <span style={mono(16, '#7dd4a5')}>&gt; </span>
                <span style={mono(16, T.ink)}>{typedChoice}</span>
                {frame > 1234 && !choiceComplete && blink && <span style={mono(16, T.ink)}>▌</span>}
                {choiceComplete && <span style={{...mono(16, T.dim), opacity: blink ? 0.7 : 0.2}}>▌</span>}
              </Line>
              <Line frame={frame} reveal={1244}>
                <Divider />
              </Line>
              <Line frame={frame} reveal={1256}>
                <span style={mono(16, T.cyan)}>🚀 正在导出...</span>
              </Line>
              <div style={{height: 3}} />
              <Line frame={frame} reveal={1264}>
                <span style={mono(15.4, '#72dda2')}>✅</span>
                <span style={mono(15.4, '#e7edf1')}> Excel   </span>
                <span style={mono(14.6, '#d9c9a7')}>【QQ 音乐】花谱、鎖那、鹿乃 - 琴心月满.xlsx</span>
              </Line>
              <Line frame={frame} reveal={1270}>
                <span style={mono(15.4, '#72dda2')}>✅</span>
                <span style={mono(15.4, '#e7edf1')}> JSON    </span>
                <span style={mono(14.6, '#d9c9a7')}>【QQ 音乐】花谱、鎖那、鹿乃 - 琴心月满.json</span>
              </Line>
              <div style={{height: 8}} />
              <Line frame={frame} reveal={1284}>
                <span style={mono(15.2, '#9fb2bd')}>📁 保存到：</span>
                <span style={mono(15.2, '#d9e4ea')}>C:\Users\LengxiQwQ\output</span>
                <span style={mono(14, T.dim)}> (共 2 个文件)</span>
              </Line>
              <Line frame={frame} reveal={1290}>
                <span style={mono(14.6, '#9fc9b2')}>✨ 感谢使用！欢迎在 GitHub 点个 Star ⭐️</span>
              </Line>
              <Line frame={frame} reveal={1296}>
                <span style={mono(14.2, '#627b8a')}>Playlist Out - Paste. Parse. Export.</span>
              </Line>
              <Line frame={frame} reveal={1306}>
                <span style={mono(14.8, '#8fa4b2')}>PS C:\Users\LengxiQwQ&gt; </span>
                <span style={{...mono(14.8, '#dce6ec'), opacity: blink ? 0.9 : 0.2}}>▌</span>
              </Line>
            </div>

            <div
              style={{
                position: 'absolute',
                left: 28,
                right: 28,
                bottom: 8,
                height: 25,
                background: 'linear-gradient(to top, #09131b 0%, rgba(9,19,27,0) 100%)',
              }}
            />
          </div>
        </div>

        <Tape
          color="yellow"
          width={156}
          height={30}
          rotate={-7}
          opacity={0.8}
          style={{left: -80, top: -16, zIndex: 5}}
        />
        <Tape
          color="blue"
          width={112}
          height={24}
          rotate={5}
          opacity={0.75}
          style={{right: 70, bottom: -13, zIndex: 5}}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 76,
          top: 198,
          width: 148,
          background: 'rgba(250,246,236,0.94)',
          border: '1.4px solid rgba(116,99,75,0.48)',
          borderRadius: 3,
          boxShadow: '3px 4px 0 rgba(45,52,54,0.14)',
          padding: '8px 10px 2px',
          transform: `rotate(-5deg) translateX(${(1 - between(frame, 1090, 1112)) * -18}px)`,
          opacity: between(frame, 1090, 1110) * (1 - between(frame, 1308, 1328)),
        }}
      >
        <div style={{fontFamily: FONTS.hand, fontSize: 20, color: '#5e594e', lineHeight: 1.35}}>
          真正的
          <br />
          桌面工具。
        </div>
        <CurlyArrow width={82} height={74} color="#9a8a75" style={{marginLeft: 20, marginTop: 3}} rotate={8} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 238,
          right: 238,
          bottom: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: between(frame, 1308, 1328) * (1 - between(frame, 1360, 1380)),
          transform: `translateY(${(1 - between(frame, 1308, 1328)) * 14}px)`,
        }}
      >
        <div style={{display: 'flex', gap: 10}}>
          <OsBadge label="Windows" symbol="⊞" detail=".exe 单文件 / npm" color="#3d7ea6" appear={between(frame, 1310, 1324)} />
          <OsBadge label="macOS" symbol="⌘" detail="arm64 / x64" color="#5f666b" appear={between(frame, 1313, 1327)} />
          <OsBadge label="Linux" symbol=">_" detail="x64 单文件" color="#55795b" appear={between(frame, 1316, 1330)} />
        </div>
        <div
          style={{
            background: '#fdf8e9',
            border: '1.4px solid rgba(45,52,54,0.35)',
            boxShadow: '2px 3px 0 rgba(45,52,54,0.12)',
            padding: '7px 12px',
            transform: 'rotate(-1deg)',
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: '#615b4e',
          }}
        >
          npm install -g playlistout <span style={{color: '#2f8a62'}}>·</span>{' '}
          <span style={{fontFamily: FONTS.sans, fontSize: 9}}>本地解析 · 歌单不上传</span>
        </div>
      </div>

      <Sparkle
        size={20}
        style={{position: 'absolute', left: 426, top: 120, opacity: between(frame, 1328, 1344) * (1 - between(frame, 1360, 1378))}}
        rotate={11}
      />
      <Star size={14} color="#c9a354" style={{position: 'absolute', right: 350, top: 128, opacity: between(frame, 1340, 1354)}} rotate={-8} />
    </AbsoluteFill>
  );
};
