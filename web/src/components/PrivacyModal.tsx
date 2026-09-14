import React, { useEffect, useRef } from 'react';
import { useTranslation } from '../i18n';
import { Tape } from './ui/Tape';
import { MarkerButton } from './ui/MarkerButton';

export interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      data-testid="privacy-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(45, 52, 54, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        zIndex: 1000,
        animation: 'modalBackdropFadeIn 0.18s ease-out forwards',
      }}
    >
      <div
        className="modal-container hand-drawn-border paper-shadow"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          backgroundColor: '#ffffff',
          maxWidth: '620px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'paperModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          transform: 'rotate(0.2deg)',
          transformOrigin: 'center center',
          willChange: 'transform, opacity',
        }}
      >
        <Tape
          color="pink"
          rotateDeg={4}
          style={{
            position: 'absolute',
            top: '-0.85rem',
            right: '2rem',
            zIndex: 10,
          }}
        />

        <div
          className="modal-header"
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '2px dashed var(--line, #dfe6e9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 id="privacy-modal-title" className="font-marker text-2xl" style={{ margin: 0 }}>
            {t.privacy.modalTitle}
          </h2>
          <button
            type="button"
            ref={closeButtonRef}
            className="btn-modal-close font-mono sticker"
            onClick={onClose}
            aria-label={t.privacy.closeLabel}
            style={{
              width: '2rem',
              height: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
            }}
          >
            ✕
          </button>
        </div>

        <div
          className="modal-content"
          style={{
            padding: '1.5rem 1.75rem',
            overflowY: 'auto',
            lineHeight: 1.65,
            color: 'var(--ink, #2d3436)',
            fontSize: '0.95rem',
          }}
        >
          <section className="privacy-section" style={{ marginBottom: '1.25rem' }}>
            <h3 className="font-marker" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              {t.privacy.section1Title}
            </h3>
            <p className="font-sans" style={{ color: '#4b5563', margin: 0 }}>
              {t.privacy.section1Content}
            </p>
          </section>

          <section className="privacy-section" style={{ marginBottom: '1.25rem' }}>
            <h3 className="font-marker" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              {t.privacy.section2Title}
            </h3>
            <p className="font-sans" style={{ color: '#4b5563', margin: 0 }}>
              {t.privacy.section2Content}
            </p>
          </section>

          <section className="privacy-section" style={{ marginBottom: '1.25rem' }}>
            <h3 className="font-marker" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              {t.privacy.section3Title}
            </h3>
            <p className="font-sans" style={{ color: '#4b5563', margin: 0 }}>
              {t.privacy.section3Content}
            </p>
          </section>

          <section className="privacy-section" style={{ marginBottom: '1.25rem' }}>
            <h3 className="font-marker" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              {t.privacy.section4Title}
            </h3>
            <p className="font-sans" style={{ color: '#4b5563', margin: 0 }}>
              {t.privacy.section4Content}
            </p>
          </section>

          <section className="privacy-section">
            <h3 className="font-marker" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              {t.privacy.section5Title}
            </h3>
            <p className="font-sans" style={{ color: '#4b5563', margin: 0 }}>
              {t.privacy.section5Content}
            </p>
          </section>
        </div>

        <div
          className="modal-footer"
          style={{
            padding: '1rem 1.75rem',
            borderTop: '2px dashed var(--line, #dfe6e9)',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'var(--paper, #fdfbf7)',
          }}
        >
          <MarkerButton
            type="button"
            variant="ink"
            rotateDeg={-0.5}
            onClick={onClose}
            className="btn-modal-confirm"
            style={{ padding: '0.5rem 1.5rem', fontSize: '1.05rem' }}
          >
            {t.privacy.confirmButton}
          </MarkerButton>
        </div>
      </div>
    </div>
  );
};
