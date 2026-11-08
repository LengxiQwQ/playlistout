import React, { useId } from 'react';

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
  | 'trapped'  // panic 别名 (兼容旧工程)
  | 'rescued'  // 破笼而出：弯弯月牙笑眼 ^ ^、张嘴大笑露出粉舌、高举双臂欢呼
  | 'cheer'    // 欢呼
  | 'wow'      // rescued 别名 (兼容旧工程)
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

export interface MascotProps {
  size?: number;                     // 默认 210
  expression?: MascotExpression;     // 表情变体
  pose?: MascotPose;                 // 动作姿态
  pointDir?: 'left' | 'right' | 'down';
  reachDir?: ReachDirection;         // 手部物理伸展方向（按压按钮时触发）
  reachTarget?: { x: number; y: number }; // 手部高精度触碰目标坐标（SVG 局部坐标）
  reachProgress?: number;            // 手部伸展进度 (0 为收回自然垂落，1 为完全伸出触碰)
  isContact?: boolean;               // 手部是否接触到目标按钮（触发放射波纹）
  jitterX?: number;                  // 外部容器传递的水平抖动补偿 (px)
  jitterY?: number;                  // 外部容器传递的垂直抖动补偿 (px)
  frame?: number;                    // 动画当前帧
  rotation?: number;                 // 倾斜角度
  squash?: number;                   // 挤压拉伸系数 (>1 压扁, <1 拉伸)
  inAir?: number;                    // 腾空高度
  flipX?: boolean;                   // 水平翻转
  paletteKey?: string;               // 兼容接口保留（内部锁定为专属小困云晴空蓝）
  textureStrength?: number;          // 油画棒与和纸肌理浓度
  catEars?: boolean;                 // 是否显示耳机猫耳（默认 true）
  stickerBorder?: boolean;           // 是否显示 14px 纯白模切贴纸描边（默认 true）
  style?: React.CSSProperties;       // 自定义样式
}

export type CloudNoteMascotProps = MascotProps;
export type PinkNoteMascotProps = MascotProps;

/**
 * 专属「晴空困困蓝」小困云配色常量（唯一指定配色）
 */
