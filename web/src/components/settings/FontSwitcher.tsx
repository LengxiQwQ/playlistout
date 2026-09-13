import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from '../../i18n';

export interface FontPreset {
  id: string;
  index: string;
  name: string;
  sample: string;
  sampleFontFamily: string;
  googleFontsQuery?: string;
}

export const FONT_PRESETS: FontPreset[] = [
  { id: 'original', index: '01', name: '原稿字体', sample: 'Playlist', sampleFontFamily: 'Caveat, cursive' },
  { id: 'caveat', index: '02', name: 'Caveat 手写', sample: 'Playlist', sampleFontFamily: 'Caveat, cursive' },
  { id: 'patrick', index: '03', name: 'Patrick Hand', sample: 'Playlist', sampleFontFamily: 'Patrick Hand, cursive', googleFontsQuery: 'Patrick+Hand' },
  { id: 'kalam', index: '04', name: 'Kalam 笔记', sample: 'Playlist', sampleFontFamily: 'Kalam, cursive', googleFontsQuery: 'Kalam:wght@400;700' },
  { id: 'architect', index: '05', name: 'Architects Daughter', sample: 'Playlist', sampleFontFamily: 'Architects Daughter, cursive', googleFontsQuery: 'Architects+Daughter' },
  { id: 'indie', index: '06', name: 'Indie Flower', sample: 'Playlist', sampleFontFamily: 'Indie Flower, cursive', googleFontsQuery: 'Indie+Flower' },
  { id: 'handlee', index: '07', name: 'Handlee', sample: 'Playlist', sampleFontFamily: 'Handlee, cursive', googleFontsQuery: 'Handlee' },
  { id: 'schoolbell', index: '08', name: 'Schoolbell', sample: 'Playlist', sampleFontFamily: 'Schoolbell, cursive', googleFontsQuery: 'Schoolbell' },
  { id: 'shortstack', index: '09', name: 'Short Stack', sample: 'Playlist', sampleFontFamily: 'Short Stack, cursive', googleFontsQuery: 'Short+Stack' },
  { id: 'comingsoon', index: '10', name: 'Coming Soon', sample: 'Playlist', sampleFontFamily: 'Coming Soon, cursive', googleFontsQuery: 'Coming+Soon' },
  { id: 'gloria', index: '11', name: 'Gloria Hallelujah', sample: 'Playlist', sampleFontFamily: 'Gloria Hallelujah, cursive', googleFontsQuery: 'Gloria+Hallelujah' },
  { id: 'gochi', index: '12', name: 'Gochi Hand', sample: 'Playlist', sampleFontFamily: 'Gochi Hand, cursive', googleFontsQuery: 'Gochi+Hand' },
  { id: 'nothing', index: '13', name: 'Nothing You Could Do', sample: 'Playlist', sampleFontFamily: 'Nothing You Could Do, cursive', googleFontsQuery: 'Nothing+You+Could+Do' },
  { id: 'covered', index: '14', name: 'Covered By Your Grace', sample: 'Playlist', sampleFontFamily: 'Covered By Your Grace, cursive', googleFontsQuery: 'Covered+By+Your+Grace' },
  { id: 'comic', index: '15', name: 'Comic Neue', sample: 'Playlist', sampleFontFamily: 'Comic Neue, cursive', googleFontsQuery: 'Comic+Neue:wght@400;700' },
  { id: 'softprint', index: '16', name: 'Quicksand 软印刷', sample: 'Playlist', sampleFontFamily: 'Quicksand, sans-serif', googleFontsQuery: 'Quicksand:wght@400;500;600;700' },
  { id: 'rocksalt', index: '17', name: 'Rock Salt 涂鸦', sample: 'PLAYLIST', sampleFontFamily: 'Rock Salt, cursive', googleFontsQuery: 'Rock+Salt' },
  { id: 'zhnote', index: '18', name: '中文手账', sample: '歌单', sampleFontFamily: 'Ma Shan Zheng, cursive', googleFontsQuery: 'Ma+Shan+Zheng&family=ZCOOL+KuaiLe' },
  { id: 'serifnote', index: '19', name: '文艺纸书', sample: '歌单', sampleFontFamily: 'ZCOOL XiaoWei, serif', googleFontsQuery: 'ZCOOL+XiaoWei&family=Noto+Serif+SC:wght@400;600;700' },
  { id: 'typewriter', index: '20', name: '打字机', sample: 'LIST_01', sampleFontFamily: 'Space Mono, monospace' },
];

const FONT_STORAGE_KEY = 'playlistout-font-preset';

// Track font presets confirmed ready in browser session
const loadedFontPresets = new Set<string>(['original', 'caveat', 'typewriter']);

export function checkFontLoaded(fontFamily: string): boolean {
  if (typeof document !== 'undefined' && 'fonts' in document && document.fonts?.check) {
    try {
      return document.fonts.check(`1em "${fontFamily}"`);
    } catch {
      return false;
    }
  }
  return false;
}

