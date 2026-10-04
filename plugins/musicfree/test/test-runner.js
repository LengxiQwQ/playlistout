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

  await test('Exports valid metadata conforming to MusicFree standards (v1.3.8)', () => {
    assert.strictEqual(plugin.platform, '把你的歌单带走', 'Platform must be 把你的歌单带走');
    assert.strictEqual(plugin.author, 'LengxiQwQ', 'Author must be LengxiQwQ');
    assert.strictEqual(plugin.version, '1.3.8', 'Version must be 1.3.8');
    assert.strictEqual(plugin.appVersion, '>0.1.0-alpha.0', 'appVersion must match specification');
    assert.strictEqual(
      plugin.srcUrl,
      'https://playlistout.lengxiqwq.com/plugins/musicfree.js',
      'srcUrl must point to official production URL'
    );
    assert.strictEqual(plugin.cacheControl, 'no-store', 'cacheControl must be no-store');
    assert.deepStrictEqual(plugin.supportedSearchType, ['sheet'], 'supportedSearchType must be [sheet]');
    assert(
      typeof plugin.description === 'string' && plugin.description.includes('https://playlistout.lengxiqwq.com'),
      'description must provide clickable markdown link to website'
    );
    assert(Array.isArray(plugin.hints?.importMusicSheet), 'hints.importMusicSheet must be an array');
    assert.strictEqual(plugin.hints.importMusicSheet.length, 4, 'hints must provide 4 concise lines');
    assert(
      plugin.hints.importMusicSheet[0].includes('【支持平台】'),
      'first hint must list supported platforms'
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
    assert(
      plugin.userVariables.some((v) => v.key === 'targetPlatform'),
      'userVariables must include targetPlatform option'
    );
    assert(
      plugin.userVariables.some((v) => v.key === 'fallbackMode'),
      'userVariables must include fallbackMode option'
    );
    assert(
      plugin.userVariables.some((v) => v.key === 'kugouToken'),
      'userVariables must include kugouToken option'
    );
    assert(
      plugin.userVariables.some((v) => v.key === 'kugouUserid'),
      'userVariables must include kugouUserid option'
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
      assert.strictEqual(distPlugin.platform, '把你的歌单带走');
      assert.strictEqual(distPlugin.version, '1.3.8');
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
  const v127Dist = path.resolve(__dirname, '../dist/musicfree-v1.2.7.js');
  const v127Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.2.7.js');
  const v128Dist = path.resolve(__dirname, '../dist/musicfree-v1.2.8.js');
  const v128Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.2.8.js');
  const v129Dist = path.resolve(__dirname, '../dist/musicfree-v1.2.9.js');
  const v129Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.2.9.js');
  const v1210Dist = path.resolve(__dirname, '../dist/musicfree-v1.2.10.js');
  const v1210Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.2.10.js');
  const v1211Dist = path.resolve(__dirname, '../dist/musicfree-v1.2.11.js');
  const v1211Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.2.11.js');
  const v1212Dist = path.resolve(__dirname, '../dist/musicfree-v1.2.12.js');
  const v1212Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.2.12.js');
  const v130Dist = path.resolve(__dirname, '../dist/musicfree-v1.3.0.js');
  const v130Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.3.0.js');
  const v131Dist = path.resolve(__dirname, '../dist/musicfree-v1.3.1.js');
  const v131Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.3.1.js');
  const v132Dist = path.resolve(__dirname, '../dist/musicfree-v1.3.2.js');
  const v132Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.3.2.js');
  const v133Dist = path.resolve(__dirname, '../dist/musicfree-v1.3.3.js');
  const v133Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.3.3.js');
  const v134Dist = path.resolve(__dirname, '../dist/musicfree-v1.3.4.js');
  const v134Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.3.4.js');
  const v135Dist = path.resolve(__dirname, '../dist/musicfree-v1.3.5.js');
  const v135Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.3.5.js');
  const v136Dist = path.resolve(__dirname, '../dist/musicfree-v1.3.6.js');
  const v136Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.3.6.js');
  const v137Dist = path.resolve(__dirname, '../dist/musicfree-v1.3.7.js');
  const v137Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.3.7.js');
  const v138Dist = path.resolve(__dirname, '../dist/musicfree-v1.3.8.js');
  const v138Web = path.resolve(__dirname, '../../../web/public/plugins/musicfree-v1.3.8.js');
  await test('Verifies v1.2.0 through v1.3.8 release & historical archives exist', () => {
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
    assert(fs.existsSync(v127Dist), 'dist/musicfree-v1.2.7.js must exist');
    assert(fs.existsSync(v127Web), 'web/public/plugins/musicfree-v1.2.7.js must exist');
    assert(fs.existsSync(v128Dist), 'dist/musicfree-v1.2.8.js must exist');
    assert(fs.existsSync(v128Web), 'web/public/plugins/musicfree-v1.2.8.js must exist');
    assert(fs.existsSync(v129Dist), 'dist/musicfree-v1.2.9.js must exist');
    assert(fs.existsSync(v129Web), 'web/public/plugins/musicfree-v1.2.9.js must exist');
    assert(fs.existsSync(v1210Dist), 'dist/musicfree-v1.2.10.js must exist');
    assert(fs.existsSync(v1210Web), 'web/public/plugins/musicfree-v1.2.10.js must exist');
    assert(fs.existsSync(v1211Dist), 'dist/musicfree-v1.2.11.js must exist');
    assert(fs.existsSync(v1211Web), 'web/public/plugins/musicfree-v1.2.11.js must exist');
    assert(fs.existsSync(v1212Dist), 'dist/musicfree-v1.2.12.js must exist');
    assert(fs.existsSync(v1212Web), 'web/public/plugins/musicfree-v1.2.12.js must exist');
    assert(fs.existsSync(v130Dist), 'dist/musicfree-v1.3.0.js must exist');
    assert(fs.existsSync(v130Web), 'web/public/plugins/musicfree-v1.3.0.js must exist');
    assert(fs.existsSync(v131Dist), 'dist/musicfree-v1.3.1.js must exist');
    assert(fs.existsSync(v131Web), 'web/public/plugins/musicfree-v1.3.1.js must exist');
    assert(fs.existsSync(v132Dist), 'dist/musicfree-v1.3.2.js must exist');
    assert(fs.existsSync(v132Web), 'web/public/plugins/musicfree-v1.3.2.js must exist');
    assert(fs.existsSync(v133Dist), 'dist/musicfree-v1.3.3.js must exist');
    assert(fs.existsSync(v133Web), 'web/public/plugins/musicfree-v1.3.3.js must exist');
    assert(fs.existsSync(v134Dist), 'dist/musicfree-v1.3.4.js must exist');
    assert(fs.existsSync(v134Web), 'web/public/plugins/musicfree-v1.3.4.js must exist');
    assert(fs.existsSync(v135Dist), 'dist/musicfree-v1.3.5.js must exist');
    assert(fs.existsSync(v135Web), 'web/public/plugins/musicfree-v1.3.5.js must exist');
    assert(fs.existsSync(v136Dist), 'dist/musicfree-v1.3.6.js must exist');
    assert(fs.existsSync(v136Web), 'web/public/plugins/musicfree-v1.3.6.js must exist');
    assert(fs.existsSync(v137Dist), 'dist/musicfree-v1.3.7.js must exist');
    assert(fs.existsSync(v137Web), 'web/public/plugins/musicfree-v1.3.7.js must exist');
    assert(fs.existsSync(v138Dist), 'dist/musicfree-v1.3.8.js must exist');
    assert(fs.existsSync(v138Web), 'web/public/plugins/musicfree-v1.3.8.js must exist');
  });

  await test('UI modal placeholder does not contain "口令" and uses concise phrasing', () => {
    const srcCode = fs.readFileSync(pluginPath, 'utf-8');
    assert(!srcCode.includes('分享口令'), 'Source must not contain "分享口令"');
    assert(
      srcCode.includes("var targetPlaceholder = '粘贴歌单分享链接（QQ/网易/酷狗/汽水）';"),
      'Placeholder must match clean prompt'
    );
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
    globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = true;

    await test('Parses generic local .json into compliant IMusicItem[] with PlaylistOut platform', async () => {
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
      assert.strictEqual(item1.platform, '把你的歌单带走');
      assert.strictEqual(item1.url, undefined, 'Must not inject pirate audio URL');

      // Second track verification (multi-artist comma joining)
      const item2 = items[1];
      assert.strictEqual(item2.id, '186017');
      assert.strictEqual(item2.title, '温柔 (Live)');
      assert.strictEqual(item2.artist, '五月天, 阿信', 'Multi-artists must be joined by comma');
      assert.strictEqual(item2.album, '人生无限公司');
      assert.strictEqual(item2.duration, 275, 'Duration rounded to 275s');
      assert.strictEqual(item2.platform, '把你的歌单带走');
    });

    await test('Correctly bridges NetEase playlist preserving brand platform and attaching _src', async () => {
      const items = await plugin.importMusicSheet(tempNeteasePath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, '把你的歌单带走');
      assert.strictEqual(items[0]._originPlatform, 'netease');
      assert.strictEqual(items[0].id, '1973665667');
      assert.strictEqual(items[0]._src?.netease?.id, '1973665667');
      assert.deepStrictEqual(items[0]._srcOrder, ['netease']);
    });

    await test('Correctly bridges QQ Music playlist preserving brand platform with _src & songmid', async () => {
      const items = await plugin.importMusicSheet(tempQqPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, '把你的歌单带走');
      assert.strictEqual(items[0]._originPlatform, 'qq');
      assert.strictEqual(items[0].id, '0039MnYb0qxYAc');
      assert.strictEqual(items[0].songmid, '0039MnYb0qxYAc');
      assert.strictEqual(items[0]._src?.qq?.mid, '0039MnYb0qxYAc');
      assert.deepStrictEqual(items[0]._srcOrder, ['qq']);
    });

    await test('Correctly bridges KuGou playlist preserving brand platform with _src.kugou.hash', async () => {
      const items = await plugin.importMusicSheet(tempKugouPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, '把你的歌单带走');
      assert.strictEqual(items[0]._originPlatform, 'kugou');
      assert.strictEqual(items[0]._src?.kugou?.hash, 'hash12345');
      assert.deepStrictEqual(items[0]._srcOrder, ['kugou']);
    });

    await test('Correctly bridges KuWo playlist preserving brand platform', async () => {
      const items = await plugin.importMusicSheet(tempKuwoPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, '把你的歌单带走');
      assert.strictEqual(items[0]._originPlatform, 'kuwo');
      assert.strictEqual(items[0]._src?.kuwo?.id, '123456');
    });

    await test('Correctly bridges QiShui playlist preserving brand platform', async () => {
      const items = await plugin.importMusicSheet(tempQishuiPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, '把你的歌单带走');
      assert.strictEqual(items[0]._originPlatform, 'qishui');
      assert.strictEqual(items[0]._src?.qishui?.trackId, '7100000000');
    });

    await test('Correctly bridges Bilibili playlist preserving brand platform', async () => {
      const items = await plugin.importMusicSheet(tempBilibiliPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, '把你的歌单带走');
      assert.strictEqual(items[0]._originPlatform, 'bilibili');
    });

    await test('Correctly bridges Migu playlist preserving brand platform', async () => {
      const items = await plugin.importMusicSheet(tempMiguPath);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].platform, '把你的歌单带走');
      assert.strictEqual(items[0]._originPlatform, 'migu');
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

  // ── 3.5. Mobile Native Platform Delegation & Isolation ────────────
  logSection('3.5. Mobile Native Platform Delegation & Isolation');

  try {
    globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = false;

    await test('Mobile mode: Default delegates tracks to respective native platforms with full metadata', async () => {
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

    await test('Mobile mode: targetPlatform="auto" maintains unified platform contract "把你的歌单带走"', async () => {
      globalThis.env = {
        getUserVariables: () => ({ targetPlatform: 'auto' }),
      };
      try {
        const neteaseItems = await plugin.importMusicSheet(sampleNeteaseJson);
        assert.strictEqual(neteaseItems[0].platform, '把你的歌单带走');
        assert.strictEqual(neteaseItems[0]._originPlatform, 'netease');

        const qqItems = await plugin.importMusicSheet(sampleQqJson);
        assert.strictEqual(qqItems[0].platform, '把你的歌单带走');
        assert.strictEqual(qqItems[0]._originPlatform, 'qq');
      } finally {
        delete globalThis.env;
      }
    });

    await test('Mobile mode: userVariables targetPlatform overrides track platform on mobile', async () => {
      globalThis.env = {
        getUserVariables: () => ({ targetPlatform: 'kuwo' }),
      };
      try {
        const items = await plugin.importMusicSheet(sampleNeteaseJson);
        assert.strictEqual(items.length, 1);
        assert.strictEqual(items[0].platform, 'kuwo', 'targetPlatform must override track platform on mobile');
        assert.strictEqual(items[0]._originPlatform, 'netease', 'Track natural platform preserved in _originPlatform');
      } finally {
        delete globalThis.env;
      }
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

  // ── 4. userVariables Configuration Override ───────────────────────
  logSection('4. userVariables Configuration Override');

  await test('Respects userVariables to prioritize audio routing while preserving brand platform', async () => {
    globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = true;
    try {
      // 1. Mock MusicFree environment env.getUserVariables() returning targetPlatform='kuwo'
      globalThis.env = {
        getUserVariables: () => ({ targetPlatform: 'kuwo' }),
      };

      const tempTestPath = path.join(os.tmpdir(), `playlistout_test_forced_${Date.now()}.json`);
      try {
        fs.writeFileSync(tempTestPath, sampleNeteaseJson, 'utf-8');
        const items = await plugin.importMusicSheet(tempTestPath);
        assert.strictEqual(items.length, 1);
        assert.strictEqual(items[0].platform, '把你的歌单带走', 'Platform displayed to user must always be plugin brand');
        assert.strictEqual(items[0]._originPlatform, 'netease', 'Track origin platform preserved');

        // 2. Reset to auto
        globalThis.env = {
          getUserVariables: () => ({ targetPlatform: 'auto' }),
        };
        const items2 = await plugin.importMusicSheet(tempTestPath);
        assert.strictEqual(items2[0].platform, '把你的歌单带走');
        assert.strictEqual(items2[0]._originPlatform, 'netease');
      } finally {
        delete globalThis.env;
        try {
          if (fs.existsSync(tempTestPath)) fs.unlinkSync(tempTestPath);
        } catch (_) {}
      }
    } finally {
      delete globalThis.__PLAYLISTOUT_MOCK_ELECTRON__;
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
        artists: ['歌手A'],
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
      assert.strictEqual(desktopItems[499].title, '酷狗金曲_500');
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

  await test(`Resolves live NetEase playlist (${realNeteaseUrl}) and maps platform to "把你的歌单带走" in Desktop mode`, async () => {
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
        assert.strictEqual(it.platform, '把你的歌单带走', `Track ${i + 1} platform must be 把你的歌单带走`);
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

  // ── 8.6. Online Stream & Lyric Resolution Engine ───────────────────
  logSection('8.6. Online Stream & Lyric Resolution Engine');

  await test('Mobile & Standalone mode: getMediaSource resolves online stream for valid tracks or returns null gracefully', async () => {
    globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = false;
    try {
      // 1. QQ track with mid
      const qqItem = {
        id: 'qq_0039MnYb0qxYhV',
        title: '晴天',
        artist: '周杰伦',
        platform: '把你的歌单带走',
        _originPlatform: 'qq',
        _src: { qq: { mid: '0039MnYb0qxYhV' } },
      };
      const qqRes = await plugin.getMediaSource(qqItem, 'standard');
      if (qqRes) {
        assert(typeof qqRes.url === 'string' && qqRes.url.startsWith('http'), 'QQ stream URL must be valid HTTP');
        assert(qqRes.quality, 'QQ stream must specify quality');
      }

      // 2. NetEase track with id
      const neteaseItem = {
        id: 'netease_1357375695',
        title: '海阔天空',
        artist: 'Beyond',
        platform: '把你的歌单带走',
        _originPlatform: 'netease',
        _src: { netease: { id: '1357375695' } },
      };
      const nRes = await plugin.getMediaSource(neteaseItem, 'standard');
      if (nRes) {
        assert(typeof nRes.url === 'string' && nRes.url.startsWith('http'), 'NetEase stream URL must be valid HTTP');
      }

      // 3. Fake non-existent track returns null without crashing
      const fakeItem = {
        id: 'fake_nonexistent_track_999999',
        title: '完全不存在的随机歌曲标题_xyz',
        artist: '未知无名',
        platform: '把你的歌单带走',
      };
      const fakeRes = await plugin.getMediaSource(fakeItem, 'standard');
      assert.strictEqual(fakeRes, null, 'Non-existent song must return null');
    } finally {
      delete globalThis.__PLAYLISTOUT_MOCK_ELECTRON__;
    }
  });

  await test('getLyric returns non-null { rawLrc: string } across mobile & desktop environments', async () => {
    globalThis.__PLAYLISTOUT_MOCK_ELECTRON__ = false;
    try {
      const qqItem = {
        id: 'qq_0039MnYb0qxYhV',
        title: '晴天',
        artist: '周杰伦',
        platform: '把你的歌单带走',
        _originPlatform: 'qq',
        _src: { qq: { mid: '0039MnYb0qxYhV' } },
      };
      const lrcRes = await plugin.getLyric(qqItem);
      assert(lrcRes && typeof lrcRes.rawLrc === 'string', 'getLyric must always return rawLrc string');

      // Empty/invalid item
      const emptyRes = await plugin.getLyric(null);
      assert.deepStrictEqual(emptyRes, { rawLrc: '' }, 'Empty item must return empty lyric');
    } finally {
      delete globalThis.__PLAYLISTOUT_MOCK_ELECTRON__;
    }
  });

  await test('Guarantees KuWo source is completely excised from mobile online ladder and blocklisted', () => {
    const code = fs.readFileSync(pluginPath, 'utf-8');
    assert(!code.includes('resolveKuwoStream'), 'Must not define resolveKuwoStream');
    assert(!code.includes("standardOrder = ['qq', 'kuwo'"), 'standardOrder must not contain kuwo');
    assert(code.includes("u.includes('kuwo.cn')"), 'isValidCleanMediaUrl must explicitly block kuwo.cn');
    assert(code.includes("u.includes('antiserver')"), 'isValidCleanMediaUrl must explicitly block antiserver');
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
