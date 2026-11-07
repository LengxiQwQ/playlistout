import React from 'react';
import {COLORS, FONTS} from '../../theme';
import {PLAYLIST, TRACKS} from '../../data';
import {interpolate} from 'remotion';
import {between, clamp, springIn} from '../../lib/anim';
import {CoverArt, Paper, Sticker, Tape} from '../Stationery';
import {HandArrow, ScribbleUnderline, Sparkle} from '../Doodles';
import {FormatSticker, MiniCover, TableStatus} from './BrowserBits';

const FORMATS = [
  {id: 'xlsx', label: 'Excel (.xlsx)', color: '#def4e8', border: '#72c193', ink: '#176b48', rotate: -1.1},
  {id: 'json', label: 'JSON', color: '#e3f0fc', border: '#8db4d9', ink: '#234e73', rotate: 1.3},
  {id: 'txt', label: 'TXT', color: '#fbf1c9', border: '#d7bc66', ink: '#75581d', rotate: -2},
  {id: 'csv', label: 'CSV', color: '#fae0e7', border: '#dca0ae', ink: '#803a4b', rotate: 1},
  {id: 'm3u8', label: 'M3U8', color: '#e9e2f8', border: '#ad9bd3', ink: '#4d3a73', rotate: -0.8},
];

export const ExportPanel: React.FC<{
  frame: number;
  jsonSelected: boolean;
  press: number;
  selectedTick: number;
  toast: number;
}> = ({frame, jsonSelected, press, selectedTick, toast}) => {
  const jsonPop = springIn({frame, start: 445, damping: 12, stiffness: 180});
  const pressScale = 1 - press * 0.035;
  const btnLabel = jsonSelected ? '导出 (2) ↓' : '导出 (Excel) ↓';

  return (
    <div style={{marginTop: 22, paddingTop: 20, borderTop: '2px dashed rgba(45,52,54,0.22)', position: 'relative'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24}}>
        <div>
          <div style={{fontFamily: FONTS.hand, fontSize: 27, color: COLORS.ink, lineHeight: 1.1}}>
            选择导出格式（可多选）：
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 9, marginTop: 13}}>
            {FORMATS.map((format) => {
              const selected = format.id === 'xlsx' || (format.id === 'json' && jsonSelected);
              const tick = format.id === 'json' ? selectedTick : 1;
              return (
                <FormatSticker
                  key={format.id}
                  label={format.label}
                  color={format.color}
                  border={format.border}
                  ink={format.ink}
                  selected={selected}
                  tick={tick}
                  rotate={format.rotate}
                  style={
                    format.id === 'json'
                      ? {transform: `rotate(${format.rotate}deg) scale(${0.92 + jsonPop * 0.08})`}
                      : undefined
                  }
                />
              );
            })}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
              fontSize: 11.5,
              fontFamily: FONTS.sans,
              color: '#687174',
              background: 'rgba(255,255,255,0.58)',
              border: '1px dashed rgba(45,52,54,0.19)',
              borderRadius: 4,
              padding: '5px 9px',
            }}
          >
            <span style={{color: '#0984e3', fontWeight: 700}}>ℹ</span>
            JSON 可用于播放器、脚本与第三方工具接入。
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, paddingTop: 4}}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              marginRight: 4,
              transform: 'rotate(-1.5deg)',
            }}
          >
            <span style={{fontFamily: FONTS.handLatin, fontSize: 27, color: COLORS.inkMuted}}>take it with you →</span>
            <div
              style={{
                width: 182,
                height: 60,
                background: COLORS.ink,
                border: '1.5px solid #151b1e',
                color: '#fff8ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTS.hand,
                fontSize: 25,
                boxShadow: `${4 - press * 2}px ${4 - press * 2}px 0 rgba(45,52,54,0.26)`,
                transform: `translate(${press * 3}px, ${press * 3}px) scale(${pressScale}) rotate(-1deg)`,
                letterSpacing: '0.02em',
              }}
            >
              {btnLabel}
            </div>
          </div>
          <div style={{fontFamily: FONTS.sans, fontSize: 11, color: COLORS.inkMuted, paddingRight: 6}}>
            文件在浏览器本地生成 · 不上传服务器
          </div>
        </div>
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 15, opacity: 0.88}}>
        <div style={{width: 48, height: 1.5, background: '#c8b89e'}} />
        <span style={{fontFamily: FONTS.hand, fontSize: 16, color: COLORS.inkSoft}}>
          也可以带进 MusicFree、洛雪音乐、Listen 1
        </span>
      </div>

      {toast > 0 && (
        <div
          style={{
            position: 'fixed',
            left: 760,
            top: 796,
            transform: `translate(-50%, ${(1 - toast) * 12}px) rotate(-0.5deg)`,
            opacity: toast,
            background: '#fffdf6',
            border: '2px solid rgba(45,52,54,0.9)',
            borderRadius: 999,
            padding: '8px 20px',
            boxShadow: '4px 4px 0 rgba(45,52,54,0.82)',
            fontFamily: FONTS.hand,
            fontSize: 18,
            color: '#2d3436',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 300,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{color: '#16a34a'}}>✓</span> 已成功导出 2 份文件（XLSX, JSON）
        </div>
      )}
    </div>
  );
};

