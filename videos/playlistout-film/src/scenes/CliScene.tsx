import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { blink, easeBackOut, easeInOut, easeOut, typeOn } from '../anim';
import { DEMO_PLAYLIST } from '../data';
import { C, F, SCENES, cue } from '../theme';
import { JournalCard, SceneHeaderBanner, StickyBadge } from '../components/Stationery';
import { AppleLogo, LinuxLogo, NpmLogo, PlatformId, PlatformLogo, WindowsLogo } from '../components/BrandLogos';

const rel = (name: Parameters<typeof cue>[0]) => cue(name) - SCENES.cli.in;

// 42 颗确定性爆炸礼花彩片粒子预设 (CLI 导出完成触发)
const CLI_FIREWORK_PARTICLES = Array.from({ length: 42 }).map((_, i) => {
  const angleDeg = -175 + (i * 350) / 41 + (((i * 17) % 25) - 12);
  const angleRad = (angleDeg * Math.PI) / 180;
  const dist = 140 + ((i * 37) % 260);
  const colors = ['#FFD700', '#38BDF8', '#4ADE80', '#F43F5E', '#A855F7', '#FDE047', '#FFFFFF'];
  const color = colors[i % colors.length];
  const types: ('ribbon' | 'star' | 'note' | 'diamond' | 'circle')[] = [
    'ribbon',
    'star',
    'ribbon',
    'note',
    'diamond',
    'star',
    'circle',
  ];
  const type = types[i % types.length];
  const notes = ['♪', '♫', '♬'];
  const noteChar = notes[i % notes.length];
  const rotSpeed = ((i * 53) % 720) - 360;
  return {
    angleRad,
    dist,
    color,
    type,
    noteChar,
    rotSpeed,
    gravity: 0.6 + ((i * 19) % 50) / 100,
    size: 14 + ((i * 11) % 12),
  };
});

/**
 * 炫酷爆炸礼花组件 (CLI 敲击回车导出成功瞬间爆发)
 */
const CliCelebrationFireworks: React.FC<{ frame: number; burstFrame: number }> = ({
  frame,
  burstFrame,
}) => {
  if (frame < burstFrame || frame > burstFrame + 52) return null;

  const age = frame - burstFrame;
  const progress = Math.min(1, age / 42);
  const shockProgress = Math.min(1, age / 26);
  const badgePop = easeBackOut(frame, burstFrame + 2, 16);
  const badgeFade = age > 38 ? Math.max(0, 1 - (age - 38) / 14) : 1;

  // 爆炸中心：Enter 回车键帽中心 (1555, 685)
  const cx = 1555;
  const cy = 685;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 60,
      }}
    >
      {/* 1. 双重金色与天青扩散冲击波光环 */}
      {shockProgress < 1 && (
        <svg
          style={{
            position: 'absolute',
            left: cx - 280,
            top: cy - 280,
            width: 560,
            height: 560,
            overflow: 'visible',
          }}
          viewBox="-280 -280 560 560"
        >
          {/* 金色主冲击波 */}
          <circle
            cx={0}
            cy={0}
            r={shockProgress * 230}
            fill="none"
            stroke="#FFD700"
            strokeWidth={Math.max(1, (1 - shockProgress) * 7.5)}
            strokeDasharray="16 8"
            opacity={(1 - shockProgress) * 0.9}
          />
          {/* 天青科技高能内层光环 */}
          <circle
            cx={0}
            cy={0}
            r={Math.max(0, shockProgress * 165 - 10)}
            fill="none"
            stroke="#38BDF8"
            strokeWidth={Math.max(1, (1 - shockProgress) * 5.5)}
            opacity={(1 - shockProgress) * 0.85}
          />
        </svg>
      )}

      {/* 2. 42 颗向四周爆炸迸发的彩色纸屑、四角星芒与飞舞音符 */}
      {CLI_FIREWORK_PARTICLES.map((p, idx) => {
        const flyEase = 1 - Math.pow(1 - progress, 2.6);
        const curDist = p.dist * flyEase;
        const px = cx + Math.cos(p.angleRad) * curDist;
        const py = cy + Math.sin(p.angleRad) * curDist + progress * progress * p.gravity * 95;
        const pRot = progress * p.rotSpeed;
        const pOpacity = progress < 0.1 ? progress / 0.1 : Math.max(0, 1 - Math.pow(progress, 1.6));
        const pScale = progress < 0.12 ? progress / 0.12 : Math.max(0.2, 1 - progress * 0.7);

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: px,
              top: py,
              transform: `translate(-50%, -50%) rotate(${pRot}deg) scale(${pScale})`,
              opacity: pOpacity,
              color: p.color,
              fontFamily: F.display,
              fontWeight: 900,
              fontSize: p.size,
              userSelect: 'none',
              filter: 'drop-shadow(1px 2px 0 rgba(45, 52, 54, 0.45))',
            }}
          >
            {p.type === 'ribbon' && (
              <div
                style={{
                  width: p.size * 1.3,
                  height: p.size * 0.55,
                  borderRadius: 3,
                  backgroundColor: p.color,
                  border: '1.8px solid #2d3436',
                }}
              />
            )}
            {p.type === 'star' && <span>✦</span>}
            {p.type === 'note' && <span>{p.noteChar}</span>}
            {p.type === 'diamond' && <span>◆</span>}
            {p.type === 'circle' && (
              <div
                style={{
                  width: p.size * 0.8,
                  height: p.size * 0.8,
                  borderRadius: '50%',
                  backgroundColor: p.color,
                  border: '1.8px solid #2d3436',
                }}
              />
            )}
          </div>
        );
      })}

      {/* 3. 弹出的炫酷庆祝徽章："🎉 CLI 本地导出完成！" */}
      <div
        style={{
          position: 'absolute',
          left: cx,
          top: cy - 365,
          transform: `translate(-50%, -50%) scale(${0.7 + badgePop * 0.3}) rotate(-1.5deg)`,
          opacity: badgePop * badgeFade,
          zIndex: 900,
        }}
      >
        <StickyBadge bg={C.yellow} ink={C.ink} fontSize={26} rotate={-1}>
          🎉 CLI 本地导出完成！
        </StickyBadge>
      </div>
    </div>
  );
};

