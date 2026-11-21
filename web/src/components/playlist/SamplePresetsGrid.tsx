import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { Sticker } from '../ui/Sticker';

export interface SamplePresetsGridProps {
  onSelectSample: (
    sampleId: string,
    platformHint?: 'qqmusic' | 'netease' | 'kugou' | 'qishui' | 'kuwo' | 'migu' | 'spotify' | 'applemusic' | 'ytmusic',
    modeHint?: 'user' | 'playlist',
  ) => void;
}

const sampleStickerStyle: React.CSSProperties = {
  padding: '0.32rem 0.9rem',
  fontSize: '1.02rem',
  fontWeight: 600,
  color: '#4a3832',
  fontFamily: 'var(--font-handwriting, cursive)',
  cursor: 'pointer',
};

export const SamplePresetsGrid: React.FC<SamplePresetsGridProps> = ({
  onSelectSample,
}) => {
  const { t } = useTranslation();
  const [isSamplesExpanded, setIsSamplesExpanded] = useState<boolean>(false);

  return (
    <div
      className="search-samples-section"
      style={{
        marginTop: '1.25rem',
        paddingTop: '0.85rem',
        borderTop: '2px dashed rgba(90, 74, 66, 0.2)',
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
          background: isSamplesExpanded ? '#ffeef3' : '#fffaf0',
          border: '1.75px dashed rgba(110, 90, 80, 0.45)',
          borderRadius: '20px',
          padding: '0.32rem 1rem',
          fontSize: '1.02rem',
          fontWeight: 600,
          color: '#5a443b',
          boxShadow: '2px 2px 0 rgba(150, 112, 92, 0.14)',
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
          color: '#8a7569',
          fontFamily: 'var(--font-handwriting, cursive)',
        }}
      >
        <Sticker
          type="button"
          color="green"
          rotateDeg={-1}
          onClick={() => onSelectSample('3197635836', 'qqmusic', 'user')}
          className="font-handwriting"
          style={sampleStickerStyle}
        >
          {t.search.sampleQQ}
        </Sticker>
        <Sticker
          type="button"
          color="pink"
          rotateDeg={1}
          onClick={() => onSelectSample('https://163cn.tv/bgx9GaCN', 'netease', 'user')}
          className="font-handwriting"
          style={sampleStickerStyle}
        >
          {t.search.sampleNetease}
        </Sticker>
        <Sticker
          type="button"
          color="lime"
          rotateDeg={-0.5}
          onClick={() => onSelectSample('https://qishui.douyin.com/s/iXHhKHhY/', 'qishui', 'playlist')}
          className="font-handwriting"
          style={sampleStickerStyle}
        >
          {t.search.sampleQishui}
        </Sticker>
        <Sticker
          type="button"
          color="yellow"
          rotateDeg={-0.5}
          onClick={() =>
            onSelectSample(
              'https://m.kuwo.cn/newh5app/playlist_detail/2311665489',
              'kuwo',
              'playlist',
            )
          }
          className="font-handwriting"
          style={sampleStickerStyle}
        >
          {t.search.sampleKuwo}
        </Sticker>
        <Sticker
          type="button"
          color="purple"
          rotateDeg={0.5}
          onClick={() =>
            onSelectSample(
              'https://c.migu.cn/0mp9YM',
              'migu',
              'playlist',
            )
          }
          className="font-handwriting"
          style={sampleStickerStyle}
        >
          {t.search.sampleMigu}
        </Sticker>
        <Sticker
          type="button"
          color="green"
          rotateDeg={-0.5}
          onClick={() => onSelectSample('https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF', 'spotify', 'playlist')}
          className="font-handwriting"
          style={sampleStickerStyle}
        >
          Spotify
        </Sticker>
        <Sticker
          type="button"
          color="red"
          rotateDeg={0.5}
          onClick={() => onSelectSample('https://music.apple.com/us/playlist/pl.f4d106fed2bd41149aaacabb233eb5eb', 'applemusic', 'playlist')}
          className="font-handwriting"
          style={sampleStickerStyle}
        >
          Apple Music
        </Sticker>
        <Sticker
          type="button"
          color="red"
          rotateDeg={-0.5}
          onClick={() => onSelectSample('https://music.youtube.com/playlist?list=RDCLAK5uy_kmPRjFv6wzAssOnan7Deik0vxDdOxWNmQ', 'ytmusic', 'playlist')}
          className="font-handwriting"
          style={sampleStickerStyle}
        >
          YouTube Music
        </Sticker>
        <Sticker
          type="button"
          color="blue"
          rotateDeg={1}
          onClick={() =>
            onSelectSample(
              'https://m.kugou.com/songlist/gcid_3zr52qfrz2z063/?src_cid=3zr52qfrz2z063&uid=1425711902&chl=message&cover=http://imge.kugou.com/stdmusic/20210314/20210314100214878628.jpg&iszlist=1',
              'kugou',
              'playlist',
            )
          }
          className="font-handwriting"
          style={sampleStickerStyle}
        >
          {t.search.sampleKugou}
        </Sticker>
      </div>
    </div>
  );
};

export default SamplePresetsGrid;
