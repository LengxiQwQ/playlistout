import React, {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

const FACES = [
  {family: 'MaShanZheng', file: 'MaShanZheng-Regular.ttf', weight: '400'},
  {family: 'Caveat', file: 'Caveat-Variable.ttf', weight: '400 700'},
  {family: 'PermanentMarker', file: 'PermanentMarker-Regular.ttf', weight: '400'},
  {family: 'SpaceMono', file: 'SpaceMono-Regular.ttf', weight: '400'},
  {family: 'SpaceMono', file: 'SpaceMono-Bold.ttf', weight: '700'},
  {family: 'NotoSansSC', file: 'NotoSansSC-VF.ttf', weight: '100 900'},
  {family: 'ZCOOLKuaiLe', file: 'ZCOOLKuaiLe-Regular.ttf', weight: '400'},
];

/**
 * Remotion can render before @font-face is ready. We register the exact local
 * files through the FontFace API and hold every still/render until they load.
 */
export const FontGate: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [handle] = useState(() => delayRender('Loading Playlist Out film fonts'));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const loads = FACES.map((face) => {
          const font = new FontFace(face.family, `url(${staticFile(`fonts/${face.file}`)})`, {
            weight: face.weight,
            style: 'normal',
            display: 'block',
          });
          document.fonts.add(font);
          return font.load();
        });
        await Promise.all(loads);
        await document.fonts.ready;
      } catch {
        // A fallback font must never make the film impossible to render.
      }
      if (!cancelled) continueRender(handle);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  return <>{children}</>;
};
