import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { easeBackOut, easeInOut, easeOut, typeOn } from '../anim';
import { DEMO_PLAYLIST, PLATFORMS } from '../data';
import { C, F, SCENES, SHADOW, cue } from '../theme';
import { HandCheck, JournalCard, SceneHeaderBanner, StickyBadge } from '../components/Stationery';
import { PlatformLogo } from '../components/BrandLogos';
import { CelebrationFireworks } from '../components/CelebrationFireworks';

const rel = (name: Parameters<typeof cue>[0]) => cue(name) - SCENES.parse.in;

export const ParseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const urlStart = rel('url_type_start');
  const clickFrame = rel('parse_click');
  const unfoldFrame = rel('result_unfold');
  const cascadeFrame = rel('tracks_cascade');
  const toolbarFrame = rel('toolbar_highlight');
  const exportClickFrame = rel('export_click');
  const splitFrame = rel('files_split');

  const cardIn = easeInOut(frame, 0, 22, 0, 1);
  const unfoldProgress = easeInOut(frame, unfoldFrame, 20, 0, 1);
  const exitProgress = easeInOut(frame, splitFrame - 8, 14, 0, 1);
  const sceneOpacity = interpolate(frame, [0, 18, splitFrame - 6, splitFrame + 4], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scrollStart = cascadeFrame + 26;
  const scrollDuration = 64;
  const scrollProgress = easeInOut(frame, scrollStart, scrollDuration, 0, 1);
  const scrollY = scrollProgress * 380;

  const typedUrl = typeOn(DEMO_PLAYLIST.sourceUrl, frame, urlStart, 32, fps);
  const isParsePressed = frame >= clickFrame - 2 && frame <= clickFrame + 10;
  const isExportPressed = frame >= exportClickFrame - 2 && frame <= exportClickFrame + 12;

  const searchTop = interpolate(unfoldProgress, [0, 1], [156, 122]);
  const searchPaddingY = interpolate(unfoldProgress, [0, 1], [28, 18]);

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        transform: `scale(${1 - exitProgress * 0.04}) translateY(${-exitProgress * 50}px)`,
      }}
    >
      <SceneHeaderBanner
        stepTag="STEP 01 · 网页解析歌单"
        title="粘贴歌单链接，一键解析曲目"
        subtitle="免安装即用"
        tagBg={C.yellow}
        style={{
          marginTop: 38,
          opacity: easeOut(frame, 2, 20),
        }}
      />

      {/* ================= YELLOW STICKY NOTE SEARCH BOX ================= */}
      <div
        style={{
          position: 'absolute',
          left: 162,
          top: searchTop,
          width: 1676,
          transform: `translateY(${(1 - cardIn) * 55}px) rotate(${(1 - cardIn) * 1.2}deg)`,
          zIndex: 25,
        }}
      >
        <JournalCard
          bg={C.yellowCard}
          rotate={-0.3}
          tapePos="both"
          tapeColor={C.tapePink}
          shadow="cutoutLg"
          style={{
            padding: `${searchPaddingY}px 36px`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontFamily: F.display,
                fontSize: 38,
                color: C.ink,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <span>在这里粘贴歌单链接 ↓</span>
              {frame >= clickFrame ? (
                <StickyBadge bg={C.mint} ink={C.mintDeep} fontSize={20} rotate={-1}>
                  <PlatformLogo platform="qq" size={22} shape="squircle" style={{ marginRight: 6 }} />
                  <span>已识别：QQ 音乐</span>
                </StickyBadge>
              ) : null}
            </div>
            <StickyBadge bg="#f1f5f9" ink="#475569" fontSize={20} rotate={1}>
              支持长链 · 短链 · 分享文案 · 歌单 ID
            </StickyBadge>
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div
              style={{
                flex: 1,
                height: 84,
                backgroundColor: C.paperWhite,
                border: `3.5px solid ${frame >= urlStart ? '#475569' : C.ink}`,
                borderRadius: 16,
                boxShadow:
                  frame >= urlStart
                    ? '0 0 0 6px rgba(71, 85, 105, 0.15), inset 0 2px 4px rgba(0,0,0,0.05)'
                    : 'inset 0 2px 4px rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 26px',
                overflow: 'hidden',
              }}
            >
              {typedUrl ? (
                <span
                  style={{
                    fontFamily: F.mono,
                    fontSize: 30,
                    fontWeight: 700,
                    color: C.ink,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {typedUrl}
                  {frame < clickFrame ? (
                    <span
                      style={{
                        display: 'inline-block',
                        width: 14,
                        height: 34,
                        backgroundColor: '#334155',
                        marginLeft: 6,
                        verticalAlign: 'middle',
                      }}
                    />
                  ) : null}
                </span>
              ) : (
                <span
                  style={{
                    fontFamily: F.sans,
                    fontSize: 27,
                    fontWeight: 500,
                    color: C.inkMuted,
                  }}
                >
                  粘贴 QQ 音乐 / 网易云 / 酷狗 / 酷我 / 汽水 / 咪咕 歌单链接…
                </span>
              )}
            </div>

            <div
              style={{
                width: 240,
                height: 84,
                borderRadius: 16,
                backgroundColor: isParsePressed ? '#1e293b' : '#334155',
                border: `3.5px solid ${C.ink}`,
                boxShadow: isParsePressed ? '2px 2px 0 #2d3436' : SHADOW.cutout,
                transform: isParsePressed ? 'translate(4px, 4px) scale(0.96)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                color: '#ffffff',
                fontFamily: F.sans,
                fontSize: 32,
                fontWeight: 900,
              }}
            >
              <span>🔍</span>
              <span>{frame >= clickFrame && frame < unfoldFrame ? '解析中…' : '解析'}</span>
            </div>
          </div>

          {unfoldProgress < 0.85 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginTop: 16,
                opacity: 1 - unfoldProgress * 1.15,
                height: interpolate(unfoldProgress, [0, 1], [44, 0]),
                overflow: 'hidden',
              }}
            >
              <span style={{ fontFamily: F.sans, fontSize: 21, fontWeight: 700, color: C.inkSoft }}>
                试试示例：
              </span>
              {PLATFORMS.map((p) => (
                <span
                  key={p.id}
                  style={{
                    padding: '4px 14px',
                    borderRadius: 10,
                    backgroundColor: p.badgeBg,
                    border: `2.2px solid ${C.ink}`,
                    fontFamily: F.sans,
                    fontSize: 19,
                    fontWeight: 800,
                    color: p.badgeInk,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                  }}
                >
                  <PlatformLogo platform={p.id} size={20} shape="squircle" />
                  <span>{p.name}</span>
                </span>
              ))}
            </div>
          ) : null}
        </JournalCard>
      </div>

      {/* ================= STANDBY PLAYLIST BENCH BLUEPRINT (0s - 11.2s before unfold) ================= */}
      {frame < unfoldFrame + 6 ? (
        <div
          style={{
            position: 'absolute',
            left: 162,
            top: interpolate(unfoldProgress, [0, 1], [452, 348]),
            width: 1676,
            height: interpolate(unfoldProgress, [0, 1], [576, 682]),
            opacity: interpolate(frame, [unfoldFrame - 6, unfoldFrame + 2], [1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            transform: `translateY(${(1 - cardIn) * 45}px) rotate(0.15deg)`,
            zIndex: 18,
            pointerEvents: 'none',
          }}
        >
          <JournalCard
            bg={C.paperWhite}
            rotate={0.15}
            shadow="cutoutLg"
            style={{
              width: '100%',
              height: '100%',
              padding: '26px 34px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* Standby Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 18,
                borderBottom: `3px dashed ${C.line}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div
                  style={{
                    width: 74,
                    height: 74,
                    borderRadius: 18,
                    backgroundColor: C.paperCream,
                    border: `3px dashed #94a3b8`,
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: F.display,
                    fontSize: 36,
                    color: '#94a3b8',
                  }}
                >
                  ♪
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontFamily: F.sans, fontSize: 30, fontWeight: 900, color: '#475569' }}>
                      歌单解析就绪区 · 待命状态
                    </span>
                    <StickyBadge bg={C.yellowCard} ink={C.yellowDeep} fontSize={18} rotate={-1}>
                      等待点击「解析」
                    </StickyBadge>
                  </div>
                  <div style={{ marginTop: 6, fontFamily: F.sans, fontSize: 20, fontWeight: 700, color: C.inkMuted }}>
                    输入公开歌单链接后 · 点击右侧「解析」按钮瞬间提取完整曲目与状态标定
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <StickyBadge bg="#f1f5f9" ink="#475569" fontSize={18} rotate={0.8}>
                  🔒 纯端侧解析 · 零服务端存储
                </StickyBadge>
                <StickyBadge bg={C.mint} ink={C.mintDeep} fontSize={18} rotate={-1}>
                  ⚡ 自动分页获取全量曲目
                </StickyBadge>
              </div>
            </div>

            {/* Skeleton Table Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
              {[
                { no: '01', title: '残酷な天使のテーゼ', artist: '高橋洋子', album: '新世紀エヴァンゲリオン', tag: '正常' },
                { no: '02', title: 'only my railgun', artist: 'fripSide', album: 'とある科学の超電磁砲', tag: 'VIP专享' },
                { no: '03', title: '打上花火', artist: 'DAOKO × 米津玄師', album: '打ち上げ花火', tag: '正常' },
                { no: '04', title: '前前前世 (movie ver.)', artist: 'RADWIMPS', album: '君の名は。', tag: '正常' },
              ].map((sk, skIdx) => (
                <div
                  key={sk.no}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '64px 1.4fr 1fr 1fr 110px',
                    alignItems: 'center',
                    padding: '12px 18px',
                    borderRadius: 14,
                    backgroundColor: skIdx % 2 === 0 ? 'rgba(241, 245, 249, 0.65)' : C.paperCream,
                    border: '2px dashed #cbd5e1',
                    fontFamily: F.sans,
                    fontSize: 21,
                    fontWeight: 700,
                    color: '#94a3b8',
                  }}
                >
                  <span style={{ fontFamily: F.mono, fontSize: 19 }}>{sk.no}</span>
                  <span style={{ fontWeight: 800 }}>{sk.title}</span>
                  <span>{sk.artist}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sk.album}</span>
                  <span style={{ fontSize: 18, color: sk.tag === 'VIP专享' ? '#f59e0b' : '#10b981' }}>{sk.tag}</span>
                </div>
              ))}
            </div>

            {/* Standby Bottom Guidance Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderRadius: 14,
                backgroundColor: C.paperCream,
                border: `2px dashed ${C.line}`,
                fontFamily: F.sans,
                fontSize: 20,
                fontWeight: 700,
                color: C.inkSoft,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>💡 待命格式：</span>
                <span style={{ color: C.mintDeep, fontWeight: 900 }}>Excel (.xlsx) 双表</span>
                <span>·</span>
                <span style={{ color: C.blueDeep, fontWeight: 900 }}>Canonical JSON</span>
                <span>·</span>
                <span>CSV / TXT / M3U8</span>
              </div>
              <span style={{ fontFamily: F.kuaile, fontSize: 22, color: '#475569' }}>
                支持 1000+ 首超大歌单全量导出 ♪
              </span>
            </div>
          </JournalCard>
        </div>
      ) : null}

      {/* ================= PARSED PLAYLIST RESULT SHEET (11.2s - 18.2s) ================= */}
      {frame >= unfoldFrame - 4 ? (
        <div
          style={{
            position: 'absolute',
            left: 162,
            top: 348,
            width: 1676,
            height: 682,
            opacity: easeOut(frame, unfoldFrame - 2, 16),
            transform: `translateY(${(1 - easeBackOut(frame, unfoldFrame, 22)) * 55}px)`,
            zIndex: 20,
          }}
        >
          <JournalCard
            bg={C.paperWhite}
            rotate={0.2}
            shadow="cutoutLg"
            style={{ width: '100%', height: '100%', padding: '24px 34px' }}
          >
            {/* Playlist Summary + Export Toolbar Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 18,
                borderBottom: `3px dashed ${C.line}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 18,
                    border: `3px solid ${C.ink}`,
                    boxShadow: SHADOW.cutoutSm,
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: C.pink,
                  }}
                >
                  <img
                    src={DEMO_PLAYLIST.coverUrl}
                    alt={DEMO_PLAYLIST.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        fontFamily: F.sans,
                        fontSize: 33,
                        fontWeight: 900,
                        color: C.ink,
                      }}
                    >
                      {DEMO_PLAYLIST.name}
                    </span>
                    <StickyBadge bg="#dcf5cb" ink="#256320" fontSize={19} rotate={-1}>
                      {DEMO_PLAYLIST.platform}
                    </StickyBadge>
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      fontFamily: F.sans,
                      fontSize: 21,
                      fontWeight: 700,
                      color: C.inkSoft,
                    }}
                  >
                    <span>👤 作者：{DEMO_PLAYLIST.creator}</span>
                    <span>·</span>
                    <span style={{ color: '#334155' }}>🎵 共 {DEMO_PLAYLIST.trackCount} 首歌曲</span>
                    <span>·</span>
                    <span>⏱️ {DEMO_PLAYLIST.duration}</span>
                  </div>
                </div>
              </div>

              {/* Web Export Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 14px',
                  borderRadius: 16,
                  backgroundColor: frame >= toolbarFrame ? C.yellowLight : 'transparent',
                  border: frame >= toolbarFrame ? `3px solid ${C.yellowDeep}` : '3px solid transparent',
                }}
              >
                {[
                  { label: '导出 Excel', bg: C.mint, ink: C.mintDeep, hot: true },
                  { label: '导出 JSON', bg: C.blue, ink: C.blueDeep, hot: true },
                  { label: 'CSV', bg: C.peach, ink: C.peachDeep, hot: false },
                  { label: 'TXT', bg: C.yellowCard, ink: C.yellowDeep, hot: false },
                  { label: 'M3U8', bg: C.lilac, ink: C.lilacDeep, hot: false },
                ].map((btn) => {
                  const isThisPressed = isExportPressed && btn.label === '导出 Excel';
                  return (
                    <div
                      key={btn.label}
                      style={{
                        padding: btn.hot ? '11px 20px' : '11px 15px',
                        borderRadius: 12,
                        backgroundColor: btn.bg,
                        color: btn.ink,
                        border: `2.8px solid ${C.ink}`,
                        boxShadow: isThisPressed ? '1px 1px 0 #2d3436' : '3px 4px 0 #2d3436',
                        transform: isThisPressed ? 'translate(2px, 3px) scale(0.93)' : 'none',
                        fontFamily: F.sans,
                        fontSize: 21,
                        fontWeight: 900,
                      }}
                    >
                      {btn.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Body Split: Left Song Table (1310px) + Right Mascot Companion Stage (270px) so ZERO text is covered! */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 270px',
                gap: 24,
                marginTop: 14,
                alignItems: 'stretch',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '68px 1.25fr 0.85fr 1.05fr 105px 146px',
                    padding: '12px 18px',
                    backgroundColor: C.paperCream,
                    borderRadius: 12,
                    border: `2.5px solid ${C.ink}`,
                    fontFamily: F.sans,
                    fontSize: 21,
                    fontWeight: 900,
                    color: C.inkSoft,
                  }}
                >
                  <span>序号</span>
                  <span>歌曲标题</span>
                  <span>歌手</span>
                  <span>专辑</span>
                  <span>时长</span>
                  <span>状态标定</span>
                </div>

                <div
                  style={{
                    marginTop: 6,
                    height: 345,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      transform: `translateY(-${scrollY}px)`,
                    }}
                  >
                    {DEMO_PLAYLIST.tracks.map((t, idx) => {
                      const rowIn = easeOut(frame, cascadeFrame + Math.min(5, idx) * 4, 14);
                      return (
                        <div
                          key={t.index}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '68px 1.25fr 0.85fr 1.05fr 105px 146px',
                            alignItems: 'center',
                            padding: '12px 18px',
                            borderBottom: `2px solid ${C.line}`,
                            backgroundColor: idx % 2 === 0 ? 'rgba(255, 248, 189, 0.25)' : 'transparent',
                            opacity: rowIn,
                            transform: `translateX(${(1 - rowIn) * 28}px)`,
                            fontFamily: F.sans,
                          }}
                        >
                          <span style={{ fontFamily: F.mono, fontSize: 22, fontWeight: 700, color: C.inkMuted }}>
                            {String(t.index).padStart(2, '0')}
                          </span>
                          <span style={{ fontSize: 25, fontWeight: 800, color: C.ink }}>{t.title}</span>
                          <span style={{ fontSize: 23, fontWeight: 700, color: C.inkSoft }}>{t.artist}</span>
                          <span style={{ fontSize: 21, fontWeight: 600, color: C.inkMuted }}>{t.album}</span>
                          <span style={{ fontFamily: F.mono, fontSize: 21, fontWeight: 700, color: C.inkSoft }}>
                            {t.duration}
                          </span>
                          <span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 12px',
                                borderRadius: 999,
                                backgroundColor: t.vip ? C.yellowCard : C.mint,
                                color: t.vip ? C.yellowDeep : C.mintDeep,
                                border: `2px solid ${C.ink}`,
                                fontSize: 19,
                                fontWeight: 800,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t.vip ? '👑 VIP专享' : '✓ 正常'}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 纸质质感高对比度滚动条 */}
                  <div
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: 8,
                      bottom: 8,
                      width: 10,
                      borderRadius: 6,
                      backgroundColor: 'rgba(45, 52, 54, 0.12)',
                      border: '1.5px solid rgba(45, 52, 54, 0.22)',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '32%',
                        borderRadius: 5,
                        backgroundColor: '#334155',
                        border: `2px solid ${C.ink}`,
                        boxShadow: '1px 1px 0 #2d3436',
                        transform: `translateY(${scrollProgress * 212}%)`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2.5,
                      }}
                    >
                      <span style={{ width: 4, height: 1.5, backgroundColor: '#94a3b8', borderRadius: 1 }} />
                      <span style={{ width: 4, height: 1.5, backgroundColor: '#94a3b8', borderRadius: 1 }} />
                      <span style={{ width: 4, height: 1.5, backgroundColor: '#94a3b8', borderRadius: 1 }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dedicated Mascot Stage on the right so song table is 100% unobstructed */}
              <div
                style={{
                  borderRadius: 18,
                  backgroundColor: C.pink,
                  border: `3px dashed ${C.pinkDeep}`,
                  padding: '16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <StickyBadge bg={C.paperWhite} ink={C.pinkDeep} fontSize={19} rotate={1.5}>
                  ♫ 解析完成！
                </StickyBadge>
                <div style={{ height: 220 }} />
                <div
                  style={{
                    fontFamily: F.kuaile,
                    fontSize: 22,
                    color: C.pinkDeep,
                    textAlign: 'center',
                  }}
                >
                  共 {DEMO_PLAYLIST.trackCount} 首完整读取
                </div>
              </div>
            </div>

            {/* Bottom Summary Footer */}
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 18px',
                borderRadius: 12,
                backgroundColor: C.mint,
                border: `2.5px solid ${C.ink}`,
                fontFamily: F.sans,
                fontSize: 21,
                fontWeight: 800,
                color: C.mintDeep,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HandCheck size={22} color={C.mintDeep} />
                已完整加载全部 {DEMO_PLAYLIST.trackCount} 首歌曲 · 自动识别 VIP 与下架状态
              </span>
              <span style={{ fontFamily: F.kuaile, fontSize: 23 }}>
                点击右上角按钮，把歌单装进文件带走 →
              </span>
            </div>
          </JournalCard>
        </div>
      ) : null}

      {/* ================= CELEBRATION FIREWORKS ================= */}
      {/* 1. 解析成功：从搜索/解析按钮中心迸发 */}
      <CelebrationFireworks
        frame={frame}
        burstFrame={unfoldFrame}
        cx={1686}
        cy={182}
        scale={1.05}
      />

      {/* 2. 导出 Excel：从「导出 Excel」按钮中心迸发 */}
      <CelebrationFireworks
        frame={frame}
        burstFrame={exportClickFrame}
        cx={1340}
        cy={402}
        scale={0.96}
      />
    </AbsoluteFill>
  );
};
