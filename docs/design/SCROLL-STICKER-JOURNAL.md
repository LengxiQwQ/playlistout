# 「越往下越热闹」滚动贴纸手帐：可执行改版规范

> 本文是给 AI Agent（和人类开发者）的**完整施工图**。照着从第 0 节读到第 12 节，按第 11 节的任务清单逐项执行，不需要再猜任何颜色、时长、布局或实现方式。
>
> 适用范围：`web/`（React 18 + Vite + TS）。不涉及 Worker、CLI、插件。

---

## 0. 一句话目标与体验剧本

**一句话**：首屏极简干净；用户往下滚动，便签、卡带、邮票、数据卡**一张张「贴」上本子**，越往下装饰越多、动画越丰富，到统计区达到高潮，最后在页脚安静地「合上本子」。

**体验剧本（用户视角）**：

| 幕 | 区域 | 用户看到的 | 热闹程度 |
|---|---|---|---|
| 第 0 幕 · 翻开本子 | Header、Hero、SearchNote | 只有标题、搜索卡、两枚贴纸。安静、干净、一眼就知道怎么用 | ★☆☆☆☆ |
| 第 1 幕 · 贴上结果 | ResultPaper / UserPlaylistsPaper（仅解析后出现） | 结果纸「啪」地贴到本子上，胶带随后拉开，前 12 行歌曲依次浮现 | ★★☆☆☆ |
| 第 2 幕 · 卡带上架 | PluginEcosystem | 播放器卡片像卡带一样从侧面滑上架，胶带拉开，「N 款已支持」票根盖章 | ★★★☆☆ |
| 第 3 幕 · 便签扔上来 | InfoNotes | 三张便签从不同方向被「扔」上来，旋转后落定，胶带一条条贴上，周围冒出小贴纸 | ★★★★☆ |
| 第 4 幕 · 数据狂欢（高潮） | StatsJournal + RunningDaysStamp | 数据卡逐张盖章落下，数字滚动计数，柱状图一根根长高，平台进度条依次画出，周围小贴纸弹出、星星闪烁 | ★★★★★ |
| 第 5 幕 · 合上本子 | DeveloperPanel、Footer | 节奏放缓，卡片轻柔浮现，页脚邮票最后「盖」一下 | ★★☆☆☆ |

> [!IMPORTANT]
> **主流程零阻碍**：第 0 幕的一切（标题、输入框、解析按钮、平台贴纸、示例）**必须在首次渲染时立即可见、可交互**，不得等待任何滚动动画。

---

## 1. 硬性约束（违反任何一条即为不合格）

1. **分支**：从当前 `main` 新建 `design/scroll-sticker-journal`。**不要** `git commit` / `git push`，除非用户明确要求。
2. **不新增 npm 依赖**：禁止引入 framer-motion、GSAP、AOS、lottie 等。只用 **CSS 动画 + 原生 `IntersectionObserver`**。
3. **不改变任何业务行为与文案**：保留所有现有 DOM 文本、`aria-*`、`data-testid`、`id`（如 `ecosystem-title`）、按钮行为。`web/src/**` 的现有 39 个测试套件必须全部保持通过。
4. **只动画 `transform` 和 `opacity`**（以及 `filter: drop-shadow` 的阴影过渡）。禁止动画 `width/height/top/left/margin`，禁止造成布局抖动（CLS）。
5. **隐藏状态不占位变化**：元素在「贴上」之前是透明的，但**始终占据原来的空间**。
6. **无 JS / 测试环境 / 减少动态效果 → 全部内容直接可见**（详见第 4.4 节）。
7. **只播放一次**：每个元素第一次进入视口时播放入场动画，之后保持静止，向上滚回去不再重播。
8. 遵守仓库 `AGENTS.md` 的全部规则（宪法红线、版本、插件边界等），本次改动不得触碰它们。

---

## 2. 色彩规范

### 2.1 色板（已存在于 `web/src/design/tokens.css`，**只引用变量，不要写新的硬编码色值**）

| 角色 | 变量 | 色值 | 用途 |
|---|---|---|---|
| 纸张底色 | `--paper` | `#fdf6ec` | 页面背景 |
| 奶油纸 | `--paper-cream` / `--paper-white` | `#fffaf2` / `#fffdf8` | 卡片底 |
| 墨水 | `--ink` | `#5a4a42` | 正文、标题 |
| 浅墨 | `--ink-light` / `--ink-muted` | `#8a7569` / `#a8968b` | 次要文字 |
| 描边 | `--ink-line` | `#6e5a50` | 手绘边框 |
| 主按钮 | `--btn-primary-bg` | `#ec7f9f` | 解析、官网下载 |
| 草莓 | `--mac-strawberry` / `--accent-strawberry` | `#ffd6e0` / `#e8789a` | |
| 蜜桃 | `--mac-peach` / `--accent-peach` | `#ffdcc7` / `#ee9a6c` | |
| 柠檬 | `--mac-lemon` / `--accent-lemon` | `#fff1b8` / `#e3b23c` | |
| 薄荷 | `--mac-mint` / `--accent-mint` | `#cdefe3` / `#4fae8a` | |
| 海盐蓝 | `--mac-sky` / `--accent-sky` | `#d4ecff` / `#6a82d4` | |
| 香芋 | `--mac-taro` / `--accent-taro` | `#e3d9ff` / `#9a7fd8` | |
| 抹茶 | `--mac-matcha` | `#e2f2c9` | |
| 投影 | `--shadow-ink` | `rgba(150,112,92,.3)` | 所有投影 |

