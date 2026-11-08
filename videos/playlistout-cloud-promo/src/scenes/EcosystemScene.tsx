import React from 'react';
import { popIn } from '../anim';
import { WashiTape } from '../components/WashiTape';
import { C, F } from '../theme';

export const EcosystemScene: React.FC<{ frame: number }> = ({ frame }) => {
  const titlePop = popIn(frame, 1505, 12, 1.05);

  const hubs = [
    {
      id: 'musicfree',
      name: 'MusicFree 播放器',
      tags: ['官方插件', '推荐'],
      desc: '安装官方维护生态插件，可在 MusicFree 中按歌单链接在线解析并全源播放，无需导出立即聆听。',
      color: '#0284C7',
      icon: '🎧',
      action: '一键订阅安装',
      delay: 1515,
    },
    {
      id: 'lx',
      name: '洛雪音乐 (LX Music)',
      tags: ['一键导入', '推荐'],
      desc: '导出「洛雪专用 JSON」格式，可在桌面端与移动端一键「导入歌单」极速恢复全部曲目与收藏。',
      color: '#10B981',
      icon: '🎵',
      action: '专属 JSON 恢复',
      delay: 1530,
    },
    {
      id: 'listen1',
      name: 'Listen 1 音乐合集',
      tags: ['无缝解析', '原生支持'],
      desc: '经典的开源多平台音乐整合播放器。导出「Listen 1」专用格式，通过「打开/恢复歌单」无缝漫游。',
      color: '#F59E0B',
      icon: '📻',
      action: '专用格式备份',
      delay: 1545,
    },
    {
      id: 'api',
      name: 'BBPlayer & Public API',
      tags: ['开发者生态', '开放协议'],
      desc: 'BBPlayer 即将上线 · 开放标准 RESTful JSON 接口与生态扩展协议，欢迎开发者共建音乐自由！',
      color: '#8B5CF6',
      icon: '✨',
      action: '标准 API 接入',
      delay: 1560,
    },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* 顶部标题与副标题 */}
      <div
        style={{
          position: 'absolute',
          top: 55,
          left: 140,
          right: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: titlePop.opacity,
          transform: `scale(${titlePop.scale})`,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2
              style={{
                fontFamily: F.display,
                fontSize: 52,
                color: C.ink,
                margin: 0,
              }}
            >
              把歌单带进更多地方 ♪
            </h2>
            <WashiTape color={C.tapeYellow} width={180} height={36} rotate={1}>
              <span style={{ fontFamily: F.kuaile, fontSize: 18, color: '#78350F', fontWeight: 800 }}>
                ★ 3 款主流推荐
              </span>
            </WashiTape>
          </div>
          <p
            style={{
              fontFamily: F.sans,
              fontSize: 20,
              color: C.inkMuted,
              margin: '6px 0 0 0',
              fontWeight: 600,
            }}
          >
            Playlist Out 不止可以导出 Excel，也可以直接把歌单整体导入这些开源播放器。
          </p>
        </div>

        <span
          style={{
            fontFamily: F.kuaile,
            fontSize: 20,
            color: '#6366F1',
            backgroundColor: '#EEF2FF',
            padding: '6px 18px',
            borderRadius: 16,
            fontWeight: 800,
          }}
        >
          不扣留数据 · 不绑定生态
        </span>
      </div>

      {/* 4 大播放器生态卡片 (左右双列) */}
      <div
        style={{
          position: 'absolute',
          top: 175,
          left: 140,
          right: 140,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 26,
        }}
      >
        {hubs.map((hub) => {
          const hubPop = popIn(frame, hub.delay, 12, 1.06);
          return (
            <div
              key={hub.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: `3.5px solid ${hub.color}`,
                borderRadius: 28,
                padding: '22px 28px',
                boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
                opacity: hubPop.opacity,
                transform: `scale(${hubPop.scale})`,
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                position: 'relative',
              }}
            >
              {/* 左侧圆形图标 */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 24,
                  backgroundColor: `${hub.color}15`,
                  border: `2.5px solid ${hub.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  flexShrink: 0,
                }}
              >
                {hub.icon}
              </div>

              {/* 中间信息 */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3
                    style={{
                      fontFamily: F.kuaile,
                      fontSize: 27,
                      color: C.ink,
                      margin: 0,
                      fontWeight: 900,
                    }}
                  >
                    {hub.name}
                  </h3>
                  {hub.tags.map((t, idx) => (
                    <span
                      key={t}
                      style={{
                        backgroundColor: idx === 0 ? `${hub.color}20` : '#FEF3C7',
                        color: idx === 0 ? hub.color : '#92400E',
                        fontFamily: F.kuaile,
                        fontSize: 14,
                        padding: '2px 8px',
                        borderRadius: 8,
                        fontWeight: 800,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <p
                  style={{
                    fontFamily: F.sans,
                    fontSize: 16.5,
                    color: C.inkSoft,
                    margin: '6px 0 10px 0',
                    lineHeight: 1.45,
                    fontWeight: 500,
                  }}
                >
                  {hub.desc}
                </p>

                {/* 操作胶囊按钮 */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <span
                    style={{
                      backgroundColor: hub.color,
                      color: '#FFFFFF',
                      fontFamily: F.kuaile,
                      fontSize: 15,
                      padding: '4px 14px',
                      borderRadius: 10,
                      fontWeight: 800,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                  >
                    ✓ {hub.action}
                  </span>
                  <span
                    style={{
                      backgroundColor: '#F1F5F9',
                      border: '1.5px solid #CBD5E1',
                      color: '#475569',
                      fontFamily: F.sans,
                      fontSize: 14,
                      padding: '3px 12px',
                      borderRadius: 10,
                      fontWeight: 700,
                    }}
                  >
                    官网下载 ↗
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部流动的五线谱彩带通道 */}
      <div
        style={{
          position: 'absolute',
          bottom: 75,
          left: 140,
          right: 140,
          height: 100,
          backgroundColor: '#FFFBEB',
          border: '3px dashed #F59E0B',
          borderRadius: 24,
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 30 }}>🌈</span>
          <div>
            <span
              style={{
                fontFamily: F.kuaile,
                fontSize: 22,
                color: '#B45309',
                fontWeight: 900,
              }}
            >
              你的音乐资产，本就属于你。随心导入任何喜爱的本地或开源播放器！
            </span>
            <div style={{ fontFamily: F.sans, fontSize: 15, color: '#78350F', marginTop: 2, fontWeight: 600 }}>
              * 下游 App 状态：全部正常 · 持续追踪接入中 *
            </div>
          </div>
        </div>

        <WashiTape color={C.tapeGreen} width={200} height={36} rotate={1}>
          <span style={{ fontFamily: F.kuaile, fontSize: 17, color: '#065F46', fontWeight: 800 }}>
            ✓ 自由流动 · 零锁死
          </span>
        </WashiTape>
      </div>
    </div>
  );
};
