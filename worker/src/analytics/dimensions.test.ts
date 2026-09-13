import { describe, it, expect } from 'vitest';
import { classifyInputType, classifyPlaylistSize, classifyLatency, classifyErrorCategory } from './dimensions';

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
      expect(classifyErrorCategory('PARSE_ERROR')).toBe('error_validation');
      expect(classifyErrorCategory('RATE_LIMITED')).toBe('error_rate_limit');
    });

    it('defaults to error_internal for unknown codes', () => {
      expect(classifyErrorCategory('UNKNOWN_CODE')).toBe('error_internal');
      expect(classifyErrorCategory(undefined)).toBe('error_internal');
      expect(classifyErrorCategory('')).toBe('error_internal');
    });
  });
});
