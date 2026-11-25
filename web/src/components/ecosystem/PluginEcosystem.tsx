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
import { Tape } from '../ui/Tape';
import { Sticker } from '../ui/Sticker';
import { MarkerButton } from '../ui/MarkerButton';
import { Reveal } from '../motion/Reveal';

const statusColor: Record<IntegrationStatus, 'yellow' | 'blue' | 'green'> = {
  available: 'green',
  proposed: 'yellow',
  planned: 'blue',
  upcoming: 'yellow',
};

const cardColors = ['blue', 'mint', 'taro'] as const;

export const PluginEcosystem: React.FC = () => {
  const { t, format, language } = useTranslation();
  const [available, setAvailable] = useState<PublishedPlugin[]>([]);
  const [copyState, setCopyState] = useState<Record<string, 'copied' | 'failed'>>({});
  const [logoFailed, setLogoFailed] = useState<Record<string, boolean>>({});
  const [expandedSummaries, setExpandedSummaries] = useState<Record<string, boolean>>({});
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
    if (status === 'available') return t.ecosystem.statusAvailable;
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

  const toggleSummary = (id: string) => {
    setExpandedSummaries((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const supportedCardCount = available.length + FEATURED_UPCOMING_INTEGRATIONS.length;
  const upcomingDelay = 500 + Math.min(supportedCardCount, 6) * 120 + 150;

  return (
    <Reveal effect="stick" rot={-0.3} className="plugin-ecosystem-section-wrap">
      <Paper
        as="section"
        id="ecosystem"
        aria-labelledby="ecosystem-title"
        color="white"
        borderVariant="default"
        shadow="paper"
        rotateDeg={0}
        interactive={false}
        className="plugin-ecosystem-panel"
      >
        {/* Act 2 Deco 1: Taro washi tape */}
        <Reveal
          effect="tape"
          delay={300}
          rot={-3}
          style={{
            position: 'absolute',
            top: '-0.8rem',
            left: '2.2rem',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <Tape
            color="taro"
            rotateDeg={0}
            style={{
              width: '7.5rem',
              height: '1.65rem',
            }}
          />
        </Reveal>

        <div className="plugin-ecosystem-heading-row">
          <Reveal effect="fade-up" delay={150} className="plugin-ecosystem-heading-copy">
            <h2 id="ecosystem-title" className="font-marker plugin-ecosystem-title">
              {t.ecosystem.title}
            </h2>
            <p className="font-handwriting plugin-ecosystem-subtitle">
              {t.ecosystem.subtitle}
            </p>
          </Reveal>

          {/* Act 2 Deco 2: Ticket stub stamp */}
          <Reveal
            effect="stamp"
            delay={450}
            rot={-4}
            className="plugin-supported-count-reveal"
          >
            <div
              className="plugin-supported-count"
              aria-label={format(t.ecosystem.supportedCount, { count: supportedCardCount })}
            >
              <span className="font-marker font-num plugin-supported-number">{supportedCardCount}</span>
              <span className="font-handwriting plugin-supported-label">
                {t.ecosystem.supportedShort}
              </span>
            </div>
          </Reveal>
        </div>

        <Reveal stagger delay={500} className="plugin-app-grid">
          {available.map((plugin, idx) => {
            const isExpanded = Boolean(expandedSummaries[plugin.id]);
            return (
              <div
                key={plugin.id}
                data-reveal-item=""
                style={{ ['--i' as any]: Math.min(idx, 5), ['--rot' as any]: '-0.3deg' }}
              >
                <Paper
                  color={cardColors[idx % cardColors.length]}
                  borderVariant="alt"
                  shadow="paper-sm"
                  rotateDeg={0}
                  tiltFactor={0.2}
                  interactive={false}
                  className="plugin-app-card"
                >
                  <span className="layout-b-vinyl-slot" aria-hidden="true">
                    <span className="layout-b-vinyl-disc" />
                  </span>
                  <div className="plugin-app-row">
                    <div className="plugin-app-card-header">
                      <div className="plugin-app-card-identity">
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
                            <div className="plugin-app-badges-row">
                              <Sticker
                                as="span"
                                color="green"
                                rotateDeg={0.7}
                                className="font-handwriting plugin-status-sticker"
                              >
                                ✓ {t.ecosystem.statusAvailable}
                              </Sticker>
                              <Sticker
                                as="span"
                                color="cyan"
                                rotateDeg={-0.5}
                                className="font-handwriting plugin-status-sticker"
                              >
                                {t.ecosystem.kindPlugin}
                              </Sticker>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className={`plugin-app-summary${isExpanded ? '' : ' is-clamped'}`}>
                          {getPluginSummary(plugin, language)}
                        </p>
                        <button
                          type="button"
                          className="ui-hitbox plugin-summary-toggle"
                          aria-expanded={isExpanded}
                          onClick={() => toggleSummary(plugin.id)}
                        >
                          <span className="ui-face plugin-summary-toggle-face">
                            {isExpanded ? t.ecosystem.collapseSummary : t.ecosystem.expandSummary}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="plugin-app-actions">
                      <div className="plugin-app-primary-buttons">
                        {plugin.entrypoint ? (
                          <MarkerButton
                            type="button"
                            variant="paper"
                            rotateDeg={-0.3}
                            onClick={() => handleCopyPluginUrl(plugin.id, plugin.entrypoint!)}
                            className={`plugin-copy-button plugin-copy-button-secondary${
                              copyState[plugin.id] === 'copied' ? ' is-copied' : ''
                            }`}
                          >
                            {copyState[plugin.id] === 'copied'
                              ? t.ecosystem.copiedInstallUrl
                              : copyState[plugin.id] === 'failed'
                                ? t.ecosystem.copyFailed
                                : t.ecosystem.copyInstallUrl}
                          </MarkerButton>
                        ) : null}

                        {plugin.homepageUrl ? (
                          <a
                            href={plugin.homepageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ui-hitbox marker-button font-marker hand-drawn-border-alt shadow-cutout-sm marker-btn-ink plugin-copy-button plugin-action-link"
                            style={{ ['--rot' as any]: '0.3deg' }}
                          >
                            <span className="ui-face marker-button-face font-marker hand-drawn-border-alt shadow-cutout-sm marker-btn-ink">
                              {t.ecosystem.officialDownload}
                            </span>
                          </a>
                        ) : null}
                      </div>

                      <div className="plugin-app-links">
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
              </div>
            );
          })}

          {FEATURED_UPCOMING_INTEGRATIONS.map((integration, idx) => {
            const cardIdx = available.length + idx;
            const rotDeg = idx % 2 === 0 ? 0.25 : -0.25;
            const isExpanded = Boolean(expandedSummaries[integration.id]);
            return (
              <div
                key={integration.id}
                data-reveal-item=""
                style={{ ['--i' as any]: Math.min(cardIdx, 5), ['--rot' as any]: `${rotDeg}deg` }}
              >
                <Paper
                  color={cardColors[cardIdx % cardColors.length]}
                  borderVariant="alt"
                  shadow="paper-sm"
                  rotateDeg={0}
                  tiltFactor={0.2}
                  interactive={false}
                  className="plugin-app-card is-upcoming"
                >
                  <span className="layout-b-vinyl-slot" aria-hidden="true">
                    <span className="layout-b-vinyl-disc" />
                  </span>
                  <div className="plugin-app-row">
                    <div className="plugin-app-card-header">
                      <div className="plugin-app-card-identity">
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
                            <div className="plugin-app-badges-row">
                              <Sticker
                                as="span"
                                color={integration.status === 'available' ? 'green' : 'yellow'}
                                rotateDeg={-0.6}
                                className="font-handwriting plugin-status-sticker"
                              >
                                {integration.status === 'available' ? '✓ ' : '⏳ '}
                                {getStatusLabel(integration.status)}
                              </Sticker>
                              <Sticker
                                as="span"
                                color={
                                  integration.kind === 'import'
                                    ? 'blue'
                                    : integration.kind === 'builtin'
                                      ? 'purple'
                                      : 'cyan'
                                }
                                rotateDeg={0.5}
                                className="font-handwriting plugin-status-sticker"
                              >
                                {integration.kind === 'builtin'
                                  ? t.ecosystem.kindBuiltin
                                  : integration.kind === 'import'
                                    ? t.ecosystem.kindImport
                                    : t.ecosystem.kindPlugin}
                              </Sticker>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className={`plugin-app-summary${isExpanded ? '' : ' is-clamped'}`}>
                          {getIntegrationSummary(integration, language)}
                        </p>
                        <button
                          type="button"
                          className="ui-hitbox plugin-summary-toggle"
                          aria-expanded={isExpanded}
                          onClick={() => toggleSummary(integration.id)}
                        >
                          <span className="ui-face plugin-summary-toggle-face">
                            {isExpanded ? t.ecosystem.collapseSummary : t.ecosystem.expandSummary}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="plugin-app-actions">
                      <div className="plugin-app-primary-buttons">
                        {integration.homepageUrl ? (
                          <a
                            href={integration.homepageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ui-hitbox marker-button font-marker hand-drawn-border-alt shadow-cutout-sm marker-btn-ink plugin-copy-button plugin-action-link"
                            style={{ ['--rot' as any]: '-0.3deg' }}
                          >
                            <span className="ui-face marker-button-face font-marker hand-drawn-border-alt shadow-cutout-sm marker-btn-ink">
                              {t.ecosystem.officialDownload}
                            </span>
                          </a>
                        ) : null}
                      </div>

                      <div className="plugin-app-links">
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

                        {integration.prUrl || integration.issueUrl ? (
                          <a
                            href={integration.prUrl || integration.issueUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-handwriting plugin-app-link"
                          >
                            {integration.prUrl ? t.ecosystem.viewPrProgress : t.ecosystem.issueLink} ↗
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Paper>
              </div>
            );
          })}
        </Reveal>

        <Reveal effect="fade-up" delay={upcomingDelay} className="plugin-upcoming-strip">
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

              const linkTarget =
                integration.prUrl || integration.issueUrl || integration.repositoryUrl;

              return linkTarget ? (
                <a
                  key={integration.id}
                  href={linkTarget}
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
        </Reveal>

        {/* Act 2 Deco 3: Right-side musical note sticker */}
        <Reveal
          effect="pop"
          delay={upcomingDelay}
          rot={10}
          data-deco-mobile="hide"
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: '-1.35rem',
            bottom: '1.1rem',
            pointerEvents: 'none',
            zIndex: 15,
          }}
        >
          <div
            className="stationery-sticker delay-2"
            style={{
              ['--sticker-rot' as any]: '10deg',
              fontSize: '2rem',
              color: 'var(--accent-taro, #9a7fd8)',
              background: 'var(--paper-white, #fffdf8)',
              border: '1.5px solid var(--ink-line)',
              borderRadius: '12px',
              padding: '0.2rem 0.55rem',
              boxShadow: '2px 3px 0 var(--shadow-ink)',
              lineHeight: 1.1,
            }}
          >
            ♬
          </div>
        </Reveal>
      </Paper>
    </Reveal>
  );
};