const CLI_PLATFORMS: { id: PlatformId; num: string; name: string; color: string; desc: string }[] = [
  { id: 'netease', num: '1', name: '网易云音乐', color: '#ff7b7b', desc: '链接 / 短链 / ID / UID批量' },
  { id: 'qq', num: '2', name: 'QQ 音乐', color: '#7ee787', desc: '链接 / 短链 / ID / QQ号批量' },
  { id: 'kugou', num: '3', name: '酷狗音乐', color: '#79c0ff', desc: '普通版扫码全量 / 概念版免登' },
  { id: 'kuwo', num: '4', name: '酷我音乐', color: '#ffa657', desc: '歌单链接 / 短链 / ID' },
  { id: 'qishui', num: '5', name: '汽水音乐', color: '#56d4dd', desc: '汽水链接 / 抖音分享文案' },
  { id: 'migu', num: '6', name: '咪咕音乐', color: '#d2a8ff', desc: '歌单链接 / 短链 / ID' },
];

export const CliScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const menuReady = rel('cli_menu_ready');
  const pasteUrl = rel('cli_paste_url');
  const parsed = rel('cli_parsed');
  const chooseFmt = rel('cli_choose_fmt');
  const pressEnter = rel('cli_press_enter');
  const doneFrame = rel('cli_done');
  const osFrame = rel('cli_os_badges');
  const ecoEnter = rel('eco_enter');

  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 95 } });
  const exitProgress = easeInOut(frame, ecoEnter - 8, 14, 0, 1);
  const sceneOpacity = interpolate(frame, [0, 10, ecoEnter - 6, ecoEnter + 4], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const typedUrl = typeOn(DEMO_PLAYLIST.sourceUrl, frame, pasteUrl, 38, fps);
  const typedChoice = typeOn('1, 2', frame, chooseFmt + 10, 14, fps);
  const isEnterPressed = frame >= pressEnter - 2 && frame <= pressEnter + 10;

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        transform: `translateY(${-exitProgress * 75}px) scale(${1 - exitProgress * 0.04})`,
      }}
    >
      <SceneHeaderBanner
        stepTag="STEP 04 · 本地 CLI 命令行版"
        title="偏爱终端或双击运行？CLI 同样顺手"
        subtitle="跨平台独立单文件"
        tagBg={C.blue}
        style={{
          marginTop: 38,
          opacity: easeOut(frame, 0, 16),
        }}
      />

      {/* ================= MAIN HAND-CRAFTED TERMINAL WINDOW ================= */}
      <div
        style={{
          position: 'absolute',
          left: 162,
          top: 142,
          width: 1676,
          height: 720,
          transform: `translateY(${(1 - enter) * 60}px) rotate(-0.3deg)`,
          zIndex: 20,
        }}
      >
        <JournalCard
          bg={C.terminal}
          borderColor={C.ink}
          borderWidth={4}
          tapePos="both"
          tapeColor={C.tapeCyan}
          shadow="cutoutLg"
          style={{ width: '100%', height: '100%', overflow: 'hidden' }}
        >
          <div
            style={{
              height: 60,
              backgroundColor: C.terminalHeader,
              borderBottom: '3px solid #3f4750',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#ff5f56', display: 'inline-block' }} />
              <span style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#ffbd2e', display: 'inline-block' }} />
              <span style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#27c93f', display: 'inline-block' }} />
              <span
                style={{
                  marginLeft: 14,
                  fontFamily: F.mono,
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#e6edf3',
                }}
              >
                &gt;_ Windows PowerShell · playlistout (CLI v3.0.0)
              </span>
            </div>
            <div
              style={{
                fontFamily: F.mono,
                fontSize: 20,
                color: '#8b949e',
              }}
            >
              .\PlaylistOut.exe (单文件免安装即用)
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.38fr 0.62fr',
              height: 'calc(100% - 60px)',
              padding: '24px 32px',
              gap: 28,
            }}
          >
            {/* LEFT TERMINAL FLOW */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: F.mono,
                color: '#e6edf3',
              }}
            >
              <div>
                <div style={{ fontSize: 24, color: '#8b949e' }}>
                  PS C:\Users\LengxiQwQ&gt;{' '}
                  <span style={{ color: '#fde047', fontWeight: 700 }}>.\PlaylistOut.exe</span>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 16,
                  }}
                >
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>
                    Playlist Out CLI v3.0.0
                  </span>
                  <span style={{ fontFamily: F.sans, fontSize: 23, fontWeight: 700, color: '#cbd5e1' }}>
                    把你的歌单带走 - 命令行版
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    padding: '14px 18px',
                    borderRadius: 14,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '2px solid rgba(255, 255, 255, 0.14)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px 24px',
                    opacity: easeOut(frame, menuReady - 8, 14),
                  }}
                >
                  {CLI_PLATFORMS.map((p) => (
                    <div
                      key={p.num}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontFamily: F.sans,
                        fontSize: 21,
                        fontWeight: 700,
                      }}
                    >
                      <PlatformLogo platform={p.id} size={22} shape="squircle" />
                      <span style={{ fontFamily: F.mono, color: '#94a3b8' }}>[{p.num}]</span>
                      <span style={{ color: p.color, fontWeight: 900, minWidth: 108 }}>{p.name}</span>
                      <span style={{ color: '#94a3b8', fontSize: 18.5, fontWeight: 600 }}>{p.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {frame >= pasteUrl - 4 ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: '14px 18px',
                    borderRadius: 14,
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                    border: '2px solid rgba(56, 189, 248, 0.28)',
                  }}
                >
                  <div style={{ fontFamily: F.sans, fontSize: 21, fontWeight: 700, color: '#cbd5e1' }}>
                    💡 粘贴歌单链接，或输入平台编号：
                  </div>
                  <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: '#38bdf8' }}>
                    &gt; {typedUrl}
                    {frame < parsed ? (
                      <span style={{ opacity: blink(frame, 18), marginLeft: 4 }}>▌</span>
                    ) : null}
                  </div>

                  {frame >= parsed ? (
                    <div
                      style={{
                        marginTop: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 18,
                        fontFamily: F.sans,
                        fontSize: 23,
                        fontWeight: 800,
                        color: '#4ade80',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <PlatformLogo platform="qq" size={24} shape="squircle" />
                        <span>已识别：QQ 音乐</span>
                      </span>
                      <span style={{ color: '#fde047' }}>
                        🎵 歌单：{DEMO_PLAYLIST.name} ({DEMO_PLAYLIST.trackCount} 首 · 7小时6分)
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {frame >= chooseFmt - 4 ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: '14px 18px',
                    borderRadius: 14,
                    backgroundColor: 'rgba(74, 222, 128, 0.09)',
                    border: '2px solid rgba(74, 222, 128, 0.32)',
                  }}
                >
                  <div style={{ fontFamily: F.sans, fontSize: 21, fontWeight: 700, color: '#fde047' }}>
                    📦 导出格式：[1] Excel (.xlsx)  [2] JSON (.json)  [3] CSV  [4] TXT  [5] M3U8
                  </div>
                  <div style={{ marginTop: 6, fontSize: 23, fontWeight: 700, color: '#f8fafc' }}>
                    选择格式 (直接回车全部导出) &gt;{' '}
                    <span style={{ color: '#38bdf8' }}>{typedChoice}</span>
                  </div>
                  {frame >= pressEnter + 4 ? (
                    <div
                      style={{
                        marginTop: 8,
                        fontFamily: F.sans,
                        fontSize: 22.5,
                        fontWeight: 800,
                        color: '#4ade80',
                        lineHeight: 1.45,
                      }}
                    >
                      <div>✅ Excel  {DEMO_PLAYLIST.excelFile}</div>
                      <div>✅ JSON   {DEMO_PLAYLIST.jsonFile}</div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* RIGHT INTERACTIVE DOCK: MASCOT STAGE + GIANT ENTER KEYCAP */}
            <div
              style={{
                borderRadius: 20,
                backgroundColor: C.paperCream,
                border: `3.5px solid ${C.ink}`,
                padding: '22px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <StickyBadge bg={C.yellow} ink={C.ink} fontSize={20} rotate={-2}>
                  💻 零门槛向导
                </StickyBadge>
                <span style={{ fontFamily: F.kuaile, fontSize: 22, color: C.inkSoft }}>
                  粘贴即识别
                </span>
              </div>

              <div style={{ height: 270 }} />

              <div
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  borderRadius: 18,
                  backgroundColor: isEnterPressed ? '#207544' : frame >= pressEnter + 4 ? C.mint : C.yellow,
                  color: isEnterPressed ? '#ffffff' : C.ink,
                  border: `4px solid ${C.ink}`,
                  boxShadow: isEnterPressed ? '2px 2px 0 #2d3436' : '6px 8px 0 #2d3436',
                  transform: isEnterPressed ? 'translate(4px, 5px) scale(0.96)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 900 }}>
                    {frame >= pressEnter + 4 ? '✓ EXPORT DONE' : 'Enter ↵'}
                  </div>
                  <div style={{ fontFamily: F.sans, fontSize: 20, fontWeight: 800, marginTop: 2 }}>
                    {frame >= pressEnter + 4 ? '已导出到 output/ 目录' : '敲下回车，立即本地导出'}
                  </div>
                </div>
                <span style={{ fontSize: 38 }}>{frame >= pressEnter + 4 ? '🎉' : '⏎'}</span>
              </div>
            </div>
          </div>
        </JournalCard>
      </div>

      {/* ================= CELEBRATION FIREWORKS UPON CLI EXPORT COMPLETION ================= */}
      <CliCelebrationFireworks frame={frame} burstFrame={pressEnter} />

      {/* ================= BOTTOM CROSS-PLATFORM & INSTALL BAR ================= */}
      <div
        style={{
          position: 'absolute',
          left: 162,
          top: 888,
          width: 1676,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
          zIndex: 25,
        }}
      >
        {[
          { logo: <WindowsLogo size={42} />, title: 'Windows x64', sub: '单文件 .exe 双击即用', bg: C.blue },
          { logo: <span style={{ fontSize: 36, display: 'grid', placeItems: 'center', width: 42, height: 42 }}>🌐</span>, title: 'Web 网页版', sub: '免安装 · 手机电脑全兼容', bg: C.mint },
          { logo: <AppleLogo size={42} />, title: 'macOS (M/Intel)', sub: '内置 .command 启动器', bg: C.pink },
          { logo: <LinuxLogo size={42} />, title: 'Linux x64', sub: '独立二进制免配环境', bg: C.yellowCard },
        ].map((item, idx) => {
          const entryFrame = 6 + idx * 4;
          const pop = easeBackOut(frame, entryFrame, 18);
          return (
            <div
              key={item.title}
              style={{
                opacity: easeOut(frame, entryFrame, 14),
                transform: `translateY(${(1 - pop) * 36}px) rotate(${idx % 2 === 0 ? -0.8 : 0.8}deg)`,
              }}
            >
              <JournalCard
                bg={item.bg}
                shadow="cutout"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                {item.logo}
                <div>
                  <div style={{ fontFamily: F.sans, fontSize: 23, fontWeight: 900, color: C.ink }}>
                    {item.title}
                  </div>
                  <div style={{ fontFamily: F.sans, fontSize: 18.5, fontWeight: 700, color: C.inkSoft, marginTop: 2 }}>
                    {item.sub}
                  </div>
                </div>
              </JournalCard>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