### 2.2 「色彩随滚动渐丰富」规则

颜色和动画一样要**越往下越多**。每一幕允许使用的**马卡龙填充色数量**：

| 幕 | 允许的填充色 | 说明 |
|---|---|---|
| 第 0 幕 | 柠檬（搜索卡）+ 草莓（按钮/胶带）+ 平台贴纸原色 | 保持现状，**不再增加** |
| 第 1 幕 | + 奶油白 | 结果纸以奶油白为主，色彩靠封面和标签 |
| 第 2 幕 | + 薄荷、香芋、海盐蓝 | 播放器卡片循环这三色 |
| 第 3 幕 | + 蜜桃 | 便签：柠檬 / 草莓 / 薄荷，点缀蜜桃贴纸 |
| 第 4 幕 | **全部 7 色** | 柱状图、贴纸、进度条全色循环 |
| 第 5 幕 | 回落为奶油白 + 4 色淡彩卡 | 收尾安静 |

### 2.3 新增 token（加到 `tokens.css` 末尾的 `:root` 中）

```css
  /* Scroll-reveal motion tokens */
  --reveal-duration: 650ms;
  --reveal-duration-fast: 420ms;
  --reveal-stagger: 90ms;
  --reveal-distance: 28px;
  --reveal-lift-shadow: 10px 16px 0 rgba(150, 112, 92, 0.18);
  --font-num: 'Caveat', 'ZCOOL KuaiLe', 'Noto Sans SC', cursive;
```

---

## 3. 字体与按钮统一（与动画一起做，属于 P0）

### 3.1 字体分工

| 场景 | 字体类 / 变量 | 规则 |
|---|---|---|
| 大标题（Hero、各区 h2） | `.font-marker`（`--font-marker`） | 保持现状 |
| 短标签、批注、徽章（≤ 20 字） | `.font-handwriting` / `.font-note` | 保持现状 |
| **长段落（> 40 字）** | `--font-sans` | 插件说明 `.plugin-app-summary`、开发者卡片正文改用 `font-family: var(--font-sans)`，字号 `0.95rem`，行高 `1.75` |
| **统计数字** | `--font-num`（新增） | 见 3.2 |

### 3.2 统计数字「方框」问题（必须修复）

现象：`StatsJournal.tsx` 中数字 `0` 在 `ZCOOL KuaiLe` 下渲染成近似方框的形状（截图中显示为 `▯`），用户会误以为是乱码。

修复：在 `StatsJournal.tsx` 中，所有包裹 `<AnimatedCounter />` 的 `div.font-marker` 增加 `style.fontFamily = 'var(--font-num)'`，并加 `fontVariantNumeric: 'tabular-nums'`，防止计数滚动时宽度跳动。`RunningDaysStamp` 与 `.plugin-supported-number` 同样处理。

验收：在浏览器中把统计值都为 0 时截图，数字 `0` 清晰可辨。

### 3.3 按钮统一为「软边马卡龙」

头部（`.header-github-btn`、`.header-desktop-btn`、字体/语言切换）和页脚按钮目前是「深色粗边 + 硬投影」，与整体风格冲突。统一为：

```css
border: 1.5px solid var(--ink-line);
border-radius: 10px;
box-shadow: 2px 3px 0 var(--shadow-ink);
background: <对应马卡龙填充色>;
transition: transform 180ms var(--ease-bouncy), box-shadow 180ms ease;
/* hover */ transform: translateY(-2px) rotate(-1deg); box-shadow: 3px 5px 0 var(--shadow-ink);
/* active */ transform: translateY(1px); box-shadow: 1px 1px 0 var(--shadow-ink);
```

页脚 5 个按钮依次使用：薄荷、柠檬、草莓、海盐蓝、香芋。

### 3.4 静止状态下的倾斜规则

- **承载数据或长文的大卡片**（结果纸、统计卡、开发者卡、播放器卡）：静止旋转角 `|rot| ≤ 0.6deg`。现有统计三卡的较大倾斜要收小。
- **便签、贴纸、胶带、邮票**：可以 `±2deg ~ ±8deg`。
- 动画过程中可以有更大的旋转，**落定后**回到上述角度。

---

## 4. 技术实现：Reveal 系统

### 4.1 文件清单

| 文件 | 操作 | 作用 |
|---|---|---|
| `web/src/motion/revealEnv.ts` | 新建 | 判断是否启用滚动动画，并给 `<html>` 加 `has-reveal` 类 |
| `web/src/hooks/useReveal.ts` | 新建 | 共享 IntersectionObserver 的 hook |
| `web/src/components/motion/Reveal.tsx` | 新建 | 包裹组件 |
| `web/src/design/reveal.css` | 新建 | 所有入场动画样式 |
| `web/src/hooks/useReveal.test.ts` | 新建 | 单元测试 |
| `web/src/main.tsx` | 修改 | 在 `createRoot` 之前调用 `initRevealEnv()` |
| `web/src/index.css` | 修改 | `@import './design/reveal.css';`（放在 `motion.css` 之后） |

### 4.2 `web/src/motion/revealEnv.ts`

