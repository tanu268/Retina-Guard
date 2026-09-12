import { motion } from 'framer-motion';

/**
 * The landing illustration.
 *
 * It is the same object the product is about — an optic disc with a vessel tree
 * radiating from it — with a slow scanning sweep passing over it and attention
 * regions resolving as the sweep completes. That sequence *is* the product:
 * capture, then attention, then evidence.
 */
export function RetinaHero({ className }: { className?: string }) {
  const trunks = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2 + 0.3;
    const reach = 30 + ((i * 37) % 26);
    const bend = ((i % 5) - 2) * 7;
    const cx = 68, cy = 50;
    return {
      d: `M ${cx} ${cy} Q ${cx + Math.cos(angle) * reach * 0.5 + bend} ${cy + Math.sin(angle) * reach * 0.5 - bend} ${cx + Math.cos(angle) * reach} ${cy + Math.sin(angle) * reach}`,
      w: 0.6 + ((i * 13) % 7) / 10,
      delay: 0.5 + i * 0.045,
    };
  });

  const attention = [
    { cx: 42, cy: 38, r: 7.5, delay: 2.2 },
    { cx: 34, cy: 58, r: 5.5, delay: 2.45 },
    { cx: 55, cy: 65, r: 4.5, delay: 2.7 },
  ];

  return (
    <div className={className}>
      <svg viewBox="0 0 100 100" className="w-full h-full" role="img" aria-label="Animated retinal fundus illustration">
        <defs>
          <radialGradient id="hero-fundus" cx="50%" cy="50%" r="52%">
            <stop offset="0%" stopColor="#a4491b" />
            <stop offset="55%" stopColor="#7a3212" />
            <stop offset="100%" stopColor="#3d1808" />
          </radialGradient>
          <radialGradient id="hero-disc" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="65%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.3" />
          </radialGradient>
          <radialGradient id="hero-macula" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3d1808" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3d1808" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hero-heat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e11d48" stopOpacity="0.62" />
            <stop offset="55%" stopColor="#f97316" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hero-sweep" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0" />
            <stop offset="70%" stopColor="#a5b4fc" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.55" />
          </linearGradient>
          <clipPath id="hero-clip"><circle cx="50" cy="50" r="46" /></clipPath>
        </defs>

        {/* Outer rings — the instrument bezel */}
        <motion.circle
          cx="50" cy="50" r="49" fill="none" stroke="#c7d2fe" strokeWidth="0.3" opacity="0.5"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: 'center' }}
        />

        <g clipPath="url(#hero-clip)">
          <motion.circle
            cx="50" cy="50" r="46" fill="url(#hero-fundus)"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'center' }}
          />

          {/* Vessel tree draws itself outward from the disc */}
          <g opacity="0.62">
            {trunks.map((t, i) => (
              <motion.path
                key={i} d={t.d} stroke="#7f1d1d" strokeWidth={t.w} fill="none" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.1, delay: t.delay, ease: 'easeOut' }}
              />
            ))}
          </g>

          <motion.circle
            cx="44" cy="50" r="16" fill="url(#hero-macula)"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          />

          <motion.circle
            cx="68" cy="50" r="6.5" fill="url(#hero-disc)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.95 }}
            transition={{ duration: 0.55, delay: 0.35, ease: [0.34, 1.4, 0.64, 1] }}
            style={{ transformOrigin: '68px 50px' }}
          />

          {/* Scanning sweep — the capture moment, looping slowly */}
          <g className="animate-sweep" style={{ transformOrigin: '50px 50px' }}>
            <path d="M 50 50 L 50 2 A 48 48 0 0 1 90 28 Z" fill="url(#hero-sweep)" />
          </g>

          {/* Attention regions resolve after the first sweep */}
          {attention.map((a, i) => (
            <motion.g
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: a.delay, ease: [0.34, 1.3, 0.64, 1] }}
              style={{ transformOrigin: `${a.cx}px ${a.cy}px` }}
            >
              <circle cx={a.cx} cy={a.cy} r={a.r * 1.5} fill="url(#hero-heat)" />
              <circle
                cx={a.cx} cy={a.cy} r={a.r} fill="none"
                stroke="#fb7185" strokeWidth="0.4" strokeDasharray="2 1.4" opacity="0.85"
              />
            </motion.g>
          ))}
        </g>

        <circle cx="50" cy="50" r="46" fill="none" stroke="#1e293b" strokeWidth="2.5" opacity="0.9" />
        <circle cx="50" cy="50" r="47.4" fill="none" stroke="#4338CA" strokeWidth="0.4" opacity="0.55" />
      </svg>
    </div>
  );
}
