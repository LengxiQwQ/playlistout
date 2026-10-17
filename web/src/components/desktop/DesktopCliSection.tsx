import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { Paper } from '../ui/Paper';
import { Tape } from '../ui/Tape';
import { copyToClipboard } from '../../utils/clipboard';

const GITHUB_LATEST_RELEASE_URL = 'https://github.com/LengxiQwQ/playlistout/releases/latest';

export const DesktopCliSection: React.FC = () => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const terminalCommand = './PlaylistOut "<url>"';

  const handleCopyCommand = async () => {
    const ok = await copyToClipboard(terminalCommand);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Paper
      as="section"
      id="desktop-cli"
      aria-labelledby="desktop-cli-title"
      color="pink"
      borderVariant="default"
      shadow="paper"
      rotateDeg={-0.3}
      interactive={false}
      className="desktop-cli-panel"
    >
      {/* Stationery Tape on top edge */}
      <Tape
        color="yellow"
        rotateDeg={-2.5}
        style={{
          position: 'absolute',
          top: '-0.9rem',
          left: '2.5rem',
          width: '12rem',
          height: '1.75rem',
          zIndex: 10,
        }}
      />

      {/* Heading Row */}
      <div className="desktop-heading-row">
        <div className="desktop-heading-copy">
          <h2 id="desktop-cli-title" className="font-marker desktop-title">
            {t.desktop.title}
          </h2>
          <p className="font-handwriting desktop-subtitle">
            {t.desktop.subtitle}
          </p>
        </div>
      </div>

      {/* 3 Practical Usage Steps */}
      <div className="desktop-steps-list">
        <div className="desktop-step-card">
          <h3 className="font-marker desktop-step-title">
            {t.desktop.step1Title}
          </h3>
          <p className="font-handwriting desktop-step-desc">
            {t.desktop.step1Desc}
          </p>
        </div>

        <div className="desktop-step-card">
          <h3 className="font-marker desktop-step-title">
            {t.desktop.step2Title}
          </h3>
          <p className="font-handwriting desktop-step-desc">
            {t.desktop.step2Desc}
          </p>
          <div className="desktop-step-code-box">
            <span className="desktop-step-code">{terminalCommand}</span>
            <button
              type="button"
              onClick={handleCopyCommand}
              className={`desktop-step-code-btn ${copied ? 'is-copied' : ''}`}
              aria-label={copied ? '已复制命令' : '复制终端命令'}
            >
              {copied ? '✓ 已复制' : '复制'}
            </button>
          </div>
        </div>

        <div className="desktop-step-card">
          <h3 className="font-marker desktop-step-title">
            {t.desktop.step3Title}
          </h3>
          <p className="font-handwriting desktop-step-desc">
            {t.desktop.step3Desc}
          </p>
        </div>
      </div>

      {/* Single Clear Download Action */}
      <div className="desktop-action-center font-handwriting">
        <a
          href={GITHUB_LATEST_RELEASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="desktop-single-download-btn"
        >
          {t.desktop.downloadButton}
        </a>
        <p className="desktop-download-support-hint">
          {t.desktop.downloadHint}
        </p>
      </div>
    </Paper>
  );
};
