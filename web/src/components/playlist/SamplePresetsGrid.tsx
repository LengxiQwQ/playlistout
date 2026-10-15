import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { Sticker } from '../ui/Sticker';

export interface SamplePresetsGridProps {
  onSelectSample: (
    sampleId: string,
    platformHint?: 'qqmusic' | 'netease' | 'kugou' | 'qishui' | 'kuwo',
    modeHint?: 'user' | 'playlist',
  ) => void;
  hasKugouAuth?: boolean;
  onRequireKugouLogin?: () => void;
}

export const SamplePresetsGrid: React.FC<SamplePresetsGridProps> = ({
  onSelectSample,
  hasKugouAuth = false,
  onRequireKugouLogin,
}) => {
  const { t, language } = useTranslation();
  const [isSamplesExpanded, setIsSamplesExpanded] = useState<boolean>(false);

  return (
    <div
      className="search-samples-section"
      style={{
        marginTop: '1.25rem',
        paddingTop: '0.85rem',
        borderTop: '2px dashed rgba(45, 52, 54, 0.2)',
      }}
    >
      <button
        type="button"
        onClick={() => setIsSamplesExpanded((prev) => !prev)}
        aria-expanded={isSamplesExpanded}
        className="quick-samples-toggle font-handwriting"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          background: isSamplesExpanded ? 'rgba(45, 52, 54, 0.08)' : 'transparent',
          border: '1.5px dashed rgba(45, 52, 54, 0.35)',
          borderRadius: '20px',
          padding: '0.25rem 0.85rem',
          fontSize: '1rem',
          fontWeight: 600,
          color: '#636e72',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: 'var(--font-handwriting, cursive)',
        }}
      >
        <span style={{ fontSize: '1rem' }}>✨</span>
        <span>{t.search.quickSamplesLabel.replace(/[:：]$/, '')}</span>
        <span
          style={{
            display: 'inline-block',
            transform: isSamplesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            fontSize: '0.75rem',
            marginLeft: '0.15rem',
          }}
        >
          ▼
        </span>
      </button>

      <div
        className="search-sample-row font-handwriting"
        style={{
          display: isSamplesExpanded ? 'flex' : 'none',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '1rem',
          marginTop: '0.85rem',
          fontSize: '1.1rem',
          color: '#636e72',
          fontFamily: 'var(--font-handwriting, cursive)',
        }}
      >
        <Sticker
          type="button"
          color="white"
          rotateDeg={-1}
          onClick={() => onSelectSample('3197635836', 'qqmusic', 'user')}
          className="font-handwriting"
          style={{
            padding: '0.35rem 0.9rem',
            fontSize: '1.05rem',
            fontWeight: 600,
            fontFamily: 'var(--font-handwriting, cursive)',
            cursor: 'pointer',
          }}
        >
          {t.search.sampleQQ}
        </Sticker>
        <Sticker
          type="button"
          color="white"
          rotateDeg={1}
          onClick={() => onSelectSample('https://163cn.tv/bgx9GaCN', 'netease', 'user')}
          className="font-handwriting"
          style={{
            padding: '0.35rem 0.9rem',
            fontSize: '1.05rem',
            fontWeight: 600,
            fontFamily: 'var(--font-handwriting, cursive)',
            cursor: 'pointer',
          }}
        >
          {t.search.sampleNetease}
        </Sticker>
        <Sticker
          type="button"
          color="white"
          rotateDeg={-0.5}
          onClick={() => onSelectSample('https://qishui.douyin.com/s/iXHhKHhY/', 'qishui', 'playlist')}
          className="font-handwriting"
          style={{
            padding: '0.35rem 0.9rem',
            fontSize: '1.05rem',
            fontWeight: 600,
            fontFamily: 'var(--font-handwriting, cursive)',
            cursor: 'pointer',
          }}
        >
          {t.search.sampleQishui}
        </Sticker>
        <Sticker
          type="button"
          color="white"
          rotateDeg={-0.5}
          onClick={() =>
            onSelectSample(
              'https://m.kuwo.cn/newh5app/playlist_detail/2311665489',
              'kuwo',
              'playlist',
            )
          }
          className="font-handwriting"
          style={{
            padding: '0.35rem 0.9rem',
            fontSize: '1.05rem',
            fontWeight: 600,
            fontFamily: 'var(--font-handwriting, cursive)',
            cursor: 'pointer',
          }}
        >
          {t.search.sampleKuwo}
        </Sticker>
        <Sticker
          type="button"
          color="white"
          rotateDeg={1}
          onClick={() =>
            onSelectSample(
              'https://m.kugou.com/songlist/gcid_3zr52qfrz2z063/?src_cid=3zr52qfrz2z063&uid=1425711902&chl=message&cover=http://imge.kugou.com/stdmusic/20210314/20210314100214878628.jpg&iszlist=1',
              'kugou',
              'playlist',
            )
          }
          className="font-handwriting"
          style={{
            padding: '0.35rem 0.9rem',
            fontSize: '1.05rem',
            fontWeight: 600,
            fontFamily: 'var(--font-handwriting, cursive)',
            cursor: 'pointer',
          }}
        >
          {t.search.sampleKugou}
        </Sticker>
        <Sticker
          type="button"
          color="white"
          rotateDeg={-1}
          onClick={() => {
            onSelectSample('https://m.kugou.com/user?uid=1425711902', 'kugou', 'user');
            if (!hasKugouAuth && onRequireKugouLogin) {
              onRequireKugouLogin();
            }
          }}
          className="font-handwriting"
          style={{
            padding: '0.35rem 0.9rem',
            fontSize: '1.05rem',
            fontWeight: 600,
            fontFamily: 'var(--font-handwriting, cursive)',
            cursor: 'pointer',
          }}
          title={!hasKugouAuth ? (language === 'zh-CN' ? '需先扫码连接酷狗账号' : 'Requires KuGou sign-in') : undefined}
        >
          {t.search.sampleKugouBatch}
        </Sticker>
      </div>
    </div>
  );
};

export default SamplePresetsGrid;
