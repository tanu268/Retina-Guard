import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cx } from '../../lib/format';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** Constrains the panel width. Defaults to a comfortable form width. */
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

/**
 * Modal dialog.
 *
 * Implements the overlay requirements from the brief: blurred backdrop,
 * Escape to dismiss, a real focus trap, and body-scroll lock. Focus returns to
 * whatever was focused before the dialog opened, so a keyboard user is not
 * dumped back at the top of the page after confirming an action.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusable = () => Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((el) => el.offsetParent !== null);

    // Move focus into the dialog once it has mounted.
    const raf = requestAnimationFrame(() => focusable()[0]?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
            className="absolute inset-0 bg-[rgb(15_27_49/0.38)] backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rg-modal-title"
            aria-describedby={description ? 'rg-modal-desc' : undefined}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className={cx(
              'relative w-full border border-[var(--color-border)] bg-white shadow-[var(--shadow-xl)]',
              'max-h-[92dvh] overflow-y-auto',
              SIZES[size],
            )}
          >
            <div className="border-b border-[var(--color-border)] px-6 py-5">
              <h2 id="rg-modal-title" className="font-display text-h3 font-semibold text-[var(--color-brand-950)]">
                {title}
              </h2>
              {description && (
                <p id="rg-modal-desc" className="mt-2 font-body text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  {description}
                </p>
              )}
            </div>

            {children && <div className="px-6 py-5">{children}</div>}

            {footer && (
              <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default Modal;
