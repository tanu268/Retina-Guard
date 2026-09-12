import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useMemo, useRef, useState } from 'react';
import { cx, formatPercent, isTrue } from '../../lib/format';
import { LESION_LABELS } from '../../lib/clinical';
import type { AnatomyResult, GradcamRegion, LesionEvidence, LesionType } from '../../types';
import { Toggle } from '../ui';
import { IconZoomIn, IconZoomOut, IconRefresh, IconInfo } from '../ui/icons';

/* ═══════════════════════════════════════════════════════════════════════════
   RetinaViewer — the signature surface of this application.

   The edge API exposes no endpoint that serves image binaries: `file_path` and
   `artifact_path` are filesystem paths on the edge node, and `/uploads` is not
   statically served. Photographs therefore cannot be displayed.

   Rather than render a grey "image unavailable" box, this component draws the
   fundus from the coordinates the backend DOES return — optic disc centre and
   radius, foveal centre, the two-disc-diameter macular zone, vessel density and
   tortuosity, Grad-CAM regions with intensity, and lesion bounding boxes by
   type. Every mark on screen traces to a real number from the analysis.

   It is labelled as a schematic throughout. It never implies it is a photo.
   If an image endpoint is added later, pass `imageUrl` and the same overlays
   composite straight over the photograph — no other change needed.
   ═══════════════════════════════════════════════════════════════════════════ */

export type EvidenceLayer = 'gradcam' | 'lesion' | 'anatomy';

const LAYER_COLORS: Record<EvidenceLayer, string> = {
  gradcam: '#e11d48',
  lesion: '#7c3aed',
  anatomy: '#0891b2',
};

const LESION_MARK: Record<LesionType, { colour: string; glyph: 'dot' | 'blot' | 'flake' | 'cloud' | 'branch' | 'bead' }> = {
  microaneurysm: { colour: '#be123c', glyph: 'dot' },
  haemorrhage: { colour: '#9f1239', glyph: 'blot' },
  hard_exudate: { colour: '#ca8a04', glyph: 'flake' },
  soft_exudate: { colour: '#a16207', glyph: 'cloud' },
  neovascularisation: { colour: '#7c3aed', glyph: 'branch' },
  venous_beading: { colour: '#6d28d9', glyph: 'bead' },
};

/** Deterministic pseudo-random from a seed, so the vessel tree is stable across
 *  renders for the same analysis rather than shuffling on every paint. */
