/**
 * Kugou Test Secrets Helper Script
 * Generates an official QR code for logging in with Kugou App,
 * polls for scan and confirmation, and safely sets GitHub Secrets
 * without exposing sensitive tokens to shell history, logs, or command-line arguments.
 *
 * Usage:
 *   npx tsx scripts/get-kugou-secrets.ts [--playlist <url>]
 */

import { createKugouQrCode, checkKugouQrCode } from '../worker/src/providers/kugou/auth';
import { fetchKugouUserPlaylists } from '../worker/src/providers/kugou/client';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const htmlPath = path.resolve(process.cwd(), 'kugou-login-qr.html');
const imgPath = path.resolve(process.cwd(), 'kugou-qr.png');
const artifactDir = 'C:\\Users\\LengxiQwQ\\.gemini\\antigravity\\brain\\a233ecf6-7e88-4201-8fa1-fe6662e9da5d';
const artifactImgPath = path.resolve(artifactDir, 'kugou-qr.png');

function cleanupTempQr(): void {
  try {
    if (fs.existsSync(htmlPath)) {
      fs.unlinkSync(htmlPath);
    }
  } catch {
    // Ignore cleanup errors
  }
  try {
    if (fs.existsSync(imgPath)) {
      fs.unlinkSync(imgPath);
    }
  } catch {
    // Ignore cleanup errors
  }
}

// Register process exit hooks to ensure temporary visual QR page is never left behind
process.on('exit', cleanupTempQr);
process.on('SIGINT', () => {
  cleanupTempQr();
  process.exit(130);
});
process.on('SIGTERM', () => {
  cleanupTempQr();
  process.exit(143);
});

