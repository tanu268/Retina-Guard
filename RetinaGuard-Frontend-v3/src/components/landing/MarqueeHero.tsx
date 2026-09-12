import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cx } from '../../lib/format';
import { Button } from '../ui';
import type { MarqueeImage } from '../../data/marquee';

interface MarqueeHeroProps {
  tagline: string;
  title: ReactNode;
  description: string;
  primaryCta: { label: string; onClick: () => void };
  secondaryCta: { label: string; onClick: () => void };
  images: MarqueeImage[];
  className?: string;
}

/**
 * Landing hero with an endless image marquee.
 *
 * Three fixes against the supplied component:
 *
 *  1. The loop no longer jumps. The original duplicated the array once but
 *     animated the full width (-100% -> 0%), so the strip visibly seamed every
 *     cycle. Translating exactly -50% of a doubled strip is what loops cleanly,
 *     and per-item margin (not flex `gap`) keeps the seam arithmetic exact:
 *     `gap` omits the trailing gap, leaving a half-gap discrepancy at the join.
 *  2. Staggered reveals actually fire. The original passed `transition={{delay}}`
 *     alongside a variant that declared its own transition — the variant wins,
 *     so everything animated at once. Delays now live in the variants.
 *  3. `100dvh` instead of `100vh`, so mobile browser chrome does not clip the
 *     bottom of the marquee.
 *
 * The strip repeats enough times to overflow the widest viewport, so ten source
 * images still tile cleanly on an ultra-wide display.
 */
export function MarqueeHero({
  tagline, title, description, primaryCta, secondaryCta, images, className,
}: MarqueeHeroProps) {
  const reduceMotion = useReducedMotion();
  const stripRef = useRef<HTMLDivElement>(null);
  const [repeats, setRepeats] = useState(2);

  // Enough copies to overflow the viewport, then doubled for the loop.
  useEffect(() => {
    const compute = () => {
      const itemWidth = window.innerWidth < 768 ? 160 : 208; // matches h-48 / h-64 at 3:4
      const perCopy = images.length * (itemWidth + 16);
      setRepeats(Math.max(2, Math.ceil((window.innerWidth * 1.5) / perCopy) * 2));
    };
    compute();
    window.addEventListener('resize', compute, { passive: true });
    return () => window.removeEventListener('resize', compute);
  }, [images.length]);

  const strip = Array.from({ length: repeats }, () => images).flat();

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: (delay: number) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.6, ease: [0.25, 1, 0.5, 1] as const, delay },
    }),
  };

  return (
    <section
      className={cx(
        'relative flex w-full flex-col items-center justify-center overflow-hidden px-4 text-center',
        'min-h-[100dvh] pt-28 pb-0',
        className,
      )}
    >
      <div className="z-10 flex flex-col items-center pb-[clamp(2rem,14vh,8rem)]">
        <motion.div
          initial="hidden" animate="show" custom={0} variants={fadeUp}
          className="mb-6 inline-flex items-center gap-2 border border-[var(--color-border-strong)] bg-white/70 px-4 py-1.5 backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />
          <span className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
            {tagline}
          </span>
        </motion.div>

        <motion.h1
          initial="hidden" animate="show" custom={0.08} variants={fadeUp}
          className="display max-w-5xl text-display-2 text-[var(--color-brand-950)]"
        >
          {title}
        </motion.h1>

        <motion.p
          initial="hidden" animate="show" custom={0.18} variants={fadeUp}
          className="mt-7 max-w-2xl font-body text-base leading-[var(--leading-body)] text-[var(--color-ink-muted)] md:text-lg"
        >
          {description}
        </motion.p>

        <motion.div
          initial="hidden" animate="show" custom={0.26} variants={fadeUp}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button size="lg" variant="primary" onClick={primaryCta.onClick}>
            {primaryCta.label}
          </Button>
          <Button size="lg" variant="outline" onClick={secondaryCta.onClick}>
            {secondaryCta.label}
          </Button>
        </motion.div>
      </div>

      {/* Image marquee */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-[34%] w-full md:h-[38%]"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)',
        }}
      >
        <div
          ref={stripRef}
          className={cx('flex w-max will-change-transform', !reduceMotion && 'animate-[rg-marquee_60s_linear_infinite]')}
        >
          {strip.map((img, index) => (
            <div
              key={`${img.src}-${index}`}
              className="relative mr-4 aspect-[3/4] h-40 shrink-0 md:h-64"
              style={{ rotate: index % 2 === 0 ? '-1.5deg' : '1.5deg' }}
            >
              <img
                src={img.src}
                alt={index < images.length ? img.alt : ''}
                aria-hidden={index >= images.length}
                loading={index < 6 ? 'eager' : 'lazy'}
                decoding="async"
                width={900}
                height={1200}
                className="h-full w-full border border-white/40 object-cover shadow-[var(--shadow-md)]"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MarqueeHero;
