import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '../../i18n';

export type FontPresetId =
  | 'zhnote'
  | 'zh_kuaile'
  | 'zh_zhimang'
  | 'zh_longcang'
  | 'zh_huangyou'
  | 'original'
  | 'patrick'
  | 'kalam'
  | 'schoolbell'
  | 'covered'
  | 'comic';

export interface FontPreset {
  id: FontPresetId;
  index: string;
  name: string;
  sample: string;
  sampleFontFamily: string;
  googleFontsQuery?: string;
}

/**
 * Dedicated Chinese Handwriting Presets (Shown exclusively in Chinese mode zh-CN)
 * All fonts are 100% genuine Chinese handwriting fonts on Google Fonts under SIL OFL.
 */
export const CHINESE_FONT_PRESETS: FontPreset[] = [
  {
    id: 'zhnote',
    index: '01',
    name: '毛笔手账 (楷书)',
    sample: '音乐手账',
    sampleFontFamily: '"Ma Shan Zheng", cursive',
    googleFontsQuery: 'Ma+Shan+Zheng&family=ZCOOL+KuaiLe',
  },
  {
    id: 'zh_kuaile',
    index: '02',
    name: '快乐手绘 (萌趣)',
    sample: '音乐手账',
    sampleFontFamily: '"ZCOOL KuaiLe", cursive',
    googleFontsQuery: 'ZCOOL+KuaiLe',
  },
  {
    id: 'zh_zhimang',
    index: '03',
    name: '洒脱行书 (行草)',
    sample: '音乐手账',
    sampleFontFamily: '"Zhi Mang Xing", cursive',
    googleFontsQuery: 'Zhi+Mang+Xing',
  },
  {
    id: 'zh_longcang',
    index: '04',
    name: '随性写意 (行书)',
    sample: '音乐手账',
    sampleFontFamily: '"Long Cang", cursive',
    googleFontsQuery: 'Long+Cang',
  },
  {
    id: 'zh_huangyou',
    index: '05',
    name: '萌趣黄油 (手绘)',
    sample: '音乐手账',
    sampleFontFamily: '"ZCOOL QingKe HuangYou", cursive',
    googleFontsQuery: 'ZCOOL+QingKe+HuangYou',
  },
  {
    id: 'original',
    index: '06',
    name: '原稿经典',
    sample: '音乐手账',
    sampleFontFamily: 'Caveat, "Ma Shan Zheng", cursive',
    googleFontsQuery: 'Caveat:wght@400;600;700&family=Permanent+Marker',
  },
];

/**
 * Dedicated English / Western Handwriting Presets (Shown exclusively in English mode en-US)
 * All fonts are authentic Western handwriting styles on Google Fonts under SIL OFL / Apache 2.0.
 */
export const ENGLISH_FONT_PRESETS: FontPreset[] = [
  {
    id: 'original',
    index: '01',
    name: 'Original Journal',
    sample: 'Music Journal',
    sampleFontFamily: 'Caveat, cursive',
    googleFontsQuery: 'Caveat:wght@400;600;700&family=Permanent+Marker',
  },
  {
    id: 'patrick',
    index: '02',
    name: 'Patrick Hand',
    sample: 'Music Journal',
    sampleFontFamily: '"Patrick Hand", cursive',
    googleFontsQuery: 'Patrick+Hand',
  },
  {
    id: 'kalam',
    index: '03',
    name: 'Kalam Notes',
    sample: 'Music Journal',
    sampleFontFamily: 'Kalam, cursive',
    googleFontsQuery: 'Kalam:wght@400;700',
  },
  {
    id: 'schoolbell',
    index: '04',
    name: 'Schoolbell',
    sample: 'Music Journal',
    sampleFontFamily: 'Schoolbell, cursive',
    googleFontsQuery: 'Schoolbell',
  },
  {
    id: 'covered',
    index: '05',
    name: 'Covered By Your Grace',
    sample: 'Music Journal',
    sampleFontFamily: '"Covered By Your Grace", cursive',
    googleFontsQuery: 'Covered+By+Your+Grace',
  },
  {
    id: 'comic',
    index: '06',
    name: 'Comic Neue',
    sample: 'Music Journal',
    sampleFontFamily: '"Comic Neue", cursive',
    googleFontsQuery: 'Comic+Neue:wght@400;700',
  },
];

