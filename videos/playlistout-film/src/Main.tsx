import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, Sequence, staticFile } from 'remotion';
import './global.css';
import { ASSETS } from './assets';
import { C, SCENES } from './theme';
import { JournalStage } from './components/JournalStage';
import { MascotDirector } from './components/MascotDirector';
import { IntroCageFrontOverlay, IntroScene } from './scenes/IntroScene';
import { ParseScene } from './scenes/ParseScene';
import { ExportScene } from './scenes/ExportScene';
import { BatchScene } from './scenes/BatchScene';
import { CliScene } from './scenes/CliScene';
import { EcosystemScene } from './scenes/EcosystemScene';
import { FinaleScene } from './scenes/FinaleScene';

const fontDefs = [
  { family: 'MaShan', url: staticFile('fonts/MaShanZheng-Regular.ttf'), weight: '400' },
  { family: 'ZCOOLKuaiLe', url: staticFile('fonts/ZCOOLKuaiLe-Regular.ttf'), weight: '400' },
  { family: 'NotoSansSC', url: staticFile('fonts/NotoSansSC-VF.ttf'), weight: '100 900' },
  { family: 'Caveat', url: staticFile('fonts/Caveat-Variable.ttf'), weight: '400 700' },
  { family: 'SpaceMono', url: staticFile('fonts/SpaceMono-Regular.ttf'), weight: '400' },
  { family: 'SpaceMono', url: staticFile('fonts/SpaceMono-Bold.ttf'), weight: '700' },
  { family: 'PermanentMarker', url: staticFile('fonts/PermanentMarker-Regular.ttf'), weight: '400' },
];

const loadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });

const waitForAssets = async () => {
  if (typeof document === 'undefined') return;
  await Promise.all(
    fontDefs.map(async (def) => {
      const face = new FontFace(def.family, `url(${def.url})`, {
        weight: def.weight,
        style: 'normal',
      });
      await face.load();
      document.fonts.add(face);
    }),
  );
  await Promise.all([
    document.fonts.ready.catch(() => undefined),
    loadImage(ASSETS.logo512),
    loadImage(ASSETS.logo128),
    loadImage(ASSETS.grain),
    loadImage(ASSETS.creases),
    loadImage(ASSETS.fibrePage),
    loadImage(ASSETS.fibreTile),
    ...Object.values(ASSETS.platforms).map(loadImage),
  ]);
};

export const Main: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('Preloading Playlist Out Film fonts and paper textures'));

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
    return <AbsoluteFill style={{ backgroundColor: C.paper }} />;
  }

  return (
    <JournalStage>
      <Sequence name="01-Intro" from={SCENES.intro.in} durationInFrames={SCENES.intro.end - SCENES.intro.in}>
        <IntroScene />
      </Sequence>

      <Sequence name="02-Parse" from={SCENES.parse.in} durationInFrames={SCENES.parse.end - SCENES.parse.in}>
        <ParseScene />
      </Sequence>

      <Sequence name="03-Export" from={SCENES.export.in} durationInFrames={SCENES.export.end - SCENES.export.in}>
        <ExportScene />
      </Sequence>

      <Sequence name="04-Batch" from={SCENES.batch.in} durationInFrames={SCENES.batch.end - SCENES.batch.in}>
        <BatchScene />
      </Sequence>

      <Sequence name="05-CLI" from={SCENES.cli.in} durationInFrames={SCENES.cli.end - SCENES.cli.in}>
        <CliScene />
      </Sequence>

      <Sequence name="06-Ecosystem" from={SCENES.eco.in} durationInFrames={SCENES.eco.end - SCENES.eco.in}>
        <EcosystemScene />
      </Sequence>

      <Sequence name="07-Finale" from={SCENES.finale.in} durationInFrames={SCENES.finale.end - SCENES.finale.in}>
        <FinaleScene />
      </Sequence>

      {/* Continuous Pink Note Mascot Protagonist across all 1,740 frames */}
      <MascotDirector />

      {/* Front bars of the birdcage (only in front of Mascot before unlock at 5.5s) */}
      <Sequence name="01-CageFront" from={SCENES.intro.in} durationInFrames={190}>
        <IntroCageFrontOverlay />
      </Sequence>

      <Audio src={ASSETS.soundtrack} volume={1} />
    </JournalStage>
  );
};
