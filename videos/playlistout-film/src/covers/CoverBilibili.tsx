import React from 'react';
import { AbsoluteFill } from 'remotion';
import { ASSETS } from '../assets';
import { C, F, SHADOW } from '../theme';
import { CloudNoteMascot } from '../components/CloudNoteMascot';
import { WashiTape, StickyBadge } from '../components/Stationery';
import { CoverPaperBackground, PlatformStickerRow, useCoverAssets } from './CoverShared';

export const CoverBilibili: React.FC = () => {
  useCoverAssets();

  const width = 1440;
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

      {/* 2. 右上角：胶带装饰与官方网址 */}
      <div
        style={{
          position: 'absolute',
          top: 30,
          right: 48,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <WashiTape color={C.tapePink} width={190} height={40} rotate={2} />
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: 4,
            fontFamily: F.kuaile,
            fontSize: 24,
            color: C.ink,
            fontWeight: 900,
            letterSpacing: 1,
            textShadow: '0 1px 0 rgba(255,255,255,0.85)',
          }}
        >
          🌐 playlistout.com
        </div>
      </div>

      {/* 3. 左上角焦点标签 */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          zIndex: 25,
        }}
      >
        <StickyBadge bg="#ff4757" ink="#ffffff" borderColor="#2d3436" fontSize={24} rotate={-2}>
          🔥 歌单拯救必备神器
        </StickyBadge>
        <StickyBadge bg={C.yellowCard} ink={C.ink} borderColor="#2d3436" fontSize={22} rotate={1.5}>
          免登录 · 零上传 · 纯本地导出
        </StickyBadge>
      </div>

      {/* 4. 【核心视觉锤】上下两行超大标题（B站竖屏/小卡片极高辨识度） */}
      <div
        style={{
          position: 'absolute',
          left: 115,
          top: 96,
          zIndex: 25,
        }}
      >
        {/* 主标题纸板容器 */}
        <div
          style={{
            backgroundColor: '#ffe600',
            border: '4.5px solid #2d3436',
            borderRadius: '24px 18px 26px 18px',
            boxShadow: '10px 12px 0 0 #2d3436',
            padding: '16px 36px 18px 36px',
            transform: 'rotate(-1.5deg)',
            display: 'inline-flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: F.display,
              fontSize: 78,
              lineHeight: 1.08,
              color: '#2d3436',
              letterSpacing: '-1px',
            }}
          >
            全平台音乐歌单
          </div>
          <div
            style={{
              fontFamily: F.display,
              fontSize: 96,
              lineHeight: 1.02,
              color: '#ff2d55',
              letterSpacing: '-2px',
              textShadow: '3px 3px 0 #fff',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <span>一键全部带走！</span>
            <span style={{ fontSize: 68 }}>🚀</span>
          </div>
        </div>

        {/* 副标横幅胶带 */}
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            transform: 'rotate(0.6deg)',
          }}
        >
          <div
            style={{
              backgroundColor: '#2d3436',
              color: '#fff',
              padding: '7px 22px',
              borderRadius: 12,
              fontFamily: F.sans,
              fontSize: 26,
              fontWeight: 900,
              boxShadow: '4px 5px 0 0 rgba(0,0,0,0.2)',
              whiteSpace: 'nowrap',
            }}
          >
            告别歌曲变灰 &amp; 下架 · 永久本地备份
          </div>
          <div
            style={{
              backgroundColor: '#2ed573',
              color: '#064e3b',
              padding: '7px 18px',
              borderRadius: 12,
              border: '3px solid #2d3436',
              fontFamily: F.sans,
              fontSize: 24,
              fontWeight: 900,
              boxShadow: '4px 5px 0 0 #2d3436',
              whiteSpace: 'nowrap',
            }}
          >
            导出 Excel / CSV / TXT
          </div>
        </div>
      </div>

      {/* 5. 中间区域：左侧【真实手账导出卡片 + 六大平台】 & 右侧【破笼欢呼吉祥物小困云】 */}
      {/* 5.1 左侧：真实歌单 Excel 导出手账卡片 */}
      <div
        style={{
          position: 'absolute',
          left: 115,
          top: 380,
          width: 760,
          zIndex: 20,
        }}
      >
        {/* 6 大平台官方高清 Logo 排列 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '3.5px solid #2d3436',
            borderRadius: 20,
            padding: '12px 20px',
            boxShadow: SHADOW.cutoutSm,
            display: 'inline-flex',
            flexDirection: 'column',
            gap: 8,
            transform: 'rotate(-0.8deg)',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
            }}
          >
            <span
              style={{
                fontFamily: F.kuaile,
                fontSize: 21,
                color: C.ink,
                fontWeight: 900,
              }}
            >
              🎵 支持 6 大主流音乐平台公开歌单：
            </span>
            <span
              style={{
                fontFamily: F.sans,
                fontSize: 15,
                fontWeight: 800,
                color: '#fff',
                backgroundColor: '#7451eb',
                padding: '3px 10px',
                borderRadius: 8,
                border: '2px solid #2d3436',
                whiteSpace: 'nowrap',
              }}
            >
              + 联动 MusicFree 播放器
            </span>
          </div>
          <PlatformStickerRow size={60} gap={14} />
        </div>

        {/* 实体手账表格卡片 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '4px solid #2d3436',
            borderRadius: 22,
            padding: '20px 26px',
            boxShadow: '8px 10px 0 0 #2d3436',
            transform: 'rotate(1.2deg)',
            position: 'relative',
          }}
        >
          {/* 卡片顶部的和纸胶带 */}
          <WashiTape
            color={C.tapeYellow}
            width={160}
            height={30}
            rotate={-2}
            style={{ position: 'absolute', top: -15, left: 36 }}
          />

          {/* 歌单 Header 预览 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {/* 真实专辑封面 */}
            <div
              style={{
                width: 86,
                height: 86,
                borderRadius: 18,
                border: '3.5px solid #2d3436',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '4px 4px 0 #2d3436',
              }}
            >
              <img
                src={ASSETS.covers.folkSong}
                alt="专辑封面"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    backgroundColor: '#ffeaa7',
                    border: '2px solid #2d3436',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 15,
                    fontFamily: F.sans,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  QQ 音乐
                </span>
                <span
                  style={{
                    fontFamily: F.kuaile,
                    fontSize: 30,
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
                  gap: 14,
                  whiteSpace: 'nowrap',
                }}
              >
                <span>👤 创建者：冷汐QwQ</span>
                <span>🎵 共 48 首歌曲</span>
                <span style={{ color: '#2ed573' }}>✔ 状态正常</span>
              </div>
            </div>

            {/* 导出的绿色 Excel 徽章 */}
            <div
              style={{
                backgroundColor: '#107c41',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: 14,
                border: '3px solid #2d3436',
                boxShadow: '4px 4px 0 #2d3436',
                textAlign: 'center',
                transform: 'rotate(-3.5deg)',
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 900 }}>📊 .XLSX</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Excel 已导出</div>
            </div>
          </div>

          {/* 表格简要预览条目 */}
          <div
            style={{
              marginTop: 14,
              borderTop: '2.5px dashed #2d3436',
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontFamily: F.sans,
              fontSize: 16,
              fontWeight: 700,
              color: C.ink,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9 }}>
              <span>01. 奇怪，我不懂得爱 — 葛雨晴</span>
              <span style={{ color: '#2ed573' }}>[可用] 03:42</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9 }}>
              <span>02. 残酷な天使のテーゼ — 高橋洋子</span>
              <span style={{ color: '#2ed573' }}>[可用] 04:05</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9 }}>
              <span>03. only my railgun — fripSide</span>
              <span style={{ color: '#ff4757' }}>[VIP] 04:17</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5.2 右侧：破笼欢呼的超萌小困云吉祥物（视觉情绪重心） */}
      <div
        style={{
          position: 'absolute',
          right: 35,
          top: 330,
          width: 540,
          height: 620,
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* 漫画式爆炸台词气泡 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '4px solid #2d3436',
            borderRadius: '24px 24px 8px 24px',
            padding: '14px 26px',
            boxShadow: '6px 8px 0 0 #2d3436',
            transform: 'rotate(-3deg) translateY(10px)',
            zIndex: 30,
          }}
        >
          <div
            style={{
              fontFamily: F.kuaile,
              fontSize: 30,
              fontWeight: 900,
              color: '#ff2d55',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            “粘贴链接，3秒搞定！” 🎉
          </div>
          <div
            style={{
              fontFamily: F.sans,
              fontSize: 17,
              fontWeight: 800,
              color: C.inkSoft,
              textAlign: 'center',
              marginTop: 3,
              whiteSpace: 'nowrap',
            }}
          >
            完全免费 · 不限歌曲数量 · 离线保存
          </div>
        </div>

        {/* 吉祥物本尊：巨大 430px 欢呼小困云 */}
        <div
          style={{
            marginTop: 10,
            transform: 'scale(1.05)',
            filter: 'drop-shadow(6px 10px 0 rgba(45, 52, 54, 0.25))',
          }}
        >
          <CloudNoteMascot
            size={430}
            expression="rescued"
            pose="cheer"
            stickerBorder={true}
          />
        </div>

        {/* 欢呼音符与礼花装饰 */}
        <div
          style={{
            position: 'absolute',
            top: 130,
            left: 20,
            fontFamily: F.display,
            fontSize: 46,
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
            right: 40,
            fontFamily: F.display,
            fontSize: 52,
            color: '#54a0ff',
            transform: 'rotate(18deg)',
          }}
        >
          ♫
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 50,
            fontFamily: F.display,
            fontSize: 34,
            color: '#1dd1a1',
            transform: 'rotate(12deg)',
          }}
        >
          ★
        </div>
      </div>

      {/* 6. 底部底栏保障（整齐高对比撕纸徽章阵列，无折行） */}
      <div
        style={{
          position: 'absolute',
          left: 110,
          bottom: 32,
          right: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 25,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            style={{
              backgroundColor: '#ffeaa7',
              border: '2.8px solid #2d3436',
              padding: '8px 16px',
              borderRadius: 12,
              boxShadow: '3.5px 4px 0 #2d3436',
              fontFamily: F.sans,
              fontSize: 19,
              fontWeight: 900,
              color: '#2d3436',
              whiteSpace: 'nowrap',
            }}
          >
            🔒 零数据上传 · 隐私安全
          </div>
          <div
            style={{
              backgroundColor: '#a29bfe',
              color: '#ffffff',
              border: '2.8px solid #2d3436',
              padding: '8px 16px',
              borderRadius: 12,
              boxShadow: '3.5px 4px 0 #2d3436',
              fontFamily: F.sans,
              fontSize: 19,
              fontWeight: 900,
              whiteSpace: 'nowrap',
            }}
          >
            📦 批量 ZIP 一键打包
          </div>
          <div
            style={{
              backgroundColor: '#55efc4',
              color: '#006266',
              border: '2.8px solid #2d3436',
              padding: '8px 16px',
              borderRadius: 12,
              boxShadow: '3.5px 4px 0 #2d3436',
              fontFamily: F.sans,
              fontSize: 19,
              fontWeight: 900,
              whiteSpace: 'nowrap',
            }}
          >
            💻 网页免安装 + 终端 CLI
          </div>
        </div>

        {/* B 站专属硬核标签 */}
        <div
          style={{
            backgroundColor: '#ff6b81',
            color: '#fff',
            border: '3.2px solid #2d3436',
            padding: '8px 20px',
            borderRadius: 14,
            boxShadow: '4px 5px 0 #2d3436',
            fontFamily: F.kuaile,
            fontSize: 24,
            fontWeight: 900,
            transform: 'rotate(-2deg)',
            whiteSpace: 'nowrap',
          }}
        >
          纯干货 · 永久收藏！⭐
        </div>
      </div>
    </AbsoluteFill>
  );
};
