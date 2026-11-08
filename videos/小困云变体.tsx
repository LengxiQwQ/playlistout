import React, { useId, useState, useEffect } from 'react';

/**
 * ============================================================================
 * CloudNoteMascot & PinkNoteMascot — 完美重制版「小困云」手账音符吉祥物组件
 * 100% 纯 React + TypeScript + 内联 SVG 矢量路径程序化绘制，零外部图片依赖。
 * 完美兼容 React 18 与 Remotion 逐帧动画驱动。
 * ============================================================================
 */

export type MascotExpression =
  | 'panic'    // 关笼子里：大眼泪汪汪 ＞﹏＜、晶莹泪滴滑落、颤抖小猫嘴 ω
  | 'scared'   // panic 别名
  | 'rescued'  // 破笼而出：弯弯月牙笑眼 ^ ^、张嘴大笑露出粉舌、高举双臂欢呼
  | 'cheer'    // 欢呼
  | 'idea'     // 灵光一闪：头顶亮起手绘小黄灯泡 💡、眼睛闪亮、单手向上指
  | 'focus'    // 专注瞄准：单眼眨动、手真实伸展向前按压按键
  | 'press'    // 按键中
  | 'happy'    // 默认日常萌态：水润黑豆大眼双高光、眼间小猫嘴、软萌大腮红
  | 'wink'     // 俏皮眨眼 😉、嘴角扬起小齿
  | 'pull'     // 咬牙拔河：紧闭双眼 > <、身体后仰、两手用力抓握
  | 'chill'    // 闭目听歌 (˘͈ᵕ˘͈)、惬意微醺摇摆
  | 'proud';   // 得意小骄傲

export type CloudExpression = MascotExpression;

export type MascotPose =
  | 'trapped' | 'idle' | 'run' | 'jump' | 'press'
  | 'guide' | 'push' | 'laptop' | 'star' | 'cheer' | 'pull' | 'chill';

export type CloudPose = MascotPose;

export type ReachDirection = 'none' | 'left' | 'right' | 'down' | 'up-right';

export type CloudPalette =
  | 'sky'        // 晴空困困蓝（小困云经典色）
  | 'peach'      // 蜜桃珊瑚粉
  | 'lavender'   // 香芋波点紫
  | 'caramel'    // 复古牛皮焦糖
  | 'mint'       // 薄荷柠檬绿
  | 'vanilla';   // 奶油香草白

export type CloudVariant =
  | 'cat-headphones' // 变体1：经典猫耳立体耳机 + 双层手账和纸飘带
  | 'sleepy-nightcap'// 变体2：晚安波点睡帽 + 星星垂球 + 奶油云朵符尾
  | 'bunny-earmuffs' // 变体3：软萌垂耳兔毛绒耳罩 + 爱心腮红贴纸
  | 'washi-crown'    // 变体4：手账拼贴纸皇冠 + 燕尾双层和纸胶带
  | 'angel-wings'    // 变体5：治愈天使光环 + 羽翼立体耳机
  | 'bear-beret';    // 变体6：复古小熊画家贝雷帽 + 头顶小嫩芽

export interface MascotProps {
  size?: number;                     // 默认 210
  expression?: MascotExpression;     // 表情变体
  pose?: MascotPose;                 // 动作姿态
  pointDir?: 'left' | 'right' | 'down';
  reachDir?: ReachDirection;         // 手部物理伸展方向（按压按钮时触发）
  isContact?: boolean;               // 手部是否接触到目标按钮（触发放射波纹）
  frame?: number;                    // 动画当前帧
  rotation?: number;                 // 倾斜角度
  squash?: number;                   // 挤压拉伸系数
  inAir?: number;                    // 腾空高度
  flipX?: boolean;                   // 水平翻转
  paletteKey?: CloudPalette | string;// 配色方案键名
  variant?: CloudVariant;            // 小困云造型变体
  textureStrength?: number;          // 油画棒与和纸肌理浓度
  catEars?: boolean;                 // 是否显示猫耳
  stickerBorder?: boolean;           // 是否显示 14px 纯白模切贴纸描边
}

export type CloudNoteMascotProps = MascotProps;

interface PaletteConfig {
  label: string;
  tag: string;
  light: string;
  main: string;
  deep: string;
  outline: string;
  headphones: string;
  headphonesShade: string;
  headphonesPad: string;
  accent: string;
  accentSub: string;
  cheeks: string;
  ink: string;
  sparkle: string;
  tapeStripe: string;
  tapeDot: string;
  shoe: string;
}

export const PALETTES: Record<CloudPalette, PaletteConfig> = {
  sky: {
    label: '晴空困困蓝',
    tag: '经典小困云',
    light: '#F4FBFF',
    main: '#BDE6FA',
    deep: '#8AC5E6',
    outline: '#567F99',
    headphones: '#FFFDF9',
    headphonesShade: '#DCEBF7',
    headphonesPad: '#FFE3EC',
    accent: '#FF9EB5',
    accentSub: '#FFE484',
    cheeks: '#FF8FA8',
    ink: '#3E5366',
    sparkle: '#FFE07D',
    tapeStripe: '#FFB5C8',
    tapeDot: '#FFE89E',
    shoe: '#FF9EB5',
  },
  peach: {
    label: '蜜桃珊瑚粉',
    tag: '马卡龙粉',
    light: '#FFF6F5',
    main: '#FFB8C6',
    deep: '#F28AA0',
    outline: '#9E5264',
    headphones: '#FFFDF8',
    headphonesShade: '#FFE3E8',
    headphonesPad: '#FFF0C9',
    accent: '#FF6B8B',
    accentSub: '#AEE8D8',
    cheeks: '#FF5E7E',
    ink: '#593640',
    sparkle: '#FFE27A',
    tapeStripe: '#FFE08C',
    tapeDot: '#B5EAD7',
    shoe: '#FF7593',
  },
  lavender: {
    label: '香芋波点紫',
    tag: '梦幻手账',
    light: '#FAF5FF',
    main: '#DBC4FC',
    deep: '#B695E8',
    outline: '#73589C',
    headphones: '#FFFDF9',
    headphonesShade: '#EDE0FF',
    headphonesPad: '#FFE5F0',
    accent: '#FF97B8',
    accentSub: '#B8F2E6',
    cheeks: '#FF80A6',
    ink: '#4A3961',
    sparkle: '#FFE484',
    tapeStripe: '#FFABC4',
    tapeDot: '#C7CEEA',
    shoe: '#B695E8',
  },
  caramel: {
    label: '复古牛皮焦糖',
    tag: '温暖复古',
    light: '#FFF9F0',
    main: '#F2CEA5',
    deep: '#DDA974',
    outline: '#855A32',
    headphones: '#FFFDF7',
    headphonesShade: '#F2DEC6',
    headphonesPad: '#FFD8CC',
    accent: '#E87A7A',
    accentSub: '#9AD1C2',
    cheeks: '#EB7878',
    ink: '#4F3724',
    sparkle: '#FFE07D',
    tapeStripe: '#E87A7A',
    tapeDot: '#A8D8C9',
    shoe: '#C98453',
  },
  mint: {
    label: '薄荷柠檬绿',
    tag: '清爽治愈',
    light: '#F4FFF9',
    main: '#B8EDD2',
    deep: '#84D1AD',
    outline: '#4D876C',
    headphones: '#FFFDF7',
    headphonesShade: '#DFF5EA',
    headphonesPad: '#FFF3C4',
    accent: '#FF99B4',
    accentSub: '#FFE684',
    cheeks: '#FF85A1',
    ink: '#375447',
    sparkle: '#FFE57F',
    tapeStripe: '#FFE588',
    tapeDot: '#FFB5C8',
    shoe: '#72C29D',
  },
  vanilla: {
    label: '奶油香草白',
    tag: '软糯百搭',
    light: '#FFFFFA',
    main: '#FFF2D9',
    deep: '#EDD6B4',
    outline: '#94785B',
    headphones: '#FFFFFF',
    headphonesShade: '#F5E6D3',
    headphonesPad: '#FFD9E2',
    accent: '#FFA1B5',
    accentSub: '#A3D8EA',
    cheeks: '#FF889E',
    ink: '#574636',
    sparkle: '#FFD86B',
    tapeStripe: '#FFA1B5',
    tapeDot: '#B4E4D6',
    shoe: '#E3B091',
  },
};

