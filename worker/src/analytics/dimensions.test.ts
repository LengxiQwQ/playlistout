import { describe, it, expect } from 'vitest';
import {
  classifyInputType,
  classifyPlaylistSize,
  classifyLatency,
  classifyErrorCategory,
  classifyResolveFailureCode,
  classifyResolveFailureClass,
  classifyResolveFailureStage,
  classifyResolveRequestedType,
  classifyResolveRequestedPlatform,
  classifyAnalyticsPlatform,
  classifyProviderFailurePath,
} from './dimensions';

describe('Analytics Dimension Classifiers', () => {
  describe('classifyInputType', () => {
    it('classifies raw numeric IDs', () => {
      expect(classifyInputType('9044196528')).toBe('raw_id');
      expect(classifyInputType('12345')).toBe('raw_id');
      expect(classifyInputType('123456789012345678')).toBe('raw_id');
    });

    it('classifies standard web URLs', () => {
      expect(classifyInputType('https://y.qq.com/n/ryqq/playlist/9044196528')).toBe('web_url');
      expect(classifyInputType('y.qq.com/n/ryqq/playlist/12345')).toBe('web_url');
    });

    it('classifies mobile share links', () => {
      expect(classifyInputType('https://i.y.qq.com/n2/m/share/details/taoge.html?id=9044196528')).toBe('mobile_share_link');
      expect(classifyInputType('https://y.qq.com/n/m/detail/taoge/index.html?id=12345')).toBe('mobile_share_link');
    });

    it('classifies unknown inputs as other', () => {
      expect(classifyInputType('')).toBe('other');
      expect(classifyInputType('random text')).toBe('other');
    });
  });

  describe('classifyPlaylistSize', () => {
    it('returns null for undefined or negative', () => {
      expect(classifyPlaylistSize(undefined)).toBeNull();
      expect(classifyPlaylistSize(-1)).toBeNull();
    });

    it('returns correct buckets', () => {
      expect(classifyPlaylistSize(0)).toBe('1-50');
      expect(classifyPlaylistSize(1)).toBe('1-50');
      expect(classifyPlaylistSize(50)).toBe('1-50');
      expect(classifyPlaylistSize(51)).toBe('51-200');
      expect(classifyPlaylistSize(200)).toBe('51-200');
      expect(classifyPlaylistSize(201)).toBe('201-500');
      expect(classifyPlaylistSize(500)).toBe('201-500');
      expect(classifyPlaylistSize(501)).toBe('501-1000');
      expect(classifyPlaylistSize(1000)).toBe('501-1000');
      expect(classifyPlaylistSize(1001)).toBe('1000+');
      expect(classifyPlaylistSize(50000)).toBe('1000+');
    });
  });

  describe('classifyLatency', () => {
    it('returns null for undefined or negative', () => {
      expect(classifyLatency(undefined)).toBeNull();
      expect(classifyLatency(-1)).toBeNull();
    });

    it('returns correct buckets', () => {
      expect(classifyLatency(0)).toBe('<500ms');
      expect(classifyLatency(499)).toBe('<500ms');
      expect(classifyLatency(500)).toBe('500-1000ms');
      expect(classifyLatency(999)).toBe('500-1000ms');
      expect(classifyLatency(1000)).toBe('1-3s');
      expect(classifyLatency(2999)).toBe('1-3s');
      expect(classifyLatency(3000)).toBe('3-5s');
      expect(classifyLatency(4999)).toBe('3-5s');
      expect(classifyLatency(5000)).toBe('5s+');
      expect(classifyLatency(100000)).toBe('5s+');
    });
  });

  describe('classifyErrorCategory', () => {
    it('maps provider error codes correctly', () => {
      expect(classifyErrorCategory('UPSTREAM_ERROR')).toBe('error_upstream');
      expect(classifyErrorCategory('UPSTREAM_TIMEOUT')).toBe('error_timeout');
      expect(classifyErrorCategory('INCOMPLETE_PLAYLIST')).toBe('error_upstream');
      expect(classifyErrorCategory('PLAYLIST_NOT_FOUND')).toBe('error_upstream');
      expect(classifyErrorCategory('INVALID_INPUT')).toBe('error_validation');
      expect(classifyErrorCategory('UNSUPPORTED_URL')).toBe('error_validation');
      expect(classifyErrorCategory('PARSE_ERROR')).toBe('error_upstream');
      expect(classifyErrorCategory('RATE_LIMITED')).toBe('error_rate_limit');
    });

    it('defaults to error_internal for unknown codes', () => {
      expect(classifyErrorCategory('UNKNOWN_CODE')).toBe('error_internal');
      expect(classifyErrorCategory(undefined)).toBe('error_internal');
      expect(classifyErrorCategory('')).toBe('error_internal');
    });
  });

  describe('R7 Resolve Failure Classifiers', () => {
    it('maps all ApiErrorCode tokens to bounded resolve failure codes', () => {
      expect(classifyResolveFailureCode('INVALID_INPUT')).toBe('invalid_input');
      expect(classifyResolveFailureCode('UNSUPPORTED_URL')).toBe('unsupported_url');
      expect(classifyResolveFailureCode('UNSUPPORTED_PLATFORM')).toBe('unsupported_platform');
      expect(classifyResolveFailureCode('PLAYLIST_NOT_FOUND')).toBe('playlist_not_found');
      expect(classifyResolveFailureCode('USER_NOT_FOUND')).toBe('user_not_found');
      expect(classifyResolveFailureCode('UPSTREAM_ERROR')).toBe('upstream_error');
      expect(classifyResolveFailureCode('UPSTREAM_TIMEOUT')).toBe('upstream_timeout');
      expect(classifyResolveFailureCode('INCOMPLETE_PLAYLIST')).toBe('incomplete_playlist');
      expect(classifyResolveFailureCode('PARSE_ERROR')).toBe('parse_error');
      expect(classifyResolveFailureCode('FORBIDDEN')).toBe('forbidden');
      expect(classifyResolveFailureCode('RATE_LIMITED')).toBe('rate_limited');
      expect(classifyResolveFailureCode('AMBIGUOUS_INPUT')).toBe('ambiguous_input');
      expect(classifyResolveFailureCode('INTERNAL_ERROR')).toBe('internal_error');
      expect(classifyResolveFailureCode('SOME_RANDOM_CRASH')).toBe('internal_error');
      expect(classifyResolveFailureCode(undefined)).toBe('internal_error');
    });

    it('maps codes to bounded failure classes', () => {
      // input
      expect(classifyResolveFailureClass('INVALID_INPUT')).toBe('input');
      expect(classifyResolveFailureClass('UNSUPPORTED_URL')).toBe('input');
      expect(classifyResolveFailureClass('UNSUPPORTED_PLATFORM')).toBe('input');
      // not_found
      expect(classifyResolveFailureClass('PLAYLIST_NOT_FOUND')).toBe('not_found');
      expect(classifyResolveFailureClass('USER_NOT_FOUND')).toBe('not_found');
      // ambiguous
      expect(classifyResolveFailureClass('AMBIGUOUS_INPUT')).toBe('ambiguous');
      // auth
      expect(classifyResolveFailureClass('FORBIDDEN')).toBe('auth');
      // upstream
      expect(classifyResolveFailureClass('UPSTREAM_ERROR')).toBe('upstream');
      // timeout
      expect(classifyResolveFailureClass('UPSTREAM_TIMEOUT')).toBe('timeout');
      // incomplete
      expect(classifyResolveFailureClass('INCOMPLETE_PLAYLIST')).toBe('incomplete');
      // parse
      expect(classifyResolveFailureClass('PARSE_ERROR')).toBe('parse');
      // internal
      expect(classifyResolveFailureClass('INTERNAL_ERROR')).toBe('internal');
      expect(classifyResolveFailureClass('UNKNOWN')).toBe('internal');
    });

    it('bounds resolve failure stages and safely falls back to finalization', () => {
      expect(classifyResolveFailureStage('input_validation')).toBe('input_validation');
      expect(classifyResolveFailureStage('routing')).toBe('routing');
      expect(classifyResolveFailureStage('short_link_resolution')).toBe('short_link_resolution');
      expect(classifyResolveFailureStage('playlist_resolution')).toBe('playlist_resolution');
      expect(classifyResolveFailureStage('user_resolution')).toBe('user_resolution');
      expect(classifyResolveFailureStage('disambiguation_probe')).toBe('disambiguation_probe');
      expect(classifyResolveFailureStage('provider_fetch')).toBe('provider_fetch');
      expect(classifyResolveFailureStage('finalization')).toBe('finalization');
      // Invalid or arbitrary input must fallback safely to finalization
      expect(classifyResolveFailureStage('malicious_unbounded_stage')).toBe('finalization');
      expect(classifyResolveFailureStage('url_detection')).toBe('finalization');
      expect(classifyResolveFailureStage('')).toBe('finalization');
      expect(classifyResolveFailureStage(null)).toBe('finalization');
      expect(classifyResolveFailureStage(undefined)).toBe('finalization');
    });

    it('normalizes requested type into bounded enum and shields raw input', () => {
      expect(classifyResolveRequestedType('auto')).toBe('auto');
      expect(classifyResolveRequestedType('playlist')).toBe('playlist');
      expect(classifyResolveRequestedType('user')).toBe('user');
      expect(classifyResolveRequestedType('user_playlists')).toBe('user');
      expect(classifyResolveRequestedType(undefined)).toBe('auto');
      expect(classifyResolveRequestedType('malicious_type_injection')).toBe('unknown');
    });

    it('normalizes requested platform into bounded enum and shields raw input', () => {
      expect(classifyResolveRequestedPlatform('auto')).toBe('auto');
      expect(classifyResolveRequestedPlatform('qqmusic')).toBe('qqmusic');
      expect(classifyResolveRequestedPlatform('netease')).toBe('netease');
      expect(classifyResolveRequestedPlatform('kugou')).toBe('kugou');
      expect(classifyResolveRequestedPlatform('qishui')).toBe('qishui');
      expect(classifyResolveRequestedPlatform(undefined)).toBe('auto');
      expect(classifyResolveRequestedPlatform('spotify_secret_key')).toBe('unknown');
    });

    it('normalizes analytics platform', () => {
      expect(classifyAnalyticsPlatform('qqmusic')).toBe('qqmusic');
      expect(classifyAnalyticsPlatform('netease')).toBe('netease');
      expect(classifyAnalyticsPlatform('kugou')).toBe('kugou');
      expect(classifyAnalyticsPlatform('qishui')).toBe('qishui');
      expect(classifyAnalyticsPlatform('other')).toBe('unknown');
      expect(classifyAnalyticsPlatform(undefined)).toBe('unknown');
    });

    it('normalizes provider failure path', () => {
      expect(classifyProviderFailurePath('primary')).toBe('primary');
      expect(classifyProviderFailurePath('fallback')).toBe('fallback');
      expect(classifyProviderFailurePath('both')).toBe('both');
      expect(classifyProviderFailurePath('not_applicable')).toBe('not_applicable');
      expect(classifyProviderFailurePath(undefined)).toBe('not_applicable');
      expect(classifyProviderFailurePath('invalid')).toBe('unknown');
    });
  });
});
