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
  const [logoFailed, setLogoFailed] = useState<Record<string, boolean>>({});
  const resetTimerRef = useRef<number | null>(null);

  const available = OPEN_SOURCE_INTEGRATIONS.filter((item) => item.status === 'available');
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
      <div className="plugin-ecosystem-heading-row">
        <div className="plugin-ecosystem-heading-copy">
          <h2 id="ecosystem-title" className="font-marker plugin-ecosystem-title">
            {t.ecosystem.title}
          </h2>
          <p className="font-handwriting plugin-ecosystem-subtitle">
            {t.ecosystem.subtitle}
          </p>
        </div>

        <div className="plugin-supported-count" aria-label={format(t.ecosystem.supportedCount, { count: SUPPORTED_INTEGRATION_COUNT })}>
          <span className="font-marker plugin-supported-number">{SUPPORTED_INTEGRATION_COUNT}</span>
          <span className="font-handwriting plugin-supported-label">
            {t.ecosystem.supportedShort}
          </span>
        </div>
      </div>

      <div className="plugin-app-grid">
        {available.map((integration) => (
          <Paper
            key={integration.id}
            color="blue"
            borderVariant="alt"
            shadow="paper-sm"
            rotateDeg={-0.3}
            tiltFactor={0.2}
            interactive={false}
            className="plugin-app-card"
          >
            <div className="plugin-app-row">
              <div className="plugin-app-card-header">
                <div className="plugin-app-logo-wrap">
                  {integration.logoUrl && !logoFailed[integration.id] ? (
                    <img
                      src={integration.logoUrl}
                      alt=""
                      className="plugin-app-logo"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setLogoFailed((prev) => ({ ...prev, [integration.id]: true }))
                      }
                    />
                  ) : (
                    <span className="font-marker plugin-app-logo-fallback" aria-hidden="true">
                      {integration.name.slice(0, 2)}
                    </span>
                  )}
                </div>

                <div className="plugin-app-card-title">
                  <div className="plugin-app-name-row">
                    <h3 className="plugin-app-name">{integration.name}</h3>
                    <Sticker
                      as="span"
                      color="green"
                      rotateDeg={0.7}
                      className="font-handwriting plugin-status-sticker"
                    >
                      ✓ {t.ecosystem.statusAvailable}
                    </Sticker>
                  </div>
                  <p className="font-handwriting plugin-app-summary">
                    {integration.id === 'musicfree' ? t.ecosystem.musicFreeSummary : ''}
                  </p>
                </div>
              </div>

              <div className="plugin-app-actions">
                {integration.pluginUrl ? (
                  <MarkerButton
                    type="button"
                    variant="ink"
                    rotateDeg={-0.3}
                    onClick={handleCopyPluginUrl}
                    className="plugin-copy-button"
                  >
                    {copyState === 'copied'
                      ? t.ecosystem.copiedInstallUrl
                      : copyState === 'failed'
                        ? t.ecosystem.copyFailed
                        : t.ecosystem.copyInstallUrl}
                  </MarkerButton>
                ) : null}

                <div className="plugin-app-links">
                  {integration.homepageUrl ? (
                    <a
                      href={integration.homepageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-handwriting plugin-app-link"
                    >
                      {t.ecosystem.websiteLink} ↗
                    </a>
                  ) : null}

                  {integration.repositoryUrl ? (
                    <a
                      href={integration.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-handwriting plugin-app-link"
                    >
                      GitHub ↗
                    </a>
                  ) : null}

                  {integration.guideUrl ? (
                    <a
                      href={integration.guideUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-handwriting plugin-app-link"
                    >
                      {t.ecosystem.guideLink} ↗
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </Paper>
        ))}
      </div>

      <div className="plugin-upcoming-strip">
        <span className="font-marker plugin-upcoming-label">{t.ecosystem.nextTitle}</span>
        <div className="plugin-upcoming-list">
          {upcoming.map((integration, index) => {
            const inner = (
              <>
                <span className="plugin-upcoming-name">{integration.name}</span>
                <Sticker
                  as="span"
                  color={statusColor[integration.status]}
                  rotateDeg={index % 2 === 0 ? -0.7 : 0.7}
                  className="font-note plugin-upcoming-status"
                >
                  {getStatusLabel(integration.status)}
                </Sticker>
              </>
            );

            return integration.issueUrl ? (
              <a
                key={integration.id}
                href={integration.issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="plugin-upcoming-chip"
              >
                {inner}
                <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <div key={integration.id} className="plugin-upcoming-chip is-planned">
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </Paper>
  );
};
