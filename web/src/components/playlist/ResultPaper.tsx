import React from 'react';
import type { Playlist } from '../../api/types';
import { useTranslation } from '../../i18n';
import { Paper } from '../ui/Paper';
import { Tape } from '../ui/Tape';
import { PlaylistSummary } from '../PlaylistSummary';
import { TrackTable } from '../TrackTable';
import { ExportToolbar } from '../ExportToolbar';

export interface ResultPaperProps {
  playlist: Playlist;
  onReset: () => void;
}

export const ResultPaper: React.FC<ResultPaperProps> = ({ playlist, onReset }) => {
  const { t } = useTranslation();

  return (
    <div>
      {/* Transitional journal hint */}
      <div
        className="font-note"
        style={{
          maxWidth: 'var(--search-note-width, 820px)',
          margin: '0 auto calc(var(--ruled-line-height, 38px) * 1.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '1.65rem',
          color: '#8a8f92',
          height: 'var(--ruled-line-height, 38px)',
          lineHeight: 'var(--ruled-line-height, 38px)',
        }}
      >
        <span>{t.result.doneParsingHint}</span>
      </div>

      <section
        id="result"
        className="result-paper-section"
        style={{
          maxWidth: 'var(--result-paper-width, 1050px)',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* Decorative doodle on top right */}
        <div
          className="result-doodle"
          style={{
            position: 'absolute',
            right: '2rem',
            top: '-1.85rem',
            color: '#a0a5a8',
            fontSize: '3rem',
            userSelect: 'none',
            zIndex: 15,
          }}
          aria-hidden="true"
        >
          ⌇
        </div>

        {/* Decorative green washi tape */}
        <Tape
          color="green"
          rotateDeg={-6}
          style={{
            position: 'absolute',
            top: '2rem',
            left: '-1.5rem',
            zIndex: 20,
            width: '8rem',
            height: '1.85rem',
          }}
        />

        <Paper
          color="white"
          borderVariant="default"
          shadow="paper"
          className="result-paper-card"
          interactive={false}
          style={{ padding: '2.5rem' }}
        >
          <PlaylistSummary playlist={playlist} onReset={onReset} />
          <TrackTable tracks={playlist.tracks} />
          <ExportToolbar playlist={playlist} />
        </Paper>
      </section>
    </div>
  );
};
