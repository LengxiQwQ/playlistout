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
        maxWidth: 'var(--result-paper-width, 1180px)',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2.5rem',
        alignItems: 'start',
      }}
    >
      {/* Note 1: Why this exists */}
      <Paper
        color="yellow"
        borderVariant="default"
        rotateDeg={-1}
        shadow="paper"
        style={{ padding: '2rem 1.75rem' }}
      >
        <div className="font-marker" style={{ fontSize: '1.35rem', marginBottom: '1rem', color: 'var(--ink, #2d3436)' }}>
          {t.infoNotes.whyTitle}
        </div>
        <p className="ruled-paper-text font-handwriting" style={{ fontSize: '1.3rem' }}>
          {t.infoNotes.whyContent}
        </p>
        <div className="font-note" style={{ marginTop: '1.25rem', fontSize: '1.25rem', color: '#636e72' }}>
          {t.infoNotes.whySubtext}
        </div>
      </Paper>

      {/* Note 2: What you get */}
      <Paper
        color="white"
        borderVariant="default"
        rotateDeg={1}
        shadow="paper"
        style={{ padding: '2rem 1.75rem', position: 'relative' }}
      >
        <Tape
          color="pink"
          rotateDeg={5}
          style={{ position: 'absolute', top: '-0.75rem', right: '2rem', width: '6rem', height: '1.5rem', zIndex: 20 }}
        />
        <div className="font-marker" style={{ fontSize: '1.35rem', marginBottom: '1rem', color: 'var(--ink, #2d3436)' }}>
          {t.infoNotes.whatTitle}
        </div>
        <div className="ruled-paper-list font-handwriting" style={{ fontSize: '1.25rem' }}>
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
              marginTop: '1.25rem',
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
        style={{ padding: '2rem 1.75rem' }}
      >
        <div className="font-marker" style={{ fontSize: '1.35rem', marginBottom: '1rem', color: 'var(--ink, #2d3436)' }}>
          {t.infoNotes.noteTitle}
        </div>
        <p className="ruled-paper-text font-handwriting" style={{ fontSize: '1.3rem' }}>
          {t.infoNotes.noteContent}
        </p>
        <div className="font-note" style={{ marginTop: '1.25rem', textAlign: 'right', fontSize: '1.35rem', color: '#636e72' }}>
          {t.infoNotes.noteSubtext}
        </div>
      </Paper>
    </section>
  );
};
