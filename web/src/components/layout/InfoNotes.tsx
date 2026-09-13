import React from 'react';
import { useTranslation } from '../../i18n';
import { Paper } from '../ui/Paper';
import { Tape } from '../ui/Tape';

export interface InfoNotesProps {
  onOpenPrivacy?: () => void;
}

export const InfoNotes: React.FC<InfoNotesProps> = ({ onOpenPrivacy }) => {
  const { t } = useTranslation();

  return (
    <section
      className="info-notes-section"
      style={{
        maxWidth: 'var(--result-paper-width, 1050px)',
        margin: '3.5rem auto 0',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start',
      }}
    >
      {/* Note 1: Why this exists */}
      <Paper
        color="yellow"
        borderVariant="default"
        rotateDeg={-1}
        shadow="paper"
        style={{ padding: '1.5rem' }}
      >
        <div className="font-marker" style={{ fontSize: '1.35rem', marginBottom: '0.5rem', color: 'var(--ink, #2d3436)' }}>
          {t.infoNotes.whyTitle}
        </div>
        <p className="font-handwriting" style={{ fontSize: '1.35rem', lineHeight: 1.3, margin: 0, color: 'var(--ink, #2d3436)' }}>
          {t.infoNotes.whyContent}
        </p>
        <div className="font-note" style={{ marginTop: '0.75rem', fontSize: '1.25rem', color: '#636e72' }}>
          {t.infoNotes.whySubtext}
        </div>
      </Paper>

      {/* Note 2: What you get */}
      <Paper
        color="white"
        borderVariant="default"
        rotateDeg={1}
        shadow="paper"
        style={{ padding: '1.5rem', position: 'relative' }}
      >
        <Tape
          color="pink"
          rotateDeg={5}
          style={{ position: 'absolute', top: '-0.75rem', right: '2rem', width: '6rem', height: '1.5rem' }}
        />
        <div className="font-marker" style={{ fontSize: '1.35rem', marginBottom: '0.65rem', color: 'var(--ink, #2d3436)' }}>
          {t.infoNotes.whatTitle}
        </div>
        <div className="font-handwriting" style={{ fontSize: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', color: 'var(--ink, #2d3436)' }}>
          <div>{t.infoNotes.whatItem1}</div>
          <div>{t.infoNotes.whatItem2}</div>
          <div>{t.infoNotes.whatItem3}</div>
          <div>{t.infoNotes.whatItem4}</div>
        </div>
        {onOpenPrivacy && (
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="font-note feature-link-btn"
            style={{
              marginTop: '0.75rem',
              fontSize: '1.25rem',
              color: '#2563eb',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
              textAlign: 'left',
            }}
          >
            {t.privacy.viewDataNotice}
          </button>
        )}
      </Paper>

      {/* Note 3: Little note */}
      <Paper
        color="blue"
        borderVariant="default"
        rotateDeg={-0.5}
        shadow="paper"
        style={{ padding: '1.5rem' }}
      >
        <div className="font-marker" style={{ fontSize: '1.35rem', marginBottom: '0.5rem', color: 'var(--ink, #2d3436)' }}>
          {t.infoNotes.noteTitle}
        </div>
        <p className="font-handwriting" style={{ fontSize: '1.35rem', lineHeight: 1.3, margin: 0, color: 'var(--ink, #2d3436)' }}>
          {t.infoNotes.noteContent}
        </p>
        <div className="font-note" style={{ marginTop: '0.75rem', textAlign: 'right', fontSize: '1.35rem', color: '#636e72' }}>
          {t.infoNotes.noteSubtext}
        </div>
      </Paper>
    </section>
  );
};
