export const GRADIENT_COLORS = ['#9FB3DF', '#9EC6F3', '#BDDDE4', '#FFF1D5'];

export interface GlobalBackgroundProps {
  /**
   * Veil opacity over the canvas. The landing page runs the gradient close to
   * full strength; application routes sit behind a heavier veil so dense
   * clinical tables keep AA contrast over an animated surface.
   */
  intensity?: 'full' | 'muted';
}

export function GlobalBackground(props: GlobalBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 bg-white ${props.intensity === 'muted' ? 'opacity-50' : 'opacity-100'}`}
    />
  );
}

export default GlobalBackground;
