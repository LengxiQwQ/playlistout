import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, F } from '../theme';
import {
  CloudNoteMascot,
  MascotExpression,
  MascotPose,
  ReachDirection,
} from './CloudNoteMascot';

interface Waypoint {
  f: number;
  x: number;
  y: number;
  size: number;
  pose: MascotPose;
  expression: MascotExpression;
  pointDir?: 'left' | 'right' | 'down';
  reachDir?: ReachDirection;
  reachTarget?: { x: number; y: number };
  reachProgress?: number;
  isContact?: boolean;
  arc?: number;
  bubble?: string;
  flipX?: boolean;
  linear?: boolean;
}

const WAYPOINTS: Waypoint[] = [
  // ================= SCENE 1: CAGE -> BREAKOUT -> 6 PLATFORMS =================
  // 笼中受困 (0.0s - 4.5s)：大眼泪汪汪 ＞﹏＜、抱头瑟瑟发抖、晶莹泪滴滑落 (Preset 05: trapped + panic)
  { f: 0, x: 1455, y: 455, size: 235, pose: 'trapped', expression: 'panic', reachProgress: 0 },
  { f: 125, x: 1455, y: 455, size: 235, pose: 'trapped', expression: 'panic', reachProgress: 0 },
  // 金钥匙解锁笼锁 (135-164 / 4.5s-5.5s)：灵光一闪亮起小黄灯泡 💡，惊喜察觉破笼时机！(Preset 07: star + idea)
  { f: 135, x: 1455, y: 448, size: 245, pose: 'cheer', expression: 'idea', reachProgress: 0 },
  { f: 164, x: 1455, y: 448, size: 245, pose: 'cheer', expression: 'idea', reachProgress: 0 },
  // 破笼抛物线大跳 (mascot_jump_out = 165 / 5.5s -> 180 / 6.0s 落地)：破笼而出高举双臂，月牙笑眼露粉舌，星芒音符环绕！(Preset 04: cheer + rescued)
  { f: 180, x: 830, y: 615, size: 240, pose: 'cheer', expression: 'rescued', reachProgress: 0, arc: 210, bubble: '自由啦！出发！' },
  // 6 大平台徽章依次弹出 (195 / 6.5s)：俏皮眨眼指引右侧 (Preset 10: guide + wink)
  { f: 195, x: 830, y: 615, size: 240, pose: 'guide', expression: 'wink', pointDir: 'right', reachProgress: 0, bubble: '六大平台都能解！' },
  // 自信叉腰小骄傲 (Preset 12: idle + proud)
  { f: 216, x: 830, y: 615, size: 240, pose: 'idle', expression: 'proud', reachProgress: 0 },
  { f: 222, x: 830, y: 615, size: 240, pose: 'idle', expression: 'proud', reachProgress: 0 },

  // ================= SCENE 2: WEB PARSE (CURSOR TRACKING -> PRESS PARSE -> COMPANION STAGE -> EXPORT) =================
  // 随翻页柔和起跳纵身跃入输入框首端 (x=240, y=205)，优美抛物线平滑着陆，准备跟随打字光标 (249 开始打字)
  { f: 244, x: 240, y: 205, size: 140, pose: 'idle', expression: 'happy', reachProgress: 0, arc: 140, bubble: '快把链接粘进来 ♪' },
  // 249 ~ 288: 随打字匀速平滑奔跑紧贴光标，双手自然摆臂奔跑，绝对不分两步走、不卡顿、不伸手！(urlStart=249, 42 chars @ 32cps -> frame 288)
  { f: 249, x: 240, y: 205, size: 140, pose: 'run', expression: 'happy', reachProgress: 0, linear: true, bubble: '快把链接粘进来 ♪' },
  { f: 288, x: 1010, y: 205, size: 140, pose: 'run', expression: 'happy', reachProgress: 0, linear: true, bubble: '快把链接粘进来 ♪' },
  // 288 ~ 304: 输入完毕，光标闪烁，小吉祥物站在链接尾部欢喜定格确认
  { f: 304, x: 1010, y: 205, size: 140, pose: 'idle', expression: 'happy', reachProgress: 0, bubble: '就是这个链接！' },
  // 304 ~ 316: 纵身腾空跳跃至「解析」按钮右侧旁 (x=1825, y=280)，空中双手自然收好
  { f: 316, x: 1825, y: 280, size: 185, pose: 'idle', expression: 'focus', reachProgress: 0, arc: 140, bubble: '点这里解析！' },
  // 317 ~ 320 站稳后：左手迅速自然伸向按钮中心 (reachProgress: 0 -> 1)
  { f: 318, x: 1825, y: 280, size: 185, pose: 'press', expression: 'focus', reachDir: 'left', reachTarget: { x: -219, y: -22 }, reachProgress: 1, isContact: false, bubble: '点这里解析！' },
  // 321 点击时刻：手心精准落在按钮中心，金色放射冲击波爆发！身体微抖但手指坚如磐石！
  { f: 321, x: 1825, y: 280, size: 185, pose: 'press', expression: 'focus', reachDir: 'left', reachTarget: { x: -219, y: -22 }, reachProgress: 1, isContact: true, bubble: '点这里解析！' },
  { f: 332, x: 1825, y: 280, size: 185, pose: 'press', expression: 'focus', reachDir: 'left', reachTarget: { x: -219, y: -22 }, reachProgress: 1, isContact: true, bubble: '点这里解析！' },
  // 336 点完后将小手自然收回 (reachProgress: 0)，随后准备纵身跳向歌单表格右侧粉色伴奏区
  { f: 336, x: 1825, y: 280, size: 185, pose: 'idle', expression: 'happy', reachProgress: 0, isContact: false },
  // 356 歌单展开：吉祥物大跳飞奔至右侧粉色区域 (x=1630, y=602)，双手自然收于身侧
  { f: 356, x: 1630, y: 602, size: 210, pose: 'idle', expression: 'happy', reachProgress: 0, arc: 110, bubble: '128 首超全动漫曲库！' },
  // 374 抓住表格右侧滚动条滑块：左手 100% 紧贴抓住滚动条滑块中心 (x=-172, y=0)
  { f: 374, x: 1630, y: 602, size: 210, pose: 'pull', expression: 'focus', reachDir: 'left', reachTarget: { x: -172, y: 0 }, reachProgress: 1, isContact: true, bubble: '往下扒拉，歌单超级多！' },
  // 374 ~ 438 表格一次性单关键帧顺滑滚到底部！中间绝无停顿，身体与滑块同步下沉到底 y=825，手部全程死锁滑块！
  { f: 438, x: 1630, y: 825, size: 210, pose: 'pull', expression: 'proud', reachDir: 'left', reachTarget: { x: -172, y: 0 }, reachProgress: 1, isContact: true, bubble: '128 首全部滚到底啦！' },
  // 450 滚到底后得意起身回弹至站位 y=615，收手站稳准备跃向上方导出按钮
  { f: 450, x: 1630, y: 615, size: 210, pose: 'idle', expression: 'proud', reachProgress: 0, isContact: false },
  // 跃至上方导出工具栏「导出 Excel」按钮左侧旁空白区 (458 ~ 483 空中跳跃正常姿态)
  // 483 落地：双手在身侧 (reachProgress: 0)
  { f: 483, x: 1130, y: 425, size: 180, pose: 'idle', expression: 'focus', reachProgress: 0, arc: 135, bubble: '一键本地导出！' },
  // 落地后右手自然向右伸向「导出 Excel」按钮中心 (reachProgress: 0 -> 1)
  { f: 494, x: 1130, y: 425, size: 180, pose: 'press', expression: 'focus', reachDir: 'right', reachTarget: { x: 256, y: -18 }, reachProgress: 1, isContact: false, bubble: '一键本地导出！' },
  // 504 点击时刻：手心精准触碰 Excel 按钮中心！
  { f: 504, x: 1130, y: 425, size: 180, pose: 'press', expression: 'focus', reachDir: 'right', reachTarget: { x: 256, y: -18 }, reachProgress: 1, isContact: true, bubble: '一键本地导出！' },
  { f: 520, x: 1130, y: 425, size: 180, pose: 'press', expression: 'focus', reachDir: 'right', reachTarget: { x: 256, y: -18 }, reachProgress: 1, isContact: true, bubble: '一键本地导出！' },
  // 532 点完收手
  { f: 532, x: 1130, y: 425, size: 180, pose: 'idle', expression: 'happy', reachProgress: 0, isContact: false, bubble: '一键本地导出！' },

  // ================= SCENE 3: MULTI-FORMAT EXPORT (EXCEL -> JSON -> 6 FORMATS) =================
  // Excel 卡片焦点：手势引导双工作表卡片 (Preset 10: guide + happy)
  { f: 560, x: 855, y: 645, size: 200, pose: 'guide', expression: 'happy', pointDir: 'left', reachProgress: 0, arc: 140, bubble: '双工作表 Excel！' },
  { f: 634, x: 855, y: 645, size: 200, pose: 'guide', expression: 'happy', pointDir: 'left', reachProgress: 0 },
  // 跃至右侧 JSON 卡片：得意骄傲指引标准契约结构 (Preset 10: guide + proud)
  { f: 658, x: 1710, y: 560, size: 200, pose: 'guide', expression: 'proud', pointDir: 'left', reachProgress: 0, arc: 155, bubble: '标准 JSON 结构！' },
  { f: 718, x: 1710, y: 560, size: 200, pose: 'guide', expression: 'proud', pointDir: 'left', reachProgress: 0 },
  // 跃至中间舞台，6 种格式全扇形展开：头顶发光小灯泡 💡 + 星星眼 (Preset 07: star + idea)
  { f: 742, x: 995, y: 560, size: 210, pose: 'star', expression: 'idea', reachProgress: 0, arc: 130, bubble: '六种格式全齐！' },
  { f: 816, x: 995, y: 560, size: 210, pose: 'cheer', expression: 'wink', reachProgress: 0 },

  // ================= SCENE 4: BATCH EXPORT (CHECK 1, 2, 3 -> WORKBOOK & ZIP) =================
  // 移动至复选框左侧留白列：空中跳跃双手正常，846 落地
  { f: 846, x: 135, y: 406, size: 155, pose: 'idle', expression: 'focus', reachProgress: 0, arc: 155 },
  // 落地后右手自然向右伸展触碰 Checkbox 1 (855 点击)
  { f: 850, x: 135, y: 406, size: 155, pose: 'press', expression: 'focus', reachDir: 'right', reachTarget: { x: 193, y: -10 }, reachProgress: 1, isContact: false },
  { f: 855, x: 135, y: 406, size: 155, pose: 'press', expression: 'focus', reachDir: 'right', reachTarget: { x: 193, y: -10 }, reachProgress: 1, isContact: true },
  { f: 862, x: 135, y: 406, size: 155, pose: 'press', expression: 'focus', reachDir: 'right', reachTarget: { x: 193, y: -10 }, reachProgress: 1, isContact: true },
  { f: 868, x: 135, y: 406, size: 155, pose: 'idle', expression: 'focus', reachProgress: 0, isContact: false },
  // 蹦跳至 Checkbox 2：下落移动中手自然收好，878 落地后才再次伸手
  { f: 878, x: 135, y: 542, size: 155, pose: 'idle', expression: 'focus', reachProgress: 0, arc: 45 },
  { f: 880, x: 135, y: 542, size: 155, pose: 'press', expression: 'focus', reachDir: 'right', reachTarget: { x: 193, y: -10 }, reachProgress: 1, isContact: false },
  { f: 882, x: 135, y: 542, size: 155, pose: 'press', expression: 'focus', reachDir: 'right', reachTarget: { x: 193, y: -10 }, reachProgress: 1, isContact: true },
  { f: 888, x: 135, y: 542, size: 155, pose: 'press', expression: 'focus', reachDir: 'right', reachTarget: { x: 193, y: -10 }, reachProgress: 1, isContact: true },
  { f: 894, x: 135, y: 542, size: 155, pose: 'idle', expression: 'focus', reachProgress: 0, isContact: false },
  // 蹦跳至 Checkbox 3：下落移动中手收好，904 落地后才伸手
  { f: 904, x: 135, y: 678, size: 155, pose: 'idle', expression: 'focus', reachProgress: 0, arc: 45 },
  { f: 907, x: 135, y: 678, size: 155, pose: 'press', expression: 'focus', reachDir: 'right', reachTarget: { x: 193, y: -10 }, reachProgress: 1, isContact: false },
  { f: 909, x: 135, y: 678, size: 155, pose: 'press', expression: 'focus', reachDir: 'right', reachTarget: { x: 193, y: -10 }, reachProgress: 1, isContact: true },
  { f: 916, x: 135, y: 678, size: 155, pose: 'press', expression: 'focus', reachDir: 'right', reachTarget: { x: 193, y: -10 }, reachProgress: 1, isContact: true },
  { f: 922, x: 135, y: 678, size: 155, pose: 'idle', expression: 'focus', reachProgress: 0, isContact: false },
  // 跃至「📦 批量打包导出」按钮右侧旁 (922 ~ 936 空中跳跃姿态正常收手)
  // 936 落地站稳：手在身侧 (reachProgress: 0)
  { f: 936, x: 1040, y: 895, size: 180, pose: 'idle', expression: 'focus', reachProgress: 0, arc: 125, bubble: '238 首一起打包！' },
  // 938 落地后左手自然向左伸向按钮中心并点击
  { f: 938, x: 1040, y: 895, size: 180, pose: 'press', expression: 'focus', reachDir: 'left', reachTarget: { x: -334, y: -23 }, reachProgress: 1, isContact: false, bubble: '238 首一起打包！' },
  { f: 939, x: 1040, y: 895, size: 180, pose: 'press', expression: 'focus', reachDir: 'left', reachTarget: { x: -334, y: -23 }, reachProgress: 1, isContact: true, bubble: '238 首一起打包！' },
  { f: 955, x: 1040, y: 895, size: 180, pose: 'press', expression: 'focus', reachDir: 'left', reachTarget: { x: -334, y: -23 }, reachProgress: 1, isContact: true, bubble: '238 首一起打包！' },
  { f: 963, x: 1040, y: 895, size: 180, pose: 'idle', expression: 'happy', reachProgress: 0, isContact: false },
  // 跳至右侧 ZIP 打包卡片 (x=1725, y=755)：咬牙拔河拉动拉链 (Preset 08: pull + pull)
  { f: 988, x: 1725, y: 755, size: 190, pose: 'pull', expression: 'pull', reachProgress: 0, arc: 170 },
  { f: 1022, x: 1725, y: 755, size: 190, pose: 'pull', expression: 'pull', reachProgress: 0 },
  // 拉链封口完毕，爆炸礼花绽放！吉祥物高举双手欢呼大跳庆祝 (Preset 04: cheer + rescued)
  { f: 1032, x: 1725, y: 735, size: 200, pose: 'cheer', expression: 'rescued', reachProgress: 0, arc: 45, bubble: '打包完成啦！' },
  { f: 1074, x: 1725, y: 745, size: 200, pose: 'cheer', expression: 'rescued', reachProgress: 0, bubble: '打包完成啦！' },

  // ================= SCENE 5: CLI WORLD (LAPTOP TYPING -> PRESS ENTER KEYCAP) =================
  // 终端命令行舞台：面前支起迷你云朵笔记本电脑，双手随鼓点快速打字 (Preset 11: laptop + focus)
  { f: 1104, x: 1575, y: 480, size: 305, pose: 'laptop', expression: 'focus', reachProgress: 0, arc: 160, bubble: '终端交互向导！' },
  { f: 1248, x: 1575, y: 480, size: 305, pose: 'laptop', expression: 'focus', reachProgress: 0, bubble: '自动识别平台 ♪' },
  // 笔记本收起，在 Enter 键帽上方的专属舞台站稳 (1258 落地收手)
  { f: 1258, x: 1555, y: 530, size: 220, pose: 'idle', expression: 'focus', reachProgress: 0, bubble: '敲下回车导出！' },
  // 站稳后向下一掌重重拍按在回车键中心 (1555, 685)！
  { f: 1263, x: 1555, y: 530, size: 220, pose: 'press', expression: 'focus', reachDir: 'down', reachTarget: { x: 0, y: 245 }, reachProgress: 0.6, isContact: false, bubble: '敲下回车导出！' },
  { f: 1265, x: 1555, y: 530, size: 220, pose: 'press', expression: 'focus', reachDir: 'down', reachTarget: { x: 0, y: 245 }, reachProgress: 1, isContact: true, bubble: '敲下回车导出！' },
  { f: 1276, x: 1555, y: 530, size: 220, pose: 'press', expression: 'focus', reachDir: 'down', reachTarget: { x: 0, y: 245 }, reachProgress: 1, isContact: true, bubble: '敲下回车导出！' },
  { f: 1284, x: 1555, y: 530, size: 220, pose: 'idle', expression: 'happy', reachProgress: 0, isContact: false },
  // 1290 CLI 导出完成，礼花爆发！吉祥物原地大跳欢呼！(Preset 04: cheer + rescued)
  { f: 1292, x: 1555, y: 490, size: 235, pose: 'cheer', expression: 'rescued', reachProgress: 0, arc: 50 },
  { f: 1318, x: 1575, y: 505, size: 245, pose: 'star', expression: 'idea', reachProgress: 0, bubble: '三端通用 · 免配环境！' },
  { f: 1374, x: 1575, y: 505, size: 245, pose: 'star', expression: 'idea', reachProgress: 0 },

  // ================= SCENE 6: OPEN-SOURCE PLAYERS & ECOSYSTEM =================
  // ================= SCENE 6: ECOSYSTEM (MUSICFREE -> LX MUSIC -> LISTEN 1 -> API) =================
  // 依次在 MusicFree、LX Music、BBPlayer 卡片间欢快跳动引导，落地轻微弹性缓震
  { f: 1404, x: 585, y: 565, size: 175, pose: 'guide', expression: 'happy', pointDir: 'left', reachProgress: 0, arc: 180 },
  { f: 1438, x: 585, y: 565, size: 175, pose: 'guide', expression: 'happy', pointDir: 'left', reachProgress: 0 },
  { f: 1462, x: 1150, y: 565, size: 175, pose: 'cheer', expression: 'wink', reachProgress: 0, arc: 140 },
  { f: 1484, x: 1150, y: 565, size: 175, pose: 'cheer', expression: 'wink', reachProgress: 0 },
  { f: 1506, x: 1715, y: 565, size: 175, pose: 'star', expression: 'proud', reachProgress: 0, arc: 140 },
  { f: 1524, x: 1715, y: 565, size: 175, pose: 'star', expression: 'proud', reachProgress: 0 },
  // 1538 纵身跃入下方 Public API 开发者卡片：欢呼庆祝并引发金色礼花绽放！
  { f: 1538, x: 1000, y: 835, size: 175, pose: 'cheer', expression: 'rescued', reachProgress: 0, arc: 140, bubble: '开放 API，免注册即用！' },
  { f: 1572, x: 1000, y: 835, size: 175, pose: 'cheer', expression: 'rescued', reachProgress: 0 },

  // ================= SCENE 7: GRAND BRAND FINALE =================
  // 压轴舞台定格：破笼欢呼与金色四角星眨眼闪耀 -> 招招手表示再见！
  { f: 1598, x: 1465, y: 520, size: 295, pose: 'star', expression: 'rescued', reachProgress: 0, arc: 190 },
  { f: 1656, x: 1465, y: 520, size: 295, pose: 'star', expression: 'rescued', reachProgress: 0 },
  // 1668 ~ 1740 招手道别：右手欢快左右挥舞招手，气泡框显示「歌单自由啦，下次见！」
  { f: 1668, x: 1465, y: 515, size: 300, pose: 'wave', expression: 'happy', reachProgress: 0, bubble: '歌单自由啦，下次见！' },
  { f: 1740, x: 1465, y: 515, size: 300, pose: 'wave', expression: 'happy', reachProgress: 0, bubble: '歌单自由啦，下次见！' },
];

