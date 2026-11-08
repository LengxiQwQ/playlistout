import React from 'react';
import { interpolate } from 'remotion';
import { popIn } from '../anim';
import { MechanicalEnterKey } from '../components/MechanicalEnterKey';
import { WashiTape } from '../components/WashiTape';
import { C, F } from '../theme';

export const CliScene: React.FC<{ frame: number }> = ({ frame }) => {
  const titlePop = popIn(frame, 1205, 12, 1.05);

  // 终端阶段时序
  const showPrompt = frame >= 1210;
  const showBanner = frame >= 1218;
  const showPlatforms = frame >= 1230;
  const showInputUrl = frame >= 1245;
  const showDetect = frame >= 1270;
  const showDetails = frame >= 1290;
  const showFormatMenu = frame >= 1315;
  const isEnterPressed = frame >= 1350 && frame <= 1385; // 回车跺下
  const showExportResult = frame >= 1355; // 导出成功

  // 终端内部平滑上卷动画 (随输出增加自动向下滚动，模拟真实终端体验)
  const scrollY = interpolate(
    frame,
    [1210, 1260, 1290, 1315, 1355],
    [0, 0, 90, 220, 360],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // 跨平台独立二进制徽章 (1390 - 1460 帧)
  const osBadges = [
    { name: 'Windows (.exe 独立单文件)', desc: '控制台免安装 · 即开即用', delay: 1395, icon: '🪟' },
    { name: 'macOS (Apple Silicon / Intel)', desc: '双击 .command 自动运行', delay: 1410, icon: '🍎' },
    { name: 'Linux (glibc 通用免依赖)', desc: '轻量极速 · 服务器离线可用', delay: 1425, icon: '🐧' },
    { name: 'npm 一键全局安装', desc: 'npm install -g playlistout', delay: 1440, icon: '⚡' },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* 顶部标题栏 */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 140,
          right: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: titlePop.opacity,
          transform: `scale(${titlePop.scale})`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2
            style={{
              fontFamily: F.display,
              fontSize: 54,
              color: C.ink,
              margin: 0,
            }}
          >
            本地 CLI 命令行终端世界
          </h2>
          <WashiTape color={C.tapeCyan} width={260} height={38} rotate={-1}>
            <span style={{ fontFamily: F.kuaile, fontSize: 20, color: '#0369A1', fontWeight: 800 }}>
              ★ 极客纯本地离线单文件
            </span>
          </WashiTape>
        </div>

        <span
          style={{
            fontFamily: F.mono,
            fontSize: 20,
            color: '#64748B',
            fontWeight: 700,
          }}
        >
          v3.0.0 跨平台独立二进制
        </span>
      </div>

      {/* Windows PowerShell 真实终端窗口 (左中侧占据 1220px) */}
      <div
        style={{
          position: 'absolute',
          top: 155,
          left: 140,
          width: 1220,
          height: 630,
          backgroundColor: '#0C0C0C',
          border: '4px solid #374151',
          borderRadius: 24,
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Windows PowerShell 标题栏 */}
        <div
          style={{
            height: 44,
            backgroundColor: '#1F1F1F',
            borderBottom: '1px solid #333333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* PowerShell 终端图标 */}
            <div
              style={{
                width: 22,
                height: 18,
                backgroundColor: '#012456',
                border: '1px solid #005A9E',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: 11,
                fontFamily: F.mono,
                fontWeight: 900,
              }}
            >
              &gt;_
            </div>
            <span
              style={{
                fontFamily: F.mono,
                fontSize: 16,
                color: '#CCCCCC',
                fontWeight: 600,
              }}
            >
              Windows PowerShell — playlistout
            </span>
          </div>

          {/* 窗口控制按钮 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: '#888888', fontSize: 16 }}>
            <span>&#x2015;</span>
            <span>&#x25A2;</span>
            <span style={{ color: '#EF4444' }}>&#x2715;</span>
          </div>
        </div>

        {/* 终端正文打印窗口 (视口固定，内容平滑上卷) */}
        <div
          style={{
            flex: 1,
            padding: '16px 24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontFamily: F.mono,
              fontSize: 18,
              lineHeight: 1.5,
              color: '#CCCCCC',
              transform: `translateY(-${scrollY}px)`,
              transition: 'transform 0.1s linear',
            }}
          >
            {/* PowerShell 初始提示 */}
            <div style={{ color: '#888888', fontSize: 16, marginBottom: 8 }}>
              Windows PowerShell<br />
              Copyright (C) Microsoft Corporation. All rights reserved.
            </div>

            {showPrompt && (
              <div style={{ marginBottom: 10 }}>
                <span style={{ color: '#CCCCCC' }}>PS C:\Users\LengxiQwQ&gt; </span>
                <span style={{ color: '#FFFFFF', fontWeight: 800 }}>playlistout</span>
              </div>
            )}

            {showBanner && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#38BDF8', fontWeight: 800, fontSize: 19 }}>
                  Playlist Out CLI v3.0.0
                </div>
                <div style={{ color: '#A3E635', fontWeight: 700 }}>
                  把你的歌单带走 - 命令行版
                </div>
                <div style={{ color: '#9CA3AF', fontSize: 16, marginTop: 4 }}>
                  你的歌单，不应该只困在一个音乐平台里。<br />
                  解析、导出，并把歌单继续带进支持的开源播放器。
                </div>
                <div style={{ color: '#6B7280', fontSize: 15, marginTop: 4 }}>
                  作者：LengxiQwQ · GitHub 开源仓库 · 在线网页版
                </div>
                <div style={{ color: '#374151', margin: '8px 0' }}>
                  ────────────────────────────────────────────────────────
                </div>
              </div>
            )}

            {showPlatforms && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '3px 12px', fontSize: 17 }}>
                  <span style={{ color: '#F87171', fontWeight: 700 }}> 1 网易云音乐</span>
                  <span style={{ color: '#9CA3AF' }}>歌单链接 / 分享短链 / 歌单 ID / 用户 UID</span>

                  <span style={{ color: '#34D399', fontWeight: 700 }}> 2 QQ 音乐</span>
                  <span style={{ color: '#9CA3AF' }}>歌单链接 / 分享短链 / 歌单 ID / 用户 QQ号</span>

                  <span style={{ color: '#38BDF8', fontWeight: 700 }}> 3 酷狗音乐</span>
                  <span style={{ color: '#9CA3AF' }}>歌单链接 / 分享短链 / 歌单 ID (普通版需登录，概念版免登全量)</span>

                  <span style={{ color: '#FBBF24', fontWeight: 700 }}> 4 酷我音乐</span>
                  <span style={{ color: '#9CA3AF' }}>歌单链接 / 分享短链 / 歌单 ID</span>

                  <span style={{ color: '#60A5FA', fontWeight: 700 }}> 5 汽水音乐</span>
                  <span style={{ color: '#9CA3AF' }}>歌单链接 / 抖音分享文案 / 歌单 ID</span>

                  <span style={{ color: '#E879F9', fontWeight: 700 }}> 6 咪咕音乐</span>
                  <span style={{ color: '#9CA3AF' }}>歌单链接 / 分享短链 / 歌单 ID</span>
                </div>

                <div style={{ marginTop: 8, fontSize: 16 }}>
                  <div style={{ color: '#FCD34D' }}>💡 直接粘贴链接或分享文案即可自动识别平台。</div>
                  <div style={{ color: '#FCD34D' }}>💡 只有歌单 ID？先输入平台编号。</div>
                </div>
              </div>
            )}

            {showInputUrl && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#E5E7EB' }}>粘贴歌单链接，或输入平台编号:</div>
                <div style={{ color: '#67E8F9', fontWeight: 700 }}>
                  &gt; https://y.qq.com/n/ryqq/playlist/9140654872
                </div>
                <div style={{ color: '#374151', margin: '6px 0' }}>
                  ────────────────────────────────────────────────────────
                </div>
              </div>
            )}

            {showDetect && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#34D399', fontWeight: 800 }}>✅ 已识别：QQ 音乐</div>
                <div style={{ color: '#60A5FA', fontWeight: 700 }}>🚀 正在获取歌单...</div>
              </div>
            )}

            {showDetails && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#F472B6', fontWeight: 800 }}>🎵 歌单详情</div>
                <div style={{ paddingLeft: 18, color: '#E5E7EB', fontSize: 17, lineHeight: 1.45 }}>
                  <div>歌单：花谱、鎖那、鹿乃 𖹭</div>
                  <div style={{ color: '#9CA3AF' }}>作者：琴心月满</div>
                  <div style={{ color: '#38BDF8', fontWeight: 700 }}>歌曲：104 首 · 时长：7 小时 6 分钟 · 状态：VIP 2</div>
                </div>
              </div>
            )}

            {showFormatMenu && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#FBBF24', fontWeight: 800 }}>📦 导出格式</div>
                <div style={{ paddingLeft: 18, fontSize: 16, color: '#D1D5DB', lineHeight: 1.4 }}>
                  <div> 1  Excel (.xlsx)   适合查看、整理和备份</div>
                  <div> 2  JSON  (.json)   适合第三方工具和程序导入</div>
                  <div> 3  CSV   (.csv)    适合表格软件和迁移工具</div>
                  <div> 4  TXT   (.txt)    简单的歌曲清单</div>
                  <div> 5  M3U8  (.m3u8)   通用播放列表</div>
                  <div style={{ color: '#93C5FD', fontWeight: 700, marginTop: 3 }}> Enter 全部导出 &nbsp;|&nbsp; 0 返回</div>
                </div>

                <div style={{ color: '#E5E7EB', marginTop: 8 }}>
                  选择格式，可多选，例如 (1, 2):
                </div>
                <div style={{ color: isEnterPressed ? '#FACC15' : '#34D399', fontWeight: 800 }}>
                  &gt; {isEnterPressed ? '↵ [已按下回车]' : (frame % 20 < 10 ? '█' : ' ')}
                </div>
              </div>
            )}

            {showExportResult && (
              <div
                style={{
                  backgroundColor: '#064E3B',
                  border: '2px solid #10B981',
                  borderRadius: 14,
                  padding: '10px 18px',
                  color: '#A7F3D0',
                  fontWeight: 800,
                  fontSize: 18,
                  marginTop: 10,
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
                }}
              >
                <div>🚀 正在导出...</div>
                <div style={{ color: '#FFFFFF', marginTop: 4 }}>
                  ✅ Excel 【QQ 音乐】花谱、鎖那、鹿乃 𖹭 - 琴心月满.xlsx
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 终端底部纯本地离线承诺状态栏 */}
        <div
          style={{
            height: 38,
            backgroundColor: '#111827',
            borderTop: '1px solid #1F2937',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 15,
            color: '#6B7280',
            fontFamily: F.mono,
          }}
        >
          <span>⚡ 纯本地 Python 3.14 架构 · 零服务端持久化 · 离线开箱即用</span>
          <span style={{ color: '#10B981', fontWeight: 700 }}>Exit Code: 0 (OK)</span>
        </div>
      </div>

      {/* 右侧交互控制台与跨平台徽章 */}
      <div
        style={{
          position: 'absolute',
          right: 90,
          top: 155,
          width: 350,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {osBadges.map((b) => {
            const bPop = popIn(frame, b.delay, 10, 1.1);
            return (
              <div
                key={b.name}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '3px solid #3E5366',
                  borderRadius: 18,
                  padding: '10px 14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  opacity: bPop.opacity,
                  transform: `scale(${bPop.scale})`,
                }}
              >
                <span style={{ fontSize: 24 }}>{b.icon}</span>
                <div>
                  <div
                    style={{
                      fontFamily: F.kuaile,
                      fontSize: 17,
                      color: C.ink,
                      fontWeight: 800,
                    }}
                  >
                    {b.name}
                  </div>
                  <div
                    style={{
                      fontFamily: F.sans,
                      fontSize: 13,
                      color: C.inkMuted,
                      fontWeight: 500,
                    }}
                  >
                    {b.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MechanicalEnterKey isPressed={isEnterPressed} size={230} />
        </div>
      </div>
    </div>
  );
};