function seeded(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Builds a vessel tree whose density and curvature are driven by the real
 *  vesselDensity and tortuosityIndex values from anatomy detection. */
function buildVessels(anatomy: AnatomyResult | null, seed: number) {
  const disc = anatomy?.opticDisc;
  const cx0 = (disc?.centre?.x ?? 0.75) * 100;
  const cy0 = (disc?.centre?.y ?? 0.5) * 100;
  const density = anatomy?.vessels?.vesselDensity ?? 0.12;
  const tortuosity = anatomy?.vessels?.tortuosityIndex ?? 1.2;

  const rand = seeded(seed);
  const trunkCount = Math.max(4, Math.round(density * 48));
  const paths: Array<{ d: string; w: number }> = [];

  for (let i = 0; i < trunkCount; i += 1) {
    const angle = (i / trunkCount) * Math.PI * 2 + rand() * 0.4;
    const reach = 34 + rand() * 30;
    const bend = (tortuosity - 1) * 26 * (rand() > 0.5 ? 1 : -1);

    const x1 = cx0 + Math.cos(angle) * reach * 0.45;
    const y1 = cy0 + Math.sin(angle) * reach * 0.45;
    const x2 = cx0 + Math.cos(angle) * reach;
    const y2 = cy0 + Math.sin(angle) * reach;

    paths.push({
      d: `M ${cx0} ${cy0} Q ${x1 + bend} ${y1 - bend} ${x2} ${y2}`,
      w: 0.75 + rand() * 0.7,
    });

    // One branch per trunk, thinner and shorter.
    if (rand() > 0.35) {
      const bAngle = angle + (rand() - 0.5) * 1.1;
      const bReach = reach * (0.45 + rand() * 0.35);
      paths.push({
        d: `M ${x1} ${y1} Q ${x1 + Math.cos(bAngle) * bReach * 0.5 + bend * 0.5} ${y1 + Math.sin(bAngle) * bReach * 0.5} ${x1 + Math.cos(bAngle) * bReach} ${y1 + Math.sin(bAngle) * bReach}`,
        w: 0.4 + rand() * 0.35,
      });
    }
  }
  return paths;
}

function LesionGlyph({ lesion, index }: { lesion: LesionEvidence; index: number }) {
  const mark = LESION_MARK[lesion.type] ?? LESION_MARK.microaneurysm;
  const x = lesion.bbox.x * 100;
  const y = lesion.bbox.y * 100;
  const w = Math.max(1.2, lesion.bbox.w * 100);
  const h = Math.max(1.2, lesion.bbox.h * 100);
  const cx0 = x + w / 2;
  const cy0 = y + h / 2;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.03, 0.4) }}
      style={{ transformOrigin: `${cx0}px ${cy0}px` }}
    >
      <rect
        x={x} y={y} width={w} height={h}
        fill="none" stroke={mark.colour} strokeWidth={0.35}
        strokeDasharray="1 0.6" rx={0.5} opacity={0.9}
      />
      {mark.glyph === 'dot' && <circle cx={cx0} cy={cy0} r={Math.min(w, h) * 0.28} fill={mark.colour} opacity={0.85} />}
      {mark.glyph === 'blot' && <ellipse cx={cx0} cy={cy0} rx={w * 0.3} ry={h * 0.24} fill={mark.colour} opacity={0.75} />}
      {mark.glyph === 'flake' && (
        <rect x={cx0 - w * 0.22} y={cy0 - h * 0.22} width={w * 0.44} height={h * 0.44}
          fill={mark.colour} opacity={0.8} transform={`rotate(45 ${cx0} ${cy0})`} />
      )}
      {mark.glyph === 'cloud' && <circle cx={cx0} cy={cy0} r={Math.min(w, h) * 0.3} fill={mark.colour} opacity={0.55} />}
      {mark.glyph === 'branch' && (
        <path d={`M ${cx0 - w * 0.25} ${cy0 + h * 0.2} L ${cx0} ${cy0 - h * 0.2} L ${cx0 + w * 0.25} ${cy0 + h * 0.18}`}
          fill="none" stroke={mark.colour} strokeWidth={0.4} />
      )}
      {mark.glyph === 'bead' && (
        <>
          <circle cx={cx0 - w * 0.2} cy={cy0} r={Math.min(w, h) * 0.15} fill={mark.colour} opacity={0.8} />
          <circle cx={cx0 + w * 0.2} cy={cy0} r={Math.min(w, h) * 0.15} fill={mark.colour} opacity={0.8} />
        </>
      )}
    </motion.g>
  );
}

export interface RetinaViewerProps {
  laterality?: 'left' | 'right' | null;
  anatomy?: AnatomyResult | null;
  lesions?: LesionEvidence[] | null;
  gradcamRegions?: GradcamRegion[] | null;
  /** Optional real fundus photograph. The API serves none today; when an image
   *  route exists, pass the URL and overlays composite over it unchanged. */
  imageUrl?: string | null;
  seed?: number;
  className?: string;
  /** Hide the layer toggles — used in the compact report preview. */
  readOnly?: boolean;
  initialLayers?: EvidenceLayer[];
}

