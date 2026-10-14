import { useState, useCallback } from 'react';
import type { Playlist } from '../api/types';

export interface UseChannelCacheReturn {
  channelCache: Record<string, Playlist>;
  getCachedChannel: (playlistId: string, channel: string) => Playlist | undefined;
  setCachedChannel: (playlist: Playlist) => void;
  clearChannelCache: () => void;
}

export function useChannelCache(): UseChannelCacheReturn {
  const [channelCache, setChannelCache] = useState<Record<string, Playlist>>({});

  const getCachedChannel = useCallback(
    (playlistId: string, channel: string): Playlist | undefined => {
      const key = `${playlistId}:${channel || 'qishui'}`;
      return channelCache[key];
    },
    [channelCache],
  );

  const setCachedChannel = useCallback((playlist: Playlist) => {
    const key = `${playlist.id}:${playlist.channel || 'qishui'}`;
    setChannelCache((prev) => ({
      ...prev,
      [key]: playlist,
    }));
  }, []);

  const clearChannelCache = useCallback(() => {
    setChannelCache({});
  }, []);

  return {
    channelCache,
    getCachedChannel,
    setCachedChannel,
    clearChannelCache,
  };
}
