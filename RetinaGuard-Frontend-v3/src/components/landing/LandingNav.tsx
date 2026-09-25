import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/format';
import { Button } from '../ui';
import { AnchorNavLink } from '../ui/NavLink';
import uviLogo from '../../assets/uvi-logo.png';

const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'team', label: 'Our Team' },
];

interface LandingNavProps {
  onStartScreening: () => void;
}

/**
 * Sticky landing navigation.
 *
 * Blur and border appear on scroll rather than being always-on, so the hero
 * reads as full-bleed at the top of the page. The active indicator comes from
 * an IntersectionObserver scroll spy — the supplied spec hardcoded `isActive`
 * on the first item, which would have left "Home" lit on every section.
 */
export function LandingNav({ onStartScreening }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('home');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Close the mobile sheet on Escape, and lock body scroll while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter]',
        'duration-[var(--duration-normal)] ease-[var(--ease-in-out-soft)]',
        scrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10 text-white' : 'bg-transparent text-white'
      )}
    >
      <nav className="flex h-[44px] w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="UVI home">
          <span className={cx(
            "font-bold tracking-tight transition-all duration-200",
            scrolled
              ? "text-lg md:text-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent"
              : "text-xl md:text-2xl text-white drop-shadow-sm"
          )}>
            Unified Vision Intelligence
          </span>
        </Link>

        <ul className="hidden items-center gap-9 md:flex">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <AnchorNavLink href={`#${s.id}`} isActive={active === s.id}>
                {s.label}
              </AnchorNavLink>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-4 md:flex">
          <Button size="sm" variant="outline" onClick={onStartScreening}>
            Sign In
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="inline-flex h-10 w-10 items-center justify-center text-[var(--color-body-on-dark)] md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="landing-mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden border-t border-[var(--color-surface-tile-2)] bg-[var(--color-surface-black)] md:hidden"
          >
            <ul className="flex flex-col px-5 py-4">
              {SECTIONS.map((s) => (
                <li key={s.id} className="border-b border-[var(--color-surface-tile-2)] last:border-0">
                  <AnchorNavLink
                    href={`#${s.id}`}
                    isActive={active === s.id}
                    orientation="vertical"
                    onClick={() => setOpen(false)}
                    className="py-4"
                  >
                    {s.label}
                  </AnchorNavLink>
                </li>
              ))}
            </ul>
            <div className="px-5 pb-5 pt-2">
              <Button fullWidth size="md" variant="outline" onClick={onStartScreening}>
                Sign In
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default LandingNav;