export function loadPresetFont(preset: FontPreset, timeoutMs = 3500): Promise<boolean> {
  if (!preset.googleFontsQuery || loadedFontPresets.has(preset.id)) {
    return Promise.resolve(true);
  }

  // Fast-track in test environments
  if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') {
    loadedFontPresets.add(preset.id);
    return Promise.resolve(true);
  }

  const primaryFamily = preset.sampleFontFamily.split(',')[0].trim().replace(/['"]/g, '');

  return new Promise<boolean>((resolve) => {
    let resolved = false;
    const finish = (ok: boolean) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        if (ok) {
          loadedFontPresets.add(preset.id);
        }
        resolve(ok);
      }
    };

    const timer = setTimeout(() => {
      finish(false);
    }, timeoutMs);

    // If browser already has this font loaded
    if (checkFontLoaded(primaryFamily)) {
      finish(true);
      return;
    }

    const linkId = `font-link-${preset.id}`;
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${preset.googleFontsQuery}&display=swap`;
      document.head.appendChild(link);
    }

    const onReady = () => {
      if (typeof document !== 'undefined' && 'fonts' in document && document.fonts?.load) {
        document.fonts
          .load(`1em "${primaryFamily}"`)
          .then(() => finish(true))
          .catch(() => finish(true)); // Even on reject, stylesheet exists, display:swap handles fallback
      } else {
        finish(true);
      }
    };

    link.addEventListener('load', onReady, { once: true });
    link.addEventListener('error', () => finish(false), { once: true });

    if ((link as any).sheet) {
      onReady();
    }
  });
}

export const FontSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const [selectedPresetId, setSelectedPresetId] = useState<string>('original');
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const noticeTimeoutRef = useRef<number | undefined>(undefined);

  const applyPreset = useCallback((presetId: string, persist = true) => {
    const preset = FONT_PRESETS.find((p) => p.id === presetId) || FONT_PRESETS[0];
    setSelectedPresetId(preset.id);
    document.body.dataset.fontPreset = preset.id;

    if (persist) {
      try {
        localStorage.setItem(FONT_STORAGE_KEY, preset.id);
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  const selectPreset = useCallback(
    async (preset: FontPreset) => {
      if (preset.id === selectedPresetId) {
        setIsOpen(false);
        return;
      }

      // Synchronous path for built-in or already loaded fonts, or in test environments
      const isAlreadyReady =
        !preset.googleFontsQuery ||
        loadedFontPresets.has(preset.id) ||
        (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test');

      if (isAlreadyReady) {
        applyPreset(preset.id);
        setIsOpen(false);
        return;
      }

      // Asynchronous progressive loading with feedback
      setLoadingPresetId(preset.id);
      setLoadNotice(null);
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }

      const ok = await loadPresetFont(preset, 3500);

      // Smoothly apply without page refresh
      applyPreset(preset.id);
      setLoadingPresetId(null);
      setIsOpen(false);

      if (!ok) {
        setLoadNotice('字体下载较慢，已启用平滑回退');
        noticeTimeoutRef.current = window.setTimeout(() => setLoadNotice(null), 3000);
      }
    },
    [selectedPresetId, applyPreset],
  );

  // Restore saved preset on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FONT_STORAGE_KEY);
      if (saved && FONT_PRESETS.some((p) => p.id === saved)) {
        const preset = FONT_PRESETS.find((p) => p.id === saved)!;
        applyPreset(preset.id, false);
        // Pre-fetch stylesheet in background if needed
        if (preset.googleFontsQuery) {
          loadPresetFont(preset, 5000);
        }
      }
    } catch {
      // Default to original
    }
  }, [applyPreset]);

  // Click outside and Escape handling
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#fontPicker')) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const currentPreset = FONT_PRESETS.find((p) => p.id === selectedPresetId) || FONT_PRESETS[0];
  const activeLoadingPreset = loadingPresetId
    ? FONT_PRESETS.find((p) => p.id === loadingPresetId)
    : null;

  return (
    <div className={`font-picker ${isOpen ? 'open' : ''}`} id="fontPicker">
      <span className="font-picker-caption">{t.header.fontDrawerCaption}</span>
      <button
        className="font-picker-button"
        id="fontPickerButton"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span id="fontPickerLabel" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {activeLoadingPreset ? (
            <>
              <span className="animate-ink-spin" style={{ display: 'inline-block' }}>
                ✎
              </span>
              <span>载入中...</span>
            </>
          ) : (
            `${currentPreset.index} · ${currentPreset.name}`
          )}
        </span>
        <span className="paper-caret" style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}>
          ⌄
        </span>
      </button>

      <div className="font-picker-menu" id="fontPickerMenu" role="listbox" style={{ width: '315px' }}>
        <div className="font-picker-hint">{t.header.fontPickerHint}</div>
        {loadNotice && <div className="font-picker-notice">{loadNotice}</div>}
        {FONT_PRESETS.map((preset) => {
          const isActive = preset.id === selectedPresetId;
          const isLoadingThis = preset.id === loadingPresetId;
          return (
            <button
              key={preset.id}
              type="button"
              className={`font-option ${isActive ? 'active' : ''}`}
              role="option"
              aria-selected={isActive}
              data-value={preset.id}
              onClick={() => selectPreset(preset)}
            >
              <span className="font-option-index">{preset.index}</span>
              <span className="font-option-name">{preset.name}</span>
              {isLoadingThis ? (
                <span className="font-option-loading">
                  <span className="animate-ink-spin" style={{ display: 'inline-block' }}>✎</span>
                  载入中...
                </span>
              ) : (
                <span
                  className="font-option-sample"
                  style={{ fontFamily: preset.sampleFontFamily }}
                >
                  {preset.sample}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
