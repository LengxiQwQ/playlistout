import React from 'react';
import { interpolate } from 'remotion';
import { popIn } from '../anim';
import { GoldZipper } from '../components/GoldZipper';
import { WashiTape } from '../components/WashiTape';
import { C, F } from '../theme';

export const BatchScene: React.FC<{ frame: number }> = ({ frame }) => {
  const titlePop = popIn(frame, 905, 12, 1.05);

  // 3 张自建歌单明信片
  const playlists = [
    {
      id: 'pl-1',
      title: '华语流行精选',
      vendor: 'QQ 音乐',
      vendorColor: C.platformQQ,
      count: 45,
      dur: '3 小时 12 分',
      checkF: 920,
      rotate: -1.5,
    },
    {
      id: 'pl-2',
      title: '动漫原声收藏',
      vendor: '网易云音乐',
      vendorColor: C.platformNetEase,
      count: 58,
      dur: '4 小时 05 分',
      checkF: 965,
      rotate: 1.2,
    },
    {
      id: 'pl-3',
      title: '睡前轻音乐伴侣',
      vendor: '酷狗音乐 (概念版)',
      vendorColor: C.platformKuGou,
      count: 48,
      dur: '3 小时 30 分',
      checkF: 1005,
      rotate: -0.8,
    },
  ];

  // 拉链拉动进度 (1075 - 1140 帧)
  const zipperProgress = interpolate(frame, [1075, 1140], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 封箱完成弹出徽章 (1145 帧起)
  const zipSealedPop = popIn(frame, 1145, 12, 1.12);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* 顶部标题 */}
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
            批量歌单整理与独立打包
          </h2>
          <WashiTape color={C.tapeYellow} width={260} height={38} rotate={1}>
            <span style={{ fontFamily: F.kuaile, fontSize: 20, color: '#78350F', fontWeight: 800 }}>
              ★ 一键合并多工作表
            </span>
          </WashiTape>
        </div>

        <span
          style={{
            fontFamily: F.kuaile,
            fontSize: 24,
            color: '#0284C7',
            backgroundColor: '#E0F2FE',
            padding: '6px 18px',
            borderRadius: 16,
            fontWeight: 800,
          }}
        >
          总计 3 个歌单 · 共 151 首曲目
        </span>
      </div>

      {/* 3 张自建歌单明信片 */}
      <div
        style={{
          position: 'absolute',
          top: 175,
          left: 140,
          right: 140,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 28,
        }}
      >
        {playlists.map((pl, idx) => {
          const cardPop = popIn(frame, 905 + idx * 10, 12, 1.06);
          const isChecked = frame >= pl.checkF;
          const checkPop = popIn(frame, pl.checkF, 10, 1.3);

          return (
            <div
              key={pl.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: isChecked ? '4px solid #10B981' : '3px solid #CBD5E1',
                borderRadius: 28,
                padding: '24px 24px',
                boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
                transform: `rotate(${pl.rotate}deg) scale(${cardPop.scale})`,
                opacity: cardPop.opacity,
                position: 'relative',
                height: 250,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    backgroundColor: pl.vendorColor,
                    color: '#FFFFFF',
                    fontFamily: F.kuaile,
                    fontSize: 16,
                    padding: '4px 12px',
                    borderRadius: 12,
                    fontWeight: 800,
                  }}
                >
                  {pl.vendor}
                </span>

                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    border: isChecked ? '3px solid #10B981' : '3px solid #94A3B8',
                    backgroundColor: isChecked ? '#DCFCE7' : '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: isChecked ? `scale(${checkPop.scale})` : 'scale(1)',
                  }}
                >
                  {isChecked && (
                    <span style={{ fontSize: 24, color: '#166534', fontWeight: 900 }}>✓</span>
                  )}
                </div>
              </div>

              <div>
                <h3
                  style={{
                    fontFamily: F.kuaile,
                    fontSize: 30,
                    color: C.ink,
                    margin: '8px 0 6px 0',
                    fontWeight: 900,
                  }}
                >
                  {pl.title}
                </h3>
                <p style={{ fontFamily: F.sans, fontSize: 18, color: C.inkSoft, margin: 0, fontWeight: 600 }}>
                  收录 {pl.count} 首 · 时长 {pl.dur}
                </p>
              </div>

              <div
                style={{
                  borderTop: '2px dashed #E2E8F0',
                  paddingTop: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: F.sans,
                  fontSize: 15,
                  color: isChecked ? '#166534' : '#64748B',
                  fontWeight: 700,
                }}
              >
                <span>{isChecked ? '✓ 已就绪等待合并' : '○ 待确认'}</span>
                <span>独占独立 Sheet</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部牛皮纸拉链封箱大展台 */}
      <div
        style={{
          position: 'absolute',
          bottom: 75,
          left: 140,
          right: 140,
          height: 300,
          backgroundColor: '#EBD9BA',
          border: '4px solid #8A7052',
          borderRadius: 36,
          padding: '24px 36px',
          boxShadow: '0 12px 32px rgba(90, 70, 50, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span
              style={{
                fontFamily: F.kuaile,
                fontSize: 28,
                color: '#5C442D',
                fontWeight: 900,
              }}
            >
              📦 多歌单合并 Excel + 独立 ZIP 文件封箱
            </span>
            <p style={{ fontFamily: F.sans, fontSize: 18, color: '#785A3C', margin: '4px 0 0 0', fontWeight: 600 }}>
              一个 Excel 包含 3 个完整 Sheet · 另自动打包每个歌单独立导出的标准文件
            </p>
          </div>

          {zipSealedPop.opacity > 0 && (
            <div
              style={{
                backgroundColor: '#F59E0B',
                color: '#FFFFFF',
                fontFamily: F.kuaile,
                fontSize: 22,
                padding: '8px 24px',
                borderRadius: 20,
                border: '3px solid #78350F',
                boxShadow: '0 6px 14px rgba(120, 53, 15, 0.25)',
                fontWeight: 900,
                transform: `scale(${zipSealedPop.scale}) rotate(-2deg)`,
              }}
            >
              ★ ZIP 独立文件包就绪！
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}>
          <GoldZipper progress={zipperProgress} width={820} />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '2px dashed #B89B77',
            paddingTop: 12,
          }}
        >
          <span
            style={{
              fontFamily: F.mono,
              fontSize: 20,
              color: '#453220',
              fontWeight: 800,
            }}
          >
            📁 PlaylistOut_Batch_151tracks.zip (含多 Sheet 合并 Excel + 独立 JSON / CSV)
          </span>

          <span
            style={{
              backgroundColor: '#DCFCE7',
              color: '#166534',
              fontFamily: F.kuaile,
              fontSize: 17,
              padding: '4px 14px',
              borderRadius: 12,
              fontWeight: 800,
            }}
          >
            ✓ 本地打包无损
          </span>
        </div>
      </div>
    </div>
  );
};
