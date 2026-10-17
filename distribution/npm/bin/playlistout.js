#!/usr/bin/env node

/**
 * PlaylistOut NPM Wrapper
 * Automatically resolves, downloads and executes the native PlaylistOut CLI binary for the host platform.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');

const VERSION = '3.0.0';
const GITHUB_REPO = 'LengxiQwQ/playlistout';

const TARGET_MAP = {
  'win32-x64': {
    assetName: `PlaylistOut-CLI-v${VERSION}-windows-x64.exe`,
    binaryName: `PlaylistOut-v${VERSION}.exe`,
    sha256: '9dce2acdd2c2f9ac1c8bde256a65e58bf7c865ceed9da2078bfa944f0a9bf271',
    isArchive: false,
  },
  'darwin-arm64': {
    assetName: `PlaylistOut-CLI-v${VERSION}-macos-arm64.tar.gz`,
    binaryName: 'PlaylistOut',
    sha256: 'e77ce9496d6072f58e8b1f08eee4d2b5adb5aff4844f6a64c2f83ea986e3fd4e',
    isArchive: true,
  },
  'darwin-x64': {
    assetName: `PlaylistOut-CLI-v${VERSION}-macos-x64.tar.gz`,
    binaryName: 'PlaylistOut',
    sha256: '2e91751fcbb1285fbe829c17ee3c2bc8ead4dec0b95d66e01360f58ffdc3db62',
    isArchive: true,
  },
  'linux-x64': {
    assetName: `PlaylistOut-CLI-v${VERSION}-linux-x64.tar.gz`,
    binaryName: 'PlaylistOut',
    sha256: '52bc36bb1493298b5f63b77826c0f085ffd7eaf299b8c589fd957f0e555b513c',
    isArchive: true,
  },
};

function getPlatformKey() {
  const platform = os.platform();
  const arch = os.arch();
  return `${platform}-${arch}`;
}

function getCacheDir() {
  const home = os.homedir();
  const cacheBase = process.env.PLAYLISTOUT_CACHE_DIR || path.join(home, '.playlistout', 'bin');
  const targetDir = path.join(cacheBase, `v${VERSION}`);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    function requestWithRedirect(currentUrl, redirectCount = 0) {
      if (redirectCount > 10) {
        return reject(new Error('Too many redirects while downloading binary'));
      }

      const req = https.get(currentUrl, { headers: { 'User-Agent': `playlistout-npm/${VERSION}` } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return requestWithRedirect(res.headers.location, redirectCount + 1);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed with HTTP ${res.statusCode} from ${currentUrl}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastReport = 0;

        const fileStream = fs.createWriteStream(destPath);
        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const now = Date.now();
          if (totalBytes > 0 && now - lastReport > 300) {
            const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
            const mb = (downloadedBytes / (1024 * 1024)).toFixed(1);
            const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
            process.stderr.write(`\r[playlistout] Downloading native binary: ${percent}% (${mb}/${totalMb} MB)...`);
            lastReport = now;
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            process.stderr.write(`\r[playlistout] Downloading native binary: 100% complete.        \n`);
            resolve();
          });
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });

      req.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }

    requestWithRedirect(url);
  });
}

function verifySha256(filePath, expectedSha256) {
  const hash = crypto.createHash('sha256');
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  const actualSha256 = hash.digest('hex').toLowerCase();
  return actualSha256 === expectedSha256.toLowerCase();
}

async function ensureBinary() {
  const platformKey = getPlatformKey();
  const config = TARGET_MAP[platformKey];

  if (!config) {
    console.error(`[playlistout] Error: Unsupported platform/architecture: ${platformKey}`);
    console.error(`Supported platforms: ${Object.keys(TARGET_MAP).join(', ')}`);
    process.exit(1);
  }

  const cacheDir = getCacheDir();
  const binaryPath = path.join(cacheDir, config.binaryName);

  if (fs.existsSync(binaryPath)) {
    return binaryPath;
  }

  const downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${VERSION}/${config.assetName}`;
  const tempDownloadPath = path.join(cacheDir, `temp-${config.assetName}`);

  console.error(`[playlistout] First time running v${VERSION}. Downloading native binary for ${platformKey}...`);

  try {
    await downloadFile(downloadUrl, tempDownloadPath);

    if (config.sha256) {
      const isValid = verifySha256(tempDownloadPath, config.sha256);
      if (!isValid) {
        fs.unlinkSync(tempDownloadPath);
        throw new Error('Downloaded file checksum mismatch (SHA-256 verification failed)');
      }
    }

    if (config.isArchive) {
      execSync(`tar -xzf "${tempDownloadPath}" -C "${cacheDir}"`);
      fs.unlinkSync(tempDownloadPath);
    } else {
      fs.renameSync(tempDownloadPath, binaryPath);
    }

    if (os.platform() !== 'win32') {
      fs.chmodSync(binaryPath, 0o755);
    }

    return binaryPath;
  } catch (err) {
    if (fs.existsSync(tempDownloadPath)) {
      try { fs.unlinkSync(tempDownloadPath); } catch (_) {}
    }
    console.error(`[playlistout] Error preparing native executable: ${err.message}`);
    process.exit(1);
  }
}

async function main() {
  const binaryPath = await ensureBinary();
  const args = process.argv.slice(2);

  const child = spawn(binaryPath, args, {
    stdio: 'inherit',
    windowsHide: false,
  });

  child.on('error', (err) => {
    console.error(`[playlistout] Failed to launch binary: ${err.message}`);
    process.exit(1);
  });

  child.on('close', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 0);
    }
  });

  process.on('SIGINT', () => {
    if (child && !child.killed) {
      child.kill('SIGINT');
    }
  });
  process.on('SIGTERM', () => {
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
  });
}

main();
