import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { copyToClipboard } from '../../utils/clipboard';
import { Paper } from '../ui/Paper';
import { MarkerButton } from '../ui/MarkerButton';

const API_BASE_URL = 'https://playlistout-api.lengxiqwq.com';
const REPOSITORY_DOC_BASE = 'https://github.com/LengxiQwQ/playlistout/blob/main';

type DeveloperCardColor = 'yellow' | 'blue' | 'mint';

interface DeveloperCard {
  id: 'json' | 'api' | 'integration';
  mark: string;
  title: string;
  description: string;
  meta: string;
  action: string;
  href: string;
  color: DeveloperCardColor;
  rotateDeg: number;
}

export const DeveloperPanel: React.FC = () => {
  const { t } = useTranslation();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const cards: DeveloperCard[] = [
    {
      id: 'json',
      mark: '{ }',
      title: t.developer.jsonTitle,
      description: t.developer.jsonDescription,
      meta: t.developer.jsonMeta,
      action: t.developer.jsonAction,
      href: `${REPOSITORY_DOC_BASE}/docs/JSON-SCHEMA.md`,
      color: 'blue',
      rotateDeg: -0.35,
    },
    {
      id: 'api',
      mark: '</>',
      title: t.developer.apiTitle,
      description: t.developer.apiDescription,
      meta: t.developer.apiMeta,
      action: t.developer.apiAction,
      href: `${REPOSITORY_DOC_BASE}/docs/API.md`,
      color: 'yellow',
      rotateDeg: 0.3,
    },
    {
      id: 'integration',
      mark: '↔',
      title: t.developer.integrationTitle,
      description: t.developer.integrationDescription,
      meta: t.developer.integrationMeta,
      action: t.developer.integrationAction,
      href: `${REPOSITORY_DOC_BASE}/docs/ECOSYSTEM-INTEGRATION.md`,
      color: 'mint',
      rotateDeg: -0.2,
    },
  ];

  const handleCopyApi = async () => {
    const ok = await copyToClipboard(API_BASE_URL);
    setCopyState(ok ? 'copied' : 'failed');
  };

  const copyLabel =
    copyState === 'copied'
      ? t.developer.copiedApi
      : copyState === 'failed'
        ? t.developer.copyFailed
        : t.developer.copyApi;

  return (
    <Paper
      as="section"
      id="developers"
      aria-labelledby="developers-title"
      color="white"
      borderVariant="default"
      shadow="paper"
      rotateDeg={-0.1}
      interactive={false}
      className="developer-panel"
    >
      <div className="developer-heading-row">
        <div className="developer-heading-copy">
          <h2 id="developers-title" className="font-marker developer-title">
            {t.developer.title}
          </h2>
          <p className="font-handwriting developer-subtitle">{t.developer.subtitle}</p>
        </div>
        <div className="font-note developer-value-note">{t.developer.valueNote}</div>
      </div>

      <div className="developer-card-grid">
        {cards.map((card) => (
          <Paper
            as="article"
            key={card.id}
            color={card.color}
            borderVariant="alt"
            shadow="paper-sm"
            rotateDeg={card.rotateDeg}
            tiltFactor={0.18}
            className={`developer-card developer-card-${card.id}`}
          >
            <div className="developer-card-topline">
              <span className="font-mono developer-card-mark" aria-hidden="true">
                {card.mark}
              </span>
              <span className="font-mono developer-card-meta">{card.meta}</span>
            </div>

            <h3 className="developer-card-title">{card.title}</h3>
            <p className="developer-card-description">{card.description}</p>

            {card.id === 'api' ? (
              <div className="developer-api-box">
                <span className="font-mono developer-api-label">{t.developer.apiBaseLabel}</span>
                <code className="font-mono developer-api-url">{API_BASE_URL}</code>
                <MarkerButton
                  type="button"
                  variant="paper"
                  rotateDeg={-0.2}
                  onClick={handleCopyApi}
                  className={`developer-api-copy${copyState === 'copied' ? ' is-copied' : ''}`}
                >
                  {copyLabel}
                </MarkerButton>
              </div>
            ) : null}

            <a
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-handwriting developer-card-link"
            >
              {card.action}
            </a>
          </Paper>
        ))}
      </div>

      <div className="developer-footer-note font-note">{t.developer.footerNote}</div>
    </Paper>
  );
};