export const ALL_FONT_PRESETS: FontPreset[] = [
  ...CHINESE_FONT_PRESETS,
  ...ENGLISH_FONT_PRESETS.filter((p) => p.id !== 'original'),
];

export const FONT_PRESETS = ALL_FONT_PRESETS;

const FONT_STORAGE_PREFIX = 'playlistout-font-preset';

// Track font presets confirmed ready in browser session
const loadedFontPresets = new Set<string>(['original']);

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

export function ensureFontStylesheet(preset: FontPreset): void {
  if (!preset.googleFontsQuery) return;
  const linkId = `font-link-${preset.id}`;
  if (typeof document !== 'undefined' && !document.getElementById(linkId)) {
    try {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${preset.googleFontsQuery}&display=swap`;
      document.head.appendChild(link);
    } catch {
      // ignore
    }
  }
}

export const FontSwitcher: React.FC = () => {
  const { t, language } = useTranslation();
  const isZh = language === 'zh-CN';
  const currentPresets = isZh ? CHINESE_FONT_PRESETS : ENGLISH_FONT_PRESETS;
  const storageKey = isZh ? `${FONT_STORAGE_PREFIX}-zh` : `${FONT_STORAGE_PREFIX}-en`;
  const defaultPresetId = isZh ? 'zhnote' : 'original';

  const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultPresetId);
  const [isOpen, setIsOpen] = useState(false);

  const applyPreset = useCallback(
    (presetId: string, persist = true) => {
      const preset = ALL_FONT_PRESETS.find((p) => p.id === presetId) || currentPresets[0];
      setSelectedPresetId(preset.id);
      document.body.dataset.fontPreset = preset.id;
      ensureFontStylesheet(preset);

      if (persist) {
        try {
          localStorage.setItem(storageKey, preset.id);
        } catch {
          // Ignore storage errors
        }
      }
    },
    [currentPresets, storageKey],
  );

  const selectPreset = useCallback(
    (preset: FontPreset) => {
      applyPreset(preset.id, true);
      setIsOpen(false);
    },
    [applyPreset],
  );

  // Restore saved preset or apply default whenever language changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && currentPresets.some((p) => p.id === saved)) {
        applyPreset(saved, false);
        return;
      }
    } catch {
      // Default
    }
    applyPreset(defaultPresetId, false);
  }, [language, storageKey, currentPresets, defaultPresetId, applyPreset]);

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

  const currentPreset =
    currentPresets.find((p) => p.id === selectedPresetId) || currentPresets[0];

  const getFontName = (preset: FontPreset): string => {
    return (t.fonts as Record<string, string>)?.[preset.id] || preset.name;
  };

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
        <span id="fontPickerLabel">
          {currentPreset.index} · {getFontName(currentPreset)}
        </span>
        <span className="paper-caret" style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}>
          ⌄
        </span>
      </button>

      <div className="font-picker-menu" id="fontPickerMenu" role="listbox" style={{ width: '335px' }}>
        <div className="font-picker-hint">{t.header.fontPickerHint}</div>
        {currentPresets.map((preset) => {
          const isActive = preset.id === currentPreset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`font-option ${isActive ? 'active' : ''}`}
              role="option"
              aria-selected={isActive}
              data-value={preset.id}
              onMouseEnter={() => ensureFontStylesheet(preset)}
              onClick={() => selectPreset(preset)}
            >
              <span className="font-option-index">{preset.index}</span>
              <span className="font-option-name">{getFontName(preset)}</span>
              <span
                className="font-option-sample"
                style={{ fontFamily: preset.sampleFontFamily }}
              >
                {t.fonts.sampleText}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
