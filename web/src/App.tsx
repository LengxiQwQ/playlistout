import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Playlist, UserPlaylistsData, ApiError } from './api/types';
import { parsePlaylist, fetchUserPlaylists, recordVisit } from './api/client';
import { validatePlaylistInput } from './utils/validation';
import { LanguageProvider } from './i18n';
import { Header } from './components/layout/Header';
import { Hero } from './components/layout/Hero';
import { SearchNote } from './components/playlist/SearchNote';
import { ResultPaper } from './components/playlist/ResultPaper';
import { UserPlaylistsPaper } from './components/playlist/UserPlaylistsPaper';
import { InfoNotes } from './components/layout/InfoNotes';
import { StatsJournal } from './components/stats/StatsJournal';
import { Footer } from './components/layout/Footer';
import { PrivacyModal } from './components/PrivacyModal';
import { BinderSpine } from './components/layout/BinderSpine';
import { useBaselineGrid } from './hooks/useBaselineGrid';

type AppState = 'idle' | 'loading' | 'success' | 'error';
type ViewMode = 'single' | 'batch';

export const AppContent: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [state, setState] = useState<AppState>('idle');
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylistsData | null>(null);
  const [hasCollision, setHasCollision] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  useEffect(() => {
    recordVisit();
  }, []);

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
          code: validation.code || 'INVALID_INPUT',
          message: validation.error || '请输入有效的歌单链接、QQ 号或主页链接。',
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
      setHasCollision(false);

      try {
        // Case A: User profile URL -> Fetch user playlists directly
        if (validation.kind === 'user_profile_url' && validation.extractedUin) {
          const res = await fetchUserPlaylists(validation.extractedUin, controller.signal);
          if (requestIdRef.current !== currentRequestId) return;

          if (res.success) {
            setUserPlaylists(res.data);
            setPlaylist(null);
            setViewMode('batch');
            setState('success');
          } else {
            setError(res.error);
            setState('error');
          }
          return;
        }

        // Case B: Explicit single playlist URL -> Parse single playlist directly
        if (validation.kind === 'single_playlist_url') {
          const res = await parsePlaylist(targetUrl, controller.signal);
          if (requestIdRef.current !== currentRequestId) return;

          if (res.success) {
            setPlaylist(res.data);
            setUserPlaylists(null);
            setViewMode('single');
            setState('success');
          } else {
            setError(res.error);
            setState('error');
          }
          return;
        }

        // Case C: Numeric input -> Smart dual-detection (could be QQ number OR playlist ID)
        if (validation.kind === 'numeric') {
          const [singleRes, userRes] = await Promise.all([
            parsePlaylist(targetUrl, controller.signal).catch(() => null),
            fetchUserPlaylists(targetUrl, controller.signal).catch(() => null),
          ]);

          if (requestIdRef.current !== currentRequestId) return;

          const isSingleOk = singleRes && singleRes.success && singleRes.data;
          const isUserOk = userRes && userRes.success && userRes.data && userRes.data.playlists.length > 0;

          if (isUserOk && isSingleOk) {
            // Collision: both valid! Default to user playlists collection, show banner to switch
            setUserPlaylists(userRes.data);
            setPlaylist(singleRes.data);
            setHasCollision(true);
            setViewMode('batch');
            setState('success');
          } else if (isUserOk) {
            // Matched as QQ number
            setUserPlaylists(userRes.data);
            setPlaylist(null);
            setViewMode('batch');
            setState('success');
          } else if (isSingleOk) {
            // Matched as single playlist ID
            setPlaylist(singleRes.data);
            setUserPlaylists(null);
            setViewMode('single');
            setState('success');
          } else {
            // Both failed: Determine the most sensible error to display
            if (userRes && !userRes.success && userRes.error.code === 'NETWORK_ERROR') {
              setError(userRes.error);
            } else if (singleRes && !singleRes.success && singleRes.error.code === 'NETWORK_ERROR') {
              setError(singleRes.error);
            } else {
              setError({
                code: 'PLAYLIST_NOT_FOUND',
                message: '未找到对应歌单，且该 QQ 号名下未发现公开歌单，请检查输入是否正确。',
              });
            }
            setState('error');
          }
          return;
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
    setUserPlaylists(null);
    setError(null);
    setHasCollision(false);
    setViewMode('single');
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

  const handleDrilldownToSingle = useCallback(
    (playlistId: string) => {
      setInputUrl(playlistId);
      handleParse(playlistId);
    },
    [handleParse],
  );

  useBaselineGrid([state, playlist, userPlaylists]);

  return (
    <>
      {/* Loose-leaf Binder Spine on Left Margin (Desktop only, dynamically adapts to page length) */}
      <BinderSpine dependencies={[state, playlist, userPlaylists]} />
      <div className="journal-margin-line" aria-hidden="true" />

      <div className="journal-container">
        <Header onBrandClick={handleReset} />
        <main>
          <Hero />

          {/* Search Note (PERSISTENT across idle, loading, error, and success) */}
          <div className="baseline-grid-snap">
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
          </div>

          {/* Result Paper (Single Playlist) */}
          {state === 'success' && viewMode === 'single' && playlist && (
            <div className="baseline-grid-snap">
              <ResultPaper playlist={playlist} onReset={handleReset} />
            </div>
          )}

          {/* User Playlists Paper (Batch Collection) */}
          {state === 'success' && viewMode === 'batch' && userPlaylists && (
            <div className="baseline-grid-snap">
              <UserPlaylistsPaper
                userData={userPlaylists}
                onReset={handleReset}
                onSelectSinglePlaylist={handleDrilldownToSingle}
                hasSinglePlaylistCollision={hasCollision}
              />
            </div>
          )}

          {/* Educational Stationery Notes */}
          <div className="baseline-grid-snap">
            <InfoNotes onOpenPrivacy={() => setIsPrivacyOpen(true)} />
          </div>

          {/* Aggregate Public Stats Journal */}
          <div className="baseline-grid-snap">
            <StatsJournal />
          </div>
        </main>

        <div className="baseline-grid-snap">
          <Footer onOpenPrivacy={() => setIsPrivacyOpen(true)} />
        </div>

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
