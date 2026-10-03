#!/usr/bin/env node
/**
 * MusicFree PlaylistOut Plugin Test Runner
 * 
 * Simulates MusicFree host runtime to validate:
 * 1. Contract & metadata specification (v1.2.0, userVariables, hints)
 * 2. Historical archive version integrity (v1.0.0 pure import, v1.1.0 archive)
 * 3. Local JSON file path import & native platform bridge dispatching (netease, 20, WebFilter, kuwo, qishui, bilibili, migu)
 * 4. UserVariables configuration override (auto vs forced platform)
 * 5. Interception & friendly guidance when pasting direct JSON strings
 * 6. Live online NetEase playlist resolution (end-to-end API test with native netease dispatch)
 * 7. getMediaSource pure placeholder contract (instant null return, zero network overhead)
 * 8. Exception & invalid input fault tolerance
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Colors for terminal output
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

let passedCount = 0;
let failedCount = 0;

function logSection(title) {
  console.log(`\n${COLORS.bold}${COLORS.cyan}=== ${title} ===${COLORS.reset}`);
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ${COLORS.green}✔ PASS${COLORS.reset} ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ${COLORS.red}✖ FAIL${COLORS.reset} ${name}`);
    console.error(`    ${COLORS.red}${err.message}${COLORS.reset}`);
    if (err.stack) {
      console.error(`    ${COLORS.gray}${err.stack.split('\n').slice(1, 4).join('\n    ')}${COLORS.reset}`);
    }
    failedCount++;
  }
}

async function runAllTests() {
  console.log(`${COLORS.bold}🚀 Running MusicFree PlaylistOut Plugin Test Suite${COLORS.reset}`);
  const startTime = Date.now();

  const pluginPath = path.resolve(__dirname, '../src/index.js');
  const plugin = require(pluginPath);

  // ── 1. Contract & Metadata Specification ──────────────────────────
  logSection('1. Plugin Contract & Specification');

  await test('Exports valid metadata conforming to MusicFree standards (v1.2.7)', () => {
    assert.strictEqual(plugin.platform, '把你的歌单带走 (PlaylistOut)', 'Platform must be 把你的歌单带走 (PlaylistOut)');
    assert.strictEqual(plugin.author, 'LengxiQwQ', 'Author must be LengxiQwQ');
    assert.strictEqual(plugin.version, '1.2.7', 'Version must be 1.2.7');
    assert.strictEqual(plugin.appVersion, '>0.1.0-alpha.0', 'appVersion must match specification');
    assert.strictEqual(
      plugin.srcUrl,
      'https://playlistout.lengxiqwq.com/plugins/musicfree.js',
      'srcUrl must point to official production URL'
    );
    assert.strictEqual(plugin.cacheControl, 'no-store', 'cacheControl must be no-store');
    assert.deepStrictEqual(plugin.supportedSearchType, ['sheet'], 'supportedSearchType must be [sheet]');
    assert(Array.isArray(plugin.hints?.importMusicSheet), 'hints.importMusicSheet must be an array');
    assert(plugin.hints.importMusicSheet.length >= 2, 'hints must provide concise user guidance');
    assert(
      plugin.hints.importMusicSheet.some((h) => h.includes('支持平台')),
      'hints must list supported platforms'
    );
    assert(
      plugin.hints.importMusicSheet.some((h) => h.includes('playlistout.lengxiqwq.com')),
      'hints must include official website'
    );
    assert(Array.isArray(plugin.userVariables), 'userVariables must be an array');
    assert(
      plugin.userVariables.some((v) => v.key === 'targetPlatform'),
      'userVariables must include targetPlatform option'
    );
    assert(
      plugin.userVariables.some((v) => v.key === 'fallbackMode'),
      'userVariables must include fallbackMode option'
    );
    assert.strictEqual(typeof plugin.importMusicSheet, 'function', 'importMusicSheet must be a function');
    assert.strictEqual(typeof plugin.getMediaSource, 'function', 'getMediaSource must be a function');
    assert.strictEqual(typeof plugin.getLyric, 'function', 'getLyric must be a function');
    assert.strictEqual(
      plugin.importMusicItem,
      undefined,
      'importMusicItem must be completely removed from exports'
    );
  });

  const distPath = path.resolve(__dirname, '../dist/musicfree.js');
  if (fs.existsSync(distPath)) {
    await test('Distribution artifact (dist/musicfree.js) is valid and executable', () => {
      const distPlugin = require(distPath);
      assert.strictEqual(distPlugin.platform, '把你的歌单带走 (PlaylistOut)');
      assert.strictEqual(distPlugin.version, '1.2.7');
      assert(Array.isArray(distPlugin.userVariables));
      assert.strictEqual(typeof distPlugin.importMusicSheet, 'function');
      assert.strictEqual(typeof distPlugin.getMediaSource, 'function');
      assert.strictEqual(typeof distPlugin.getLyric, 'function');
      assert.strictEqual(distPlugin.importMusicItem, undefined);
    });
  }

  // ── 2. Historical Version Integrity & Archiving ───────────────────
  logSection('2. Historical Version Integrity & Archiving');

  const v100Dist = path.resolve(__dirname, '../dist/musicfree-v1.0.0.js');
  const v100Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.0.0.js');
  await test('Verifies v1.0.0 pure-import archive exists and conforms to spec', () => {
    assert(fs.existsSync(v100Dist), 'dist/musicfree-v1.0.0.js must exist');
    assert(fs.existsSync(v100Web), 'web/public/plugins/musicfree-v1.0.0.js must exist');
    const v100Plugin = require(v100Dist);
    assert.strictEqual(v100Plugin.version, '1.0.0');
    assert.strictEqual(typeof v100Plugin.importMusicSheet, 'function');
    assert.strictEqual(v100Plugin.getMediaSource, undefined, 'v1.0.0 must not export getMediaSource');
  });

  const v110Dist = path.resolve(__dirname, '../dist/musicfree-v1.1.0.js');
  const v110Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.1.0.js');
  await test('Verifies v1.1.0 archive exists and conforms to spec', () => {
    assert(fs.existsSync(v110Dist), 'dist/musicfree-v1.1.0.js must exist');
    assert(fs.existsSync(v110Web), 'web/public/plugins/musicfree-v1.1.0.js must exist');
    const v110Plugin = require(v110Dist);
    assert.strictEqual(v110Plugin.version, '1.1.0');
    assert.strictEqual(typeof v110Plugin.importMusicSheet, 'function');
    assert.strictEqual(typeof v110Plugin.getMediaSource, 'function');
  });

  const v120Dist = path.resolve(__dirname, '../dist/musicfree-v1.2.0.js');
  const v120Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.2.0.js');
  const v121Dist = path.resolve(__dirname, '../dist/musicfree-v1.2.1.js');
  const v121Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.2.1.js');
  const v122Dist = path.resolve(__dirname, '../dist/musicfree-v1.2.2.js');
  const v122Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.2.2.js');
  const v123Dist = path.resolve(__dirname, '../dist/musicfree-v1.2.3.js');
  const v123Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.2.3.js');
  const v124Dist = path.resolve(__dirname, '../dist/musicfree-v1.2.4.js');
  const v124Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.2.4.js');
  const v125Dist = path.resolve(__dirname, '../dist/musicfree-v1.2.5.js');
  const v125Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.2.5.js');
  const v126Dist = path.resolve(__dirname, '../dist/musicfree-v1.2.6.js');
  const v126Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.2.6.js');
  await test('Verifies v1.2.0 through v1.2.6 historical archives exist', () => {
    assert(fs.existsSync(v120Dist), 'dist/musicfree-v1.2.0.js must exist');
    assert(fs.existsSync(v120Web), 'web/public/plugins/musicfree-v1.2.0.js must exist');
    assert(fs.existsSync(v121Dist), 'dist/musicfree-v1.2.1.js must exist');
    assert(fs.existsSync(v121Web), 'web/public/plugins/musicfree-v1.2.1.js must exist');
    assert(fs.existsSync(v122Dist), 'dist/musicfree-v1.2.2.js must exist');
    assert(fs.existsSync(v122Web), 'web/public/plugins/musicfree-v1.2.2.js must exist');
    assert(fs.existsSync(v123Dist), 'dist/musicfree-v1.2.3.js must exist');
    assert(fs.existsSync(v123Web), 'web/public/plugins/musicfree-v1.2.3.js must exist');
    assert(fs.existsSync(v124Dist), 'dist/musicfree-v1.2.4.js must exist');
    assert(fs.existsSync(v124Web), 'web/public/plugins/musicfree-v1.2.4.js must exist');
    assert(fs.existsSync(v125Dist), 'dist/musicfree-v1.2.5.js must exist');
    assert(fs.existsSync(v125Web), 'web/public/plugins/musicfree-v1.2.5.js must exist');
    assert(fs.existsSync(v126Dist), 'dist/musicfree-v1.2.6.js must exist');
    assert(fs.existsSync(v126Web), 'web/public/plugins/musicfree-v1.2.6.js must exist');
  });

  // ── 3. Local JSON File Path Import & Platform Bridge ──────────────
  logSection('3. Local JSON File Path Import & Native Platform Bridge');

  const sampleGenericJson = JSON.stringify({
    generator: 'PlaylistOut',
    generatorUrl: 'https://playlistout.lengxiqwq.com',
    name: '周杰伦经典与精选',
    creator: '杰迷小助手',
    trackCount: 2,
    tracks: [
      {
        index: 1,
        id: '186016',
        title: '晴天',
        artists: ['周杰伦'],
        album: '叶惠美',
        durationMs: 269000,
        coverUrl: 'https://p1.music.126.net/jay-cover.jpg',
      },
      {
        index: 2,
        id: '186017',
        title: '温柔 (Live)',
        artists: ['五月天', '阿信'],
        album: '人生无限公司',
        durationMs: 275400,
        coverUrl: 'https://p1.music.126.net/mayday-cover.jpg',
      },
    ],
  });

  const sampleNeteaseJson = JSON.stringify({
    generator: 'PlaylistOut',
    platform: 'netease',
    name: '网易云热歌榜',
    trackCount: 1,
    tracks: [
      {
        id: '1973665667',
        title: '海屿你',
        artists: ['马也_Crabbit'],
        durationMs: 295940,
      },
    ],
  });

  const sampleQqJson = JSON.stringify({
    generator: 'PlaylistOut',
    platform: 'qq',
    name: 'QQ音乐热歌榜',
    trackCount: 1,
    tracks: [
      {
        id: '0039MnYb0qxYAc',
        title: '夜曲',
        artists: ['周杰伦'],
      },
    ],
  });

  const sampleKugouJson = JSON.stringify({
    generator: 'PlaylistOut',
    platform: 'kugou',
    name: '酷狗TOP500',
    trackCount: 1,
    tracks: [
      {
        id: 'hash12345',
        title: '一路生花',
        artists: ['温奕心'],
      },
    ],
  });

  const sampleKuwoJson = JSON.stringify({
    generator: 'PlaylistOut',
    platform: 'kuwo',
    name: '酷我热歌榜',
    trackCount: 1,
    tracks: [
      {
        id: '123456',
        title: '孤勇者',
        artists: ['陈奕迅'],
      },
    ],
  });

  const sampleQishuiJson = JSON.stringify({
    generator: 'PlaylistOut',
    platform: 'qishui',
    name: '汽水热歌榜',
    trackCount: 1,
    tracks: [
      {
        id: '7100000000',
        title: '可能',
        artists: ['程响'],
      },
    ],
  });

  const sampleBilibiliJson = JSON.stringify({
    generator: 'PlaylistOut',
    platform: 'bilibili',
    name: 'B站音乐榜',
    trackCount: 1,
    tracks: [
      {
        id: 'BV1xx411c7mD',
        title: '达拉崩吧',
        artists: ['周深'],
      },
    ],
  });

  const sampleMiguJson = JSON.stringify({
    generator: 'PlaylistOut',
    platform: 'migu',
    name: '咪咕音乐榜',
    trackCount: 1,
    tracks: [
      {
        id: 'migu600001',
        title: '告白气球',
        artists: ['周杰伦'],
      },
    ],
  });

  const tempGenericPath = path.join(os.tmpdir(), `playlistout_generic_${Date.now()}.json`);
  const tempNeteasePath = path.join(os.tmpdir(), `playlistout_netease_${Date.now()}.json`);
  const tempQqPath = path.join(os.tmpdir(), `playlistout_qq_${Date.now()}.json`);
  const tempKugouPath = path.join(os.tmpdir(), `playlistout_kugou_${Date.now()}.json`);
  const tempKuwoPath = path.join(os.tmpdir(), `playlistout_kuwo_${Date.now()}.json`);
  const tempQishuiPath = path.join(os.tmpdir(), `playlistout_qishui_${Date.now()}.json`);
  const tempBilibiliPath = path.join(os.tmpdir(), `playlistout_bili_${Date.now()}.json`);
  const tempMiguPath = path.join(os.tmpdir(), `playlistout_migu_${Date.now()}.json`);
  const tempBrokenJsonPath = path.join(os.tmpdir(), `playlistout_broken_${Date.now()}.json`);
  const tempEmptyJsonPath = path.join(os.tmpdir(), `playlistout_empty_${Date.now()}.json`);

  fs.writeFileSync(tempGenericPath, sampleGenericJson, 'utf-8');
  fs.writeFileSync(tempNeteasePath, sampleNeteaseJson, 'utf-8');
  fs.writeFileSync(tempQqPath, sampleQqJson, 'utf-8');
  fs.writeFileSync(tempKugouPath, sampleKugouJson, 'utf-8');
  fs.writeFileSync(tempKuwoPath, sampleKuwoJson, 'utf-8');
  fs.writeFileSync(tempQishuiPath, sampleQishuiJson, 'utf-8');
  fs.writeFileSync(tempBilibiliPath, sampleBilibiliJson, 'utf-8');
  fs.writeFileSync(tempMiguPath, sampleMiguJson, 'utf-8');
  fs.writeFileSync(tempBrokenJsonPath, '{ invalid json: ', 'utf-8');
  fs.writeFileSync(tempEmptyJsonPath, JSON.stringify({ tracks: [] }), 'utf-8');

  try {
    await test('Parses generic local .json into compliant IMusicItem[] with PlaylistOut fallback platform', async () => {
      const items = await plugin.importMusicSheet(tempGenericPath);
      assert(Array.isArray(items), 'Output must be an array');
      assert.strictEqual(items.length, 2, 'Should map exactly 2 tracks');

      // First track verification
      const item1 = items[0];
      assert.strictEqual(item1.id, '186016');
      assert.strictEqual(item1.title, '晴天');
      assert.strictEqual(item1.artist, '周杰伦');
      assert.strictEqual(item1.album, '叶惠美');
      assert.strictEqual(item1.artwork, 'https://p1.music.126.net/jay-cover.jpg');
      assert.strictEqual(item1.duration, 269, 'Duration should be converted to seconds');
      assert.strictEqual(item1.platform, 'PlaylistOut');
      assert.strictEqual(item1.url, undefined, 'Must not inject pirate audio URL');

      // Second track verification (multi-artist comma joining)
      const item2 = items[1];
      assert.strictEqual(item2.id, '186017');
      assert.strictEqual(item2.title, '温柔 (Live)');
      assert.strictEqual(item2.artist, '五月天, 阿信', 'Multi-artists must be joined by comma');
      assert.strictEqual(item2.album, '人生无限公司');
      assert.strictEqual(item2.duration, 275, 'Duration rounded to 275s');
      assert.strictEqual(item2.platform, 'PlaylistOut');
    });

    await test('Correctly bridges NetEase playlist to platform "netease" with _src and official song ID', async () => {
      const items = await plugin.importMusicSheet(tempNeteasePath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'netease');
      assert.strictEqual(items[0].id, '1973665667');
      assert.strictEqual(items[0]._src?.netease?.id, '1973665667');
      assert.deepStrictEqual(items[0]._srcOrder, ['netease']);
    });

    await test('Correctly bridges QQ Music playlist to native plugin platform "qq" with _src & songmid', async () => {
      const items = await plugin.importMusicSheet(tempQqPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'qq');
      assert.strictEqual(items[0].id, '0039MnYb0qxYAc');
      assert.strictEqual(items[0].songmid, '0039MnYb0qxYAc');
      assert.strictEqual(items[0]._src?.qq?.mid, '0039MnYb0qxYAc');
      assert.deepStrictEqual(items[0]._srcOrder, ['qq']);

      // Simulate MusicFree host resetMediaItem(item, 'PlaylistOut') overwrite attempt
      items[0].platform = 'PlaylistOut';
      assert.strictEqual(
        items[0].platform,
        'qq',
        'Protected platform getter/setter must resist host resetMediaItem overwrite'
      );
      const cloned = JSON.parse(JSON.stringify(items[0]));
      assert.strictEqual(cloned.platform, 'qq');
    });

    await test('Correctly bridges KuGou playlist to native plugin platform "kugou" with _src.kugou.hash', async () => {
      const items = await plugin.importMusicSheet(tempKugouPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'kugou');
      assert.strictEqual(items[0]._src?.kugou?.hash, 'hash12345');
      assert.deepStrictEqual(items[0]._srcOrder, ['kugou']);
    });

    await test('Correctly bridges KuWo playlist to platform "kuwo"', async () => {
      const items = await plugin.importMusicSheet(tempKuwoPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'kuwo');
      assert.strictEqual(items[0]._src?.kuwo?.id, '123456');
    });

    await test('Correctly bridges QiShui playlist to platform "qishui"', async () => {
      const items = await plugin.importMusicSheet(tempQishuiPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'qishui');
      assert.strictEqual(items[0]._src?.qishui?.trackId, '7100000000');
    });

    await test('Correctly bridges Bilibili playlist to platform "bilibili"', async () => {
      const items = await plugin.importMusicSheet(tempBilibiliPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'bilibili');
    });

    await test('Correctly bridges Migu playlist to platform "migu"', async () => {
      const items = await plugin.importMusicSheet(tempMiguPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'migu');
      assert.strictEqual(items[0]._src?.migu?.contentId, 'migu600001');
    });

    await test('Parses file:/// URI formatted local path into compliant IMusicItem[]', async () => {
      const fileUri = 'file:///' + tempGenericPath.replace(/\\/g, '/');
      const items = await plugin.importMusicSheet(fileUri);
      assert(Array.isArray(items), 'Output must be an array');
      assert.strictEqual(items.length, 2);
      assert.strictEqual(items[0].title, '晴天');
    });

    await test('Rejects non-existent local .json file path with descriptive error', async () => {
      const nonExistentPath = path.join(os.tmpdir(), 'playlistout_non_existent_999999.json');
      await assert.rejects(
        async () => await plugin.importMusicSheet(nonExistentPath),
        /未找到指定的本地歌单文件/
      );
    });

    await test('Rejects local file with invalid JSON syntax', async () => {
      await assert.rejects(
        async () => await plugin.importMusicSheet(tempBrokenJsonPath),
        /JSON 解析失败/
      );
    });

    await test('Rejects local file with empty tracks array', async () => {
      await assert.rejects(
        async () => await plugin.importMusicSheet(tempEmptyJsonPath),
        /未包含任何歌曲/
      );
    });
  } finally {
    try {
      if (fs.existsSync(tempGenericPath)) fs.unlinkSync(tempGenericPath);
      if (fs.existsSync(tempNeteasePath)) fs.unlinkSync(tempNeteasePath);
      if (fs.existsSync(tempQqPath)) fs.unlinkSync(tempQqPath);
      if (fs.existsSync(tempKugouPath)) fs.unlinkSync(tempKugouPath);
      if (fs.existsSync(tempKuwoPath)) fs.unlinkSync(tempKuwoPath);
      if (fs.existsSync(tempQishuiPath)) fs.unlinkSync(tempQishuiPath);
      if (fs.existsSync(tempBilibiliPath)) fs.unlinkSync(tempBilibiliPath);
      if (fs.existsSync(tempMiguPath)) fs.unlinkSync(tempMiguPath);
      if (fs.existsSync(tempBrokenJsonPath)) fs.unlinkSync(tempBrokenJsonPath);
      if (fs.existsSync(tempEmptyJsonPath)) fs.unlinkSync(tempEmptyJsonPath);
    } catch (_) {}
  }

  // ── 4. userVariables Configuration Override ───────────────────────
  logSection('4. userVariables Configuration Override');

  await test('Respects userVariables to force a specific audio routing platform', async () => {
    // 1. Mock MusicFree environment env.getUserVariables() returning targetPlatform='kuwo'
    globalThis.env = {
      getUserVariables: () => ({ targetPlatform: 'kuwo' }),
    };

    const tempTestPath = path.join(os.tmpdir(), `playlistout_test_forced_${Date.now()}.json`);
    try {
      fs.writeFileSync(tempTestPath, sampleNeteaseJson, 'utf-8');
      const items = await plugin.importMusicSheet(tempTestPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'kuwo', 'Should force platform to kuwo despite being netease playlist');

      // 2. Mock targetPlatform='PlaylistOut'
      globalThis.env = {
        getUserVariables: () => ({ targetPlatform: 'PlaylistOut' }),
      };
      const items2 = await plugin.importMusicSheet(tempTestPath);
      assert.strictEqual(items2[0].platform, 'PlaylistOut', 'Should force platform to PlaylistOut');

      // 3. Reset to auto
      globalThis.env = {
        getUserVariables: () => ({ targetPlatform: 'auto' }),
      };
      const items3 = await plugin.importMusicSheet(tempTestPath);
      assert.strictEqual(items3[0].platform, 'netease', 'auto mode should restore original platform');
    } finally {
      delete globalThis.env;
      try {
        if (fs.existsSync(tempTestPath)) fs.unlinkSync(tempTestPath);
      } catch (_) {}
    }
  });

  await test('Correctly parses fallbackMode userVariables (strict, similar, silent_skip)', async () => {
    // 1. Default when unset
    globalThis.env = { getUserVariables: () => ({}) };
    const resStrict = await plugin.getMediaSource({ id: 'test_1', title: '不存在的歌_test', artist: '未知' });
    assert.strictEqual(resStrict, null);

    // 2. Similar mode
    globalThis.env = { getUserVariables: () => ({ fallbackMode: 'similar' }) };
    const resSimilar = await plugin.getMediaSource({ id: 'test_2', title: '不存在的歌_test', artist: '未知' });
    assert.strictEqual(resSimilar, null);

    // 3. Silent skip mode
    globalThis.env = { getUserVariables: () => ({ fallbackMode: 'silent_skip' }) };
    const resSilent = await plugin.getMediaSource({ id: 'test_3', title: '不存在的歌_test', artist: '未知' });
    assert.strictEqual(resSilent, null);

    delete globalThis.env;
  });

  // ── 5. Direct JSON Pasting Interception ─────────────────────────────
  logSection('5. Direct JSON Pasting Interception');

  await test('Intercepts direct JSON object string starting with { with friendly guidance', async () => {
    await assert.rejects(
      async () => await plugin.importMusicSheet('{"tracks":[{"title":"晴天"}]}'),
      /请勿直接粘贴 JSON 长文本/
    );
  });

  await test('Intercepts direct JSON array string starting with [ with friendly guidance', async () => {
    await assert.rejects(
      async () => await plugin.importMusicSheet('[{"title":"晴天"}]'),
      /请勿直接粘贴 JSON 长文本/
    );
  });

  // ── 6. Real Online Live Resolution ────────────────────────────────
  logSection('6. Real Online NetEase Playlist Resolution (E2E)');

  const realNeteaseUrl = 'https://music.163.com/playlist?id=3778678';

  async function retryOnRateLimit(fn, maxRetries = 3, delayMs = 3000) {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i < maxRetries && /Too many requests|429/i.test(err.message)) {
          console.log(
            `    ${COLORS.gray}Rate limit encountered, waiting ${delayMs / 1000}s before retry ${i + 1}/${maxRetries}...${COLORS.reset}`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw err;
      }
    }
  }

  await test(`Resolves live NetEase playlist (${realNeteaseUrl}) and maps platform to "netease"`, async () => {
    const items = await retryOnRateLimit(() => plugin.importMusicSheet(realNeteaseUrl));

    assert(Array.isArray(items), 'Items must be an array');
    assert(items.length > 0, `Should resolve at least 1 track, got ${items.length}`);
    console.log(`    ${COLORS.gray}Resolved ${items.length} tracks from production API${COLORS.reset}`);

    // Verify first 5 items schema conformance
    const sampleItems = items.slice(0, 5);
    for (let i = 0; i < sampleItems.length; i++) {
      const it = sampleItems[i];
      assert(Boolean(it.id), `Track ${i + 1} must have id`);
      assert(Boolean(it.title), `Track ${i + 1} must have title`);
      assert(Boolean(it.artist), `Track ${i + 1} must have artist`);
      assert(
        typeof it.duration === 'number' && it.duration >= 0,
        `Track ${i + 1} duration must be non-negative number`
      );
      assert.strictEqual(it.platform, 'netease', `Track ${i + 1} platform must bridge to netease`);
      assert(Boolean(it._src?.netease?.id), `Track ${i + 1} must include _src.netease.id`);
      assert.strictEqual(it.url, undefined, 'Must not inject pirate audio URL');
    }
  });

  // ── 7. getMediaSource & getLyric Bridge Specification ──────────────
  logSection('7. getMediaSource & getLyric Bridge Specification');

  await test('getMediaSource & getLyric cleanly return safe defaults in bare test host', async () => {
    const start = Date.now();
    const res1 = await plugin.getMediaSource({ title: '晴天', artist: '周杰伦' });
    const duration1 = Date.now() - start;

    assert.strictEqual(res1, null, 'getMediaSource must return null in bare test environment');
    assert(duration1 < 20, `Must return in <20ms, took ${duration1}ms`);

    const res2 = await plugin.getMediaSource(null);
    assert.strictEqual(res2, null);

    const lrc1 = await plugin.getLyric(null);
    assert.strictEqual(typeof lrc1?.rawLrc, 'string', 'getLyric must always return object with rawLrc string');
  });

  // ── 8. Exception & Invalid Input Fault Tolerance ──────────────────
  logSection('8. Exception & Fault Tolerance');

  await test('Rejects empty or non-string input gracefully in importMusicSheet', async () => {
    await assert.rejects(
      async () => await plugin.importMusicSheet(''),
      /请输入有效|不能为空/
    );
    await assert.rejects(
      async () => await plugin.importMusicSheet('   '),
      /请输入有效|不能为空/
    );
    await assert.rejects(
      async () => await plugin.importMusicSheet(null),
      /请输入有效/
    );
  });

  await test('Handles unsupported online URL with clean API error', async () => {
    await assert.rejects(
      async () => await plugin.importMusicSheet('https://example.com/unsupported-page'),
      /解析失败/
    );
  });

  // ── Test Summary ──────────────────────────────────────────────────
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n${COLORS.bold}========================================${COLORS.reset}`);
  if (failedCount === 0) {
    console.log(
      `${COLORS.bold}${COLORS.green}✔ ALL ${passedCount} TESTS PASSED in ${duration}s! (100% Green)${COLORS.reset}`
    );
  } else {
    console.error(
      `${COLORS.bold}${COLORS.red}✖ ${failedCount} TESTS FAILED, ${passedCount} passed in ${duration}s${COLORS.reset}`
    );
  }
  console.log(`${COLORS.bold}========================================${COLORS.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