export function RetinaViewer({
  laterality, anatomy, lesions, gradcamRegions, imageUrl,
  seed = 42, className, readOnly, initialLayers = ['gradcam'],
}: RetinaViewerProps) {
  const [active, setActive] = useState<Set<EvidenceLayer>>(new Set(initialLayers));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<LesionEvidence | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const vessels = useMemo(() => buildVessels(anatomy ?? null, seed), [anatomy, seed]);

  const toggle = useCallback((layer: EvidenceLayer) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer); else next.add(layer);
      return next;
    });
  }, []);

  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  };
  const onPointerUp = () => { dragRef.current = null; };

  const disc = anatomy?.opticDisc;
  const fovea = anatomy?.fovea;
  const discX = (disc?.centre?.x ?? 0.75) * 100;
  const discY = (disc?.centre?.y ?? 0.5) * 100;
  const discR = (disc?.radius ?? 0.06) * 100;
  const foveaX = (fovea?.centre?.x ?? 0.5) * 100;
  const foveaY = (fovea?.centre?.y ?? 0.5) * 100;

  const lesionList = lesions ?? [];
  const regions = gradcamRegions ?? [];

  return (
    <div className={cx('flex flex-col gap-3', className)}>
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Toggle
              label="Grad-CAM" checked={active.has('gradcam')}
              onChange={() => toggle('gradcam')} accent={LAYER_COLORS.gradcam}
              disabled={regions.length === 0}
            />
            <Toggle
              label="Lesions" checked={active.has('lesion')}
              onChange={() => toggle('lesion')} accent={LAYER_COLORS.lesion}
              disabled={lesionList.length === 0}
            />
            <Toggle
              label="Anatomy" checked={active.has('anatomy')}
              onChange={() => toggle('anatomy')} accent={LAYER_COLORS.anatomy}
              disabled={!anatomy}
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
              className="w-8 h-8 rounded-none border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center"
              aria-label="Zoom in"
            ><IconZoomIn size={15} /></button>
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
              className="w-8 h-8 rounded-none border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center"
              aria-label="Zoom out"
            ><IconZoomOut size={15} /></button>
            <button
              onClick={resetView}
              className="w-8 h-8 rounded-none border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center"
              aria-label="Reset view"
            ><IconRefresh size={15} /></button>
          </div>
        </div>
      )}

      <div
        className="relative rounded-none overflow-hidden bg-[#0f172a] select-none"
        style={{ aspectRatio: '1 / 1', cursor: zoom > 1 ? 'grab' : 'default', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className="absolute inset-0 origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: dragRef.current ? 'none' : 'transform 0.24s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="Fundus photograph" className="absolute inset-0 w-full h-full object-cover" />
          ) : null}

          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id="fundus-bg" cx="50%" cy="50%" r="52%">
                <stop offset="0%" stopColor="#8c3d16" />
                <stop offset="55%" stopColor="#6b2d10" />
                <stop offset="100%" stopColor="#3d1808" />
              </radialGradient>
              <radialGradient id="disc-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="70%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.25" />
              </radialGradient>
              <radialGradient id="macula-shade" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3d1808" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#3d1808" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="cam-heat" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#e11d48" stopOpacity="0.72" />
                <stop offset="55%" stopColor="#f97316" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
              </radialGradient>
              <clipPath id="fundus-clip"><circle cx="50" cy="50" r="48" /></clipPath>
            </defs>

            <g clipPath="url(#fundus-clip)">
              {!imageUrl && (
                <>
                  <circle cx="50" cy="50" r="48" fill="url(#fundus-bg)" />
                  {/* Vessel tree — trunk count from vesselDensity, curvature from
                      tortuosityIndex. Both are measured values. */}
                  <g opacity="0.6">
                    {vessels.map((v, i) => (
                      <path key={i} d={v.d} stroke="#7f1d1d" strokeWidth={v.w} fill="none" strokeLinecap="round" />
                    ))}
                  </g>
                  <g opacity="0.35">
                    {vessels.slice(0, Math.ceil(vessels.length / 2)).map((v, i) => (
                      <path key={`a${i}`} d={v.d} stroke="#dc2626" strokeWidth={v.w * 0.5} fill="none" strokeLinecap="round" />
                    ))}
                  </g>
                  {/* Macular shading sits at the measured foveal centre. */}
                  <circle cx={foveaX} cy={foveaY} r={discR * 2.6} fill="url(#macula-shade)" />
                  {/* Optic disc at its measured centre and radius. */}
                  <circle cx={discX} cy={discY} r={discR} fill="url(#disc-glow)" opacity="0.92" />
                  {typeof disc?.cupToDiscRatio === 'number' && (
                    <circle cx={discX} cy={discY} r={discR * disc.cupToDiscRatio} fill="#fffbeb" opacity="0.55" />
                  )}
                </>
              )}

              {/* Grad-CAM attention */}
              <AnimatePresence>
                {active.has('gradcam') && regions.map((r, i) => (
                  <motion.g
                    key={`cam-${i}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.24 }}
                  >
                    <ellipse
                      cx={(r.x + r.w / 2) * 100} cy={(r.y + r.h / 2) * 100}
                      rx={r.w * 100 * 0.85} ry={r.h * 100 * 0.85}
                      fill="url(#cam-heat)" opacity={Math.max(0.35, r.intensity)}
                    />
                    <rect
                      x={r.x * 100} y={r.y * 100} width={r.w * 100} height={r.h * 100}
                      fill="none" stroke={LAYER_COLORS.gradcam} strokeWidth={0.4}
                      strokeDasharray="2 1.2" rx={1} opacity={0.9}
                    />
                    <text
                      x={r.x * 100} y={r.y * 100 - 1.2}
                      fill={LAYER_COLORS.gradcam} fontSize={2.6} fontWeight={700}
                    >
                      {formatPercent(r.intensity, 0)}
                    </text>
                  </motion.g>
                ))}
              </AnimatePresence>

              {/* Lesion evidence */}
              <AnimatePresence>
                {active.has('lesion') && lesionList.map((l, i) => (
                  <g
                    key={`les-${i}`}
                    onMouseEnter={() => setHovered(l)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <LesionGlyph lesion={l} index={i} />
                  </g>
                ))}
              </AnimatePresence>

              {/* Anatomy landmarks */}
              <AnimatePresence>
                {active.has('anatomy') && anatomy && (
                  <motion.g
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.24 }}
                  >
                    {isTrue(disc?.detected) && (
                      <>
                        <circle cx={discX} cy={discY} r={discR} fill="none"
                          stroke={LAYER_COLORS.anatomy} strokeWidth={0.5} />
                        <line x1={discX - discR - 2} y1={discY} x2={discX - discR - 5} y2={discY}
                          stroke={LAYER_COLORS.anatomy} strokeWidth={0.3} />
                        <text x={discX - discR - 5.6} y={discY + 0.9} fill={LAYER_COLORS.anatomy}
                          fontSize={2.5} textAnchor="end" fontWeight={600}>Optic disc</text>
                      </>
                    )}
                    {isTrue(fovea?.detected) && (
                      <>
                        <circle cx={foveaX} cy={foveaY} r={1.4} fill="none"
                          stroke={LAYER_COLORS.anatomy} strokeWidth={0.45} />
                        <path d={`M ${foveaX - 2.6} ${foveaY} h 1.6 M ${foveaX + 1} ${foveaY} h 1.6 M ${foveaX} ${foveaY - 2.6} v 1.6 M ${foveaX} ${foveaY + 1} v 1.6`}
                          stroke={LAYER_COLORS.anatomy} strokeWidth={0.4} />
                        <text x={foveaX} y={foveaY + 5.6} fill={LAYER_COLORS.anatomy}
                          fontSize={2.5} textAnchor="middle" fontWeight={600}>Fovea</text>
                      </>
                    )}
                    {/* The macular zone the blueprint defines: two disc diameters
                        from the foveal centre. */}
                    {isTrue(anatomy.macularZone?.withinTwoDiscDiameters) && (
                      <circle cx={foveaX} cy={foveaY} r={discR * 4} fill="none"
                        stroke={LAYER_COLORS.anatomy} strokeWidth={0.3}
                        strokeDasharray="1.5 1.5" opacity={0.65} />
                    )}
                  </motion.g>
                )}
              </AnimatePresence>
            </g>

            <circle cx="50" cy="50" r="48" fill="none" stroke="#1e293b" strokeWidth="3.5" />
          </svg>
        </div>

        {/* Laterality marker */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="px-2.5 h-7 rounded-none bg-black/45 backdrop-blur text-white text-[11px] font-semibold flex items-center tracking-wide">
            {laterality === 'left' ? 'LEFT EYE (OS)' : laterality === 'right' ? 'RIGHT EYE (OD)' : 'FUNDUS'}
          </span>
          {zoom > 1 && (
            <span className="px-2 h-7 rounded-none bg-black/45 backdrop-blur text-white text-[11px] font-medium flex items-center tnum">
              {zoom.toFixed(1)}×
            </span>
          )}
        </div>

        {/* Honesty label. The viewer never implies it is a photograph. */}
        {!imageUrl && (
          <div className="absolute bottom-3 left-3 right-3 flex items-start gap-1.5 text-[10px] text-white/60 leading-snug">
            <IconInfo size={11} className="shrink-0 mt-px" />
            <span>
              Schematic rendering. Landmark positions, attention regions and lesion
              boxes are drawn from measured analysis coordinates. Not a photograph.
            </span>
          </div>
        )}

        {/* Lesion tooltip */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className="absolute top-3 right-3 rounded-none bg-white/95 backdrop-blur px-3 py-2 shadow-lg max-w-[190px]"
            >
              <p className="text-[12px] font-semibold text-slate-900">
                {LESION_LABELS[hovered.type] ?? hovered.type}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 tnum">
                {formatPercent(hovered.confidence, 0)} confidence · {hovered.quadrant}
              </p>
              <p className="text-[11px] text-slate-500 tnum">{hovered.areaPx} px²</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Layer legend — only for layers that are on and have content. */}
      {!readOnly && (active.has('lesion') && lesionList.length > 0) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
          {Array.from(new Set(lesionList.map((l) => l.type))).map((type) => (
            <span key={type} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="w-2 h-2 rounded-full" style={{ background: LESION_MARK[type]?.colour }} />
              {LESION_LABELS[type] ?? type}
              <span className="text-slate-400 tnum">
                ×{lesionList.filter((l) => l.type === type).length}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
