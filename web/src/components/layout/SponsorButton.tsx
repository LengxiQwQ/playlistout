import React, { useState, useRef, useEffect } from 'react';

const GitHubIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const AfdianIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9 14.234a.567.567 0 1 0 0 1.134a.567.567 0 0 0 0-1.134m5.351 1.705a.567.567 0 1 0 0 1.135a.567.567 0 0 0 0-1.135m8.401 1.436c-.189.095-.461.1-.713.013c-.169-.06-.352-.116-.534-.172c-.339-.104-.904-.276-1.011-.407a.533.533 0 1 0-.853.643c.059.08.139.146.22.209c-.816 1.131-4.398 3.382-9.464 2.273c-2.283-.5-3.819-1.413-4.444-2.639c-.451-.885-.348-1.797-.133-2.293c.62-1.29 5.097-4.261 7.955-5.943a.537.537 0 0 0 .188-.733c-.149-.254-.49-.356-.73-.189c-.231.135-1.015.601-2.015 1.236c-.338-.227-.923-.508-1.86-.6c-1.486-.148-4.92-.805-6.029-1.275C2.535 7.162.731 6.27 1.131 5.267c.092-.234.527-.613 1.47-.974a8.5 8.5 0 0 1 1.995-.492l-.212.103c-.642.312-1.343.662-1.813 1.075c-.034-.022-.07-.044-.094-.069a.527.527 0 0 0-.754-.017a.533.533 0 0 0-.017.756c.19.2.471.35.829.465l.039.014c1.245.383 3.458.336 6.578.211c1.345-.052 2.615-.102 3.674-.082c3.512.07 6.152 1.469 8.07 4.279c1.178 1.725.753 3.426.079 4.903a1.4 1.4 0 0 1-.231-.222a.54.54 0 0 0-.75-.085a.535.535 0 0 0-.086.751c.109.137.665.778 1.355.724l.037-.002c.021-.003.042.001.064-.003c.472-.086.768-.063 1.045.111c.367.232.547.37.511.485c-.021.073-.076.125-.168.177M8.19 11.418l-.315.231a1.6 1.6 0 0 1-.243-.32c.123-.038.33.007.558.089m14.733 4.356a1.9 1.9 0 0 0-.81-.27c.632-1.544 1.034-3.565-.336-5.572c-2.096-3.072-5.101-4.668-8.93-4.744c-1.091-.022-2.377.029-3.737.083c-1.58.063-3.683.145-5.112.027c.285-.155.588-.304.851-.431c1.006-.49 1.797-.872 1.535-1.548c-.137-.396-.547-.603-1.219-.618C3.748 2.669.688 3.489.138 4.872c-.31.779-.361 2.282 2.775 3.61c1.29.548 4.934 1.216 6.341 1.355c.397.039.701.119.931.205a75 75 0 0 0-.986.664c-.577-.329-1.521-.718-2.226-.237a.94.94 0 0 0-.435.768c-.01.385.224.763.486 1.066c-1.038.83-1.877 1.634-2.175 2.253c-.332.762-.467 2.008.153 3.224c.786 1.544 2.524 2.62 5.166 3.199c3.454.755 6.437.075 8.411-.966c1.099-.579 1.878-1.27 2.257-1.887l.356.113c.169.051.338.103.496.159c.522.181 1.1.157 1.545-.068l.025-.013c.336-.177.577-.46.683-.803c.285-.922-.528-1.432-1.018-1.74" />
  </svg>
);

const WeChatIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#07c160" aria-hidden="true">
    <path d="M8.5 3C4.36 3 1 5.91 1 9.5c0 2.04 1.09 3.87 2.79 5.09L3 18l3.69-1.47C7.38 16.8 8.18 17 9 17c.21 0 .42-.01.62-.03-.27-.61-.42-1.28-.42-1.97 0-3.31 3.13-6 7-6 .48 0 .94.04 1.39.13C17.07 5.75 13.16 3 8.5 3zM6 7.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5.2 3.5c-3.42 0-6.2 2.24-6.2 5s2.78 5 6.2 5c.65 0 1.28-.09 1.86-.25L21 22l-.7-2.11C21.46 18.96 22 17.56 22 16c0-2.76-2.78-5-6.2-5zm-2.2 3.5a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zm4 0a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6z" />
  </svg>
);

const HeartIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = '#e11d48' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1" aria-hidden="true">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

export const SponsorButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click and Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="sponsor-container"
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Sponsor developer / 赞助作者"
        className="sticker font-handwriting footer-pill-link"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          backgroundColor: isOpen ? 'var(--highlight-yellow, #ffeaa7)' : '#ffffff',
          padding: '0.35rem 0.85rem',
          fontSize: '1.05rem',
          fontWeight: 600,
          color: 'var(--ink, #2d3436)',
          borderRadius: '6px',
          cursor: 'pointer',
          lineHeight: 1.2,
          transition: 'all 0.15s ease',
        }}
      >
        <HeartIcon size={14} color="#e11d48" />
        <span>Sponsor</span>
        <span
          style={{
            fontSize: '0.65rem',
            marginLeft: '0.1rem',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        >
          ▲
        </span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Sponsor options"
          className="sponsor-dropup-menu shadow-cutout"
        >
          <div
            className="font-marker"
            style={{
              fontSize: '1.25rem',
              color: 'var(--ink, #2d3436)',
              marginBottom: '0.2rem',
              lineHeight: 1.2,
            }}
          >
            Sponsor & Support
          </div>

          <p
            className="font-handwriting"
            style={{
              fontSize: '1rem',
              color: '#636e72',
              margin: '0 0 0.85rem 0',
              lineHeight: 1.3,
            }}
          >
            Support ongoing development & hosting
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.85rem' }}>
            {/* GitHub Sponsors */}
            <a
              href="https://github.com/sponsors/LengxiQwQ"
              target="_blank"
              rel="noopener noreferrer"
              className="sponsor-action-btn font-handwriting"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.45rem 0.85rem',
                backgroundColor: '#24292f',
                color: '#ffffff',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '1.05rem',
                fontWeight: 600,
                lineHeight: 1.2,
                boxShadow: '2px 2px 0 var(--ink, #2d3436)',
                border: '1.5px solid var(--ink, #2d3436)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <GitHubIcon size={16} />
              <span>GitHub Sponsors</span>
              <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>↗</span>
            </a>

            {/* 爱发电 (Afdian) */}
            <a
              href="https://afdian.com/a/lengxiqwq"
              target="_blank"
              rel="noopener noreferrer"
              className="sponsor-action-btn font-handwriting"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.45rem 0.85rem',
                backgroundColor: '#946ce6',
                color: '#ffffff',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '1.05rem',
                fontWeight: 600,
                lineHeight: 1.2,
                boxShadow: '2px 2px 0 var(--ink, #2d3436)',
                border: '1.5px solid #7c4dff',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <AfdianIcon size={16} />
              <span>爱发电 (Afdian)</span>
              <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>↗</span>
            </a>
          </div>

          {/* 微信赞赏码 */}
          <div
            style={{
              paddingTop: '0.75rem',
              borderTop: '1px dashed rgba(45, 52, 54, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--ink, #2d3436)',
                fontFamily: 'var(--font-sans, sans-serif)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginBottom: '0.45rem',
              }}
            >
              <WeChatIcon size={16} />
              <span>微信赞赏码</span>
            </div>

            <div
              style={{
                display: 'inline-block',
                padding: '4px',
                backgroundColor: '#ffffff',
                border: '2px solid var(--ink, #2d3436)',
                borderRadius: '8px',
                boxShadow: '3px 3px 0 rgba(45, 52, 54, 0.15)',
              }}
            >
              <img
                src="/sponsor/wechat-sponsor.jpg"
                alt="WeChat Sponsor QR Code / 微信赞赏码"
                style={{
                  width: '160px',
                  height: '160px',
                  display: 'block',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div
              style={{
                fontSize: '0.75rem',
                color: '#8a8f92',
                marginTop: '0.35rem',
                fontFamily: 'var(--font-sans, sans-serif)',
              }}
            >
              微信扫一扫 · 赞赏支持
            </div>
          </div>
        </div>
      )}
    </div>
  );
};