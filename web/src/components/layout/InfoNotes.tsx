import React from 'react';
import { useTranslation } from '../../i18n';
import { Paper } from '../ui/Paper';
import { Tape } from '../ui/Tape';
import { Sticker } from '../ui/Sticker';
import { Reveal } from '../motion/Reveal';

export interface InfoNotesProps {
  onOpenPrivacy?: () => void;
}

export const InfoNotes: React.FC<InfoNotesProps> = () => {
  const { t } = useTranslation();
  const isWhyLong = t.infoNotes.whyContent.length > 40;
  const isNoteLong = t.infoNotes.noteContent.length > 40;

  return (
    <section className="info-notes-section">
      <div className="info-notes-grid">
        {/* Note 1: Why this exists (Lemon, rot -2deg, toss-left) */}
        <Reveal effect="toss-left" delay={0} rot={-2}>
          <Paper
            color="yellow"
            borderVariant="default"
            rotateDeg={0}
            shadow="paper"
            style={{ padding: '2rem 1.75rem', position: 'relative' }}
          >
            <Reveal
              effect="tape"
              delay={450}
              rot={-4}
              style={{ position: 'absolute', top: '-0.75rem', left: '2rem', zIndex: 20, pointerEvents: 'none' }}
            >
              <Tape
                color="cyan"
                rotateDeg={0}
                style={{ width: '5.5rem', height: '1.45rem' }}
              />
            </Reveal>
            <div className="font-marker" style={{ fontSize: '1.35rem', marginBottom: '1rem', color: 'var(--text)' }}>
              {t.infoNotes.whyTitle}
            </div>
            <p
              className={isWhyLong ? undefined : 'ruled-paper-text font-handwriting'}
              style={
                isWhyLong
                  ? { fontFamily: 'var(--font-sans)', fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text)', margin: 0 }
                  : { fontSize: '1.3rem' }
              }
            >
              {t.infoNotes.whyContent}
            </p>
            <div className="font-note" style={{ marginTop: '1.25rem', fontSize: '1.25rem', color: 'var(--text-muted)' }}>
              {t.infoNotes.whySubtext}
            </div>
          </Paper>
        </Reveal>

        {/* Note 2: What you get (Strawberry, rot 1.5deg, stick) */}
        <Reveal effect="stick" delay={180} rot={1.5}>
          <Paper
            color="pink"
            borderVariant="default"
            rotateDeg={0}
            shadow="paper"
            style={{ padding: '2rem 1.75rem', position: 'relative' }}
          >
            <Reveal
              effect="tape"
              delay={630}
              rot={5}
              style={{ position: 'absolute', top: '-0.75rem', right: '2rem', zIndex: 20, pointerEvents: 'none' }}
            >
              <Tape
                color="pink"
                rotateDeg={0}
                style={{ width: '6rem', height: '1.5rem' }}
              />
            </Reveal>
            <div className="font-marker" style={{ fontSize: '1.35rem', marginBottom: '1rem', color: 'var(--text)' }}>
              {t.infoNotes.whatTitle}
            </div>
            <div className="ruled-paper-list font-handwriting" style={{ fontSize: '1.25rem' }}>
              <div>{t.infoNotes.whatItem1}</div>
              <div>{t.infoNotes.whatItem2}</div>
              <div>{t.infoNotes.whatItem3}</div>
              <div>{t.infoNotes.whatItem4}</div>
            </div>
          </Paper>
        </Reveal>

        {/* Note 3: Little note (Mint, rot -1deg, toss-right) */}
        <Reveal effect="toss-right" delay={360} rot={-1}>
          <Paper
            color="mint"
            borderVariant="default"
            rotateDeg={0}
            shadow="paper"
            style={{ padding: '2rem 1.75rem', position: 'relative' }}
          >
            <Reveal
              effect="tape"
              delay={810}
              rot={-3}
              style={{
                position: 'absolute',
                top: '-0.75rem',
                left: '50%',
                marginLeft: '-2.9rem',
                zIndex: 20,
                pointerEvents: 'none',
              }}
            >
              <Tape
                color="yellow"
                rotateDeg={0}
                style={{ width: '5.8rem', height: '1.45rem' }}
              />
            </Reveal>
            <div className="font-marker" style={{ fontSize: '1.35rem', marginBottom: '1rem', color: 'var(--text)' }}>
              {t.infoNotes.noteTitle}
            </div>
            <p
              className={isNoteLong ? undefined : 'ruled-paper-text font-handwriting'}
              style={
                isNoteLong
                  ? { fontFamily: 'var(--font-sans)', fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text)', margin: 0 }
                  : { fontSize: '1.3rem' }
              }
            >
              {t.infoNotes.noteContent}
            </p>
            <div className="font-note" style={{ marginTop: '1.25rem', textAlign: 'right', fontSize: '1.35rem', color: 'var(--text-muted)' }}>
              {t.infoNotes.noteSubtext}
            </div>
          </Paper>
        </Reveal>
      </div>

      {/* Act 3 Deco 4: Sakura blossom sticker (migrated from BackgroundDecorations) */}
      <Reveal
        effect="pop"
        delay={900}
        rot={-8}
        data-deco-mobile="hide"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '0.25rem',
          bottom: '0.45rem',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        <div
          className="stationery-sticker delay-1"
          style={{
            ['--sticker-rot' as any]: '-8deg',
            fontSize: '2.1rem',
            color: 'var(--accent-strawberry)',
            opacity: 0.85,
          }}
        >
          ✿
        </div>
      </Reveal>

      {/* Act 3 Deco 5: Favorited sticker */}
      <Reveal
        effect="pop"
        delay={1050}
        rot={6}
        className="info-notes-favorited"
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '2rem',
          bottom: '0.1rem',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        <Sticker
          as="div"
          color="pink"
          rotateDeg={0}
          style={{
            opacity: 0.88,
            fontSize: '0.9rem',
            padding: '0.25rem 0.6rem',
            whiteSpace: 'nowrap',
          }}
        >
          ♥ favorited
        </Sticker>
      </Reveal>
    </section>
  );
};
