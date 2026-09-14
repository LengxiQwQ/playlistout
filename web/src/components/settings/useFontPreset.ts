import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../i18n';
import {
  FontPreset,
  CHINESE_FONT_PRESETS,
  ENGLISH_FONT_PRESETS,
  ALL_FONT_PRESETS,
  ensureFontStylesheet,
} from './FontSwitcher';

const FONT_STORAGE_PREFIX = 'playlistout-font-preset';
const FONT_CHANGE_EVENT = 'playlistout:fontpresetchange';

export function useFontPreset() {
  const { t, language } = useTranslation();
  const isZh = language === 'zh-CN';
  const currentPresets = isZh ? CHINESE_FONT_PRESETS : ENGLISH_FONT_PRESETS;
  const storageKey = isZh ? `${FONT_STORAGE_PREFIX}-zh` : `${FONT_STORAGE_PREFIX}-en`;
  const defaultPresetId = isZh ? 'zhnote' : 'original';

  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && currentPresets.some((p) => p.id === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return defaultPresetId;
  });

  const applyPreset = useCallback(
    (presetId: string, persist = true) => {
      const preset = ALL_FONT_PRESETS.find((p) => p.id === presetId) || currentPresets[0];
      setSelectedPresetId(preset.id);
      if (typeof document !== 'undefined') {
        document.body.dataset.fontPreset = preset.id;
        ensureFontStylesheet(preset);
      }

      if (persist) {
        try {
          localStorage.setItem(storageKey, preset.id);
        } catch {
          // Ignore storage errors
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(FONT_CHANGE_EVENT, { detail: preset.id }));
        }
      }
    },
    [currentPresets, storageKey],
  );

  const selectPreset = useCallback(
    (preset: FontPreset) => {
      applyPreset(preset.id, true);
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

  // Sync state if another switcher dispatches font change event
  useEffect(() => {
    const handleFontChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail && currentPresets.some((p) => p.id === customEvent.detail)) {
        setSelectedPresetId(customEvent.detail);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(FONT_CHANGE_EVENT, handleFontChange);
      return () => window.removeEventListener(FONT_CHANGE_EVENT, handleFontChange);
    }
  }, [currentPresets]);

  const getFontName = useCallback(
    (preset: FontPreset): string => {
      return (t.fonts as Record<string, string>)?.[preset.id] || preset.name;
    },
    [t.fonts],
  );

  const currentPreset =
    currentPresets.find((p) => p.id === selectedPresetId) || currentPresets[0];

  return {
    currentPresets,
    currentPreset,
    selectedPresetId,
    selectPreset,
    applyPreset,
    getFontName,
  };
}
