import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { copyToClipboard } from '../../utils/clipboard';
import { Paper } from '../ui/Paper';

const API_BASE_URL = 'https://playlistout-api.lengxiqwq.com';
const REPOSITORY_DOC_BASE = 'https://github.com/LengxiQwQ/playlistout/blob/main';
const CLI_GUIDE_URL = 'https://github.com/LengxiQwQ/playlistout#python-cli--命令行';

interface DeveloperMethod {
  id: 'json' | 'api' | 'cli' | 'integration';
  mark: string;
  title: string;
  description: string;
  meta: string;
  action: string;
  href: string;
}

export const DeveloperPanel: React.FC = () => {
  const { t } = useTranslation();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const methods: DeveloperMethod[] = [
    {
      id: 'json',
      mark: '{ }',
      title: t.developer.jsonTitle,
      description: t.developer.jsonDescription,
      meta: t.developer.jsonMeta,
      action: t.developer.jsonAction,
      href: `${REPOSITORY_DOC_BASE}/docs/JSON-SCHEMA.md`,
    },
    {
      id: 'api',
      mark: '</>',
      title: t.developer.apiTitle,
      description: t.developer.apiDescription,
      meta: t.developer.apiMeta,
      action: t.developer.apiAction,
      href: `${REPOSITORY_DOC_BASE}/docs/API.md`,
    },
    {
      id: 'cli',
      mark: '>_',
      title: t.developer.cliTitle,
      description: t.developer.cliDescription,
      meta: t.developer.cliMeta,
      action: t.developer.cliAction,
      href: CLI_GUIDE_URL,
    },
    {
      id: 'integration',
      mark: '↔',
      title: t.developer.integrationTitle,
      description: t.developer.integrationDescription,
      meta: t.developer.integrationMeta,
      action: t.developer.integrationAction,
      href: `${REPOSITORY_DOC_BASE}/docs/ECOSYSTEM-INTEGRATION.md`,
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

      <div className="developer-method-grid">
        {methods.map((method) => (
          <article key={method.id} className={`developer-method developer-method-${method.id}`}>
            <div className="developer-method-topline">
              <span className="font-mono developer-method-mark" aria-hidden="true">
                {method.mark}
              </span>
              <span className="font-mono developer-method-meta">{method.meta}</span>
            </div>

            <h3 className="developer-method-title">{method.title}</h3>
            <p className="developer-method-description">{method.description}</p>

            <div className="developer-method-actions">
              <a
                href={method.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-handwriting developer-method-link"
              >
                {method.action}
              </a>

              {method.id === 'api' ? (
                <button
                  type="button"
                  onClick={handleCopyApi}
                  className={`font-handwriting developer-copy-api${copyState === 'copied' ? ' is-copied' : ''}`}
                  aria-label={copyLabel}
                >
                  {copyLabel}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="developer-footer-note font-note">{t.developer.footerNote}</div>
    </Paper>
  );
};
