import { ProviderError } from '../../models/playlist';

let activeRequests = 0;
const pendingRequests: Array<() => void> = [];
async function connectionSlot(): Promise<() => void> {
  if (activeRequests >= 2) await new Promise<void>(resolve => pendingRequests.push(resolve));
  else activeRequests++;
  return () => {
    const next = pendingRequests.shift();
    if (next) next();
    else activeRequests--;
  };
}

// Per-invocation budget: includes redirects, token refresh and retries.
export type TextExtractor = (chunk: string, done: boolean) => string | undefined;

export class RequestBudget {
  count = 0;
  lastUrl = '';
  private refreshed = false;
  readonly deadline = Date.now() + 25_000;
  constructor(private readonly hosts: ReadonlySet<string>) {}

  async get(url: string, headers: Record<string, string> = {}, allow404 = false, extract?: TextExtractor): Promise<string> {
    let target = new URL(url);
    let retry = 0;
    for (let redirect = 0; redirect <= 3; redirect++) {
      if (target.protocol !== 'https:' || target.username || target.password || target.port || !this.hosts.has(target.hostname)) {
        throw new ProviderError('UNSUPPORTED_URL', '不支持此链接的跳转目标。');
      }
      if (++this.count > 40 || Date.now() >= this.deadline) {
        throw new ProviderError('UPSTREAM_TIMEOUT', '歌单解析超过请求预算，请稍后重试。', 504);
      }
      let response: Response;
      const release = await connectionSlot();
      try {
        if (Date.now() >= this.deadline) throw new Error('deadline');
        response = await fetch(target.toString(), {
          headers, redirect: 'manual', signal: AbortSignal.timeout(Math.max(1, this.deadline - Date.now())),
        });
      } catch {
        release();
        throw new ProviderError('UPSTREAM_TIMEOUT', '上游请求失败或超时。', 504);
      }
      try {
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          await response.body?.cancel();
          if (!location || redirect === 3) throw new ProviderError('UNSUPPORTED_URL', '歌单链接跳转次数过多。');
          const next = new URL(location, target);
          if (next.origin !== target.origin) headers = {};
          target = next;
          continue;
        }
        if (!response.ok && !(allow404 && response.status === 404)) {
          const status = response.status;
          const hint = Number(response.headers.get('retry-after'));
          await response.body?.cancel();
          if (status >= 500 && retry++ < 1 && Date.now() + 500 < this.deadline) {
            await new Promise(resolve => setTimeout(resolve, 500));
            redirect--;
            continue;
          }
          if (response.status === 429 || response.status === 403) {
            throw new ProviderError('RATE_LIMITED', '上游暂时限制访问，请稍后再试。', 429, { retryAfterSeconds: Number.isFinite(hint) && hint > 0 ? Math.min(86400, Math.ceil(hint)) : 60 });
          }
          if (response.status === 404) throw new ProviderError('PLAYLIST_NOT_FOUND', '歌单不存在或未公开。', 404);
          throw new ProviderError('UPSTREAM_ERROR', '上游暂时无法返回歌单。', 502, { upstreamStatus: status });
        }
        // Bound response memory, including chunked bodies without Content-Length.
        this.lastUrl = target.toString();
        if (!response.body) throw new ProviderError('PARSE_ERROR', '上游返回空响应。', 502);
        // Native fetch bodies can arrive in ~2 KiB pieces. Coalesce them inside
        // workerd rather than scheduling a JS continuation for each tiny chunk.
        // Node/test streams retain the portable default-reader path.
        const bulk = typeof ReadableStreamBYOBReader !== 'undefined' &&
          typeof ReadableStreamBYOBReader.prototype.readAtLeast === 'function';
        const byob = bulk ? response.body.getReader({ mode: 'byob' }) : undefined;
        const reader = byob || response.body.getReader();
        const decoder = new TextDecoder();
        const chunks: string[] = [];
        let size = 0;
        for (;;) {
          const { done, value } = byob
            ? await byob.readAtLeast(65_536, new Uint8Array(65_536))
            : await (reader as ReadableStreamDefaultReader<Uint8Array>).read();
          if (done) break;
          size += value.byteLength;
          if (size > 8 * 1024 * 1024) {
            await reader.cancel();
            throw new ProviderError('UPSTREAM_ERROR', '上游响应超过安全大小限制。', 502);
          }
          const text = decoder.decode(value, { stream: true });
          if (extract) {
            const result = extract(text, false);
            if (result !== undefined) {
              await reader.cancel();
              return result;
            }
          } else {
            chunks.push(text);
          }
        }
        if (extract) return extract(decoder.decode(), true) ?? '';
        chunks.push(decoder.decode());
        return chunks.join('');
      } catch (error) {
        if (error instanceof ProviderError) throw error;
        throw new ProviderError('UPSTREAM_TIMEOUT', '上游响应读取失败或超时。', 504);
      } finally { release(); }
    }
    throw new ProviderError('UNSUPPORTED_URL', '无法解析跳转链接。');
  }

  async authorized(url: string, headers: Record<string, string>, refresh: () => Promise<string>): Promise<string> {
    try { return await this.get(url, headers); }
    catch (error) {
      if (!this.refreshed && error instanceof ProviderError && (error.details as any)?.upstreamStatus === 401) {
        this.refreshed = true;
        headers.authorization = `Bearer ${await refresh()}`;
        return this.get(url, headers);
      }
      throw error;
    }
  }
}

// Internal-only costs: no URLs or playlist contents are persisted or exposed.
const costs = new WeakMap<object, number>();
export function setRequestCost(playlist: object, count: number): void { costs.set(playlist, count); }
export function getRequestCost(playlist?: object): number | undefined { return playlist ? costs.get(playlist) : undefined; }

export function json(text: string): any {
  try { return JSON.parse(text); }
  catch { throw new ProviderError('PARSE_ERROR', '上游数据格式已变化。', 502); }
}

export function requireTotal(total: unknown): number {
  if (!Number.isInteger(total) || (total as number) < 0) throw new ProviderError('PARSE_ERROR', '无法确认歌单总数。', 502);
  if ((total as number) > 3000) throw new ProviderError('INCOMPLETE_PLAYLIST', '当前最多解析 3000 首的公开歌单。', 422);
  return total as number;
}

export function complete(loaded: number, total: number): void {
  if (loaded !== total) throw new ProviderError('INCOMPLETE_PLAYLIST', '未取得完整歌单，请稍后重试。', 502);
}

export function playlistUrl(input: string, host: string): URL {
  try {
    const url = new URL(input);
    if (url.protocol === 'https:' && url.hostname === host && !url.username && !url.password && !url.port) return url;
  } catch { /* validated below */ }
  throw new ProviderError('INVALID_INPUT', '请提供公开歌单的 HTTPS 长链接。');
}
