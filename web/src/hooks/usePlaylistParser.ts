import { useState, useRef, useCallback } from 'react';
import type { Playlist, UserPlaylistsData, ApiError } from '../api/types';
import { parsePlaylist, fetchUserPlaylists, submitFeedback } from '../api/client';
import { validatePlaylistInput } from '../utils/validation';
import { clearKugouAuth, getKugouAuth } from '../utils/kugouAuth';
import { trackClarityEvent, setClarityTag, classifyPlaylistSize } from '../analytics/clarity';
import type { DisambiguationItem } from '../components/playlist/DisambiguationModal';

export type AppState = 'idle' | 'loading' | 'success' | 'error';

export interface UsePlaylistParserOptions {
  scrollToTop: () => void;
  scrollToElement: (id: string) => void;
  setCachedChannel: (playlist: Playlist) => void;
  getCachedChannel?: (playlistId: string, channel: string) => Playlist | undefined;
  setViewMode: (mode: 'single' | 'batch') => void;
  openDisambiguation: (candidates: DisambiguationItem[], queryId: string) => void;
  closeDisambiguation: () => void;
  resetDisambiguation: () => void;
  resetViewMode: () => void;
  clearChannelCache: () => void;
  saveScrollPosition?: (pos?: number) => void;
}

export function usePlaylistParser(options: UsePlaylistParserOptions) {
  const {
    scrollToTop,
    scrollToElement,
    setCachedChannel,
    getCachedChannel,
    setViewMode,
    openDisambiguation,
    closeDisambiguation,
    resetDisambiguation,
    resetViewMode,
    clearChannelCache,
    saveScrollPosition,
  } = options;

  const [inputUrl, setInputUrl] = useState('');
  const [state, setState] = useState<AppState>('idle');
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylistsData | null>(null);
  const [hasCollision, setHasCollision] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  const recordClarityParseSuccess = useCallback((platform?: string, trackCount?: number) => {
    if (platform === 'qqmusic' || platform === 'netease' || platform === 'kugou' || platform === 'qishui') {
      setClarityTag('platform', platform);
    }
    const bucket = classifyPlaylistSize(trackCount);
    if (bucket) {
      setClarityTag('playlist_size_bucket', bucket);
    }
    trackClarityEvent('playlist_parse_success');
  }, []);

  const recordClarityParseFailure = useCallback((platform?: string) => {
    if (platform === 'qqmusic' || platform === 'netease' || platform === 'kugou' || platform === 'qishui') {
      setClarityTag('platform', platform);
    }
    trackClarityEvent('playlist_parse_failure');
  }, []);

  const handleParse = useCallback(
    async (
      urlToParse?: string,
      platformHint?: 'qqmusic' | 'netease' | 'kugou' | 'qishui' | 'kuwo' | 'migu',
      modeHint?: 'user' | 'playlist',
      isSample?: boolean,
      channelHint?: 'qishui' | 'douyin',
      skipScroll?: boolean,
    ) => {
      const rawTarget = (urlToParse !== undefined ? urlToParse : (inputUrl || playlist?.sourceUrl || playlist?.id || '')).trim();

      // 1. Client-side fast validation
      const validation = validatePlaylistInput(rawTarget);
      if (!validation.valid) {
        setState('error');
        setError({
          code: validation.code || 'INVALID_INPUT',
          message: validation.error || '请输入有效的歌单链接、QQ 号或主页链接。',
        });
        recordClarityParseFailure();
        return;
      }

      const targetUrl = validation.cleanedInput || rawTarget;
      if (urlToParse === undefined && targetUrl !== inputUrl) {
        setInputUrl(targetUrl);
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
      setFeedbackSubmitted(false);

      // Smoothly bring user to top so loading animation in SearchNote is visible
      if (!skipScroll && typeof window !== 'undefined' && typeof window.scrollY === 'number' && window.scrollY > 80) {
        scrollToTop();
      }

      try {
        // Fast path for explicit user batch mode
        if (modeHint === 'user') {
          const platform =
            platformHint === 'netease'
              ? 'netease'
              : platformHint === 'kugou'
              ? 'kugou'
              : 'qqmusic';
          if (platform === 'kugou' && !getKugouAuth()) {
            setState('error');
            setError({
              code: 'FORBIDDEN',
              message: '酷狗音乐批量导出需要先扫码连接酷狗账号。请点击下方「立即扫码连接」登录后重试。',
              details: { authRequired: true, platform: 'kugou' },
            });
            recordClarityParseFailure('kugou');
            return;
          }
          const targetInput = validation.extractedUin || targetUrl;
          const res = await fetchUserPlaylists(targetInput, controller.signal, platform);
          if (requestIdRef.current !== currentRequestId) return;

          if (res.success) {
            setUserPlaylists(res.data);
            setPlaylist(null);
            setViewMode('batch');
            setState('success');
            scrollToElement('user-playlists');
            recordClarityParseSuccess(platform);
          } else {
            setError(res.error);
            setState('error');
            recordClarityParseFailure(platform);
          }
          return;
        }

        // Fast path for explicit single playlist mode
        if (modeHint === 'playlist') {
          const platform =
            platformHint === 'netease'
              ? 'netease'
              : platformHint === 'kugou'
              ? 'kugou'
              : platformHint === 'qishui'
              ? 'qishui'
              : platformHint === 'kuwo'
              ? 'kuwo'
              : platformHint === 'migu'
              ? 'migu'
              : platformHint === 'qqmusic'
              ? 'qqmusic'
              : undefined;
          const res = channelHint
            ? await parsePlaylist(targetUrl, controller.signal, platform, undefined, isSample, channelHint)
            : await parsePlaylist(targetUrl, controller.signal, platform, undefined, isSample);
          if (requestIdRef.current !== currentRequestId) return;

          if (res.success) {
            if (res.data.retrieval?.reason === 'auth_invalid') {
              clearKugouAuth();
            }
            setPlaylist(res.data);
            setCachedChannel(res.data);
            setUserPlaylists(null);
            setViewMode('single');
            setState('success');
            if (!skipScroll) {
              scrollToElement('result');
            }
            recordClarityParseSuccess(
              res.data.platform || platform || 'qqmusic',
              res.data.trackCount ?? res.data.tracks?.length,
            );
          } else {
            setError(res.error);
            setState('error');
            recordClarityParseFailure(platform || 'qqmusic');
          }
          return;
        }

        // Case A: User profile URL -> Fetch user playlists directly
        if (validation.kind === 'user_profile_url') {
          const targetInput = validation.extractedUin || targetUrl;
          const platform =
            validation.platform === 'netease'
              ? 'netease'
              : validation.platform === 'kugou'
              ? 'kugou'
              : 'qqmusic';
          if (platform === 'kugou' && !getKugouAuth()) {
            setState('error');
            setError({
              code: 'FORBIDDEN',
              message: '酷狗音乐批量导出需要先扫码连接酷狗账号。请点击下方「立即扫码连接」登录后重试。',
              details: { authRequired: true, platform: 'kugou' },
            });
            recordClarityParseFailure('kugou');
            return;
          }
          const res = await fetchUserPlaylists(targetInput, controller.signal, platform);
          if (requestIdRef.current !== currentRequestId) return;

          if (res.success) {
            setUserPlaylists(res.data);
            setPlaylist(null);
            setViewMode('batch');
            setState('success');
            scrollToElement('user-playlists');
            recordClarityParseSuccess(platform);
          } else {
            setError(res.error);
            setState('error');
            recordClarityParseFailure(platform);
          }
          return;
        }

        // Case B: Short link -> Try single playlist first, fallback to user profile
        if (validation.kind === 'short_link') {
          const platform =
            validation.platform === 'netease'
              ? 'netease'
              : validation.platform === 'kugou'
              ? 'kugou'
              : validation.platform === 'qishui'
              ? 'qishui'
              : validation.platform === 'migu'
              ? 'migu'
              : validation.platform === 'qqmusic'
              ? 'qqmusic'
              : undefined;
          const singleRes = channelHint
            ? await parsePlaylist(targetUrl, controller.signal, platform, undefined, undefined, channelHint).catch(() => null)
            : await parsePlaylist(targetUrl, controller.signal, platform).catch(() => null);
          if (requestIdRef.current !== currentRequestId) return;

          if (singleRes && singleRes.success && singleRes.data) {
            if (singleRes.data.retrieval?.reason === 'auth_invalid') {
              clearKugouAuth();
            }
            setPlaylist(singleRes.data);
            setCachedChannel(singleRes.data);
            setUserPlaylists(null);
            setViewMode('single');
            setState('success');
            if (!skipScroll) {
              scrollToElement('result');
            }
            recordClarityParseSuccess(
              singleRes.data.platform || platform || 'unknown',
              singleRes.data.trackCount ?? singleRes.data.tracks?.length,
            );
            return;
          }

          // Fallback to user playlists (e.g. user homepage short link)
          const userPlatform =
            platform === 'netease' || platform === 'kugou' || platform === 'qqmusic'
              ? platform
              : 'netease';
          const userRes = await fetchUserPlaylists(targetUrl, controller.signal, userPlatform).catch(() => null);
          if (requestIdRef.current !== currentRequestId) return;

          if (userRes && userRes.success && userRes.data && userRes.data.playlists.length > 0) {
            setUserPlaylists(userRes.data);
            setPlaylist(null);
            setViewMode('batch');
            setState('success');
            scrollToElement('user-playlists');
            recordClarityParseSuccess(platform || 'netease');
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
          recordClarityParseFailure(platform || 'unknown');
          return;
        }

        // Case C: Explicit single playlist URL -> Parse single playlist directly
        if (validation.kind === 'single_playlist_url') {
          const platform =
            validation.platform === 'netease'
              ? 'netease'
              : validation.platform === 'kugou'
              ? 'kugou'
              : validation.platform === 'qishui'
              ? 'qishui'
              : validation.platform === 'kuwo'
              ? 'kuwo'
              : validation.platform === 'migu'
              ? 'migu'
              : 'qqmusic';
          const res = channelHint
            ? await parsePlaylist(targetUrl, controller.signal, platform, undefined, undefined, channelHint)
            : await parsePlaylist(targetUrl, controller.signal, platform);
          if (requestIdRef.current !== currentRequestId) return;

          if (res.success) {
            if (res.data.retrieval?.reason === 'auth_invalid') {
              clearKugouAuth();
            }
            setPlaylist(res.data);
            setCachedChannel(res.data);
            setUserPlaylists(null);
            setViewMode('single');
            setState('success');
            if (!skipScroll) {
              scrollToElement('result');
            }
            recordClarityParseSuccess(
              res.data.platform || platform || 'qqmusic',
              res.data.trackCount ?? res.data.tracks?.length,
            );
          } else {
            setError(res.error);
            setState('error');
            recordClarityParseFailure(platform || 'qqmusic');
          }
          return;
        }

        // Case D: Numeric input -> Smart cross-platform & cross-type search
        if (validation.kind === 'numeric') {
          const isLikelyQishui = targetUrl.length >= 19;
          if (isLikelyQishui) {
            const qishuiRes = channelHint
              ? await parsePlaylist(targetUrl, controller.signal, 'qishui', undefined, undefined, channelHint).catch(() => null)
              : await parsePlaylist(targetUrl, controller.signal, 'qishui').catch(() => null);

            if (requestIdRef.current !== currentRequestId) return;

            if (qishuiRes && qishuiRes.success && qishuiRes.data && qishuiRes.data.name) {
              setPlaylist(qishuiRes.data);
              setCachedChannel(qishuiRes.data);
              setUserPlaylists(null);
              setViewMode('single');
              setState('success');
              if (!skipScroll) {
                scrollToElement('result');
              }
              recordClarityParseSuccess('qishui', qishuiRes.data.trackCount ?? qishuiRes.data.tracks?.length);
              return;
            }

            setError({
              code: 'PLAYLIST_NOT_FOUND',
              message: `未找到 ID 为 “${targetUrl}” 的汽水音乐歌单，请检查输入是否正确。`,
            });
            setState('error');
            recordClarityParseFailure('qishui');
            return;
          }

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
            recordClarityParseFailure();
          } else if (candidates.length === 1) {
            // Unambiguous: Directly load matched item
            const only = candidates[0];
            if (only.type === 'playlist') {
              const matchedPlaylist = only.data as Playlist;
              setPlaylist(matchedPlaylist);
              setCachedChannel(matchedPlaylist);
              setUserPlaylists(null);
              setViewMode('single');
              setState('success');
              scrollToElement('result');
              recordClarityParseSuccess(only.platform, only.count);
            } else {
              setUserPlaylists(only.data as UserPlaylistsData);
              setPlaylist(null);
              setViewMode('batch');
              setState('success');
              scrollToElement('user-playlists');
              recordClarityParseSuccess(only.platform);
            }
          } else {
            // Ambiguous: 2 or more targets matched across platforms/types
            openDisambiguation(candidates, targetUrl);
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
          recordClarityParseFailure();
        }
      }
    },
    [
      inputUrl,
      playlist,
      scrollToElement,
      scrollToTop,
      setCachedChannel,
      setViewMode,
      openDisambiguation,
      recordClarityParseSuccess,
      recordClarityParseFailure,
    ],
  );

  const handleReload = useCallback(() => {
    scrollToTop();
    handleParse();
  }, [scrollToTop, handleParse]);

  const handleReset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setInputUrl('');
    setPlaylist(null);
    setUserPlaylists(null);
    clearChannelCache();
    setError(null);
    setHasCollision(false);
    setFeedbackSubmitted(false);
    resetViewMode();
    resetDisambiguation();
    setState('idle');
    scrollToTop();
  }, [scrollToTop, clearChannelCache, resetViewMode, resetDisambiguation]);

  const handleSelectDisambiguationPlaylist = useCallback(
    (selectedPlaylist: Playlist) => {
      closeDisambiguation();
      setPlaylist(selectedPlaylist);
      setUserPlaylists(null);
      setViewMode('single');
      setState('success');
      scrollToElement('result');
      recordClarityParseSuccess(
        selectedPlaylist.platform || 'qqmusic',
        selectedPlaylist.trackCount ?? selectedPlaylist.tracks?.length,
      );
    },
    [closeDisambiguation, setViewMode, scrollToElement, recordClarityParseSuccess],
  );

  const handleSelectDisambiguationUser = useCallback(
    (selectedUser: UserPlaylistsData) => {
      closeDisambiguation();
      setUserPlaylists(selectedUser);
      setPlaylist(null);
      setViewMode('batch');
      setState('success');
      scrollToElement('user-playlists');
      recordClarityParseSuccess(selectedUser.platform || 'qqmusic');
    },
    [closeDisambiguation, setViewMode, scrollToElement, recordClarityParseSuccess],
  );

  const handleQuickSample = useCallback(
    (
      sampleInput: string,
      platformHint?: 'qqmusic' | 'netease' | 'kugou' | 'qishui' | 'kuwo' | 'migu',
      modeHint?: 'user' | 'playlist',
    ) => {
      setInputUrl(sampleInput);
      handleParse(sampleInput, platformHint, modeHint, true);
    },
    [handleParse],
  );

  const handleFeedback = useCallback(async () => {
    if (!error || feedbackSubmitted) return;
    const result = await submitFeedback(inputUrl, error.code);
    if (result.success) {
      setFeedbackSubmitted(true);
    }
  }, [error, feedbackSubmitted, inputUrl]);

  const handleSwitchChannel = useCallback(
    async (targetChannel: 'qishui' | 'douyin') => {
      if (!playlist) return;
      const currentChannel = playlist.channel || 'qishui';
      // If clicking the current channel, it is a re-parse request (bypass cache)
      const isReparse = targetChannel === currentChannel;
      const cached = getCachedChannel?.(playlist.id, targetChannel);

      if (!isReparse && cached) {
        setPlaylist(cached);
        return;
      }

      const targetUrl = playlist.sourceUrl || playlist.id;
      await handleParse(targetUrl, 'qishui', 'playlist', false, targetChannel, true);
    },
    [playlist, getCachedChannel, handleParse],
  );

  const handleViewAllUserPlaylists = useCallback(async () => {
    const auth = getKugouAuth();
    if (!auth) return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    setState('loading');
    setError(null);
    scrollToTop();

    try {
      const res = await fetchUserPlaylists(auth.userid, controller.signal, 'kugou', auth);
      if (requestIdRef.current !== currentRequestId) return;
      if (res.success) {
        setUserPlaylists(res.data);
        setPlaylist(null);
        setViewMode('batch');
        setState('success');
        scrollToElement('user-playlists');
        recordClarityParseSuccess('kugou');
      } else {
        setError(res.error);
        setState('error');
        recordClarityParseFailure('kugou');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (requestIdRef.current === currentRequestId) {
        setError({ code: 'NETWORK_ERROR', message: '网络连接异常，请重试。' });
        setState('error');
      }
    }
  }, [scrollToTop, scrollToElement, setViewMode, recordClarityParseSuccess, recordClarityParseFailure]);

  const handleDrilldownToSingle = useCallback(
    async (playlistIdOrUrl: string, platformOverride?: 'qqmusic' | 'netease' | 'kugou') => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentRequestId = ++requestIdRef.current;

      saveScrollPosition?.();

      setInputUrl(playlistIdOrUrl);
      setState('loading');
      setError(null);

      scrollToTop();

      try {
        const platform =
          platformOverride ||
          (userPlaylists?.platform === 'netease'
            ? 'netease'
            : userPlaylists?.platform === 'kugou'
            ? 'kugou'
            : 'qqmusic');
        const res = await parsePlaylist(playlistIdOrUrl, controller.signal, platform);
        if (requestIdRef.current !== currentRequestId) return;

        if (res.success) {
          setPlaylist(res.data);
          setViewMode('single');
          setState('success');
          scrollToElement('result');
          recordClarityParseSuccess(
            res.data.platform || platform || 'qqmusic',
            res.data.trackCount ?? res.data.tracks?.length,
          );
        } else {
          setError(res.error);
          setState('error');
          recordClarityParseFailure(platform);
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
          recordClarityParseFailure();
        }
      }
    },
    [saveScrollPosition, userPlaylists, scrollToTop, scrollToElement, setViewMode, recordClarityParseSuccess, recordClarityParseFailure],
  );

  return {
    inputUrl,
    setInputUrl,
    state,
    setState,
    playlist,
    setPlaylist,
    userPlaylists,
    setUserPlaylists,
    hasCollision,
    setHasCollision,
    error,
    setError,
    feedbackSubmitted,
    setFeedbackSubmitted,
    abortControllerRef,
    requestIdRef,
    handleParse,
    handleReload,
    handleReset,
    handleQuickSample,
    handleFeedback,
    handleSwitchChannel,
    handleViewAllUserPlaylists,
    handleDrilldownToSingle,
    handleSelectDisambiguationPlaylist,
    handleSelectDisambiguationUser,
    recordClarityParseSuccess,
    recordClarityParseFailure,
  };
}