```ts
let enabled: boolean | null = null;

export function isRevealEnabled(): boolean {
  if (enabled !== null) return enabled;
  if (typeof window === 'undefined' || typeof document === 'undefined') return (enabled = false);
  if ((import.meta as any).env?.MODE === 'test') return (enabled = false);
  if (typeof window.IntersectionObserver !== 'function') return (enabled = false);
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return (enabled = false);
  return (enabled = true);
}

/** Call once in main.tsx before React renders. */
export function initRevealEnv(): void {
  if (isRevealEnabled()) document.documentElement.classList.add('has-reveal');
}

/** Test helper only. */
export function __resetRevealEnvForTests(): void {
  enabled = null;
}
```

### 4.3 `web/src/hooks/useReveal.ts`

```ts
import { useEffect, useRef, useState } from 'react';
import { isRevealEnabled } from '../motion/revealEnv';

type Callback = (visible: boolean) => void;
const callbacks = new WeakMap<Element, Callback>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          callbacks.get(entry.target)?.(true);
          observer!.unobserve(entry.target);
          callbacks.delete(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  );
  return observer;
}

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(() => !isRevealEnabled());

  useEffect(() => {
    const el = ref.current;
    if (!el || revealed) return;
    // Keyboard users: reveal immediately if focus lands inside a hidden block.
    const onFocus = () => setRevealed(true);
    el.addEventListener('focusin', onFocus);
    callbacks.set(el, () => setRevealed(true));
    getObserver().observe(el);
    return () => {
      el.removeEventListener('focusin', onFocus);
      observer?.unobserve(el);
      callbacks.delete(el);
    };
  }, [revealed]);

  return { ref, revealed };
}
```

### 4.4 `web/src/components/motion/Reveal.tsx`

