import React, { useState } from 'react';

export interface TrackArtworkProps {
  coverUrl?: string;
  title: string;
  size?: number;
}

export const TrackArtwork: React.FC<TrackArtworkProps> = ({
  coverUrl,
  title,
  size = 40,
}) => {
  const [hasError, setHasError] = useState(false);

  const showPlaceholder = !coverUrl || hasError;

  if (showPlaceholder) {
    return (
      <div
        className="track-artwork-placeholder track-artwork-thumb"
        aria-label={title ? `${title} cover placeholder` : 'Album artwork placeholder'}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          borderRadius: '4px',
          border: '1.5px solid var(--ink, #2d3436)',
          backgroundColor: '#f1f5f9',
          display: 'grid',
          placeItems: 'center',
          fontSize: `${Math.round(size * 0.45)}px`,
          color: 'var(--ink-light, #636e72)',
          userSelect: 'none',
          boxShadow: '1.5px 1.5px 0 var(--ink, #2d3436)',
        }}
      >
        <span aria-hidden="true">💿</span>
      </div>
    );
  }

  return (
    <img
      className="track-artwork-thumb"
      src={coverUrl}
      alt={title ? `${title} cover` : 'Album artwork'}
      loading="lazy"
      onError={() => setHasError(true)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        borderRadius: '4px',
        border: '1.5px solid var(--ink, #2d3436)',
        objectFit: 'cover',
        boxShadow: '1.5px 1.5px 0 var(--ink, #2d3436)',
        display: 'block',
      }}
    />
  );
};
