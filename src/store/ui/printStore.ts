import { create } from 'zustand';

export type PrintJob = { kind: 'badges' } | { kind: 'poster' };

interface PrintState {
  job: PrintJob | null;
}

/** <PrintHost /> renders the job into the print-only area and opens the print dialog. */
export const usePrintStore = create<PrintState>(() => ({ job: null }));

export const printDocument = (job: PrintJob): void => usePrintStore.setState({ job });
export const clearPrint = (): void => usePrintStore.setState({ job: null });
