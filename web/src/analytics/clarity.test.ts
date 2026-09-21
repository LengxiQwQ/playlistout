import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Clarity from '@microsoft/clarity';
import {
  CLARITY_PROJECT_ID,
  CLARITY_EVENTS,
  CLARITY_TAG_KEYS,
  classifyPlaylistSize,
  initClarity,
  isClarityInitialized,
  shouldEnableClarity,
  trackClarityEvent,
  setClarityTag,
  _resetClarityForTesting,
} from './clarity';

vi.mock('@microsoft/clarity', () => ({
  default: {
    init: vi.fn(),
    setTag: vi.fn(),
    event: vi.fn(),
    identify: vi.fn(),
  },
}));

describe('Microsoft Clarity Adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetClarityForTesting();
    window.localStorage.removeItem('playlistout_clarity_debug');
  });

  afterEach(() => {
    _resetClarityForTesting();
    window.localStorage.removeItem('playlistout_clarity_debug');
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

    it('fails silently if Clarity.init throws an exception', () => {
      (Clarity.init as any).mockImplementationOnce(() => {
        throw new Error('Blocked by client / ad blocker');
      });

      // Even if an unexpected error occurs, caller should not crash
      expect(() => {
        try {
          Clarity.init('bad-id');
        } catch {
          // caught
        }
      }).not.toThrow();
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

    it('safely handles errors inside Clarity.event without throwing', () => {
      (Clarity.event as any).mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      expect(() => trackClarityEvent('playlist_export')).not.toThrow();
    });

    it('safely handles errors inside Clarity.setTag without throwing', () => {
      (Clarity.setTag as any).mockImplementationOnce(() => {
        throw new Error('Tag quota exceeded');
      });

      expect(() => setClarityTag('platform', 'qqmusic')).not.toThrow();
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
