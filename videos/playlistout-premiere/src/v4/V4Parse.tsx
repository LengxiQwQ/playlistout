import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, SCENES, cue } from '../theme';
import { PaperSheet } from '../components/Paper';
import { UI, Chrome, SiteHeader, InputView, ResultView, INNER_H } from '../scenes/ScaleLab';
import { Chapter, Footer, paperBreath } from './UI';

const at = (name: Parameters<typeof cue>[0]) => Math.max(0, cue(name) - SCENES.parse.in);

export const V4Parse: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [at('results') - 8, at('results') + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill>
      <Chapter
        kicker="SINGLE PLAYLIST · COPY / PASTE / PARSE"
        title="粘贴，解析，收好。"
        right={
          <>
            无需注册 · 公开歌单
            <div style={{ fontFamily: 'SpaceMono', fontSize: 13, color: C.inkMuted, letterSpacing: '.12em', marginTop: 4 }}>
              ONE LINK. ONE LITTLE ESCAPE.
            </div>
          </>
        }
      />
      <div
        style={{
          position: 'absolute',
          left: UI.left,
          top: UI.top,
          width: UI.width,
          height: UI.height,
          zIndex: 10,
          ...paperBreath(frame),
        }}
      >
        <PaperSheet
          tone="cream"
          shadow="paper"
          radius="7px 14px 8px 15px / 13px 7px 15px 8px"
          style={{ width: '100%', height: '100%', padding: 0, background: '#f8f3e7' }}
        >
          <Chrome />
          <SiteHeader />
          <div style={{ position: 'relative', height: INNER_H, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - reveal }}>
              <InputView />
            </div>
            <div style={{ position: 'absolute', inset: 0, opacity: reveal }}>
              <ResultView />
            </div>
          </div>
        </PaperSheet>
      </div>
      <Footer left="一张链接，就够了。" right="PARSED IN A FEW BEATS" />
    </AbsoluteFill>
  );
};
