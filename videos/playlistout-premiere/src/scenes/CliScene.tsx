import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, F, SCENES, cue } from '../theme';
import { blink, easeInOut, easeOut, typeOn } from '../anim';
import { ChapterMark, Sparkle, Squiggle, Tape } from '../components/Doodles';
import { PaperSheet, StickerTag } from '../components/Paper';
import { OS, PLATFORMS } from '../data';

const rel = (name: Parameters<typeof cue>[0]) => Math.max(0, cue(name) - SCENES.cli.in);
const L = {
  boot: rel('cli_boot'),
  prompt: rel('cli_prompt'),
  url: rel('cli_url'),
  fetch: rel('cli_fetch'),
  details: rel('cli_details'),
  menu: rel('cli_menu'),
  choose: rel('cli_choose'),
  exported: rel('cli_export'),
  os: rel('os'),
};

const T = {
  x: 198,
  y: 138,
  w: 1524,
  h: 754,
  chrome: 40,
};

const lineH = 25;

type Line = {
  at: number;
  node: React.ReactNode;
  tone?: string;
  typed?: { text: string; cps?: number };
};

const CommandLine: React.FC<{ prompt?: string; children: React.ReactNode; cursor?: boolean; frame: number }> = ({
  prompt = '>',
  children,
  cursor,
  frame,
}) => (
  <div style={{ display: 'flex', alignItems: 'baseline', whiteSpace: 'pre' }}>
    <span style={{ color: '#76c8c5', marginRight: 8 }}>{prompt}</span>
    <span>{children}</span>
    {cursor ? <span style={{ display: 'inline-block', width: 8, height: 16, background: '#bfe9d9', marginLeft: 3, opacity: blink(frame, 30) }} /> : null}
  </div>
);

const platformDescriptions: Record<string, string> = {
  netease: '歌单链接 / 分享短链 / 歌单 ID / 用户 UID',
  qq: '歌单链接 / 分享短链 / 歌单 ID / 用户 QQ号',
  kugou: '歌单链接 / 分享短链 / 歌单 ID（普通版需登录，概念版免登全量）',
  kuwo: '歌单链接 / 分享短链 / 歌单 ID',
  qishui: '歌单链接 / 抖音分享文案 / 歌单 ID',
  migu: '歌单链接 / 分享短链 / 歌单 ID',
};

const PlatformMenu: React.FC = () => (
  <div style={{ marginTop: 2 }}>
    {[PLATFORMS[1], PLATFORMS[0], PLATFORMS[2], PLATFORMS[3], PLATFORMS[4], PLATFORMS[5]].map((p, i) => (
      <div key={p.id} style={{ display: 'flex', alignItems: 'baseline', whiteSpace: 'pre' }}>
        <span style={{ color: '#b8b9ad', width: 20 }}>{i + 1}</span>
        <span style={{ color: p.color === '#dff0b0' ? '#c8d89c' : p.id === 'netease' ? '#e59196' : p.id === 'kugou' ? '#90bad2' : p.id === 'kuwo' ? '#e2b87e' : p.id === 'qishui' ? '#8dc7b1' : '#c0a6dc', width: 128 }}>{p.name}</span>
        <span style={{ color: '#9a9d91', fontSize: 13 }}>{platformDescriptions[p.id]}</span>
      </div>
    ))}
  </div>
);

