import React, { useState, useRef, useCallback } from 'react';
import type { Playlist, ApiError } from './api/types';
import { parsePlaylist } from './api/client';
import { validatePlaylistInput } from './utils/validation';
import { LanguageProvider } from './i18n';
import { Header } from './components/layout/Header';
import { Hero } from './components/layout/Hero';
import { SearchNote } from './components/playlist/SearchNote';
import { ResultPaper } from './components/playlist/ResultPaper';
import { InfoNotes } from './components/layout/InfoNotes';
import { StatsJournal } from './components/stats/StatsJournal';
import { Footer } from './components/layout/Footer';
import { PrivacyModal } from './components/PrivacyModal';

type AppState = 'idle' | 'loading' | 'success' | 'error';

export const AppContent: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [state, setState] = useState<AppState>('idle');
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  const handleParse = useCallback(
    async (urlToParse?: string) => {
      const targetUrl = (urlToParse !== undefined ? urlToParse : inputUrl).trim();

      // 1. Client-side fast validation
      const validation = validatePlaylistInput(targetUrl);
      if (!validation.valid) {
        setState('error');
        setError({
          code: 'INVALID_INPUT',
          message: validation.error || '请输入有效的歌单链接。',
        });
        return;
      }

      // 2. Cancel any pending in-flight request to prevent race conditions
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentRequestId = ++requestIdRef.current;

      setState('loading');
      setError(null);

      try {
        const response = await parsePlaylist(targetUrl, controller.signal);

        // Check if this request is still the most recent one
        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        if (response.success) {
          setPlaylist(response.data);
          setState('success');
        } else {
          setError(response.error);
          setState('error');
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        if (requestIdRef.current === currentRequestId) {
          setError({
            code: 'NETWORK_ERROR',
            message: '网络连接异常，请检查网络连接后重试。',
          });
          setState('error');
        }
      }
    },
    [inputUrl],
  );

  const handleReset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setInputUrl('');
    setPlaylist(null);
    setError(null);
    setState('idle');
  }, []);

  const handleQuickSample = useCallback(
    (sampleId: string) => {
      const sampleUrl = `https://y.qq.com/n/ryqq/playlist/${sampleId}`;
      setInputUrl(sampleUrl);
      handleParse(sampleUrl);
    },
    [handleParse],
  );

  return (
    <>
      {/* Loose-leaf Binder Holes on Left Margin (Desktop only) */}
      <div className="binder-holes" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="binder-hole" />
        ))}
      </div>

      <div className="journal-container">
        <Header onBrandClick={handleReset} />
        <main>
          <Hero />

          {/* Search Note (PERSISTENT across idle, loading, error, and success) */}
          <SearchNote
            inputUrl={inputUrl}
            onInputChange={setInputUrl}
            onClear={() => setInputUrl('')}
            onParse={() => handleParse()}
            isLoading={state === 'loading'}
            error={state === 'error' ? error : null}
            onRetry={() => handleParse()}
            onSelectSample={handleQuickSample}
          />

          {/* Result Paper (Appears immediately below Search when successful) */}
          {state === 'success' && playlist && (
            <ResultPaper playlist={playlist} onReset={handleReset} />
          )}

          {/* Educational Stationery Notes */}
          <InfoNotes onOpenPrivacy={() => setIsPrivacyOpen(true)} />

          {/* Aggregate Public Stats Journal */}
          <StatsJournal />
        </main>

        <Footer onOpenPrivacy={() => setIsPrivacyOpen(true)} />

        <PrivacyModal
          isOpen={isPrivacyOpen}
          onClose={() => setIsPrivacyOpen(false)}
        />
      </div>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider defaultLanguage="zh-CN">
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