/**
 * 音乐律动动力学
 * 120 BPM: 15 帧一拍 (30 FPS)
 * - 鼓点瞬间 (0-1 帧)：轻微抽一下立马复原 (微幅压扁并回弹，幅度极其和缓，无大幅抽搐，无闪烁)
 * - 其余时间平稳自然，彻底消除夸张乱蹦与突兀形变
 */
function getMemeBeatPhysics(
  frame: number,
  isJumping: boolean,
  isTrapped: boolean,
  _isPressing: boolean,
  _isLaptop: boolean
) {
  // 落地瞬间缓震 (Landing Squash): 破笼着陆 (180)、生态跳跃与压轴着陆瞬间前 2-3 帧微幅弹性下压弹起
  const landingFrames = [180, 1404, 1462, 1506, 1538, 1598];
  for (const lf of landingFrames) {
    if (frame >= lf && frame <= lf + 2) {
      const ls = frame === lf ? 1.14 : frame === lf + 1 ? 1.07 : 0.98;
      return {
        beatBounceY: 0,
        drumJitterY: frame === lf ? 1.8 : 0,
        squash: ls,
        tilt: 0,
        shiverX: 0,
      };
    }
  }

  const bFrame = frame % 15;

  // 1. 关笼受困状态 (微弱恐惧微颤，无欢快鼓点弹跳)
  if (isTrapped) {
    const shiver = Math.sin(frame * 1.5) * 0.8;
    return {
      beatBounceY: 0,
      drumJitterY: 0,
      squash: 1.0,
      tilt: 0,
      shiverX: shiver,
    };
  }

  // 2. 抛物线大跳中 (平滑过渡)
  if (isJumping) {
    return {
      beatBounceY: 0,
      drumJitterY: 0,
      squash: 1.0,
      tilt: 0,
      shiverX: 0,
    };
  }

  // 3. 压轴定格优雅收官 (52.0s / 1560 帧之后)：音乐鼓点已全部停歇，彻底停止随鼓点一抖一抖！
  if (frame >= 1560) {
    return {
      beatBounceY: 0,
      drumJitterY: 0,
      squash: 1.0,
      tilt: 0,
      shiverX: 0,
    };
  }

  // 4. 常规欢快自由状态 (180 ~ 1560 帧)：紧随 120 BPM 鼓点 (Kick / Snare) 踩准弹性下压回弹律动
  let drumSquash = 1.0;
  let drumJitterY = 0;

  if (bFrame === 0) {
    // 鼓点落下 (Kick / Snare)：下沉压扁
    drumSquash = 1.06;
    drumJitterY = 1.6;
  } else if (bFrame === 1) {
    // 瞬间微弹回位
    drumSquash = 0.96;
    drumJitterY = -1.2;
  } else if (bFrame === 2) {
    drumSquash = 0.99;
    drumJitterY = -0.4;
  }

  return {
    beatBounceY: 0,
    drumJitterY,
    squash: drumSquash,
    tilt: 0,
    shiverX: 0,
  };
}

