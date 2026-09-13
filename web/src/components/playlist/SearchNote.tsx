import React from 'react';
import { useTranslation } from '../../i18n';
import { StickyNote } from '../ui/StickyNote';
import { PaperInput } from '../ui/PaperInput';
import { MarkerButton } from '../ui/MarkerButton';
import { Sticker } from '../ui/Sticker';
import { LoadingNote } from './LoadingNote';
import { StatusAlert } from '../StatusAlert';
import type { ApiError } from '../../api/types';
import { getFriendlyErrorMessage } from '../../utils/errors';

export interface SearchNoteProps {
  inputUrl: string;
  onInputChange: (val: string) => void;
  onClear: () => void;
  onParse: () => void;
  isLoading: boolean;
  error: ApiError | null;
  onRetry: () => void;
  onSelectSample: (sampleId: string) => void;
}

export const SearchNote: React.FC<SearchNoteProps> = ({
  inputUrl,
  onInputChange,
  onClear,
  onParse,
  isLoading,
  error,
  onRetry,
  onSelectSample,
}) => {
  const { t, language } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onParse();
    }
  };

  const getErrorMessage = (err: ApiError): string => {
    switch (err.code) {
      case 'INVALID_INPUT':
        return t.errors.invalidInput;
      case 'UNSUPPORTED_URL':
        return t.errors.unsupportedUrl;
      case 'PLAYLIST_NOT_FOUND':
        return t.errors.playlistNotFound;
      case 'INCOMPLETE_PLAYLIST':
        return t.errors.incompletePlaylist;
      case 'UPSTREAM_TIMEOUT':
        return t.errors.upstreamTimeout;
      case 'UPSTREAM_ERROR':
        return t.errors.upstreamError;
      case 'RATE_LIMITED':
        return t.errors.rateLimited;
      case 'NETWORK_ERROR':
        return t.errors.networkError;
      case 'INTERNAL_ERROR':
        return t.errors.internalError;
      default:
        return language === 'zh-CN'
          ? getFriendlyErrorMessage(err.code, err.message)
          : err.message || t.errors.genericError;
    }
  };

  return (
    <section
      className="search-note-section"
      style={{
        maxWidth: 'var(--search-note-width, 820px)',
        margin: '1.5rem auto 0',
        position: 'relative',
      }}
    >
      {/* Yellow Sparkle on top right */}
      <div
        style={{
          position: 'absolute',
          right: '-1.5rem',
          top: '-2rem',
          color: '#eab308',
          fontSize: '2.5rem',
          transform: 'rotate(12deg)',
          userSelect: 'none',
          zIndex: 25,
        }}
        aria-hidden="true"
      >
        ✦
      </div>

      <StickyNote color="yellow" rotateDeg={0.35} showTapes={true} style={{ padding: '1.75rem 2rem' }}>
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              marginBottom: '0.6rem',
            }}
          >
            <div
              className="font-handwriting"
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--ink, #2d3436)',
              }}
            >
              {t.search.inputLabel}
            </div>
            <span
              className="brand-badge sticker font-mono"
              style={{
                backgroundColor: '#eff6ff',
                fontSize: '0.75rem',
                padding: '0.2rem 0.6rem',
                transform: 'rotate(1deg)',
                color: '#1d4ed8',
              }}
            >
              {t.search.badge}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.85rem',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: '1 1 300px' }}>
                <PaperInput
                  value={inputUrl}
                  onChange={(e) => onInputChange(e.target.value)}
                  onClear={onClear}
                  placeholder={t.search.placeholder}
                  aria-label={t.search.placeholder}
                />
              </div>

              <MarkerButton
                type="submit"
                variant="ink"
                rotateDeg={-1}
                disabled={!inputUrl.trim()}
                aria-label={t.search.parseButton}
                style={{ flexShrink: 0 }}
              >
                {isLoading ? t.search.parsingButton : t.search.parseButton}
              </MarkerButton>
            </div>
          </div>
        </form>

        {/* Quick Samples */}
        <div
          className="search-sample-row font-handwriting"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '1rem',
            fontSize: '1.15rem',
            color: '#636e72',
          }}
        >
          <span style={{ fontWeight: 600 }}>{t.search.quickSamplesLabel}</span>
          <Sticker
            type="button"
            color="white"
            rotateDeg={-1}
            onClick={() => onSelectSample('9044196528')}
            style={{ padding: '0.2rem 0.6rem', fontSize: '1rem' }}
          >
            {t.search.sampleFolk}
          </Sticker>
          <Sticker
            type="button"
            color="white"
            rotateDeg={1}
            onClick={() => onSelectSample('8079931214')}
            style={{ padding: '0.2rem 0.6rem', fontSize: '1rem' }}
          >
            {t.search.sampleJay}
          </Sticker>
          <Sticker
            type="button"
            color="white"
            rotateDeg={-0.5}
            onClick={() => onSelectSample('7684752768')}
            style={{ padding: '0.2rem 0.6rem', fontSize: '1rem' }}
          >
            {t.search.sampleJpKr}
          </Sticker>
        </div>

        {/* Loading Feedback */}
        {isLoading && <LoadingNote />}

        {/* Error Feedback */}
        {error && !isLoading && (
          <StatusAlert
            type="error"
            title={t.errors.oopsTitle}
            message={getErrorMessage(error)}
            code={error.code}
            onRetry={onRetry}
            retryLabel={t.errors.retry}
          />
        )}

        {/* Platform Indicator */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '2px dashed rgba(45, 52, 54, 0.2)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div
            className="font-handwriting"
            style={{ fontSize: '1.2rem', color: '#636e72' }}
          >
            {t.search.worksWith}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sticker
              color="red"
              rotateDeg={-2}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '1rem',
                fontFamily: 'var(--font-handwriting, cursive)',
                fontWeight: 700,
              }}
              title={t.search.platformQQDesc}
            >
              ✓ {t.search.platformQQ}
            </Sticker>
            <span
              className="font-note"
              style={{
                fontSize: '1.25rem',
                color: '#8a8f92',
                transform: 'rotate(1deg)',
              }}
            >
              {t.search.moreSoon}
            </span>
          </div>
        </div>
      </StickyNote>
    </section>
  );
};
