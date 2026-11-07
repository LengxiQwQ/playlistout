import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {NotebookBackdrop} from './components/NotebookBackdrop';
import {NoteMascot} from './components/NoteMascot';
import {FontGate} from './components/FontGate';
import {IntroScene} from './scenes/IntroScene';
import {BrowserStage} from './components/browser/BrowserStage';
import {FileExportScene} from './scenes/FileExportScene';
import {BatchOutputScene} from './scenes/BatchOutputScene';
import {TerminalScene} from './scenes/TerminalScene';
import {EcosystemScene} from './scenes/EcosystemScene';
import {FinaleScene} from './scenes/FinaleScene';
import {NOTE_KEYS} from './notePath';
import {sampleNoteKeys} from './lib/anim';
import {between} from './lib/anim';
import {COLORS} from './theme';

const NoteTrail: React.FC<{frame: number; seconds: number; opacity: number}> = ({frame, seconds, opacity}) => {
  if (frame < 6 || opacity < 0.1) return null;
  const dots = [0.075, 0.15, 0.225].map((delta, i) => {
    const key = sampleNoteKeys(Math.max(0, seconds - delta), NOTE_KEYS);
    return {key, i};
  });
  return (
    <>
      {dots.map(({key, i}) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: key.x,
            top: key.y,
            width: 7 - i,
            height: 7 - i,
            borderRadius: '50%',
            background: COLORS.ink,
            opacity: (0.14 - i * 0.035) * opacity,
            transform: 'translate(-50%, -50%)',
            zIndex: 440,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
};

export const PaperTrailFilm: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seconds = frame / fps;
  const note = sampleNoteKeys(seconds, NOTE_KEYS);
  const terminalDim = between(frame, 1062, 1086) * 0.27;
  const finaleLight = between(frame, 1536, 1572);

  return (
    <FontGate>
      <AbsoluteFill
        style={
          {
            backgroundColor: COLORS.paper,
            overflow: 'hidden',
            '--paper-texture': `url(${staticFile('textures/paper-creases.png')}), url(${staticFile(
              'textures/paper-grain.png',
            )})`,
          } as React.CSSProperties
        }
      >
        <NotebookBackdrop dim={terminalDim} warm={finaleLight} />

        {frame < 200 && <IntroScene />}
        <BrowserStage />
        <FileExportScene />
        <BatchOutputScene />
        <TerminalScene />
        <EcosystemScene />
        <FinaleScene />

        <NoteTrail frame={frame} seconds={seconds} opacity={note.opacity ?? 1} />
        <NoteMascot
          x={note.x}
          y={note.y}
          scale={note.scale ?? 1}
          rotate={note.rot ?? 0}
          opacity={note.opacity ?? 1}
          frame={frame}
          hopeful={seconds > 51.8}
        />

        <AbsoluteFill
          style={{
            zIndex: 600,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse 80% 76% at 50% 46%, rgba(255,255,255,0) 62%, rgba(77,55,24,0.13) 100%)',
            mixBlendMode: 'multiply',
            opacity: 0.9,
          }}
        />
        <AbsoluteFill
          style={{
            zIndex: 601,
            pointerEvents: 'none',
            background:
              'linear-gradient(118deg, rgba(255,231,173,0.12) 0%, rgba(255,255,255,0) 35%, rgba(255,244,210,0.06) 64%, rgba(83,58,26,0.05) 100%)',
            mixBlendMode: 'soft-light',
          }}
        />
        <AbsoluteFill
          style={{
            zIndex: 602,
            pointerEvents: 'none',
            backgroundImage: `url(${staticFile('textures/paper-grain.png')})`,
            backgroundSize: '256px 256px',
            opacity: 0.1,
            mixBlendMode: 'multiply',
          }}
        />

        <Audio src={staticFile('audio/film-mix.wav')} />
      </AbsoluteFill>
    </FontGate>
  );
};
