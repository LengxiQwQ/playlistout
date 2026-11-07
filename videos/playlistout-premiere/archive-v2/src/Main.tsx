import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, Sequence, staticFile, useCurrentFrame } from 'remotion';
import './global.css';
import { C, DURATION, SCENES } from './theme';
import { getCamera } from './camera';
import { Atmosphere, PaperBackground } from './components/Background';
import { MascotJourney } from './components/MascotJourney';
import { PageTurn } from './components/PageTurn';
import { StepCaption } from './components/StepCaption';
import { Intro, IntroFrontBars } from './scenes/Intro';
import { ParseScene } from './scenes/ParseScene';
import { ExportScene } from './scenes/ExportScene';
import { BatchScene } from './scenes/BatchScene';
import { CliScene } from './scenes/CliScene';
import { EcosystemScene } from './scenes/EcosystemScene';
import { FinaleScene } from './scenes/FinaleScene';

const PAGE_TURNS = [
  { at: 170, file: 'page-turn-a.wav' },
  { at: 522, file: 'page-turn-b.wav' },
  { at: 756, file: 'page-turn-a.wav' },
  { at: 1002, file: 'page-turn-b.wav' },
  { at: 1365, file: 'page-turn-a.wav' },
  { at: 1536, file: 'page-turn-b.wav' },
] as const;

const loadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });

const fontDefs = [
  { family: 'MaShan', url: staticFile('fonts/MaShanZheng-Regular.ttf'), weight: '400' },
  { family: 'NotoSansSC', url: staticFile('fonts/NotoSansSC-VF.ttf'), weight: '100 900' },
  { family: 'Caveat', url: staticFile('fonts/Caveat-Variable.ttf'), weight: '400 700' },
  { family: 'SpaceMono', url: staticFile('fonts/SpaceMono-Regular.ttf'), weight: '400' },
  { family: 'SpaceMono', url: staticFile('fonts/SpaceMono-Bold.ttf'), weight: '700' },
  { family: 'PermanentMarker', url: staticFile('fonts/PermanentMarker-Regular.ttf'), weight: '400' },
];

const waitForAssets = async () => {
  if (typeof document === 'undefined') return;
  const faces = await Promise.all(
    fontDefs.map(async (def) => {
      const face = new FontFace(def.family, `url(${def.url})`, { weight: def.weight, style: 'normal' });
      await face.load();
      document.fonts.add(face);
      return face;
    }),
  );
  await Promise.all([
    ...faces.map(() => Promise.resolve()),
    document.fonts.ready.catch(() => undefined),
    loadImage(staticFile('brand/logo-512.png')),
    loadImage(staticFile('brand/logo-128.png')),
    loadImage(staticFile('textures/paper-grain.png')),
    loadImage(staticFile('textures/paper-creases.png')),
  ]);
};

export const Main: React.FC = () => {
  const frame = useCurrentFrame();
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('Loading Playlist Out film assets'));

  useEffect(() => {
    let cancelled = false;
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 15000));
    Promise.race([waitForAssets(), timeout]).finally(() => {
      if (cancelled) return;
      continueRender(handle);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (!ready) {
    return <AbsoluteFill style={{ background: C.paper }} />;
  }

  const camera = getCamera(frame);
  const cameraTransform = `translate(${960 - camera.x * camera.scale}px, ${540 - camera.y * camera.scale}px) scale(${camera.scale})`;

  return (
    <AbsoluteFill className="film-root" style={{ background: C.paper }}>
      {/* The notebook stays fixed; the collage moves under the camera. */}
      <PaperBackground />

      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <AbsoluteFill
          style={{
            width: 1920,
            height: 1080,
            transformOrigin: '0 0',
            transform: cameraTransform,
          }}
        >
      <Sequence name="Intro" from={SCENES.intro.in} durationInFrames={SCENES.intro.end - SCENES.intro.in}>
        <Intro />
      </Sequence>

      <Sequence name="Parse" from={SCENES.parse.in} durationInFrames={SCENES.parse.end - SCENES.parse.in}>
        <ParseScene />
      </Sequence>

      <Sequence name="Export" from={SCENES.export.in} durationInFrames={SCENES.export.end - SCENES.export.in}>
        <ExportScene />
      </Sequence>

      <Sequence name="Batch" from={SCENES.batch.in} durationInFrames={SCENES.batch.end - SCENES.batch.in}>
        <BatchScene />
      </Sequence>

      <Sequence name="CLI" from={SCENES.cli.in} durationInFrames={SCENES.cli.end - SCENES.cli.in}>
        <CliScene />
      </Sequence>

      <Sequence name="Ecosystem" from={SCENES.eco.in} durationInFrames={SCENES.eco.end - SCENES.eco.in}>
        <EcosystemScene />
      </Sequence>

      <Sequence name="Finale" from={SCENES.finale.in} durationInFrames={SCENES.finale.end - SCENES.finale.in}>
        <FinaleScene />
      </Sequence>

      <MascotJourney />
      <Sequence name="Intro front bars" from={SCENES.intro.in} durationInFrames={SCENES.intro.end - SCENES.intro.in}>
        <IntroFrontBars />
      </Sequence>
        </AbsoluteFill>
      </AbsoluteFill>

      <StepCaption />
      <PageTurn />
      <Atmosphere />
      <Audio src={staticFile('audio/soundtrack.wav')} volume={1} />
      {PAGE_TURNS.map((turn) => (
        <Sequence key={turn.at} from={turn.at - 7} durationInFrames={27}>
          <Audio src={staticFile(`audio/${turn.file}`)} volume={0.52} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
