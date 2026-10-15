#!/usr/bin/env node
/**
 * MusicFree PlaylistOut Plugin Test Runner (v2.1.1)
 * 
 * Simulates MusicFree host runtime to validate:
 * 1. Contract & metadata specification (userVariables, hints)
 * 2. Current UI/import guidance contract
 * 3. Local JSON file path import & native platform routing (netease, qq, kugou, kuwo, qishui, bilibili, migu)
 * 4. userVariables configuration (KuGou Token credentials only)
 * 5. Direct JSON string / large-sheet import support
 * 6. Live online NetEase playlist resolution (end-to-end API test, optional RUN_E2E=1)
 * 7. getMediaSource / getLyric host-channel rescue contract (strict matching, auto fallback)
 * 8. Exception & invalid input fault tolerance, Hermes syntax integrity
 * 9. Embedded fallback sources (QQ/NetEase/KuGou allowlist + strict matching + negative caches)
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
  const pkg = require(path.resolve(__dirname, '../package.json'));

  // ── 1. Contract & Metadata Specification ──────────────────────────
  logSection('1. Plugin Contract & Specification');

  await test('Exports valid metadata conforming to MusicFree standards', () => {
    assert.strictEqual(plugin.platform, '把你的歌单带走', 'Platform must be 把你的歌单带走');
    assert.strictEqual(plugin.author, 'LengxiQwQ', 'Author must be LengxiQwQ');
    assert.strictEqual(plugin.version, pkg.version, 'Runtime version must match package.json');
    assert.strictEqual(plugin.appVersion, '>0.1.0-alpha.0', 'appVersion must match specification');
    assert.strictEqual(
      plugin.srcUrl,
      'https://playlistout.lengxiqwq.com/plugins/musicfree/把你的歌单带走-PlaylistOut.js',
      'srcUrl must point to official production URL'
    );
    assert.strictEqual(plugin.cacheControl, 'no-store', 'cacheControl must be no-store');
    assert.deepStrictEqual(plugin.supportedSearchType, ['sheet'], 'supportedSearchType must be [sheet]');
    assert(
      typeof plugin.description === 'string' && plugin.description.includes('https://playlistout.lengxiqwq.com'),
      'description must provide clickable markdown link to website'
    );
    assert(Array.isArray(plugin.hints?.importMusicSheet), 'hints.importMusicSheet must be an array');
    assert.strictEqual(plugin.hints.importMusicSheet.length, 5, 'hints must provide 5 concise lines');
    assert(
      plugin.hints.importMusicSheet[0].includes('【支持平台】'),
      'first hint must list supported platforms'
    );
    assert(
      plugin.hints.importMusicSheet.some((h) => h.includes('【播放说明】')),
      'hints must explain playback depends on installed source plugins'
    );
    assert(
      plugin.hints.importMusicSheet.some((h) => h.includes('【酷狗限制】')),
      'hints must explain KuGou limitation'
    );
    assert(
      plugin.hints.importMusicSheet.some((h) => h.includes('【完整解析】')),
      'hints must provide full import guidance with Token'
    );
    assert(
      plugin.hints.importMusicSheet.some((h) => h.includes('【官方网站】')),
      'hints must include official website'
    );
    assert(Array.isArray(plugin.userVariables), 'userVariables must be an array');
    assert.deepStrictEqual(
      plugin.userVariables.map((v) => v.key),
      ['kugouToken', 'kugouUserid'],
      'userVariables must stay slim: only KuGou credentials (no targetPlatform / fallbackMode)'
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

  const distPath = path.resolve(__dirname, '../dist/把你的歌单带走-PlaylistOut.js');
  if (fs.existsSync(distPath)) {
    await test('Distribution artifact (dist/把你的歌单带走-PlaylistOut.js) is valid and executable', () => {
      const distPlugin = require(distPath);
      assert.strictEqual(distPlugin.platform, '把你的歌单带走');
      assert.strictEqual(distPlugin.version, pkg.version);
      assert(Array.isArray(distPlugin.userVariables));
      assert.strictEqual(typeof distPlugin.importMusicSheet, 'function');
      assert.strictEqual(typeof distPlugin.getMediaSource, 'function');
      assert.strictEqual(typeof distPlugin.getLyric, 'function');
      assert.strictEqual(distPlugin.importMusicItem, undefined);
    });
  }

  // ── 2. Current UI & Import Guidance Contract ─────────────────────
  logSection('2. Current UI & Import Guidance Contract');

  await test('UI modal placeholder does not contain "口令" and uses concise phrasing', () => {
    const srcCode = fs.readFileSync(pluginPath, 'utf-8');
    assert(!srcCode.includes('分享口令'), 'Source must not contain "分享口令"');
    assert(
      srcCode.includes("var targetPlaceholder = '粘贴歌单分享链接（QQ/网易/酷狗/汽水）';"),
      'Placeholder must match clean prompt'
    );
  });

  await test('UI modal contains both desktop buttons: local file picker and clean official website jump', () => {
    const srcCode = fs.readFileSync(pluginPath, 'utf-8');
    assert(srcCode.includes("'📂 选择本地 JSON'"), 'Source must contain local file picker button');
    assert(srcCode.includes("'🌐 去官网解析歌单'"), 'Source must contain clean official website button');
    assert(!srcCode.includes("'🌐 官网获取酷狗Token'"), 'Source must not have complicated website button');
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
        artist: '周杰伦',
        album: '叶惠美',
        durationMs: 269000,
        coverUrl: 'https://p1.music.126.net/jay-cover.jpg',
      },
      {
        index: 2,
        id: '186017',
        title: '温柔 (Live)',
        artist: '五月天, 阿信',
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
        artist: '马也_Crabbit',
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
        artist: '周杰伦',
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
        artist: '温奕心',
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
        artist: '陈奕迅',
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
        artist: '程响',
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
        artist: '周深',
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
        artist: '周杰伦',
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
    globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = true;

    await test('Parses generic local .json with native platform routing (netease inferred)', async () => {
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
      assert.strictEqual(item1.platform, 'netease', 'Native platform inferred from 126.net cover URL');
      assert.strictEqual(item1._originPlatform, 'netease');
      assert.strictEqual(item1._src.netease.id, '186016');
      assert.strictEqual(item1.url, undefined, 'Must not inject pirate audio URL');

      // Second track verification (multi-artist comma joining)
      const item2 = items[1];
      assert.strictEqual(item2.id, '186017');
      assert.strictEqual(item2.title, '温柔 (Live)');
      assert.strictEqual(item2.artist, '五月天, 阿信', 'Multi-artists must be joined by comma');
      assert.strictEqual(item2.album, '人生无限公司');
      assert.strictEqual(item2.duration, 275, 'Duration rounded to 275s');
      assert.strictEqual(item2.platform, 'netease');
    });

    await test('Correctly routes NetEase playlist to native netease platform with _src metadata', async () => {
      const items = await plugin.importMusicSheet(tempNeteasePath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'netease');
      assert.strictEqual(items[0]._originPlatform, 'netease');
      assert.strictEqual(items[0].id, '1973665667');
      assert.strictEqual(items[0]._src?.netease?.id, '1973665667');
      assert.deepStrictEqual(items[0]._srcOrder, ['netease']);
    });

    await test('Correctly routes QQ Music playlist to native qq platform with _src & songmid', async () => {
      const items = await plugin.importMusicSheet(tempQqPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'qq');
      assert.strictEqual(items[0]._originPlatform, 'qq');
      assert.strictEqual(items[0].id, '0039MnYb0qxYAc');
      assert.strictEqual(items[0].songmid, '0039MnYb0qxYAc');
      assert.strictEqual(items[0]._src?.qq?.mid, '0039MnYb0qxYAc');
      assert.deepStrictEqual(items[0]._srcOrder, ['qq']);
    });

    await test('Correctly routes KuGou playlist to native kugou platform with _src.kugou.hash', async () => {
      const items = await plugin.importMusicSheet(tempKugouPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'kugou');
      assert.strictEqual(items[0]._originPlatform, 'kugou');
      assert.strictEqual(items[0]._src?.kugou?.hash, 'hash12345');
      assert.deepStrictEqual(items[0]._srcOrder, ['kugou']);
    });

    await test('Correctly routes KuWo playlist to native kuwo platform', async () => {
      const items = await plugin.importMusicSheet(tempKuwoPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'kuwo');
      assert.strictEqual(items[0]._originPlatform, 'kuwo');
      assert.strictEqual(items[0]._src?.kuwo?.id, '123456');
    });

    await test('Correctly routes QiShui playlist to native qishui platform', async () => {
      const items = await plugin.importMusicSheet(tempQishuiPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'qishui');
      assert.strictEqual(items[0]._originPlatform, 'qishui');
      assert.strictEqual(items[0]._src?.qishui?.trackId, '7100000000');
    });

    await test('Correctly routes Bilibili playlist to native bilibili platform', async () => {
      const items = await plugin.importMusicSheet(tempBilibiliPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'bilibili');
      assert.strictEqual(items[0]._originPlatform, 'bilibili');
    });

    await test('Correctly routes Migu playlist to native migu platform', async () => {
      const items = await plugin.importMusicSheet(tempMiguPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, 'migu');
      assert.strictEqual(items[0]._originPlatform, 'migu');
      assert.strictEqual(items[0]._src?.migu?.contentId, 'migu600001');
    });

    await test('Protects native platform against host resetMediaItem overwrite & survives JSON round-trip', async () => {
      const items = await plugin.importMusicSheet(tempQqPath);
      const item = items[0];

      // Simulate MusicFree host resetMediaItem(item, this.plugin.name) brand rewrite
      item.platform = '把你的歌单带走';
      assert.strictEqual(item.platform, 'qq', 'Brand rewrite must be rejected');
      item.platform = 'PlaylistOut';
      assert.strictEqual(item.platform, 'qq', 'Legacy brand rewrite must be rejected');

      // Serialization always persists the native platform (survives DB reload / IPC)
      const roundTrip = JSON.parse(JSON.stringify(item));
      assert.strictEqual(roundTrip.platform, 'qq', 'JSON round-trip must keep native platform');
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
    delete globalThis.__PLAYLISTOUT_MOCK_ELECTRON__;
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

  // ── 3.5. Cross-Host Native Routing Consistency & Overwrite Guard ──
  logSection('3.5. Cross-Host Native Routing Consistency & Overwrite Guard');

  try {
    globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = false;

    await test('Mobile mode: delegates tracks to respective native platforms with full metadata', async () => {
      const neteaseItems = await plugin.importMusicSheet(sampleNeteaseJson);
      assert.strictEqual(neteaseItems[0].platform, 'netease');
      assert.strictEqual(neteaseItems[0]._originPlatform, 'netease');
      assert.strictEqual(neteaseItems[0]._src?.netease?.id, '1973665667');

      const qqItems = await plugin.importMusicSheet(sampleQqJson);
      assert.strictEqual(qqItems[0].platform, 'qq');
      assert.strictEqual(qqItems[0]._originPlatform, 'qq');
      assert.strictEqual(qqItems[0].songmid, '0039MnYb0qxYAc');

      const kugouItems = await plugin.importMusicSheet(sampleKugouJson);
      assert.strictEqual(kugouItems[0].platform, 'kugou');
      assert.strictEqual(kugouItems[0]._originPlatform, 'kugou');
      assert.strictEqual(kugouItems[0]._src?.kugou?.hash, 'hash12345');

      const kuwoItems = await plugin.importMusicSheet(sampleKuwoJson);
      assert.strictEqual(kuwoItems[0].platform, 'kuwo');

      const qishuiItems = await plugin.importMusicSheet(sampleQishuiJson);
      assert.strictEqual(qishuiItems[0].platform, 'qishui');

      const biliItems = await plugin.importMusicSheet(sampleBilibiliJson);
      assert.strictEqual(biliItems[0].platform, 'bilibili');

      const miguItems = await plugin.importMusicSheet(sampleMiguJson);
      assert.strictEqual(miguItems[0].platform, 'migu');
    });

    await test('Desktop & mobile produce identical native routing (unified across hosts)', async () => {
      const samples = [sampleNeteaseJson, sampleQqJson, sampleKugouJson, sampleKuwoJson, sampleQishuiJson, sampleBilibiliJson, sampleMiguJson];

      globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = true;
      const desktopPlatforms = [];
      try {
        for (let i = 0; i < samples.length; i++) {
          const items = await plugin.importMusicSheet(samples[i]);
          desktopPlatforms.push(items[0].platform);
        }
      } finally {
        delete globalThis.__PLAYLISTOUT_MOCK_ELECTRON__;
      }

      globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = false;
      const mobilePlatforms = [];
      try {
        for (let i = 0; i < samples.length; i++) {
          const items = await plugin.importMusicSheet(samples[i]);
          mobilePlatforms.push(items[0].platform);
        }
      } finally {
        delete globalThis.__PLAYLISTOUT_MOCK_ELECTRON__;
      }

      assert.deepStrictEqual(desktopPlatforms, ['netease', 'qq', 'kugou', 'kuwo', 'qishui', 'bilibili', 'migu']);
      assert.deepStrictEqual(desktopPlatforms, mobilePlatforms, 'Desktop and mobile must route identically');
    });

    await test('Mobile mode: host brand rewrite is rejected, native platform survives serialization', async () => {
      const items = await plugin.importMusicSheet(sampleNeteaseJson);
      const item = items[0];
      item.platform = '把你的歌单带走';
      assert.strictEqual(item.platform, 'netease', 'Brand rewrite must be rejected on mobile');
      assert.strictEqual(JSON.parse(JSON.stringify(item)).platform, 'netease');
    });

    await test('Mobile mode: File picker trigger rejects with mobile-friendly guidance', async () => {
      await assert.rejects(
        async () => await plugin.importMusicSheet('__pick_file__'),
        /移动端不支持系统文件弹窗/
      );
      await assert.rejects(
        async () => await plugin.importMusicSheet('浏览'),
        /移动端不支持系统文件弹窗/
      );
    });

    await test('Mobile mode: Local file path rejects with mobile-friendly guidance to paste JSON directly', async () => {
      await assert.rejects(
        async () => await plugin.importMusicSheet('/sdcard/Music/playlist.json'),
        /移动端无法直接读取设备文件路径/
      );
    });
  } finally {
    delete globalThis.__PLAYLISTOUT_MOCK_ELECTRON__;
  }

  // ── 4. userVariables Configuration (KuGou credentials) ────────────
  logSection('4. userVariables Configuration (KuGou credentials)');

  await test('Correctly parses kugouToken & kugouUserid userVariables formats', async () => {
    // 1. Composite "token:userid" in kugouToken
    globalThis.env = {
      getUserVariables: () => ({ kugouToken: 'mock_token_abc:1425711902' }),
    };
    const c1 = plugin._getKugouCredentials();
    assert.deepStrictEqual(c1, { token: 'mock_token_abc', userid: '1425711902' });

    // 2. Inverted "userid:token" in kugouToken
    globalThis.env = {
      getUserVariables: () => ({ kugouToken: '1425711902:mock_token_abc' }),
    };
    const c2 = plugin._getKugouCredentials();
    assert.deepStrictEqual(c2, { token: 'mock_token_abc', userid: '1425711902' });

    // 3. JSON format in kugouToken
    globalThis.env = {
      getUserVariables: () => ({ kugouToken: JSON.stringify({ token: 'tok_json', userid: 'uid_json' }) }),
    };
    const c3 = plugin._getKugouCredentials();
    assert.deepStrictEqual(c3, { token: 'tok_json', userid: 'uid_json' });

    // 4. Separate kugouToken and kugouUserid
    globalThis.env = {
      getUserVariables: () => ({ kugouToken: 'sep_token', kugouUserid: 'sep_userid' }),
    };
    const c4 = plugin._getKugouCredentials();
    assert.deepStrictEqual(c4, { token: 'sep_token', userid: 'sep_userid' });

    // 5. Pure token
    globalThis.env = {
      getUserVariables: () => ({ kugouToken: 'only_token' }),
    };
    const c5 = plugin._getKugouCredentials();
    assert.deepStrictEqual(c5, { token: 'only_token', userid: '' });

    // 6. Unset
    globalThis.env = { getUserVariables: () => ({}) };
    assert.strictEqual(plugin._getKugouCredentials(), null);

    delete globalThis.env;
  });

  // ── 5. Direct JSON Pasting Support (Mobile & Desktop) ─────────────
  logSection('5. Direct JSON Pasting Support (Mobile & Desktop)');

  await test('Directly parses JSON object string starting with { into valid tracks', async () => {
    const rawJson = JSON.stringify({
      tracks: [
        { title: '晴天', artist: '周杰伦', id: '186016' },
        { title: '花海', artist: '周杰伦', id: '186017' },
      ],
    });
    const items = await plugin.importMusicSheet(rawJson);
    assert(Array.isArray(items), 'Items must be an array');
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].title, '晴天');
    assert.strictEqual(items[1].title, '花海');
  });

  await test('Directly parses JSON array string starting with [ into valid tracks', async () => {
    const rawArray = JSON.stringify([
      { title: '七里香', artist: '周杰伦', id: '186018' },
    ]);
    const items = await plugin.importMusicSheet(rawArray);
    assert(Array.isArray(items), 'Items must be an array');
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].title, '七里香');
  });

  await test('Rejects malformed direct JSON text with clean error', async () => {
    await assert.rejects(
      async () => await plugin.importMusicSheet('{ invalid json: tracks '),
      /JSON 解析失败/
    );
  });

  await test('Seamlessly parses large JSON string (500+ tracks from website clipboard) on Desktop and Mobile', async () => {
    const largeTracks = [];
    for (let i = 1; i <= 500; i++) {
      largeTracks.push({
        index: i,
        id: `song_${i}`,
        title: `酷狗金曲_${i}`,
        artist: '歌手A',
        album: '经典专辑',
        sourceUrl: 'https://www.kugou.com/song/abc',
      });
    }
    const largeJsonStr = JSON.stringify({
      generator: 'Playlist Out',
      generatorUrl: 'https://playlistout.lengxiqwq.com',
      platform: 'kugou',
      name: '酷狗500首大歌单',
      trackCount: 500,
      tracks: largeTracks,
    });

    // Test Desktop mode
    globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = true;
    try {
      const desktopItems = await plugin.importMusicSheet(largeJsonStr);
      assert.strictEqual(desktopItems.length, 500);
      assert.strictEqual(desktopItems[0].title, '酷狗金曲_1');
      assert.strictEqual(desktopItems[0].platform, 'kugou');
      assert.strictEqual(desktopItems[499].title, '酷狗金曲_500');
      assert.strictEqual(desktopItems[499].platform, 'kugou');
    } finally {
      delete globalThis.__PLAYLISTOUT_MOCK_ELECTRON__;
    }

    // Test Mobile mode (native delegation)
    globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = false;
    try {
      const mobileItems = await plugin.importMusicSheet(largeJsonStr);
      assert.strictEqual(mobileItems.length, 500);
      assert.strictEqual(mobileItems[0].platform, 'kugou');
      assert.strictEqual(mobileItems[499].platform, 'kugou');
    } finally {
      delete globalThis.__PLAYLISTOUT_MOCK_ELECTRON__;
    }
  });

  // ── 6. Real Online Live Resolution ────────────────────────────────
  logSection('6. Real Online NetEase Playlist Resolution (E2E)');

  if (process.env.RUN_E2E !== '1') {
    console.log(
      `    ${COLORS.gray}Skipped: these tests hit the live production API. Set RUN_E2E=1 to enable.${COLORS.reset}`
    );
  } else {
    const realNeteaseUrl = 'https://music.163.com/playlist?id=3778678';

  async function retryOnRateLimit(fn, maxRetries = 3, delayMs = 3000) {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i < maxRetries && /Too many requests|429|aborted|timed out|timeout|ETIMEDOUT|ECONNRESET|fetch failed|网络失败|502|503|504/i.test(err.message)) {
          console.log(
            `    ${COLORS.gray}Transient failure encountered (${err.message}), waiting ${delayMs / 1000}s before retry ${i + 1}/${maxRetries}...${COLORS.reset}`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw err;
      }
    }
  }

  await test(`Resolves live NetEase playlist (${realNeteaseUrl}) with native netease routing in Desktop mode`, async () => {
    globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = true;
    try {
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
        assert.strictEqual(it.platform, 'netease', `Track ${i + 1} platform must route to native netease`);
        assert.strictEqual(it._originPlatform, 'netease', `Track ${i + 1} _originPlatform must bridge to netease`);
        assert(Boolean(it._src?.netease?.id), `Track ${i + 1} must include _src.netease.id`);
        assert.strictEqual(it.url, undefined, 'Must not inject pirate audio URL');
      }
    } finally {
      delete globalThis.__PLAYLISTOUT_MOCK_ELECTRON__;
    }
  });

  await test(`Resolves live NetEase playlist (${realNeteaseUrl}) in Mobile mode (defaults to native netease delegation)`, async () => {
    globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = false;
    try {
      const items = await retryOnRateLimit(() => plugin.importMusicSheet(realNeteaseUrl));
      assert(Array.isArray(items), 'Items must be an array');
      assert(items.length > 0, `Should resolve at least 1 track, got ${items.length}`);
      assert.strictEqual(items[0].platform, 'netease', 'Default mobile mode delegates to native platform netease');
      assert.strictEqual(items[0]._originPlatform, 'netease');
      assert(Boolean(items[0]._src?.netease?.id));
    } finally {
      delete globalThis.__PLAYLISTOUT_MOCK_ELECTRON__;
    }
  });
  }

  // ── 7. getMediaSource & getLyric Host-Channel Contract ────────────
  logSection('7. getMediaSource & getLyric Host-Channel Contract');

  await test('getMediaSource & getLyric cleanly return safe defaults in bare test host (no bridge)', async () => {
    plugin._setHostBridge(null);
    // 模拟内置兜底通道全部不可用：裸宿主下必须安全降级，绝不抛错
    globalThis.axios = { get: async () => ({ status: 200, data: null, headers: {} }) };
    try {
      const start = Date.now();
      const res1 = await plugin.getMediaSource({ title: '晴天', artist: '周杰伦' });
      const duration1 = Date.now() - start;

      assert.strictEqual(res1, null, 'getMediaSource must return null in bare test environment');
      assert(duration1 < 20, `Must return in <20ms, took ${duration1}ms`);

      const res2 = await plugin.getMediaSource(null);
      assert.strictEqual(res2, null);

      const res3 = await plugin.getMediaSource({
        id: 'test_1',
        title: '晴天',
        artist: '周杰伦',
        platform: '把你的歌单带走',
      });
      assert.strictEqual(res3, null, 'Embedded channels unavailable: bare host must yield null');

      const lrc1 = await plugin.getLyric(null);
      assert.strictEqual(typeof lrc1?.rawLrc, 'string', 'getLyric must always return object with rawLrc string');

      const lrc2 = await plugin.getLyric({
        id: 'test_2',
        title: '晴天',
        artist: '周杰伦',
        platform: '把你的歌单带走',
      });
      assert.deepStrictEqual(lrc2, { rawLrc: '' }, 'No host bridge: lyric must degrade to empty object');
    } finally {
      delete globalThis.axios;
    }
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

  if (process.env.RUN_E2E === '1') {
    await test('Handles unsupported online URL with clean API error', async () => {
      await assert.rejects(
        async () => await plugin.importMusicSheet('https://example.com/unsupported-page'),
        /解析失败/
      );
    });
  } else {
    console.log(
      `    ${COLORS.gray}Skipped unsupported-URL E2E test (set RUN_E2E=1 to enable).${COLORS.reset}`
    );
  }

  await test('Detects official website trigger and tries opening browser cleanly', async () => {
    assert(plugin._isOfficialWebsiteTrigger('官网'), 'Must recognize 官网');
    assert(plugin._isOfficialWebsiteTrigger('gw'), 'Must recognize gw');
    assert(plugin._isOfficialWebsiteTrigger('https://playlistout.lengxiqwq.com'), 'Must recognize website url');
    assert(!plugin._isOfficialWebsiteTrigger('https://y.qq.com/n/ryqq/playlist/123'), 'Must not match music url');

    await assert.rejects(
      async () => await plugin.importMusicSheet('官网'),
      /在浏览器中打开官网/
    );
    await assert.rejects(
      async () => await plugin.importMusicSheet('gw'),
      /在浏览器中打开官网/
    );
  });

  // ── 8.4. Client Environment Detection & Outgoing Headers ───────────
  logSection('8.4. Client Environment Detection & Outgoing Headers');

  await test('Accurately detects desktop and mobile environments with compliant device-class', () => {
    // Test desktop mode
    globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = true;
    const desktopEnv = plugin._detectClientEnvironment();
    assert.strictEqual(desktopEnv.deviceClass, 'desktop', 'Must detect desktop under Electron mock');
    assert(typeof desktopEnv.os === 'string' && desktopEnv.os.length > 0, 'Must have valid OS');

    const desktopHeaders = plugin._getPlaylistOutHeaders();
    assert.strictEqual(desktopHeaders['X-PlaylistOut-Client-Type'], 'plugin');
    assert.strictEqual(desktopHeaders['X-PlaylistOut-Client-Id'], 'musicfree');
    assert.strictEqual(desktopHeaders['X-PlaylistOut-Client-Version'], pkg.version);
    assert.strictEqual(desktopHeaders['X-PlaylistOut-Device-Class'], 'desktop');
    assert(desktopHeaders['User-Agent'].includes('(desktop;'), 'UA must indicate desktop');

    // Test mobile mode
    globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = false;
    const mobileEnv = plugin._detectClientEnvironment();
    assert.strictEqual(mobileEnv.deviceClass, 'mobile', 'Must detect mobile under non-Electron mock');

    const mobileHeaders = plugin._getPlaylistOutHeaders();
    assert.strictEqual(mobileHeaders['X-PlaylistOut-Device-Class'], 'mobile');
    assert(mobileHeaders['User-Agent'].includes('(mobile;'), 'UA must indicate mobile');

    // Restore
    delete globalThis.__PLAYLISTOUT_MOCK_ELECTRON__;
  });

  // ── 8.5. Hermes Engine Syntax Integrity ───────────────────────────
  logSection('8.5. Android Hermes Engine Syntax Integrity');

  await test('Guarantees 0 optional chaining (?.), 0 nullish coalescing (??), 0 async arrow in source', () => {
    const code = fs.readFileSync(pluginPath, 'utf-8');
    const lines = code.split(/\r?\n/);

    const ocErrors = [];
    const ncErrors = [];
    const aaErrors = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      // Skip comments
      if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        return;
      }
      // Check for ?. outside regex
      if (trimmed.includes('?.') && !/\/\^https\?:\/\//.test(trimmed)) {
        ocErrors.push(`L${idx + 1}: ${trimmed}`);
      }
      // Check for ?? outside comments
      if (trimmed.includes('??')) {
        ncErrors.push(`L${idx + 1}: ${trimmed}`);
      }
      // Check for async arrow functions
      if (/async\s*\([^)]*\)\s*=>/.test(trimmed) || /async\s+[a-zA-Z0-9_$]+\s*=>/.test(trimmed)) {
        aaErrors.push(`L${idx + 1}: ${trimmed}`);
      }
    });

    assert.strictEqual(ocErrors.length, 0, `Found forbidden ?. in source:\n${ocErrors.join('\n')}`);
    assert.strictEqual(ncErrors.length, 0, `Found forbidden ?? in source:\n${ncErrors.join('\n')}`);
    assert.strictEqual(aaErrors.length, 0, `Found forbidden async arrow in source:\n${aaErrors.join('\n')}`);
  });

  // ── 8.6. Auto Rescue Engine: Strict Cross-Plugin Matching ─────────
  logSection('8.6. Auto Rescue Engine: Strict Cross-Plugin Matching');

  await test('Strictly matches the same original song across plugins and returns a playable source', async () => {
    const calls = [];
    plugin._setHostBridge({
      getAllPlugins: async () => [
        { platform: 'netease', supportedMethod: ['search', 'getMediaSource', 'getLyric'] },
        { platform: 'qq', supportedMethod: ['search', 'getMediaSource', 'getLyric'] },
      ],
      callPluginMethod: async (event, payload) => {
        calls.push({ platform: payload.platform, method: payload.method, args: payload.args });
        if (payload.method === 'getMediaSource' && payload.platform === 'netease') {
          return { url: 'https://m10.music.126.net/audio/123.mp3' };
        }
        if (payload.method === 'search' && payload.platform === 'netease') {
          return {
            isEnd: true,
            data: [
              { id: 'wrong_1', title: '晴天', artist: '别的歌手', platform: 'netease' },
              { id: 'wrong_2', title: '晴天 (Live)', artist: '周杰伦', platform: 'netease' },
              { id: 'right_1', title: '晴天', artist: '周杰伦', album: '叶惠美', duration: 269, platform: 'netease' },
            ],
          };
        }
        return null;
      },
    });

    const item = {
      id: 'legacy_brand_1',
      title: '晴天',
      artist: '周杰伦',
      duration: 269,
      platform: '把你的歌单带走',
      _originPlatform: 'qq',
      _src: { qq: { mid: '0039MnYb0qxYhV' } },
    };

    const res = await plugin.getMediaSource(item, 'standard');
    assert(res && res.url === 'https://m10.music.126.net/audio/123.mp3', 'Must return the rescued source');

    assert(calls.some((c) => c.method === 'getMediaSource' && c.platform === 'qq'), 'Historical items must attempt exact origin lookup first');
    assert(calls.some((c) => c.method === 'search' && c.platform === 'qq'), 'Must retry the origin platform (qq) via search after exact miss');
    assert(calls.some((c) => c.method === 'search' && c.platform === 'netease'), 'Must fall back to other installed platforms');

    const neMediaCalls = () => calls.filter((c) => c.method === 'getMediaSource' && c.platform === 'netease').length;
    assert.strictEqual(neMediaCalls(), 1, 'Exactly one media request for the matched candidate');
    const matchedMediaCall = calls.filter((c) => c.method === 'getMediaSource' && c.platform === 'netease')[0];
    assert.strictEqual(matchedMediaCall.args[0].id, 'right_1', 'Must request media for the strictly matched candidate only');

    // Quality switch must reuse the cached match without re-searching
    const searchCallsBefore = calls.filter((c) => c.method === 'search').length;
    const res2 = await plugin.getMediaSource(item, 'high');
    assert(res2 && res2.url === 'https://m10.music.126.net/audio/123.mp3', 'Quality switch must reuse the cached match');
    assert.strictEqual(calls.filter((c) => c.method === 'search').length, searchCallsBefore, 'Cached match must not trigger another search');
    assert.strictEqual(neMediaCalls(), 2, 'Quality switch requests media once for the new quality');

    plugin._setHostBridge(null);
  });

  await test('Historical brand-era items resolve via exact origin lookup without searching', async () => {
    const calls = [];
    plugin._setHostBridge({
      getAllPlugins: async () => [],
      callPluginMethod: async (event, payload) => {
        calls.push({ platform: payload.platform, method: payload.method });
        if (payload.method === 'getMediaSource' && payload.platform === 'netease') {
          return { url: 'https://m10.music.126.net/exact.mp3' };
        }
        return null;
      },
    });

    const item = {
      id: 'legacy_brand_2',
      title: '海屿你',
      artist: '马也_Crabbit',
      platform: '把你的歌单带走',
      _originPlatform: 'netease',
      _src: { netease: { id: '1973665667' } },
    };

    const res = await plugin.getMediaSource(item, 'standard');
    assert(res && res.url === 'https://m10.music.126.net/exact.mp3', 'Exact origin lookup must win');
    assert(!calls.some((c) => c.method === 'search'), 'Exact hit must not fall back to search');
    plugin._setHostBridge(null);
  });

  await test('Rescues lyrics through the strictly matched candidate', async () => {
    const calls = [];
    plugin._setHostBridge({
      getAllPlugins: async () => [{ platform: 'netease', supportedMethod: ['search', 'getMediaSource', 'getLyric'] }],
      callPluginMethod: async (event, payload) => {
        calls.push({ platform: payload.platform, method: payload.method });
        if (payload.method === 'search') {
          return { isEnd: true, data: [{ id: 'lrc_1', title: '海屿你', artist: '马也_Crabbit', duration: 296, platform: 'netease' }] };
        }
        if (payload.method === 'getLyric') {
          return { rawLrc: '[00:01.00]测试歌词' };
        }
        return null;
      },
    });

    const item = {
      id: 'legacy_brand_3',
      title: '海屿你',
      artist: '马也_Crabbit',
      duration: 296,
      platform: '把你的歌单带走',
      _originPlatform: 'netease',
    };

    const lrc = await plugin.getLyric(item);
    assert(lrc && lrc.rawLrc === '[00:01.00]测试歌词', 'Must rescue lyric from the matched platform');
    assert(calls.some((c) => c.method === 'search' && c.platform === 'netease'), 'Lyric rescue must search the origin platform first');
    plugin._setHostBridge(null);
  });

  await test('Refuses to play wrong songs: skips when no strict match exists', async () => {
    let mediaCalled = 0;
    const httpCalls = [];
    globalThis.axios = {
      get: async (url) => {
        httpCalls.push(String(url));
        return { status: 200, data: null, headers: {} };
      },
    };
    try {
      plugin._setHostBridge({
        getAllPlugins: async () => [{ platform: 'netease', supportedMethod: ['search', 'getMediaSource'] }],
        callPluginMethod: async (event, payload) => {
          if (payload.method === 'search') {
            return {
              isEnd: true,
              data: [
                { id: 'wrong_1', title: '晴天 (Live)', artist: '周杰伦', platform: 'netease' },
                { id: 'wrong_2', title: '晴天', artist: '周杰伦(翻唱)', platform: 'netease' },
                { id: 'wrong_3', title: '晴天 (伴奏)', artist: '周杰伦', platform: 'netease' },
              ],
            };
          }
          if (payload.method === 'getMediaSource') {
            mediaCalled++;
            return { url: 'https://should-never-be-used.example.com/x.mp3' };
          }
          return null;
        },
      });

      const item = {
        id: 'legacy_brand_4',
        title: '晴天',
        artist: '周杰伦',
        duration: 269,
        platform: '把你的歌单带走',
      };

      const res = await plugin.getMediaSource(item, 'standard');
      assert.strictEqual(res, null, 'Wrong-song candidates must never be played');
      assert.strictEqual(mediaCalled, 0, 'No media request must be issued when no strict match exists');
      assert(
        httpCalls.every((u) => !u.includes('vkeys') && !u.includes('getSongInfo')),
        'Embedded engine must never request streams without a strict match'
      );
    } finally {
      plugin._setHostBridge(null);
      delete globalThis.axios;
    }
  });

  await test('Hook interceptor glues rescue into the host plugin channel (maybeRescueResult)', async () => {
    plugin._setHostBridge({
      getAllPlugins: async () => [{ platform: 'netease', supportedMethod: ['search', 'getMediaSource', 'getLyric'] }],
      callPluginMethod: async (event, payload) => {
        if (payload.method === 'search') {
          return { isEnd: true, data: [{ id: 'hook_1', title: '夜曲', artist: '周杰伦', duration: 227, platform: 'netease' }] };
        }
        if (payload.method === 'getMediaSource') {
          return { url: 'https://m10.music.126.net/audio/hook.mp3' };
        }
        if (payload.method === 'getLyric') {
          return { rawLrc: '[00:01.00]夜曲' };
        }
        return null;
      },
    });

    const importedItem = {
      id: 'hook_item_1',
      title: '夜曲',
      artist: '周杰伦',
      duration: 227,
      platform: 'qq',
      _originPlatform: 'qq',
      _src: { qq: { mid: '0039MnYb0qxYAc' } },
    };

    // 1. Failed native lookup -> rescue kicks in and replaces the empty result
    const rescued = await plugin._maybeRescueResult(
      { platform: 'qq', method: 'getMediaSource', args: [importedItem, 'standard'] },
      null
    );
    assert(rescued && rescued.url === 'https://m10.music.126.net/audio/hook.mp3', 'Hook must return the rescued source');

    // 2. Successful native lookup -> untouched
    const okResult = { url: 'https://y.qq.com/original.mp3' };
    const passthrough = await plugin._maybeRescueResult(
      { platform: 'qq', method: 'getMediaSource', args: [importedItem, 'standard'] },
      okResult
    );
    assert.strictEqual(passthrough, okResult, 'Successful lookups must pass through untouched');

    // 3. Items not imported by PlaylistOut -> untouched
    const foreignItem = { id: 'foreign_1', title: '夜曲', artist: '周杰伦', platform: 'qq' };
    const foreign = await plugin._maybeRescueResult(
      { platform: 'qq', method: 'getMediaSource', args: [foreignItem, 'standard'] },
      null
    );
    assert.strictEqual(foreign, null, 'Foreign items must not be hijacked by rescue');

    // 4. Lyric rescue through the same host channel
    const lrc = await plugin._maybeRescueResult(
      { platform: 'qq', method: 'getLyric', args: [importedItem] },
      null
    );
    assert(lrc && lrc.rawLrc === '[00:01.00]夜曲', 'Hook must rescue lyric');
    plugin._setHostBridge(null);
  });

  await test('Strict matcher unit contract: same title + artist + version + duration only', () => {
    const match = plugin._isCandidateStrictlyMatched;

    assert(match({ title: '晴天', artist: '周杰伦', duration: 266 }, '晴天', '周杰伦', 269), 'Same song within tolerance must match');
    assert(match({ title: '晴天', artist: '周杰伦', album: '叶惠美', duration: 269 }, '晴天', '周杰伦', 269), 'Exact song must match');
    assert(!match({ title: '晴天', artist: '别的歌手', duration: 266 }, '晴天', '周杰伦', 269), 'Wrong singer must not match');
    assert(!match({ title: '晴天', artist: '周杰伦乐队', duration: 266 }, '晴天', '周杰伦', 269), 'Fuzzy artist substring must not match');
    assert(!match({ title: '晴天 (Live)', artist: '周杰伦', duration: 269 }, '晴天', '周杰伦', 269), 'Live version must not match');
    assert(!match({ title: '晴天 (伴奏)', artist: '周杰伦', duration: 269 }, '晴天', '周杰伦', 269), 'Instrumental must not match');
    assert(!match({ title: '晴天', artist: '周杰伦', duration: 320 }, '晴天', '周杰伦', 269), 'Duration drift > 12s must not match');
    assert(!match({ title: '雨天', artist: '周杰伦', duration: 269 }, '晴天', '周杰伦', 269), 'Different title must not match');
  });

  // ── 8.7. Embedded Fallback Sources (QQ / NetEase / KuGou) ─────────
  logSection('8.7. Embedded Fallback Sources: Legacy Playback Guarantee');

  // 模拟内置兜底通道：按 URL 规则派发响应，未命中请求返回空数据（测试绝不触网）
  const installHttpMock = (handlers) => {
    const calls = [];
    globalThis.axios = {
      get: async (url, config) => {
        const u = String(url);
        calls.push({ url: u, config: config || {} });
        for (const [pattern, handler] of handlers) {
          const hit = pattern instanceof RegExp ? pattern.test(u) : u.includes(pattern);
          if (hit) {
            return typeof handler === 'function' ? await handler(u, config || {}) : handler;
          }
        }
        return { status: 200, data: null, headers: {} };
      },
    };
    return calls;
  };

  await test('Legacy QQ brand item (v1.x id prefix) plays through embedded vkeys after https upgrade', async () => {
    plugin._setHostBridge(null);
    const calls = installHttpMock([
      [/quality=10/, { status: 200, data: { code: 0, data: { kbps: '1644kbps', url: 'http://ws.stream.qqmusic.qq.com/F0000004jPDk2eB2dt.flac?vkey=flac' } } }],
      [/quality=8/, { status: 200, data: { code: 0, data: { kbps: '320kbps', url: 'http://ws.stream.qqmusic.qq.com/M8000004jPDk2eB2dt.mp3?vkey=320' } } }],
      [/quality=6/, { status: 200, data: { code: 110000, data: null } }],
    ]);
    try {
      const item = {
        id: 'qq_0004jPDk2eB2dt',
        title: '起风了',
        artist: '买辣椒也用券',
        platform: '把你的歌单带走',
        _originPlatform: 'qq',
      };
      const res = await plugin.getMediaSource(item, 'high');
      assert(
        res && res.url === 'https://ws.stream.qqmusic.qq.com/M8000004jPDk2eB2dt.mp3?vkey=320',
        'High quality must resolve to the 320k https link'
      );
      assert.strictEqual(res.quality, '320k', 'Quality label must reflect the 320k tier');
      assert(calls.some((c) => c.url.includes('quality=8')), 'High quality must request the 320k tier');

      const res2 = await plugin.getMediaSource(item, 'super');
      assert(
        res2 && res2.quality === 'flac' && res2.url.startsWith('https://'),
        'Super quality must return an https lossless link when available'
      );
      assert(calls.some((c) => c.url.includes('quality=10')), 'Super quality must request the lossless tier first');
    } finally {
      delete globalThis.axios;
    }
  });

  await test('Embedded cross-lane search strictly matches: wrong candidates never get a stream request', async () => {
    plugin._setHostBridge(null);
    const calls = installHttpMock([
      [
        'smartbox_new',
        {
          status: 200,
          data: {
            data: {
              song: {
                itemlist: [
                  { mid: 'wrong_mid', name: '晴天', singer: '别的歌手' },
                  { mid: '0039MnYb0qxYhV', name: '晴天', singer: '周杰伦' },
                ],
              },
            },
          },
        },
      ],
      ['api.vkeys.cn', { status: 200, data: { code: 0, data: { kbps: '320kbps', url: 'http://ws.stream.qqmusic.qq.com/M8000039MnYb0qxYhV.mp3?vkey=ok' } } }],
    ]);
    try {
      const item = { id: 'legacy_search_1', title: '晴天', artist: '周杰伦', duration: 269, platform: '把你的歌单带走' };
      const res = await plugin.getMediaSource(item, 'standard');
      assert(res && res.url.includes('0039MnYb0qxYhV'), 'Must stream the strictly matched candidate');
      assert(!calls.some((c) => c.url.includes('wrong_mid')), 'Wrong-artist candidate must never receive a stream request');
      assert(calls.some((c) => c.url.includes('smartbox_new')), 'Must search via the QQ smartbox lane first');
      assert(
        !calls.some((c) => c.url.includes('gdstudio') || c.url.includes('songsearch')),
        'First strict hit must short-circuit the remaining lanes'
      );
    } finally {
      delete globalThis.axios;
    }
  });

  await test('NetEase embedded channels: GD Studio lossless direct link, Meting Range-probe fallback', async () => {
    plugin._setHostBridge(null);
    let calls = installHttpMock([
      ['gdstudio', { status: 200, data: { url: 'https://m701.music.126.net/2026/x.flac', br: 797, size: 1 } }],
    ]);
    try {
      const item = {
        id: 'netease_347230',
        title: '海屿你',
        artist: '马也_Crabbit',
        platform: '把你的歌单带走',
        _originPlatform: 'netease',
      };
      const res = await plugin.getMediaSource(item, 'super');
      assert(res && res.url === 'https://m701.music.126.net/2026/x.flac' && res.quality === 'flac', 'GD Studio lossless link expected');
      assert(calls.some((c) => c.url.includes('br=999')), 'Super quality must request the lossless tier');
    } finally {
      delete globalThis.axios;
    }

    calls = installHttpMock([
      ['gdstudio', { status: 200, data: { url: '' } }],
      ['api.injahow.cn/meting', { status: 206, data: 'x', headers: { 'content-type': 'audio/mpeg' } }],
    ]);
    try {
      const item = {
        id: 'netease_347231',
        title: '晴天 (cover)',
        artist: '某歌手',
        platform: '把你的歌单带走',
        _originPlatform: 'netease',
      };
      const res = await plugin.getMediaSource(item, 'standard');
      assert(res && res.url.startsWith('https://api.injahow.cn/meting/'), 'Meting fallback URL expected when GD Studio returns nothing');
      assert.strictEqual(res.quality, '128k', 'Meting fallback must be labeled 128k');
      const metingCall = calls.find((c) => c.url.includes('meting'));
      assert(
        metingCall && metingCall.config.headers && metingCall.config.headers.Range === 'bytes=0-0',
        'Meting must be validated with a Range probe before returning'
      );
    } finally {
      delete globalThis.axios;
    }
  });

  await test('KuGou embedded channel: free tracks stream, paid tracks are skipped cleanly', async () => {
    plugin._setHostBridge(null);
    let calls = installHttpMock([
      ['getSongInfo.php', { status: 0, data: { url: 'http://fsandroid.kugou.com/track/free.mp3', fileName: 'free.mp3' } }],
    ]);
    try {
      const item = { id: 'kugou_abc123', title: '一路生花', artist: '温奕心', platform: '把你的歌单带走', _originPlatform: 'kugou' };
      const res = await plugin.getMediaSource(item, 'standard');
      assert(res && res.url.includes('kugou.com'), 'Free KuGou track must stream through getSongInfo');
    } finally {
      delete globalThis.axios;
    }

    calls = installHttpMock([['getSongInfo.php', { status: 0, data: { url: '', err: '需要付费' } }]]);
    try {
      const item = {
        id: 'kugou_paid_1',
        title: '付费歌曲',
        artist: '某歌手',
        platform: '把你的歌单带走',
        _originPlatform: 'kugou',
        _src: { kugou: { hash: 'paidhash', hqHash: 'paidhq' } },
      };
      const res = await plugin.getMediaSource(item, 'high');
      assert.strictEqual(res, null, 'Paid KuGou tracks must be skipped: no playable public link exists');
      assert(!calls.some((c) => c.url.includes('vkeys')), 'No stream must ever be fabricated from invalid data');
    } finally {
      delete globalThis.axios;
    }
  });

  await test('Fallback order: cross-plugin rescue wins; embedded engine only runs as the last resort', async () => {
    plugin._setHostBridge({
      getAllPlugins: async () => [{ platform: 'qq', supportedMethod: ['search', 'getMediaSource'] }],
      callPluginMethod: async (event, payload) => {
        if (payload.method === 'search') {
          return { isEnd: true, data: [{ id: 'origin_hit', title: '起风了', artist: '买辣椒也用券', duration: 325, platform: 'qq' }] };
        }
        if (payload.method === 'getMediaSource') {
          return { url: 'https://isure.stream.qqmusic.qq.com/plugin-rescued.mp3' };
        }
        return null;
      },
    });
    const calls = installHttpMock([]);
    try {
      const item = { id: 'order_1', title: '起风了', artist: '买辣椒也用券', duration: 325, platform: '把你的歌单带走' };
      const res = await plugin.getMediaSource(item, 'standard');
      assert(res && res.url.includes('plugin-rescued'), 'Cross-plugin rescue must win over the embedded engine');
      assert.strictEqual(calls.length, 0, 'Embedded third-party channels must not be touched when rescue succeeds');
    } finally {
      delete globalThis.axios;
      plugin._setHostBridge(null);
    }
  });

  await test('Embedded failures are cached for 60s; hosts never re-hammer third-party channels', async () => {
    plugin._setHostBridge(null);
    const calls = installHttpMock([]);
    try {
      const item = { id: 'negcache_1', title: '无名之歌', artist: '无名', platform: '把你的歌单带走' };
      const res1 = await plugin.getMediaSource(item, 'standard');
      assert.strictEqual(res1, null, 'No strict match anywhere -> null');
      const afterFirst = calls.length;
      assert.strictEqual(afterFirst, 3, `All three embedded search lanes must run once, got ${afterFirst} calls`);

      const res2 = await plugin.getMediaSource(item, 'standard');
      assert.strictEqual(res2, null);
      assert.strictEqual(calls.length, afterFirst, 'Second attempt within TTL must not hit the network again');
    } finally {
      delete globalThis.axios;
    }
  });

  await test('Embedded lyrics: QQ via s01s/QQ-official, NetEase official, and reuse of embedded media match', async () => {
    plugin._setHostBridge(null);

    let calls = installHttpMock([['s01s.cn', { status: 200, data: { song_lyric: '[00:01.00]起风了' } }]]);
    try {
      const item = {
        id: 'lrc_qq_1',
        title: '起风了',
        artist: '买辣椒也用券',
        platform: '把你的歌单带走',
        _originPlatform: 'qq',
        _src: { qq: { mid: '0004jPDk2eB2dt' } },
      };
      const lrc = await plugin.getLyric(item);
      assert(lrc && lrc.rawLrc === '[00:01.00]起风了', 'QQ lyric must come from the embedded s01s channel');
    } finally {
      delete globalThis.axios;
    }

    calls = installHttpMock([
      ['s01s.cn', { status: 200, data: { song_lyric: '' } }],
      ['fcg_query_lyric_new', { status: 200, data: { lyric: '[00:02.00]官方' } }],
    ]);
    try {
      const item = {
        id: 'lrc_qq_2',
        title: '起风了',
        artist: '买辣椒也用券',
        platform: '把你的歌单带走',
        _originPlatform: 'qq',
        _src: { qq: { mid: '0004jPDk2eB2dt' } },
      };
      const lrc = await plugin.getLyric(item);
      assert(lrc && lrc.rawLrc === '[00:02.00]官方', 'QQ official lyric API must back up s01s');
    } finally {
      delete globalThis.axios;
    }

    calls = installHttpMock([['music.163.com/api/song/lyric', { status: 200, data: { lrc: { lyric: '[00:03.00]网易' } } }]]);
    try {
      const item = {
        id: 'lrc_ne_1',
        title: '海屿你',
        artist: '马也_Crabbit',
        platform: '把你的歌单带走',
        _originPlatform: 'netease',
        _src: { netease: { id: '1973665667' } },
      };
      const lrc = await plugin.getLyric(item);
      assert(lrc && lrc.rawLrc === '[00:03.00]网易', 'NetEase official lyric must work');
    } finally {
      delete globalThis.axios;
    }

    calls = installHttpMock([
      [
        'smartbox_new',
        { status: 200, data: { data: { song: { itemlist: [{ mid: '0039MnYb0qxYhV', name: '晴天', singer: '周杰伦' }] } } } },
      ],
      ['api.vkeys.cn', { status: 200, data: { code: 0, data: { kbps: '320kbps', url: 'http://ws.stream.qqmusic.qq.com/M8000039MnYb0qxYhV.mp3?vkey=ok' } } }],
      ['s01s.cn', { status: 200, data: { song_lyric: '[00:04.00]晴天' } }],
    ]);
    try {
      const item = { id: 'lrc_reuse_1', title: '晴天', artist: '周杰伦', duration: 269, platform: '把你的歌单带走' };
      const media = await plugin.getMediaSource(item, 'standard');
      assert(media && media.url, 'Media must resolve via the embedded search lane first');
      const lrc = await plugin.getLyric(item);
      assert(lrc && lrc.rawLrc === '[00:04.00]晴天', 'Lyric must reuse the embedded media match (qq mid)');
    } finally {
      delete globalThis.axios;
    }
  });

  await test('Embedded lyric search fallback: origin-less legacy items are located strictly, without stream fetches', async () => {
    plugin._setHostBridge(null);
    const calls = installHttpMock([
      [
        'smartbox_new',
        { status: 200, data: { data: { song: { itemlist: [{ mid: '0039MnYb0qxYhV', name: '晴天', singer: '周杰伦' }] } } } },
      ],
      ['s01s.cn', { status: 200, data: { song_lyric: '[00:05.00]搜索兜底歌词' } }],
    ]);
    try {
      const item = { id: 'lrc_originless_1', title: '晴天', artist: '周杰伦', duration: 269, platform: '把你的歌单带走' };
      const lrc = await plugin.getLyric(item);
      assert(
        lrc && lrc.rawLrc === '[00:05.00]搜索兜底歌词',
        'Origin-less legacy items must still load lyrics via strict search locate'
      );
      assert(calls.some((c) => c.url.includes('smartbox_new')), 'Must locate via the strict search lane');
      const lyricCall = calls.find((c) => c.url.includes('s01s.cn'));
      assert(lyricCall && lyricCall.url.includes('0039MnYb0qxYhV'), 'Lyric must use the strictly matched mid');
      assert(!calls.some((c) => c.url.includes('vkeys')), 'Locate-only: must not fetch streams for lyrics');
    } finally {
      delete globalThis.axios;
    }
  });

  await test('Hook fallback chain: native fail -> cross-plugin miss -> embedded engine delivers', async () => {
    plugin._setHostBridge({
      getAllPlugins: async () => [{ platform: 'netease', supportedMethod: ['search'] }],
      callPluginMethod: async (event, payload) => {
        if (payload.method === 'search') return { isEnd: true, data: [] };
        return null;
      },
    });
    const calls = installHttpMock([
      ['api.vkeys.cn', { status: 200, data: { code: 0, data: { kbps: '320kbps', url: 'http://ws.stream.qqmusic.qq.com/M8000039MnYb0qxYhV.mp3?vkey=ok' } } }],
    ]);
    try {
      const item = {
        id: 'hook_embedded_1',
        title: '晴天',
        artist: '周杰伦',
        duration: 269,
        platform: 'qq',
        _originPlatform: 'qq',
        _src: { qq: { mid: '0039MnYb0qxYhV' } },
      };
      const res = await plugin._maybeRescueResult(
        { platform: 'qq', method: 'getMediaSource', args: [item, 'standard'] },
        null
      );
      assert(res && res.url.includes('ws.stream.qqmusic.qq.com'), 'Embedded engine must back up the hook when all plugins fail');
      assert(calls.some((c) => c.url.includes('api.vkeys.cn')), 'Must resolve through the embedded QQ channel');
    } finally {
      delete globalThis.axios;
      plugin._setHostBridge(null);
    }
  });

  await test('Embedded media URL allowlist rejects unknown hosts and protocol spoofing', () => {
    const allowed = plugin._isAllowedEmbeddedMediaUrl;
    assert(allowed('https://ws.stream.qqmusic.qq.com/a.mp3'), 'QQ CDN must be allowed');
    assert(allowed('http://ws.stream.qqmusic.qq.com/a.mp3'), 'QQ CDN http must be allowed for https upgrade');
    assert(allowed('https://m701.music.126.net/a.flac'), 'NetEase CDN must be allowed');
    assert(allowed('https://fsandroid.kugou.com/a.mp3'), 'KuGou CDN must be allowed');
    assert(allowed('https://api.injahow.cn/meting/?x=1'), 'Meting gateway must be allowed');
    assert(!allowed('https://evil.example.com/a.mp3'), 'Unknown hosts must be rejected');
    assert(!allowed('https://qqmusic.qq.com.evil.com/a.mp3'), 'Suffix spoofing must be rejected');
    assert(!allowed('https://notqqmusic.qq.com/a.mp3'), 'Near-miss domains must be rejected');
    assert(!allowed('ftp://ws.stream.qqmusic.qq.com/a.mp3'), 'Non-http protocols must be rejected');
    assert(!allowed(''), 'Empty URLs must be rejected');
  });

  await test('Embedded source contract: allowlisted channels present, legacy hybrids fully removed', () => {
    const code = fs.readFileSync(pluginPath, 'utf-8');

    // v2.1.1: 内置兜底引擎必须存在且只走白名单公开接口 + 严格匹配
    assert(code.includes('embeddedResolveMedia'), 'Must provide the embedded fallback engine');
    assert(code.includes('api.vkeys.cn'), 'QQ embedded channel (vkeys) must be present');
    assert(code.includes('music-api.gdstudio.xyz'), 'NetEase embedded channel (GD Studio) must be present');
    assert(code.includes('songsearch.kugou.com'), 'KuGou search channel must be present');
    assert(code.includes('getSongInfo.php'), 'KuGou stream channel must be present');
    assert(code.includes('isAllowedEmbeddedMediaUrl'), 'Must validate media URLs against the allowlist');
    assert(
      code.includes("'qqmusic.qq.com'") && code.includes("'music.126.net'") && code.includes("'kugou.com'"),
      'Allowlist must cover the three media CDNs'
    );
    assert(code.includes('isCandidateStrictlyMatched'), 'Embedded search must reuse the strict matcher');
    assert(code.includes('EMBEDDED_NO_SOURCE_TTL_MS'), 'Must keep the negative cache for dead sources');
    assert(code.includes('installHostBridge'), 'Must install the host plugin bridge');
    assert(code.includes('findStrictMatch'), 'Must provide strict cross-plugin matching');

    // 历史遗留：兄弟插件文件加载器 / 旧版取源取词实现 / 宽松匹配必须彻底移除
    assert(!code.includes('loadInstalledSiblingPlugins'), 'Must not contain sibling plugin file loader');
    assert(!code.includes('resolveQqStream'), 'Must not contain legacy QQ stream resolver');
    assert(!code.includes('resolveNeteaseStream'), 'Must not contain legacy NetEase stream resolver');
    assert(!code.includes('resolveOnlineMediaSource'), 'Must not contain legacy online media resolver');
    assert(!code.includes('resolveOnlineLyric'), 'Must not contain legacy online lyric resolver');
    assert(!code.includes('isValidCleanMediaUrl'), 'Must not contain legacy source blocklist');
    assert(!code.includes('isCandidateSimilarMatched'), 'Must not contain loose similar matching');
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
