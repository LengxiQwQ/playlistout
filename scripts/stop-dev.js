import { execSync } from 'node:child_process';

console.log('=======================================================');
console.log('         🛑 PlaylistOut 本地服务关闭脚本');
console.log('=======================================================\n');

const ports = [5173, 8787];
let killedCount = 0;

for (const port of ports) {
  try {
    const output = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: 'utf8' });
    const lines = output.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const state = parts[3];
      const pid = parts[4];
      if (state === 'LISTENING' && pid && pid !== '0') {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`[*] 已关闭端口 ${port} 上的服务进程 (PID: ${pid})`);
          killedCount++;
        } catch {
          // Process might already be gone
        }
      }
    }
  } catch {
    // Port not in use, ignore
  }
}

if (killedCount === 0) {
  console.log('[*] 未检测到正在运行的端口占用 (5173 / 8787)。');
}

console.log('\n=======================================================');
console.log('  ✅ 已成功关闭所有 PlaylistOut 本地开发服务！');
console.log('=======================================================\n');
