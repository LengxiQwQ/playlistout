import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, FONTS} from '../theme';
import {ECOSYSTEM} from '../data';
import {between, clamp, easeInOutCubic, springIn} from '../lib/anim';
import {HandDrawnCheck, Paper, Sticker, Tape} from '../components/Stationery';
import {CurlyArrow, HandArrow, ScribbleUnderline, Sparkle, Star, WavyDots} from '../components/Doodles';

const Threads: React.FC<{frame: number}> = ({frame}) => {
  const draw = easeInOutCubic(between(frame, 46.5 * 30, 48.3 * 30));
  const fade = 1 - between(frame, 1540, 1560);
  const paths = [
    {d: 'M 960 384 C 845 420, 740 410, 655 450', arrow: true},
    {d: 'M 960 384 C 972 432, 968 466, 1014 512', arrow: true},
    {d: 'M 960 384 C 1105 414, 1240 400, 1348 452', arrow: true},
  ];
  return (
    <svg width="1920" height="1080" style={{position: 'absolute', inset: 0, zIndex: 2, overflow: 'visible'}}>
      {paths.map((path, i) => (
        <g key={i} opacity={draw * fade}>
          <path
            d={path.d}
            fill="none"
            stroke="#c96e63"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="9 7"
            strokeDashoffset={300 * (1 - draw) + i * 8}
          />
          <circle cx={655 + i * 344} cy={430 + i * 35} r={5} fill="#c95f55" stroke="#fdf8ed" strokeWidth="2" />
        </g>
      ))}
    </svg>
  );
};

const PlayerCard: React.FC<{
  frame: number;
  start: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
  name: string;
  status: string;
  method: string;
  detail: string;
  color: string;
  border: string;
  ink: string;
  logo: string;
  logoBg: string;
  guide: string;
  checkStart: number;
  highlight?: boolean;
}> = ({
  frame,
  start,
  x,
  y,
  w,
  h,
  rotate,
  name,
  status,
  method,
  detail,
  color,
  border,
  ink,
  logo,
  logoBg,
  guide,
  checkStart,
  highlight = false,
}) => {
  const enter = springIn({frame, start, damping: 16, stiffness: 95});
  const check = between(frame, checkStart, checkStart + 10);
  const settle = Math.sin(frame / 30 + x) * 0.8;
  const lift = highlight ? 5 : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + (1 - enter) * 50 - lift,
        width: w,
        height: h,
        transform: `rotate(${rotate + settle * 0.1}deg) scale(${0.9 + enter * 0.1})`,
        opacity: enter,
        zIndex: 10,
      }}
    >
      <Paper
        color={color}
        borderColor={border}
        borderWidth={2}
        style={{
          width: w,
          height: h,
          padding: '18px 20px',
          boxShadow: '9px 11px 0 rgba(45,52,54,0.14), 0 20px 30px rgba(61,47,25,0.08)',
        }}
      >
        <Tape color={highlight ? 'yellow' : 'white'} width={84} height={20} rotate={-7} style={{left: 20, top: -10}} opacity={0.7} />
        <div style={{display: 'flex', alignItems: 'flex-start', gap: 12}}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 10,
              background: logoBg,
              border: `1.5px solid ${border}`,
              display: 'grid',
              placeItems: 'center',
              fontFamily: FONTS.marker,
              fontSize: 22,
              color: ink,
              transform: 'rotate(-2deg)',
              boxShadow: '2px 2px 0 rgba(45,52,54,0.12)',
              flexShrink: 0,
            }}
          >
            {logo}
          </div>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontFamily: FONTS.hand, fontSize: 32, lineHeight: 1.05, color: COLORS.ink}}>{name}</div>
            <div style={{marginTop: 4}}>
              <Sticker
                bg={highlight ? '#fff2b4' : '#fffdf7'}
                border={border}
                ink={ink}
                rotate={-1.4}
                style={{fontFamily: FONTS.hand, fontSize: 12.5, padding: '3px 7px', boxShadow: '1.5px 1.5px 0 rgba(45,52,54,0.55)'}}
              >
                {status}
              </Sticker>
            </div>
          </div>
          <div
            style={{
              width: 27,
              height: 27,
              borderRadius: '50%',
              border: `1.6px solid ${border}`,
              background: check > 0.5 ? '#fffdf7' : 'transparent',
              display: 'grid',
              placeItems: 'center',
              transform: `scale(${0.7 + check * 0.3})`,
              flexShrink: 0,
            }}
          >
            {check > 0.1 && <HandDrawnCheck size={17} progress={check} color={ink} />}
          </div>
        </div>

        <div
          style={{
            marginTop: 17,
            borderTop: `1.3px dashed ${border}66`,
            paddingTop: 11,
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 7}}>
            <span style={{fontFamily: FONTS.hand, fontSize: 19, color: ink}}>{method}</span>
            <span style={{fontFamily: FONTS.mono, fontSize: 9, opacity: 0.65, color: ink}}>HOW TO</span>
          </div>
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 12,
              lineHeight: 1.5,
              color: '#596263',
              marginTop: 5,
            }}
          >
            {detail}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 20,
            right: 18,
            bottom: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{fontFamily: FONTS.hand, fontSize: 13, color: ink, opacity: 0.82}}>{guide}</span>
          <span style={{fontFamily: FONTS.sans, fontSize: 9, color: ink, opacity: 0.62}}>↗</span>
        </div>
      </Paper>
    </div>
  );
};

