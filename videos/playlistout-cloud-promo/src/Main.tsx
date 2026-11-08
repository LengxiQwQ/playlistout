import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import './global.css';
import { ASSETS } from './assets';
import { MascotActor } from './components/MascotActor';
import { PaperBackground } from './components/PaperBackground';
import { BatchScene } from './scenes/BatchScene';
import { CliScene } from './scenes/CliScene';
import { EcosystemScene } from './scenes/EcosystemScene';
import { ExportScene } from './scenes/ExportScene';
import { FinaleScene } from './scenes/FinaleScene';
import { IntroScene } from './scenes/IntroScene';
import { ParseScene } from './scenes/ParseScene';
import { C, SCENES } from './theme';

const fontDefs = [
  { family: 'MaShan', url: staticFile('fonts/MaShanZheng-Regular.ttf'), weight: '400' },
  { family: 'ZCOOLKuaiLe', url: staticFile('fonts/ZCOOLKuaiLe-Regular.ttf'), weight: '400' },
  { family: 'NotoSansSC', url: staticFile('fonts/NotoSansSC-VF.ttf'), weight: '100 900' },
  { family: 'Caveat', url: staticFile('fonts/Caveat-Variable.ttf'), weight: '400 700' },
  { family: 'SpaceMono', url: staticFile('fonts/SpaceMono-Regular.ttf'), weight: '400' },
  { family: 'SpaceMono', url: staticFile('fonts/SpaceMono-Bold.ttf'), weight: '700' },
  { family: 'PermanentMarker', url: staticFile('fonts/PermanentMarker-Regular.ttf'), weight: '400' },
];

const loadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });

const waitForAssets = async () => {
  if (typeof document === 'undefined') return;
  await Promise.all(
    fontDefs.map(async (def) => {
      const face = new FontFace(def.family, `url(${def.url})`, {
        weight: def.weight,
        style: 'normal',
      });
      await face.load();
      document.fonts.add(face);
    }),
  );
  await Promise.all([
    document.fonts.ready.catch(() => undefined),
    loadImage(ASSETS.logo512),
    loadImage(ASSETS.logo128),
    loadImage(ASSETS.grain),
    loadImage(ASSETS.creases),
  ]);
};

export const Main: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('Preloading Playlist Out Cloud Film fonts and paper textures'));
  const frame = useCurrentFrame();

  useEffect(() => {
    let cancelled = false;
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 15000));
    Promise.race([waitForAssets(), timeout]).finally(() => {
      if (cancelled) return;
      continueRender(handle);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (!ready) {
    return <AbsoluteFill style={{ backgroundColor: C.paper }} />;
  }

  return (
    <PaperBackground>
      {/* 场景 1：笼中受困与破笼开幕 (0 - 240 帧) */}
      {frame >= SCENES.intro.in && frame < SCENES.intro.end && <IntroScene frame={frame} />}

      {/* 场景 2：网页极速解析 (240 - 600 帧) */}
      {frame >= SCENES.parse.in && frame < SCENES.parse.end && <ParseScene frame={frame} />}

      {/* 场景 3：立体折纸多格式端侧导出 (600 - 900 帧) */}
      {frame >= SCENES.export.in && frame < SCENES.export.end && <ExportScene frame={frame} />}

      {/* 场景 4：批量歌单整理与独立 ZIP 打包 (900 - 1200 帧) */}
      {frame >= SCENES.batch.in && frame < SCENES.batch.end && <BatchScene frame={frame} />}

      {/* 场景 5：本地 CLI 命令行终端世界 (1200 - 1500 帧) */}
      {frame >= SCENES.cli.in && frame < SCENES.cli.end && <CliScene frame={frame} />}

      {/* 场景 6：第三方开源播放器生态互联 (1500 - 1620 帧) */}
      {frame >= SCENES.eco.in && frame < SCENES.eco.end && <EcosystemScene frame={frame} />}

      {/* 场景 7：品牌手账终章定格 (1620 - 1740 帧) */}
      {frame >= SCENES.finale.in && frame <= SCENES.finale.end && <FinaleScene frame={frame} />}

      {/* 全片灵魂主角：小困云（全时段贯穿所有场景，主导所有动作推进） */}
      <MascotActor />

      {/* 120 BPM 原创配乐与拟音分轨 */}
      <Audio src={ASSETS.soundtrack} />
    </PaperBackground>
  );
};
