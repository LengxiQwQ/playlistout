/**
 * Universal Input Resolver Service (Public API v1)
 *
 * Implements the core product behavior of PlaylistOut's main search box on the server:
 * 1. Cleans input (strips promotional text, emojis, boundaries)
 * 2. Identifies input kind (single playlist, user profile, short link, numeric ID)
 * 3. Identifies platform (QQ Music, NetEase Cloud Music, KuGou, Qishui)
 * 4. Resolves explicit disambiguation parameters (type, platform)
 * 5. Executes concurrent probing for ambiguous numeric IDs (returning 409 AMBIGUOUS_INPUT with candidates if conflicting)
 * 6. Dispatches to shared playlist/user services
 * 7. Returns normalized envelope: { kind, platform, result }
 */

import {
  type Playlist,
  type UserPlaylistsData,
  type DisambiguationCandidate,
  type ResolveData,
  ProviderError,
} from '../models/playlist';
import { parsePlaylistService } from './playlist-service';
import { fetchUserPlaylistsService } from './user-service';
import { extractCleanUrlOrInput } from '../utils/clean-url';
import { qqMusicProvider } from '../providers/qqmusic';
import { neteaseProvider } from '../providers/netease';
import { kugouProvider } from '../providers/kugou';
import { qishuiProvider } from '../providers/qishui';

export interface ResolveServiceOptions {
  q: string;
  type?: string | null;
  platform?: string | null;
  auth?: {
    token?: string;
    userid?: string;
  };
  request?: Request;
  db?: D1Database;
  ctx?: ExecutionContext;
}

export type SupportedType = 'auto' | 'playlist' | 'user';
export type SupportedPlatform = 'auto' | 'qqmusic' | 'netease' | 'kugou' | 'qishui';