const JsonSeed: React.FC<{frame: number}> = ({frame}) => {
  const enter = springIn({frame, start: 1370, damping: 14, stiffness: 120});
  const count = Math.round(interpolate(frame, [1375, 1398], [0, 9], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const lines = [
    '{',
    '  "name": "花谱、鎖那、鹿乃",',
    '  "platform": "qqmusic",',
    '  "trackCount": 104,',
    '  "tracks": [ … ]',
    '}',
  ];
  const visible = lines.slice(0, Math.max(0, Math.floor(count / 2)));
  return (
    <div
      style={{
        position: 'absolute',
        left: 960,
        top: 322,
        width: 310,
        height: 134,
        transform: `translate(-50%, -50%) translateY(${(1 - enter) * 28}px) rotate(-1.6deg) scale(${0.8 + enter * 0.2})`,
        opacity: enter,
        zIndex: 20,
      }}
    >
      <Paper
        color="#1d384e"
        borderColor="#2d5674"
        borderWidth={2}
        style={{
          width: 310,
          height: 134,
          padding: '9px 12px',
          boxShadow: '7px 9px 0 rgba(35,67,92,0.18), 0 18px 26px rgba(31,49,61,0.14)',
        }}
      >
        <Tape color="blue" width={72} height={18} rotate={5} style={{right: 20, top: -9}} opacity={0.82} />
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <span style={{fontFamily: FONTS.mono, fontSize: 10, color: '#c6e8ff'}}>{'{ }'}</span>
            <span style={{fontFamily: FONTS.mono, fontSize: 9.5, color: '#d8eefc'}}>canonical.json</span>
          </div>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 7.5,
              color: '#9bdcff',
              background: 'rgba(102,179,224,0.15)',
              border: '1px solid rgba(140,201,235,0.28)',
              borderRadius: 2,
              padding: '1px 4px',
            }}
          >
            104 TRACKS
          </span>
        </div>
        <div style={{marginTop: 4, borderTop: '1px solid rgba(151,199,226,0.20)', paddingTop: 3}}>
          {visible.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: FONTS.mono,
                fontSize: 7.8,
                lineHeight: '12px',
                color: i === 1 ? '#f0d28c' : i === 2 ? '#a9d7ea' : '#b9d7e9',
                whiteSpace: 'nowrap',
                opacity: clamp((count - i * 2) / 2),
              }}
            >
              {line}
            </div>
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 13,
            bottom: 8,
            fontFamily: FONTS.hand,
            fontSize: 12,
            color: '#a9c7d8',
          }}
        >
          一份数据，处处能读
        </div>
      </Paper>
      <Sparkle size={15} color="#e0b650" style={{position: 'absolute', right: -24, top: -17}} rotate={14} />
    </div>
  );
};

