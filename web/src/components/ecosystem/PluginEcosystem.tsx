import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../i18n';
import { copyToClipboard } from '../../utils/clipboard';
import {
  MUSICFREE_PLUGIN_URL,
  OPEN_SOURCE_INTEGRATIONS,
  SUPPORTED_INTEGRATION_COUNT,
  type IntegrationStatus,
} from '../../data/integrations';
import { Paper } from '../ui/Paper';
import { Sticker } from '../ui/Sticker';
import { MarkerButton } from '../ui/MarkerButton';

const statusColor: Record<IntegrationStatus, 'green' | 'yellow' | 'blue'> = {
  available: 'green',
  proposed: 'yellow',
  planned: 'blue',
};

export const PluginEcosystem: React.FC = () => {
  const { t, format } = useTranslation();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const resetTimerRef = useRef<number | null>(null);

  const musicFree = OPEN_SOURCE_INTEGRATIONS.find((item) => item.id === 'musicfree');
  const upcoming = OPEN_SOURCE_INTEGRATIONS.filter((item) => item.status !== 'available');

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const getStatusLabel = (status: IntegrationStatus) => {
    if (status === 'available') return t.ecosystem.statusAvailable;
    if (status === 'proposed') return t.ecosystem.statusProposed;
    return t.ecosystem.statusPlanned;
  };

  const handleCopyPluginUrl = async () => {
    const ok = await copyToClipboard(MUSICFREE_PLUGIN_URL);
    setCopyState(ok ? 'copied' : 'failed');

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => setCopyState('idle'), 2600);
  };

  const platformLabels = [
    t.search.platformQQ,
    t.search.platformNetease,
    t.search.platformKugou,
    t.search.platformQishui,
  ];

  return (
    <Paper
      as="section"
      id="ecosystem"
      aria-labelledby="ecosystem-title"
      color="white"
      borderVariant="default"
      shadow="paper"
      rotateDeg={0.2}
      interactive={false}
      className="plugin-ecosystem-panel"
    >
      <Sticker
        as="span"
        color="yellow"
        rotateDeg={-2}
        className="font-note plugin-ecosystem-kicker"
      >
        OPEN SOURCE ♪
      </Sticker>

      <header className="plugin-ecosystem-header">
        <div className="font-note plugin-ecosystem-eyebrow">{t.ecosystem.eyebrow}</div>
        <h2 id="ecosystem-title" className="font-marker plugin-ecosystem-title">
          {t.ecosystem.title}
        </h2>
        <p className="font-handwriting plugin-ecosystem-subtitle">
          {t.ecosystem.subtitle}
        </p>
      </header>

      <div className="plugin-ecosystem-overview">
        <div className="plugin-ecosystem-count-note">
          <span className="font-marker plugin-ecosystem-count">
            {SUPPORTED_INTEGRATION_COUNT}
          </span>
          <div>
            <div className="font-handwriting plugin-ecosystem-count-label">
              {format(t.ecosystem.supportedCount, { count: SUPPORTED_INTEGRATION_COUNT })}
            </div>
            <div className="font-note plugin-ecosystem-count-caption">
              {t.ecosystem.supportedCaption}
            </div>
          </div>
        </div>

        <div className="font-note plugin-ecosystem-flow" aria-label={t.ecosystem.flowAria}>
          <span className="plugin-flow-node">PlaylistOut</span>
          <span className="plugin-flow-arrow" aria-hidden="true">~~~→</span>
          <span className="plugin-flow-node">{musicFree?.name || 'MusicFree'}</span>
        </div>
      </div>

      <Paper
        color="blue"
        borderVariant="alt"
        shadow="paper-sm"
        rotateDeg={-0.45}
        tiltFactor={0.25}
        className="plugin-feature-card"
      >
        <div className="plugin-feature-top">
          <div className="plugin-app-identity">
            <div className="plugin-app-mark font-marker" aria-hidden="true">MF</div>
            <div>
              <div className="plugin-app-title-row">
                <h3 className="font-marker plugin-app-title">MusicFree</h3>
                <Sticker
                  as="span"
                  color="green"
                  rotateDeg={1}
                  className="font-handwriting plugin-status-sticker"
                >
                  ✓ {t.ecosystem.statusAvailable}
                </Sticker>
              </div>
              <div className="font-note plugin-app-meta">
                {t.ecosystem.officialPlugin}
                {musicFree?.version ? ' · v' + musicFree.version : ''}
              </div>
            </div>
          </div>
        </div>

        <p className="font-handwriting plugin-feature-description">
          {t.ecosystem.musicFreeDescription}
        </p>

        <div className="plugin-platform-row" aria-label={t.ecosystem.platformsLabel}>
          {platformLabels.map((label, index) => (
            <Sticker
              key={label}
              as="span"
              color={index === 0 ? 'green' : index === 1 ? 'red' : index === 2 ? 'blue' : 'lime'}
              rotateDeg={index % 2 === 0 ? -0.6 : 0.6}
              className="font-handwriting plugin-platform-sticker"
            >
              {label}
            </Sticker>
          ))}
        </div>

        <div className="plugin-feature-actions">
          <MarkerButton
            type="button"
            variant="ink"
            rotateDeg={-0.4}
            onClick={handleCopyPluginUrl}
            className="plugin-copy-button"
          >
            {copyState === 'copied'
              ? t.ecosystem.copiedInstallUrl
              : copyState === 'failed'
                ? t.ecosystem.copyFailed
                : t.ecosystem.copyInstallUrl}
          </MarkerButton>

          <Sticker
            as="a"
            href={musicFree?.guideUrl || 'https://github.com/LengxiQwQ/playlistout/tree/main/plugins/musicfree'}
            target="_blank"
            rel="noopener noreferrer"
            color="white"
            rotateDeg={0.6}
            className="font-handwriting plugin-guide-link"
          >
            {t.ecosystem.guideLink} ↗
          </Sticker>
        </div>

        <div className="font-note plugin-install-hint">
          {t.ecosystem.installHint}
        </div>
      </Paper>

      <div className="plugin-upcoming-block">
        <div className="plugin-upcoming-heading">
          <span className="font-marker">{t.ecosystem.nextTitle}</span>
          <span className="font-note">{t.ecosystem.nextSubtitle}</span>
        </div>

        <div className="plugin-upcoming-grid">
          {upcoming.map((integration, index) => {
            const content = (
              <>
                <span className="font-handwriting plugin-upcoming-name">{integration.name}</span>
                <Sticker
                  as="span"
                  color={statusColor[integration.status]}
                  rotateDeg={index % 2 === 0 ? -1 : 1}
                  className="font-note plugin-upcoming-status"
                >
                  {getStatusLabel(integration.status)}
                </Sticker>
                {integration.issueUrl ? (
                  <span className="plugin-upcoming-arrow" aria-hidden="true">↗</span>
                ) : null}
              </>
            );

            if (integration.issueUrl) {
              return (
                <a
                  key={integration.id}
                  href={integration.issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="plugin-upcoming-item"
                  aria-label={integration.name + ' · ' + getStatusLabel(integration.status)}
                >
                  {content}
                </a>
              );
            }

            return (
              <div key={integration.id} className="plugin-upcoming-item is-planned">
                {content}
              </div>
            );
          })}
        </div>
      </div>

      <div className="plugin-ecosystem-footer-note">
        <div>
          <div className="font-marker plugin-boundary-title">{t.ecosystem.boundaryTitle}</div>
          <p className="font-handwriting plugin-boundary-text">{t.ecosystem.boundaryText}</p>
        </div>
        <a
          href="https://github.com/LengxiQwQ/playlistout/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          className="font-handwriting plugin-request-link"
        >
          {t.ecosystem.requestSupport} ↗
        </a>
      </div>
    </Paper>
  );
};
