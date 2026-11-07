import React from 'react';
import { interpolate } from 'remotion';
import { easeInOutCubic, lerp, rangeProgress, sceneEnvelope, springPop } from '../utils/motion';
import { HandCheck, JournalSticker, MarkerBtn, WashiTape } from '../components/Stationery';

export const Act6EcosystemHub: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < 1445 || frame > 1618) return null;

  const sceneOpacity = sceneEnvelope(frame, 1445, 1468, 1592, 1615);
  const exitLift = easeInOutCubic(rangeProgress(frame, 1590, 1615)) * -42;

  const mainPaperProgress = springPop(frame, 1450, { damping: 14, stiffness: 130 });
  const rightTopProgress = springPop(frame, 1484, { damping: 14, stiffness: 135 });
  const rightBottomProgress = springPop(frame, 1506, { damping: 14, stiffness: 135 });

  const players = [
    {
      id: 'musicfree',
      name: 'MusicFree',
      status: '已支持',
      mode: '官方插件',
      modeColor: 'blue' as const,
      iconBg: '#1c1815',
      iconText: 'MF',
      desc: '开源、插件化、无广告的跨平台音乐播放器。安装「把你的歌单带走」官方插件后，支持直接粘贴歌单链接导入，也支持导入标准 JSON。',
      primaryBtn: '复制插件订阅链接',
      secondaryBtn: '前往下载',
      sourceText: 'GitHub ↗ · 使用说明 ▾',
      delay: 1464,
      highlightStart: 1492,
    },
    {
      id: 'lxmusic',
      name: '洛雪音乐 (LX Music)',
      status: '已支持',
      mode: 'JSON 导入',
      modeColor: 'green' as const,
      iconBg: '#0d9488',
      iconText: 'LX',
      desc: '开源、简洁的跨平台桌面音乐软件。先解析歌单并导出「洛雪音乐专用 JSON」，再在洛雪音乐「我的列表 → 导入列表」选择文件即可完成迁移。',
      primaryBtn: null,
      secondaryBtn: '前往下载',
      sourceText: 'GitHub ↗ · 使用说明 ▾',
      delay: 1478,
      highlightStart: 1516,
    },
    {
      id: 'listen1',
      name: 'Listen 1',
      status: '已支持',
      mode: '备份导入',
      modeColor: 'yellow' as const,
      iconBg: '#2d3436',
      iconText: 'L1',
      desc: '聚合多平台曲库的开源音乐播放器（桌面端与浏览器扩展）。导出 Listen 1 备份 JSON 后，在「设置 → 备份与恢复 → 从本地文件恢复」导入即可！',
      primaryBtn: null,
      secondaryBtn: '前往下载',
      sourceText: 'GitHub ↗ · 官网 ↗ · 使用说明 ▾',
      delay: 1492,
      highlightStart: 1538,
    },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: sceneOpacity,
        transform: `translateY(${exitLift}px)`,
        pointerEvents: 'none',
      }}
    >
      {/* Left-Center: Faithful "把歌单带进更多地方 ♪" PluginEcosystem Paper */}
      <div
        className="hand-border shadow-paper paper-textured"
        style={{
          position: 'absolute',
          left: 112,
          top: 98,
          width: 1055,
          backgroundColor: '#fffdf9',
          backgroundImage:
            'repeating-linear-gradient(transparent, transparent 35px, rgba(210, 195, 175, 0.35) 35px, rgba(210, 195, 175, 0.35) 36px)',
          padding: '26px 30px 20px',
          opacity: mainPaperProgress,
          transform: `translateY(${lerp(36, 0, mainPaperProgress)}px) rotate(-0.3deg)`,
        }}
      >
        <WashiTape color="pink" width={118} rotateDeg={-4} style={{ position: 'absolute', top: -13, left: 64 }} />
        <WashiTape color="green" width={114} rotateDeg={3.5} style={{ position: 'absolute', top: -12, right: 78 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="font-brush" style={{ fontSize: 36, color: '#2d3436' }}>
                把歌单带进更多地方 ♪
              </span>
              <JournalSticker color="yellow" rotateDeg={-1} className="font-playful" style={{ fontSize: 14, padding: '3px 12px' }}>
                开源播放器生态
              </JournalSticker>
            </div>
            <div className="font-playful" style={{ fontSize: 16.5, color: '#576064', marginTop: 4 }}>
              Playlist Out 不只帮你把歌单拿出来，也能把歌单带进更多常用播放器和工具里。
            </div>
          </div>

          {/* Counter Sticky Badge matching real website */}
          <JournalSticker color="yellow" rotateDeg={2} active style={{ padding: '6px 14px', gap: 8 }}>
            <span className="font-brush" style={{ fontSize: 25, color: '#d97706' }}>
              3
            </span>
            <span className="font-playful" style={{ fontSize: 15.5, color: '#2d3436' }}>
              款已支持
            </span>
          </JournalSticker>
        </div>

        {/* 3 Player Integration Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {players.map((p, idx) => {
            const cardP = springPop(frame, p.delay, { damping: 14, stiffness: 145 });
            const isHighlighted = frame >= p.highlightStart && frame <= p.highlightStart + 30;
            return (
              <div
                key={p.id}
                className="hand-border-subtle"
                style={{
                  backgroundColor: idx === 0 ? '#eef8ff' : '#ffffff',
                  padding: '13px 18px',
                  boxShadow: isHighlighted
                    ? '0 0 0 3px #f59e0b, 4px 5px 0 rgba(45,52,54,0.22)'
                    : '2.5px 3.5px 0 rgba(45,52,54,0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 18,
                  opacity: cardP,
                  transform: `translateX(${lerp(-24, 0, cardP)}px) scale(${isHighlighted ? 1.012 : 1})`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        backgroundColor: p.iconBg,
                        border: '2px solid #2d3436',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {p.iconText}
                    </div>
                    <span className="font-playful" style={{ fontSize: 20, fontWeight: 700, color: '#2d3436' }}>
                      {p.name}
                    </span>
                    <JournalSticker color="green" style={{ fontSize: 12.5, padding: '2px 9px' }}>
                      <HandCheck size={13} />
                      <span>{p.status}</span>
                    </JournalSticker>
                    <JournalSticker color={p.modeColor} style={{ fontSize: 12.5, padding: '2px 9px' }}>
                      {p.mode}
                    </JournalSticker>
                  </div>
                  <div className="font-sans" style={{ fontSize: 13.8, color: '#576064', lineHeight: 1.45, fontWeight: 500 }}>
                    {p.desc}
                  </div>
                </div>

                {/* Right Action Column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {p.primaryBtn && (
                      <MarkerBtn
                        variant={isHighlighted ? 'yellow' : 'paper'}
                        rotateDeg={0}
                        style={{ padding: '6px 12px', fontSize: 13.5 }}
                      >
                        {isHighlighted ? '✓ 已复制订阅链接' : p.primaryBtn}
                      </MarkerBtn>
                    )}
                    <MarkerBtn variant="ink" rotateDeg={0} style={{ padding: '6px 14px', fontSize: 13.5 }}>
                      {p.secondaryBtn}
                    </MarkerBtn>
                  </div>
                  <span className="font-playful" style={{ fontSize: 12.5, color: '#7f868a' }}>
                    {p.sourceText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Row: Planned / Upcoming Player Integration (Clearly Distinguished) */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: '1.8px dashed rgba(45, 52, 54, 0.24)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="font-playful" style={{ fontSize: 15, color: '#576064', fontWeight: 700 }}>
              下一批计划支持：
            </span>
            <JournalSticker color="yellow" rotateDeg={-0.6} style={{ fontSize: 13.5, padding: '3px 11px' }}>
              <span className="font-playful">BBPlayer</span>
              <span style={{ color: '#7f868a', fontSize: 12.5 }}>⏳ 待上线 · 软件原生功能内置</span>
            </JournalSticker>
          </div>
          <span className="font-playful" style={{ fontSize: 13.5, color: '#7f868a' }}>
            已上线功能 vs 计划中功能清晰区分
          </span>
        </div>
      </div>

      {/* Right Column Top: Third-Party Migration Panel (Soundiiz / TuneMyMusic / FreeYourMusic) */}
      <div
        className="hand-border-alt shadow-sticky paper-textured"
        style={{
          position: 'absolute',
          right: 76,
          top: 98,
          width: 632,
          backgroundColor: '#fff8bd',
          padding: '20px 22px',
          opacity: rightTopProgress,
          transform: `translateX(${lerp(35, 0, rightTopProgress)}px) rotate(1.1deg)`,
        }}
      >
        <WashiTape color="yellow" width={98} rotateDeg={-3} style={{ position: 'absolute', top: -11, left: 240 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="font-brush" style={{ fontSize: 28, color: '#2d3436' }}>
              第三方歌单迁移 ↗
            </span>
            <JournalSticker color="white" style={{ fontSize: 12, padding: '2px 9px' }}>
              外部第三方服务
            </JournalSticker>
          </div>
          <span className="font-mono" style={{ fontSize: 12, color: '#576064', fontWeight: 700 }}>
            Spotify / Apple Music / YT
          </span>
        </div>

        <div className="font-playful" style={{ fontSize: 14.5, color: '#576064', marginBottom: 10 }}>
          把解析好的歌单通过国际通用迁移服务，继续同步到海外流媒体平台：
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div
            className="hand-border-subtle"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              padding: '10px 12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="font-playful" style={{ fontSize: 16.5, fontWeight: 700, color: '#2d3436' }}>
                Soundiiz
              </span>
              <JournalSticker color="green" style={{ fontSize: 11.5, padding: '1px 7px' }}>
                推荐 · 快捷带入
              </JournalSticker>
            </div>
            <div className="font-sans" style={{ fontSize: 12.5, color: '#576064', lineHeight: 1.42 }}>
              ≤200 首支持「一键发送歌单列表」自动填入；大歌单可下载 CSV / M3U8 上传。
            </div>
          </div>

          <div
            className="hand-border-subtle"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              padding: '10px 12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="font-playful" style={{ fontSize: 16, fontWeight: 700, color: '#2d3436' }}>
                TuneMyMusic / FreeYourMusic
              </span>
            </div>
            <div className="font-sans" style={{ fontSize: 12.5, color: '#576064', lineHeight: 1.42 }}>
              下载通用 CSV、M3U8、XLSX 或 TXT 文件，手动上传至第三方迁移平台完成跨平台搬家。
            </div>
          </div>
        </div>
      </div>

      {/* Right Column Bottom: Developer Hub ("给开发者" — Public API & Canonical JSON Schema) */}
      <div
        className="hand-border shadow-paper paper-textured"
        style={{
          position: 'absolute',
          right: 76,
          top: 382,
          width: 632,
          backgroundColor: '#fffdf9',
          backgroundImage:
            'linear-gradient(rgba(210, 195, 175, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(210, 195, 175, 0.25) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          padding: '20px 22px',
          opacity: rightBottomProgress,
          transform: `translateY(${lerp(28, 0, rightBottomProgress)}px) rotate(-0.8deg)`,
        }}
      >
        <WashiTape color="cyan" width={104} rotateDeg={2.5} style={{ position: 'absolute', top: -11, right: 58 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="font-brush" style={{ fontSize: 28, color: '#2d3436', whiteSpace: 'nowrap' }}>
              给开发者
            </span>
            <JournalSticker color="cyan" style={{ fontSize: 12, padding: '2px 9px' }}>
              开放接口与数据契约
            </JournalSticker>
          </div>
          <span className="font-playful" style={{ fontSize: 13, color: '#576064', whiteSpace: 'nowrap' }}>
            API 文档 ↗ · 接入指南 ↗
          </span>
        </div>

        <div className="font-playful" style={{ fontSize: 14.5, color: '#576064', marginBottom: 12 }}>
          如果你在写插件、迁移工具或桌面客户端，可直接调用 Public API 或复用 Canonical JSON 数据结构：
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div
            className="hand-border-subtle"
            style={{
              backgroundColor: '#ffffff',
              padding: '10px 12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <span className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: '#2d3436' }}>
                Public API v1
              </span>
              <JournalSticker color="green" style={{ fontSize: 11.5, padding: '1px 7px' }}>
                REST · CORS
              </JournalSticker>
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: 11.5,
                color: '#c2410c',
                backgroundColor: '#f6f1e5',
                padding: '4px 6px',
                borderRadius: 5,
                marginBottom: 5,
                fontWeight: 700,
              }}
            >
              GET /api/v1/resolve?q=https://y.qq.com/...
            </div>
            <div className="font-sans" style={{ fontSize: 12.5, color: '#576064' }}>
              直接把歌单链接变成结构化 JSON，支持状态标定与跨平台识别。
            </div>
          </div>

          <div
            className="hand-border-subtle"
            style={{
              backgroundColor: '#ffffff',
              padding: '10px 12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <span className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: '#2d3436' }}>
                Canonical JSON
              </span>
              <JournalSticker color="yellow" style={{ fontSize: 11.5, padding: '1px 7px' }}>
                Schema v1
              </JournalSticker>
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: 11.5,
                color: '#15803d',
                backgroundColor: '#f6f1e5',
                padding: '4px 6px',
                borderRadius: 5,
                marginBottom: 5,
                fontWeight: 700,
              }}
            >
              {`{ "platform": "qq", "tracks": [104] }`}
            </div>
            <div className="font-sans" style={{ fontSize: 12.5, color: '#576064' }}>
              网页导出、CLI 导出与 API 响应共享同一套稳定字段契约。
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            backgroundColor: '#eef8ff',
            border: '1.8px dashed #2d3436',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span className="font-playful" style={{ fontSize: 13.5, color: '#2d3436', fontWeight: 700, whiteSpace: 'nowrap' }}>
            ✦ 歌单不止于备份，更能自由前往任何你喜欢的工具
          </span>
          <span className="font-mono" style={{ fontSize: 11.5, color: '#576064', fontWeight: 700, whiteSpace: 'nowrap' }}>
            Paste · Parse · Export
          </span>
        </div>
      </div>
    </div>
  );
};