const MiniCard: React.FC<{
  frame: number;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  badge: string;
  lines: string[];
  color: string;
  border: string;
  ink: string;
  start: number;
  dashed?: boolean;
  rotate?: number;
  code?: string;
}> = ({frame, x, y, w, h, title, badge, lines, color, border, ink, start, dashed = false, rotate = 0, code}) => {
  const enter = springIn({frame, start, damping: 17, stiffness: 100});
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + (1 - enter) * 25,
        width: w,
        height: h,
        background: color,
        border: dashed ? `1.6px dashed ${border}` : `1.5px solid ${border}`,
        borderRadius: 5,
        boxShadow: '3px 4px 0 rgba(45,52,54,0.10)',
        transform: `rotate(${rotate}deg) scale(${0.92 + enter * 0.08})`,
        opacity: enter,
        padding: '11px 13px',
        zIndex: 8,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
        <div style={{fontFamily: FONTS.hand, fontSize: 20, color: ink, lineHeight: 1.1}}>{title}</div>
        <span
          style={{
            fontFamily: FONTS.hand,
            fontSize: 10,
            color: ink,
            border: `1px solid ${border}99`,
            borderRadius: 20,
            padding: '2px 6px',
            background: 'rgba(255,255,255,0.55)',
            whiteSpace: 'nowrap',
          }}
        >
          {badge}
        </span>
      </div>
      <div style={{marginTop: 6, display: 'flex', flexDirection: 'column', gap: 1}}>
        {lines.map((line) => (
          <div key={line} style={{fontFamily: FONTS.sans, fontSize: 10, lineHeight: 1.4, color: '#5e6767'}}>
            {line}
          </div>
        ))}
      </div>
      {code && (
        <div
          style={{
            marginTop: 5,
            fontFamily: FONTS.mono,
            fontSize: 8.5,
            color: ink,
            background: 'rgba(255,255,255,0.55)',
            border: `1px dashed ${border}99`,
            borderRadius: 2,
            padding: '2px 5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {code}
        </div>
      )}
      <Star size={11} color={border} style={{position: 'absolute', right: 9, bottom: 7, opacity: 0.55}} filled={false} />
    </div>
  );
};

export const EcosystemScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 1360 || frame > 1570) return null;

  const titleIn = springIn({frame, start: 1364, damping: 18, stiffness: 95});
  const subIn = between(frame, 1374, 1396);
  const finale = between(frame, 1538, 1566);
  const camera = interpolate(frame, [1360, 1566], [1.015, 1.005], {extrapolateRight: 'clamp'});
  const note = between(frame, 1488, 1512);

  return (
    <AbsoluteFill style={{overflow: 'hidden', zIndex: 130}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 66% 70% at 50% 40%, rgba(255,236,190,0.28), transparent 70%), rgba(246,241,229,0.20)',
          opacity: 1 - finale * 0.5,
        }}
      />
      <div style={{position: 'absolute', inset: 0, transform: `scale(${camera})`, transformOrigin: '50% 46%'}}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 93,
            textAlign: 'center',
            opacity: clamp(titleIn),
            transform: `translateY(${(1 - titleIn) * 18}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.hand,
              fontSize: 59,
              lineHeight: 1.1,
              color: COLORS.ink,
              letterSpacing: '0.01em',
              textShadow: '2px 3px 0 rgba(65,48,12,0.10)',
            }}
          >
            歌单，<span style={{position: 'relative'}}>继续出发</span>。
          </div>
          <div style={{display: 'flex', justifyContent: 'center', marginTop: 1}}>
            <ScribbleUnderline width={232} progress={between(frame, 1380, 1402)} color="#d9a84b" strokeWidth={4} />
          </div>
          <div
            style={{
              fontFamily: FONTS.hand,
              fontSize: 21,
              color: COLORS.inkSoft,
              marginTop: 4,
              opacity: subIn,
              transform: `translateY(${(1 - subIn) * 8}px)`,
            }}
          >
            插件、导入、开放接口 —— 喜欢的歌，还有很多地方可去。
          </div>
        </div>

        <Threads frame={frame} />
        <JsonSeed frame={frame} />

        <PlayerCard
          frame={frame}
          start={1392}
          x={170}
          y={414}
          w={502}
          h={300}
          rotate={-1.2}
          name={ECOSYSTEM.musicfree.name}
          status={ECOSYSTEM.musicfree.status}
          method={ECOSYSTEM.musicfree.method}
          detail={ECOSYSTEM.musicfree.detail}
          color={ECOSYSTEM.musicfree.color}
          border={ECOSYSTEM.musicfree.border}
          ink={ECOSYSTEM.musicfree.ink}
          logo={ECOSYSTEM.musicfree.initials}
          logoBg="#f8fff9"
          guide="插件地址已发布 · 复制即装"
          checkStart={1444}
          highlight
        />
        <PlayerCard
          frame={frame}
          start={1398}
          x={722}
          y={454}
          w={465}
          h={286}
          rotate={0.65}
          name={ECOSYSTEM.lx.name}
          status={ECOSYSTEM.lx.status}
          method={ECOSYSTEM.lx.method}
          detail={ECOSYSTEM.lx.detail}
          color={ECOSYSTEM.lx.color}
          border={ECOSYSTEM.lx.border}
          ink={ECOSYSTEM.lx.ink}
          logo={ECOSYSTEM.lx.initials}
          logoBg="#fbf9ff"
          guide="桌面端 / 移动端均可"
          checkStart={1449}
        />
        <PlayerCard
          frame={frame}
          start={1404}
          x={1238}
          y={402}
          w={492}
          h={298}
          rotate={1.25}
          name={ECOSYSTEM.listen1.name}
          status={ECOSYSTEM.listen1.status}
          method={ECOSYSTEM.listen1.method}
          detail={ECOSYSTEM.listen1.detail}
          color={ECOSYSTEM.listen1.color}
          border={ECOSYSTEM.listen1.border}
          ink={ECOSYSTEM.listen1.ink}
          logo={ECOSYSTEM.listen1.initials}
          logoBg="#fffafb"
          guide="桌面端 / Chrome 扩展"
          checkStart={1454}
        />

        <MiniCard
          frame={frame}
          start={1420}
          x={230}
          y={786}
          w={358}
          h={132}
          title="BBPlayer"
          badge="⏳ 即将上线"
          lines={['原生内置 · 下一正式版本', '无需插件，直接粘贴链接导入']}
          color="#fffdf5"
          border="#a9a193"
          ink="#5d584c"
          dashed
          rotate={-0.6}
        />
        <MiniCard
          frame={frame}
          start={1426}
          x={620}
          y={802}
          w={360}
          h={116}
          title="Soundiiz"
          badge="第三方服务"
          lines={['第三方歌单迁移工具', '迁移动作由第三方完成 · 需另行注册']}
          color="#f7f1e4"
          border="#b9a57f"
          ink="#6d5d3c"
          rotate={0.4}
        />
        <MiniCard
          frame={frame}
          start={1432}
          x={1012}
          y={786}
          w={650}
          h={132}
          title="Public API · Canonical JSON"
          badge="开放接口"
          lines={['一份统一数据，播放器 / 插件 / 脚本都能读', '无需注册 Token，Public API 直接返回标准化 JSON']}
          color="#eef6f2"
          border="#84a996"
          ink="#355f4a"
          rotate={0.2}
          code="GET /api/v1/resolve?q=https://y.qq.com/…"
        />

        <div
          style={{
            position: 'absolute',
            left: 260,
            top: 748,
            transform: 'rotate(-2.5deg)',
            opacity: note,
          }}
        >
          <div style={{fontFamily: FONTS.handLatin, fontSize: 22, color: COLORS.inkMuted}}>next stop, your player.</div>
          <CurlyArrow width={74} height={49} color="#9d8b70" rotate={-8} style={{marginLeft: 50}} />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 960,
            bottom: 30,
            transform: 'translateX(-50%)',
            width: 1540,
            textAlign: 'center',
            fontFamily: FONTS.sans,
            fontSize: 12.5,
            color: COLORS.inkMuted,
            lineHeight: 1.4,
            opacity: subIn,
          }}
        >
          MusicFree 插件已支持 · 洛雪音乐 / Listen 1 通过导出的 JSON 导入 · BBPlayer 即将上线 · Soundiiz 为第三方迁移服务
        </div>

        <Sparkle size={19} style={{position: 'absolute', left: 156, top: 343, opacity: note}} rotate={-12} />
        <Star size={14} color="#c9a653" style={{position: 'absolute', right: 174, top: 342, opacity: note}} rotate={8} />
        <WavyDots width={105} color="#ab9d86" style={{position: 'absolute', right: 260, top: 764, opacity: 0.7}} rotate={-2} />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(246,241,229,0.86)',
          opacity: finale * 0.55,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
