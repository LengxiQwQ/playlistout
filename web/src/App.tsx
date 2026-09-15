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
import { DisambiguationModal, DisambiguationItem } from './components/playlist/DisambiguationModal';
import { BinderSpine } from './components/layout/BinderSpine';
import { BackgroundDecorations } from './components/layout/BackgroundDecorations';
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
  const [disambiguationCandidates, setDisambiguationCandidates] = useState<DisambiguationItem[]>([]);
  const [isDisambiguationOpen, setIsDisambiguationOpen] = useState(false);
  const [disambiguationQueryId, setDisambiguationQueryId] = useState('');

  useEffect(() => {
    recordVisit();
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);
  const lastCollectionScrollPosRef = useRef<number | null>(null);

  const scrollToTop = useCallback(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const scrollToElement = useCallback((elementId: string) => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const el = document.getElementById(elementId);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 120);
    }
  }, []);

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
        if (validation.kind === 'user_profile_url') {
          const targetInput = validation.extractedUin || targetUrl;
          const platform = validation.platform === 'netease' ? 'netease' : 'qqmusic';
          const res = await fetchUserPlaylists(targetInput, controller.signal, platform);
          if (requestIdRef.current !== currentRequestId) return;

          if (res.success) {
            setUserPlaylists(res.data);
            setPlaylist(null);
            setViewMode('batch');
            setState('success');
            scrollToElement('user-playlists');
          } else {
            setError(res.error);
            setState('error');
          }
          return;
        }

        // Case B: Short link (e.g. 163cn.tv) -> Try single playlist first, fallback to user profile
        if (validation.kind === 'short_link') {
          const singleRes = await parsePlaylist(targetUrl, controller.signal).catch(() => null);
          if (requestIdRef.current !== currentRequestId) return;

          if (singleRes && singleRes.success && singleRes.data) {
            setPlaylist(singleRes.data);
            setUserPlaylists(null);
            setViewMode('single');
            setState('success');
            scrollToElement('result');
            return;
          }

          // Fallback to user playlists (e.g. user homepage short link)
          const userRes = await fetchUserPlaylists(targetUrl, controller.signal, 'netease').catch(() => null);
          if (requestIdRef.current !== currentRequestId) return;

          if (userRes && userRes.success && userRes.data && userRes.data.playlists.length > 0) {
            setUserPlaylists(userRes.data);
            setPlaylist(null);
            setViewMode('batch');
            setState('success');
            scrollToElement('user-playlists');
            return;
          }

          setError(
            (singleRes && !singleRes.success ? singleRes.error : null) ||
              (userRes && !userRes.success ? userRes.error : null) || {
                code: 'PLAYLIST_NOT_FOUND',
                message: '短链接解析失败或未找到对应歌单/主页，请检查链接后重试。',
              },
          );
          setState('error');
          return;
        }

        // Case C: Explicit single playlist URL -> Parse single playlist directly
        if (validation.kind === 'single_playlist_url') {
          const platform = validation.platform === 'netease' ? 'netease' : 'qqmusic';
          const res = await parsePlaylist(targetUrl, controller.signal, platform);
          if (requestIdRef.current !== currentRequestId) return;

          if (res.success) {
            setPlaylist(res.data);
            setUserPlaylists(null);
            setViewMode('single');
            setState('success');
            scrollToElement('result');
          } else {
            setError(res.error);
            setState('error');
          }
          return;
        }

        // Case C: Numeric input -> Smart 4-way cross-platform & cross-type search
        if (validation.kind === 'numeric') {
          const [qqSingleRes, qqUserRes, neteaseSingleRes, neteaseUserRes] = await Promise.all([
            parsePlaylist(targetUrl, controller.signal, 'qqmusic').catch(() => null),
            fetchUserPlaylists(targetUrl, controller.signal, 'qqmusic').catch(() => null),
            parsePlaylist(targetUrl, controller.signal, 'netease').catch(() => null),
            fetchUserPlaylists(targetUrl, controller.signal, 'netease').catch(() => null),
          ]);

          if (requestIdRef.current !== currentRequestId) return;

          const candidates: DisambiguationItem[] = [];

          if (qqSingleRes && qqSingleRes.success && qqSingleRes.data && qqSingleRes.data.name) {
            candidates.push({
              id: qqSingleRes.data.id || targetUrl,
              platform: 'qqmusic',
              type: 'playlist',
              title: qqSingleRes.data.name,
              subtitle: `创建者: ${qqSingleRes.data.creator || '未知'}`,
              count: qqSingleRes.data.trackCount ?? qqSingleRes.data.tracks?.length ?? 0,
              coverUrl: qqSingleRes.data.coverUrl,
              data: qqSingleRes.data,
            });
          }

          if (qqUserRes && qqUserRes.success && qqUserRes.data && qqUserRes.data.playlists?.length > 0) {
            candidates.push({
              id: qqUserRes.data.userId || targetUrl,
              platform: 'qqmusic',
              type: 'user',
              title: qqUserRes.data.nickname || `QQ 用户 (${targetUrl})`,
              subtitle: `包含 ${qqUserRes.data.total || qqUserRes.data.playlists.length} 个公开歌单`,
              count: qqUserRes.data.total || qqUserRes.data.playlists.length,
              coverUrl: qqUserRes.data.playlists[0]?.coverUrl,
              data: qqUserRes.data,
            });
          }

          if (neteaseSingleRes && neteaseSingleRes.success && neteaseSingleRes.data && neteaseSingleRes.data.name) {
            candidates.push({
              id: neteaseSingleRes.data.id || targetUrl,
              platform: 'netease',
              type: 'playlist',
              title: neteaseSingleRes.data.name,
              subtitle: `创建者: ${neteaseSingleRes.data.creator || '未知'}`,
              count: neteaseSingleRes.data.trackCount ?? neteaseSingleRes.data.tracks?.length ?? 0,
              coverUrl: neteaseSingleRes.data.coverUrl,
              data: neteaseSingleRes.data,
            });
          }

          if (neteaseUserRes && neteaseUserRes.success && neteaseUserRes.data && neteaseUserRes.data.playlists?.length > 0) {
            candidates.push({
              id: neteaseUserRes.data.userId || targetUrl,
              platform: 'netease',
              type: 'user',
              title: neteaseUserRes.data.nickname || `网易云用户 (${targetUrl})`,
              subtitle: `包含 ${neteaseUserRes.data.total || neteaseUserRes.data.playlists.length} 个公开歌单`,
              count: neteaseUserRes.data.total || neteaseUserRes.data.playlists.length,
              coverUrl: neteaseUserRes.data.playlists[0]?.coverUrl,
              data: neteaseUserRes.data,
            });
          }

          if (candidates.length === 0) {
            const anyNetworkError = [qqSingleRes, qqUserRes, neteaseSingleRes, neteaseUserRes].find(
              (r) => r && !r.success && r.error.code === 'NETWORK_ERROR',
            );
            if (anyNetworkError && !anyNetworkError.success) {
              setError(anyNetworkError.error);
            } else {
              setError({
                code: 'PLAYLIST_NOT_FOUND',
                message: `在 QQ 音乐 与 网易云音乐 中均未找到 ID 为 “${targetUrl}” 的歌单或用户公开主页，请检查输入是否正确。`,
              });
            }
            setState('error');
          } else if (candidates.length === 1) {
            // Unambiguous! Directly load matched item
            const only = candidates[0];
            if (only.type === 'playlist') {
              setPlaylist(only.data as Playlist);
              setUserPlaylists(null);
              setViewMode('single');
              setState('success');
              scrollToElement('result');
            } else {
              setUserPlaylists(only.data as UserPlaylistsData);
              setPlaylist(null);
              setViewMode('batch');
              setState('success');
              scrollToElement('user-playlists');
            }
          } else {
            // Ambiguous: 2 or more targets matched across platforms/types
            setDisambiguationCandidates(candidates);
            setDisambiguationQueryId(targetUrl);
            setIsDisambiguationOpen(true);
            setState('idle');
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
    [inputUrl, scrollToElement],
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
    setDisambiguationCandidates([]);
    setIsDisambiguationOpen(false);
    setDisambiguationQueryId('');
    setState('idle');
    lastCollectionScrollPosRef.current = null;
    scrollToTop();
  }, [scrollToTop]);

  const handleSelectDisambiguationPlaylist = useCallback(
    (selectedPlaylist: Playlist) => {
      setIsDisambiguationOpen(false);
      setPlaylist(selectedPlaylist);
      setUserPlaylists(null);
      setViewMode('single');
      setState('success');
      scrollToElement('result');
    },
    [scrollToElement],
  );

  const handleSelectDisambiguationUser = useCallback(
    (selectedUser: UserPlaylistsData) => {
      setIsDisambiguationOpen(false);
      setUserPlaylists(selectedUser);
      setPlaylist(null);
      setViewMode('batch');
      setState('success');
      scrollToElement('user-playlists');
    },
    [scrollToElement],
  );

  const handleQuickSample = useCallback(
    (sampleId: string) => {
      const sampleUrl = `https://y.qq.com/n/ryqq/playlist/${sampleId}`;
      setInputUrl(sampleUrl);
      handleParse(sampleUrl);
    },
    [handleParse],
  );

  const handleReturnToBatch = useCallback(() => {
    if (userPlaylists) {
      setViewMode('batch');
      setState('success');
      // Smoothly preserve/restore scroll offset in the playlist collection without flying to top
      const savedPos = lastCollectionScrollPosRef.current;
      setTimeout(() => {
        if (typeof window !== 'undefined' && savedPos !== null && savedPos > 0 && typeof window.scrollTo === 'function') {
          window.scrollTo({ top: savedPos, behavior: 'smooth' });
        } else if (typeof document !== 'undefined') {
          const el = document.getElementById('user-playlists');
          if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 50);
    }
  }, [userPlaylists]);

  const handleDrilldownToSingle = useCallback(
    async (playlistIdOrUrl: string, platformOverride?: 'qqmusic' | 'netease') => {
      // Abort any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentRequestId = ++requestIdRef.current;

      // 1. Remember user's scroll position in the collection
      if (typeof window !== 'undefined') {
        lastCollectionScrollPosRef.current = window.scrollY;
      }

      // 2. Put playlist identifier into search box & enter loading state
      setInputUrl(playlistIdOrUrl);
      setState('loading');
      setError(null);

      // 3. Smoothly jump to top so the user clearly sees the active parsing state
      scrollToTop();

      try {
        const platform =
          platformOverride || (userPlaylists?.platform === 'netease' ? 'netease' : 'qqmusic');
        const res = await parsePlaylist(playlistIdOrUrl, controller.signal, platform);
        if (requestIdRef.current !== currentRequestId) return;

        if (res.success) {
          setPlaylist(res.data);
          setViewMode('single');
          setState('success');
          // 4. Once parsed successfully, smoothly scroll down to the single playlist card
          scrollToElement('result');
        } else {
          setError(res.error);
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
    [userPlaylists, scrollToTop, scrollToElement],
  );

  useBaselineGrid([state, playlist, userPlaylists]);

  return (
    <>
      {/* Loose-leaf Binder Spine on Left Margin (Desktop only, dynamically adapts to page length) */}
      <BinderSpine dependencies={[state, playlist, userPlaylists]} />
      <div className="journal-margin-line" aria-hidden="true" />

      <div className="journal-container" style={{ position: 'relative' }}>
        <BackgroundDecorations />
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
              <ResultPaper 
                playlist={playlist} 
                onReset={handleReset} 
                onReturnToBatch={userPlaylists ? handleReturnToBatch : undefined}
              />
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

        <DisambiguationModal
          isOpen={isDisambiguationOpen}
          onClose={() => setIsDisambiguationOpen(false)}
          queryId={disambiguationQueryId}
          candidates={disambiguationCandidates}
          onSelectPlaylist={handleSelectDisambiguationPlaylist}
          onSelectUserPlaylists={handleSelectDisambiguationUser}
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
