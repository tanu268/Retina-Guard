import { useCallback, useState } from 'react';
import { GradientWave } from './GradientWave';

/** Supplied brand palette. Exactly four — the shader indexes a vec4. */
export const GRADIENT_COLORS = ['#9FB3DF', '#9EC6F3', '#BDDDE4', '#FFF1D5'];

interface GlobalBackgroundProps {
  /**
   * Veil opacity over the canvas. The landing page runs the gradient close to
   * full strength; application routes sit behind a heavier veil so dense
   * clinical tables keep AA contrast over an animated surface.
   */
  intensity?: 'full' | 'muted';
}

/**
 * The single background system for the entire application.
 *
 * Mounted once, above the router, in App.tsx. No page defines its own page
 * background — they inherit this one. Fixed positioning means it never
 * participates in layout, so it cannot cause a layout shift, and it does not
 * repaint on route change.
 */
export function GlobalBackground({ intensity = 'muted' }: GlobalBackgroundProps) {
  const [webglFailed, setWebglFailed] = useState(false);
  const handleUnavailable = useCallback(() => setWebglFailed(true), []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        // A static gradient in the same palette. Visible only if WebGL never
        // initialises — low-end hardware at a rural PHC, or a locked-down
        // browser. The page is never left with a blank background.
        background:
          'linear-gradient(160deg, #9FB3DF 0%, #9EC6F3 38%, #BDDDE4 68%, #FFF1D5 100%)',
      }}
    >
      {!webglFailed && (
        <GradientWave
          colors={GRADIENT_COLORS}
          onUnavailable={handleUnavailable}
          shadowPower={6}
          darkenTop={false}
        />
      )}

      {/* Readability veil. Sits between the canvas and app content. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            intensity === 'full'
              ? 'linear-gradient(180deg, rgb(247 249 253 / 0.58) 0%, rgb(247 249 253 / 0.74) 55%, rgb(247 249 253 / 0.90) 100%)'
              : 'rgb(247 249 253 / 0.88)',
        }}
      />
    </div>
  );
}

export default GlobalBackground;
