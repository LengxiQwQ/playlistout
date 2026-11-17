import { describe, it, expect, vi, afterEach } from 'vitest';
import { RequestBudget, requireTotal, complete } from './http';
import { spotifyId } from '../spotify/input';
import { normalizeSpotifyTrack } from '../spotify/normalize';
import { appleInput } from '../applemusic/input';
import { normalizeAppleTrack } from '../applemusic/normalize';
import { defaultPlaylistPipeline } from '../../pipeline';
import { normalizeAnalyticsPlatformV2 } from '../../analytics/context';
import { classifyAnalyticsPlatform, classifyInputType } from '../../analytics/dimensions';

afterEach(() => vi.unstubAllGlobals());
describe('International playlist boundaries', () => {
  it('reads every Spotify page and reuses the anonymous token', async () => {
    vi.resetModules();
    const item = {itemV2:{data:{__typename:'Track',uri:'spotify:track:example',name:'A',artists:{items:[{profile:{name:'B'}}]}}}};
    const offsets: number[] = [];
    let boots = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const u = new URL(input);
      if (u.hostname === 'open.spotify.com') {
        boots++;
        return new Response('<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{state:{settings:{session:{accessToken:'fixture-only',isAnonymous:true,accessTokenExpirationTimestampMs:Date.now()+300000}}}}}})+'</script>');
      }
      offsets.push(JSON.parse(u.searchParams.get('variables')!).offset);
      return Response.json({data:{playlistV2:{name:'Example',content:{totalCount:2,items:[item]}}}});
    }));
    const { fetchSpotifyPlaylist } = await import('../spotify/client');
    const url = 'https://open.spotify.com/playlist/1234567890123456789012';
    const p = await fetchSpotifyPlaylist(url);
    expect(p.tracks).toHaveLength(2);
    await fetchSpotifyPlaylist(url);
    expect(offsets).toEqual([0,1,0,1]);
    expect(boots).toBe(1);
  });
  it('reads Apple next pages and never silently exports a partial result', async () => {
    vi.resetModules();
    const jwt = 'eyJ'+ 'a'.repeat(25) + '.' + btoa(JSON.stringify({iss:'AMPWebPlay',exp:Math.floor(Date.now()/1000)+200000})).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_') + '.' + 'a'.repeat(30);
    const item = {type:'songs',id:'example',attributes:{name:'A',artistName:'B'}};
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      if (input.endsWith('/us/404')) return new Response('<script src="/assets/index~fixture.js"></script>',{status:404});
      if (input.endsWith('.js')) return new Response(jwt);
      if (input.includes('/tracks')) return Response.json({data:[item]});
      return Response.json({data:[{attributes:{name:'Example',trackCount:2},relationships:{tracks:{data:[item],next:'/v1/catalog/cn/playlists/pl.u-example/tracks?offset=1'}}}]});
    }));
    const { fetchApplePlaylist } = await import('../applemusic/client');
    const p = await fetchApplePlaylist('https://music.apple.com/cn/playlist/pl.u-example');
    expect(p.tracks).toHaveLength(2);
    expect(p.tracks[1].index).toBe(2);
    expect(p.sourceUrl).toContain('/cn/');
  });
  it('validates playlist IDs, country and hostile URLs', () => {
    expect(spotifyId('https://open.spotify.com/intl-en/playlist/1234567890123456789012?si=x')).toBe('1234567890123456789012');
    expect(spotifyId('https://open.spotify.com.evil.test/playlist/1234567890123456789012')).toBeNull();
    expect(spotifyId('https://open.spotify.com/track/1234567890123456789012')).toBeNull();
    expect(appleInput('https://music.apple.com/cn/playlist/%E8%8B%B1/pl.u-example')).toEqual({id:'pl.u-example',country:'cn'});
    expect(appleInput('https://music.apple.com@evil.test/cn/playlist/pl.u-example')).toBeNull();
  });
  it('does not invent status, VIP, ISRC or drop duplicate entries', async () => {
    const track = normalizeSpotifyTrack({itemV2:{data:{__typename:'Track',uri:'spotify:track:example',name:'A',artists:{items:[{profile:{name:'B'}}]},trackDuration:{totalMilliseconds:1234},albumOfTrack:{name:'C'}}}},1);
    const playlist = {platform:'spotify',id:'p',name:'P',trackCount:2,tracks:[track,{...track,index:2}]};
    await defaultPlaylistPipeline.execute({playlist,platform:'spotify'});
    expect(playlist.tracks).toHaveLength(2);
    expect(track.status).toBe('unknown');
    expect(track.isAvailable).toBeUndefined();
    expect(track.isVip).toBeUndefined();
    expect(track.isrc).toBeUndefined();
    expect(() => normalizeSpotifyTrack({itemV2:{data:{__typename:'Episode'}}},1)).toThrow();
  });
  it('maps Apple metadata while leaving missing duration unknown', () => {
    const t = normalizeAppleTrack({type:'songs',id:'1',attributes:{name:'A',artistName:'B',isrc:'XX123',discNumber:2,releaseDate:'2020-01-01'}},1);
    expect(t).toMatchObject({isrc:'XX123',discNumber:2,releaseDate:'2020-01-01',status:'unknown'});
    expect(t.durationMs).toBeUndefined();
  });
  it('rejects unknown totals and truncation but accepts an empty playlist', () => {
    expect(requireTotal(0)).toBe(0);
    expect(() => requireTotal(undefined)).toThrow();
    expect(() => requireTotal(3001)).toThrow();
    expect(() => complete(99,100)).toThrow();
    expect(() => complete(0,0)).not.toThrow();
  });
  it('blocks redirects before any untrusted network request', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null,{status:302,headers:{location:'https://evil.test/'}}));
    vi.stubGlobal('fetch', fetch);
    await expect(new RequestBudget(new Set(['allowed.test'])).get('https://allowed.test/')).rejects.toMatchObject({code:'UNSUPPORTED_URL'});
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('enforces a total request budget including redirects', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}')));
    vi.stubGlobal('fetch',fetch);
    const budget = new RequestBudget(new Set(['allowed.test']));
    budget.count=40;
    await expect(budget.get('https://allowed.test/')).rejects.toMatchObject({code:'UPSTREAM_TIMEOUT'});
    expect(fetch).not.toHaveBeenCalled();
  });
  it('cancels the unneeded response tail after extraction without consuming it', async () => {
    const cancel = vi.fn();
    const read = vi.fn().mockResolvedValueOnce({done:false,value:new TextEncoder().encode('prefix target;')});
    const getReader = vi.fn().mockReturnValue({read,cancel});
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,status:200,headers:new Headers(),body:{getReader}}));
    const result=await new RequestBudget(new Set(['allowed.test'])).get('https://allowed.test/',{},false,chunk=>chunk.includes('target')?'target':undefined);
    expect(result).toBe('target');
    expect(read).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('uses the Workers bulk reader to coalesce small network packets', async () => {
    const readAtLeast=vi.fn().mockResolvedValueOnce({done:false,value:new TextEncoder().encode('target;')});
    const cancel=vi.fn();
    const getReader=vi.fn().mockReturnValue({readAtLeast,cancel});
    vi.stubGlobal('ReadableStreamBYOBReader',class {readAtLeast(){}});
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,status:200,headers:new Headers(),body:{getReader}}));
    await expect(new RequestBudget(new Set(['allowed.test'])).get('https://allowed.test/',{},false,()=> 'target')).resolves.toBe('target');
    expect(getReader).toHaveBeenCalledWith({mode:'byob'});
    expect(readAtLeast).toHaveBeenCalledWith(65_536,expect.any(Uint8Array));
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('refreshes authorization at most once within the same request budget', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(null, {status:401})));
    const refresh = vi.fn().mockResolvedValue('fixture-refreshed');
    vi.stubGlobal('fetch', fetch);
    const budget = new RequestBudget(new Set(['allowed.test']));
    await expect(budget.authorized('https://allowed.test/', {}, refresh)).rejects.toMatchObject({code:'UPSTREAM_ERROR'});
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(budget.count).toBe(2);
  });
  it.each([403,429])('never retries an upstream %s response immediately', async status => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(null,{status,headers:{'retry-after':'120'}})));
    vi.stubGlobal('fetch',fetch);
    await expect(new RequestBudget(new Set(['allowed.test'])).get('https://allowed.test/')).rejects.toMatchObject({code:'RATE_LIMITED',details:{retryAfterSeconds:120}});
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('bounds response memory and handles stream failures without exposing upstream data', async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(new Uint8Array(8*1024*1024+1))));
    await expect(new RequestBudget(new Set(['allowed.test'])).get('https://allowed.test/')).rejects.toMatchObject({code:'UPSTREAM_ERROR'});
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(new ReadableStream({start(c){c.error(new Error('private upstream message'));}}))));
    await expect(new RequestBudget(new Set(['allowed.test'])).get('https://allowed.test/')).rejects.toMatchObject({code:'UPSTREAM_TIMEOUT',message:'上游响应读取失败或超时。'});
  });
  it.each(['spotify','applemusic'])('keeps %s analytics distinct', platform => {
    expect(normalizeAnalyticsPlatformV2(platform)).toBe(platform);
    expect(classifyAnalyticsPlatform(platform)).toBe(platform);
    expect(classifyInputType(platform === 'spotify' ? 'https://open.spotify.com/playlist/example' : 'https://music.apple.com/cn/playlist/pl.example')).toBe('web_url');
  });
});
