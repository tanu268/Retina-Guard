import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui';
import { RetinaMark } from '../ui/icons';
import { cx } from '../../lib/format';
import uviLogo from '../../assets/uvi-logo.png';

const NAV_LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#roles', label: 'Roles' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#team', label: 'Our Team' },
];

/**
 * Fixed top navigation for the landing page. Transparent over the hero,
 * gains a blur and a thin bottom border once the page scrolls.
 */
export function Navbar({ onEnterWorkspace }: { onEnterWorkspace: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-50 h-[72px] transition-colors duration-200',
        scrolled ? 'glass border-b border-[#E5E7EB]' : 'bg-transparent border-b border-transparent',
      )}
    >
      <div className="h-full max-w-[1240px] mx-auto px-6 lg:px-12 flex items-center justify-between">
        <a href="#home" onClick={(e) => { e.preventDefault(); scrollTo('#home'); }} className="flex items-center gap-2.5">
          <span className="font-bold text-lg md:text-xl tracking-tight bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Unified Vision Intelligence
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}
              className="relative text-[13px] font-medium text-[#6B7280] hover:text-[#111111] transition-colors duration-200 group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-[#2563EB] transition-all duration-200 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <Button size="sm" onClick={onEnterWorkspace} icon={<ArrowRight size={14} strokeWidth={2} />}>
          Enter Workspace
        </Button>
      </div>
    </header>
  );
}
