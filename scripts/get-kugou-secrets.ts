/**
 * Kugou Test Secrets Helper Script
 * Generates an official QR code for logging in with Kugou App,
 * polls for scan and confirmation, and displays the Token & UserID.
 * Optionally configures GitHub Secrets via gh CLI automatically.
 *
 * Usage:
 *   npx tsx scripts/get-kugou-secrets.ts
 */

import { createKugouQrCode, checkKugouQrCode } from '../worker/src/providers/kugou/auth';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('==================================================');
  console.log('   Kugou Music Test Secrets Setup Helper');
  console.log('==================================================\n');
  console.log('1. Generating QR code session from Kugou official login service...');

  const session = await createKugouQrCode();
  console.log(`\nQR Code Key: ${session.qrcode}`);
  console.log(`\nLogin URL (open on mobile or scan QR): \n${session.loginUrl}\n`);

  // If qrcodeImg base64 exists, save to a temporary HTML / image for easy viewing
  if (session.qrcodeImg && session.qrcodeImg.startsWith('data:image')) {
    const htmlPath = path.resolve(process.cwd(), 'kugou-login-qr.html');
    fs.writeFileSync(
      htmlPath,
      `<!DOCTYPE html><html><body style="display:grid;place-items:center;height:90vh;font-family:sans-serif;">
        <div style="text-align:center;">
          <h2>酷狗音乐扫码登录</h2>
          <p>请使用酷狗音乐手机 App「扫一扫」</p>
          <img src="${session.qrcodeImg}" style="width:260px;height:260px;" />
          <p><a href="${session.loginUrl}" target="_blank">点击直接在浏览器中打开登录页</a></p>
        </div>
      </body></html>`,
      'utf-8',
    );
    console.log(`Saved visual QR code page to: ${htmlPath}`);
    console.log('You can open this HTML file in your browser to scan the QR code.\n');
  }

  console.log('2. Polling login status (timeout: 5 minutes)...');
  const startTime = Date.now();

  while (Date.now() - startTime < 300000) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const res = await checkKugouQrCode(session.qrcode);
      if (res.status === 'scanned') {
        process.stdout.write('\r[Status] 二维码已扫描，请在手机上点击确认登录...   ');
      } else if (res.status === 'waiting') {
        process.stdout.write('\r[Status] 等待扫描二维码...                     ');
      } else if (res.status === 'expired') {
        console.log('\n[Error] 二维码已过期，请重新运行脚本生成新二维码。');
        process.exit(1);
      } else if (res.status === 'success' && res.token && res.userid) {
        console.log('\n\n==================================================');
        console.log('   Login SUCCESS! Successfully obtained credentials');
        console.log('==================================================');
        console.log(`KUGOU_TEST_TOKEN  : ${res.token}`);
        console.log(`KUGOU_TEST_USERID : ${res.userid}`);
        console.log('==================================================\n');

        console.log('To set these secrets in GitHub for Tier 2 acceptance, you can run:');
        console.log(`gh secret set KUGOU_TEST_TOKEN --body "${res.token}"`);
        console.log(`gh secret set KUGOU_TEST_USERID --body "${res.userid}"`);
        console.log('gh secret set KUGOU_TEST_PLAYLIST_URL --body "<YOUR_>300_PLAYLIST_URL>"\n');

        // Cleanup temp file
        const htmlPath = path.resolve(process.cwd(), 'kugou-login-qr.html');
        if (fs.existsSync(htmlPath)) {
          fs.unlinkSync(htmlPath);
        }
        return;
      }
    } catch (pollErr) {
      // transient network hiccup during poll
    }
  }

  console.log('\n[Timeout] 5 minutes exceeded without login.');
  process.exit(1);
}

main().catch((err) => {
  console.error('Error running Kugou login helper:', err);
  process.exit(1);
});
