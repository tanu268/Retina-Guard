import type { ReactNode } from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';
import { cx } from '../../lib/format';

/**
 * The single navigation primitive.
 *
 * The supplied navbar spec was a Next.js + Radix `NavigationMenu` bundle. Radix
 * NavigationMenu exists for dropdown submenus with viewport animation; this app
 * has flat links, so the primitive would cost ~30KB in the landing page's
 * critical bundle for markup a `<ul>` already provides. The visual behaviour —
 * icon + label, an underline that scales in from the centre, no filled pill —
 * is reproduced here with the same design tokens.
 *
 * `orientation="horizontal"` renders the landing navbar treatment (bottom
 * underline). `orientation="vertical"` rotates the indicator to the left edge
 * for the application sidebar, so both surfaces read as one system.
 */

interface BaseProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

interface RouteNavLinkProps extends BaseProps {
  to: string;
  end?: boolean;
  href?: never;
  onClick?: () => void;
}

interface AnchorNavLinkProps extends BaseProps {
  href: string;
  isActive?: boolean;
  to?: never;
  onClick?: () => void;
}

const BASE =
  'group relative inline-flex items-center gap-2.5 font-ui text-sm font-medium ' +
  'text-[var(--color-ink-muted)] transition-colors duration-[var(--duration-fast)] ' +
  'hover:text-[var(--color-brand-900)] focus-visible:text-[var(--color-brand-900)]';

const INDICATOR_H =
  'before:absolute before:inset-x-0 before:bottom-0 before:h-[2px] before:origin-center ' +
  'before:scale-x-0 before:bg-[var(--color-primary)] ' +
  'before:transition-transform before:duration-[var(--duration-normal)] ' +
  'before:ease-[var(--ease-out-quart)] ' +
  'hover:before:scale-x-100 focus-visible:before:scale-x-100';

const INDICATOR_V =
  'before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:origin-center ' +
  'before:scale-y-0 before:bg-[var(--color-primary)] ' +
  'before:transition-transform before:duration-[var(--duration-normal)] ' +
  'before:ease-[var(--ease-out-quart)] ' +
  'hover:before:scale-y-100 focus-visible:before:scale-y-100';

function classesFor(orientation: 'horizontal' | 'vertical', active: boolean, className?: string) {
  return cx(
    BASE,
    orientation === 'horizontal' ? 'h-9 px-0.5 py-2' : 'w-full px-3 py-2',
    orientation === 'horizontal' ? INDICATOR_H : INDICATOR_V,
    active && (orientation === 'horizontal'
      ? 'text-[var(--color-brand-900)] before:scale-x-100'
      : 'text-[var(--color-brand-900)] bg-[var(--color-hover)] before:scale-y-100'),
    className,
  );
}

/** Router-aware link. Active state derives from the current route, never a flag. */
export function NavLink({
  to, end, children, icon, className, orientation = 'horizontal', onClick,
}: RouteNavLinkProps) {
  return (
    <RouterNavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => classesFor(orientation, isActive, className)}
      aria-current={undefined}
    >
      {({ isActive }) => (
        <span className="inline-flex items-center gap-2.5" aria-current={isActive ? 'page' : undefined}>
          {icon}
          {children}
        </span>
      )}
    </RouterNavLink>
  );
}

/** In-page anchor link (landing sections). Active state is supplied by a scroll spy. */
export function AnchorNavLink({
  href, isActive = false, children, icon, className, orientation = 'horizontal', onClick,
}: AnchorNavLinkProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={isActive ? 'true' : undefined}
      className={classesFor(orientation, isActive, className)}
    >
      <span className="inline-flex items-center gap-2.5">
        {icon}
        {children}
      </span>
    </a>
  );
}

export default NavLink;