export const CliScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 22, stiffness: 92, mass: 0.95 }, durationInFrames: 44 });
  const exit = easeInOut(frame, 338, 26, 0, 1);
  const outerOpacity = interpolate(frame, [0, 1, 336, 358], [1, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const url = 'https://y.qq.com/n/ryqq/playlist/9140654872';
  const urlTyped = typeOn(url, frame, L.url, 30);
  const commandTyped = typeOn('playlistout', frame, L.boot, 18);
  const formatsTyped = typeOn('1, 2', frame, L.choose, 11);

  const bootBlock =
    frame >= L.boot + 20
      ? [
          <div key="banner" style={{ fontFamily: F.mono, fontSize: 16, color: '#e5bd78', fontWeight: 700, letterSpacing: '.02em' }}>Playlist Out CLI v3.0.0</div>,
          <div key="subtitle" style={{ color: '#d6d3c3', fontSize: 14 }}>把你的歌单带走 - 命令行版</div>,
          <div key="space" style={{ height: 12 }} />,
          <div key="desc1" style={{ color: '#c7c4b7' }}>你的歌单，不应该只困在一个音乐平台里。</div>,
          <div key="desc2" style={{ color: '#c7c4b7' }}>解析、导出，并把歌单继续带进支持的开源播放器。</div>,
          <div key="link" style={{ color: '#858d82', fontSize: 12, marginTop: 4 }}>github.com/LengxiQwQ/playlistout · playlistout.lengxiqwq.com</div>,
          <div key="divider" style={{ color: '#546057', marginTop: 10, marginBottom: 6 }}>────────────────────────────────────────────────────────────</div>,
          <PlatformMenu key="menu" />,
          <div key="tip1" style={{ color: '#8f9387', marginTop: 8, fontSize: 12.5 }}>💡 直接粘贴链接或分享文案即可自动识别平台。</div>,
          <div key="tip2" style={{ color: '#8f9387', fontSize: 12.5 }}>💡 只有歌单 ID？先输入平台编号。</div>,
          <div key="prompt" style={{ marginTop: 10, color: '#c7c4b7' }}>粘贴歌单链接，或输入平台编号：</div>,
        ]
      : [];
  const fetchLines =
    frame >= L.fetch
      ? [
          <CommandLine key="url" frame={frame} prompt=">" >{urlTyped || ''}<span style={{ opacity: frame < L.fetch - 4 ? blink(frame, 30) : 0 }}>▌</span></CommandLine>,
          <div key="recognized" style={{ color: '#82c994', marginTop: 9 }}>✅ 已识别：QQ 音乐</div>,
          <div key="fetching" style={{ color: '#d5c39d' }}>🚀 正在获取歌单...</div>,
        ]
      : frame >= L.url
        ? [
            <CommandLine key="url" frame={frame} prompt=">" cursor={frame < L.fetch}>{urlTyped}</CommandLine>,
          ]
        : [];
  const detailLines =
    frame >= L.details
      ? [
          <div key="divider2" style={{ color: '#546057', marginTop: 10, marginBottom: 5 }}>────────────────────────────────────────────────────────────</div>,
          <div key="detailTitle" style={{ color: '#d7c18d' }}>🎵 歌单详情</div>,
          <div key="name" style={{ color: '#c7c4b7' }}>  歌单：花谱、鎖那、鹿乃、春猿火</div>,
          <div key="creator" style={{ color: '#c7c4b7' }}>  作者：琴心月满</div>,
          <div key="count" style={{ color: '#c7c4b7' }}>  歌曲：104 首</div>,
          <div key="duration" style={{ color: '#c7c4b7' }}>  时长：7 小时 6 分钟</div>,
          <div key="vip" style={{ color: '#c7c4b7' }}>  状态：VIP 2</div>,
        ]
      : [];
  const menuLines =
    frame >= L.menu
      ? [
          <div key="fmtDivider" style={{ color: '#546057', marginTop: 10, marginBottom: 5 }}>────────────────────────────────────────────────────────────</div>,
          <div key="fmtTitle" style={{ color: '#d7c18d' }}>📦 导出格式</div>,
          <div key="f1" style={{ color: '#c7c4b7' }}>  1  Excel (.xlsx)  适合查看、整理和备份</div>,
          <div key="f2" style={{ color: '#c7c4b7' }}>  2  JSON  (.json)  适合第三方工具和程序导入</div>,
          <div key="f3" style={{ color: '#c7c4b7' }}>  3  CSV   (.csv)   适合表格软件和迁移工具</div>,
          <div key="f4" style={{ color: '#c7c4b7' }}>  4  TXT   (.txt)   简单的歌曲清单</div>,
          <div key="f5" style={{ color: '#c7c4b7' }}>  5  M3U8  (.m3u8)  通用播放列表</div>,
          <div key="blank" style={{ height: 7 }} />,
          <div key="enter" style={{ color: '#9a9d91' }}>  Enter  全部导出</div>,
          <div key="back" style={{ color: '#9a9d91' }}>  0      返回</div>,
          <div key="choicePrompt" style={{ color: '#c7c4b7', marginTop: 7 }}>选择格式，可多选，例如 (1, 2)：</div>,
        ]
      : [];
  const chooseLines =
    frame >= L.choose
      ? [
          <CommandLine key="choice" frame={frame} prompt=">">{formatsTyped}<span style={{ opacity: frame < L.exported - 8 ? blink(frame, 30) : 0 }}>▌</span></CommandLine>,
        ]
      : [];
  const exportLines =
    frame >= L.exported
      ? [
          <div key="exporting" style={{ color: '#d5c39d', marginTop: 9 }}>🚀 正在导出...</div>,
          <div key="excel" style={{ color: '#82c994' }}>✅ Excel  【QQ 音乐】花谱、鎖那、鹿乃 - 琴心月满.xlsx</div>,
          <div key="json" style={{ color: '#82c994' }}>✅ JSON   【QQ 音乐】花谱、鎖那、鹿乃 - 琴心月满.json</div>,
          <div key="folder" style={{ color: '#9a9d91', marginTop: 6 }}>📂 已打开 output 文件夹</div>,
          <div key="thanks" style={{ color: '#d7c18d', marginTop: 6 }}>感谢使用！欢迎在 GitHub 点个 Star ⭐️</div>,
        ]
      : [];

  const allBlocks = [
    ...bootBlock,
    ...(frame >= L.url ? [<div key="urlBlock" style={{ marginTop: 2 }}>{fetchLines}</div>] : []),
    ...detailLines,
    ...menuLines,
    ...chooseLines,
    ...exportLines,
  ];

  const scrollTarget = (() => {
    if (frame < L.url) return 0;
    if (frame < L.fetch) return 88;
    if (frame < L.details) return 170;
    if (frame < L.menu) return 270;
    if (frame < L.exported) return 430;
    return 510;
  })();
  const scroll = easeInOut(frame, L.url, 12, 0, scrollTarget * 0.6) + easeInOut(frame, L.fetch, 20, 0, scrollTarget * 0.22) + easeInOut(frame, L.details, 18, 0, scrollTarget * 0.12) + easeInOut(frame, L.exported, 20, 0, 26);
  const terminalGlow = 0.06 + Math.sin(frame / 23) * 0.01;

  return (
    <AbsoluteFill style={{ opacity: outerOpacity }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${(1 - enter) * 64 - exit * 36}px) scale(${0.975 + enter * 0.025 - exit * 0.02}) rotate(${(1 - enter) * 0.5 + exit * 0.5}deg)`,
          transformOrigin: 'center center',
        }}
      >
        <ChapterMark
          number="04"
          kicker="CLI / THE LOCAL WAY"
          title="不想打开浏览器？终端见。"
          compact
          style={{ position: 'absolute', left: 171, top: 54, opacity: easeOut(frame, 4, 18) }}
        />
        <div style={{ position: 'absolute', right: 176, top: 61, textAlign: 'right', fontFamily: F.hand, fontSize: 23, color: C.inkSoft, transform: 'rotate(1.2deg)' }}>
          本地运行 · 直出文件 · 跨平台
        </div>

        <div
          style={{
            position: 'absolute',
            left: T.x,
            top: T.y,
            width: T.w,
            height: T.h,
            zIndex: 40,
            filter: 'drop-shadow(0 30px 50px rgba(54,42,24,.25))',
          }}
        >
          <div style={{ position: 'absolute', top: -14, left: 110, zIndex: 8 }}>
            <Tape color="rgba(247,187,162,.68)" width={150} height={28} rotate={-3} />
          </div>
          <div style={{ position: 'absolute', top: -10, right: 160, zIndex: 8 }}>
            <Tape color="rgba(152,213,218,.5)" width={108} height={23} rotate={4} />
          </div>
          <PaperSheet tone="dark" shadow="lifted" style={{ width: '100%', height: '100%', padding: 0, background: '#151814' }} radius="5px 9px 5px 8px / 8px 5px 9px 5px">
            <div
              style={{
                height: T.chrome,
                background: 'linear-gradient(to bottom, #2b302b, #20251f)',
                borderBottom: '1px solid rgba(220,232,208,.13)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
                gap: 9,
              }}
            >
              <div style={{ display: 'flex', gap: 6 }}>
                {['#d9968e', '#d8bf79', '#91b88f'].map((color) => <span key={color} style={{ width: 9, height: 9, borderRadius: '50%', background: color, opacity: 0.92 }} />)}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 10.5, color: '#c9cec2', margin: '0 auto', letterSpacing: '.02em' }}>Windows PowerShell — playlistout</div>
              <div style={{ display: 'flex', gap: 10, color: '#777e74', fontFamily: F.mono, fontSize: 10 }}>
                <span>—</span><span>□</span><span>×</span>
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: T.chrome,
                bottom: 0,
                overflow: 'hidden',
                background: '#131612',
                backgroundImage: 'radial-gradient(ellipse at 45% 4%, rgba(224,184,112,.065), transparent 48%), repeating-linear-gradient(to bottom, transparent 0 3px, rgba(255,255,255,.012) 3px 4px)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: `linear-gradient(120deg, rgba(255,255,255,${terminalGlow}), transparent 40%)`,
                }}
              />
              <div
                style={{
                  padding: '22px 28px',
                  fontFamily: F.mono,
                  fontSize: 16,
                  lineHeight: `${lineH}px`,
                  color: '#c6c4b6',
                  transform: `translateY(${-Math.min(540, scroll)}px)`,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {frame < L.boot ? (
                  <div style={{ color: '#a8ac9f' }}>Windows PowerShell<br /><span style={{ color: '#777d71' }}>Copyright (C) Microsoft Corporation. All rights reserved.</span><br /><br /><span style={{ color: '#c7c4b7' }}>PS C:\Users\LengxiQwQ&gt; </span></div>
                ) : (
                  <div style={{ color: '#a8ac9f', whiteSpace: 'pre' }}>
                    Windows PowerShell
                    <br />
                    <span style={{ color: '#777d71' }}>Copyright (C) Microsoft Corporation. All rights reserved.</span>
                    <br /><br />
                    <span style={{ color: '#c7c4b7' }}>PS C:\Users\LengxiQwQ&gt; </span><span>{commandTyped}</span><span style={{ opacity: blink(frame, 28) }}>▌</span>
                    <br />
                    {allBlocks}
                  </div>
                )}
                {frame < L.boot ? <div style={{ marginTop: 10, color: '#d7c18d', opacity: 0.7 }}>正在启动本地歌单导出工具…</div> : null}
              </div>
              <div style={{ position: 'absolute', left: 22, right: 24, bottom: 15, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 8.5, color: '#596358', letterSpacing: '.09em' }}>
                <span>LOCAL SESSION · UTF-8 · 120 × 30</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: '#78b58e' }} /> READY</span>
              </div>
            </div>
          </PaperSheet>
        </div>

        {/* cross-platform strip, appearing once the export has happened */}
        <div
          style={{
            position: 'absolute',
            left: T.x,
            top: 913,
            width: T.w,
            height: 92,
            background: 'rgba(255,251,239,.75)',
            border: '1.2px solid rgba(45,52,54,.17)',
            borderRadius: '4px 7px 4px 6px',
            boxShadow: '2px 3px 0 rgba(45,52,54,.08)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 22px',
            gap: 26,
            opacity: easeOut(frame, L.os - 10, 20),
            transform: `translateY(${(1 - easeOut(frame, L.os - 10, 20)) * 18}px)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
            <span style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: '.14em', color: C.inkMuted }}>WRITTEN FOR</span>
            <span style={{ fontFamily: F.hand, fontSize: 22, color: C.inkSoft }}>每一台桌面</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {OS.map((os, i) => (
              <div key={os.name} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 11px', background: 'rgba(255,255,255,.55)', border: '1px solid rgba(45,52,54,.22)', borderRadius: 4, fontFamily: F.sans, fontSize: 11.5, color: C.inkSoft, transform: `rotate(${i === 1 ? 0.8 : i === 2 ? -0.6 : 0}deg)` }}>
                <span style={{ fontFamily: F.mono, fontSize: 12 }}>{os.mark}</span>{os.name}
              </div>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkMuted, letterSpacing: '.1em' }}>ONE COMMAND AWAY</div>
            <div style={{ fontFamily: F.mono, fontSize: 13, color: C.ink, marginTop: 4 }}>npm i -g playlistout</div>
          </div>
          <StickerTag tone={C.mint} ink="#386e49" rotate={2} style={{ fontFamily: F.sans, fontSize: 10, padding: '5px 9px', flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3e7650' }} /> 单文件也有
          </StickerTag>
        </div>

        <div style={{ position: 'absolute', left: 171, bottom: 42, display: 'flex', alignItems: 'center', gap: 11, opacity: 0.8 }}>
          <Sparkle size={17} color={C.yellowDeep} />
          <span style={{ fontFamily: F.hand, fontSize: 21, color: C.inkSoft, transform: 'rotate(-1deg)' }}>不用等浏览器，也不用离开键盘。</span>
        </div>
        <div style={{ position: 'absolute', right: 166, bottom: 45, fontFamily: F.mono, fontSize: 9, letterSpacing: '.16em', color: C.inkMuted, opacity: 0.7 }}>
          P.05 / TYPE. TAKE. GO.
        </div>
      </div>
    </AbsoluteFill>
  );
};
