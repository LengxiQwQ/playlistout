import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="container">
      <header>
        <span className="brand-badge">PlaylistOut v0.1.0 (P0 Skeleton)</span>
        <h1>PlaylistOut</h1>
        <p className="tagline">Paste. Parse. Export.</p>
      </header>

      <main>
        <div className="card">
          <div className="input-group">
            <input
              type="text"
              className="input-field"
              placeholder="https://y.qq.com/n/ryqq/playlist/..."
              disabled
            />
            <button className="btn-primary" disabled>
              解析
            </button>
          </div>

          <div className="phase-notice">
            <strong>🚧 Phase 0 基础设施阶段</strong>
            当前仓库已完成 monorepo 与基础设施初始化。QQ 音乐解析 Provider 与网页前端交互将在 Phase 1 ~ Phase 4 陆续实现。
          </div>

          <div className="features-grid">
            <div className="feature-item">
              <h3>🔒 隐私至上</h3>
              <p>不保存歌单历史，不持久化歌曲数据，纯客户端驱动导出。</p>
            </div>
            <div className="feature-item">
              <h3>⚡ 多格式导出</h3>
              <p>支持 TXT、CSV、Excel (.xlsx) 与 JSON 纯前端快速生成。</p>
            </div>
            <div className="feature-item">
              <h3>🎵 QQ 音乐优先</h3>
              <p>MVP 专注 QQ 音乐公开歌单，保留原有 CLI 所有解析逻辑。</p>
            </div>
          </div>
        </div>
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
