import React, { useState, useRef, useEffect } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  indexText?: string;
  sampleText?: string;
  sampleFontFamily?: string;
}

export interface PaperDropdownProps {
  caption?: string;
  buttonLabel: string;
  options: DropdownOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  menuHint?: string;
  menuWidth?: string;
  ariaLabel?: string;
  className?: string;
}

export const PaperDropdown: React.FC<PaperDropdownProps> = ({
  caption,
  buttonLabel,
  options,
  selectedValue,
  onSelect,
  menuHint,
  menuWidth = '315px',
  ariaLabel,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
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
    <div
      ref={dropdownRef}
      className={`font-picker ${isOpen ? 'open' : ''} ${className}`.trim()}
      style={{ position: 'relative', zIndex: 70 }}
    >
      {caption && <span className="font-picker-caption">{caption}</span>}
      <button
        ref={buttonRef}
        type="button"
        className="font-picker-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || caption || buttonLabel}
      >
        <span>{buttonLabel}</span>
        <span className="paper-caret" style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}>
          ⌄
        </span>
      </button>

      <div
        className="font-picker-menu"
        style={{ width: menuWidth }}
        role="listbox"
        aria-label={ariaLabel || caption}
      >
        {menuHint && <div className="font-picker-hint">{menuHint}</div>}
        {options.map((opt) => {
          const isActive = opt.value === selectedValue;
          return (
            <button
              key={opt.value}
              type="button"
              className={`font-option ${isActive ? 'active' : ''}`}
              role="option"
              aria-selected={isActive}
              onClick={() => {
                onSelect(opt.value);
                setIsOpen(false);
                buttonRef.current?.focus();
              }}
            >
              {opt.indexText && <span className="font-option-index">{opt.indexText}</span>}
              <span className="font-option-name">{opt.label}</span>
              {opt.sampleText && (
                <span
                  className="font-option-sample"
                  style={opt.sampleFontFamily ? { fontFamily: opt.sampleFontFamily } : undefined}
                >
                  {opt.sampleText}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