/**
 * 黄金比例圆滚滚软糯云朵符头路径（六瓣饱满棉花糖结构，中心在 (-24, 18)）
 */
const CLOUD_HEAD_PATH =
  'M -64 -20 ' +
  'C -86 -22 -100 -4 -92 16 ' +
  'C -108 30 -98 56 -76 62 ' +
  'C -66 76 -42 78 -26 68 ' +
  'C -8 80 18 74 28 58 ' +
  'C 50 52 56 26 40 12 ' +
  'C 48 -8 32 -26 10 -24 ' +
  'C -6 -44 -46 -44 -64 -20 Z';

/**
 * 倾斜多色糖果和纸胶带符干
 */
const STEM_PATH =
  'M 10 -16 ' +
  'C 13 -54 17 -92 20 -128 ' +
  'C 21 -136 34 -135 34 -127 ' +
  'C 31 -91 27 -52 24 -14 ' +
  'C 23 -8 10 -9 10 -16 Z';

/**
 * 双层手撕飘扬和纸胶带符尾（上层斜纹燕尾 + 下层双色波点燕尾）
 */
const TAPE_FLAG_UPPER =
  'M 24 -128 ' +
  'C 54 -132 82 -120 108 -106 ' +
  'L 97 -93 L 106 -80 ' +
  'C 78 -88 52 -98 23 -94 Z';

const TAPE_FLAG_LOWER =
  'M 22 -104 ' +
  'C 50 -106 76 -94 98 -78 ' +
  'L 87 -68 L 94 -55 ' +
  'C 68 -64 46 -78 21 -76 Z';

/**
 * 奶油云朵蓬松符尾（供睡帽变体使用）
 */
const PUFFY_CLOUD_FLAG =
  'M 23 -128 ' +
  'C 52 -136 74 -122 96 -110 ' +
  'C 114 -100 114 -78 94 -70 ' +
  'C 80 -64 66 -70 56 -80 ' +
  'C 44 -90 34 -92 24 -86 Z';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const n2 = (v: number) => Number(v.toFixed(2));

/** 四角闪耀星芒 */
function StarSparkle({
  x,
  y,
  r,
  color,
  stroke,
  rotate = 0,
}: {
  x: number;
  y: number;
  r: number;
  color: string;
  stroke?: string;
  rotate?: number;
}) {
  return (
    <g transform={`translate(${n2(x)} ${n2(y)}) rotate(${n2(rotate)})`}>
      <path
        d={`M 0 ${-r} Q ${n2(r * 0.22)} ${n2(-r * 0.22)} ${r} 0 Q ${n2(r * 0.22)} ${n2(r * 0.22)} 0 ${r} Q ${n2(-r * 0.22)} ${n2(r * 0.22)} ${-r} 0 Q ${n2(-r * 0.22)} ${n2(-r * 0.22)} 0 ${-r} Z`}
        fill={color}
        stroke={stroke}
        strokeWidth={stroke ? 1.8 : 0}
        strokeLinejoin="round"
      />
    </g>
  );
}

