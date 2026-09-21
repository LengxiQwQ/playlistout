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
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderBottom: '2px dashed #636e72',
        borderRadius: '4px 4px 0 0',
        padding: '0.25rem 0.5rem',
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
          color: 'var(--ink, #2d3436)',
          fontSize: '0.925rem',
          padding: '0.65rem 0.5rem',
        }}
        {...props}
      />
      {hasValue && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="btn-paper-clear font-mono"
          aria-label="Clear input"
        >
          ✕
        </button>
      )}
    </div>
  );
};
