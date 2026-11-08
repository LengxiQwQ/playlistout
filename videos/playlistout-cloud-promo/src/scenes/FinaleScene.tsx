import React from 'react';
import { interpolate } from 'remotion';
import { popIn } from '../anim';
import { WashiTape } from '../components/WashiTape';
import { C, F } from '../theme';

export const FinaleScene: React.FC<{ frame: number }> = ({ frame }) => {
  // 手账本合上，封面显现 (1625 帧起)
  const coverPop = popIn(frame, 1625, 14, 1.05);

  // 1680 帧眨眼时，爱心冒出
  const heartProgress = interpolate(frame, [1680, 1700], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* 居中偏左手账本封面 */}
      <div
        style={{
          position: 'absolute',
          top: 150,
          left: 180,
          width: 1040,
          height: 640,
          backgroundColor: '#FFFFFF',
          border: '5px solid #3E5366',
          borderRadius: 44,
          padding: '48px 56px',
          boxShadow: '12px 18px 48px rgba(62, 83, 102, 0.22)',
          opacity: coverPop.opacity,
          transform: `scale(${coverPop.scale}) rotate(-1deg)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* 顶部和纸胶带与小标语 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <WashiTape color={C.tapePink} width={280} height={42} rotate={-2}>
            <span style={{ fontFamily: F.kuaile, fontSize: 20, color: '#831843', fontWeight: 800 }}>
              ★ 把你的歌单带走 · 永久珍藏
            </span>
          </WashiTape>

          <span
            style={{
              fontFamily: F.mono,
              fontSize: 18,
              color: '#64748B',
              backgroundColor: '#F1F5F9',
              padding: '6px 16px',
              borderRadius: 14,
              fontWeight: 700,
            }}
          >
            MIT Licensed · Free & Open Source
          </span>
        </div>

        {/* 核心品牌烫金大标题 */}
        <div>
          <h1
            style={{
              fontFamily: F.display,
              fontSize: 88,
              color: C.ink,
              margin: '12px 0 0 0',
              lineHeight: 1,
              letterSpacing: '1.5px',
            }}
          >
            Playlist Out
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 14 }}>
            <WashiTape color={C.tapeYellow} width={340} height={52} rotate={1}>
              <span
                style={{
                  fontFamily: F.kuaile,
                  fontSize: 34,
                  color: '#78350F',
                  fontWeight: 900,
                }}
              >
                把你的歌单带走
              </span>
            </WashiTape>
            <span
              style={{
                fontFamily: F.sans,
                fontSize: 22,
                color: C.inkSoft,
                fontWeight: 600,
              }}
            >
              属于每一个爱乐者的音乐自由手账
            </span>
          </div>
        </div>

        {/* 官方网站与开源仓库地址 */}
        <div
          style={{
            backgroundColor: '#F0F9FF',
            border: '3px solid #38BDF8',
            borderRadius: 24,
            padding: '16px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span
              style={{
                fontFamily: F.mono,
                fontSize: 32,
                color: '#0369A1',
                fontWeight: 900,
              }}
            >
              playlistout.lengxiqwq.com
            </span>
            <div
              style={{
                fontFamily: F.sans,
                fontSize: 18,
                color: '#0284C7',
                marginTop: 4,
                fontWeight: 600,
              }}
            >
              在线体验 · 即刻解析导出你的第一张歌单
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#0284C7',
              color: '#FFFFFF',
              fontFamily: F.kuaile,
              fontSize: 22,
              padding: '10px 24px',
              borderRadius: 18,
              fontWeight: 800,
            }}
          >
            立即前往 ➔
          </div>
        </div>

        {/* 底部三大保障徽章 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '2px dashed #CBD5E1',
            paddingTop: 16,
            fontFamily: F.sans,
            fontSize: 18,
            color: '#475569',
            fontWeight: 700,
          }}
        >
          <span>🔒 纯端侧隐私安全 · 零服务端持久化</span>
          <span>⚡ 六大音乐平台 · 多格式导出</span>
          <span>⭐ GitHub: LengxiQwQ/playlistout</span>
        </div>
      </div>

      {/* 小困云眨眼时冒出的粉色小心心 (1680 帧起) */}
      {heartProgress > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 1440,
            top: 540 - 180 - heartProgress * 30,
            transform: `translate(-50%, -50%) scale(${heartProgress})`,
            fontSize: 48,
            opacity: 1 - heartProgress * 0.3,
            zIndex: 60,
          }}
        >
          💖
        </div>
      )}
    </div>
  );
};
