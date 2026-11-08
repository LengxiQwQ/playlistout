import React from 'react';
import { AbsoluteFill } from 'remotion';
import { ASSETS } from '../assets';
import { C, F, SHADOW } from '../theme';
import { CloudNoteMascot } from '../components/CloudNoteMascot';
import { WashiTape, StickyBadge } from '../components/Stationery';
import { CoverPaperBackground, PlatformStickerRow, useCoverAssets } from './CoverShared';

export const CoverYouTube: React.FC = () => {
  useCoverAssets();

  const width = 1920;
  const height = 1080;

  return (
    <AbsoluteFill
      className="film-root"
      style={{
        width,
        height,
        position: 'relative',
        backgroundColor: C.paper,
        overflow: 'hidden',
      }}
    >
      {/* 1. 真实复古手账纸张底纹与活页孔 */}
      <CoverPaperBackground width={width} height={height} showHoles={true} />

      {/* 2. 右上角：永久官方网址与胶带（注意避开右下角时间戳，稳妥置于右上角） */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          right: 70,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <WashiTape color={C.tapePink} width={210} height={42} rotate={2.5} />
        <div
          style={{
            position: 'absolute',
            right: 18,
            top: 2,
            fontFamily: F.kuaile,
            fontSize: 26,
            color: C.ink,
            fontWeight: 900,
            letterSpacing: 1.2,
            textShadow: '0 1px 0 rgba(255,255,255,0.85)',
          }}
        >
          🌐 playlistout.com
        </div>
      </div>

      {/* 3. 左上角关注度高能标签 */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          zIndex: 25,
        }}
      >
        <StickyBadge bg="#ff3838" ink="#ffffff" borderColor="#2d3436" fontSize={26} rotate={-2}>
          🔥 2026 歌单备份神作
        </StickyBadge>
        <StickyBadge bg={C.yellowCard} ink={C.ink} borderColor="#2d3436" fontSize={24} rotate={1.2}>
          免登录 · 零上传 · 100% 纯本地导出
        </StickyBadge>
        <StickyBadge bg="#7158e2" ink="#ffffff" borderColor="#2d3436" fontSize={22} rotate={-1}>
          + 联动 MusicFree 播放器
        </StickyBadge>
      </div>

      {/* 4. 左侧黄金视觉区：垂直堆叠超大字主标题（彻底避免与右侧角色气泡重叠，小图秒吸睛） */}
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 105,
          width: 1040,
          zIndex: 25,
        }}
      >
        {/* 第一行标题纸板 */}
        <div
          style={{
            display: 'inline-block',
            backgroundColor: '#ffffff',
            border: '4.5px solid #2d3436',
            borderRadius: '22px 18px 24px 16px',
            boxShadow: '10px 12px 0 0 #2d3436',
            padding: '10px 32px',
            transform: 'rotate(-1.5deg)',
          }}
        >
          <div
            style={{
              fontFamily: F.display,
              fontSize: 84,
              lineHeight: 1.06,
              color: '#2d3436',
              letterSpacing: '-1px',
            }}
          >
            全平台音乐歌单
          </div>
        </div>

        {/* 第二行核心爽点：巨大黄色高亮发光胶带 */}
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              display: 'inline-block',
              backgroundColor: '#ffe600',
              border: '5px solid #2d3436',
              borderRadius: '24px 20px 28px 18px',
              boxShadow: '12px 14px 0 0 #2d3436',
              padding: '14px 46px',
              transform: 'rotate(1deg)',
            }}
          >
            <div
              style={{
                fontFamily: F.display,
                fontSize: 104,
                lineHeight: 1.02,
                color: '#ff2d55',
                letterSpacing: '-2px',
                textShadow: '3px 3px 0 #2d3436',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <span>一键全部带走！</span>
              <span style={{ fontSize: 76 }}>🚀</span>
            </div>
          </div>
        </div>

        {/* 第三行核心卖点横幅 */}
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#2d3436',
              color: '#ffffff',
              padding: '8px 24px',
              borderRadius: 14,
              fontFamily: F.sans,
              fontSize: 28,
              fontWeight: 900,
              boxShadow: '4px 6px 0 0 rgba(0,0,0,0.2)',
              whiteSpace: 'nowrap',
            }}
          >
            告别下架变灰 · 几千首歌 3 秒导出！
          </div>
          <div
            style={{
              backgroundColor: '#107c41',
              color: '#ffffff',
              padding: '8px 20px',
              borderRadius: 14,
              border: '3px solid #2d3436',
              fontFamily: F.sans,
              fontSize: 26,
              fontWeight: 900,
              boxShadow: '4px 5px 0 0 #2d3436',
              whiteSpace: 'nowrap',
            }}
          >
            📊 导出 Excel / CSV / TXT
          </div>
        </div>
      </div>

      {/* 5. 下方内容区：左半部分【6大平台徽章 + 真实手账表格卡片】 */}
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 470,
          width: 1060,
          zIndex: 20,
        }}
      >
        {/* 6 大平台官方高清 Logo 排列横条 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '3.5px solid #2d3436',
            borderRadius: 20,
            padding: '14px 24px',
            boxShadow: '6px 8px 0 #2d3436',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 20,
            transform: 'rotate(-0.8deg)',
          }}
        >
          <span
            style={{
              fontFamily: F.kuaile,
              fontSize: 24,
              color: C.ink,
              fontWeight: 900,
              whiteSpace: 'nowrap',
            }}
          >
            支持平台：
          </span>
          <PlatformStickerRow size={66} gap={18} />
        </div>

        {/* 真实歌单卡片与 Excel 预览成果 */}
        <div
          style={{
            marginTop: 20,
            backgroundColor: '#ffffff',
            border: '4px solid #2d3436',
            borderRadius: 22,
            padding: '18px 26px',
            boxShadow: '8px 10px 0 0 #2d3436',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            transform: 'rotate(0.6deg)',
            width: 1030,
            position: 'relative',
          }}
        >
          <WashiTape
            color={C.tapeYellow}
            width={160}
            height={30}
            rotate={-2.5}
            style={{ position: 'absolute', top: -15, left: 40 }}
          />

          {/* 歌单封面与标题 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: 18,
                border: '3.5px solid #2d3436',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '4px 4px 0 #2d3436',
              }}
            >
              <img
                src={ASSETS.covers.folkSong}
                alt="封面"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    backgroundColor: '#22d59c',
                    color: '#064e3b',
                    border: '2px solid #2d3436',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 15,
                    fontFamily: F.sans,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  QQ音乐
                </span>
                <span
                  style={{
                    fontFamily: F.kuaile,
                    fontSize: 32,
                    color: C.ink,
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                  }}
                >
                  《中文民谣、流行》
                </span>
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: F.sans,
                  fontSize: 17,
                  fontWeight: 700,
                  color: C.inkSoft,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  whiteSpace: 'nowrap',
                }}
              >
                <span>👤 创建者：冷汐QwQ</span>
                <span>🎵 48 首已成功解析</span>
                <span style={{ color: '#2ed573' }}>✔ 纯本地直出</span>
              </div>
            </div>
          </div>

          {/* 成果印章与格式 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
            <div
              style={{
                backgroundColor: '#107c41',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: 14,
                border: '3px solid #2d3436',
                boxShadow: '4px 4px 0 #2d3436',
                textAlign: 'center',
                transform: 'rotate(-3deg)',
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 900 }}>📊 EXCEL</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>.xlsx 完整歌单</div>
            </div>
            <div
              style={{
                backgroundColor: '#0984e3',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: 14,
                border: '3px solid #2d3436',
                boxShadow: '4px 4px 0 #2d3436',
                textAlign: 'center',
                transform: 'rotate(2deg)',
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 900 }}>📦 ZIP</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>批量合集打包</div>
            </div>
          </div>
        </div>

        {/* 底部三大保障徽章 */}
        <div style={{ marginTop: 20, display: 'flex', gap: 14 }}>
          <div
            style={{
              backgroundColor: '#ffeaa7',
              border: '2.8px solid #2d3436',
              padding: '8px 18px',
              borderRadius: 12,
              boxShadow: '3.5px 4px 0 #2d3436',
              fontFamily: F.sans,
              fontSize: 20,
              fontWeight: 900,
              color: '#2d3436',
              whiteSpace: 'nowrap',
            }}
          >
            🔒 零数据上传 · 保护隐私
          </div>
          <div
            style={{
              backgroundColor: '#55efc4',
              color: '#006266',
              border: '2.8px solid #2d3436',
              padding: '8px 18px',
              borderRadius: 12,
              boxShadow: '3.5px 4px 0 #2d3436',
              fontFamily: F.sans,
              fontSize: 20,
              fontWeight: 900,
              whiteSpace: 'nowrap',
            }}
          >
            💻 网页即开即用 + 终端 CLI 工具
          </div>
          <div
            style={{
              backgroundColor: '#ff7675',
              color: '#ffffff',
              border: '2.8px solid #2d3436',
              padding: '8px 18px',
              borderRadius: 12,
              boxShadow: '3.5px 4px 0 #2d3436',
              fontFamily: F.sans,
              fontSize: 20,
              fontWeight: 900,
              whiteSpace: 'nowrap',
            }}
          >
            🆓 永久开源免费 · 零广告
          </div>
        </div>
      </div>

      {/* 6. 右侧超大主角吉祥物小困云（独立在右半边，视觉情绪重心，完美避让右下角时间戳） */}
      <div
        style={{
          position: 'absolute',
          right: 40,
          top: 100,
          width: 680,
          height: 860,
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* 醒目漫画爆炸台词泡泡 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '4px solid #2d3436',
            borderRadius: '26px 26px 8px 26px',
            padding: '16px 32px',
            boxShadow: '7px 9px 0 0 #2d3436',
            transform: 'rotate(-2.5deg) translateY(10px)',
            zIndex: 30,
          }}
        >
          <div
            style={{
              fontFamily: F.kuaile,
              fontSize: 34,
              fontWeight: 900,
              color: '#ff2d55',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            “再也不怕歌单变灰啦！” 🎉
          </div>
          <div
            style={{
              fontFamily: F.sans,
              fontSize: 18,
              fontWeight: 800,
              color: C.inkSoft,
              textAlign: 'center',
              marginTop: 4,
              whiteSpace: 'nowrap',
            }}
          >
            粘贴公开链接 · 3秒极速解析导出
          </div>
        </div>

        {/* 530px 巨大萌态破笼欢呼吉祥物小困云 */}
        <div
          style={{
            marginTop: 10,
            transform: 'scale(1.15)',
            filter: 'drop-shadow(8px 12px 0 rgba(45, 52, 54, 0.28))',
          }}
        >
          <CloudNoteMascot
            size={530}
            expression="rescued"
            pose="cheer"
            stickerBorder={true}
          />
        </div>

        {/* 欢呼礼花与金色音符 */}
        <div
          style={{
            position: 'absolute',
            top: 130,
            left: 10,
            fontFamily: F.display,
            fontSize: 56,
            color: '#ff9f43',
            transform: 'rotate(-20deg)',
          }}
        >
          ♪
        </div>
        <div
          style={{
            position: 'absolute',
            top: 90,
            right: 30,
            fontFamily: F.display,
            fontSize: 64,
            color: '#54a0ff',
            transform: 'rotate(18deg)',
          }}
        >
          ♫
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 220,
            left: 30,
            fontFamily: F.display,
            fontSize: 40,
            color: '#1dd1a1',
            transform: 'rotate(12deg)',
          }}
        >
          ★
        </div>
      </div>
    </AbsoluteFill>
  );
};