```tsx
import React from 'react';
import { useReveal } from '../../hooks/useReveal';

export type RevealEffect =
  | 'fade-up' | 'stick' | 'toss-left' | 'toss-right' | 'slide-shelf'
  | 'stamp' | 'pop' | 'grow-bar' | 'draw-line' | 'tape';

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: keyof JSX.IntrinsicElements;
  effect?: RevealEffect;
  /** ms, added to stagger */
  delay?: number;
  /** settled rotation in deg */
  rot?: number;
  /** when true, direct children with [data-reveal-item] are staggered */
  stagger?: boolean;
  children: React.ReactNode;
}

export const Reveal: React.FC<RevealProps> = ({
  as = 'div', effect = 'fade-up', delay = 0, rot = 0, stagger = false,
  className = '', style, children, ...rest
}) => {
  const { ref, revealed } = useReveal<HTMLElement>();
  const Tag = as as any;
  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`.trim()}
      data-reveal={effect}
      data-revealed={revealed ? 'true' : 'false'}
      data-reveal-stagger={stagger ? 'true' : undefined}
      style={{ ...style, '--reveal-delay': `${delay}ms`, '--rot': `${rot}deg` } as React.CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
```

**子元素逐个出现**：在 `stagger` 容器内，给每个子元素加 `data-reveal-item` 和 `style={{ '--i': index }}`，CSS 自动按 `--i × --reveal-stagger` 延迟。

> [!IMPORTANT]
> 不要用 `Reveal` 包裹带有 `id` 并被测试 / `scrollIntoView` 引用的元素时改变其 id 归属。如果原元素有 `id`、`aria-labelledby`、`className` 供测试查询，**把 `Reveal` 放在外层**，原元素保持不变。

### 4.5 `web/src/design/reveal.css`（完整实现）

```css
/* ============ Scroll Sticker Journal: reveal system ============ */
/* Hidden state ONLY when JS enabled the system. No JS / tests / reduced motion => visible. */

.has-reveal .reveal[data-revealed='false'],
.has-reveal [data-reveal-stagger='true'][data-revealed='false'] > [data-reveal-item] {
  opacity: 0;
}

.has-reveal .reveal[data-revealed='true'] {
  animation-duration: var(--reveal-duration);
  animation-delay: var(--reveal-delay, 0ms);
  animation-fill-mode: both;
  animation-timing-function: var(--ease-journal);
}

/* Staggered children */
.has-reveal [data-reveal-stagger='true'][data-revealed='true'] > [data-reveal-item] {
  animation: revealStick var(--reveal-duration) var(--ease-bouncy) both;
  animation-delay: calc(var(--reveal-delay, 0ms) + var(--i, 0) * var(--reveal-stagger));
}
/* The container itself just fades in when staggering */
.has-reveal [data-reveal-stagger='true'][data-revealed='true'] { animation-name: revealFade; }

/* ---- Effect mapping ---- */
.has-reveal .reveal[data-revealed='true'][data-reveal='fade-up']     { animation-name: revealFadeUp; }
.has-reveal .reveal[data-revealed='true'][data-reveal='stick']       { animation-name: revealStick; animation-timing-function: var(--ease-bouncy); }
.has-reveal .reveal[data-revealed='true'][data-reveal='toss-left']   { animation-name: revealTossLeft; animation-timing-function: var(--ease-bouncy); }
.has-reveal .reveal[data-revealed='true'][data-reveal='toss-right']  { animation-name: revealTossRight; animation-timing-function: var(--ease-bouncy); }
.has-reveal .reveal[data-revealed='true'][data-reveal='slide-shelf'] { animation-name: revealSlideShelf; }
.has-reveal .reveal[data-revealed='true'][data-reveal='stamp']       { animation-name: revealStamp; animation-duration: 480ms; }
.has-reveal .reveal[data-revealed='true'][data-reveal='pop']         { animation-name: revealPop; animation-duration: var(--reveal-duration-fast); animation-timing-function: var(--ease-bouncy); }
.has-reveal .reveal[data-revealed='true'][data-reveal='tape']        { animation-name: revealTape; animation-duration: 380ms; transform-origin: left center; }
.has-reveal .reveal[data-revealed='true'][data-reveal='draw-line']   { animation-name: revealDrawLine; animation-duration: 800ms; transform-origin: left center; }
.has-reveal .reveal[data-revealed='true'][data-reveal='grow-bar']    { animation-name: revealGrowBar; animation-duration: 700ms; transform-origin: bottom center; }

/* ---- Keyframes ---- */
@keyframes revealFade { from { opacity: 0; } to { opacity: 1; } }

@keyframes revealFadeUp {
  from { opacity: 0; transform: translateY(var(--reveal-distance)) rotate(var(--rot, 0deg)); }
  to   { opacity: 1; transform: translateY(0) rotate(var(--rot, 0deg)); }
}

/* 贴上：从上方略大、带大投影 => 落到纸面，阴影收紧 */
@keyframes revealStick {
  0%   { opacity: 0; transform: translateY(calc(var(--reveal-distance) * -1)) rotate(calc(var(--rot, 0deg) - 5deg)) scale(1.05); filter: drop-shadow(10px 16px 0 rgba(150,112,92,.18)); }
  60%  { opacity: 1; transform: translateY(3px) rotate(calc(var(--rot, 0deg) + 0.8deg)) scale(0.995); filter: drop-shadow(3px 4px 0 rgba(150,112,92,.2)); }
  100% { opacity: 1; transform: translateY(0) rotate(var(--rot, 0deg)) scale(1); filter: none; }
}

/* 扔上：从侧下方旋转飞入后落定 */
@keyframes revealTossLeft {
  0%   { opacity: 0; transform: translate(-70px, 50px) rotate(calc(var(--rot, 0deg) - 14deg)) scale(0.92); }
  70%  { opacity: 1; transform: translate(4px, -4px) rotate(calc(var(--rot, 0deg) + 2deg)) scale(1.01); }
  100% { opacity: 1; transform: translate(0, 0) rotate(var(--rot, 0deg)) scale(1); }
}
@keyframes revealTossRight {
  0%   { opacity: 0; transform: translate(70px, 50px) rotate(calc(var(--rot, 0deg) + 14deg)) scale(0.92); }
  70%  { opacity: 1; transform: translate(-4px, -4px) rotate(calc(var(--rot, 0deg) - 2deg)) scale(1.01); }
  100% { opacity: 1; transform: translate(0, 0) rotate(var(--rot, 0deg)) scale(1); }
}

/* 卡带上架：从右侧滑入，末端轻微回弹 */
@keyframes revealSlideShelf {
  0%   { opacity: 0; transform: translateX(60px) rotate(var(--rot, 0deg)); }
  80%  { opacity: 1; transform: translateX(-4px) rotate(var(--rot, 0deg)); }
  100% { opacity: 1; transform: translateX(0) rotate(var(--rot, 0deg)); }
}

/* 盖章：从大到小砸下，略微压扁再回弹 */
@keyframes revealStamp {
  0%   { opacity: 0; transform: scale(1.7) rotate(calc(var(--rot, 0deg) - 10deg)); }
  55%  { opacity: 1; transform: scale(0.94) rotate(var(--rot, 0deg)); }
  75%  { transform: scale(1.03) rotate(var(--rot, 0deg)); }
  100% { opacity: 1; transform: scale(1) rotate(var(--rot, 0deg)); }
}

/* 弹出贴纸 */
@keyframes revealPop {
  0%   { opacity: 0; transform: scale(0) rotate(calc(var(--rot, 0deg) - 30deg)); }
  70%  { opacity: 1; transform: scale(1.18) rotate(calc(var(--rot, 0deg) + 6deg)); }
  100% { opacity: 1; transform: scale(1) rotate(var(--rot, 0deg)); }
}

/* 胶带拉开 */
@keyframes revealTape {
  from { opacity: 0; transform: scaleX(0) rotate(var(--rot, 0deg)); }
  to   { opacity: 1; transform: scaleX(1) rotate(var(--rot, 0deg)); }
}

/* 荧光笔划线 */
@keyframes revealDrawLine {
  from { opacity: 1; transform: scaleX(0); }
  to   { opacity: 1; transform: scaleX(1); }
}

/* 柱子长高 */
@keyframes revealGrowBar {
  from { opacity: 1; transform: scaleY(0); }
  to   { opacity: 1; transform: scaleY(1); }
}

/* ---- Mobile: smaller distances, no sideways toss (prevents horizontal overflow) ---- */
@media (max-width: 768px) {
  :root { --reveal-distance: 16px; --reveal-stagger: 70ms; --reveal-duration: 520ms; }
  .has-reveal .reveal[data-revealed='true'][data-reveal='toss-left'],
  .has-reveal .reveal[data-revealed='true'][data-reveal='toss-right'],
  .has-reveal .reveal[data-revealed='true'][data-reveal='slide-shelf'] { animation-name: revealStick; }
}

/* ---- Safety net ---- */
@media (prefers-reduced-motion: reduce) {
  .has-reveal .reveal, .has-reveal [data-reveal-item] { opacity: 1 !important; animation: none !important; }
}
```

> [!NOTE]
> 父容器若可能被 `toss` / `slide-shelf` 撑出横向滚动条，在对应 section 上加 `overflow-x: clip;`（不要用 `overflow: hidden`，会裁掉胶带和贴纸的阴影）。

### 4.6 「挂起中」的持续动画规则

现有的循环动画（`.stationery-sticker` 漂浮、`.note-sparkle` 闪烁、`.platform-progress-fill` 进度条）**必须等所在区块被「贴上」之后再开始**，否则用户滚到时进度条早已画完：

```css
.has-reveal .reveal[data-revealed='false'] .platform-progress-fill,
.has-reveal .reveal[data-revealed='false'] .stationery-sticker,
.has-reveal .reveal[data-revealed='false'] .note-sparkle {
  animation-play-state: paused;
}
```

---

## 5. 「贴纸密度曲线」：每一幕加多少装饰

装饰必须**随滚动递增**。下表是每一幕允许的「装饰物」数量上限（桌面端；移动端减半，向下取整，最少 0）：

| 幕 | 装饰物数量 | 具体装饰 | 入场效果 |
|---|---|---|---|
| 第 0 幕 | **2** | 左侧磁带贴纸、右侧黑胶贴纸（保留现有位置 `top: 185px` / `215px`）。**删除**首屏区域的其余贴纸（`sweet mix` 标签、星星、首屏胶带角贴保留在搜索卡上的那两条胶带不算装饰物） | 页面加载时 `pop`，延迟 300ms / 450ms |
| 第 1 幕 | 1 | 结果纸右上角一颗四角星 | `pop`，延迟 = 结果纸入场后 400ms |
| 第 2 幕 | 3 | 区块左上香芋胶带、右侧小音符贴纸、「N 款已支持」票根 | 胶带 `tape`，音符 `pop`，票根 `stamp` |
| 第 3 幕 | 5 | 三张便签各自的胶带（3）、樱花贴纸、`favorited` 标签 | 胶带 `tape`，其余 `pop` |
| 第 4 幕 | **8** | `chill vibes` 标签、耳机贴纸、星星 ×2、音符 ×2、绿色胶带角贴、80¢ 邮票贴纸 | 全部 `pop`，按 `--i` 错开 120ms，**在数据卡全部落定之后**才开始 |
| 第 5 幕 | 2 | `END OF PAGE` 两侧星星、页脚 logo 小邮票 | `fade-up` |

**实现要求**：把 `BackgroundDecorations.tsx` 中**跟随某个区块的贴纸**移到对应区块组件内部（相对该区块 `position: absolute`），这样它们能和区块一起被 `Reveal` 控制，而不是用整页百分比 `top` 定位。`BackgroundDecorations.tsx` 最终只保留第 0 幕的两枚贴纸和点阵/光晕背景层。

---

## 6. 分区施工说明

> 以下「延迟」均为该元素自身进入视口后相对的毫秒数。`rot` 是落定后的静止角度。

### 6.1 第 0 幕：Header + Hero + SearchNote（`Header.tsx`、`Hero.tsx`、`SearchNote.tsx`）

**布局**：保持现有结构（居中标题 + 搜索卡），不改宽度 `--search-note-width: 980px`。

**动画**（首屏**不使用** `Reveal` 滚动触发，而是页面加载即播放，因为它们一开始就在视口内）：

| 元素 | 效果 | 时长 | 延迟 |
|---|---|---|---|
| 标题「把你的歌单带走」 | `fade-up` | 500ms | 0 |
| 标题下荧光笔划线 `.scribble-line::after` | `draw-line`（scaleX 0→1） | 800ms | 250ms |
| 「无需注册 · 干净清爽 :)」批注 | 保持现有 `mc-splash` 动画 | — | — |
| 搜索卡 | `fade-up`（**不用 stick**，避免输入框晃动） | 450ms | 100ms |
| 两枚贴纸 | `pop` | 420ms | 300 / 450ms |

> [!CAUTION]
> 首屏动画总时长不得超过 **900ms**；输入框与解析按钮在 **0ms** 时就必须可点击（opacity 动画期间也可点击，不要用 `pointer-events: none`）。

**删除/弱化**：首屏的 `解析完毕？↓ 你的结果就在这里` 提示，在 `state === 'idle'` 时**不渲染**（如果有测试依赖这段文本，改为 `opacity: 0.55` 且移到搜索卡下方 `margin-top: 1.5rem`）。

### 6.2 第 1 幕：结果区（`ResultPaper.tsx`、`UserPlaylistsPaper.tsx`、`TrackTable.tsx`）

结果区是**由解析触发**而不是由滚动触发：结果出现时，`usePlaylistParser` 已经会 `scrollToElement` 到结果，所以直接用 mount 动画。

| 元素 | 效果 | 时长 | 延迟 | rot |
|---|---|---|---|---|
| 结果纸整体 `.result-paper-card` | 把现有 `pageUnfoldEntrance` 替换为 `revealStick` | 650ms | 0 | 保持现有 `--rot` |
| 结果纸顶部胶带 | `tape` | 380ms | 350ms | 现有角度 |
| 拍立得封面 | `pop`（scale 从 0.6 起，不从 0 起） | 420ms | 250ms | -2deg |
| 歌曲表前 12 行 `.song-row` | 逐行 `fade-up`，位移 8px | 360ms | 400ms + 行号 × 35ms | 0 |
| 第 13 行以后 | **无动画**（性能） | — | — | — |
| 批量页：每个歌单行（前 10 个） | 逐个 `fade-up` | 360ms | 300ms + i × 50ms | 0 |
| 右上角星星 | `pop` | 420ms | 结果纸落定后 | 12deg |

**重新解析 / 返回合集时**：不重播整张纸的 `stick`，只重播歌曲行的淡入（避免频繁晃动）。实现方式：`ResultPaper` 用 `playlist.id` 作为行动画容器的 `key`，纸张本身不换 key。

### 6.3 第 2 幕：播放器生态（`PluginEcosystem.tsx`、`ecosystem.css`）

**布局调整**：
- 卡片保持纵向列表（数据来自 `/plugins/index.json`，**不得**为具体播放器写分支）。
- 每张卡片说明文字 `.plugin-app-summary` 改为 `--font-sans`，最多显示 **2 行**（`-webkit-line-clamp: 2`），下方加「展开说明 ▾」文字按钮（`font-handwriting`，`--accent-taro` 色），点击后取消 clamp。展开状态用组件内 `useState<Record<string, boolean>>`，不影响其他卡。
  - 注意：若测试断言完整说明文本存在于 DOM，clamp 只是视觉截断，文本仍在 DOM 中，可以通过。
- 卡片填充色按索引循环：`--mac-sky`、`--mac-mint`、`--mac-lemon`、`--mac-taro`（现状若已是这个循环则保持）。

**动画**：

| 元素 | 效果 | 延迟 |
|---|---|---|
| 区块整张纸 `.plugin-ecosystem-panel` | `Reveal effect="stick" rot={-0.3}` | 0 |
| 顶部香芋胶带 | `tape` | 300ms |
| 标题 + 副标题 | `fade-up` | 150ms |
| 「N 款已支持」票根 `.plugin-supported-count` | `stamp`，rot = -4deg | 450ms |
| 每张播放器卡 `.plugin-app-card` | `stagger` 容器 + `slide-shelf`（覆盖默认 stick），`--i` = 索引 | 500ms + i × 120ms |
| 「下一站 BBPlayer 待上线」 | `fade-up` | 最后一张卡之后 +150ms |
| 右侧音符贴纸 | `pop` | 同上 |

对 `slide-shelf` 的 stagger 子项，在 CSS 中补一条：

```css
.has-reveal .plugin-app-grid[data-revealed='true'] > [data-reveal-item] {
  animation-name: revealSlideShelf;
  animation-timing-function: var(--ease-journal);
}
```

### 6.4 第 3 幕：三张便签拼贴（`InfoNotes.tsx`）

**布局调整：从「三等分」改为「错落拼贴」**（桌面 ≥ 1024px）：

```
┌───────────────┐
│ 为什么做这个    │   ┌─────────────┐
│ (柠檬, rot -2°)│   │ 你能得到什么  │
└───────────────┘   │ (草莓, rot 1.5°)│   ┌────────────┐
                    │              │   │ 手帐小贴士   │
                    └─────────────┘   │ (薄荷, rot -1°)│
                                      └────────────┘
```

实现（替换现有 `gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'`）：

```css
.info-notes-section .info-notes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.25rem;
  align-items: start;
}
.info-notes-grid > :nth-child(1) { margin-top: 0; }
.info-notes-grid > :nth-child(2) { margin-top: 2.5rem; }
.info-notes-grid > :nth-child(3) { margin-top: 5rem; }
@media (max-width: 1023px) {
  .info-notes-section .info-notes-grid { grid-template-columns: 1fr; gap: 1.75rem; }
  .info-notes-grid > * { margin-top: 0 !important; }
}
```

便签正文若超过 40 字改用 `--font-sans`；短句保留手写体。

**动画**：

| 元素 | 效果 | 延迟 | rot |
|---|---|---|---|
| 便签 1（柠檬） | `toss-left` | 0 | -2deg |
| 便签 2（草莓） | `stick` | 180ms | 1.5deg |
| 便签 3（薄荷） | `toss-right` | 360ms | -1deg |
| 每张便签的胶带 | `tape` | 对应便签延迟 + 450ms | 现有角度 |
| 樱花贴纸 | `pop` | 900ms | -8deg |
| `favorited` 标签 | `pop` | 1050ms | 6deg |

> 注意：现在每张便签自带 `rotate`。用 `Reveal` 包裹后，**把原来的 rotate 移到 `rot` 属性**，原元素去掉 transform，否则动画结束时角度会叠加。

### 6.5 第 4 幕：数据狂欢（`StatsJournal.tsx`、`RunningDaysStamp.tsx`）——高潮

**布局调整**：
- 标题「Playlist Out 手帐统计」下方加一条荧光笔划线（复用 `.scribble-line`）。
- 三张数据卡保持 3 列，但**静止角度收小**：今日 `-0.6deg`、累计 `0.4deg`、来源 `-0.3deg`。
- 「近 30 天」柱状图卡保持通栏。
- 数字字体按 3.2 节修复。

**动画时间轴（以区块进入视口为 0ms）**：

```
0ms     标题 fade-up
200ms   标题划线 draw-line
300ms   今日卡 stamp（rot -0.6）
480ms   累计卡 stamp（rot 0.4）
660ms   来源卡 stamp（rot -0.3）
        └─ 每张卡落定后，内部 AnimatedCounter 才开始计数（见下）
900ms   来源卡内进度条依次画出：每条 +80ms（复用 .platform-progress-fill，靠 4.6 节的 paused 规则启动）
1000ms  30 天柱状图卡 fade-up
1200ms  柱子逐根 grow-bar：第 n 根延迟 1200 + n × 40ms
1500ms  8 个装饰贴纸逐个 pop：第 i 个延迟 1500 + i × 120ms
```

**计数器联动**：给 `AnimatedCounter` 增加可选 prop `start?: boolean`（默认 `true`，保持现有调用和测试不变）。`start === false` 时显示 `0`（测试环境 `MODE === 'test'` 时依旧直接显示目标值）。`StatsJournal` 中用每张卡的 `useReveal().revealed` 传入，并延迟 400ms 再置为 true（`setTimeout`，记得在 effect cleanup 中 clear）。

**柱状图**：每根柱子包一层 `<span data-reveal-item style={{'--i': n}}>`，柱子容器作为 `Reveal stagger effect="grow-bar"`，并补 CSS：

```css
.has-reveal .stats-trend-bars[data-revealed='true'] > [data-reveal-item] {
  animation: revealGrowBar 700ms var(--ease-bouncy) both;
  animation-delay: calc(200ms + var(--i, 0) * 40ms);
  transform-origin: bottom center;
}
```

（如果现有柱子容器没有 class，新增 `className="stats-trend-bars"`。）

**空状态**：统计全部为 0 时，「来源」卡不显示 6 条 0% 灰条，而是显示一张香芋色小便签：「还在等第一位朋友来访 ✿」（`font-handwriting`，`--accent-taro`），中英文文案加到 i18n 字典里（中文为准，英文 `Waiting for the first visitor ✿`）。

**RunningDaysStamp**：`stamp` 效果，rot = -3deg，延迟 = 区块进入视口后 200ms；落定瞬间在邮票背后加一圈淡草莓色墨晕（伪元素 `::after`，`opacity 0 → 0.35 → 0`，600ms），只播一次。

### 6.6 第 5 幕：合上本子（`DeveloperPanel.tsx`、`developer.css`、`Footer.tsx`）

**节奏放缓**：只用 `fade-up`，不用 toss/stamp。

| 元素 | 效果 | 延迟 |
|---|---|---|
| 开发者大纸 | `fade-up` | 0 |
| 4 张方法卡 | `stagger`，子项用 `fade-up`（覆盖默认 stick） | 200ms + i × 100ms |
| `END OF PAGE` 分隔线 | `draw-line` | 0 |
| 页脚 logo | `fade-up` | 150ms |
| 页脚按钮组 | `stagger` + `fade-up` | 250ms + i × 60ms |

开发者卡片正文改为 `--font-sans`（3.1 节），卡片保持现有 4 色淡彩底。

---

## 7. 移动端规则（≤ 768px）

1. 所有 `toss-*` 和 `slide-shelf` 自动降级为 `stick`（已在 4.5 节 CSS 中实现）。
2. 位移距离 16px、错开 70ms、时长 520ms（已在 CSS 中实现）。
3. 装饰物数量按第 5 节**减半**；第 4 幕的 8 个贴纸只保留 4 个（用 `display: none` 隐藏 `[data-deco-mobile='hide']`）。
4. 每个 stagger 组最多前 **6 个**子项有延迟，之后的子项与第 6 个同时出现：`--i` 取 `Math.min(index, 5)`。
5. InfoNotes 拼贴退化为单列（6.4 节 CSS 已处理）。
6. 禁止出现横向滚动条：`document.documentElement.scrollWidth <= window.innerWidth` 必须成立。

---

## 8. 性能与可访问性

- 同一时刻处于动画中的元素 ≤ 40 个。歌曲表第 13 行之后不动画。
- 不使用 `will-change` 常驻；如确有卡顿，只在 `[data-revealed='true']` 动画期间设置，`animationend` 后移除（可选）。
- 键盘 Tab 聚焦到隐藏区块时立即显示（`useReveal` 已处理 `focusin`）。
- `prefers-reduced-motion: reduce`：系统不加 `has-reveal` 类，内容直接可见；`reveal.css` 里还有一层兜底。
- 动画不得阻塞点击：隐藏期间元素 `opacity: 0` 但仍可交互（不要加 `pointer-events: none` 或 `visibility: hidden`）。
- 首屏 LCP 元素（标题、搜索卡）不得因动画推迟可见：它们的动画从 `opacity: 0` 开始时长 ≤ 500ms。

---

## 9. 测试要求

### 9.1 现有测试

jsdom 没有 `IntersectionObserver`，且 `MODE === 'test'`，因此 `isRevealEnabled()` 返回 `false`，所有内容直接可见，现有 `toBeVisible()` 断言不受影响。**禁止为了让测试通过而修改现有测试的断言**；唯一允许的修改是：因按钮/色值变化而断言具体颜色的测试（参考之前 `SearchNote.test.tsx` 的先例），更新期望色值。

### 9.2 新增 `web/src/hooks/useReveal.test.ts`

至少覆盖：

1. **默认（测试环境）**：`revealed` 初始即为 `true`。
2. **启用时**：用 `vi.stubEnv('MODE', 'development')` + 模拟 `window.IntersectionObserver` + `matchMedia` 返回 `matches: false`，调用 `__resetRevealEnvForTests()`；渲染组件后 `data-revealed="false"`；手动触发 observer 回调 `isIntersecting: true` 后变为 `"true"`，且调用了 `unobserve`。
3. **reduced motion**：`matchMedia` 返回 `matches: true` 时 `revealed` 初始为 `true`。
4. **focusin**：启用状态下对元素内部的按钮 `focus()` 后 `data-revealed="true"`。
5. **AnimatedCounter `start=false`**：在非 test 模式模拟下显示 `0`；测试模式下显示目标值。

每个测试结束 `vi.unstubAllEnvs()`、`vi.unstubAllGlobals()`、`__resetRevealEnvForTests()`。

### 9.3 命令

```powershell
npm --prefix web run typecheck
npm --prefix web test
npm run gate   # 全部完成后跑一次，8 步必须全绿（仅本地验证，不 push）
```

---

## 10. 视觉验收（必须用真实浏览器截图验证）

1. 启动：`npm run dev`（Worker :8787 + Web :5173）。
2. 用无头 Chrome（1440×900 和 390×844 两个视口）在以下滚动位置截图，并**人工查看截图**：

| 截图 | 操作 | 期望 |
|---|---|---|
| `home-0` | 打开首页，等待 1s | 只有标题、搜索卡、两枚贴纸；干净 |
| `home-mid-anim` | 滚动到 PluginEcosystem，**立即**截图（100ms 内） | 能看到卡片正在滑入（半透明/偏移） |
| `home-ecosystem` | 同位置等待 2s | 全部落定，角度正确，无重叠 |
| `home-notes` | 滚到 InfoNotes 等 2s | 三张便签错落排列，胶带都在 |
| `home-stats` | 滚到 StatsJournal 等 3s | 数字清晰（无方框）、柱子长齐、8 枚贴纸出现 |
| `home-footer` | 滚到底等 2s | 按钮为软边马卡龙样式 |
| `single-result` | 点击「快速体验示例 → 汽水音乐示例」，等结果 | 结果纸贴上、前 12 行依次出现 |
| `mobile-*` | 390 宽重复以上 | 无横向滚动条，动画降级正确 |
| `reduced-motion` | 用 `emulateMediaFeatures prefers-reduced-motion: reduce` 打开首页并滚到底 | 所有内容直接可见，无动画 |

3. 用 DevTools Performance 录一次从顶滚到底：不得出现长于 50ms 的 Long Task 由动画引起，CLS = 0。

---

## 11. 任务清单（按顺序执行，每完成一项勾选）

### P0 · 基础与修复
- [ ] 0.1 从 `main` 新建分支 `design/scroll-sticker-journal`
- [ ] 0.2 `tokens.css` 增加第 2.3 节的 token
- [ ] 0.3 修复统计数字方框问题（3.2 节）
- [ ] 0.4 长段落字体改为 `--font-sans`（3.1 节）
- [ ] 0.5 头部 / 页脚按钮统一为软边马卡龙（3.3 节）
- [ ] 0.6 大卡片静止倾斜收小到 `≤ 0.6deg`（3.4 节）
- [ ] 0.7 `typecheck` + `test` 通过

### P1 · Reveal 系统
- [ ] 1.1 新建 `revealEnv.ts`、`useReveal.ts`、`Reveal.tsx`、`reveal.css`（4.2–4.5 节，代码可直接使用）
- [ ] 1.2 `main.tsx` 调用 `initRevealEnv()`；`index.css` 引入 `reveal.css`
- [ ] 1.3 4.6 节「挂起持续动画」规则
- [ ] 1.4 新增 `useReveal.test.ts`（9.2 节）
- [ ] 1.5 `typecheck` + `test` 通过

### P2 · 逐幕施工
- [ ] 2.1 第 0 幕：首屏加载动画 + 删减首屏装饰到 2 枚（6.1 节、第 5 节）
- [ ] 2.2 第 1 幕：结果纸 `stick` + 歌曲行淡入（6.2 节）
- [ ] 2.3 第 2 幕：播放器卡带上架 + 说明折叠（6.3 节）
- [ ] 2.4 第 3 幕：便签拼贴布局 + 扔上动画（6.4 节）
- [ ] 2.5 第 4 幕：统计高潮时间轴 + 计数联动 + 空状态（6.5 节）
- [ ] 2.6 第 5 幕：开发者 + 页脚收尾（6.6 节）
- [ ] 2.7 把跟随区块的贴纸从 `BackgroundDecorations.tsx` 迁入各区块（第 5 节）
- [ ] 2.8 移动端规则（第 7 节）
- [ ] 2.9 每完成一幕：`typecheck` + `test` 通过

### P3 · 验收
- [ ] 3.1 第 10 节全部截图并人工确认
- [ ] 3.2 `npm run gate` 8 步全绿
- [ ] 3.3 向用户提交 Before/After 截图对比，**等待用户确认**，不自行 commit / push

---

## 12. 禁止事项速查

- ❌ 新增动画库或任何 npm 依赖
- ❌ 首屏输入框 / 解析按钮延迟可用
- ❌ 动画 `width`、`height`、`top`、`left`、`margin`
- ❌ 用 `visibility: hidden` / `display: none` / `pointer-events: none` 实现隐藏态
- ❌ 每次滚回去都重播动画
- ❌ 首屏增加装饰物（第 0 幕最多 2 枚）
- ❌ 在 `PluginEcosystem.tsx` 中按具体播放器 ID 写分支
- ❌ 修改现有测试断言来「让测试通过」（色值断言更新除外）
- ❌ 写新的硬编码色值（一律用 `tokens.css` 变量）
- ❌ 未经用户明确要求就 `git commit` / `git push`