function setSecretViaStdin(name: string, value: string): boolean {
  try {
    const result = spawnSync('gh', ['secret', 'set', name], {
      input: value,
      encoding: 'utf-8',
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    return result.status === 0;
  } catch (err) {
    console.error(`Failed to execute gh secret set ${name}:`, err);
    return false;
  }
}

function checkGhAuth(): boolean {
  try {
    const result = spawnSync('gh', ['auth', 'status'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

function maskToken(token: string): string {
  if (!token || token.length < 8) return '********';
  return `${'*'.repeat(Math.max(4, token.length - 4))}${token.slice(-4)}`;
}

async function main() {
  console.log('==================================================');
  console.log('   Kugou Music Test Secrets Setup Helper');
  console.log('==================================================\n');

  // Check if --playlist argument is supplied
  const playlistArgIndex = process.argv.indexOf('--playlist');
  let targetPlaylistUrl: string | undefined;
  if (playlistArgIndex !== -1 && process.argv[playlistArgIndex + 1]) {
    targetPlaylistUrl = process.argv[playlistArgIndex + 1].trim();
  }

  const isGhAuthenticated = checkGhAuth();
  if (isGhAuthenticated) {
    console.log('[Info] GitHub CLI authenticated. Secrets can be written directly to repository.\n');
  } else {
    console.log('[Warning] GitHub CLI is not logged in. Please ensure gh auth login is performed.\n');
  }

  console.log('1. Generating QR code session from Kugou official login service...');

  try {
    const session = await createKugouQrCode();
    console.log(`\nQR Code Key: ${session.qrcode}`);
    console.log(`\nLogin URL (open on mobile or scan QR): \n${session.loginUrl}\n`);

    // Save visual QR code page for user convenience
    if (session.qrcodeImg && session.qrcodeImg.startsWith('data:image')) {
      fs.writeFileSync(
        htmlPath,
        `<!DOCTYPE html><html><body style="display:grid;place-items:center;height:90vh;font-family:sans-serif;">
          <div style="text-align:center;">
            <h2>酷狗音乐扫码登录</h2>
            <p>请使用酷狗音乐手机 App「扫一扫」并确认授权</p>
            <img src="${session.qrcodeImg}" style="width:260px;height:260px;" />
            <p><a href="${session.loginUrl}" target="_blank">点击直接在浏览器中打开登录页</a></p>
          </div>
        </body></html>`,
        'utf-8',
      );

      try {
        const base64Str = session.qrcodeImg.split(',')[1];
        if (base64Str) {
          const imgBuf = Buffer.from(base64Str, 'base64');
          fs.writeFileSync(imgPath, imgBuf);
          if (fs.existsSync(artifactDir)) {
            fs.writeFileSync(artifactImgPath, imgBuf);
          }
        }
      } catch {
        // Ignore image writing errors
      }

      console.log(`[Action Required] 请用酷狗音乐手机 App 扫描以下页面中的二维码或点击链接确认授权：`);
      console.log(`file://${htmlPath}\n`);

      try {
        spawnSync('cmd.exe', ['/c', 'start', htmlPath], { stdio: 'ignore' });
      } catch {
        // Ignore browser launch errors
      }
    }

    console.log('2. Polling login status (timeout: 5 minutes)...');
    const startTime = Date.now();

    while (Date.now() - startTime < 300000) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await checkKugouQrCode(session.qrcode);
        if (res.status === 'scanned') {
          process.stdout.write('\r[Status] 二维码已扫描，请在手机端点击「确认登录」...   ');
        } else if (res.status === 'waiting') {
          process.stdout.write('\r[Status] 等待手机端扫码...                             ');
        } else if (res.status === 'expired') {
          console.log('\n[Error] 二维码已过期，请重新运行脚本。');
          process.exit(1);
        } else if (res.status === 'success' && res.token && res.userid) {
          console.log('\n\n==================================================');
          console.log('   Login SUCCESS! Authenticated session established');
          console.log('==================================================');
          console.log(`Token acquired: ${maskToken(res.token)}`);
          console.log(`UserID        : ${res.userid}`);
          console.log('==================================================\n');

          if (isGhAuthenticated) {
            console.log('Writing KUGOU_TEST_TOKEN to GitHub Actions Secrets via secure stdin pipe...');
            const okToken = setSecretViaStdin('KUGOU_TEST_TOKEN', res.token);
            console.log(`KUGOU_TEST_TOKEN: ${okToken ? 'SET SUCCESS' : 'FAILED'}`);

            console.log('Writing KUGOU_TEST_USERID to GitHub Actions Secrets via secure stdin pipe...');
            const okUid = setSecretViaStdin('KUGOU_TEST_USERID', res.userid);
            console.log(`KUGOU_TEST_USERID: ${okUid ? 'SET SUCCESS' : 'FAILED'}`);

            if (targetPlaylistUrl) {
              console.log('Writing KUGOU_TEST_PLAYLIST_URL to GitHub Actions Secrets via secure stdin pipe...');
              const okUrl = setSecretViaStdin('KUGOU_TEST_PLAYLIST_URL', targetPlaylistUrl);
              console.log(`KUGOU_TEST_PLAYLIST_URL: ${okUrl ? 'SET SUCCESS' : 'FAILED'}`);
            } else {
              console.log('[Notice] Please configure KUGOU_TEST_PLAYLIST_URL pointing to the current account\'s >300 own playlist.');
            }
          }

          try {
            console.log('\nQuerying user playlists for this account from Kugou gateway...');
            const userPlaylists = await fetchKugouUserPlaylists(res.token, res.userid);
            console.log('\n==================================================');
            console.log(`Found ${userPlaylists.playlists.length} playlists for user ${res.userid}:`);
            for (const p of userPlaylists.playlists) {
              console.log(`  - [ID: ${p.id}] "${p.name}" (${p.trackCount} tracks) ${p.trackCount > 300 ? '--> [QUALIFIES FOR >300 TEST]' : ''}`);
            }
            console.log('==================================================\n');
          } catch (listErr) {
            console.log('[Notice] Could not fetch user playlists automatically:', listErr);
          }

          return;
        }
      } catch {
        // Transient network hiccup during poll
      }
    }

    console.log('\n[Timeout] 5 minutes exceeded without confirmation.');
    process.exit(1);
  } finally {
    cleanupTempQr();
  }
}

main().catch((err) => {
  console.error('Error running Kugou login helper:', err);
  process.exit(1);
});
