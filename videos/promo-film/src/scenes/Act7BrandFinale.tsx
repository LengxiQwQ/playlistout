import React from 'react';
import { Img, staticFile } from 'remotion';
import { lerp, sceneEnvelope, springPop } from '../utils/motion';
import { JournalSticker, MarkerBtn, WashiTape } from '../components/Stationery';

export const Act7BrandFinale: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < 1588) return null;

  const sceneOpacity = sceneEnvelope(frame, 1588, 1612, 1681, 1690);
  const cardProgress = springPop(frame, 1594, { damping: 14, stiffness: 130 });
  const logoPop = springPop(frame, 1602, { damping: 12, stiffness: 150 });
  const urlPop = springPop(frame, 1614, { damping: 12, stiffness: 150 });
  const badgesPop = springPop(frame, 1624, { damping: 13, stiffness: 140 });

  const floatY = Math.sin((frame - 1600) * 0.08) * 3.5;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: sceneOpacity,
        pointerEvents: 'none',
      }}
    >
      {/* Left Top Souvenir Sticky: 6 Platforms Unlocked */}
      <div
        className="hand-border shadow-sticky paper-textured"
        style={{
          position: 'absolute',
          left: 116,
          top: 205 + floatY,
          width: 284,
          backgroundColor: '#dff7ef',
          padding: '18px 18px',
          opacity: badgesPop,
          transform: `translateX(${lerp(-40, 0, badgesPop)}px) rotate(-3.2deg)`,
        }}
      >
        <WashiTape color="green" width={88} rotateDeg={-4} style={{ position: 'absolute', top: -11, left: 84 }} />
        <div className="font-brush" style={{ fontSize: 25, color: '#14532d', marginBottom: 8 }}>
          六大主流平台支持
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['QQ 音乐', '网易云音乐', '汽水音乐', '酷我音乐', '咪咕音乐', '酷狗音乐'].map((p) => (
            <JournalSticker key={p} color="white" style={{ fontSize: 12.5, padding: '2px 9px' }}>
              {p}
            </JournalSticker>
          ))}
        </div>
        <div className="font-playful" style={{ fontSize: 13.5, color: '#166534', marginTop: 10 }}>
          ✓ 单歌单解析 · 用户公开歌单批量聚合
        </div>
      </div>

      {/* Left Bottom Souvenir Sticky: Multi-Format Local Export */}
      <div
        className="hand-border-alt shadow-sticky paper-textured"
        style={{
          position: 'absolute',
          left: 128,
          top: 520 - floatY,
          width: 278,
          backgroundColor: '#fde8ec',
          padding: '18px 18px',
          opacity: badgesPop,
          transform: `translateX(${lerp(-35, 0, badgesPop)}px) rotate(2.4deg)`,
        }}
      >
        <WashiTape color="pink" width={88} rotateDeg={3} style={{ position: 'absolute', top: -11, left: 86 }} />
        <div className="font-brush" style={{ fontSize: 25, color: '#831843', marginBottom: 8 }}>
          全格式端侧导出
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['.xlsx', '.json', '.csv', '.txt', '.m3u8', '.md', '.zip'].map((ext) => (
            <span
              key={ext}
              className="font-mono"
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                backgroundColor: '#ffffff',
                border: '1.8px solid #2d3436',
                borderRadius: 6,
                padding: '2px 7px',
                color: '#2d3436',
              }}
            >
              {ext}
            </span>
          ))}
        </div>
        <div className="font-playful" style={{ fontSize: 13.5, color: '#831843', marginTop: 10 }}>
          ✓ 浏览器端与本地 CLI 直接生成文件
        </div>
      </div>

      {/* Right Top Souvenir Sticky: Cross-Platform CLI */}
      <div
        className="hand-border shadow-sticky paper-textured"
        style={{
          position: 'absolute',
          right: 102,
          top: 205 - floatY,
          width: 288,
          backgroundColor: '#e8f8ff',
          padding: '18px 18px',
          opacity: badgesPop,
          transform: `translateX(${lerp(40, 0, badgesPop)}px) rotate(3.2deg)`,
        }}
      >
        <WashiTape color="cyan" width={92} rotateDeg={4} style={{ position: 'absolute', top: -11, left: 88 }} />
        <div className="font-brush" style={{ fontSize: 25, color: '#1e3a8a', marginBottom: 6 }}>
          跨平台桌面 CLI
        </div>
        <div className="font-mono" style={{ fontSize: 12.5, color: '#2d3436', fontWeight: 700, marginBottom: 6 }}>
          Windows · macOS · Linux
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: 12,
            backgroundColor: '#1c1815',
            color: '#86efac',
            padding: '5px 8px',
            borderRadius: 6,
            marginBottom: 6,
          }}
        >
          $ playlistout &lt;url&gt;
        </div>
        <div className="font-playful" style={{ fontSize: 13.5, color: '#1e3a8a' }}>
          ✓ 交互式菜单 + 自动化命令行双模式
        </div>
      </div>

      {/* Right Bottom Souvenir Sticky: Open Ecosystem */}
      <div
        className="hand-border-alt shadow-sticky paper-textured"
        style={{
          position: 'absolute',
          right: 114,
          top: 520 + floatY,
          width: 284,
          backgroundColor: '#fff8bd',
          padding: '18px 18px',
          opacity: badgesPop,
          transform: `translateX(${lerp(35, 0, badgesPop)}px) rotate(-2.5deg)`,
        }}
      >
        <WashiTape color="yellow" width={92} rotateDeg={-3} style={{ position: 'absolute', top: -11, left: 84 }} />
        <div className="font-brush" style={{ fontSize: 25, color: '#2d3436', marginBottom: 8 }}>
          开源生态互联 ♪
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['MusicFree', '洛雪音乐', 'Listen 1', 'Soundiiz', 'Public API'].map((item) => (
            <JournalSticker key={item} color="white" style={{ fontSize: 12.5, padding: '2px 9px' }}>
              {item}
            </JournalSticker>
          ))}
        </div>
        <div className="font-playful" style={{ fontSize: 13.5, color: '#576064', marginTop: 10 }}>
          ✓ 歌单不止于备份，更能自由流动
        </div>
      </div>

      {/* Central Hero Brand Journal Card */}
      <div
        className="hand-border shadow-paper paper-textured"
        style={{
          position: 'absolute',
          left: 445,
          top: 126,
          width: 1030,
          backgroundColor: '#fffdf9',
          padding: '38px 48px 34px',
          textAlign: 'center',
          opacity: cardProgress,
          transform: `translateY(${lerp(40, 0, cardProgress)}px) scale(${lerp(0.94, 1, cardProgress)}) rotate(-0.3deg)`,
        }}
      >
        <WashiTape color="pink" width={138} rotateDeg={-4} style={{ position: 'absolute', top: -14, left: 120 }} />
        <WashiTape color="yellow" width={144} rotateDeg={2.5} style={{ position: 'absolute', top: -15, left: 440 }} />
        <WashiTape color="green" width={136} rotateDeg={3.8} style={{ position: 'absolute', top: -13, right: 120 }} />

        {/* Logo + English Brand */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 18,
            marginBottom: 14,
            transform: `scale(${lerp(0.8, 1, logoPop)})`,
          }}
        >
          <div
            className="hand-border-subtle shadow-cutout-sm"
            style={{
              width: 78,
              height: 78,
              borderRadius: 18,
              backgroundColor: '#fff8bd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-3deg)',
            }}
          >
            <Img src={staticFile('images/logo-512.png')} style={{ width: 62, height: 62, objectFit: 'contain' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div
              className="font-en-marker"
              style={{
                fontSize: 48,
                color: '#2d3436',
                lineHeight: 1.05,
                letterSpacing: '0.02em',
              }}
            >
              Playlist Out
            </div>
            <div className="font-en-hand" style={{ fontSize: 24, color: '#576064', fontWeight: 700 }}>
              Paste. Parse. Export. Keep moving.
            </div>
          </div>
        </div>

        {/* Main Chinese Brush Title */}
        <div style={{ position: 'relative', margin: '6px auto 14px' }}>
          <span
            className="font-brush"
            style={{
              position: 'relative',
              display: 'inline-block',
              fontSize: 82,
              color: '#2d3436',
              lineHeight: 1.1,
              padding: '0 18px',
              zIndex: 1,
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 8,
                right: 8,
                bottom: 10,
                height: 26,
                backgroundColor: 'rgba(253, 224, 71, 0.62)',
                borderRadius: '14px 4px 12px 6px',
                transform: 'rotate(-0.8deg)',
                zIndex: -1,
              }}
            />
            把你的歌单带走
          </span>
        </div>

        {/* Warm Subtitle */}
        <div
          className="font-playful"
          style={{
            fontSize: 22,
            color: '#576064',
            marginBottom: 24,
          }}
        >
          把散落在各大音乐平台的歌单，重新收进一本属于你自己的手账里 ♪
        </div>

        {/* Website URL Banner */}
        <div
          className="hand-border shadow-cutout"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            backgroundColor: '#fff8bd',
            padding: '12px 32px',
            transform: `scale(${lerp(0.88, 1, urlPop)}) rotate(-0.5deg)`,
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 24 }}>🌐</span>
          <span
            className="font-mono"
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: '#2d3436',
              letterSpacing: '0.01em',
            }}
          >
            playlistout.lengxiqwq.com
          </span>
          <JournalSticker color="green" style={{ fontSize: 13.5, padding: '3px 10px' }}>
            在线即用 · 免安装
          </JournalSticker>
        </div>

        {/* GitHub & Open Source Footer Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            flexWrap: 'wrap',
            paddingTop: 18,
            borderTop: '1.8px dashed rgba(45, 52, 54, 0.25)',
          }}
        >
          <MarkerBtn variant="paper" rotateDeg={-0.6} style={{ padding: '7px 18px', fontSize: 16 }}>
            <span>⭐ GitHub:</span>
            <span className="font-mono" style={{ fontSize: 15, fontWeight: 700 }}>
              github.com/LengxiQwQ/playlistout
            </span>
          </MarkerBtn>

          <MarkerBtn variant="yellow" rotateDeg={0.5} style={{ padding: '7px 16px', fontSize: 16 }}>
            <span>📜 MIT 开源协议</span>
          </MarkerBtn>

          <MarkerBtn variant="paper" rotateDeg={-0.4} style={{ padding: '7px 16px', fontSize: 16 }}>
            <span>♥ 完全免费 · 端侧隐私优先</span>
          </MarkerBtn>
        </div>
      </div>

      {/* Bottom Red Notebook Page Boundary matching real website */}
      <div
        style={{
          position: 'absolute',
          left: 240,
          right: 160,
          bottom: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          opacity: badgesPop,
        }}
      >
        <div style={{ flex: 1, height: 1.8, backgroundColor: 'rgba(225, 29, 72, 0.35)' }} />
        <span
          className="font-playful"
          style={{
            fontSize: 16.5,
            color: '#e11d48',
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          ✦ END OF PAGE · 愿每一个音符，都能跟上你的足迹 ✦
        </span>
        <div style={{ flex: 1, height: 1.8, backgroundColor: 'rgba(225, 29, 72, 0.35)' }} />
      </div>
    </div>
  );
};