export async function resolveService(
  options: ResolveServiceOptions,
): Promise<ResolveData> {
  const { q, type, platform, auth, request, db, ctx } = options;

  if (!q || q.trim().length === 0) {
    throw new ProviderError('INVALID_INPUT', 'Missing or empty required query parameter: q', 400);
  }

  if (q.length > 2048) {
    throw new ProviderError(
      'INVALID_INPUT',
      'Input parameter q exceeds maximum allowed length of 2048 characters.',
      400,
    );
  }

  // Type parameter validation
  const rawType = (type || 'auto').toLowerCase().trim();
  let normalizedType: SupportedType = 'auto';
  if (rawType === 'playlist') {
    normalizedType = 'playlist';
  } else if (rawType === 'user' || rawType === 'user_playlists') {
    normalizedType = 'user';
  } else if (rawType === 'auto') {
    normalizedType = 'auto';
  } else {
    throw new ProviderError(
      'INVALID_INPUT',
      `Invalid type parameter "${type}". Supported types: auto, playlist, user.`,
      400,
    );
  }

  // Platform parameter validation
  const rawPlatform = (platform || 'auto').toLowerCase().trim();
  let normalizedPlatform: SupportedPlatform = 'auto';
  if (
    rawPlatform === 'auto' ||
    rawPlatform === 'qqmusic' ||
    rawPlatform === 'netease' ||
    rawPlatform === 'kugou' ||
    rawPlatform === 'qishui'
  ) {
    normalizedPlatform = rawPlatform;
  } else {
    throw new ProviderError(
      'UNSUPPORTED_PLATFORM',
      `Unsupported platform "${platform}". Supported platforms: auto, qqmusic, netease, kugou, qishui.`,
      400,
    );
  }

  const cleanInput = extractCleanUrlOrInput(q);
  const trimmed = cleanInput.trim();

  // Check if input is pure numeric ID (4-20 digits)
  const isNumeric = /^\d{4,20}$/.test(trimmed);

  if (!isNumeric) {
    // ── Non-numeric input routing ──

    // 1. Detect explicit user profile URLs
    const isQQProfile =
      /y\.qq\.com/i.test(trimmed) &&
      (/(?:[?&]uin=|[?&]hostuin=|\/profile)/i.test(trimmed));
    const isNeteaseProfile =
      /(?:music\.163\.com|y\.music\.163\.com)/i.test(trimmed) &&
      (/\/user\//i.test(trimmed) || (/[?&]id=\d+/i.test(trimmed) && /user/i.test(trimmed)));
    const isKugouProfile =
      /kugou\.com/i.test(trimmed) &&
      !/(?:songlist|gcid_|special\/single)/i.test(trimmed) &&
      (/\/user/i.test(trimmed) || /\/profile/i.test(trimmed) || /\/home/i.test(trimmed));

    if (isQQProfile || (normalizedPlatform === 'qqmusic' && normalizedType === 'user')) {
      const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
        rawInput: trimmed,
        platformParam: 'qqmusic',
        auth,
      });
      return { kind: 'user_playlists', platform: actualPlatform, result: userData };
    }

    if (isNeteaseProfile || (normalizedPlatform === 'netease' && normalizedType === 'user')) {
      const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
        rawInput: trimmed,
        platformParam: 'netease',
        auth,
      });
      return { kind: 'user_playlists', platform: actualPlatform, result: userData };
    }

    if (isKugouProfile || (normalizedPlatform === 'kugou' && normalizedType === 'user')) {
      const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
        rawInput: trimmed,
        platformParam: 'kugou',
        auth,
      });
      return { kind: 'user_playlists', platform: actualPlatform, result: userData };
    }

    // 2. Short links resolution
    if (/163cn\.tv/i.test(trimmed)) {
      if (normalizedType === 'user') {
        const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
          rawInput: trimmed,
          platformParam: 'netease',
          auth,
        });
        return { kind: 'user_playlists', platform: actualPlatform, result: userData };
      }
      if (normalizedType === 'playlist') {
        const { playlist, platform: actualPlatform } = await parsePlaylistService({
          rawInput: trimmed,
          platformParam: 'netease',
          auth,
          request,
          db,
          ctx,
        });
        return { kind: 'playlist', platform: actualPlatform, result: playlist };
      }
      // auto: try single playlist first, fallback to user playlists
      try {
        const { playlist, platform: actualPlatform } = await parsePlaylistService({
          rawInput: trimmed,
          platformParam: 'netease',
          auth,
          request,
          db,
          ctx,
        });
        return { kind: 'playlist', platform: actualPlatform, result: playlist };
      } catch {
        try {
          const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
            rawInput: trimmed,
            platformParam: 'netease',
            auth,
          });
          return { kind: 'user_playlists', platform: actualPlatform, result: userData };
        } catch {
          throw new ProviderError(
            'PLAYLIST_NOT_FOUND',
            'Failed to resolve NetEase short link as playlist or user profile.',
            404,
          );
        }
      }
    }

    if (/t\d?\.kugou\.com/i.test(trimmed)) {
      if (normalizedType === 'user') {
        const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
          rawInput: trimmed,
          platformParam: 'kugou',
          auth,
        });
        return { kind: 'user_playlists', platform: actualPlatform, result: userData };
      }
      try {
        const { playlist, platform: actualPlatform } = await parsePlaylistService({
          rawInput: trimmed,
          platformParam: 'kugou',
          auth,
          request,
          db,
          ctx,
        });
        return { kind: 'playlist', platform: actualPlatform, result: playlist };
      } catch (err: unknown) {
        if (auth?.token && auth?.userid) {
          try {
            const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
              rawInput: trimmed,
              platformParam: 'kugou',
              auth,
            });
            return { kind: 'user_playlists', platform: actualPlatform, result: userData };
          } catch {
            // fall through
          }
        }
        throw err;
      }
    }

    if (/qishui\.douyin\.com\/s\//i.test(trimmed)) {
      const { playlist, platform: actualPlatform } = await parsePlaylistService({
        rawInput: trimmed,
        platformParam: 'qishui',
        auth,
        request,
        db,
        ctx,
      });
      return { kind: 'playlist', platform: actualPlatform, result: playlist };
    }

    // 3. Known single playlist URLs
    const platformParam = normalizedPlatform !== 'auto' ? normalizedPlatform : null;
    const { playlist, platform: actualPlatform } = await parsePlaylistService({
      rawInput: trimmed,
      platformParam,
      auth,
      request,
      db,
      ctx,
    });
    return { kind: 'playlist', platform: actualPlatform, result: playlist };
  }

  // ── Numeric input routing & disambiguation ──

  // Case 1: Explicit type AND explicit platform
  if (normalizedType !== 'auto' && normalizedPlatform !== 'auto') {
    if (normalizedType === 'playlist') {
      const { playlist, platform: actualPlatform } = await parsePlaylistService({
        rawInput: trimmed,
        platformParam: normalizedPlatform,
        auth,
        request,
        db,
        ctx,
      });
      return { kind: 'playlist', platform: actualPlatform, result: playlist };
    } else {
      const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
        rawInput: trimmed,
        platformParam: normalizedPlatform,
        auth,
      });
      return { kind: 'user_playlists', platform: actualPlatform, result: userData };
    }
  }

  // Case 2: Explicit platform, auto type -> Probe single vs user within that platform
  if (normalizedPlatform !== 'auto' && normalizedType === 'auto') {
    if (normalizedPlatform === 'qishui') {
      const { playlist, platform: actualPlatform } = await parsePlaylistService({
        rawInput: trimmed,
        platformParam: 'qishui',
        auth,
        request,
        db,
        ctx,
      });
      return { kind: 'playlist', platform: actualPlatform, result: playlist };
    }

    if (normalizedPlatform === 'kugou') {
      if (auth?.token && auth?.userid) {
        const [singleRes, userRes] = await Promise.allSettled([
          parsePlaylistService({ rawInput: trimmed, platformParam: 'kugou', auth, request, db, ctx }),
          fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'kugou', auth }),
        ]);

        const candidates: DisambiguationCandidate[] = [];
        if (singleRes.status === 'fulfilled') {
          candidates.push({
            id: singleRes.value.playlist.id,
            kind: 'playlist',
            platform: 'kugou',
            title: singleRes.value.playlist.name,
            subtitle: `创建者: ${singleRes.value.playlist.creator || '未知'}`,
            trackCount: singleRes.value.playlist.trackCount,
            coverUrl: singleRes.value.playlist.coverUrl,
          });
        }
        if (userRes.status === 'fulfilled' && userRes.value.userData.playlists.length > 0) {
          candidates.push({
            id: userRes.value.userData.userId,
            kind: 'user_playlists',
            platform: 'kugou',
            title: userRes.value.userData.nickname || `酷狗用户 (${trimmed})`,
            subtitle: `包含 ${userRes.value.userData.total || userRes.value.userData.playlists.length} 个公开歌单`,
            trackCount: userRes.value.userData.total || userRes.value.userData.playlists.length,
            coverUrl: userRes.value.userData.playlists[0]?.coverUrl,
          });
        }

        if (candidates.length > 1) {
          throw new ProviderError(
            'AMBIGUOUS_INPUT',
            'Numeric ID matched both KuGou playlist and user profile. Please specify &type=playlist or &type=user to disambiguate.',
            409,
            { candidates },
          );
        }
        if (singleRes.status === 'fulfilled') {
          return { kind: 'playlist', platform: 'kugou', result: singleRes.value.playlist };
        }
        if (userRes.status === 'fulfilled') {
          return { kind: 'user_playlists', platform: 'kugou', result: userRes.value.userData };
        }
        throw new ProviderError('PLAYLIST_NOT_FOUND', `Target with ID "${trimmed}" not found on KuGou.`, 404);
      }

      const { playlist, platform: actualPlatform } = await parsePlaylistService({
        rawInput: trimmed,
        platformParam: 'kugou',
        auth,
        request,
        db,
        ctx,
      });
      return { kind: 'playlist', platform: actualPlatform, result: playlist };
    }

    if (normalizedPlatform === 'qqmusic') {
      const [singleRes, userRes] = await Promise.allSettled([
        parsePlaylistService({ rawInput: trimmed, platformParam: 'qqmusic', auth, request, db, ctx }),
        fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'qqmusic', auth }),
      ]);

      const candidates: DisambiguationCandidate[] = [];
      if (singleRes.status === 'fulfilled') {
        candidates.push({
          id: singleRes.value.playlist.id,
          kind: 'playlist',
          platform: 'qqmusic',
          title: singleRes.value.playlist.name,
          subtitle: `创建者: ${singleRes.value.playlist.creator || '未知'}`,
          trackCount: singleRes.value.playlist.trackCount,
          coverUrl: singleRes.value.playlist.coverUrl,
        });
      }
      if (userRes.status === 'fulfilled' && userRes.value.userData.playlists.length > 0) {
        candidates.push({
          id: userRes.value.userData.userId,
          kind: 'user_playlists',
          platform: 'qqmusic',
          title: userRes.value.userData.nickname || `QQ 用户 (${trimmed})`,
          subtitle: `包含 ${userRes.value.userData.total || userRes.value.userData.playlists.length} 个公开歌单`,
          trackCount: userRes.value.userData.total || userRes.value.userData.playlists.length,
          coverUrl: userRes.value.userData.playlists[0]?.coverUrl,
        });
      }

      if (candidates.length > 1) {
        throw new ProviderError(
          'AMBIGUOUS_INPUT',
          'Numeric ID matched both QQ Music playlist and QQ user profile. Please specify &type=playlist or &type=user to disambiguate.',
          409,
          { candidates },
        );
      }
      if (singleRes.status === 'fulfilled') {
        return { kind: 'playlist', platform: 'qqmusic', result: singleRes.value.playlist };
      }
      if (userRes.status === 'fulfilled') {
        return { kind: 'user_playlists', platform: 'qqmusic', result: userRes.value.userData };
      }
      throw new ProviderError('PLAYLIST_NOT_FOUND', `Target with ID "${trimmed}" not found on QQ Music.`, 404);
    }

    if (normalizedPlatform === 'netease') {
      const [singleRes, userRes] = await Promise.allSettled([
        parsePlaylistService({ rawInput: trimmed, platformParam: 'netease', auth, request, db, ctx }),
        fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'netease', auth }),
      ]);

      const candidates: DisambiguationCandidate[] = [];
      if (singleRes.status === 'fulfilled') {
        candidates.push({
          id: singleRes.value.playlist.id,
          kind: 'playlist',
          platform: 'netease',
          title: singleRes.value.playlist.name,
          subtitle: `创建者: ${singleRes.value.playlist.creator || '未知'}`,
          trackCount: singleRes.value.playlist.trackCount,
          coverUrl: singleRes.value.playlist.coverUrl,
        });
      }
      if (userRes.status === 'fulfilled' && userRes.value.userData.playlists.length > 0) {
        candidates.push({
          id: userRes.value.userData.userId,
          kind: 'user_playlists',
          platform: 'netease',
          title: userRes.value.userData.nickname || `网易云用户 (${trimmed})`,
          subtitle: `包含 ${userRes.value.userData.total || userRes.value.userData.playlists.length} 个公开歌单`,
          trackCount: userRes.value.userData.total || userRes.value.userData.playlists.length,
          coverUrl: userRes.value.userData.playlists[0]?.coverUrl,
        });
      }

      if (candidates.length > 1) {
        throw new ProviderError(
          'AMBIGUOUS_INPUT',
          'Numeric ID matched both NetEase playlist and NetEase user profile. Please specify &type=playlist or &type=user to disambiguate.',
          409,
          { candidates },
        );
      }
      if (singleRes.status === 'fulfilled') {
        return { kind: 'playlist', platform: 'netease', result: singleRes.value.playlist };
      }
      if (userRes.status === 'fulfilled') {
        return { kind: 'user_playlists', platform: 'netease', result: userRes.value.userData };
      }
      throw new ProviderError('PLAYLIST_NOT_FOUND', `Target with ID "${trimmed}" not found on NetEase Cloud Music.`, 404);
    }
  }

  // Case 3: Explicit type, auto platform -> Probe cross-platform
  if (normalizedType !== 'auto' && normalizedPlatform === 'auto') {
    if (normalizedType === 'playlist') {
      const probeTasks = [
        parsePlaylistService({ rawInput: trimmed, platformParam: 'qqmusic', auth, request, db, ctx }),
        parsePlaylistService({ rawInput: trimmed, platformParam: 'netease', auth, request, db, ctx }),
      ];
      if (trimmed.length >= 19) {
        probeTasks.push(
          parsePlaylistService({ rawInput: trimmed, platformParam: 'qishui', auth, request, db, ctx }),
        );
      }

      const results = await Promise.allSettled(probeTasks);
      const candidates: DisambiguationCandidate[] = [];
      const successful: { platform: 'qqmusic' | 'netease' | 'qishui'; playlist: Playlist }[] = [];

      for (const res of results) {
        if (res.status === 'fulfilled') {
          successful.push(res.value as any);
          candidates.push({
            id: res.value.playlist.id,
            kind: 'playlist',
            platform: res.value.platform,
            title: res.value.playlist.name,
            subtitle: `创建者: ${res.value.playlist.creator || '未知'}`,
            trackCount: res.value.playlist.trackCount,
            coverUrl: res.value.playlist.coverUrl,
          });
        }
      }

      if (candidates.length > 1) {
        throw new ProviderError(
          'AMBIGUOUS_INPUT',
          'Numeric ID matched playlists across multiple platforms. Please specify &platform= to disambiguate.',
          409,
          { candidates },
        );
      }
      if (candidates.length === 1) {
        return {
          kind: 'playlist',
          platform: successful[0].platform,
          result: successful[0].playlist,
        };
      }
      throw new ProviderError('PLAYLIST_NOT_FOUND', `Playlist with ID "${trimmed}" was not found on supported platforms.`, 404);
    }

    if (normalizedType === 'user') {
      const [qqUserRes, neteaseUserRes] = await Promise.allSettled([
        fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'qqmusic', auth }),
        fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'netease', auth }),
      ]);

      const candidates: DisambiguationCandidate[] = [];
      const successful: { platform: 'qqmusic' | 'netease'; userData: UserPlaylistsData }[] = [];

      if (qqUserRes.status === 'fulfilled' && qqUserRes.value.userData.playlists.length > 0) {
        successful.push(qqUserRes.value as any);
        candidates.push({
          id: qqUserRes.value.userData.userId,
          kind: 'user_playlists',
          platform: 'qqmusic',
          title: qqUserRes.value.userData.nickname || `QQ 用户 (${trimmed})`,
          subtitle: `包含 ${qqUserRes.value.userData.total || qqUserRes.value.userData.playlists.length} 个公开歌单`,
          trackCount: qqUserRes.value.userData.total || qqUserRes.value.userData.playlists.length,
          coverUrl: qqUserRes.value.userData.playlists[0]?.coverUrl,
        });
      }

      if (neteaseUserRes.status === 'fulfilled' && neteaseUserRes.value.userData.playlists.length > 0) {
        successful.push(neteaseUserRes.value as any);
        candidates.push({
          id: neteaseUserRes.value.userData.userId,
          kind: 'user_playlists',
          platform: 'netease',
          title: neteaseUserRes.value.userData.nickname || `网易云用户 (${trimmed})`,
          subtitle: `包含 ${neteaseUserRes.value.userData.total || neteaseUserRes.value.userData.playlists.length} 个公开歌单`,
          trackCount: neteaseUserRes.value.userData.total || neteaseUserRes.value.userData.playlists.length,
          coverUrl: neteaseUserRes.value.userData.playlists[0]?.coverUrl,
        });
      }

      if (candidates.length > 1) {
        throw new ProviderError(
          'AMBIGUOUS_INPUT',
          'Numeric ID matched user profiles across multiple platforms. Please specify &platform= to disambiguate.',
          409,
          { candidates },
        );
      }
      if (candidates.length === 1) {
        return {
          kind: 'user_playlists',
          platform: successful[0].platform,
          result: successful[0].userData,
        };
      }
      throw new ProviderError('USER_NOT_FOUND', `User profile with ID "${trimmed}" was not found on supported platforms.`, 404);
    }
  }

  // Case 4: Complete auto mode (type === auto AND platform === auto)
  // For IDs >= 19 digits, attempt Qishui playlist first
  if (trimmed.length >= 19) {
    try {
      const qishuiRes = await parsePlaylistService({
        rawInput: trimmed,
        platformParam: 'qishui',
        auth,
        request,
        db,
        ctx,
      });
      return { kind: 'playlist', platform: 'qishui', result: qishuiRes.playlist };
    } catch {
      // Continue to standard 4-way probing
    }
  }

  // 4-way concurrent probing across QQ & NetEase (single playlist & user playlists)
  const [qqSingle, qqUser, neteaseSingle, neteaseUser] = await Promise.allSettled([
    parsePlaylistService({ rawInput: trimmed, platformParam: 'qqmusic', auth, request, db, ctx }),
    fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'qqmusic', auth }),
    parsePlaylistService({ rawInput: trimmed, platformParam: 'netease', auth, request, db, ctx }),
    fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'netease', auth }),
  ]);

  const candidates: DisambiguationCandidate[] = [];
  const successfulResults: ResolveData[] = [];

  if (qqSingle.status === 'fulfilled' && qqSingle.value.playlist.name) {
    successfulResults.push({
      kind: 'playlist',
      platform: 'qqmusic',
      result: qqSingle.value.playlist,
    });
    candidates.push({
      id: qqSingle.value.playlist.id,
      kind: 'playlist',
      platform: 'qqmusic',
      title: qqSingle.value.playlist.name,
      subtitle: `创建者: ${qqSingle.value.playlist.creator || '未知'}`,
      trackCount: qqSingle.value.playlist.trackCount,
      coverUrl: qqSingle.value.playlist.coverUrl,
    });
  }

  if (qqUser.status === 'fulfilled' && qqUser.value.userData.playlists?.length > 0) {
    successfulResults.push({
      kind: 'user_playlists',
      platform: 'qqmusic',
      result: qqUser.value.userData,
    });
    candidates.push({
      id: qqUser.value.userData.userId,
      kind: 'user_playlists',
      platform: 'qqmusic',
      title: qqUser.value.userData.nickname || `QQ 用户 (${trimmed})`,
      subtitle: `包含 ${qqUser.value.userData.total || qqUser.value.userData.playlists.length} 个公开歌单`,
      trackCount: qqUser.value.userData.total || qqUser.value.userData.playlists.length,
      coverUrl: qqUser.value.userData.playlists[0]?.coverUrl,
    });
  }

  if (neteaseSingle.status === 'fulfilled' && neteaseSingle.value.playlist.name) {
    successfulResults.push({
      kind: 'playlist',
      platform: 'netease',
      result: neteaseSingle.value.playlist,
    });
    candidates.push({
      id: neteaseSingle.value.playlist.id,
      kind: 'playlist',
      platform: 'netease',
      title: neteaseSingle.value.playlist.name,
      subtitle: `创建者: ${neteaseSingle.value.playlist.creator || '未知'}`,
      trackCount: neteaseSingle.value.playlist.trackCount,
      coverUrl: neteaseSingle.value.playlist.coverUrl,
    });
  }

  if (neteaseUser.status === 'fulfilled' && neteaseUser.value.userData.playlists?.length > 0) {
    successfulResults.push({
      kind: 'user_playlists',
      platform: 'netease',
      result: neteaseUser.value.userData,
    });
    candidates.push({
      id: neteaseUser.value.userData.userId,
      kind: 'user_playlists',
      platform: 'netease',
      title: neteaseUser.value.userData.nickname || `网易云用户 (${trimmed})`,
      subtitle: `包含 ${neteaseUser.value.userData.total || neteaseUser.value.userData.playlists.length} 个公开歌单`,
      trackCount: neteaseUser.value.userData.total || neteaseUser.value.userData.playlists.length,
      coverUrl: neteaseUser.value.userData.playlists[0]?.coverUrl,
    });
  }

  if (candidates.length === 1) {
    return successfulResults[0];
  }

  if (candidates.length > 1) {
    throw new ProviderError(
      'AMBIGUOUS_INPUT',
      'Numeric ID matched multiple targets across platforms/types. Please specify &platform= and/or &type= to disambiguate.',
      409,
      { candidates },
    );
  }

  throw new ProviderError(
    'PLAYLIST_NOT_FOUND',
    `在 QQ 音乐 与 网易云音乐 中均未找到 ID 为 “${trimmed}” 的公开歌单或用户主页。`,
    404,
  );
}
