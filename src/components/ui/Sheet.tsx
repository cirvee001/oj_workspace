import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { closeSheet } from '@/store/ui/sheetStore';
import { Badge, type BadgeTone } from './Badge';

export type ModalSize = 'sm' | 'md' | 'lg';
const SIZES: Record<ModalSize, string> = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Lock page scroll while any modal is open (reference counted for stacked modals). */
let locks = 0;
function useScrollLock() {
  useEffect(() => {
    if (locks++ === 0) document.body.style.overflow = 'hidden';
    return () => {
      if (--locks === 0) document.body.style.overflow = '';
    };
  }, []);
}

interface ModalProps {
  title: ReactNode;
  /** Sub-line under the title. */
  description?: ReactNode;
  /** A small badge after the title. */
  tag?: ReactNode;
  tagTone?: BadgeTone;
  onClose: () => void;
  /** Actions, right aligned, in the footer bar. */
  footer?: ReactNode;
  size?: ModalSize;
  /** No body padding: for full-bleed tables. */
  bare?: boolean;
  /** Stack above an open sheet. */
  elevated?: boolean;
  children?: ReactNode;
}

/**
 * Centered dialog: header (title + description), body, footer bar. Focus is
 * trapped while open and returned to the trigger on close; Escape and a click
 * on the scrim close it.
 */
export function Modal({ title, description, tag, tagTone, onClose, footer, size = 'md', bare, elevated, children }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useScrollLock();

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const el = panel.current;
    const first = el?.querySelector<HTMLElement>('[autofocus]') ?? el?.querySelector<HTMLElement>(`.modal-body ${FOCUSABLE}`) ?? el;
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key !== 'Tab' || !el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const [a, z] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    el?.addEventListener('keydown', onKey);
    return () => {
      el?.removeEventListener('keydown', onKey);
      trigger?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className={cn('no-print fixed inset-0 flex items-start justify-center overflow-y-auto p-4 sm:p-6', elevated ? 'z-60' : 'z-50')}>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 animate-in bg-ui-950/45 backdrop-blur-[2px]" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        aria-describedby={description ? `${id}-d` : undefined}
        tabIndex={-1}
        className={cn('relative my-auto w-full animate-scale-in rounded-card bg-surface shadow-2xl outline-none', SIZES[size])}
      >
        <div className="stitch mx-6 flex items-start justify-between gap-4 border-b pt-5 pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={`${id}-t`} className="font-display text-[22px] leading-7 text-text">
                {title}
              </h2>
              {tag && <Badge tone={tagTone}>{tag}</Badge>}
            </div>
            {description && (
              <p id={`${id}-d`} className="mt-1 text-body-13 text-text-secondary">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-0.5 -mr-1.5 grid size-8 shrink-0 place-items-center rounded-ctl text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          >
            <X size={18} />
          </button>
        </div>
        {children && <div className={cn('modal-body', !bare && 'px-6 py-5')}>{children}</div>}
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-card border-t border-border bg-surface-sunken px-6 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

type SheetProps = Omit<ModalProps, 'onClose' | 'elevated'>;

/** A modal opened through the sheet store. Every feature sheet renders one of these. */
export function Sheet(props: SheetProps) {
  return <Modal {...props} onClose={closeSheet} />;
}
