import { spawn, execSync, exec } from 'node:child_process';
import process from 'node:process';

console.log('=======================================================');
console.log('         🎵 PlaylistOut 本地全栈一键启动');
console.log('=======================================================\n');

// 1. 先清理端口占用
const ports = [5173, 8787];
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
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // Port not in use, continue
  }
}

console.log('[*] 正在启动后端 Worker (http://localhost:8787)...');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const workerProcess = spawn(npmCmd, ['--prefix', 'worker', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

console.log('[*] 正在启动前端 Web (http://localhost:5173)...');
const webProcess = spawn(npmCmd, ['--prefix', 'web', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

// 2. 稍等 3 秒后在默认浏览器中打开前端页面
setTimeout(() => {
  console.log('\n=======================================================');
  console.log('  ✅ PlaylistOut 本地全栈开发环境已就绪！');
  console.log('  - 前端界面:  http://localhost:5173');
  console.log('  - 后端接口:  http://localhost:8787');
  console.log('  - 健康检查:  http://localhost:8787/health');
  console.log('\n  💡 提示: 按 Ctrl+C 即可同时关闭前后端服务');
  console.log('=======================================================\n');

  const openCmd = isWin ? 'start http://localhost:5173' : 'open http://localhost:5173';
  exec(openCmd);
}, 3000);

// 3. 优雅退出处理
function cleanup() {
  console.log('\n[*] 正在关闭本地开发服务...');
  try {
    workerProcess.kill('SIGTERM');
  } catch {}
  try {
    webProcess.kill('SIGTERM');
  } catch {}

  // 确保端口完全释放
  for (const port of ports) {
    try {
      const output = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const state = parts[3];
        const pid = parts[4];
        if (state === 'LISTENING' && pid && pid !== '0') {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        }
      }
    } catch {}
  }
  console.log('[*] 服务已停止。');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
