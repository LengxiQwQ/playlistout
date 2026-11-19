import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../i18n';
import { JOURNAL_STYLES, useJournalStyle, type JournalStyleId } from './StyleContext';

export const StyleSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const { styleId, setStyleId } = useJournalStyle();
  const [isOpen, setIsOpen] = useState(false);

  const currentStyle = JOURNAL_STYLES.find((s) => s.id === styleId) ?? JOURNAL_STYLES[0];
  const currentStyleName = t.styles[currentStyle.nameKey];

  const handleSelect = useCallback(
    (id: JournalStyleId) => {
      setStyleId(id);
      setIsOpen(false);
    },
    [setStyleId],
  );

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#stylePicker')) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`font-picker style-picker ${isOpen ? 'open' : ''}`} id="stylePicker">
      <button
        className="font-picker-button style-picker-button"
        id="stylePickerButton"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${t.header.styleButtonText}: ${currentStyleName}`}
        title={`${t.header.styleButtonText}: ${currentStyle.index} · ${currentStyleName}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span
          className="style-picker-dot"
          style={{ backgroundColor: currentStyle.swatches[0] }}
          aria-hidden="true"
        />
        <span id="stylePickerLabel">{t.header.styleButtonText}</span>
        <svg
          className="style-picker-chevron"
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3.5 6L8 10.5L12.5 6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        className="font-picker-menu style-picker-menu"
        id="stylePickerMenu"
        role="listbox"
        aria-label={t.header.styleButtonText}
      >
        <div className="style-picker-header">
          <span className="style-picker-hint">{t.header.stylePickerHint}</span>
        </div>
        <div className="style-picker-list">
          {JOURNAL_STYLES.map((opt) => {
            const isActive = opt.id === styleId;
            const name = t.styles[opt.nameKey];
            const desc = t.styles[opt.descKey];
            return (
              <button
                key={opt.id}
                type="button"
                className={`style-option ${isActive ? 'active' : ''}`}
                role="option"
                aria-selected={isActive}
                data-value={opt.id}
                onClick={() => handleSelect(opt.id)}
              >
                <span className="style-option-index font-mono">{opt.index}</span>
                <span className="style-option-copy">
                  <span className="style-option-name">{name}</span>
                  <span className="style-option-desc">{desc}</span>
                </span>
                <span className="style-option-right">
                  <span className="style-option-swatches" aria-hidden="true">
                    {opt.swatches.map((hex, idx) => (
                      <span key={idx} className="style-swatch-dot" style={{ backgroundColor: hex }} />
                    ))}
                  </span>
                  {isActive && (
                    <span className="style-option-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