export const SKY_CLOUD_COLORS = {
  light: '#F4FBFF',          // 云朵额头奶油高光蓝
  main: '#BDE6FA',           // 小困云经典主体晴空蓝
  deep: '#8AC5E6',           // 云朵底部柔和体积暗部蓝
  outline: '#567F99',        // 手账柔和深蓝灰描边
  headphones: '#FFFDF9',     // 奶油白立体耳机外壳
  headphonesShade: '#DCEBF7',// 耳机立体冷灰蓝暗部
  headphonesPad: '#FFE3EC',  // 耳机软糯樱花粉内垫
  accent: '#FF9EB5',         // 猫耳内衬与耳罩星星蜜桃粉
  cheeks: '#FF8FA8',         // 水彩粉扑腮红
  ink: '#3E5366',            // 五官深海蓝墨水色
  sparkle: '#FFE07D',        // 灯泡与星芒奶油黄
  tapeStripe: '#FFB5C8',     // 上层斜纹和纸胶带粉
  tapeDot: '#FFE89E',        // 下层波点和纸胶带奶黄
  shoe: '#FF9EB5',           // 小鞋子蜜桃粉
} as const;

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
}: {
  expression: MascotExpression;
  frame: number;
  ink: string;
  cheeks: string;
}) {
  const exp =
    expression === 'scared' || expression === 'trapped'
      ? 'panic'
      : expression === 'cheer' || expression === 'wow'
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
      {/* 水彩粉扑大腮红 + 手账斜线高光 */}
      <g fill={cheeks}>
        <ellipse cx={-68} cy={32} rx={13.5} ry={8.2} fillOpacity={0.28} />
        <ellipse cx={-68} cy={32} rx={9.5} ry={5.8} fillOpacity={0.55} />
        <ellipse cx={20} cy={32} rx={13.5} ry={8.2} fillOpacity={0.28} />
        <ellipse cx={20} cy={32} rx={9.5} ry={5.8} fillOpacity={0.55} />
      </g>
      <path
        d="M -72 31 l 2.5 -3.5 M -66 34 l 2.5 -3.5 M 16 31 l 2.5 -3.5 M 22 34 l 2.5 -3.5"
        fill="none"
        stroke="#FFFDF9"
        strokeWidth={2}
        strokeLinecap="round"
        strokeOpacity={0.85}
      />

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
 * 主组件：专属蓝色「小困云」CloudNoteMascot（同时导出 PinkNoteMascot 兼容工程契约）
 */
export function CloudNoteMascot({
  size = 210,
  expression = 'chill',
  pose = 'chill',
  pointDir = 'right',
  reachDir = 'none',
  reachTarget,
  reachProgress,
  isContact = false,
  jitterX = 0,
  jitterY = 0,
  frame = 0,
  rotation = 0,
  squash = 1,
  inAir = 0,
  flipX = false,
  textureStrength = 1.0,
  catEars = true,
  stickerBorder = true,
  style,
}: MascotProps) {
  const id = (name: string) => `sky-cloud-${name}`;

  const p = SKY_CLOUD_COLORS;
  const texOpacity = clamp(textureStrength, 0, 1.5);

  // 逐帧动力学参数 (温和呼吸浮动)
  const bob = Math.sin((frame / 30) * Math.PI * 4) * 2.0;
  const walkCycle = Math.sin(frame * 0.36);
  const flagFlutter = n2(Math.sin(frame * 0.16) * 3.5 + Math.cos(frame * 0.09) * 1.5);
  const earWiggle = n2(Math.sin(frame * 0.12) * 2.2);

  const isJumping =
    pose === 'jump' || pose === 'cheer' || expression === 'rescued' || expression === 'cheer';
  const lift = Math.max(0, inAir) + (isJumping ? 12 + Math.abs(Math.sin(frame * 0.18)) * 6 : 0);
  const shakeX =
    pose === 'trapped' || expression === 'panic' || expression === 'scared' || expression === 'trapped'
      ? Math.sin(frame * 1.8) * 1.0
      : 0;
  const swayDeg =
    pose === 'run'
      ? walkCycle * 3.5
      : pose === 'chill' || expression === 'chill'
      ? Math.sin(frame * 0.08) * 2.5
      : pose === 'pull' || expression === 'pull'
      ? -7
      : pose === 'push'
      ? 6
      : 0;

  // 整体角色基于脚底受力点 (-22, 100) 的微幅挤压拉伸（温和自然，绝无剧烈变形或闪烁）
  const safeSquash = clamp(squash, 0.85, 1.20);
  const bodySquashY = clamp(1 / safeSquash, 0.83, 1.18);
  const bodySquashX = clamp(Math.sqrt(safeSquash), 0.90, 1.10);
  const bodySquashTransform =
    Math.abs(safeSquash - 1) > 0.005
      ? `translate(-22 100) scale(${n2(bodySquashX)} ${n2(bodySquashY)}) translate(22 -100)`
      : '';

  // 贴合云朵头顶弧度、绕过符干后方的改良立体耳机头梁
  const HEADBAND_PATH = 'M -89 4 C -87 -58 39 -58 41 4';

  // 各动作姿态 (pose) 的手部物理坐标计算
  let leftHand = { x: -110, y: 46 };
  let rightHand = { x: 68, y: 44 };

  if (pose === 'trapped' || expression === 'panic' || expression === 'scared' || expression === 'trapped') {
    // 受困抱头蜷缩
    leftHand = { x: -90, y: 24 };
    rightHand = { x: 44, y: 24 };
  } else if (pose === 'run') {
    // 奔跑前后摆臂
    leftHand = { x: -112 + walkCycle * 12, y: 34 - walkCycle * 14 };
    rightHand = { x: 70 - walkCycle * 12, y: 34 + walkCycle * 14 };
  } else if (isJumping) {
    // 欢呼高举双手
    leftHand = { x: -114, y: -24 };
    rightHand = { x: 78, y: -26 };
  } else if (pose === 'pull' || expression === 'pull') {
    // 咬牙向左拔河
    leftHand = { x: -126, y: 14 };
    rightHand = { x: -94, y: 20 };
  } else if (pose === 'push') {
    // 奋力向右推物
    leftHand = { x: 76, y: 14 };
    rightHand = { x: 100, y: 22 };
  } else if (pose === 'laptop') {
    // 敲击面前笔记本键盘 (左右交替打字节奏)
    leftHand = { x: -46, y: 72 + Math.sin(frame * 0.7) * 4 };
    rightHand = { x: -2, y: 72 - Math.sin(frame * 0.7) * 4 };
  } else if (pose === 'star' || expression === 'idea') {
    // 灵光一闪右手向上指
    leftHand = { x: -106, y: 42 };
    rightHand = { x: 74, y: -36 };
  } else if (expression === 'proud') {
    // 得意叉腰
    leftHand = { x: -88, y: 48 };
    rightHand = { x: 42, y: 48 };
  } else if (pose === 'guide' && reachDir === 'none') {
    // 手势引导方向
    if (pointDir === 'left') leftHand = { x: -128, y: 12 };
    else if (pointDir === 'down') rightHand = { x: 44, y: 94 };
    else rightHand = { x: 108, y: 10 };
  }

  // 记录未伸展时的默认姿态手部坐标
  const defaultLeft = { ...leftHand };
  const defaultRight = { ...rightHand };

  // 真实伸展按压方向 (若显式传入 reachTarget，高精度锁定目标按钮中心)
  let activeReach: ReachDirection =
    reachDir !== 'none'
      ? reachDir
      : pose === 'laptop'
      ? 'none'
      : pose === 'press' || expression === 'press' || expression === 'focus'
      ? 'right'
      : 'none';

  const progress = clamp(reachProgress ?? (reachTarget ? 1 : 0), 0, 1);

  if (reachTarget && progress > 0.001) {
    if (reachDir === 'down' || (reachTarget.y > 60 && Math.abs(reachTarget.x) < 45)) {
      activeReach = 'down';
    } else if (reachTarget.x < 0) {
      activeReach = 'left';
    } else {
      activeReach = 'right';
    }

    // ========== 手部物理定点锁定算法 (Pin Hand in World Coordinates) ==========
    // 用户需求：“这个角色抖动的时候，手指的地方不要动，只是角色本身抖动。手部不用动，胳膊可以相对来说动一下，等于是人在动，但是手一直指在同一个地方”
    // 计算躯干在 SVG 内部及父容器中的全部动态位移分量：
    const scale = size / 280;
    const divShiftX = (jitterX || 0) / scale;
    const divShiftY = (jitterY || 0) / scale;
    const totalDeltaX = divShiftX + shakeX;
    const totalDeltaY = divShiftY + (bob - lift);

    // 逆向抵消躯干平移：
    const unshiftedX = reachTarget.x - totalDeltaX;
    const unshiftedY = reachTarget.y - totalDeltaY;

    // 逆向抵消 bodySquashTransform（以 (-22, 100) 为基准点的挤压拉伸）：
    const pinnedX = -22 + (unshiftedX - (-22)) / bodySquashX;
    const pinnedY = 100 + (unshiftedY - 100) / bodySquashY;

    // 根据 reachProgress 平滑插值：0 为自然初始姿态，1 为完全伸展至锁定目标点
    if (activeReach === 'left') {
      leftHand = {
        x: defaultLeft.x + (pinnedX - defaultLeft.x) * progress,
        y: defaultLeft.y + (pinnedY - defaultLeft.y) * progress,
      };
    } else {
      rightHand = {
        x: defaultRight.x + (pinnedX - defaultRight.x) * progress,
        y: defaultRight.y + (pinnedY - defaultRight.y) * progress,
      };
    }
  } else if (!reachTarget && activeReach !== 'none' && progress > 0.001) {
    if (activeReach === 'right') {
      rightHand = {
        x: defaultRight.x + ((isContact ? 124 : 108) - defaultRight.x) * progress,
        y: defaultRight.y + (10 - defaultRight.y) * progress,
      };
    } else if (activeReach === 'left') {
      leftHand = {
        x: defaultLeft.x + ((isContact ? -130 : -118) - defaultLeft.x) * progress,
        y: defaultLeft.y + (10 - defaultLeft.y) * progress,
      };
    } else if (activeReach === 'down') {
      rightHand = {
        x: defaultRight.x + (44 - defaultRight.x) * progress,
        y: defaultRight.y + ((isContact ? 104 : 92) - defaultRight.y) * progress,
      };
    } else if (activeReach === 'up-right') {
      rightHand = {
        x: defaultRight.x + (98 - defaultRight.x) * progress,
        y: defaultRight.y + (-42 - defaultRight.y) * progress,
      };
    }
  }

  const wavePulse = ((frame % 20) + 20) % 20 / 20;

  // 渲染双腿与小鞋子
  const renderLeg = (side: -1 | 1) => {
    const hipX = side === -1 ? -44 : -4;
    const hipY = 60;

    if (pose === 'trapped' || expression === 'trapped') {
      const footX = hipX + side * 7;
      const footY = 76;
      return (
        <g key={`leg-${side}`}>
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
        : pose === 'pull'
        ? side * 8 + 10
        : pose === 'push'
        ? side * 8 - 10
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
      <g key={`leg-${side}`}>
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
      <g key={`arm-${side}`}>
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

  // 渲染 3D 立体斜角耳罩（带软垫、外罩壳、伸缩支臂与四角星徽章）
  const render3DEarcup = (side: 'left' | 'right') => {
    const cx = side === 'left' ? -90 : 42;
    const cy = 8;
    const tilt = side === 'left' ? -9 : 9;
    const inward = side === 'left' ? 1 : -1;

    return (
      <g key={`earcup-${side}`} transform={`translate(${cx} ${cy}) rotate(${tilt})`}>
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

        {/* 耳罩中心装饰片与四角星 */}
        <ellipse cx={-inward * 3.2} cy={0} rx={8} ry={11.5} fill={p.accent} />
        <StarSparkle x={-inward * 3.2} y={0} r={4.8} color="#FFFDF9" />

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

  return (
    <svg
      viewBox="-140 -155 280 275"
      width={size}
      height={size * 1.15}
      style={{ overflow: 'visible', display: 'block', ...style }}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="小困云：晴空蓝猫耳耳机音符吉祥物"
    >
      <defs>
        {/* 身体晴空蓝奶油渐变 */}
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
        {/* 全身从脚底 (-22, 100) 的挤压拉伸包裹组 */}
        <g transform={bodySquashTransform}>
          {/* ==================== 第 2 层：纯白模切贴纸描边 (14px Die-cut Sticker Border) ==================== */}
          {stickerBorder && (
            <g
              fill="#FFFFFF"
              stroke="#FFFFFF"
              strokeWidth={14}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={CLOUD_HEAD_PATH} />
              <path d={STEM_PATH} />
              <g transform={`rotate(${flagFlutter} 24 -116)`}>
                <path d={TAPE_FLAG_LOWER} />
                <path d={TAPE_FLAG_UPPER} />
              </g>
              <path d={HEADBAND_PATH} fill="none" strokeWidth={24} />
              <ellipse cx={-90} cy={8} rx={21} ry={25} transform="rotate(-9 -90 8)" />
              <ellipse cx={42} cy={8} rx={21} ry={25} transform="rotate(9 42 8)" />
              {catEars && (
                <>
                  <g transform="translate(-70 -31) rotate(-32)">
                    <path d="M -16 6 C -15 -18 -5 -24 0 -24 C 5 -24 15 -18 16 6 Z" />
                  </g>
                  <g transform="translate(22 -31) rotate(32)">
                    <path d="M -16 6 C -15 -18 -5 -24 0 -24 C 5 -24 15 -18 16 6 Z" />
                  </g>
                </>
              )}
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

          {/* ==================== 耳机头梁后置层（自然绕过音符符干后方，不穿模） ==================== */}
          <g>
            {/* 沿着头梁切线自然生长的立体猫耳 */}
            {catEars && (
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

            {/* 立体双层头梁弧线（带樱花粉撞色软垫与高光） */}
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

          {/* ==================== 第 4 层：挺拔糖果斜纹符干与双层和纸飘带符尾 ==================== */}
          <g>
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

            {/* 随 flagFlutter 摆动的双层手撕和纸胶带符尾 */}
            <g transform={`rotate(${flagFlutter} 24 -116)`}>
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
            </g>
          </g>

          {/* ==================== 第 5 层 & 第 6 层：圆润云朵符头身体 + 幼态黄金比例五官 ==================== */}
          <g>
            <path
              d={CLOUD_HEAD_PATH}
              fill={`url(#${id('body-grad')})`}
              stroke={p.outline}
              strokeWidth={4.2}
              strokeLinejoin="round"
            />
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

            {/* 第 6 层：幼态黄金比例五官 */}
            <KawaiiFace
              expression={expression}
              frame={frame}
              ink={p.ink}
              cheeks={p.cheeks}
            />
          </g>

          {/* ==================== 立体斜角耳罩前景层（自然贴合云朵两侧脸颊） ==================== */}
          {render3DEarcup('left')}
          {render3DEarcup('right')}

          {/* ==================== 第 7 层：黑线小臂与小圆球手 + 触碰冲击波 ==================== */}
          {renderArm(-82, 34, leftHand, 'left')}
          {renderArm(34, 34, rightHand, 'right')}

          {/* 迷你手账笔记本道具（pose === 'laptop' 时出现，按用户要求放大并带双音符徽标） */}
          {pose === 'laptop' && (
            <g transform="translate(-24 72) scale(1.42)">
              {/* 笔记本屏幕背盖 */}
              <rect
                x={-30}
                y={-18}
                width={60}
                height={34}
                rx={6}
                fill={p.headphones}
                stroke={p.outline}
                strokeWidth={3.2}
              />
              {/* 电脑背盖双音符音乐徽标 (Beamed Double Note ♫) */}
              <g transform="translate(0 -2)">
                <ellipse cx={-6.8} cy={4.8} rx={4.2} ry={3.2} transform="rotate(-18 -6.8 4.8)" fill={p.accent} />
                <ellipse cx={6.8} cy={2.8} rx={4.2} ry={3.2} transform="rotate(-18 6.8 2.8)" fill={p.accent} />
                <line x1={-3.6} y1={4.8} x2={-3.6} y2={-7.2} stroke={p.accent} strokeWidth={2.5} strokeLinecap="round" />
                <line x1={10} y1={2.8} x2={10} y2={-9.2} stroke={p.accent} strokeWidth={2.5} strokeLinecap="round" />
                <polygon
                  points="-4.6,-5.2 11.2,-7.2 11.2,-10.4 -4.6,-8.4"
                  fill={p.accent}
                />
              </g>
              {/* 笔记本键盘底座 */}
              <rect
                x={-36}
                y={14}
                width={72}
                height={6.5}
                rx={3.2}
                fill={p.headphonesShade}
                stroke={p.outline}
                strokeWidth={3}
              />
            </g>
          )}

          {/* 当 activeReach !== 'none' 且 isContact === true 且手部完全伸展 (progress >= 0.75) 时，手心生成按压触碰闪光波纹与星芒 */}
          {activeReach !== 'none' && isContact && progress >= 0.75 && (
            <g
              transform={`translate(${n2(
                activeReach === 'left' ? leftHand.x : rightHand.x
              )} ${n2(activeReach === 'left' ? leftHand.y : rightHand.y)})`}
            >
              {/* 中心高光触碰点闪烁 */}
              <circle r={8} fill="#FFFBE6" stroke="#FFD700" strokeWidth={3} />
              <circle r={4} fill="#FF8FA8" />

              {/* 放射双层触碰波纹 */}
              <circle
                r={n2(12 + wavePulse * 24)}
                fill="none"
                stroke="#FFD700"
                strokeWidth={n2(3.6 - wavePulse * 2.4)}
                strokeOpacity={n2(1 - wavePulse * 0.7)}
              />
              <circle
                r={n2(7 + wavePulse * 16)}
                fill="none"
                stroke="#FF8FA8"
                strokeWidth={n2(2.8 - wavePulse * 1.8)}
                strokeOpacity={n2(1 - wavePulse * 0.6)}
              />

              {/* 8 方向向外迸发的金色星芒 */}
              {Array.from({ length: 8 }, (_, idx) => {
                const angle = (idx * Math.PI) / 4;
                const r1 = 16 + wavePulse * 8;
                const r2 = 28 + wavePulse * 14;
                return (
                  <line
                    key={idx}
                    x1={n2(Math.cos(angle) * r1)}
                    y1={n2(Math.sin(angle) * r1)}
                    x2={n2(Math.cos(angle) * r2)}
                    y2={n2(Math.sin(angle) * r2)}
                    stroke={idx % 2 === 0 ? '#FFD700' : '#FF8FA8'}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeOpacity={n2(1 - wavePulse * 0.65)}
                  />
                );
              })}
            </g>
          )}

          {/* ==================== 第 8 层：头顶情绪特效道具 ==================== */}
          {/* idea 灵光一闪：手绘小黄灯泡 💡 与金色辐射芒 */}
          {expression === 'idea' && (
            <g transform={`translate(-88 ${n2(-88 + Math.sin(frame * 0.2) * 3)}) rotate(-12)`}>
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

          {/* chill 惬意听歌：漂浮小困云 Zzz 与音符 */}
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
      </g>
    </svg>
  );
}

/** 导出标准契约组件名 PinkNoteMascot */
export const PinkNoteMascot = CloudNoteMascot;