/** 幼态黄金比例五官组件（位于脸部中下 1/3，绝无机械大眼白） */
function KawaiiFace({
  expression,
  frame,
  ink,
  cheeks,
  variant,
}: {
  expression: MascotExpression;
  frame: number;
  ink: string;
  cheeks: string;
  variant: CloudVariant;
}) {
  const exp =
    expression === 'scared'
      ? 'panic'
      : expression === 'cheer'
      ? 'rescued'
      : expression === 'press'
      ? 'focus'
      : expression;

  // 自然眨眼
  const autoBlink = (frame % 105 + 105) % 105 > 100 && exp === 'happy';

  // 水润黑豆大眼（带双高光与灵动小睫毛）
  const renderBeanEye = (cx: number, cy: number, side: 'left' | 'right', withStar = false) => (
    <g key={side}>
      <path
        d={
          side === 'left'
            ? `M ${cx - 6.5} ${cy - 4.5} Q ${cx - 10.5} ${cy - 7.5} ${cx - 11.5} ${cy - 5.5}`
            : `M ${cx + 6.5} ${cy - 4.5} Q ${cx + 10.5} ${cy - 7.5} ${cx + 11.5} ${cy - 5.5}`
        }
        stroke={ink}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx={cx} cy={cy} rx={7.6} ry={10.4} fill={ink} />
      <ellipse cx={cx - 2.3} cy={cy - 3.6} rx={2.8} ry={3.6} fill="#FFFFFF" />
      <circle cx={cx + 2.5} cy={cy + 3.4} r={1.6} fill="#FFFFFF" />
      {withStar && <StarSparkle x={cx - 1.5} y={cy - 1.5} r={4} color="#FFF7B2" />}
    </g>
  );

  // 弯弯笑眼 ^ ^ 或安睡眼 (˘͈ᵕ˘͈)
  const renderCurvedEyes = (smileUp: boolean) => (
    <g fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
      <path d={smileUp ? 'M -60 24 Q -50 11 -40 24' : 'M -60 19 Q -50 30 -40 19'} />
      {!smileUp && <path d="M -60 22 L -64 25 M -50 26 L -51 30" strokeWidth={2.4} />}
      <path d={smileUp ? 'M -8 24 Q 2 11 12 24' : 'M -8 19 Q 2 30 12 19'} />
      {!smileUp && <path d="M 12 22 L 16 25 M 2 26 L 3 30" strokeWidth={2.4} />}
    </g>
  );

  // 紧闭 > < 眼
  const renderTightEyes = () => (
    <g fill="none" stroke={ink} strokeWidth={3.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M -61 15 L -48 22 L -61 28" />
      <path d="M 13 15 L 0 22 L 13 28" />
    </g>
  );

  // 紧贴两眼正中间的小猫嘴 ω
  const catMouth = (
    <path
      d="M -32 26 Q -28 32 -24 27 Q -20 32 -16 26"
      fill="none"
      stroke={ink}
      strokeWidth={2.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );

  // 呼呼小睡嘴
  const sleepyO = (
    <ellipse
      cx={-24}
      cy={29}
      rx={3.6}
      ry={4.2}
      fill="#FF9EB5"
      stroke={ink}
      strokeWidth={2.5}
    />
  );

  return (
    <g>
      {/* 水彩粉扑大腮红 */}
      <g fill={cheeks}>
        <ellipse cx={-68} cy={32} rx={13.5} ry={8.2} fillOpacity={0.28} />
        <ellipse cx={-68} cy={32} rx={9.5} ry={5.8} fillOpacity={0.55} />
        <ellipse cx={20} cy={32} rx={13.5} ry={8.2} fillOpacity={0.28} />
        <ellipse cx={20} cy={32} rx={9.5} ry={5.8} fillOpacity={0.55} />
      </g>

      {/* 腮红细节：垂耳兔变体为爱心高光，其余为手账斜线高光 */}
      {variant === 'bunny-earmuffs' ? (
        <g fill="#FFFDF9" fillOpacity={0.88}>
          <path d="M -68 30 C -70 27 -73 29 -71 32 L -68 35 L -65 32 C -63 29 -66 27 -68 30 Z" />
          <path d="M 20 30 C 18 27 15 29 17 32 L 20 35 L 23 32 C 25 29 22 27 20 30 Z" />
        </g>
      ) : (
        <path
          d="M -72 31 l 2.5 -3.5 M -66 34 l 2.5 -3.5 M 16 31 l 2.5 -3.5 M 22 34 l 2.5 -3.5"
          fill="none"
          stroke="#FFFDF9"
          strokeWidth={2}
          strokeLinecap="round"
          strokeOpacity={0.85}
        />
      )}

      {/* 表情分支 */}
      {exp === 'chill' && (
        <>
          {renderCurvedEyes(false)}
          {(frame % 80) > 40 ? sleepyO : catMouth}
        </>
      )}

      {exp === 'rescued' && (
        <>
          {renderCurvedEyes(true)}
          <path
            d="M -35 26 Q -24 22 -13 26 C -14 43 -34 43 -35 26 Z"
            fill={ink}
            stroke={ink}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          <path d="M -30 35 Q -24 30 -18 35 C -20 40 -28 40 -30 35 Z" fill="#FF8FA6" />
        </>
      )}

      {exp === 'panic' && (
        <>
          {renderTightEyes()}
          {/* 晶莹泪滴滑落 */}
          <g transform={`translate(0 ${n2(Math.sin(frame * 0.42) * 1.6)})`}>
            <path
              d="M -62 25 C -69 33 -66 41 -60 41 C -55 41 -54 33 -62 25 Z"
              fill="#8CE0FF"
              stroke={ink}
              strokeWidth={2}
            />
            <circle cx={-61} cy={35} r={1.4} fill="#FFFFFF" />
            <path
              d="M 14 25 C 21 33 18 41 12 41 C 7 41 6 33 14 25 Z"
              fill="#8CE0FF"
              stroke={ink}
              strokeWidth={2}
            />
            <circle cx={13} cy={35} r={1.4} fill="#FFFFFF" />
          </g>
          {/* 颤抖波浪小猫嘴 */}
          <path
            d="M -34 33 Q -29 27 -24 33 Q -19 27 -14 33"
            fill="none"
            stroke={ink}
            strokeWidth={2.7}
            strokeLinecap="round"
          />
        </>
      )}

      {exp === 'wink' && (
        <>
          {renderBeanEye(-50, 21, 'left')}
          <path
            d="M -8 22 Q 2 12 12 22"
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <path
            d="M -33 26 Q -23 35 -13 25"
            fill="none"
            stroke={ink}
            strokeWidth={2.9}
            strokeLinecap="round"
          />
          <path
            d="M -18 28 L -15 33 L -13 27 Z"
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </>
      )}

      {exp === 'pull' && (
        <>
          {renderTightEyes()}
          <rect
            x={-34}
            y={27}
            width={20}
            height={9.5}
            rx={4}
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={2.5}
          />
          <path d="M -27 27 V 36.5 M -21 27 V 36.5" stroke={ink} strokeWidth={1.9} />
        </>
      )}

      {exp === 'proud' && (
        <>
          {renderCurvedEyes(true)}
          {catMouth}
        </>
      )}

      {exp === 'focus' && (
        <>
          {renderBeanEye(-50, 21, 'left')}
          <path
            d="M -8 21 Q 2 16 12 20"
            fill="none"
            stroke={ink}
            strokeWidth={3.8}
            strokeLinecap="round"
          />
          <path
            d="M -29 29 Q -24 26 -19 29"
            fill="none"
            stroke={ink}
            strokeWidth={2.9}
            strokeLinecap="round"
          />
        </>
      )}

      {(exp === 'happy' || exp === 'idea') && (
        <>
          {autoBlink ? (
            renderCurvedEyes(false)
          ) : (
            <>
              {renderBeanEye(-50, 21, 'left', exp === 'idea')}
              {renderBeanEye(2, 21, 'right', exp === 'idea')}
            </>
          )}
          {exp === 'idea' ? (
            <path
              d="M -32 26 Q -24 35 -16 26"
              fill="none"
              stroke={ink}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ) : (
            catMouth
          )}
        </>
      )}
    </g>
  );
}

/**
 * 主组件：CloudNoteMascot（同时具名导出 PinkNoteMascot 兼容工程契约）
 */
export function CloudNoteMascot({
  size = 210,
  expression = 'chill',
  pose = 'chill',
  pointDir = 'right',
  reachDir = 'none',
  isContact = false,
  frame = 0,
  rotation = 0,
  squash = 1,
  inAir = 0,
  flipX = false,
  paletteKey = 'sky',
  variant = 'cat-headphones',
  textureStrength = 1.0,
  catEars = true,
  stickerBorder = true,
}: MascotProps) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (name: string) => `mascot-${rawId}-${name}`;

  const p = PALETTES[paletteKey as CloudPalette] ?? PALETTES.sky;
  const texOpacity = clamp(textureStrength, 0, 1.5);

  // 逐帧动力学参数（严格遵循公式）
  const bob = Math.sin((frame / 30) * Math.PI * 4) * 3.5;
  const walkCycle = Math.sin(frame * 0.36);
  const flagFlutter = n2(Math.sin(frame * 0.16) * 4.2 + Math.cos(frame * 0.09) * 1.8);
  const earWiggle = n2(Math.sin(frame * 0.12) * 3.0);

  const isJumping =
    pose === 'jump' || pose === 'cheer' || expression === 'rescued' || expression === 'cheer';
  const lift = Math.max(0, inAir) + (isJumping ? 14 + Math.abs(Math.sin(frame * 0.18)) * 9 : 0);
  const shakeX =
    pose === 'trapped' || expression === 'panic' || expression === 'scared'
      ? Math.sin(frame * 2.1) * 1.5
      : 0;
  const swayDeg =
    pose === 'run'
      ? walkCycle * 4.5
      : pose === 'chill' || expression === 'chill'
      ? Math.sin(frame * 0.08) * 3.6
      : pose === 'pull' || expression === 'pull'
      ? -8
      : 0;

  const stretch = clamp(squash, 0.72, 1.36);
  const headTransform = `translate(-24 20) scale(${n2(1 / Math.sqrt(stretch))} ${n2(stretch)}) translate(24 -20)`;

  // 贴合云朵头顶弧度、绕过符干后方的改良立体耳机头梁
  const HEADBAND_PATH = 'M -89 4 C -87 -58 39 -58 41 4';

  // 手部物理坐标计算
  let leftHand = { x: -110, y: 46 };
  let rightHand = { x: 68, y: 44 };

  if (pose === 'trapped' || expression === 'panic' || expression === 'scared') {
    leftHand = { x: -90, y: 26 };
    rightHand = { x: 44, y: 26 };
  } else if (pose === 'run') {
    leftHand = { x: -112 + walkCycle * 10, y: 34 - walkCycle * 13 };
    rightHand = { x: 70 - walkCycle * 10, y: 34 + walkCycle * 13 };
  } else if (isJumping) {
    leftHand = { x: -114, y: -24 };
    rightHand = { x: 78, y: -26 };
  } else if (pose === 'pull' || expression === 'pull') {
    leftHand = { x: -126, y: 14 };
    rightHand = { x: -94, y: 20 };
  } else if (pose === 'laptop') {
    leftHand = { x: -50, y: 64 };
    rightHand = { x: 4, y: 64 };
  } else if (pose === 'star' || expression === 'idea') {
    leftHand = { x: -106, y: 42 };
    rightHand = { x: 74, y: -36 };
  } else if (pose === 'push') {
    leftHand = { x: 78, y: 16 };
    rightHand = { x: 98, y: 24 };
  } else if (pose === 'guide' && reachDir === 'none') {
    if (pointDir === 'left') leftHand = { x: -128, y: 12 };
    else if (pointDir === 'down') rightHand = { x: 44, y: 94 };
    else rightHand = { x: 108, y: 10 };
  }

  // 真实伸展按压方向
  const activeReach: ReachDirection =
    reachDir !== 'none'
      ? reachDir
      : pose === 'press' || expression === 'press' || expression === 'focus'
      ? 'right'
      : 'none';

  if (activeReach === 'right') {
    rightHand = { x: isContact ? 124 : 108, y: 10 };
  } else if (activeReach === 'left') {
    leftHand = { x: isContact ? -130 : -118, y: 10 };
  } else if (activeReach === 'down') {
    rightHand = { x: 44, y: isContact ? 104 : 92 };
  } else if (activeReach === 'up-right') {
    rightHand = { x: 98, y: -42 };
  }

  const wavePulse = ((frame % 20) + 20) % 20 / 20;

  // 渲染双腿与小鞋子
  const renderLeg = (side: -1 | 1) => {
    const hipX = side === -1 ? -44 : -4;
    const hipY = 60;

    if (pose === 'trapped') {
      const footX = hipX + side * 7;
      const footY = 76;
      return (
        <g key={side}>
          <path
            d={`M ${hipX} ${hipY} Q ${hipX + side * 9} 69 ${footX} ${footY}`}
            stroke={p.outline}
            strokeWidth={7.5}
            strokeLinecap="round"
            fill="none"
          />
          <ellipse
            cx={footX}
            cy={footY + 3}
            rx={12}
            ry={8}
            fill={p.shoe}
            stroke={p.outline}
            strokeWidth={3.2}
          />
          <ellipse cx={footX - 3} cy={footY} rx={3.8} ry={1.8} fill="#FFFFFF" fillOpacity={0.7} />
        </g>
      );
    }

    const stepX =
      pose === 'run'
        ? walkCycle * side * 20
        : isJumping
        ? side * 15 - 5
        : Math.sin(frame * 0.08) * side * 2;
    const stepY =
      pose === 'run'
        ? -Math.max(0, side * walkCycle) * 11
        : isJumping
        ? -13
        : 0;

    const footX = hipX + stepX;
    const footY = 90 + stepY;
    const kneeX = hipX + stepX * 0.45;
    const kneeY = 76 + stepY * 0.4;
    const shoeAngle =
      pose === 'run' ? side * walkCycle * 18 : isJumping ? (side === -1 ? -20 : 16) : 0;

    return (
      <g key={side}>
        <path
          d={`M ${hipX} ${hipY} Q ${n2(kneeX)} ${n2(kneeY)} ${n2(footX)} ${n2(footY)}`}
          stroke={p.outline}
          strokeWidth={7.6}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={`M ${hipX} ${hipY} Q ${n2(kneeX)} ${n2(kneeY)} ${n2(footX)} ${n2(footY)}`}
          stroke={p.light}
          strokeWidth={3.6}
          strokeLinecap="round"
          fill="none"
        />
        <g transform={`translate(${n2(footX)} ${n2(footY + 3)}) rotate(${n2(shoeAngle)})`}>
          <path
            d="M -12 -5 C -12 -12 11 -12 14 -2 C 16 6 9 11 -4 11 C -14 11 -14 1 -12 -5 Z"
            fill={p.shoe}
            stroke={p.outline}
            strokeWidth={3.2}
            strokeLinejoin="round"
          />
          <path
            d="M -11 4.5 Q 1 7.5 12 4.5"
            stroke="#FFFFFF"
            strokeWidth={2.2}
            strokeLinecap="round"
            fill="none"
          />
          <ellipse cx={-3} cy={-3.5} rx={3.8} ry={2} fill="#FFFFFF" fillOpacity={0.7} />
        </g>
      </g>
    );
  };

  // 渲染小臂与圆球小手
  const renderArm = (
    shoulderX: number,
    shoulderY: number,
    target: { x: number; y: number },
    side: 'left' | 'right'
  ) => {
    const midX = (shoulderX + target.x) * 0.5 + (side === 'left' ? -5 : 5);
    const midY = Math.max(shoulderY, target.y) + 9;
    const pathD = `M ${shoulderX} ${shoulderY} Q ${n2(midX)} ${n2(midY)} ${n2(target.x)} ${n2(target.y)}`;
    return (
      <g key={side}>
        <path d={pathD} stroke={p.outline} strokeWidth={8} strokeLinecap="round" fill="none" />
        <path d={pathD} stroke={p.light} strokeWidth={4} strokeLinecap="round" fill="none" />
        <circle
          cx={n2(target.x)}
          cy={n2(target.y)}
          r={9.5}
          fill={p.main}
          stroke={p.outline}
          strokeWidth={3.2}
        />
        <ellipse
          cx={n2(target.x - 2)}
          cy={n2(target.y - 2.4)}
          rx={2.8}
          ry={1.8}
          fill="#FFFFFF"
          fillOpacity={0.85}
        />
      </g>
    );
  };

  // 渲染完美修复版 3D 立体斜角耳罩（带软垫、外罩壳、连接支架与主题配饰）
  const render3DEarcup = (side: 'left' | 'right') => {
    const cx = side === 'left' ? -90 : 42;
    const cy = 8;
    const tilt = side === 'left' ? -9 : 9;
    const inward = side === 'left' ? 1 : -1;

    return (
      <g key={side} transform={`translate(${cx} ${cy}) rotate(${tilt})`}>
        {/* 顶部连接头梁的伸缩支臂 (Yoke) */}
        <rect
          x={-4}
          y={-26}
          width={8}
          height={11}
          rx={4}
          fill={p.headphones}
          stroke={p.outline}
          strokeWidth={3}
        />

        {/* 变体5：天使羽翼耳罩小翅膀 */}
        {variant === 'angel-wings' && (
          <g
            transform={`translate(${side === 'left' ? -17 : 17} -4) scale(${
              side === 'left' ? 1 : -1
            } 1)`}
          >
            <path
              d="M 4 0 C -13 -17 -26 -7 -16 4 C -24 11 -13 20 -2 13 C -7 22 4 26 9 13 Z"
              fill="#FFFFFF"
              stroke={p.outline}
              strokeWidth={3}
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* 变体3：垂耳兔毛绒长耳 */}
        {variant === 'bunny-earmuffs' && (
          <g
            transform={`translate(${side === 'left' ? -7 : 7} -14) rotate(${
              side === 'left' ? 16 + earWiggle : -16 - earWiggle
            })`}
          >
            <path
              d={
                side === 'left'
                  ? 'M 0 0 C -24 10 -32 54 -15 68 C -2 78 11 48 7 10 Z'
                  : 'M 0 0 C 24 10 32 54 15 68 C 2 78 -11 48 -7 10 Z'
              }
              fill={`url(#${id('ear-grad')})`}
              stroke={p.outline}
              strokeWidth={3.5}
              strokeLinejoin="round"
            />
            <path
              d={
                side === 'left'
                  ? 'M -3 11 C -16 20 -20 48 -12 57 C -5 62 3 42 2 16 Z'
                  : 'M 3 11 C 16 20 20 48 12 57 C 5 62 -3 42 -2 16 Z'
              }
              fill={p.accent}
              fillOpacity={0.75}
            />
          </g>
        )}

        {/* 内层贴脸软糯厚耳垫 */}
        <ellipse
          cx={inward * 4.5}
          cy={0}
          rx={12}
          ry={20.5}
          fill={p.headphonesPad}
          stroke={p.outline}
          strokeWidth={3.5}
        />

        {/* 外层 3D 圆润耳罩壳 */}
        <ellipse
          cx={-inward * 2}
          cy={0}
          rx={14.5}
          ry={19.5}
          fill={`url(#${id('ear-grad')})`}
          stroke={p.outline}
          strokeWidth={3.5}
        />

        {/* 耳罩中心装饰片 */}
        <ellipse cx={-inward * 3.2} cy={0} rx={8} ry={11.5} fill={p.accent} />

        {/* 耳罩中心徽章（兔耳为爱心，其余为四角星） */}
        {variant === 'bunny-earmuffs' ? (
          <path
            d={`M ${-inward * 3.2} -2 C ${-inward * 3.2 - 3} -5.5 ${-inward * 3.2 - 6.5} -2 ${
              -inward * 3.2 - 3.5
            } 1.8 L ${-inward * 3.2} 5.2 L ${-inward * 3.2 + 3.5} 1.8 C ${
              -inward * 3.2 + 6.5
            } -2 ${-inward * 3.2 + 3} -5.5 ${-inward * 3.2} -2 Z`}
            fill="#FFFDF9"
          />
        ) : (
          <StarSparkle x={-inward * 3.2} y={0} r={4.8} color="#FFFDF9" />
        )}

        {/* 耳罩顶部奶油高光 */}
        <path
          d={`M ${-inward * 7} -11 Q ${-inward * 2} -16 ${inward * 3} -10`}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeOpacity={0.85}
        />
      </g>
    );
  };

  const hasHeadphones = variant !== 'washi-crown';

  return (
    <svg
      viewBox="-140 -155 280 275"
      width={size}
      height={size * 1.15}
      style={{ overflow: 'visible', display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="小困云手账音符吉祥物"
    >
      <defs>
        {/* 身体奶油马卡龙渐变 */}
        <linearGradient id={id('body-grad')} x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" stopColor={p.light} />
          <stop offset="55%" stopColor={p.main} />
          <stop offset="100%" stopColor={p.deep} />
        </linearGradient>

        {/* 3D 耳机外壳立体渐变 */}
        <linearGradient id={id('ear-grad')} x1="0%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="62%" stopColor={p.headphones} />
          <stop offset="100%" stopColor={p.headphonesShade} />
        </linearGradient>

        {/* 符干糖果斜纹和纸图案 */}
        <pattern
          id={id('stem-stripes')}
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-35)"
        >
          <rect width="14" height="14" fill={p.main} />
          <rect width="6" height="14" fill={p.tapeStripe} fillOpacity={0.75} />
          <line x1="6" y1="0" x2="6" y2="14" stroke="#FFFFFF" strokeWidth="1.4" strokeOpacity="0.7" />
        </pattern>

        {/* 上层和纸胶带：彩色斜条纹 */}
        <pattern
          id={id('washi-stripe')}
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(28)"
        >
          <rect width="16" height="16" fill={p.tapeStripe} />
          <rect width="7" height="16" fill="#FFFDF8" fillOpacity={0.65} />
        </pattern>

        {/* 下层和纸胶带：双色波点 */}
        <pattern id={id('washi-dots')} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill={p.tapeDot} />
          <circle cx="4.5" cy="4.5" r="2.4" fill="#FFFFFF" fillOpacity={0.85} />
          <circle cx="12.5" cy="12.5" r="2.4" fill={p.accent} fillOpacity={0.65} />
        </pattern>

        {/* 手账油画棒颗粒肌理 */}
        <pattern
          id={id('crayon-tex')}
          width="22"
          height="22"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-20)"
        >
          <path
            d="M -2 4 L 9 4 M 13 4 L 24 4 M 2 12 L 11 12 M 15 12 L 26 12 M -1 19 L 7 19 M 12 19 L 22 19"
            stroke="#FFFDF6"
            strokeWidth={1.6}
            strokeOpacity={0.6}
            strokeLinecap="round"
          />
          <path
            d="M 3 8 L 6 8 M 15 16 L 19 16"
            stroke={p.outline}
            strokeWidth={1.1}
            strokeOpacity={0.22}
            strokeLinecap="round"
          />
        </pattern>

        {/* 纸张柔和贴纸阴影 */}
        <filter id={id('paper-shadow')} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#2A3B4C" floodOpacity="0.16" />
        </filter>
      </defs>

      {/* ==================== 第 1 层：地面纸张投影（随 inAir 缩放） ==================== */}
      <ellipse
        cx={-22}
        cy={106}
        rx={n2(Math.max(26, 68 - lift * 0.42))}
        ry={n2(Math.max(4, 10 - lift * 0.06))}
        fill={p.outline}
        fillOpacity={n2(Math.max(0.06, 0.18 - lift * 0.002))}
      />

      {/* 主体运动包裹组 */}
      <g
        transform={`translate(${n2(shakeX)} ${n2(bob - lift)}) rotate(${n2(
          rotation + swayDeg
        )} -22 18) scale(${flipX ? -1 : 1} 1)`}
        filter={stickerBorder ? `url(#${id('paper-shadow')})` : undefined}
      >
        {/* ==================== 第 2 层：纯白模切贴纸描边 (14px Die-cut Sticker Border) ==================== */}
        {stickerBorder && (
          <g
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* 云朵符头外白边 */}
            <path d={CLOUD_HEAD_PATH} transform={headTransform} />
            {/* 符干外白边 */}
            <path d={STEM_PATH} />
            {/* 符尾外白边 */}
            <g transform={`rotate(${flagFlutter} 24 -116)`}>
              {variant === 'sleepy-nightcap' ? (
                <path d={PUFFY_CLOUD_FLAG} />
              ) : (
                <>
                  <path d={TAPE_FLAG_LOWER} />
                  <path d={TAPE_FLAG_UPPER} />
                </>
              )}
            </g>
            {/* 耳机头梁与耳罩外白边 */}
            {hasHeadphones && (
              <>
                <path d={HEADBAND_PATH} fill="none" strokeWidth={24} />
                <ellipse cx={-90} cy={8} rx={21} ry={25} transform="rotate(-9 -90 8)" />
                <ellipse cx={42} cy={8} rx={21} ry={25} transform="rotate(9 42 8)" />
              </>
            )}
            {/* 猫耳外白边 */}
            {hasHeadphones && catEars && variant === 'cat-headphones' && (
              <>
                <g transform="translate(-70 -31) rotate(-32)">
                  <path d="M -16 6 C -15 -18 -5 -24 0 -24 C 5 -24 15 -18 16 6 Z" />
                </g>
                <g transform="translate(22 -31) rotate(32)">
                  <path d="M -16 6 C -15 -18 -5 -24 0 -24 C 5 -24 15 -18 16 6 Z" />
                </g>
              </>
            )}
            {/* 手臂与手掌外白边 */}
            <path
              d={`M -82 34 Q ${n2((-82 + leftHand.x) * 0.5 - 5)} ${n2(
                Math.max(34, leftHand.y) + 9
              )} ${n2(leftHand.x)} ${n2(leftHand.y)}`}
              fill="none"
              strokeWidth={18}
            />
            <circle cx={n2(leftHand.x)} cy={n2(leftHand.y)} r={10} />
            <path
              d={`M 34 34 Q ${n2((34 + rightHand.x) * 0.5 + 5)} ${n2(
                Math.max(34, rightHand.y) + 9
              )} ${n2(rightHand.x)} ${n2(rightHand.y)}`}
              fill="none"
              strokeWidth={18}
            />
            <circle cx={n2(rightHand.x)} cy={n2(rightHand.y)} r={10} />
          </g>
        )}

        {/* ==================== 第 3 层：双腿与小鞋子 ==================== */}
        {renderLeg(-1)}
        {renderLeg(1)}

        {/* ==================== 耳机头梁后置层（自然绕过音符符干后方，彻底解决横切穿模） ==================== */}
        {hasHeadphones && (
          <g>
            {/* 变体1：沿着头梁切线自然生长的立体猫耳 */}
            {catEars && variant === 'cat-headphones' && (
              <>
                <g transform={`translate(-70 -31) rotate(${n2(-32 + earWiggle * 0.6)})`}>
                  <path
                    d="M -16 6 C -15 -18 -5 -24 0 -24 C 5 -24 15 -18 16 6 Z"
                    fill={p.headphones}
                    stroke={p.outline}
                    strokeWidth={3.8}
                    strokeLinejoin="round"
                  />
                  <path d="M -9 3 C -8 -11 -3 -15 0 -15 C 3 -15 8 -11 9 3 Z" fill={p.accent} />
                </g>
                <g transform={`translate(22 -31) rotate(${n2(32 - earWiggle * 0.6)})`}>
                  <path
                    d="M -16 6 C -15 -18 -5 -24 0 -24 C 5 -24 15 -18 16 6 Z"
                    fill={p.headphones}
                    stroke={p.outline}
                    strokeWidth={3.8}
                    strokeLinejoin="round"
                  />
                  <path d="M -9 3 C -8 -11 -3 -15 0 -15 C 3 -15 8 -11 9 3 Z" fill={p.accent} />
                </g>
              </>
            )}

            {/* 变体6：圆滚滚小熊耳朵 */}
            {variant === 'bear-beret' && (
              <>
                <g transform="translate(-72 -32) rotate(-28)">
                  <circle
                    cx={0}
                    cy={-6}
                    r={14}
                    fill={p.headphones}
                    stroke={p.outline}
                    strokeWidth={3.8}
                  />
                  <circle cx={0} cy={-6} r={7.5} fill={p.accent} />
                </g>
                <g transform="translate(24 -32) rotate(28)">
                  <circle
                    cx={0}
                    cy={-6}
                    r={14}
                    fill={p.headphones}
                    stroke={p.outline}
                    strokeWidth={3.8}
                  />
                  <circle cx={0} cy={-6} r={7.5} fill={p.accent} />
                </g>
              </>
            )}

            {/* 立体双层头梁弧线（带撞色软垫与高光） */}
            <path
              d={HEADBAND_PATH}
              fill="none"
              stroke={p.outline}
              strokeWidth={14.5}
              strokeLinecap="round"
            />
            <path
              d={HEADBAND_PATH}
              fill="none"
              stroke={p.headphones}
              strokeWidth={8.5}
              strokeLinecap="round"
            />
            {/* 头梁顶部内侧撞色软垫 */}
            <path
              d="M -56 -33 C -36 -45 -12 -45 8 -33"
              fill="none"
              stroke={p.headphonesPad}
              strokeWidth={4.5}
              strokeLinecap="round"
            />
            <path
              d="M -68 -22 C -42 -43 -6 -43 20 -22"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeOpacity={0.8}
            />
          </g>
        )}

        {/* ==================== 第 4 层：挺拔糖果斜纹符干与双层和纸飘带符尾 ==================== */}
        <g>
          {/* 倾斜糖果和纸胶带符干 */}
          <path
            d={STEM_PATH}
            fill={`url(#${id('stem-stripes')})`}
            stroke={p.outline}
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <path
            d="M 17 -122 C 15 -88 13 -54 11 -22"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeOpacity={0.7}
          />

          {/* 随 flagFlutter 摆动的符尾 */}
          <g transform={`rotate(${flagFlutter} 24 -116)`}>
            {variant === 'sleepy-nightcap' ? (
              /* 睡帽变体专属：软糯云朵符尾 + 垂挂小月亮 */
              <>
                <path
                  d={PUFFY_CLOUD_FLAG}
                  fill={`url(#${id('body-grad')})`}
                  stroke={p.outline}
                  strokeWidth={4}
                  strokeLinejoin="round"
                />
                <path
                  d={PUFFY_CLOUD_FLAG}
                  fill={`url(#${id('crayon-tex')})`}
                  fillOpacity={texOpacity * 0.4}
                />
                <path
                  d="M 42 -120 C 58 -116 74 -106 90 -100"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeOpacity={0.7}
                />
                {/* 符尾垂挂摇晃的小弯月 */}
                <g transform={`translate(94 -72) rotate(${n2(flagFlutter * 1.4)})`}>
                  <line x1={0} y1={0} x2={0} y2={14} stroke={p.outline} strokeWidth={2.4} />
                  <path
                    d="M -4 14 C -11 18 -10 29 -1 31 C 5 32 9 28 9 25 C 3 27 -2 22 0 15 Z"
                    fill={p.sparkle}
                    stroke={p.outline}
                    strokeWidth={2.4}
                    strokeLinejoin="round"
                  />
                </g>
              </>
            ) : (
              /* 经典双层手撕和纸胶带符尾（下层波点 + 上层斜纹 + 燕尾剪口） */
              <>
                <path
                  d={TAPE_FLAG_LOWER}
                  fill={`url(#${id('washi-dots')})`}
                  stroke={p.outline}
                  strokeWidth={3.8}
                  strokeLinejoin="round"
                />
                <path
                  d={TAPE_FLAG_UPPER}
                  fill={`url(#${id('washi-stripe')})`}
                  stroke={p.outline}
                  strokeWidth={3.8}
                  strokeLinejoin="round"
                />
                {/* 符干与胶带连接处的迷你手撕固定贴纸 */}
                <rect
                  x={15}
                  y={-126}
                  width={18}
                  height={7}
                  rx={2}
                  transform="rotate(-12 24 -122)"
                  fill="#FFFDF9"
                  stroke={p.outline}
                  strokeWidth={2.4}
                />
              </>
            )}
          </g>
        </g>

        {/* ==================== 第 5 层 & 第 6 层：圆润云朵符头身体 + 幼态黄金比例五官 ==================== */}
        <g transform={headTransform}>
          {/* 云朵主体渐变与轮廓 */}
          <path
            d={CLOUD_HEAD_PATH}
            fill={`url(#${id('body-grad')})`}
            stroke={p.outline}
            strokeWidth={4.2}
            strokeLinejoin="round"
          />
          {/* 油画棒手账肌理层 */}
          <path
            d={CLOUD_HEAD_PATH}
            fill={`url(#${id('crayon-tex')})`}
            fillOpacity={texOpacity * 0.48}
          />
          {/* 底部柔和暗部体积感弧线 */}
          <path
            d="M -72 56 Q -42 70 -24 60 Q -4 70 22 52"
            fill="none"
            stroke={p.deep}
            strokeWidth={5}
            strokeLinecap="round"
            strokeOpacity={0.45}
          />
          {/* 额头软糯高光弧线与遮挡头梁的蓬松刘海云卷 */}
          <path
            d="M -66 -14 Q -42 -32 -12 -22"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={4.2}
            strokeLinecap="round"
            strokeOpacity={0.75}
          />
          <path
            d="M -36 -28 Q -22 -38 -10 -24"
            fill={p.light}
            stroke={p.outline}
            strokeWidth={3.4}
            strokeLinecap="round"
          />

          {/* 变体专属头顶穿搭装饰（睡帽 / 手账皇冠 / 画家贝雷帽 / 天使光环） */}
          {variant === 'sleepy-nightcap' && (
            <g transform="translate(-46 -26) rotate(-14)">
              <path
                d="M -26 6 C -20 -34 16 -46 46 -22 C 28 -12 16 0 12 10 C -2 6 -16 6 -26 6 Z"
                fill={`url(#${id('washi-dots')})`}
                stroke={p.outline}
                strokeWidth={3.6}
                strokeLinejoin="round"
              />
              {/* 睡帽白色毛绒滚边 */}
              <rect
                x={-30}
                y={2}
                width={46}
                height={11}
                rx={5.5}
                fill="#FFFFFF"
                stroke={p.outline}
                strokeWidth={3.4}
              />
              {/* 睡帽尖端毛绒球 */}
              <circle
                cx={48}
                cy={-21}
                r={8.5}
                fill={p.sparkle}
                stroke={p.outline}
                strokeWidth={3.2}
              />
            </g>
          )}

          {variant === 'washi-crown' && (
            <g transform="translate(-34 -34) rotate(-8)">
              <path
                d="M -18 8 L -22 -14 L -8 -4 L 0 -18 L 8 -4 L 22 -14 L 18 8 Z"
                fill={p.sparkle}
                stroke={p.outline}
                strokeWidth={3.4}
                strokeLinejoin="round"
              />
              <circle cx={0} cy={-19} r={3.2} fill={p.accent} stroke={p.outline} strokeWidth={2} />
              {/* 脸颊手账十字小贴纸 */}
              <rect
                x={-42}
                y={18}
                width={14}
                height={5.5}
                rx={1.5}
                transform="rotate(-24 -35 20)"
                fill={p.tapeStripe}
                stroke={p.outline}
                strokeWidth={2}
              />
            </g>
          )}

          {variant === 'bear-beret' && (
            <g transform="translate(-38 -32) rotate(-12)">
              <ellipse
                cx={0}
                cy={0}
                rx={28}
                ry={12}
                fill={p.accent}
                stroke={p.outline}
                strokeWidth={3.6}
              />
              <path
                d="M -16 -4 Q 0 -12 16 -4"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeOpacity={0.75}
              />
              {/* 贝雷帽顶治愈小嫩芽 */}
              <path
                d="M 0 -12 Q -2 -22 -10 -22 Q -8 -14 0 -12 Z"
                fill="#98E6B0"
                stroke={p.outline}
                strokeWidth={2.6}
                strokeLinejoin="round"
              />
              <path
                d="M 0 -12 Q 3 -23 11 -21 Q 8 -13 0 -12 Z"
                fill="#98E6B0"
                stroke={p.outline}
                strokeWidth={2.6}
                strokeLinejoin="round"
              />
            </g>
          )}

          {variant === 'angel-wings' && (
            <g transform={`translate(-26 ${n2(-48 + Math.sin(frame * 0.15) * 2.5)}) rotate(-6)`}>
              <ellipse
                cx={0}
                cy={0}
                rx={26}
                ry={7.5}
                fill="none"
                stroke={p.outline}
                strokeWidth={7.5}
              />
              <ellipse
                cx={0}
                cy={0}
                rx={26}
                ry={7.5}
                fill="none"
                stroke={p.sparkle}
                strokeWidth={4}
              />
            </g>
          )}

          {/* 第 6 层：幼态黄金比例五官 */}
          <KawaiiFace
            expression={expression}
            frame={frame}
            ink={p.ink}
            cheeks={p.cheeks}
            variant={variant}
          />
        </g>

        {/* ==================== 立体斜角耳罩前景层（自然贴合云朵两侧脸颊） ==================== */}
        {hasHeadphones && (
          <>
            {render3DEarcup('left')}
            {render3DEarcup('right')}
          </>
        )}

        {/* ==================== 第 7 层：黑线小臂与小圆球手 + 触碰冲击波 ==================== */}
        {renderArm(-82, 34, leftHand, 'left')}
        {renderArm(34, 34, rightHand, 'right')}

        {/* 迷你手账笔记本道具（pose === 'laptop' 时出现） */}
        {pose === 'laptop' && (
          <g transform="translate(-24 68)">
            <rect
              x={-30}
              y={-18}
              width={60}
              height={34}
              rx={6}
              fill={p.headphones}
              stroke={p.outline}
              strokeWidth={3.4}
            />
            <circle cx={0} cy={-1} r={5.5} fill={p.accent} />
            <rect
              x={-36}
              y={14}
              width={72}
              height={6}
              rx={3}
              fill={p.headphonesShade}
              stroke={p.outline}
              strokeWidth={3.2}
            />
          </g>
        )}

        {/* 当 reachDir === 'right' 且 isContact === true 时，手心生成放射冲击波 */}
        {activeReach === 'right' && isContact && (
          <g
            transform={`translate(${n2(rightHand.x)} ${n2(rightHand.y)})`}
            stroke={p.sparkle}
            fill="none"
            strokeLinecap="round"
            opacity={n2(1 - wavePulse * 0.75)}
          >
            <circle r={n2(8 + wavePulse * 18)} stroke={p.outline} strokeWidth={n2(4.2 - wavePulse * 2)} />
            <circle r={n2(8 + wavePulse * 18)} stroke={p.sparkle} strokeWidth={n2(2.8 - wavePulse * 1.4)} />
            {Array.from({ length: 8 }, (_, idx) => {
              const angle = (idx * Math.PI) / 4;
              const r1 = 15 + wavePulse * 8;
              const r2 = 23 + wavePulse * 11;
              return (
                <line
                  key={idx}
                  x1={n2(Math.cos(angle) * r1)}
                  y1={n2(Math.sin(angle) * r1)}
                  x2={n2(Math.cos(angle) * r2)}
                  y2={n2(Math.sin(angle) * r2)}
                  stroke={idx % 2 === 0 ? p.sparkle : p.accent}
                  strokeWidth={3}
                />
              );
            })}
          </g>
        )}

        {/* ==================== 第 8 层：头顶情绪特效道具 ==================== */}
        {/* idea 灵光一闪：手绘小黄灯泡 💡 与金色辐射芒 */}
        {expression === 'idea' && (
          <g transform={`translate(-88 ${n2(-88 + Math.sin(frame * 0.2) * 3)}) rotate(-12)`}>
            {/* 金色辐射光芒 */}
            {[-60, -30, 0, 30, 60].map((deg) => {
              const rad = ((deg - 90) * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  x1={n2(Math.cos(rad) * 20)}
                  y1={n2(Math.sin(rad) * 20 - 4)}
                  x2={n2(Math.cos(rad) * 28)}
                  y2={n2(Math.sin(rad) * 28 - 4)}
                  stroke={p.sparkle}
                  strokeWidth={3.2}
                  strokeLinecap="round"
                />
              );
            })}
            <path
              d="M 0 -20 C -16 -20 -18 -2 -8 6 Q -5 9 -5 14 L 5 14 Q 5 9 8 6 C 18 -2 16 -20 0 -20 Z"
              fill={p.sparkle}
              stroke={p.outline}
              strokeWidth={3.2}
              strokeLinejoin="round"
            />
            <path
              d="M -3 10 L 0 2 L 3 10"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x={-5}
              y={14}
              width={10}
              height={6}
              rx={2}
              fill={p.headphones}
              stroke={p.outline}
              strokeWidth={2.8}
            />
          </g>
        )}

        {/* rescued / cheer / star：漂浮小金星 ✦ 与彩色音乐符号 */}
        {(expression === 'rescued' || expression === 'cheer' || pose === 'star') && (
          <g>
            <StarSparkle
              x={-108}
              y={-72 + Math.sin(frame * 0.18) * 4}
              r={9}
              color={p.sparkle}
              stroke={p.outline}
              rotate={frame * 2}
            />
            <StarSparkle
              x={92}
              y={-42 + Math.cos(frame * 0.18) * 4}
              r={7.5}
              color={p.accent}
              stroke={p.outline}
              rotate={-frame * 2}
            />
            {/* 漂浮小音符 ♪ */}
            <g transform={`translate(-96 ${n2(-28 + Math.sin(frame * 0.15) * 5)}) rotate(-15)`}>
              <ellipse cx={0} cy={0} rx={5.5} ry={4.2} fill={p.accent} stroke={p.outline} strokeWidth={2.4} />
              <path
                d="M 4.5 -1 V -16 Q 12 -14 13 -8"
                fill="none"
                stroke={p.outline}
                strokeWidth={2.6}
                strokeLinecap="round"
              />
            </g>
          </g>
        )}

        {/* chill 惬意听歌：漂浮小困云 Zzz 与轻柔音符 */}
        {(expression === 'chill' || pose === 'chill') && (
          <g
            transform={`translate(-96 ${n2(-64 - ((frame % 60) * 0.25))})`}
            opacity={n2(0.88 - ((frame % 60) / 60) * 0.4)}
          >
            <path
              d="M -8 -8 H 2 L -7 3 H 3"
              fill="none"
              stroke={p.outline}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 8 -18 H 15 L 8 -10 H 15"
              fill="none"
              stroke={p.accent}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </g>
    </svg>
  );
}

/** 导出标准契约组件名 PinkNoteMascot */
export const PinkNoteMascot = CloudNoteMascot;

/**
 * ============================================================================
 * 交互式手账预览工坊（默认导出供右侧 Preview 窗口直接运行）
 * ============================================================================
 */
const VARIANT_LIST: {
  key: CloudVariant;
  name: string;
  desc: string;
  defaultPalette: CloudPalette;
  defaultExp: MascotExpression;
}[] = [
  {
    key: 'cat-headphones',
    name: '01. 经典猫耳耳机云',
    desc: '修复版立体猫耳耳机 + 双层手撕和纸符尾',
    defaultPalette: 'sky',
    defaultExp: 'chill',
  },
  {
    key: 'sleepy-nightcap',
    name: '02. 晚安波点睡帽云',
    desc: '波点睡帽 + 星星垂球 + 弯月云朵符尾',
    defaultPalette: 'lavender',
    defaultExp: 'chill',
  },
  {
    key: 'bunny-earmuffs',
    name: '03. 垂耳兔毛绒耳罩云',
    desc: '摇摆长兔耳毛绒耳罩 + 爱心腮红高光',
    defaultPalette: 'peach',
    defaultExp: 'happy',
  },
  {
    key: 'washi-crown',
    name: '04. 手账小皇冠拼贴云',
    desc: '免耳机清爽造型 + 折纸小皇冠 + 创可贴',
    defaultPalette: 'mint',
    defaultExp: 'wink',
  },
  {
    key: 'angel-wings',
    name: '05. 治愈天使羽翼云',
    desc: '悬浮发光天使光环 + 耳机软糯小羽翼',
    defaultPalette: 'vanilla',
    defaultExp: 'rescued',
  },
  {
    key: 'bear-beret',
    name: '06. 小熊画家贝雷帽云',
    desc: '圆圆小熊耳 + 画家贝雷帽 + 头顶小嫩芽',
    defaultPalette: 'caramel',
    defaultExp: 'idea',
  },
];

const EXPRESSIONS: { key: MascotExpression; label: string }[] = [
  { key: 'chill', label: '😌 惬意听歌 (chill)' },
  { key: 'happy', label: '😊 日常萌态 (happy)' },
  { key: 'wink', label: '😉 俏皮眨眼 (wink)' },
  { key: 'idea', label: '💡 灵光一闪 (idea)' },
  { key: 'rescued', label: '🎉 欢呼雀跃 (rescued)' },
  { key: 'panic', label: '😭 泪汪汪 (panic)' },
  { key: 'focus', label: '🎯 专注按压 (focus)' },
  { key: 'pull', label: '😣 咬牙拔河 (pull)' },
  { key: 'proud', label: '😌 得意骄傲 (proud)' },
];

const POSES: { key: MascotPose; label: string }[] = [
  { key: 'chill', label: '微醺摇摆 (chill)' },
  { key: 'idle', label: '待机呼吸 (idle)' },
  { key: 'run', label: '欢快奔跑 (run)' },
  { key: 'jump', label: '空中跳跃 (jump)' },
  { key: 'press', label: '伸手按键 (press)' },
  { key: 'trapped', label: '蜷缩受困 (trapped)' },
  { key: 'pull', label: '用力拔河 (pull)' },
  { key: 'laptop', label: '敲击电脑 (laptop)' },
];

export default function App() {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [variant, setVariant] = useState<CloudVariant>('cat-headphones');
  const [paletteKey, setPaletteKey] = useState<CloudPalette>('sky');
  const [expression, setExpression] = useState<MascotExpression>('chill');
  const [pose, setPose] = useState<MascotPose>('chill');
  const [stickerBorder, setStickerBorder] = useState(true);
  const [isContact, setIsContact] = useState(true);
  const [reachRight, setReachRight] = useState(false);

  useEffect(() => {
    if (!playing) return;
    let rafId: number;
    let last = performance.now();
    const tick = (now: number) => {
      if (now - last >= 1000 / 30) {
        setFrame((f) => (f + 1) % 3600);
        last = now;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playing]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#4A3E3D] p-4 md:p-6 font-sans select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 顶部标题栏 */}
        <header className="flex flex-wrap items-center justify-between gap-4 bg-white/90 border-2 border-[#EFE6DD] rounded-3xl px-6 py-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#BDE6FA] text-[#3E5366]">
                Remotion & React 18 Ready
              </span>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#3E5366]">
                ☁️ 「小困云」手账吉祥物重构与全变体工坊
              </h1>
            </div>
            <p className="text-xs md:text-sm text-[#7C6F64] mt-1">
              已完美修复耳机穿模与透视结构 · 14px 模切白边 · 双层和纸胶带 · 6 款定制变体与 6 套马卡龙手账色
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaying(!playing)}
              className="px-4 py-2 rounded-full text-xs font-bold bg-[#3E5366] text-white hover:opacity-90 transition"
            >
              {playing ? '⏸ 暂停帧动画' : '▶️ 播放帧动画'}
            </button>
            <span className="px-3 py-1.5 rounded-full text-xs font-mono bg-[#F4EFEA] text-[#5C4B3B]">
              frame: {frame}
            </span>
          </div>
        </header>

        {/* 主控舞台 + 交互控制栏 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左侧中央大预览舞台 */}
          <div
            className="lg:col-span-5 rounded-3xl border-2 border-[#EFE6DD] p-6 flex flex-col items-center justify-between relative overflow-hidden shadow-sm"
            style={{
              backgroundColor: '#FAF6F0',
              backgroundImage:
                'radial-gradient(#E2D9CC 1.25px, transparent 1.25px), radial-gradient(#E2D9CC 1.25px, #FAF6F0 1.25px)',
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 12px 12px',
            }}
          >
            <div className="w-full flex items-center justify-between text-xs font-bold text-[#7C6F64]">
              <span className="bg-white/90 px-3 py-1 rounded-full border border-[#E6DDD2]">
                当前变体：{VARIANT_LIST.find((v) => v.key === variant)?.name}
              </span>
              <span className="bg-white/90 px-3 py-1 rounded-full border border-[#E6DDD2]">
                配色：{PALETTES[paletteKey].label}
              </span>
            </div>

            <div className="my-4 flex items-center justify-center">
              <CloudNoteMascot
                size={240}
                frame={frame}
                variant={variant}
                paletteKey={paletteKey}
                expression={expression}
                pose={pose}
                stickerBorder={stickerBorder}
                reachDir={reachRight ? 'right' : 'none'}
                isContact={isContact}
              />
            </div>

            <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setStickerBorder(!stickerBorder)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                  stickerBorder
                    ? 'bg-white border-[#3E5366] text-[#3E5366] shadow-sm'
                    : 'bg-transparent border-[#D5CBBF] text-[#8C7F73]'
                }`}
              >
                {stickerBorder ? '✓ 14px 模切白边已开启' : '○ 14px 模切白边已关闭'}
              </button>
              <button
                onClick={() => {
                  setReachRight(!reachRight);
                  if (!reachRight) {
                    setExpression('focus');
                    setPose('press');
                    setIsContact(true);
                  }
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                  reachRight
                    ? 'bg-[#FFE07D] border-[#3E5366] text-[#3E5366] shadow-sm'
                    : 'bg-white border-[#D5CBBF] text-[#5C4B3B]'
                }`}
              >
                {reachRight ? '⚡ 右手按键冲击波已触发' : '👉 测试右手伸展按键波纹'}
              </button>
            </div>
          </div>

          {/* 右侧参数调试面板 */}
          <div className="lg:col-span-7 bg-white rounded-3xl border-2 border-[#EFE6DD] p-6 space-y-5 shadow-sm">
            {/* 1. 马卡龙手账配色切换 */}
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#8C7F73] mb-2.5">
                1. 马卡龙手账配色方案 (paletteKey)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(Object.keys(PALETTES) as CloudPalette[]).map((k) => {
                  const item = PALETTES[k];
                  const active = paletteKey === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setPaletteKey(k)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-2xl border-2 text-left transition ${
                        active
                          ? 'border-[#3E5366] bg-[#F8FAFC] shadow-sm'
                          : 'border-[#F0E9E0] hover:border-[#D8CFC4]'
                      }`}
                    >
                      <span
                        className="w-7 h-7 rounded-full border-2 shrink-0 flex items-center justify-center"
                        style={{
                          backgroundColor: item.main,
                          borderColor: item.outline,
                        }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.accent }}
                        />
                      </span>
                      <div className="truncate">
                        <div className="text-xs font-bold text-[#3E5366]">{item.label}</div>
                        <div className="text-[10px] text-[#8C7F73]">{item.tag}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. 幼态表情切换 */}
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#8C7F73] mb-2.5">
                2. 幼态表情切换 (expression)
              </h2>
              <div className="flex flex-wrap gap-2">
                {EXPRESSIONS.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setExpression(item.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      expression === item.key
                        ? 'bg-[#3E5366] text-white border-[#3E5366]'
                        : 'bg-[#FAF7F2] text-[#5C4B3B] border-[#EAE2D7] hover:bg-[#F2ECE4]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 动作姿态切换 */}
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#8C7F73] mb-2.5">
                3. 动作姿态切换 (pose)
              </h2>
              <div className="flex flex-wrap gap-2">
                {POSES.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setPose(item.key);
                      setReachRight(item.key === 'press');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      pose === item.key
                        ? 'bg-[#FF9EB5] text-[#3E5366] border-[#3E5366]'
                        : 'bg-[#FAF7F2] text-[#5C4B3B] border-[#EAE2D7] hover:bg-[#F2ECE4]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 底部：6 款「小困云」全变体一览画廊 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-extrabold text-[#3E5366]">
              ✨ 「小困云」6 款主题变体图鉴（点击任意卡片可切换至主舞台）
            </h2>
            <span className="text-xs text-[#8C7F73]">
              通过 <code className="bg-white px-1.5 py-0.5 rounded border">variant</code> 属性一键切换
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VARIANT_LIST.map((v) => {
              const selected = variant === v.key;
              return (
                <div
                  key={v.key}
                  onClick={() => {
                    setVariant(v.key);
                    setPaletteKey(v.defaultPalette);
                    setExpression(v.defaultExp);
                  }}
                  className={`cursor-pointer rounded-3xl border-2 p-4 transition flex flex-col items-center justify-between ${
                    selected
                      ? 'bg-white border-[#3E5366] shadow-md ring-2 ring-[#BDE6FA]'
                      : 'bg-white/80 border-[#EFE6DD] hover:border-[#C8BBAE] hover:bg-white'
                  }`}
                >
                  <div className="w-full flex items-center justify-between mb-1">
                    <span className="text-sm font-extrabold text-[#3E5366]">{v.name}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#F4EFEA] text-[#6E5E4F]">
                      {v.key}
                    </span>
                  </div>
                  <p className="w-full text-xs text-[#8C7F73] mb-2">{v.desc}</p>

                  <div className="py-2 flex items-center justify-center">
                    <CloudNoteMascot
                      size={155}
                      frame={frame}
                      variant={v.key}
                      paletteKey={v.defaultPalette}
                      expression={v.defaultExp}
                      pose="chill"
                      stickerBorder={true}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}