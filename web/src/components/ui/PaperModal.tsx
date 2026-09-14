import React, { useEffect, useRef } from 'react';
import { Tape } from './Tape';

export interface PaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  testId?: string;
}

export const PaperModal: React.FC<PaperModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  testId = 'paper-modal',
}) => {
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
      data-testid={`${testId}-backdrop`}
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
        aria-labelledby="paper-modal-title"
        data-testid={testId}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          backgroundColor: '#ffffff',
          maxWidth: '640px',
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
          <h2 id="paper-modal-title" className="font-marker text-2xl" style={{ margin: 0 }}>
            {title}
          </h2>
          <button
            type="button"
            ref={closeButtonRef}
            className="btn-modal-close font-mono sticker"
            onClick={onClose}
            aria-label="关闭对话框"
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
          }}
        >
          {children}
        </div>

        {footer && (
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
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
