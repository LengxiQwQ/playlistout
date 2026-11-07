import React from 'react';
import { Audio, staticFile, useCurrentFrame } from 'remotion';
import './styles/journal.css';
import { JournalWorld } from './components/JournalWorld';
import { TravellingMotifOverlay, useJournalFontsLoaded } from './components/TravellingMotifOverlay';
import { Act1DilemmaAndDebut } from './scenes/Act1DilemmaAndDebut';
import { Act2WebParsing } from './scenes/Act2WebParsing';
import { Act3MultiFormatExport } from './scenes/Act3MultiFormatExport';
import { Act4BatchExport } from './scenes/Act4BatchExport';
import { Act5DesktopCli } from './scenes/Act5DesktopCli';
import { Act6EcosystemHub } from './scenes/Act6EcosystemHub';
import { Act7BrandFinale } from './scenes/Act7BrandFinale';

export const PromoFilm: React.FC = () => {
  useJournalFontsLoaded();
  const frame = useCurrentFrame();

  return (
    <JournalWorld frame={frame}>
      <Audio src={staticFile('audio/soundtrack-mix.wav')} volume={1} />
      <Act1DilemmaAndDebut frame={frame} />
      <Act2WebParsing frame={frame} />
      <Act3MultiFormatExport frame={frame} />
      <Act4BatchExport frame={frame} />
      <Act5DesktopCli frame={frame} />
      <Act6EcosystemHub frame={frame} />
      <Act7BrandFinale frame={frame} />
      <TravellingMotifOverlay frame={frame} />
    </JournalWorld>
  );
};
