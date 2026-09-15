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

export function GlobalBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-white"
    />
  );
}

export default GlobalBackground;
