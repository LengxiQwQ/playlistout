import React from 'react';
import { Audio, staticFile, useCurrentFrame } from 'remotion';
import { useJournalFonts } from './theme/fonts';
import { NotebookWorld } from './components/NotebookWorld';
import { HeroNoteThread } from './components/HeroNoteThread';
import { Act1DilemmaAndDebut } from './scenes/Act1DilemmaAndDebut';
import { Act2WebParse } from './scenes/Act2WebParse';
import { Act3MultiFormatExport } from './scenes/Act3MultiFormatExport';
import { Act4BatchExport } from './scenes/Act4BatchExport';
import { Act5DesktopCli } from './scenes/Act5DesktopCli';
import { Act6Ecosystem } from './scenes/Act6Ecosystem';
import { Act7BrandFinale } from './scenes/Act7BrandFinale';

export const PlaylistOutStorybook: React.FC = () => {
  useJournalFonts();
  const frame = useCurrentFrame();

  return (
    <NotebookWorld frame={frame}>
      {/* Original 120 BPM Soundtrack + Frame-Locked Foley SFX */}
      <Audio src={staticFile('assets/soundtrack.wav')} volume={1} />

      {/* 7 Continuous Overlapping Music-Journal Acts */}
      <Act1DilemmaAndDebut frame={frame} />
      <Act2WebParse frame={frame} />
      <Act3MultiFormatExport frame={frame} />
      <Act4BatchExport frame={frame} />
      <Act5DesktopCli frame={frame} />
      <Act6Ecosystem frame={frame} />
      <Act7BrandFinale frame={frame} />

      {/* Continuous Golden Musical Note Visual Thread across the entire film */}
      <HeroNoteThread frame={frame} />
    </NotebookWorld>
  );
};
