import React from 'react';
import { BORDERS, COLORS, FONTS, SHADOWS } from '../theme/tokens';
import { journalSpring, smoothStep, snappySpring } from '../utils/motion';
import {
  MarkerHighlight,
  PaperCard,
  StickerBadge,
  WashiTape,
  type StickerColor,
} from '../components/JournalPrimitives';

interface PlayerIntegrationCard {
  id: string;
  name: string;
  icon: string;
  iconBg: string;
  statusBadge: string;
  statusColor: StickerColor;
  modeBadge: string;
  modeColor: StickerColor;
  cardBg: string;
  summary: string;
  flowPill: string;
  appearFrame: number;
  rot: number;
}

const PLAYERS: PlayerIntegrationCard[] = [
  {
    id: 'musicfree',
    name: 'MusicFree',
    icon: '🎧',
    iconBg: '#1e293b',
    statusBadge: '✓ 已支持',
    statusColor: 'green',
    modeBadge: '官方插件接入',
    modeColor: 'cyan',
    cardBg: COLORS.noteBlue,
    summary: '在 MusicFree 安装官方插件后，通过「导入外部歌单」直接粘贴歌单链接，或选择本地导出的 JSON 文件即可导入。',
    flowPill: '插件网络安装 ➜ 粘贴链接 / 导入本地 JSON',
    appearFrame: 1465,
    rot: -0.9,
  },
  {
    id: 'lxmusic',
    name: '洛雪音乐 (LX Music)',
    icon: '❄️',
    iconBg: '#dcfce7',
    statusBadge: '✓ 已支持',
    statusColor: 'green',
    modeBadge: '专用格式导出',
    modeColor: 'purple',
    cardBg: '#ffffff',
    summary: '网页端一键导出【洛雪音乐】专用 .json 格式，在客户端「我的列表」右键选择「导入列表」即可秒级还原歌单。',
    flowPill: '导出专用 .json ➜ 我的列表 ➜ 导入列表',
    appearFrame: 1482,
    rot: 0.7,
  },
  {
    id: 'listen1',
    name: 'Listen 1',
    icon: '🎵',
    iconBg: '#fef3c7',
    statusBadge: '✓ 已支持',
    statusColor: 'green',
    modeBadge: '专用备份导出',
    modeColor: 'yellow',
    cardBg: '#ffffff',
    summary: '网页端一键导出【Listen 1】专用备份 .json，在客户端「设置 ➜ 备份与恢复」点击「从本地文件恢复」直接合并。',
    flowPill: '导出备份 .json ➜ 备份与恢复 ➜ 本地文件恢复',
    appearFrame: 1498,
    rot: -0.6,
  },
];

