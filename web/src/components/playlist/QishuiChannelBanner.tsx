import React from 'react';
import type { Playlist } from '../../api/types';
import { useTranslation } from '../../i18n';

export interface QishuiChannelBannerProps {
  playlist: Playlist;
  isSwitchingChannel?: boolean;
  onSwitchChannel?: (channel: 'qishui' | 'douyin') => void;
}

export const QishuiChannelBanner: React.FC<QishuiChannelBannerProps> = ({
  playlist,
  isSwitchingChannel,
  onSwitchChannel,
}) => {
  const { t, language } = useTranslation();

  if (
    playlist.platform !== 'qishui' ||
    !playlist.availableChannels ||
    !playlist.availableChannels.includes('douyin')
  ) {
    return null;
  }

  return (
    <div
      className="qishui-channel-banner hand-drawn-border-subtle shadow-cutout-sm"
      data-testid="qishui-channel-banner"
    >
      <div className="qishui-channel-banner-text">
        <span style={{ fontSize: '1.25rem', lineHeight: 1, userSelect: 'none' }} aria-hidden="true">💡</span>
        <div>
          <strong style={{ color: 'var(--ink, #2d3436)', marginRight: '0.35rem' }}>
            {t.result.channelBannerTitle}:
          </strong>
          <span>{t.result.channelBannerTip}</span>
        </div>
      </div>

      <div className="qishui-channel-banner-tabs" role="tablist" aria-label={t.result.channelBannerTitle}>
        <button
          type="button"
          role="tab"
          data-testid="qishui-tab-official"
          aria-selected={playlist.channel !== 'douyin'}
          disabled={isSwitchingChannel}
          onClick={() => playlist.channel === 'douyin' && onSwitchChannel?.('qishui')}
          className={`font-handwriting channel-tab-btn ${playlist.channel !== 'douyin' ? 'is-active' : ''}`}
          title={language === 'zh-CN' ? '切换至汽水音乐官方音源解析（纯净真实歌名）' : 'Switch to Soda Music official catalog (clean song titles)'}
        >
          <span>🎵</span>
          <span>{t.result.channelOfficialTracks}</span>
          {playlist.channel !== 'douyin' && (
            <span style={{ color: '#16a34a', fontSize: '0.75em' }}>●</span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          data-testid="qishui-tab-douyin"
          aria-selected={playlist.channel === 'douyin'}
          disabled={isSwitchingChannel}
          onClick={() => playlist.channel !== 'douyin' && onSwitchChannel?.('douyin')}
          className={`font-handwriting channel-tab-btn ${playlist.channel === 'douyin' ? 'is-active' : ''}`}
          title={language === 'zh-CN' ? '切换至抖音全量原声解析（包含视频原声，约700~800首）' : 'Switch to Douyin full collection (including video soundtracks)'}
        >
          <span>🎬</span>
          <span>{t.result.channelVideoSoundtracks}</span>
          {playlist.channel === 'douyin' && (
            <span style={{ color: '#db2777', fontSize: '0.75em' }}>●</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default QishuiChannelBanner;
