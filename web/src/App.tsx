import React, { useState, useRef, useCallback } from 'react';
import type { Playlist, ApiError } from './api/types';
import { parsePlaylist } from './api/client';
import { validatePlaylistInput } from './utils/validation';
import { getFriendlyErrorMessage } from './utils/errors';
import { PlaylistSummary } from './components/PlaylistSummary';
import { TrackTable } from './components/TrackTable';
import { StatusAlert } from './components/StatusAlert';
import { ExportToolbar } from './components/ExportToolbar';


type AppState = 'idle' | 'loading' | 'success' | 'error';

export const App: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [state, setState] = useState<AppState>('idle');
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  // Reference to abort in-flight requests and avoid stale responses
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
        // If aborted intentionally by newer request, do nothing
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
    <div className="container">
      <header>
        <div className="brand-badge">QQ 音乐公开歌单解析</div>
        <h1>PlaylistOut</h1>
        <p className="tagline">Paste. Parse. Export.</p>
      </header>

      <main>
        <div className="card main-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleParse();
            }}
            className="input-form"
          >
            <div className="input-group">
              <input
                type="text"
                className="input-field"
                placeholder="粘贴 QQ 音乐公开歌单链接（例如：https://y.qq.com/n/ryqq/playlist/...）或 ID"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                aria-label="QQ 音乐公开歌单链接或 ID"
              />
              {inputUrl && (
                <button
                  type="button"
                  className="btn-clear"
                  onClick={() => setInputUrl('')}
                  aria-label="清空输入框"
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                className="btn-primary"
                disabled={!inputUrl.trim()}
              >
                {state === 'loading' ? '解析中...' : '解析'}
              </button>
            </div>

          </form>

          {/* Quick sample buttons for non-technical exploration */}
          {state === 'idle' && (
            <div className="sample-links">
              <span className="sample-label">快速体验示例：</span>
              <button
                type="button"
                className="btn-sample"
                onClick={() => handleQuickSample('9044196528')}
              >
                民谣流行 (636首)
              </button>
              <button
                type="button"
                className="btn-sample"
                onClick={() => handleQuickSample('8079931214')}
              >
                周杰伦 (172首)
              </button>
              <button
                type="button"
                className="btn-sample"
                onClick={() => handleQuickSample('7684752768')}
              >
                日韩歌曲 (215首)
              </button>
            </div>
          )}

          {/* Loading State */}
          {state === 'loading' && (
            <div className="loading-container" data-testid="loading-indicator">
              <div className="spinner" aria-hidden="true" />
              <p className="loading-text">正在获取并完整解析歌单数据，请稍候...</p>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && error && (
            <StatusAlert
              type="error"
              message={getFriendlyErrorMessage(error.code, error.message)}
              code={error.code}
              onRetry={() => handleParse()}
            />
          )}

          {/* Idle / Educational Feature Highlights */}
          {state === 'idle' && (
            <div className="features-grid">
              <div className="feature-item">
                <h3>🔒 隐私安全</h3>
                <p>不保存您的歌单历史，不持久化歌曲数据，仅做即时格式解析与导出。</p>
              </div>
              <div className="feature-item">
                <h3>⚡ 完整性保障</h3>
                <p>支持多页（上千首）歌单自动翻页，数据缺失自动防错，确保条目不遗漏。</p>
              </div>
              <div className="feature-item">
                <h3>🎵 本地安全导出</h3>
                <p>支持导出 TXT、CSV、Excel (.xlsx) 与 JSON 格式，完全在浏览器本地生成。</p>
              </div>
            </div>
          )}
        </div>

        {/* Success State: Playlist Preview, Export Toolbar & Tracks Table */}
        {state === 'success' && playlist && (
          <div className="results-container">
            <PlaylistSummary playlist={playlist} onReset={handleReset} />
            <ExportToolbar playlist={playlist} />
            <TrackTable tracks={playlist.tracks} />
          </div>
        )}
      </main>


      <footer>
        <p>
          PlaylistOut &copy; {new Date().getFullYear()} &middot;{' '}
          <a href="https://github.com/LengxiQwQ/playlistout" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>{' '}
          &middot;{' '}
          <a href="https://playlistout.com" target="_blank" rel="noopener noreferrer">
            playlistout.com
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App;
