import React from 'react';
import { Img, staticFile } from 'remotion';
import { BORDERS, COLORS, FONTS, SHADOWS } from '../theme/tokens';
import { journalSpring, smoothStep, snappySpring } from '../utils/motion';
import {
  MarkerHighlight,
  PaperCard,
  StickerBadge,
  WashiTape,
} from '../components/JournalPrimitives';

export const Act7BrandFinale: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < 1595) return null;

  const enterProg = smoothStep(frame, 1595, 1620, 0, 1);
  const cardSpring = journalSpring(frame, 1598, { damping: 13, stiffness: 150 });
  const logoUrl = staticFile('assets/logo-512.png');
  const githubSvg = staticFile('assets/github.svg');

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: enterProg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 90,
      }}
    >
      {/* Main Brand Finale Journal Card */}
      <div
        style={{
          width: 1240,
          position: 'relative',
          transform: `scale(${0.86 + 0.14 * cardSpring}) rotate(-0.3deg)`,
        }}
      >
        <WashiTape
          color="pink"
          width={165}
          height={34}
          rotateDeg={-8}
          frame={frame}
          appearFrame={1608}
          style={{ position: 'absolute', top: -16, left: 48, zIndex: 30 }}
        />
        <WashiTape
          color="yellow"
          width={165}
          height={34}
          rotateDeg={7}
          frame={frame}
          appearFrame={1614}
          style={{ position: 'absolute', top: -16, right: 48, zIndex: 30 }}
        />
        <WashiTape
          color="cyan"
          width={155}
          height={32}
          rotateDeg={-5}
          frame={frame}
          appearFrame={1618}
          style={{ position: 'absolute', bottom: -15, right: 64, zIndex: 30 }}
        />

        <PaperCard
          bg={COLORS.paperWhite}
          cutoutShadow={true}
          style={{
            padding: '48px 64px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {/* Logo + English Title Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <Img
              src={logoUrl}
              style={{
                width: 92,
                height: 92,
                borderRadius: 20,
                border: `3.5px solid ${COLORS.ink}`,
                boxShadow: SHADOWS.cutoutSm,
                backgroundColor: '#fff',
                transform: 'rotate(-3deg)',
              }}
            />
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontFamily: FONTS.marker,
                  fontSize: 64,
                  lineHeight: 1.05,
                  color: COLORS.ink,
                  letterSpacing: '0.02em',
                }}
              >
                Playlist Out
              </div>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 18,
                  fontWeight: 700,
                  color: COLORS.amber,
                  marginTop: 4,
                }}
              >
                PASTE · PARSE · EXPORT · KEEP MOVING
              </div>
            </div>
          </div>

          {/* Main Chinese Title */}
          <div
            style={{
              marginTop: 22,
              fontFamily: FONTS.handwriting,
              fontSize: 90,
              fontWeight: 700,
              lineHeight: 1.12,
              color: COLORS.ink,
              textShadow: '3px 4px 0 rgba(65, 48, 12, 0.22)',
            }}
          >
            把你的{' '}
            <MarkerHighlight frame={frame} startFrame={1612} color={COLORS.highlightYellow}>
              歌单带走
            </MarkerHighlight>
          </div>

          {/* Warm Subtitle */}
          <div
            style={{
              marginTop: 12,
              fontFamily: FONTS.handwriting,
              fontSize: 30,
              color: COLORS.inkLight,
              whiteSpace: 'nowrap',
            }}
          >
            你的歌单，不应该只困在一个音乐平台里 · 为备份与自由流转而生的音乐手账
          </div>

          {/* Prominent Website URL Pill */}
          <div
            style={{
              marginTop: 28,
              backgroundColor: COLORS.noteYellow,
              border: `3.5px solid ${COLORS.ink}`,
              borderRadius: BORDERS.handDrawnAlt,
              boxShadow: SHADOWS.cutout,
              padding: '14px 44px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 16,
              transform: `scale(${0.9 + 0.1 * snappySpring(frame, 1616)}) rotate(-0.6deg)`,
            }}
          >
            <span style={{ fontSize: 30 }}>🌐</span>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 34,
                fontWeight: 700,
                color: COLORS.ink,
                letterSpacing: '0.01em',
              }}
            >
              playlistout.lengxiqwq.com
            </span>
          </div>

          {/* Bottom Open-Source & Feature Badges */}
          <div
            style={{
              marginTop: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            <StickerBadge color="white" rotateDeg={-1} font="mono" style={{ fontSize: 18, padding: '8px 20px' }}>
              <Img src={githubSvg} style={{ width: 22, height: 22 }} />
              <span>github.com/LengxiQwQ/playlistout</span>
            </StickerBadge>

            <StickerBadge color="green" rotateDeg={1.2} font="mono" style={{ fontSize: 18, padding: '8px 20px' }}>
              📜 MIT License · 开源免费
            </StickerBadge>

            <StickerBadge color="blue" rotateDeg={-0.8} font="sans" style={{ fontSize: 18, padding: '8px 20px' }}>
              💻 在线网页 · 桌面 CLI · 开源播放器插件
            </StickerBadge>
          </div>
        </PaperCard>
      </div>

      {/* Signature Coral-Red Notebook Footer Divider (Exact match to Footer.tsx) */}
      <div
        style={{
          marginTop: 34,
          width: 1240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <div style={{ flex: 1, height: 2.5, backgroundColor: COLORS.marginRed, borderRadius: 2 }} />
        <span
          style={{
            fontFamily: FONTS.handwriting,
            fontSize: 26,
            fontWeight: 700,
            color: COLORS.marginRed,
            letterSpacing: '0.08em',
          }}
        >
          ✦ END OF PAGE · 愿每一个音符，都能随你自由流淌 ♡ ✦
        </span>
        <div style={{ flex: 1, height: 2.5, backgroundColor: COLORS.marginRed, borderRadius: 2 }} />
      </div>
    </div>
  );
};
