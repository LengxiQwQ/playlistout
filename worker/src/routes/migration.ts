import { isOriginAllowed } from '../cors';
import { checkDualTrackRateLimit, getClientIp } from '../security/rate-limit';

const SOUNDIIZ_ENDPOINT = 'https://soundiiz.com/go/import-playlist';
const SOUNDIIZ_MAX_TRACKS = 200;
const MAX_BODY_BYTES = 256 * 1024;

const ALLOWED_DESTINATIONS = new Set(['spotify', 'apple', 'youtube', 'deezer', 'tidal']);

interface MigrationEnv {
  DB?: D1Database;
  INSIGHTS_ADMIN_TOKEN?: string;
}

interface MigrationTrackInput {
  title?: unknown;
  artists?: unknown;
  album?: unknown;
  isrc?: unknown;
}

interface MigrationRequestBody {
  title?: unknown;
  description?: unknown;
  destination?: unknown;
  sourcePlatform?: unknown;
  trackCount?: unknown;
  loadedTrackCount?: unknown;
  isPartial?: unknown;
  tracks?: unknown;
}

function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string>,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...headers,
      ...extraHeaders,
    },
  });
}

function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function cleanArtists(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const artists = value
    .slice(0, 10)
    .map((artist) => cleanString(artist, 200))
    .filter(Boolean);
  return artists.length > 0 ? artists : undefined;
}

function cleanIsrc(value: unknown): string | undefined {
  const isrc = cleanString(value, 20).replace(/[-\s]/g, '').toUpperCase();
  return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc) ? isrc : undefined;
}

function isTrustedWebRequest(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (origin) return isOriginAllowed(origin);

  const referer = request.headers.get('Referer');
  if (!referer) return false;
  try {
    return isOriginAllowed(new URL(referer).origin);
  } catch {
    return false;
  }
}

function validateShareUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const allowedHost = hostname === 'soundiiz.com' || hostname.endsWith('.soundiiz.com');
    if (
      url.protocol !== 'https:' ||
      !allowedHost ||
      !url.pathname.startsWith('/go/import-playlist/')
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

async function recordMigrationAggregate(
  db: D1Database | undefined,
  sourcePlatform: string,
  destination: string,
): Promise<void> {
  if (!db || typeof db.prepare !== 'function') return;

  try {
    const date = new Date().toISOString().slice(0, 10);
    const platform = /^[a-z0-9_-]{1,24}$/i.test(sourcePlatform) ? sourcePlatform.toLowerCase() : 'all';
    const target = destination || 'other';

    const aggregateSql = `
      INSERT INTO aggregate_stats (date, platform, metric, count)
      VALUES (?1, ?2, 'migration_soundiiz', 1)
      ON CONFLICT (date, platform, metric)
      DO UPDATE SET count = count + 1;
    `;

    const perfSql = `
      INSERT INTO daily_performance_stats (date, platform, dimension, value, count)
      VALUES (?1, ?2, 'migration_destination', ?3, 1)
      ON CONFLICT (date, platform, dimension, value)
      DO UPDATE SET count = count + 1;
    `;

    await db.batch([
      db.prepare(aggregateSql).bind(date, platform),
      db.prepare(aggregateSql).bind('TOTAL', platform),
      db.prepare(perfSql).bind(date, platform, target),
      db.prepare(perfSql).bind('TOTAL', platform, target),
    ]);
  } catch (error) {
    console.error('Failed to record migration aggregate stats:', error);
  }
}

export async function handleSoundiizMigration(
  request: Request,
  env: MigrationEnv,
  responseHeaders: Record<string, string>,
  ctx?: ExecutionContext,
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse(
      {
        success: false,
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' },
      },
      405,
      responseHeaders,
      { Allow: 'POST, OPTIONS' },
    );
  }

  if (!isTrustedWebRequest(request)) {
    return jsonResponse(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: 'This migration endpoint is only available from the Playlist Out web app.' },
      },
      403,
      responseHeaders,
    );
  }

  const clientIp = getClientIp(request);
  const rate = await checkDualTrackRateLimit(
    request,
    clientIp,
    'migration_soundiiz',
    env.INSIGHTS_ADMIN_TOKEN || '',
  );
  if (!rate.allowed) {
    return jsonResponse(
      {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many migration requests. Please wait a moment and try again.' },
      },
      429,
      responseHeaders,
      { 'Retry-After': String(rate.resetSeconds) },
    );
  }

  const contentLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonResponse(
      {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Migration request is too large.' },
      },
      413,
      responseHeaders,
    );
  }

  let body: MigrationRequestBody;
  try {
    body = (await request.json()) as MigrationRequestBody;
  } catch {
    return jsonResponse(
      {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Invalid JSON body.' },
      },
      400,
      responseHeaders,
    );
  }

  const title = cleanString(body.title, 200);
  const description = cleanString(body.description, 800);
  const sourcePlatform = cleanString(body.sourcePlatform, 24) || 'all';
  const destination =
    typeof body.destination === 'string' && ALLOWED_DESTINATIONS.has(body.destination)
      ? body.destination
      : undefined;

  if (!title) {
    return jsonResponse(
      {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Missing playlist title.' },
      },
      400,
      responseHeaders,
    );
  }

  if (!Array.isArray(body.tracks) || body.tracks.length < 1 || body.tracks.length > SOUNDIIZ_MAX_TRACKS) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: `Soundiiz migration supports between 1 and ${SOUNDIIZ_MAX_TRACKS} tracks.`,
        },
      },
      400,
      responseHeaders,
    );
  }

  const tracklist = (body.tracks as MigrationTrackInput[]).map((track, index) => {
    const trackTitle = cleanString(track?.title, 300);
    if (!trackTitle) {
      throw new Error(`MISSING_TRACK_TITLE:${index}`);
    }

    const artists = cleanArtists(track?.artists);
    const album = cleanString(track?.album, 300);
    const isrc = cleanIsrc(track?.isrc);

    return {
      title: trackTitle,
      ...(artists ? { artists } : {}),
      ...(album ? { album } : {}),
      ...(isrc ? { isrc } : {}),
    };
  });

  try {
    const upstreamResponse = await fetch(SOUNDIIZ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'PlaylistOut/2.0 (+https://playlistout.lengxiqwq.com)',
      },
      body: JSON.stringify({
        title,
        sourceName: 'Playlist Out',
        sourceLogo: 'https://playlistout.lengxiqwq.com/logo-180.png',
        ...(description ? { description } : {}),
        ...(destination ? { destination } : {}),
        tracklist,
      }),
    });

    let upstreamBody: any = null;
    try {
      upstreamBody = await upstreamResponse.json();
    } catch {
      upstreamBody = null;
    }

    if (!upstreamResponse.ok || upstreamBody?.status !== 'success') {
      return jsonResponse(
        {
          success: false,
          error: {
            code: 'UPSTREAM_ERROR',
            message: cleanString(upstreamBody?.message, 300) || 'Soundiiz could not create the migration page.',
          },
        },
        502,
        responseHeaders,
      );
    }

    const shareUrl = validateShareUrl(upstreamBody?.shareUrl);
    if (!shareUrl) {
      return jsonResponse(
        {
          success: false,
          error: { code: 'UPSTREAM_ERROR', message: 'Soundiiz returned an invalid migration URL.' },
        },
        502,
        responseHeaders,
      );
    }

    const statsTask = recordMigrationAggregate(env.DB, sourcePlatform, destination || 'other');
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(statsTask);
    } else {
      await statsTask;
    }

    return jsonResponse(
      {
        success: true,
        data: {
          shareUrl,
          nbTracks: Number(upstreamBody?.nbTracks) || tracklist.length,
          expiresAt:
            typeof upstreamBody?.expiresAt === 'number' ? upstreamBody.expiresAt : undefined,
        },
      },
      200,
      responseHeaders,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('MISSING_TRACK_TITLE:')) {
      const index = error.message.split(':')[1] || '?';
      return jsonResponse(
        {
          success: false,
          error: { code: 'INVALID_INPUT', message: `Missing track title at index ${index}.` },
        },
        400,
        responseHeaders,
      );
    }

    console.error('Soundiiz migration request failed:', error);
    return jsonResponse(
      {
        success: false,
        error: { code: 'UPSTREAM_ERROR', message: 'Unable to reach Soundiiz right now.' },
      },
      502,
      responseHeaders,
    );
  }
}
