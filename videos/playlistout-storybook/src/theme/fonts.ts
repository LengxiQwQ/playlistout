import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';

const FONT_DEFINITIONS = [
  { family: 'Ma Shan Zheng', file: 'fonts/MaShanZheng-Regular.ttf', weight: '400' },
  { family: 'ZCOOL KuaiLe', file: 'fonts/ZCOOLKuaiLe-Regular.ttf', weight: '400' },
  { family: 'Permanent Marker', file: 'fonts/PermanentMarker-Regular.ttf', weight: '400' },
  { family: 'Caveat', file: 'fonts/Caveat-Bold.ttf', weight: '700' },
  { family: 'Space Mono', file: 'fonts/SpaceMono-Regular.ttf', weight: '400' },
  { family: 'Space Mono', file: 'fonts/SpaceMono-Bold.ttf', weight: '700' },
];

let fontsLoadedSingleton = false;

export const useJournalFonts = (): boolean => {
  const [loaded, setLoaded] = useState(fontsLoadedSingleton);
  const [handle] = useState(() => (fontsLoadedSingleton ? null : delayRender('Loading Journal Fonts')));

  useEffect(() => {
    if (fontsLoadedSingleton) {
      if (handle !== null) continueRender(handle);
      return;
    }

    let cancelled = false;
    async function loadAll() {
      try {
        await Promise.all(
          FONT_DEFINITIONS.map(async (def) => {
            const url = staticFile(def.file);
            const face = new FontFace(def.family, `url('${url}')`, {
              weight: def.weight,
              style: 'normal',
            });
            const loadedFace = await face.load();
            document.fonts.add(loadedFace);
          })
        );
        await document.fonts.ready;
      } catch (err) {
        console.warn('Font loading warning:', err);
      } finally {
        if (!cancelled) {
          fontsLoadedSingleton = true;
          setLoaded(true);
          if (handle !== null) {
            continueRender(handle);
          }
        }
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  return loaded;
};
