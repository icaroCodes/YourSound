import { useEffect, useRef } from 'react';

export function useLiquidGlass(dependencies = []) {
  const rootRef = useRef(null);
  const glassRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    let active = true;
    
    const initGlass = async () => {
      try {
        const { LiquidGlass } = await import('@ybouane/liquidglass');
        if (!active) return;
        
        if (rootRef.current && glassRef.current) {
          instanceRef.current = await LiquidGlass.init({
            root: rootRef.current,
            glassElements: [glassRef.current],
          });
        }
      } catch (err) {
        console.error('Failed to init liquid glass', err);
      }
    };
    
    initGlass();

    return () => {
      active = false;
      if (instanceRef.current) {
        instanceRef.current.destroy();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only init once on mount

  // Triggers updates manually (useful for audio play/pause states that change without DOM mutations LiquidGlass observes)
  useEffect(() => {
    if (instanceRef.current) {
      instanceRef.current.markChanged();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies]);

  return { rootRef, glassRef, instanceRef };
}
