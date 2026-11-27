import React from 'react';

export interface PaperInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const PaperInput: React.FC<PaperInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder,
  className = '',
  style,
  ...props
}) => {
  const hasValue = Boolean(value && String(value).length > 0);

  return (
    <div
      className={`paper-input-container ${className}`.trim()}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        backgroundColor: 'var(--bg-surface)',
        border: '2px solid var(--line-ink)',
        borderRadius: '14px 225px 14px 255px / 255px 14px 225px 14px',
        boxShadow: 'inset 0 2px 4px color-mix(in srgb, var(--shadow-color) 20%, transparent), 2px 3px 0 var(--shadow-color)',
        padding: '0.2rem 0.65rem',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease',
        ...style,
      }}
    >
      <input
        type="text"
        data-clarity-mask="true"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="paper-input-field font-mono"
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          backgroundColor: 'transparent',
          color: 'var(--text)',
          fontSize: '0.925rem',
          padding: '0.65rem 0.5rem',
        }}
        {...props}
      />
      {hasValue && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="ui-hitbox btn-paper-clear font-mono"
          aria-label="Clear input"
        >
          <span className="ui-face btn-paper-clear-face">✕</span>
        </button>
      )}
    </div>
  );
};
