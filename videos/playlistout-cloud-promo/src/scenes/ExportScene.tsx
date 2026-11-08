import React from 'react';
import { interpolate } from 'remotion';
import { popIn } from '../anim';
import { WashiTape } from '../components/WashiTape';
import { C, F } from '../theme';

export const ExportScene: React.FC<{ frame: number }> = ({ frame }) => {
  // 场景标题入场 (605 帧)
  const titlePop = popIn(frame, 605, 12, 1.05);

  // 两大主角卡折纸展开 (Excel 卡 615 帧，JSON 卡 635 帧)
  const excelPop = popIn(frame, 615, 14, 1.06);
  const jsonPop = popIn(frame, 635, 14, 1.06);

  // 底部 4 大格式扇形铺开 (680 - 740 帧)
  const otherFormats = [
    { ext: '.csv', name: 'CSV 表格', desc: '适合数据分析与数据库导入', delay: 690, color: '#0284C7' },
    { ext: '.txt', name: 'TXT 文本', desc: '纯净歌名与歌手清单', delay: 705, color: '#475569' },
    { ext: '.m3u8', name: 'M3U8 列表', desc: '本地播放器通用索引', delay: 720, color: '#D97706' },
    { ext: '.md', name: 'Markdown', desc: '源码内置导出器 · 笔记沉淀', delay: 735, color: '#7C3AED' },
  ];

  // 830 帧时盖上红色火漆印章
  const stampProgress = interpolate(frame, [840, 855], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* 顶部标题与标语 */}
      <div
        style={{
          position: 'absolute',
          top: 65,
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
            立体折纸 · 多格式端侧导出
          </h2>
          <WashiTape color={C.tapeGreen} width={260} height={38} rotate={-1}>
            <span style={{ fontFamily: F.kuaile, fontSize: 20, color: '#065F46', fontWeight: 800 }}>
              ★ 浏览器端侧极速生成
            </span>
          </WashiTape>
        </div>

        <span
          style={{
            fontFamily: F.sans,
            fontSize: 22,
            color: C.inkMuted,
            fontWeight: 600,
          }}
        >
          不经服务端存储 · 隐私零风险
        </span>
      </div>

      {/* 两大主角卡纸 (左右并排展开) */}
      <div
        style={{
          position: 'absolute',
          top: 170,
          left: 140,
          right: 140,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 36,
        }}
      >
        {/* 左主角卡：双工作表 Excel (.xlsx) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '4px solid #166534',
            borderRadius: 32,
            padding: '24px 28px',
            boxShadow: '0 12px 28px rgba(22, 101, 52, 0.16)',
            position: 'relative',
            opacity: excelPop.opacity,
            transform: `scale(${excelPop.scale})`,
            height: 380,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* 顶部标签 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 32 }}>📊</span>
              <div>
                <h3
                  style={{
                    fontFamily: F.kuaile,
                    fontSize: 32,
                    color: '#166534',
                    margin: 0,
                    fontWeight: 900,
                  }}
                >
                  Excel 电子表格 (.xlsx)
                </h3>
                <span style={{ fontFamily: F.sans, fontSize: 18, color: '#15803D', fontWeight: 600 }}>
                  原生适配 Excel / WPS / Apple Numbers
                </span>
              </div>
            </div>
            <span
              style={{
                backgroundColor: '#DCFCE7',
                color: '#166534',
                fontFamily: F.kuaile,
                fontSize: 18,
                padding: '6px 14px',
                borderRadius: 14,
                fontWeight: 800,
              }}
            >
              独家双工作表
            </span>
          </div>

          {/* 双 Sheet 标签页切换结构 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '14px 0' }}>
            {/* Sheet 1 */}
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '2px solid #86EFAC',
                borderRadius: 18,
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontFamily: F.kuaile, fontSize: 22, color: '#166534', fontWeight: 800 }}>
                  📑 Sheet 1: 歌曲完整清单 (104 首)
                </span>
                <p style={{ fontFamily: F.sans, fontSize: 16, color: '#15803D', margin: '4px 0 0 0' }}>
                  包含：序号、歌名、歌手、专辑、时长、音质、播放状态
                </p>
              </div>
              <span style={{ fontSize: 20, color: '#166534' }}>✓ 独立</span>
            </div>

            {/* Sheet 2 */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '2px solid #CBD5E1',
                borderRadius: 18,
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontFamily: F.kuaile, fontSize: 22, color: '#334155', fontWeight: 800 }}>
                  ℹ️ Sheet 2: 歌单元数据与统计
                </span>
                <p style={{ fontFamily: F.sans, fontSize: 16, color: '#64748B', margin: '4px 0 0 0' }}>
                  包含：歌单 ID、标题、创建者、封面链接、导出时间戳
                </p>
              </div>
              <span style={{ fontSize: 20, color: '#64748B' }}>✓ 独立</span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#DCFCE7',
              borderRadius: 14,
              padding: '8px 16px',
              fontFamily: F.sans,
              fontSize: 17,
              color: '#166534',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            无需安装复杂软件，双击直接用常用办公套件打开与整理
          </div>
        </div>

        {/* 右主角卡：标准 Canonical JSON (.json) */}
        <div
          style={{
            backgroundColor: '#0F172A',
            border: '4px solid #38BDF8',
            borderRadius: 32,
            padding: '24px 28px',
            boxShadow: '0 12px 28px rgba(56, 189, 248, 0.16)',
            position: 'relative',
            opacity: jsonPop.opacity,
            transform: `scale(${jsonPop.scale})`,
            height: 380,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* 顶部标签 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 32 }}>📦</span>
              <div>
                <h3
                  style={{
                    fontFamily: F.mono,
                    fontSize: 30,
                    color: '#38BDF8',
                    margin: 0,
                    fontWeight: 900,
                  }}
                >
                  Canonical JSON (.json)
                </h3>
                <span style={{ fontFamily: F.sans, fontSize: 18, color: '#7DD3FC', fontWeight: 600 }}>
                  标准规范契约 · 第三方工具首选
                </span>
              </div>
            </div>
            <span
              style={{
                backgroundColor: '#0369A1',
                color: '#BAE6FD',
                fontFamily: F.mono,
                fontSize: 16,
                padding: '6px 14px',
                borderRadius: 14,
                fontWeight: 700,
              }}
            >
              Schema v3.0
            </span>
          </div>

          {/* 语法高亮代码展示 */}
          <div
            style={{
              backgroundColor: '#1E293B',
              borderRadius: 18,
              padding: '16px 20px',
              fontFamily: F.mono,
              fontSize: 18,
              lineHeight: 1.5,
              color: '#F1F5F9',
              border: '2px solid #334155',
            }}
          >
            <div>
              <span style={{ color: '#F43F5E' }}>"playlist"</span>: &#123;
            </div>
            <div style={{ paddingLeft: 20 }}>
              <span style={{ color: '#38BDF8' }}>"title"</span>:{' '}
              <span style={{ color: '#FDE047' }}>"花谱、鎖那、鹿乃 𖹭"</span>,
            </div>
            <div style={{ paddingLeft: 20 }}>
              <span style={{ color: '#38BDF8' }}>"trackCount"</span>:{' '}
              <span style={{ color: '#A855F7' }}>104</span>,
            </div>
            <div style={{ paddingLeft: 20 }}>
              <span style={{ color: '#38BDF8' }}>"tracks"</span>: [ &#123;{' '}
              <span style={{ color: '#38BDF8' }}>"id"</span>:{' '}
              <span style={{ color: '#A855F7' }}>"10492"</span>,{' '}
              <span style={{ color: '#38BDF8' }}>"status"</span>:{' '}
              <span style={{ color: '#4ADE80' }}>"available"</span> &#125;, ... ]
            </div>
            <div>&#125;</div>
          </div>

          <div
            style={{
              backgroundColor: '#1E293B',
              borderRadius: 14,
              padding: '8px 16px',
              fontFamily: F.sans,
              fontSize: 17,
              color: '#38BDF8',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            100% 结构化数据，无缝导入自建程序、数据库与第三方开源播放器
          </div>
        </div>
      </div>

      {/* 底部 4 大格式横排卡纸 */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 140,
          right: 140,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
        }}
      >
        {otherFormats.map((f) => {
          const fPop = popIn(frame, f.delay, 10, 1.08);
          return (
            <div
              key={f.ext}
              style={{
                backgroundColor: '#FFFFFF',
                border: '3px solid #CBD5E1',
                borderRadius: 22,
                padding: '14px 18px',
                boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
                opacity: fPop.opacity,
                transform: `scale(${fPop.scale})`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontFamily: F.mono,
                    fontSize: 24,
                    fontWeight: 900,
                    color: f.color,
                  }}
                >
                  {f.ext}
                </span>
                <span
                  style={{
                    fontFamily: F.kuaile,
                    fontSize: 18,
                    color: C.ink,
                    fontWeight: 800,
                  }}
                >
                  {f.name}
                </span>
              </div>
              <p
                style={{
                  fontFamily: F.sans,
                  fontSize: 15,
                  color: C.inkMuted,
                  margin: '6px 0 0 0',
                  fontWeight: 500,
                }}
              >
                {f.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* 敲下的端侧生成安全印章 */}
      {stampProgress > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: `translateX(-50%) scale(${0.8 + stampProgress * 0.2}) rotate(-2deg)`,
            border: '4px solid #DC2626',
            borderRadius: 24,
            padding: '8px 28px',
            backgroundColor: 'rgba(254, 226, 226, 0.95)',
            boxShadow: '0 8px 20px rgba(220, 38, 38, 0.25)',
            opacity: stampProgress,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            zIndex: 45,
          }}
        >
          <span style={{ fontSize: 24 }}>★</span>
          <span
            style={{
              fontFamily: F.kuaile,
              fontSize: 22,
              color: '#DC2626',
              fontWeight: 900,
              letterSpacing: '1px',
            }}
          >
            浏览器端侧本地生成 · 零数据中转 · 离线可用
          </span>
          <span style={{ fontSize: 24 }}>★</span>
        </div>
      )}
    </div>
  );
};