export const MascotDirector: React.FC = () => {
  const frame = useCurrentFrame();

  let prev = WAYPOINTS[0];
  let next = WAYPOINTS[0];
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    if (frame >= WAYPOINTS[i].f && frame <= WAYPOINTS[i + 1].f) {
      prev = WAYPOINTS[i];
      next = WAYPOINTS[i + 1];
      break;
    }
  }
  if (frame > WAYPOINTS[WAYPOINTS.length - 1].f) {
    prev = WAYPOINTS[WAYPOINTS.length - 1];
    next = prev;
  }

  const span = Math.max(1, next.f - prev.f);
  const rawT = prev === next ? 1 : (frame - prev.f) / span;
  const isLinear = Boolean(prev.linear || next.linear);
  const smoothT = isLinear
    ? Math.max(0, Math.min(1, rawT))
    : Easing.inOut(Easing.cubic)(Math.max(0, Math.min(1, rawT)));

  // 平滑轨迹坐标（气泡框直接挂载于此，100% 杜绝任何抖动）
  let x = prev.x + (next.x - prev.x) * smoothT;
  let y = prev.y + (next.y - prev.y) * smoothT;
  const size = prev.size + (next.size - prev.size) * smoothT;

  const arcHeight = next.arc ?? 0;
  const jumpParabola = arcHeight > 0 ? 4 * rawT * (1 - rawT) : 0;
  y -= arcHeight * jumpParabola;

  const isJumping = arcHeight > 0 && rawT > 0.05 && rawT < 0.95;
  const isTrapped = (rawT < 0.5 ? prev.pose : next.pose) === 'trapped' || frame < 135;
  const isPressing = (rawT < 0.5 ? prev.pose : next.pose) === 'press';
  const isLaptop = (rawT < 0.5 ? prev.pose : next.pose) === 'laptop';

  // 计算音乐律动与表情包挤压拉伸
  const { beatBounceY, drumJitterY, squash: beatSquash, tilt: beatTilt, shiverX } =
    getMemeBeatPhysics(frame, isJumping, isTrapped, isPressing, isLaptop);

  // 大跳跃起降温和微变
  let jumpSquash = 1.0;
  if (arcHeight > 0) {
    if (rawT < 0.14) {
      jumpSquash = 1.06; // 起跳轻微蓄力
    } else if (rawT < 0.84) {
      jumpSquash = 0.95; // 空中温和拉伸
    } else {
      jumpSquash = 1.06; // 落地轻微受压
    }
  }

  const dx = next.x - prev.x;
  const jumpTilt = isJumping
    ? Math.max(-14, Math.min(14, (dx / 400) * 10 * Math.sin(rawT * Math.PI)))
    : 0;

  const totalTilt = isJumping ? jumpTilt : beatTilt;
  const totalSquash = isJumping ? jumpSquash : beatSquash;

  const activePose = rawT < 0.5 ? prev.pose : next.pose;
  const activeExpr = rawT < 0.5 ? prev.expression : next.expression;
  const activePointDir = rawT < 0.5 ? prev.pointDir : next.pointDir;
  const activeReachDir: ReachDirection = (rawT < 0.5 ? prev.reachDir : next.reachDir) ?? 'none';
  const activeReachTarget = rawT < 0.5 ? prev.reachTarget ?? next.reachTarget : next.reachTarget ?? prev.reachTarget;

  // 计算手部伸展进度 (reachProgress: 0 为自然垂落收好，1 为完全伸向目标按钮)
  const prevP = prev.reachProgress ?? (prev.reachTarget ? 1 : 0);
  const nextP = next.reachProgress ?? (next.reachTarget ? 1 : 0);
  let activeReachProgress = prevP + (nextP - prevP) * smoothT;

  // 核心细节红线：在跑动或腾空大跳移动过程中，手绝对不伸出，保持自然移动摆臂/跳跃姿态；只有到达指定目标后才伸手按压！
  if (isJumping || activePose === 'run') {
    activeReachProgress = 0;
  }

  const activeIsContact = Boolean(
    (rawT < 0.5 ? prev.isContact : next.isContact) && activeReachProgress >= 0.75
  );
  const activeFlipX = Boolean(rawT < 0.5 ? prev.flipX : next.flipX);
  const activeBubble = rawT < 0.45 ? prev.bubble : next.bubble;

  const bubbleOnLeft = x > 1380;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 850,
      }}
    >
      {/* 空中跳跃飘落的小音符星芒 */}
      {isJumping && arcHeight >= 130 ? (
        <div
          style={{
            position: 'absolute',
            left: prev.x + (next.x - prev.x) * Math.max(0, rawT - 0.18) - 20,
            top: prev.y + (next.y - prev.y) * Math.max(0, rawT - 0.18) - arcHeight * 0.65,
            fontFamily: F.display,
            fontSize: 38,
            color: '#8AC5E6',
            opacity: 0.75,
            transform: 'rotate(-12deg)',
          }}
        >
          ♪ ✦
        </div>
      ) : null}

      {/* 落地瞬间脚底纸质烟尘微波纹 */}
      {[180, 1404, 1462, 1506, 1538, 1598].some((lf) => frame >= lf && frame <= lf + 4) && (
        <div
          style={{
            position: 'absolute',
            left: x - 45,
            top: y + size * 0.44,
            width: 90,
            height: 24,
            pointerEvents: 'none',
            zIndex: 840,
          }}
        >
          <svg width="90" height="24" viewBox="-45 -12 90 24" style={{ overflow: 'visible' }}>
            <ellipse cx={0} cy={0} rx={36} ry={7} fill="none" stroke={C.ink} strokeWidth={2.4} strokeDasharray="6 4" opacity={0.65} />
            <path d="M -30 -1 Q -38 -6 -44 -3" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.7} />
            <path d="M 30 -1 Q 38 -6 44 -3" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.7} />
          </svg>
        </div>
      )}

      {/* 吉祥物主体包裹层：响应音乐鼓点下压回弹、表情包拉伸跳动与微颤 */}
      <div
        style={{
          position: 'absolute',
          left: x - size / 2 + shiverX,
          top: y - size * 0.57 + beatBounceY + drumJitterY,
          width: size,
          height: size * 1.15,
          transformOrigin: '50% 90%',
          transform: `rotate(${totalTilt}deg)`,
        }}
      >
        <CloudNoteMascot
          size={size}
          frame={frame}
          pose={activePose}
          expression={activeExpr}
          pointDir={activePointDir}
          reachDir={activeReachDir}
          reachTarget={activeReachTarget}
          reachProgress={activeReachProgress}
          jitterX={shiverX}
          jitterY={beatBounceY + drumJitterY}
          isContact={activeIsContact}
          rotation={0}
          squash={totalSquash}
          inAir={jumpParabola}
          flipX={activeFlipX}
        />
      </div>

      {/* 气泡对话框：彻底独立于鼓点抖动与跳动层，基准锚定于平滑轨迹，零抖动！ */}
      {activeBubble ? (
        <div
          style={{
            position: 'absolute',
            left: activePose === 'laptop' ? x + 24 : bubbleOnLeft ? x - size * 0.52 : x + size * 0.52,
            top: activePose === 'laptop' ? y - size * 0.57 + 38 : Math.max(108, y - size * 0.57 - 40),
            transform: activePose === 'laptop' ? 'translate(-50%, -100%) rotate(1deg)' : bubbleOnLeft ? 'translateX(-100%) rotate(-2.5deg)' : 'rotate(2.5deg)',
            padding: '7px 16px',
            borderRadius: activePose === 'laptop' ? '16px 16px 16px 16px' : '16px 16px 16px 4px',
            backgroundColor: C.paperWhite,
            border: `3px solid ${C.ink}`,
            boxShadow: '4px 4px 0 #2d3436',
            fontFamily: F.kuaile,
            fontSize: 23,
            color: C.ink,
            whiteSpace: 'nowrap',
            zIndex: 860,
          }}
        >
          {activeBubble}
        </div>
      ) : null}
    </div>
  );
};
