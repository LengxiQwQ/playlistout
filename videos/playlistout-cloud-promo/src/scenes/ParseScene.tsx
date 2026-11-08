import React from 'react';
import { Easing, interpolate } from 'remotion';
import { popIn } from '../anim';
import { JellyButton } from '../components/JellyButton';
import { WashiTape } from '../components/WashiTape';
import { C, F } from '../theme';

export const ParseScene: React.FC<{ frame: number }> = ({ frame }) => {
  // 输送带与输入框入场 (245帧)
  const barPop = popIn(frame, 245, 12, 1.05);

  // 链接贴入输入框的动画 (305帧啪嗒贴入)
  const pasteProgress = interpolate(frame, [305, 320], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.5)),
  });

  // 果冻解析按钮被踩下 (365 - 385 帧)
  const isJellyPressed = frame >= 365 && frame <= 385;

  // 曲目列表顺滑展开卷轴动画 (380 - 430 帧)
  const listHeight = interpolate(frame, [380, 430], [0, 520], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const listOpacity = interpolate(frame, [380, 405], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const platformPills = [
    { name: '网易云音乐', bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
    { name: 'QQ音乐', bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },
    { name: '酷狗音乐 (免登)', bg: '#E0F2FE', text: '#075985', border: '#7DD3FC' },
    { name: '酷我音乐', bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
    { name: '汽水音乐', bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
    { name: '咪咕音乐', bg: '#F3E8FF', text: '#6B21A8', border: '#D8B4FE' },
    { name: '全部支持！多平台合一', bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' },
  ];

  const tracks = [
    {
      num: '01',
      title: '雏鸟的华尔兹 (Live)',
      artist: '花谱 (KAF)',
      dur: '04:12',
      quality: '无损 FLAC',
      qualityColor: C.badgeLossless,
      status: '正常可播',
      statusColor: C.badgeNormal,
      delay: 405,
    },
    {
      num: '02',
      title: '恋爱循环 (Acoustic Ver.)',
      artist: '花谱 × 鹿乃',
      dur: '03:45',
      quality: 'VIP 专享',
      qualityColor: C.badgeVIP,
      status: 'VIP 2 标定',
      statusColor: C.badgeVIP,
      delay: 420,
    },
    {
      num: '03',
      title: '夜空的魔法书',
      artist: '鎖那 (Sana)',
      dur: '03:28',
      quality: '高品质 MP3',
      qualityColor: C.badgeLossless,
      status: '正常可播',
      statusColor: C.badgeNormal,
      delay: 435,
    },
    {
      num: '04',
      title: '告白预演 (Piano Solo)',
      artist: '鹿乃 (Kano)',
      dur: '04:02',
      quality: '无损 FLAC',
      qualityColor: C.badgeLossless,
      status: '正常可播',
      statusColor: C.badgeNormal,
      delay: 450,
    },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* 顶部手账输入卡片 (完全还原官网原汁原味的黄色便利贴手账容器) */}
      <div
        style={{
          position: 'absolute',
          top: 45,
          left: 140,
          right: 140,
          opacity: barPop.opacity,
          transform: `scale(${barPop.scale})`,
        }}
      >
        <div
          style={{
            backgroundColor: '#FDF8E2',
            border: '4px solid #4B5563',
            borderRadius: 28,
            padding: '16px 24px',
            boxShadow: '0 10px 24px rgba(75, 85, 99, 0.15)',
            position: 'relative',
          }}
        >
          {/* 左上角紫色和纸胶带与小图钉 */}
          <div style={{ position: 'absolute', top: -14, left: 24, zIndex: 10 }}>
            <WashiTape color={C.tapePurple} width={130} height={30} rotate={-3}>
              <span style={{ fontFamily: F.kuaile, fontSize: 14, color: '#5B21B6', fontWeight: 800 }}>
                ★ 极速解析
              </span>
            </WashiTape>
          </div>

          {/* 输入框顶部标题行 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontFamily: F.kuaile,
                fontSize: 22,
                color: '#4B5563',
                fontWeight: 900,
              }}
            >
              在这里粘贴歌单链接 ↓
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  fontFamily: F.sans,
                  fontSize: 16,
                  color: '#9CA3AF',
                  transform: 'rotate(-1deg)',
                }}
              >
                无需注册 · 干净清爽小巧 ✎
              </span>
              <span
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #CBD5E1',
                  borderRadius: 12,
                  padding: '3px 10px',
                  fontFamily: F.mono,
                  fontSize: 14,
                  color: '#64748B',
                  fontWeight: 700,
                }}
              >
                📋 复制Demo体验歌单
              </span>
            </div>
          </div>

          {/* 输入框主行 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                flex: 1,
                height: 56,
                backgroundColor: '#FFFFFF',
                border: '3px dashed #94A3B8',
                borderRadius: 18,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {pasteProgress === 0 ? (
                <span
                  style={{
                    fontFamily: F.sans,
                    fontSize: 20,
                    color: '#94A3B8',
                  }}
                >
                  粘贴QQ/网易云/酷狗/酷我/汽水/咪咕 歌单链接...
                </span>
              ) : (
                <div
                  style={{
                    transform: `scale(${pasteProgress})`,
                    transformOrigin: 'left center',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <WashiTape color={C.tapeCyan} width="auto" height={40} rotate={0}>
                    <span
                      style={{
                        fontFamily: F.mono,
                        fontSize: 21,
                        color: '#0F172A',
                        fontWeight: 700,
                      }}
                    >
                      https://y.qq.com/n/ryqq/playlist/9140654872
                    </span>
                  </WashiTape>
                  <span
                    style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      fontFamily: F.kuaile,
                      fontSize: 15,
                      padding: '3px 10px',
                      borderRadius: 10,
                      fontWeight: 800,
                    }}
                  >
                    ✓ 识别：QQ 音乐
                  </span>
                </div>
              )}
            </div>

            {/* 果冻印章解析按键 */}
            <JellyButton
              label="⚡ 立即解析"
              size="large"
              isPressed={isJellyPressed}
              color="#FF6B8B"
            />
          </div>

          {/* 官网原汁原味的平台支持标签栏 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px dashed #D1D5DB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {platformPills.map((p) => (
                <span
                  key={p.name}
                  style={{
                    backgroundColor: p.bg,
                    color: p.text,
                    border: `1.5px solid ${p.border}`,
                    fontFamily: F.kuaile,
                    fontSize: 14,
                    padding: '2px 9px',
                    borderRadius: 8,
                    fontWeight: 800,
                  }}
                >
                  {p.name}
                </span>
              ))}
            </div>

            <span style={{ fontFamily: F.sans, fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
              * 酷狗概念版全量免登 · 咪咕音乐即开即用 *
            </span>
          </div>
        </div>
      </div>

      {/* 展开的 104 首歌单曲目卷轴 (左中侧占据 1240px，右侧留空给小困云舞台) */}
      <div
        style={{
          position: 'absolute',
          top: 220,
          left: 140,
          width: 1240,
          height: listHeight,
          overflow: 'hidden',
          opacity: listOpacity,
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFDF9',
            border: '4px solid #3E5366',
            borderRadius: 32,
            padding: '22px 30px',
            boxShadow: '0 12px 32px rgba(62, 83, 102, 0.14)',
            height: 480,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* 歌单元数据摘要条 (完全使用真实测试歌单名称) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '3px solid #E2E8F0',
              paddingBottom: 14,
            }}
          >
            <div>
              <span
                style={{
                  fontFamily: F.kuaile,
                  fontSize: 27,
                  color: C.ink,
                  fontWeight: 900,
                }}
              >
                🎵 歌单：花谱、鎖那、鹿乃 𖹭
              </span>
              <span
                style={{
                  marginLeft: 16,
                  fontFamily: F.sans,
                  fontSize: 20,
                  color: C.inkSoft,
                  fontWeight: 600,
                }}
              >
                作者：琴心月满
              </span>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <span
                style={{
                  backgroundColor: '#E0F2FE',
                  color: '#0369A1',
                  fontFamily: F.kuaile,
                  fontSize: 18,
                  padding: '5px 14px',
                  borderRadius: 14,
                  fontWeight: 800,
                }}
              >
                104 首完整曲目
              </span>
              <span
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  fontFamily: F.kuaile,
                  fontSize: 18,
                  padding: '5px 14px',
                  borderRadius: 14,
                  fontWeight: 800,
                }}
              >
                时长 7 小时 6 分钟
              </span>
              <span
                style={{
                  backgroundColor: '#DCFCE7',
                  color: '#166534',
                  fontFamily: F.kuaile,
                  fontSize: 18,
                  padding: '5px 14px',
                  borderRadius: 14,
                  fontWeight: 800,
                }}
              >
                VIP 2 标定
              </span>
            </div>
          </div>

          {/* 4 行大字曲目示范行 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tracks.map((t) => {
              const rowPop = popIn(frame, t.delay, 10, 1.04);
              return (
                <div
                  key={t.num}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '2px solid #E2E8F0',
                    borderRadius: 18,
                    padding: '9px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: rowPop.opacity,
                    transform: `scale(${rowPop.scale})`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span
                      style={{
                        fontFamily: F.mono,
                        fontSize: 22,
                        color: '#64748B',
                        fontWeight: 700,
                      }}
                    >
                      {t.num}
                    </span>
                    <span
                      style={{
                        fontFamily: F.kuaile,
                        fontSize: 25,
                        color: C.ink,
                        fontWeight: 800,
                      }}
                    >
                      {t.title}
                    </span>
                    <span
                      style={{
                        fontFamily: F.sans,
                        fontSize: 20,
                        color: C.inkMuted,
                        fontWeight: 600,
                      }}
                    >
                      — {t.artist}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span
                      style={{
                        border: `2px solid ${t.qualityColor}`,
                        color: t.qualityColor,
                        fontFamily: F.kuaile,
                        fontSize: 17,
                        padding: '3px 10px',
                        borderRadius: 10,
                        fontWeight: 800,
                      }}
                    >
                      {t.quality}
                    </span>
                    <span
                      style={{
                        backgroundColor: t.statusColor,
                        color: '#FFFFFF',
                        fontFamily: F.kuaile,
                        fontSize: 17,
                        padding: '4px 12px',
                        borderRadius: 10,
                        fontWeight: 800,
                      }}
                    >
                      {t.status}
                    </span>
                    <span
                      style={{
                        fontFamily: F.mono,
                        fontSize: 20,
                        color: '#64748B',
                        fontWeight: 600,
                      }}
                    >
                      {t.dur}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 底部隐私与端侧承诺 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '2px dashed #E2E8F0',
              paddingTop: 10,
              fontSize: 17,
              fontFamily: F.sans,
              color: '#64748B',
              fontWeight: 600,
            }}
          >
            <span>🔒 纯端侧快速解析 · 绝不持久化存储任何用户歌单数据</span>
            <span style={{ color: '#10B981', fontWeight: 800 }}>✓ 104 首曲目就绪 · 点击即可导出</span>
          </div>
        </div>
      </div>

      {/* 右侧专属观景露台 */}
      <div
        style={{
          position: 'absolute',
          right: 90,
          top: 240,
          width: 310,
          height: 480,
          backgroundColor: '#FFF8E7',
          border: '4px solid #3E5366',
          borderRadius: 32,
          padding: '24px 20px',
          boxShadow: '6px 8px 24px rgba(62, 83, 102, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <WashiTape color={C.tapeYellow} width={250} height={38} rotate={-1}>
            <span style={{ fontFamily: F.kuaile, fontSize: 18, color: '#78350F', fontWeight: 800 }}>
              ★ 小困云专属导播台
            </span>
          </WashiTape>

          <p
            style={{
              fontFamily: F.kuaile,
              fontSize: 21,
              color: C.ink,
              textAlign: 'center',
              marginTop: 14,
              lineHeight: 1.4,
            }}
          >
            挥动指挥棒 ♪<br />
            多格式一键打包带走！
          </p>
        </div>

        {/* 露台木栏杆装饰 */}
        <div
          style={{
            width: '100%',
            height: 52,
            borderTop: '3px solid #3E5366',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'flex-end',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 44,
                backgroundColor: '#D4AF37',
                border: '2px solid #3E5366',
                borderRadius: 4,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
