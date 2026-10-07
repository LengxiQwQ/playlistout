import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../i18n';
import { copyToClipboard } from '../../utils/clipboard';
import {
  FEATURED_UPCOMING_INTEGRATIONS,
  PLUGIN_MANIFEST_URL,
  UPCOMING_INTEGRATIONS,
  getIntegrationSummary,
  getPluginSummary,
  isPluginEcosystemManifest,
  type IntegrationStatus,
  type PublishedPlugin,
} from '../../data/integrations';
import { Paper } from '../ui/Paper';
import { Sticker } from '../ui/Sticker';
import { MarkerButton } from '../ui/MarkerButton';

const statusColor: Record<IntegrationStatus, 'yellow' | 'blue'> = {
  proposed: 'yellow',
  planned: 'blue',
  upcoming: 'yellow',
};

export const PluginEcosystem: React.FC = () => {
  const { t, format, language } = useTranslation();
  const [available, setAvailable] = useState<PublishedPlugin[]>([]);
  const [copyState, setCopyState] = useState<Record<string, 'copied' | 'failed'>>({});
  const [logoFailed, setLogoFailed] = useState<Record<string, boolean>>({});
  const resetTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const controller = new AbortController();

    const loadManifest = async () => {
      try {
        const response = await fetch(PLUGIN_MANIFEST_URL, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;

        const payload: unknown = await response.json();
        if (isPluginEcosystemManifest(payload)) {
          setAvailable(payload.platforms);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          // The ecosystem panel is optional content. A missing/stale manifest should
          // never break the rest of the site.
        }
      }
    };

    void loadManifest();

    return () => {
      controller.abort();
      for (const timer of Object.values(resetTimersRef.current)) {
        window.clearTimeout(timer);
      }
      resetTimersRef.current = {};
    };
  }, []);

  const getStatusLabel = (status: IntegrationStatus) => {
    if (status === 'proposed') return t.ecosystem.statusProposed;
    if (status === 'upcoming') return t.ecosystem.statusUpcoming;
    return t.ecosystem.statusPlanned;
  };

  const handleCopyPluginUrl = async (id: string, url: string) => {
    const ok = await copyToClipboard(url);
    setCopyState((prev) => ({ ...prev, [id]: ok ? 'copied' : 'failed' }));

    const existingTimer = resetTimersRef.current[id];
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
    }

    resetTimersRef.current[id] = window.setTimeout(() => {
      setCopyState((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      delete resetTimersRef.current[id];
    }, 2600);
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

        <div
          className="plugin-supported-count"
          aria-label={format(t.ecosystem.supportedCount, { count: available.length })}
        >
          <span className="font-marker plugin-supported-number">{available.length}</span>
          <span className="font-handwriting plugin-supported-label">
            {t.ecosystem.supportedShort}
          </span>
        </div>
      </div>

      <div className="plugin-app-grid">
        {available.map((plugin) => (
          <Paper
            key={plugin.id}
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
                  {plugin.logoUrl && !logoFailed[plugin.id] ? (
                    <img
                      src={plugin.logoUrl}
                      alt=""
                      className="plugin-app-logo"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setLogoFailed((prev) => ({ ...prev, [plugin.id]: true }))
                      }
                    />
                  ) : (
                    <span className="font-marker plugin-app-logo-fallback" aria-hidden="true">
                      {plugin.name.slice(0, 2)}
                    </span>
                  )}
                </div>

                <div className="plugin-app-card-title">
                  <div className="plugin-app-name-row">
                    <h3 className="plugin-app-name">{plugin.name}</h3>
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
                    {getPluginSummary(plugin, language)}
                  </p>
                </div>
              </div>

              <div className="plugin-app-actions">
                {plugin.entrypoint ? (
                  <MarkerButton
                    type="button"
                    variant="ink"
                    rotateDeg={-0.3}
                    onClick={() => handleCopyPluginUrl(plugin.id, plugin.entrypoint!)}
                    className="plugin-copy-button"
                  >
                    {copyState[plugin.id] === 'copied'
                      ? t.ecosystem.copiedInstallUrl
                      : copyState[plugin.id] === 'failed'
                        ? t.ecosystem.copyFailed
                        : t.ecosystem.copyInstallUrl}
                  </MarkerButton>
                ) : null}

                <div className="plugin-app-links">
                  {plugin.homepageUrl ? (
                    <a
                      href={plugin.homepageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-handwriting plugin-app-link"
                    >
                      {t.ecosystem.websiteLink} ↗
                    </a>
                  ) : null}

                  {plugin.repositoryUrl ? (
                    <a
                      href={plugin.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-handwriting plugin-app-link"
                    >
                      GitHub ↗
                    </a>
                  ) : null}

                  {plugin.guideUrl ? (
                    <a
                      href={plugin.guideUrl}
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

        {FEATURED_UPCOMING_INTEGRATIONS.map((integration) => (
          <Paper
            key={integration.id}
            color="white"
            borderVariant="alt"
            shadow="paper-sm"
            rotateDeg={0.2}
            tiltFactor={0.2}
            interactive={false}
            className="plugin-app-card is-upcoming"
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
                      color="yellow"
                      rotateDeg={-0.6}
                      className="font-handwriting plugin-status-sticker"
                    >
                      ⏳ {t.ecosystem.statusUpcoming}
                    </Sticker>
                    {integration.kind === 'builtin' ? (
                      <span className="font-note plugin-kind-badge">
                        {t.ecosystem.kindBuiltin}
                      </span>
                    ) : null}
                  </div>
                  <p className="font-handwriting plugin-app-summary">
                    {getIntegrationSummary(integration, language)}
                  </p>
                </div>
              </div>

              <div className="plugin-app-actions">
                {integration.prUrl || integration.issueUrl ? (
                  <a
                    href={integration.prUrl || integration.issueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-marker plugin-action-link"
                  >
                    {t.ecosystem.viewPrProgress} ↗
                  </a>
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
                </div>
              </div>
            </div>
          </Paper>
        ))}
      </div>

      <div className="plugin-upcoming-strip">
        <span className="font-marker plugin-upcoming-label">{t.ecosystem.nextTitle}</span>
        <div className="plugin-upcoming-list">
          {UPCOMING_INTEGRATIONS.map((integration, index) => {
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
