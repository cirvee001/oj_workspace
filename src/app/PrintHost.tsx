import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store/appStore';
import { clearPrint, usePrintStore } from '@/store/ui/printStore';
import { BadgeSheetPrint, PosterPrint } from '@/features/clock-in/PrintDocuments';

/**
 * Renders the current print job into a container that is hidden on screen and
 * is the only thing visible on paper, then opens the browser print dialog.
 */
export function PrintHost() {
  const job = usePrintStore((s) => s.job);
  const signedIn = useAppStore((s) => s.actor !== null);

  useEffect(() => {
    if (!job) return;
    /* Let the content paint, print, then clear. window.print() blocks until the
       dialog closes, and `afterprint` is not fired everywhere, so clear directly. */
    const t = setTimeout(() => {
      window.print();
      clearPrint();
    }, 50);
    return () => clearTimeout(t);
  }, [job]);

  if (!job || !signedIn) return null;
  return createPortal(
    <div className="hidden text-ink print:block">{job.kind === 'badges' ? <BadgeSheetPrint /> : <PosterPrint />}</div>,
    document.body,
  );
}