export const ResultPage: React.FC<{
  frame: number;
  jsonSelected: boolean;
  exportPress: number;
  selectedTick: number;
  toast: number;
  unroll: number;
}> = ({frame, jsonSelected, exportPress, selectedTick, toast, unroll}) => {
  const summaryIn = springIn({frame, start: 284, damping: 16, stiffness: 110});
  const rowBase = 304;
  const rowStagger = 4;

  return (
    <div
      style={{
        position: 'relative',
        width: 1450,
        marginLeft: 115,
        marginTop: 28,
        transform: `translateY(${(1 - unroll) * 22}px)`,
        clipPath: `inset(0 0 ${Math.max(0, (1 - unroll) * 100)}% 0)`,
        opacity: unroll > 0.01 ? 1 : 0,
        filter: unroll < 1 ? 'drop-shadow(0 18px 22px rgba(73,55,30,0.10))' : 'none',
      }}
    >
      <div
        style={{
          fontFamily: FONTS.hand,
          fontSize: 18,
          color: COLORS.inkMuted,
          marginBottom: 10,
          transform: 'rotate(-1deg)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>解析完毕？↓ 你的结果就在这里</span>
        <Sparkle size={15} color="#dcb158" style={{marginTop: 1}} />
      </div>

      <Paper
        color={COLORS.paperWhite}
        style={{
          width: 1450,
          padding: '32px 34px 30px',
          boxShadow: '8px 10px 0 rgba(45,52,54,0.14), 0 18px 36px rgba(64,48,24,0.07)',
        }}
      >
        <Tape color="green" width={96} height={22} rotate={-6} style={{left: 18, top: -10}} opacity={0.75} />
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20}}>
          <div style={{display: 'flex', gap: 18, alignItems: 'flex-start'}}>
            <div style={{position: 'relative', transform: `scale(${0.92 + summaryIn * 0.08}) rotate(-1.4deg)`}}>
              <CoverArt width={94} height={94} radius={5} />
              <div
                style={{
                  position: 'absolute',
                  left: -6,
                  top: -7,
                  width: 36,
                  height: 13,
                  background: 'rgba(244,204,127,0.72)',
                  transform: 'rotate(-8deg)',
                  clipPath: 'polygon(1% 10%, 99% 0%, 100% 90%, 0% 100%)',
                }}
              />
            </div>
            <div>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <Sticker
                  bg="#ddf5e8"
                  border="#73b991"
                  ink="#176b48"
                  rotate={-1.5}
                  style={{fontFamily: FONTS.hand, fontSize: 12.5, padding: '3px 8px'}}
                >
                  QQ 音乐 · 已解析歌单
                </Sticker>
                <span style={{fontFamily: FONTS.mono, fontSize: 10.5, color: '#8a8f92'}}>ID 9140654872</span>
              </div>
              <div
                style={{
                  fontFamily: FONTS.sans,
                  fontWeight: 800,
                  fontSize: 34,
                  lineHeight: 1.15,
                  letterSpacing: '-0.025em',
                  marginTop: 5,
                  color: COLORS.ink,
                }}
              >
                {PLAYLIST.title}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 5,
                  fontFamily: FONTS.sans,
                  fontSize: 13,
                  color: COLORS.inkSoft,
                }}
              >
                <span>共 {PLAYLIST.count} 首歌曲</span>
                <span style={{opacity: 0.55}}>·</span>
                <span>QQ 音乐</span>
                <span style={{opacity: 0.55}}>·</span>
                <span>创建者：{PLAYLIST.creator}</span>
                <span style={{opacity: 0.55}}>·</span>
                <span>{PLAYLIST.duration}</span>
              </div>
              <div style={{display: 'flex', gap: 5, marginTop: 6}}>
                {['#日系', '#循环', '#夜航'].map((tag, i) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 10,
                      color: '#5b6366',
                      background: 'rgba(45,52,54,0.055)',
                      border: '1px solid rgba(45,52,54,0.13)',
                      padding: '1px 5px',
                      borderRadius: 3,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{display: 'flex', gap: 7, flexShrink: 0, paddingTop: 4}}>
            {['在 QQ 音乐中查看 ↗', '解析其他歌单'].map((label, i) => (
              <Sticker
                key={label}
                bg={i === 0 ? '#fffdf7' : '#fff4c5'}
                border={COLORS.ink}
                ink={COLORS.ink}
                rotate={i === 0 ? -0.8 : 1}
                style={{fontFamily: FONTS.hand, fontSize: 12, padding: '4px 8px', boxShadow: '1.5px 1.5px 0 rgba(45,52,54,0.8)'}}
              >
                {label}
              </Sticker>
            ))}
          </div>
        </div>

        <div style={{marginTop: 20, borderBottom: '2px dashed rgba(45,52,54,0.16)'}} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 15,
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <div style={{fontFamily: FONTS.sans, fontSize: 18, fontWeight: 700, color: COLORS.ink}}>
              歌曲列表 <span style={{color: COLORS.inkMuted, fontWeight: 600}}>({PLAYLIST.count})</span>
            </div>
            <span
              style={{
                fontFamily: FONTS.handLatin,
                fontSize: 15,
                color: COLORS.inkMuted,
                transform: 'rotate(-2deg)',
              }}
            >
              two little ears, one long night
            </span>
          </div>
          <div style={{fontFamily: FONTS.mono, fontSize: 10, color: '#9a9f9f'}}>更新于 2026-11-06 · 104 首</div>
        </div>

        <div style={{marginTop: 8, border: '1px solid rgba(45,52,54,0.07)', borderRadius: 3, overflow: 'hidden'}}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '26px 38px minmax(0,1fr) 120px 160px 44px 82px 52px',
              alignItems: 'center',
              gap: 7,
              padding: '8px 11px',
              borderBottom: '1.5px dashed rgba(45,52,54,0.15)',
              background: '#fffdf9',
              fontFamily: FONTS.sans,
              fontSize: 10.5,
              fontWeight: 600,
              color: '#8f9597',
            }}
          >
            <span style={{textAlign: 'center'}}>#</span>
            <span>封面</span>
            <span>歌曲标题</span>
            <span>歌手</span>
            <span>专辑</span>
            <span style={{textAlign: 'center'}}>VIP</span>
            <span style={{textAlign: 'center'}}>状态</span>
            <span style={{textAlign: 'right'}}>时长</span>
          </div>
          {TRACKS.slice(0, 6).map((track, i) => {
            const rowIn = clamp((frame - rowBase - i * rowStagger) / 12);
            const highlight = i === 2 && frame > 370 && frame < 405;
            return (
              <div
                key={track.index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '26px 38px minmax(0,1fr) 120px 160px 44px 82px 52px',
                  alignItems: 'center',
                  gap: 7,
                  padding: '7px 11px',
                  borderBottom: i === 5 ? 'none' : '1px solid rgba(45,52,54,0.065)',
                  background: highlight ? 'rgba(255,242,183,0.38)' : i % 2 ? 'rgba(251,248,240,0.35)' : 'transparent',
                  fontFamily: FONTS.sans,
                  fontSize: 12,
                  color: '#465053',
                  opacity: rowIn,
                  transform: `translateX(${(1 - rowIn) * 10}px)`,
                }}
              >
                <span style={{fontFamily: FONTS.mono, fontSize: 9.5, color: '#a2a6a5', textAlign: 'center'}}>
                  {track.index}
                </span>
                <MiniCover color={track.color} ink={track.ink} size={30} />
                <div style={{display: 'flex', alignItems: 'center', gap: 6, minWidth: 0}}>
                  <span
                    style={{
                      fontWeight: 600,
                      color: COLORS.ink,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {track.title}
                  </span>
                  {track.status === 'vip' && (
                    <span
                      style={{
                        fontSize: 8,
                        color: '#92400e',
                        background: '#fef3c7',
                        border: '1px solid #fcd34d',
                        borderRadius: 2,
                        padding: '1px 3px',
                      }}
                    >
                      VIP
                    </span>
                  )}
                </div>
                <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#4b5563'}}>
                  {track.artist}
                </span>
                <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#71797c'}}>
                  {track.album}
                </span>
                <span style={{textAlign: 'center'}}>
                  {track.vip ? (
                    <span
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 9,
                        fontWeight: 700,
                        color: '#92400e',
                        background: '#fef3c7',
                        border: '1px solid #fcd34d',
                        borderRadius: 3,
                        padding: '1px 4px',
                      }}
                    >
                      VIP
                    </span>
                  ) : null}
                </span>
                <span style={{textAlign: 'center'}}>
                  <TableStatus kind={track.status ?? 'normal'} />
                </span>
                <span style={{fontFamily: FONTS.mono, fontSize: 10, color: '#909696', textAlign: 'right'}}>
                  {track.duration}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 7,
            fontFamily: FONTS.sans,
            fontSize: 10,
            color: '#9a9e9d',
          }}
        >
          <span>共 104 首，当前显示前 6 首 · 向下滚动查看全部</span>
          <span style={{display: 'flex', alignItems: 'center', gap: 4}}>
            已识别 VIP / 下架 / 可用状态 <span style={{color: '#16a34a'}}>✓</span>
          </span>
        </div>

        <ExportPanel
          frame={frame}
          jsonSelected={jsonSelected}
          press={exportPress}
          selectedTick={selectedTick}
          toast={toast}
        />

        <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 18}}>
          <div style={{fontFamily: FONTS.handLatin, fontSize: 20, color: COLORS.inkMuted, transform: 'rotate(-1deg)'}}>
            keep the songs, keep the story.
          </div>
        </div>
      </Paper>
    </div>
  );
};
