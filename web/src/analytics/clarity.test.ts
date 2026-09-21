import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Clarity from '@microsoft/clarity';
import {
  CLARITY_PROJECT_ID,
  CLARITY_CONSENT_STORAGE_KEY,
  CLARITY_EVENTS,
  CLARITY_TAG_KEYS,
  classifyPlaylistSize,
  initClarity,
  isClarityInitialized,
  shouldEnableClarity,
  trackClarityEvent,
  setClarityTag,
  getClarityConsent,
  updateClarityConsent,
  _resetClarityForTesting,
} from './clarity';

vi.mock('@microsoft/clarity', () => ({
  default: {
    init: vi.fn(),
    setTag: vi.fn(),
    event: vi.fn(),
    identify: vi.fn(),
    consentV2: vi.fn(),
  },
}));

describe('Microsoft Clarity Adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetClarityForTesting();
    window.localStorage.removeItem('playlistout_clarity_debug');
    window.localStorage.removeItem(CLARITY_CONSENT_STORAGE_KEY);
  });

  afterEach(() => {
    _resetClarityForTesting();
    window.localStorage.removeItem('playlistout_clarity_debug');
    window.localStorage.removeItem(CLARITY_CONSENT_STORAGE_KEY);
  });

  describe('Configuration & Dimensions', () => {
    it('provides the correct default Clarity Project ID', () => {
      expect(CLARITY_PROJECT_ID).toBe('yloiqvw5lu');
    });

    it('defines fixed allowed product events', () => {
      expect(CLARITY_EVENTS).toEqual([
        'playlist_parse_success',
        'playlist_parse_failure',
        'playlist_export',
        'clipboard_copy',
      ]);
    });

    it('defines fixed low-sensitivity tag keys', () => {
      expect(CLARITY_TAG_KEYS).toEqual([
        'platform',
        'export_format',
        'clipboard_mode',
        'playlist_size_bucket',
        'language',
      ]);
    });

    it('correctly classifies playlist sizes matching worker dimensions', () => {
      expect(classifyPlaylistSize(undefined)).toBeNull();
      expect(classifyPlaylistSize(null as any)).toBeNull();
      expect(classifyPlaylistSize(-1)).toBeNull();
      expect(classifyPlaylistSize(0)).toBe('1-50');
      expect(classifyPlaylistSize(25)).toBe('1-50');
      expect(classifyPlaylistSize(50)).toBe('1-50');
      expect(classifyPlaylistSize(51)).toBe('51-200');
      expect(classifyPlaylistSize(200)).toBe('51-200');
      expect(classifyPlaylistSize(201)).toBe('201-500');
      expect(classifyPlaylistSize(500)).toBe('201-500');
      expect(classifyPlaylistSize(501)).toBe('501-1000');
      expect(classifyPlaylistSize(1000)).toBe('501-1000');
      expect(classifyPlaylistSize(1001)).toBe('1000+');
      expect(classifyPlaylistSize(5000)).toBe('1000+');
    });
  });

  describe('Environment Guard & Initialization', () => {
    it('disables Clarity by default in test mode', () => {
      expect(shouldEnableClarity()).toBe(false);
      const initialized = initClarity();
      expect(initialized).toBe(false);
      expect(isClarityInitialized()).toBe(false);
      expect(Clarity.init).not.toHaveBeenCalled();
    });

    it('prevents duplicate initialization (React StrictMode protection)', () => {
      window.localStorage.setItem('playlistout_clarity_debug', 'true');
      expect(shouldEnableClarity()).toBe(true);

      const firstCall = initClarity('custom-test-id');
      expect(firstCall).toBe(true);
      expect(isClarityInitialized()).toBe(true);
      expect(Clarity.init).toHaveBeenCalledTimes(1);
      expect(Clarity.init).toHaveBeenCalledWith('custom-test-id');

      // Second call (e.g. StrictMode remount or HMR)
      const secondCall = initClarity('custom-test-id');
      expect(secondCall).toBe(true);
      // Ensure Clarity.init was NOT called a second time
      expect(Clarity.init).toHaveBeenCalledTimes(1);
    });

    it('initializes with default project ID when enabled and none provided', () => {
      window.localStorage.setItem('playlistout_clarity_debug', 'true');
      _resetClarityForTesting();

      const success = initClarity();
      expect(success).toBe(true);
      expect(Clarity.init).toHaveBeenCalledWith('yloiqvw5lu');
    });

    it('fails silently and returns false when Clarity.init throws an exception', () => {
      window.localStorage.setItem('playlistout_clarity_debug', 'true');
      (Clarity.init as any).mockImplementationOnce(() => {
        throw new Error('Blocked by adblocker / client security policy');
      });

      let initResult: boolean | undefined;
      expect(() => {
        initResult = initClarity('custom-test-id');
      }).not.toThrow();

      expect(initResult).toBe(false);
      expect(isClarityInitialized()).toBe(false);
      expect(Clarity.init).toHaveBeenCalledTimes(1);
    });

    it('enforces host guard: only canonical production host returns true', () => {
      expect(shouldEnableClarity('localhost')).toBe(false);
      expect(shouldEnableClarity('127.0.0.1')).toBe(false);
      expect(shouldEnableClarity('lengxiqwq.github.io')).toBe(false);
      expect(shouldEnableClarity('preview.pages.dev')).toBe(false);
      expect(shouldEnableClarity('deploy-preview-12.playlistout.pages.dev')).toBe(false);
      expect(shouldEnableClarity('playlistout.com')).toBe(false);
      expect(shouldEnableClarity('www.playlistout.com')).toBe(false);

      // Strictly canonical production host
      expect(shouldEnableClarity('playlistout.lengxiqwq.com')).toBe(true);
      expect(shouldEnableClarity('PLAYLISTOUT.LENGXIQWQ.COM')).toBe(true);
    });
  });

  describe('Consent V2 & Persistence', () => {
    it('does not initialize production Clarity until analytics consent is granted', () => {
      expect(getClarityConsent()).toBeNull();
      expect(initClarity('test-id', 'playlistout.lengxiqwq.com')).toBe(false);
      expect(Clarity.init).not.toHaveBeenCalled();

      window.localStorage.setItem(CLARITY_CONSENT_STORAGE_KEY, 'granted');
      expect(initClarity('test-id', 'playlistout.lengxiqwq.com')).toBe(true);
      expect(Clarity.init).toHaveBeenCalledWith('test-id');
      expect(Clarity.consentV2).toHaveBeenCalledWith({
        ad_Storage: 'denied',
        analytics_Storage: 'granted',
      });
    });

    it('persists denial without starting a fresh Clarity instance', () => {
      expect(updateClarityConsent('denied')).toBe(true);
      expect(getClarityConsent()).toBe('denied');
      expect(Clarity.init).not.toHaveBeenCalled();
      expect(Clarity.consentV2).not.toHaveBeenCalled();
    });

    it('revokes analytics and ad storage through Consent V2 after prior consent', () => {
      window.localStorage.setItem('playlistout_clarity_debug', 'true');
      expect(updateClarityConsent('granted')).toBe(true);
      expect(isClarityInitialized()).toBe(true);

      vi.mocked(Clarity.consentV2).mockClear();
      expect(updateClarityConsent('denied')).toBe(true);
      expect(getClarityConsent()).toBe('denied');
      expect(Clarity.consentV2).toHaveBeenCalledWith({
        ad_Storage: 'denied',
        analytics_Storage: 'denied',
      });
    });
  });

  describe('Event Tracking & Tags', () => {
    it('does not send events or tags when not initialized', () => {
      _resetClarityForTesting();
      trackClarityEvent('playlist_export');
      setClarityTag('platform', 'qqmusic');

      expect(Clarity.event).not.toHaveBeenCalled();
      expect(Clarity.setTag).not.toHaveBeenCalled();
    });

    it('safely handles errors inside Clarity.event when initialized without throwing', () => {
      window.localStorage.setItem('playlistout_clarity_debug', 'true');
      initClarity('test-id');
      expect(isClarityInitialized()).toBe(true);

      (Clarity.event as any).mockImplementationOnce(() => {
        throw new Error('Clarity SDK runtime network crash');
      });

      expect(() => trackClarityEvent('playlist_export')).not.toThrow();
      expect(Clarity.event).toHaveBeenCalledWith('playlist_export');
    });

    it('safely handles errors inside Clarity.setTag when initialized without throwing', () => {
      window.localStorage.setItem('playlistout_clarity_debug', 'true');
      initClarity('test-id');
      expect(isClarityInitialized()).toBe(true);

      (Clarity.setTag as any).mockImplementationOnce(() => {
        throw new Error('Clarity SDK runtime quota exceeded');
      });

      expect(() => setClarityTag('platform', 'qqmusic')).not.toThrow();
      expect(Clarity.setTag).toHaveBeenCalledWith('platform', 'qqmusic');
    });

    it('rejects invalid, unknown, or non-whitelisted tag values at runtime', () => {
      window.localStorage.setItem('playlistout_clarity_debug', 'true');
      initClarity('test-id');
      expect(isClarityInitialized()).toBe(true);

      // Attempt to pass arbitrary or sensitive values
      setClarityTag('platform', 'spotify' as any);
      setClarityTag('platform', 'https://y.qq.com/n/ryqq/playlist/12345' as any);
      setClarityTag('export_format', 'pdf' as any);
      setClarityTag('clipboard_mode', 'unknown_mode' as any);
      setClarityTag('playlist_size_bucket', 'huge' as any);
      setClarityTag('language', 'ja-JP' as any);
      setClarityTag('platform', null as any);
      setClarityTag('platform', undefined as any);

      // None of the invalid values should be forwarded to Clarity.setTag
      expect(Clarity.setTag).not.toHaveBeenCalled();

      // Valid values should succeed
      setClarityTag('platform', 'kugou');
      expect(Clarity.setTag).toHaveBeenCalledWith('platform', 'kugou');

      setClarityTag('playlist_size_bucket', '51-200');
      expect(Clarity.setTag).toHaveBeenCalledWith('playlist_size_bucket', '51-200');
    });
  });

  describe('Privacy & Boundary Invariants', () => {
    it('does NOT expose or call Clarity.identify()', async () => {
      const adapter = await import('./clarity');
      expect((adapter as any).identify).toBeUndefined();
      expect((adapter as any).identifyUser).toBeUndefined();
      expect(Clarity.identify).not.toHaveBeenCalled();
    });

    it('only allows explicitly whitelisted tag keys', () => {
      // TypeScript type checking guarantees this at compile time,
      // and runtime includes check validates against arbitrary inputs
      expect(CLARITY_TAG_KEYS).not.toContain('url');
      expect(CLARITY_TAG_KEYS).not.toContain('playlist_id');
      expect(CLARITY_TAG_KEYS).not.toContain('song');
      expect(CLARITY_TAG_KEYS).not.toContain('token');
      expect(CLARITY_TAG_KEYS).not.toContain('auth');
    });

    it('only allows explicitly whitelisted events', () => {
      expect(CLARITY_EVENTS).not.toContain('page_visit');
      expect(CLARITY_EVENTS).not.toContain('page_view');
      expect(CLARITY_EVENTS).not.toContain('button_clicked');
    });
  });
});
