import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, Sequence, staticFile } from 'remotion';
import '../global.css';
import { C, SCENES } from '../theme';
import { Atmosphere, PaperBackground } from '../components/Background';
import { ColdOpen } from '../scenes/ColdOpen';
import { Intro, IntroFrontBars } from '../scenes/Intro';
import { V4Parse } from './V4Parse';
import { V4Export } from './V4Export';
import { V4Batch } from './V4Batch';
import { V4Cli } from './V4Cli';
import { V4Eco } from './V4Eco';
import { V4Finale } from './V4Finale';
import { V4Mascot } from './V4Mascot';

/**
 * v4 full scale pass. The whole film stays at 1920x1080; the UI scenes are
 * re-laid out at the approved 1.75x UI scale. Intro/Cold Open retain the film's
 * original title scale.
 */
const fontDefs = [
  { family: 'MaShan', url: staticFile('fonts/MaShanZheng-Regular.ttf'), weight: '400' },
  { family: 'NotoSansSC', url: staticFile('fonts/NotoSansSC-VF.ttf'), weight: '100 900' },
  { family: 'Caveat', url: staticFile('fonts/Caveat-Variable.ttf'), weight: '400 700' },
  { family: 'SpaceMono', url: staticFile('fonts/SpaceMono-Regular.ttf'), weight: '400' },
  { family: 'SpaceMono', url: staticFile('fonts/SpaceMono-Bold.ttf'), weight: '700' },
  { family: 'PermanentMarker', url: staticFile('fonts/PermanentMarker-Regular.ttf'), weight: '400' },
];

const loadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });

const waitForAssets = async () => {
  if (typeof document === 'undefined') return;
  await Promise.all(
    fontDefs.map(async (def) => {
      const face = new FontFace(def.family, `url(${def.url})`, { weight: def.weight, style: 'normal' });
      await face.load();
      document.fonts.add(face);
    }),
  );
  await Promise.all([
    document.fonts.ready.catch(() => undefined),
    loadImage(staticFile('brand/logo-512.png')),
    loadImage(staticFile('brand/logo-128.png')),
    loadImage(staticFile('textures/paper-grain.png')),
    loadImage(staticFile('textures/paper-creases.png')),
    loadImage(staticFile('textures/paper-fibre-page.png')),
    loadImage(staticFile('textures/paper-fibre-tile.png')),
  ]);
};

export const V4Main: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('Loading v4 fonts and paper'));

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

  return (
    <AbsoluteFill className="film-root" style={{ background: C.paper }}>
      <PaperBackground />

      <Sequence name="Cold Open" from={0} durationInFrames={60}>
        <ColdOpen />
      </Sequence>

      <Sequence name="Intro" from={SCENES.intro.in} durationInFrames={SCENES.intro.end - SCENES.intro.in}>
        <Intro cageReady />
      </Sequence>

      <Sequence name="Parse" from={SCENES.parse.in} durationInFrames={SCENES.parse.end - SCENES.parse.in}>
        <V4Parse />
      </Sequence>

      <Sequence name="Export" from={SCENES.export.in} durationInFrames={SCENES.export.end - SCENES.export.in}>
        <V4Export />
      </Sequence>

      <Sequence name="Batch" from={SCENES.batch.in} durationInFrames={SCENES.batch.end - SCENES.batch.in}>
        <V4Batch />
      </Sequence>

      <Sequence name="CLI" from={SCENES.cli.in} durationInFrames={SCENES.cli.end - SCENES.cli.in}>
        <V4Cli />
      </Sequence>

      <Sequence name="Ecosystem" from={SCENES.eco.in} durationInFrames={SCENES.eco.end - SCENES.eco.in}>
        <V4Eco />
      </Sequence>

      <Sequence name="Finale" from={SCENES.finale.in} durationInFrames={SCENES.finale.end - SCENES.finale.in}>
        <V4Finale />
      </Sequence>

      <V4Mascot />

      <Sequence name="Intro front bars" from={SCENES.intro.in} durationInFrames={SCENES.intro.end - SCENES.intro.in}>
        <IntroFrontBars />
      </Sequence>

      <Atmosphere />
      <Audio src={staticFile('audio/soundtrack-v3.wav')} volume={1} />
    </AbsoluteFill>
  );
};
