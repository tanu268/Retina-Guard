import { Code2, Mail } from 'lucide-react';
import uviLogo from '../../assets/uvi-logo.png';

const LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#roles', label: 'Roles' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#team', label: 'Team' },
];

export function Footer() {
  const scrollTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <footer className="bg-white border-t border-[#E5E7EB] px-6 lg:px-12 py-14">
      <div className="max-w-[1240px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10">
          <div className="max-w-[340px]">
            <div className="flex items-center gap-2.5 mb-3">
              <img src={uviLogo} alt="UVI Logo" className="h-16 w-auto object-contain" />
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#111111]">UVI</span>
            </div>
            <p className="text-[13px] text-[#6B7280] leading-relaxed">
              AI-powered retinal screening platform for rural primary healthcare.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-8 gap-y-3" aria-label="Footer">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}
                className="text-[13px] font-medium text-[#6B7280] hover:text-[#111111] transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-5">
            <a
              href="mailto:team@retinaguard.health"
              className="flex items-center gap-2 text-[13px] text-[#6B7280] hover:text-[#111111] transition-colors duration-200"
            >
              <Mail size={16} strokeWidth={1.75} />
              Email
            </a>
            <a
              href="https://github.com"
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-[13px] text-[#6B7280] hover:text-[#111111] transition-colors duration-200"
            >
              <Code2 size={16} strokeWidth={1.75} />
              GitHub
            </a>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#E5E7EB]">
          <p className="text-[12px] text-[#6B7280]">
            © 2026 UVI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
