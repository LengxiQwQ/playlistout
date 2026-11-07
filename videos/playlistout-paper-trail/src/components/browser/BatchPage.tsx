import React from 'react';
import {COLORS, FONTS} from '../../theme';
import {BATCH_PLAYLISTS, BATCH_TOTAL} from '../../data';
import {interpolate} from 'remotion';
import {between, clamp, springIn} from '../../lib/anim';
import {HandDrawnCheck, Paper, Sticker, Tape} from '../Stationery';
import {CurlyArrow, Sparkle, Star} from '../Doodles';
import {SiteHeader} from './BrowserBits';

const BATCH_FORMATS = [
  {label: 'Excel 多表合一', selected: true},
  {label: 'ZIP · JSON', selected: false},
  {label: 'ZIP · XLSX', selected: false},
  {label: 'ZIP · CSV', selected: false},
];

export const BatchPage: React.FC<{
  frame: number;
  selectedAll: number;
  press: number;
  exportState: number;
  progress: number;
  pageIn: number;
}> = ({frame, selectedAll, press, exportState, progress, pageIn}) => {
  const titleIn = springIn({frame, start: 752, damping: 18, stiffness: 100});
  const cardBase = 754;
  const buttonPulse = interpolate(press, [0, 0.5, 1], [1, 0.965, 1]);
  const progressPercent = Math.round(progress * 100);
  const currentCard = Math.min(11, Math.floor(progress * 12));
  const exporting = exportState > 0.2;
  const done = progress >= 1;
  const selectedCount = 12;

  return (
    <div style={{position: 'relative', width: 1680, minHeight: 906, overflow: 'hidden'}}>
      <SiteHeader compact />
      <div
        style={{
          position: 'absolute',
          left: 104,
          top: 72,
          right: 106,
          opacity: clamp(titleIn),
          transform: `translateY(${(1 - titleIn) * 15}px)`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between'}}>
          <div>
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <Sticker
                bg="#ddf5e8"
                border="#73b991"
                ink="#176b48"
                rotate={-1.4}
                style={{fontFamily: FONTS.hand, fontSize: 12.5, padding: '3px 8px'}}
              >
                QQ 音乐 · 歌单收藏册
              </Sticker>
              <span style={{fontFamily: FONTS.mono, fontSize: 10.5, color: COLORS.inkMuted}}>QQ号：1160951354</span>
            </div>
            <div
              style={{
                fontFamily: FONTS.hand,
                fontSize: 49,
                lineHeight: 1.15,
                color: COLORS.ink,
                marginTop: 3,
                letterSpacing: '0.01em',
              }}
            >
              琴心月满 的音乐手账
            </div>
            <div style={{fontFamily: FONTS.sans, fontSize: 14, color: COLORS.inkSoft, marginTop: 2}}>
              共 12 个公开歌单 · 累计 {BATCH_TOTAL.toLocaleString()} 首歌曲
            </div>
          </div>
          <div style={{textAlign: 'right', paddingBottom: 3}}>
            <div style={{fontFamily: FONTS.handLatin, fontSize: 25, color: COLORS.inkSoft, transform: 'rotate(-2deg)'}}>
              one user, twelve little worlds.
            </div>
            <div style={{fontFamily: FONTS.hand, fontSize: 15, color: COLORS.inkMuted, marginTop: 1}}>
              选择想一起带走的歌单 ↓
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 104,
          top: 211,
          width: 1472,
          height: 166,
          background: '#f8fafc',
          border: '2px solid rgba(45,52,54,0.9)',
          borderRadius: 7,
          boxShadow: '4px 4px 0 rgba(45,52,54,0.8)',
          padding: '16px 20px',
          opacity: clamp(titleIn),
          transform: `translateY(${(1 - titleIn) * 10}px)`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <span style={{fontFamily: FONTS.hand, fontSize: 23, color: COLORS.ink}}>批量打包导出</span>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 10,
                background: '#fff4c9',
                border: '1px solid #d7b85d',
                borderRadius: 3,
                padding: '2px 5px',
                color: '#7a5c1d',
              }}
            >
              一次最多 50 个
            </span>
          </div>
          <div
            style={{
              fontFamily: FONTS.hand,
              fontSize: 14,
              color: '#456a56',
              border: '1.2px dashed #87b39a',
              background: '#f2fbf6',
              borderRadius: 14,
              padding: '3px 9px',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span style={{display: 'flex'}}>
              <HandDrawnCheck size={13} progress={1} />
            </span>
            已选 12 / 12
          </div>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: 7, marginTop: 9}}>
          {BATCH_FORMATS.map((format, i) => (
            <div
              key={format.label}
              style={{
                border: format.selected ? '1.8px solid #2d3436' : '1.2px dashed #9ca8aa',
                background: format.selected ? '#fed7aa' : '#ffffff',
                boxShadow: format.selected ? '2px 2px 0 #2d3436' : 'none',
                borderRadius: 3,
                padding: '4px 8px',
                fontFamily: FONTS.sans,
                fontSize: 10.5,
                fontWeight: format.selected ? 700 : 500,
                color: format.selected ? '#50300d' : '#5f6769',
                transform: format.selected ? 'translate(-1px,-1px)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
              }}
            >
              {format.selected ? '✓ ' : ''}
              {format.label}
            </div>
          ))}
          <span style={{fontFamily: FONTS.sans, fontSize: 9.5, color: '#8a9496'}}>+ TXT / M3U8</span>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: 13, marginTop: 10}}>
          {!exporting ? (
            <>
              <div
                style={{
                  height: 35,
                  padding: '0 15px',
                  background: COLORS.ink,
                  color: '#fff9ea',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: FONTS.hand,
                  fontSize: 16,
                  transform: `scale(${buttonPulse}) translateY(${press * 1.5}px)`,
                  boxShadow: '2.5px 2.5px 0 rgba(45,52,54,0.25)',
                  border: '1px solid #1a2123',
                }}
              >
                📥 一键打包导出选中歌单 ({selectedCount})
              </div>
              <span style={{fontFamily: FONTS.sans, fontSize: 9.5, color: '#7c8586'}}>
                每 450ms 翻一页，稳稳抓取 · 失败会单独标出
              </span>
            </>
          ) : (
            <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: 12}}>
              <div style={{flex: 1}}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: FONTS.sans,
                    fontSize: 10.5,
                    color: done ? '#15803d' : '#334155',
                    marginBottom: 4,
                  }}
                >
                  <span>
                    {done
                      ? `✓ 12 / 12 个歌单已整理完成`
                      : `正在翻阅整理 [${Math.max(1, Math.ceil(progress * 12))}/12] 《${
                          BATCH_PLAYLISTS[currentCard]?.name ?? ''
                        }》...`}
                  </span>
                  <span style={{fontFamily: FONTS.mono}}>{progressPercent}%</span>
                </div>
                <div style={{height: 9, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden'}}>
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      background: done ? '#16a34a' : '#22c55e',
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  fontFamily: FONTS.hand,
                  fontSize: 13,
                  color: '#3f6c53',
                  transform: 'rotate(-2deg)',
                  whiteSpace: 'nowrap',
                }}
              >
                {done ? '一本收好 ♪' : 'hold my place…'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 104,
          top: 397,
          width: 1472,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 15,
        }}
      >
        {BATCH_PLAYLISTS.map((playlist, i) => {
          const cardIn = clamp((frame - cardBase - i * 1.0) / 12);
          const selectProgress = 1;
          const isCurrent = exporting && !done && i === currentCard;
          const isDone = exporting && (done || i < currentCard);
          const lifted = isCurrent ? 4 : 0;
          return (
            <div
              key={playlist.name}
              style={{
                height: 122,
                background: isCurrent ? '#fffdf4' : '#fffdf8',
                border: isCurrent ? '2px solid #e0a13b' : '1.2px solid rgba(45,52,54,0.23)',
                borderRadius: 4,
                boxShadow: isCurrent
                  ? '4px 5px 0 rgba(224,161,59,0.28)'
                  : '2px 2.5px 0 rgba(45,52,54,0.09)',
                opacity: cardIn * (isDone && done ? 0.68 : 1),
                transform: `translateY(${(1 - cardIn) * 20 - lifted}px) rotate(${i % 2 ? 0.35 : -0.35}deg)`,
                padding: '9px 9px 8px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{display: 'flex', gap: 8}}>
                <div
                  style={{
                    width: 49,
                    height: 64,
                    borderRadius: 3,
                    background: playlist.color,
                    border: '1px solid rgba(45,52,54,0.14)',
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <svg width="49" height="64" viewBox="0 0 49 64">
                    <path d="M0 42 Q12 29 25 41 T49 36 V64 H0Z" fill={playlist.tab} opacity="0.48" />
                    <circle cx="34" cy="17" r="8" fill="#fff6d8" opacity="0.9" />
                    <path d="M8 55 L18 38 28 55Z" fill={playlist.tab} opacity="0.72" />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 3,
                      left: 4,
                      fontFamily: FONTS.handLatin,
                      fontSize: 9,
                      color: '#5f5748',
                      background: 'rgba(255,252,242,0.8)',
                      padding: '0 2px',
                    }}
                  >
                    {playlist.tag}
                  </div>
                </div>
                <div style={{minWidth: 0, paddingTop: 2}}>
                  <div
                    style={{
                      fontFamily: FONTS.sans,
                      fontWeight: 700,
                      fontSize: 14,
                      lineHeight: 1.25,
                      color: COLORS.ink,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {playlist.name}
                  </div>
                  <div style={{fontFamily: FONTS.sans, fontSize: 10, color: '#7e8789', marginTop: 2}}>
                    {playlist.count} 首
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      height: 2,
                      width: 52,
                      background: playlist.tab,
                      opacity: 0.4,
                      borderRadius: 99,
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  background: isDone ? '#ddf5e6' : '#ffffff',
                  border: isCurrent ? '1.7px solid #d2942d' : '1.4px solid #2e8b62',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '1px 1px 0 rgba(45,52,54,0.1)',
                }}
              >
                <HandDrawnCheck size={13} progress={1} />
              </div>

              {isCurrent && (
                <div
                  style={{
                    position: 'absolute',
                    left: 8,
                    right: 8,
                    bottom: 5,
                    height: 2,
                    background: 'rgba(224,161,59,0.18)',
                  }}
                >
                  <div style={{width: `${((progress * 12) % 1) * 100}%`, height: '100%', background: '#e0a13b'}} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 104,
          right: 106,
          top: 821,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: clamp(titleIn),
        }}
      >
        <div style={{fontFamily: FONTS.sans, fontSize: 11, color: COLORS.inkMuted}}>
          <span style={{color: '#16a34a'}}>✓</span> 多表合一：一张工作簿里，每个歌单一个 Sheet
          <span style={{margin: '0 8px', opacity: 0.4}}>|</span>
          ZIP：每个歌单一个文件，打包带走
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <span style={{fontFamily: FONTS.hand, fontSize: 14, color: COLORS.inkSoft}}>也可以只选几张</span>
          <CurlyArrow width={64} height={47} color="#9d8d75" progress={clamp(titleIn)} />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 108,
          top: 68,
          opacity: 0.72,
          transform: 'rotate(4deg)',
        }}
      >
        <Star size={18} color="#d7ad56" filled={false} />
      </div>
      <Sparkle size={20} style={{position: 'absolute', left: 96, top: 384, opacity: 0.75}} rotate={-14} />
    </div>
  );
};
