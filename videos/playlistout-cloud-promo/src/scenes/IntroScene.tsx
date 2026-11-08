import React from 'react';
import { Easing, interpolate } from 'remotion';
import { popIn } from '../anim';
import { VintageCageBack, VintageCageFront } from '../components/VintageCage';
import { WashiTape } from '../components/WashiTape';
import { C, F } from '../theme';

export const IntroScene: React.FC<{ frame: number }> = ({ frame }) => {
  // 钥匙插入与开锁进度 (90帧开始飞入，128帧解锁，142帧门弹开)
  const keyProgress = interpolate(frame, [90, 128], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.2, 0.8, 0.2, 1),
  });

  const lockFallProgress = interpolate(frame, [128, 150], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });

  const doorAngle = interpolate(frame, [135, 155], [0, 115], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.8)),
  });

  // 场景标题显现
  const titlePop = popIn(frame, 10, 14, 1.05);

  // 开场右侧受困平台警示便签纸
  const notePop = popIn(frame, 25, 12, 1.06);

  // 破笼后，品牌卡片与 6 平台胶带展开 (170帧起)
  const brandPop = popIn(frame, 175, 15, 1.08);

  const platforms = [
    { name: 'QQ 音乐', color: C.platformQQ, delay: 185, emoji: '🐧' },
    { name: '网易云音乐', color: C.platformNetEase, delay: 192, emoji: '🔴' },
    { name: '酷狗音乐', color: C.platformKuGou, delay: 199, emoji: '🔷' },
    { name: '酷我音乐', color: C.platformKuWo, delay: 206, emoji: '🟡' },
    { name: '汽水音乐', color: C.platformQiShui, delay: 213, emoji: '🥤' },
    { name: '咪咕音乐', color: C.platformMiGu, delay: 220, emoji: '🟣' },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* 顶部醒目大字标语 */}
      <div
        style={{
          position: 'absolute',
          top: 65,
          left: 140,
          right: 140,
          textAlign: 'center',
          opacity: titlePop.opacity,
          transform: `scale(${titlePop.scale})`,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            position: 'relative',
            fontFamily: F.kuaile,
            fontSize: 52,
            color: C.ink,
            fontWeight: 900,
            letterSpacing: '2px',
          }}
        >
          {/* 黄色高光荧光笔底色 */}
          <span
            style={{
              position: 'absolute',
              left: -16,
              right: -16,
              bottom: 4,
              height: 24,
              backgroundColor: 'rgba(254, 240, 138, 0.7)',
              zIndex: -1,
              transform: 'rotate(-0.6deg)',
              borderRadius: 6,
            }}
          />
          你的歌单，不应该只困在一个音乐平台里。
        </span>
      </div>

      {/* 笼子背部层 */}
      <div
        style={{
          position: 'absolute',
          left: 480 - 190,
          top: 530 - 230,
          pointerEvents: 'none',
        }}
      >
        <VintageCageBack />
      </div>

      {/* 笼子前景层 (金属锁、活动门、钥匙) */}
      <div
        style={{
          position: 'absolute',
          left: 480 - 190,
          top: 530 - 230,
          pointerEvents: 'none',
          zIndex: 40,
        }}
      >
        <VintageCageFront
          doorAngle={doorAngle}
          showLock={frame < 155}
          lockFallProgress={lockFallProgress}
          keyProgress={keyProgress}
        />
      </div>

      {/* 开场受困阶段：右侧便签纸提示 (10–160帧) */}
      {frame < 170 && (
        <div
          style={{
            position: 'absolute',
            left: 880,
            top: 250,
            width: 760,
            opacity: notePop.opacity,
            transform: `scale(${notePop.scale}) rotate(1.2deg)`,
          }}
        >
          <div
            style={{
              backgroundColor: '#FEF9C3',
              border: '4px solid #CA8A04',
              borderRadius: 32,
              padding: '36px 44px',
              boxShadow: '8px 12px 28px rgba(202, 138, 4, 0.16)',
            }}
          >
            <WashiTape color={C.tapePink} width={220} height={36} rotate={-2}>
              <span style={{ fontFamily: F.kuaile, fontSize: 18, color: '#831843', fontWeight: 800 }}>
                ★ 为什么歌单总被困住？
              </span>
            </WashiTape>

            <h3
              style={{
                fontFamily: F.kuaile,
                fontSize: 34,
                color: '#713F12',
                margin: '18px 0 12px 0',
                fontWeight: 900,
              }}
            >
              歌曲变灰、换软件重搜、跨端收藏丢失...
            </h3>
            <p
              style={{
                fontFamily: F.sans,
                fontSize: 22,
                color: '#854D0E',
                margin: 0,
                lineHeight: 1.6,
                fontWeight: 600,
              }}
            >
              换一个播放器，就得重新手动搜索上百首歌曲？<br />
              不要让你的多年音乐心血，被单一厂商的生态牢牢锁死！
            </p>
          </div>
        </div>
      )}

      {/* 破笼阶段：盛大揭幕 Playlist Out 品牌卡片 (170帧起) */}
      {frame >= 170 && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 840,
              top: 150,
              width: 880,
              opacity: brandPop.opacity,
              transform: `scale(${brandPop.scale})`,
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '4px solid #3E5366',
                borderRadius: 36,
                padding: '28px 36px',
                boxShadow: '8px 14px 32px rgba(62, 83, 102, 0.18)',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', top: -16, left: 50 }}>
                <WashiTape color={C.tapeGreen} width={200} height={34} rotate={-2}>
                  <span style={{ fontFamily: F.kuaile, fontSize: 17, color: '#065F46', fontWeight: 800 }}>
                    ★ 开源无界 · 歌单随行
                  </span>
                </WashiTape>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 10 }}>
                <h1
                  style={{
                    fontFamily: F.display,
                    fontSize: 72,
                    color: C.ink,
                    margin: 0,
                    lineHeight: 1,
                    letterSpacing: '1px',
                  }}
                >
                  Playlist Out
                </h1>
                <WashiTape color={C.tapeYellow} width={280} height={46} rotate={1}>
                  <span
                    style={{
                      fontFamily: F.kuaile,
                      fontSize: 28,
                      color: '#78350F',
                      fontWeight: 900,
                    }}
                  >
                    把你的歌单带走
                  </span>
                </WashiTape>
              </div>

              <p
                style={{
                  fontFamily: F.sans,
                  fontSize: 21,
                  color: C.inkSoft,
                  margin: '14px 0 20px 0',
                  lineHeight: 1.4,
                  fontWeight: 600,
                }}
              >
                一键解析公开歌单 · 本地导出多格式 · 自由带入开源播放器
              </p>

              {/* 6 大支持音乐平台徽章 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {platforms.map((p) => {
                  const pPop = popIn(frame, p.delay, 10, 1.12);
                  return (
                    <div
                      key={p.name}
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: `3px solid ${p.color}`,
                        borderRadius: 18,
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                        opacity: pPop.opacity,
                        transform: `scale(${pPop.scale})`,
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{p.emoji}</span>
                      <span
                        style={{
                          fontFamily: F.kuaile,
                          fontSize: 20,
                          color: C.ink,
                          fontWeight: 800,
                        }}
                      >
                        {p.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 小困云专属着陆舞台基座 (x: 1360, y: 730) */}
          <div
            style={{
              position: 'absolute',
              left: 1360,
              top: 745,
              transform: 'translateX(-50%)',
              opacity: brandPop.opacity,
            }}
          >
            <WashiTape color={C.tapePink} width={280} height={38} rotate={0}>
              <span style={{ fontFamily: F.kuaile, fontSize: 18, color: '#831843', fontWeight: 800 }}>
                ★ 自由大冒险 · 启程舞台 ★
              </span>
            </WashiTape>
          </div>
        </>
      )}
    </div>
  );
};