export const Act6Ecosystem: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < 1445 || frame > 1618) return null;

  const enterProg = smoothStep(frame, 1445, 1468, 0, 1);
  const exitProg = smoothStep(frame, 1595, 1615, 0, 1);
  const sceneOpacity = enterProg * (1 - exitProg);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: sceneOpacity,
        transform: `translateY(${(1 - enterProg) * 40 - exitProg * 40}px)`,
      }}
    >
      {/* Top Section Headline */}
      <div
        style={{
          position: 'absolute',
          left: 145,
          right: 60,
          top: 84,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          opacity: smoothStep(frame, 1456, 1470, 0, 1) * (1 - smoothStep(frame, 1592, 1604, 0, 1)),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, whiteSpace: 'nowrap' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: FONTS.handwriting,
              fontSize: 44,
              fontWeight: 700,
              color: COLORS.ink,
              whiteSpace: 'nowrap',
            }}
          >
            把歌单带进{' '}
            <MarkerHighlight frame={frame} startFrame={1460} color={COLORS.highlightYellow}>
              更多地方
            </MarkerHighlight>{' '}
            ♪
          </h2>
          <span
            style={{
              fontFamily: FONTS.sans,
              fontSize: 19,
              fontWeight: 600,
              color: COLORS.inkLight,
              whiteSpace: 'nowrap',
            }}
          >
            不只帮你把歌单导出来，更能继续前往开源播放器、迁移工具与开发者生态
          </span>
        </div>

        <StickerBadge color="yellow" rotateDeg={1.5} style={{ fontSize: 16 }}>
          3 款开源播放器已就绪 ✦
        </StickerBadge>
      </div>

      {/* ==================== 1. TOP ROW: 3 IMPLEMENTED OPEN-SOURCE PLAYERS ==================== */}
      <div
        style={{
          position: 'absolute',
          left: 155,
          right: 60,
          top: 162,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 28,
        }}
      >
        {PLAYERS.map((pl) => {
          const pop = journalSpring(frame, pl.appearFrame);
          const vis = Math.min(1, Math.max(0, (frame - pl.appearFrame) / 8));

          return (
            <div
              key={pl.id}
              style={{
                position: 'relative',
                opacity: vis,
                transform: `translateY(${(1 - pop) * 35}px) scale(${0.88 + 0.12 * pop}) rotate(${pl.rot}deg)`,
              }}
            >
              <WashiTape
                color={pl.id === 'musicfree' ? 'cyan' : pl.id === 'lxmusic' ? 'purple' : 'green'}
                width={125}
                height={26}
                rotateDeg={pl.id === 'lxmusic' ? 5 : -5}
                frame={frame}
                appearFrame={pl.appearFrame + 6}
                style={{ position: 'absolute', top: -12, left: 32, zIndex: 25 }}
              />

              <PaperCard bg={pl.cardBg} cutoutShadow={true} style={{ padding: '24px 26px', height: 420, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  {/* Identity Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        backgroundColor: pl.iconBg,
                        border: `2.5px solid ${COLORS.ink}`,
                        boxShadow: '2px 2px 0 #2d3436',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 30,
                        flexShrink: 0,
                      }}
                    >
                      {pl.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: FONTS.sans,
                          fontSize: 25,
                          fontWeight: 800,
                          color: COLORS.ink,
                        }}
                      >
                        {pl.name}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <StickerBadge color={pl.statusColor} rotateDeg={0} style={{ fontSize: 14, padding: '2px 10px' }}>
                          {pl.statusBadge}
                        </StickerBadge>
                        <StickerBadge color={pl.modeColor} rotateDeg={0} style={{ fontSize: 14, padding: '2px 10px' }}>
                          {pl.modeBadge}
                        </StickerBadge>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p
                    style={{
                      marginTop: 18,
                      fontFamily: FONTS.sans,
                      fontSize: 18,
                      lineHeight: 1.55,
                      color: COLORS.ink,
                      fontWeight: 600,
                    }}
                  >
                    {pl.summary}
                  </p>
                </div>

                {/* Bottom Action Flow Box */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: `2px dashed ${COLORS.ink}`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontFamily: FONTS.mono,
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#1e3a8a',
                    textAlign: 'center',
                  }}
                >
                  {pl.flowPill}
                </div>
              </PaperCard>
            </div>
          );
        })}
      </div>

      {/* ==================== 2. BOTTOM ROW: CLEAR DISTINCTION OF UPCOMING / 3RD-PARTY MIGRATION / DEV API ==================== */}
      <div
        style={{
          position: 'absolute',
          left: 155,
          right: 60,
          top: 625,
          display: 'grid',
          gridTemplateColumns: '0.85fr 1.15fr 1.15fr',
          gap: 26,
        }}
      >
        {/* Box A: Upcoming Native Integration (BBPlayer) */}
        <div
          style={{
            opacity: smoothStep(frame, 1515, 1532, 0, 1),
            transform: `scale(${0.9 + 0.1 * snappySpring(frame, 1515)}) rotate(0.6deg)`,
          }}
        >
          <PaperCard bg={COLORS.noteYellow} cutoutShadow={true} style={{ padding: '20px 24px', height: 295 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <StickerBadge color="yellow" rotateDeg={-1} style={{ fontSize: 16, padding: '3px 12px' }}>
                ⏳ 即将上线 · 适配计划
              </StickerBadge>
              <span style={{ fontFamily: FONTS.mono, fontSize: 15, fontWeight: 700, color: '#92400e' }}>
                软件原生功能
              </span>
            </div>

            <div style={{ marginTop: 14, fontFamily: FONTS.sans, fontSize: 24, fontWeight: 800, color: COLORS.ink }}>
              📺 BBPlayer (B站音乐播放器)
            </div>
            <div style={{ marginTop: 8, fontFamily: FONTS.sans, fontSize: 16.5, lineHeight: 1.5, color: COLORS.inkLight, fontWeight: 600 }}>
              已完成 Playlist Out 歌单导入适配，将在下一正式版中原生内置，无需装插件即可粘贴链接导入。
            </div>
          </PaperCard>
        </div>

        {/* Box B: Third-Party Migration Services (Soundiiz / TuneMyMusic / FreeYourMusic) */}
        <div
          style={{
            opacity: smoothStep(frame, 1530, 1548, 0, 1),
            transform: `scale(${0.9 + 0.1 * snappySpring(frame, 1530)}) rotate(-0.5deg)`,
          }}
        >
          <PaperCard bg={COLORS.notePink} altBorder={true} cutoutShadow={true} style={{ padding: '20px 24px', height: 295 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <StickerBadge color="pink" rotateDeg={1} style={{ fontSize: 16, padding: '3px 12px' }}>
                🌐 第三方歌单迁移服务
              </StickerBadge>
              <span style={{ fontFamily: FONTS.mono, fontSize: 15, fontWeight: 700, color: COLORS.miguPink }}>
                跨流媒体平台搬家
              </span>
            </div>

            <div style={{ marginTop: 14, fontFamily: FONTS.sans, fontSize: 23, fontWeight: 800, color: COLORS.ink }}>
              Soundiiz · TuneMyMusic · FreeYourMusic
            </div>
            <div style={{ marginTop: 8, fontFamily: FONTS.sans, fontSize: 16.5, lineHeight: 1.48, color: COLORS.inkLight, fontWeight: 600 }}>
              • <strong>Soundiiz</strong>：200 首以内支持网页端「一键迁移」直接发送曲目列表。<br />
              • <strong>通用文件上传</strong>：导出标准 CSV / M3U8 / XLSX 即可交给各大迁移服务识别。
            </div>
          </PaperCard>
        </div>

        {/* Box C: Developer Ecosystem (Public API & Canonical JSON) */}
        <div
          style={{
            opacity: smoothStep(frame, 1545, 1562, 0, 1),
            transform: `scale(${0.9 + 0.1 * snappySpring(frame, 1545)}) rotate(0.7deg)`,
          }}
        >
          <PaperCard bg={COLORS.noteMint} cutoutShadow={true} style={{ padding: '20px 24px', height: 295 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <StickerBadge color="green" rotateDeg={-1} style={{ fontSize: 16, padding: '3px 12px' }}>
                🔌 给开发者 · 开放接入
              </StickerBadge>
              <span style={{ fontFamily: FONTS.mono, fontSize: 15, fontWeight: 700, color: '#166534' }}>
                CORS · 免 Token
              </span>
            </div>

            <div style={{ marginTop: 14, fontFamily: FONTS.sans, fontSize: 23, fontWeight: 800, color: COLORS.ink }}>
              Public API & Canonical JSON 协议
            </div>
            <div
              style={{
                marginTop: 8,
                backgroundColor: '#181c22',
                borderRadius: 8,
                padding: '8px 12px',
                fontFamily: FONTS.mono,
                fontSize: 14,
                color: '#86efac',
                border: `2px solid ${COLORS.ink}`,
              }}
            >
              GET /api/v1/resolve?q=https://music.163.com/...
            </div>
            <div style={{ marginTop: 6, fontFamily: FONTS.sans, fontSize: 15.5, color: COLORS.inkLight, fontWeight: 600 }}>
              无需申请密钥，多平台返回统一 JSON Schema，轻松接入自建工具与脚本。
            </div>
          </PaperCard>
        </div>
      </div>
    </div>
  );
};
