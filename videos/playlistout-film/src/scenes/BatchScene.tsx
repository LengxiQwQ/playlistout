import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { easeBackOut, easeInOut, easeOut } from '../anim';
import { BATCH_PLAYLISTS, BATCH_TOTAL_TRACKS } from '../data';
import { C, F, SCENES, SHADOW, cue } from '../theme';
import { HandCheck, JournalCard, SceneHeaderBanner, StickyBadge } from '../components/Stationery';

const rel = (name: Parameters<typeof cue>[0]) => cue(name) - SCENES.batch.in;

// 42 颗确定性爆炸礼花彩片粒子预设
const FIREWORK_PARTICLES = Array.from({ length: 42 }).map((_, i) => {
  const angleDeg = -175 + (i * 350) / 41 + ((i * 17) % 25 - 12);
  const angleRad = (angleDeg * Math.PI) / 180;
  const dist = 140 + ((i * 37) % 260);
  const colors = ['#FFD700', '#FF6B8B', '#2ED573', '#1E90FF', '#FFA502', '#A55EEA', '#FFFDF0'];
  const color = colors[i % colors.length];
  const types: ('ribbon' | 'star' | 'note' | 'diamond' | 'circle')[] = [
    'ribbon', 'star', 'ribbon', 'note', 'diamond', 'star', 'circle',
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
 * 炫酷爆炸礼花与庆祝徽章组件 (ZIP 封口完成瞬间触发)
 */
const ZipCelebrationFireworks: React.FC<{ frame: number; burstFrame: number }> = ({
  frame,
  burstFrame,
}) => {
  if (frame < burstFrame || frame > burstFrame + 52) return null;

  const age = frame - burstFrame;
  const progress = Math.min(1, age / 42);
  const shockProgress = Math.min(1, age / 26);
  const badgePop = easeBackOut(frame, burstFrame + 2, 16);
  const badgeFade = age > 38 ? Math.max(0, 1 - (age - 38) / 14) : 1;

  // 爆炸中心：拉链终点滑块锁扣位置 (1520, 745)
  const cx = 1520;
  const cy = 745;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {/* 1. 双重金色与洋红扩散冲击波光环 */}
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
          {/* 蜜桃粉高能内层光环 */}
          <circle
            cx={0}
            cy={0}
            r={Math.max(0, shockProgress * 165 - 10)}
            fill="none"
            stroke="#FF6B8B"
            strokeWidth={Math.max(1, (1 - shockProgress) * 5.5)}
            opacity={(1 - shockProgress) * 0.85}
          />
        </svg>
      )}

      {/* 2. 42 颗向四周爆炸迸发的彩色纸屑、四角星芒与飞舞音符 */}
      {FIREWORK_PARTICLES.map((p, idx) => {
        // 非线性爆炸轨迹：初期极速爆发，中后期减速飘落
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
              filter: 'drop-shadow(1px 2px 0 rgba(45, 52, 54, 0.35))',
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

      {/* 3. 弹出的炫酷庆祝徽章："🎉 238 首全量封装完成！" */}
      <div
        style={{
          position: 'absolute',
          left: 1360,
          top: 560,
          transform: `translate(-50%, -50%) scale(${badgePop}) rotate(-2deg)`,
          opacity: badgeFade,
          padding: '12px 24px',
          borderRadius: 18,
          backgroundColor: '#FFFBE6',
          border: `3.5px solid ${C.ink}`,
          boxShadow: '6px 7px 0 #2d3436',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontFamily: F.kuaile,
          fontSize: 27,
          fontWeight: 900,
          color: '#2d3436',
          whiteSpace: 'nowrap',
          zIndex: 60,
        }}
      >
        <span style={{ fontSize: 32 }}>🎉</span>
        <span style={{ color: '#D97706' }}>238 首全量封装完毕！</span>
        <span style={{ color: '#FF6B8B', fontSize: 24 }}>✨ ✦</span>
      </div>
    </div>
  );
};

export const BatchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const check1 = rel('check_1');
  const check2 = rel('check_2');
  const check3 = rel('check_3');
  const batchClick = rel('batch_click');
  const workbookOpen = rel('workbook_open');
  const zipClose = rel('zip_close');
  const cliSlideIn = rel('cli_slide_in');

  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 95 } });
  const exitProgress = easeInOut(frame, cliSlideIn - 8, 14, 0, 1);
  const sceneOpacity = interpolate(frame, [0, 10, cliSlideIn - 6, cliSlideIn + 4], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const checks = [frame >= check1, frame >= check2, frame >= check3];
  const checkedCount = checks.filter(Boolean).length;
  const isBtnPressed = frame >= batchClick - 2 && frame <= batchClick + 10;
  const zipProgress = easeInOut(frame, zipClose - 10, 26, 0, 1);

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        transform: `translateY(${-exitProgress * 80}px) scale(${1 - exitProgress * 0.04})`,
      }}
    >
      <SceneHeaderBanner
        stepTag="STEP 03 · 用户歌单批量导出"
        title="不止一张歌单，整个曲库一起带走"
        subtitle="多歌单批量汇总 · ZIP 打包"
        tagBg={C.pink}
        style={{
          marginTop: 38,
          opacity: easeOut(frame, 0, 16),
        }}
      />

      {/* ================= LEFT COLUMN: 3 USER PLAYLIST SELECTION CARDS ================= */}
      <div
        style={{
          position: 'absolute',
          left: 162,
          top: 144,
          width: 840,
          transform: `translateX(${(1 - enter) * -55}px)`,
          zIndex: 20,
        }}
      >
        <JournalCard
          bg={C.paperWhite}
          tapePos="top-left"
          tapeColor={C.tapePink}
          shadow="cutoutLg"
          style={{
            padding: '24px 28px',
            height: 866,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 14,
              borderBottom: `3px dashed ${C.line}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <StickyBadge bg="#dcf5cb" ink="#256320" fontSize={21} rotate={-1}>
                ♪ QQ 音乐用户歌单
              </StickyBadge>
              <span style={{ fontFamily: F.sans, fontSize: 28, fontWeight: 900, color: C.ink }}>
                冷夕QwQ 的公开歌单
              </span>
            </div>
            <span
              style={{
                fontFamily: F.mono,
                fontSize: 22,
                fontWeight: 700,
                color: C.pinkDeep,
              }}
            >
              已选 {checkedCount} / 3
            </span>
          </div>

          {/* 3 Large Selectable Playlist Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 14 }}>
            {BATCH_PLAYLISTS.map((pl, idx) => {
              const isChecked = checks[idx];
              const cardPop = easeBackOut(frame, 8 + idx * 6, 18);
              return (
                <div
                  key={pl.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    padding: '22px 24px',
                    borderRadius: 18,
                    backgroundColor: isChecked ? pl.bg : C.paperCream,
                    border: `3.5px solid ${C.ink}`,
                    boxShadow: isChecked ? SHADOW.cutout : '3px 3px 0 rgba(45,52,54,0.2)',
                    transform: `scale(${0.92 + cardPop * 0.08}) rotate(${idx % 2 === 0 ? -0.4 : 0.4}deg)`,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      backgroundColor: isChecked ? '#207544' : C.paperWhite,
                      border: `3.5px solid ${C.ink}`,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      boxShadow: '2px 2px 0 #2d3436',
                    }}
                  >
                    {isChecked ? <HandCheck size={34} color="#ffffff" /> : null}
                  </div>

                  <div
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: 16,
                      backgroundColor: C.paperWhite,
                      border: `3px solid ${C.ink}`,
                      display: 'grid',
                      placeItems: 'center',
                      fontFamily: F.display,
                      fontSize: 36,
                      color: pl.accent,
                      flexShrink: 0,
                    }}
                  >
                    0{idx + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: F.sans,
                        fontSize: 29,
                        fontWeight: 900,
                        color: C.ink,
                      }}
                    >
                      {pl.title}
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
                      <span style={{ color: pl.accent, fontWeight: 900 }}>{pl.count} 首歌曲</span>
                      <span>·</span>
                      <span>{pl.tag}</span>
                    </div>
                  </div>

                  <StickyBadge
                    bg={isChecked ? C.mint : C.paperWhite}
                    ink={isChecked ? C.mintDeep : C.inkMuted}
                    fontSize={19}
                    rotate={isChecked ? -2 : 0}
                  >
                    {isChecked ? '✓ 已勾选' : '待选择'}
                  </StickyBadge>
                </div>
              );
            })}
          </div>

          {/* Bottom Batch Action Bar */}
          <div
            style={{
              marginTop: 16,
              padding: '18px 24px',
              borderRadius: 16,
              backgroundColor: C.yellowCard,
              border: `3.5px solid ${C.ink}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontFamily: F.sans, fontSize: 26, fontWeight: 900, color: C.ink }}>
                已选 {checkedCount} 个歌单 · 共 {checkedCount === 3 ? BATCH_TOTAL_TRACKS : checkedCount === 2 ? 110 : checkedCount === 1 ? 48 : 0} 首
              </div>
              <div style={{ fontFamily: F.sans, fontSize: 20, fontWeight: 700, color: C.inkSoft, marginTop: 2 }}>
                可选多工作表合并 Excel 或独立文件 ZIP 打包
              </div>
            </div>

            <div
              style={{
                padding: '15px 26px',
                borderRadius: 14,
                backgroundColor: isBtnPressed ? '#d97706' : '#f59e0b',
                color: '#ffffff',
                border: `3.2px solid ${C.ink}`,
                boxShadow: isBtnPressed ? '1px 1px 0 #2d3436' : SHADOW.cutoutSm,
                transform: isBtnPressed ? 'translate(3px, 3px) scale(0.95)' : 'none',
                fontFamily: F.sans,
                fontSize: 25,
                fontWeight: 900,
                whiteSpace: 'nowrap',
              }}
            >
              📦 批量打包导出
            </div>
          </div>
        </JournalCard>
      </div>

      {/* ================= RIGHT COLUMN: MULTI-SHEET EXCEL + ZIP ARCHIVE ================= */}
      <div
        style={{
          position: 'absolute',
          left: 1038,
          top: 144,
          width: 800,
          height: 866,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          zIndex: 22,
        }}
      >
        {/* TOP CARD: MULTI-SHEET EXCEL WORKBOOK */}
        <div
          style={{
            flex: 1.05,
            opacity: easeOut(frame, 4, 14),
            transform: `translateY(${(1 - easeBackOut(frame, 6, 22)) * 45}px) rotate(0.6deg)`,
          }}
        >
          <JournalCard
            bg={C.paperWhite}
            tapePos="top-right"
            tapeColor={C.tapeGreen}
            shadow="cutoutLg"
            style={{ width: '100%', height: '100%', padding: '22px 26px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <StickyBadge bg={C.mint} ink={C.mintDeep} fontSize={21} rotate={-1.5}>
                  方式 A · 多工作表 Excel
                </StickyBadge>
                <span style={{ fontFamily: F.sans, fontSize: 27, fontWeight: 900, color: C.ink, whiteSpace: 'nowrap' }}>
                  一册汇总全部歌单
                </span>
              </div>
              <span style={{ fontFamily: F.mono, fontSize: 19, fontWeight: 700, color: checkedCount > 0 ? C.mintDeep : C.inkMuted, whiteSpace: 'nowrap' }}>
                {checkedCount === 3 ? '4 SHEETS · 238 首' : checkedCount === 2 ? '3 SHEETS · 110 首' : checkedCount === 1 ? '2 SHEETS · 48 首' : '装订就绪槽位'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
              {[
                { label: '📑 【目录】索引', active: true, loaded: true },
                { label: checks[0] ? '01 中文民谣 (48首)' : '01 [待勾选]', active: false, loaded: checks[0] },
                { label: checks[1] ? '02 英语流行 (62首)' : '02 [待勾选]', active: false, loaded: checks[1] },
                { label: checks[2] ? '03 日语动漫 (128首)' : '03 [待勾选]', active: false, loaded: checks[2] },
              ].map((tab) => (
                <div
                  key={tab.label}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '12px 12px 0 0',
                    backgroundColor: tab.active ? C.mint : tab.loaded ? 'rgba(223, 246, 236, 0.65)' : C.paperCream,
                    border: tab.loaded ? `2.8px solid ${C.ink}` : `2px dashed #94a3b8`,
                    borderBottom: 'none',
                    fontFamily: F.sans,
                    fontSize: 16.5,
                    fontWeight: 900,
                    color: tab.active ? C.mintDeep : tab.loaded ? C.mintDeep : '#94a3b8',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </div>
              ))}
            </div>

            <div
              style={{
                border: `3px solid ${C.ink}`,
                borderRadius: '0 14px 14px 14px',
                padding: '14px 20px',
                backgroundColor: '#f8fdf9',
              }}
            >
              {BATCH_PLAYLISTS.map((pl, i) => {
                const isLoaded = checks[i];
                return (
                  <div
                    key={pl.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '52px 1fr 96px 150px',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: i < 2 ? `2px dashed ${C.line}` : 'none',
                      fontFamily: F.sans,
                      fontSize: 22,
                      fontWeight: 800,
                      color: isLoaded ? C.ink : '#94a3b8',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontFamily: F.mono, color: isLoaded ? C.inkMuted : '#cbd5e1' }}>0{i + 1}</span>
                    <span>{pl.title}</span>
                    <span style={{ color: isLoaded ? C.inkSoft : '#cbd5e1' }}>{pl.count} 首</span>
                    <span style={{ color: isLoaded ? C.mintDeep : '#94a3b8', textAlign: 'right', fontWeight: isLoaded ? 900 : 700 }}>
                      {isLoaded ? '✓ 已写入分表' : '· 等待勾选装入'}
                    </span>
                  </div>
                );
              })}
            </div>
          </JournalCard>
        </div>

        {/* BOTTOM CARD: ZIP COLLECTION ARCHIVE */}
        <div
          style={{
            flex: 0.95,
            opacity: easeOut(frame, 6, 14),
            transform: `translateY(${(1 - easeBackOut(frame, 8, 22)) * 45}px) rotate(-0.5deg)`,
          }}
        >
          <JournalCard
            bg={C.peach}
            tapePos="top-center"
            tapeColor={C.tapeYellow}
            shadow="cutoutLg"
            style={{
              width: '100%',
              height: '100%',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <StickyBadge bg={C.paperWhite} ink={C.peachDeep} fontSize={21} rotate={1.5}>
                    方式 B · 歌单合集 ZIP
                  </StickyBadge>
                  <span style={{ fontFamily: F.sans, fontSize: 28, fontWeight: 900, color: C.ink, whiteSpace: 'nowrap' }}>
                    独立文件一键打包
                  </span>
                </div>
                <StickyBadge bg={zipProgress > 0.8 ? C.mint : frame < zipClose - 10 ? C.paperWhite : '#fde68a'} ink={zipProgress > 0.8 ? C.mintDeep : frame < zipClose - 10 ? C.inkSoft : '#b45309'} fontSize={19} rotate={-1.5}>
                  {zipProgress > 0.8 ? '🔒 已封口打包' : frame < zipClose - 10 ? '📦 打包槽位就绪' : '正在拉上拉链…'}
                </StickyBadge>
              </div>

              {/* Filename Box kept on left 520px so Mascot on the right never covers it! */}
              <div
                style={{
                  marginTop: 18,
                  width: 530,
                  padding: '14px 20px',
                  borderRadius: 14,
                  backgroundColor: C.paperWhite,
                  border: `3px solid ${C.ink}`,
                  fontFamily: F.mono,
                  fontSize: 20,
                  fontWeight: 700,
                  color: C.ink,
                  whiteSpace: 'nowrap',
                }}
              >
                📦 【QQ音乐歌单合集】冷夕QwQ - 共3个歌单.zip
              </div>

              {/* Tactile Zipper Track (leaves right side open for Mascot!) */}
              <div
                style={{
                  marginTop: 18,
                  position: 'relative',
                  maxWidth: 530,
                  height: 56,
                  borderRadius: 14,
                  backgroundColor: '#e8c39e',
                  border: `3px solid ${C.ink}`,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 18px',
                  overflow: 'hidden',
                }}
              >
                {Array.from({ length: 16 }).map((_, tIdx) => {
                  const sealed = tIdx / 16 <= zipProgress;
                  return (
                    <div
                      key={tIdx}
                      style={{
                        width: 18,
                        height: sealed ? 24 : 32,
                        marginRight: 12,
                        borderRadius: 4,
                        backgroundColor: sealed ? '#d49b35' : C.paperWhite,
                        border: `2.4px solid ${C.ink}`,
                      }}
                    />
                  );
                })}
                <div
                  style={{
                    position: 'absolute',
                    left: `${10 + zipProgress * 76}%`,
                    width: 58,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: '#ffd32a',
                    border: `3.5px solid ${C.ink}`,
                    boxShadow: '3px 3px 0 #2d3436',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: F.mono,
                    fontSize: 18.5,
                    fontWeight: 900,
                  }}
                >
                  ZIP
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: F.sans,
                  fontSize: 20,
                  fontWeight: 800,
                  color: C.peachDeep,
                  marginBottom: 10,
                }}
              >
                <span>✓ 包内重名自动追加 (2) 防覆盖</span>
                <span style={{ fontFamily: F.kuaile, fontSize: 23 }}>多张歌单，一次带走！</span>
              </div>
              <div
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.72)',
                  border: `2px dashed ${C.peachDeep}`,
                  fontFamily: F.sans,
                  fontSize: 18.5,
                  fontWeight: 700,
                  color: C.inkSoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>📁 内含 3 个独立歌单文件 (Excel / JSON / CSV)</span>
                <span style={{ color: C.mintDeep, fontWeight: 900 }}>免解压直接预览 ✓</span>
              </div>
            </div>
          </JournalCard>
        </div>
      </div>

      {/* ZIP 封口完成时的全量爆炸礼花与庆祝特效 */}
      <ZipCelebrationFireworks frame={frame} burstFrame={zipClose + 14} />
    </AbsoluteFill>
  );
};
