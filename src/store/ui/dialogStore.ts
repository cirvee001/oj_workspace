import { create } from 'zustand';

/**
 * Promise-based replacements for window.prompt / window.confirm, rendered as
 * in-app dialogs by <DialogHost />.
 */
export type DialogRequest =
  | {
      kind: 'prompt';
      title: string;
      message?: string;
      defaultValue?: string;
      placeholder?: string;
      inputType?: 'text' | 'number' | 'date';
      confirmLabel?: string;
      resolve: (value: string | null) => void;
    }
  | {
      kind: 'confirm';
      title: string;
      message?: string;
      confirmLabel?: string;
      resolve: (ok: boolean) => void;
    };

interface DialogState {
  current: DialogRequest | null;
}

export const useDialogStore = create<DialogState>(() => ({ current: null }));

type PromptOptions = Omit<Extract<DialogRequest, { kind: 'prompt' }>, 'kind' | 'resolve'>;
type ConfirmOptions = Omit<Extract<DialogRequest, { kind: 'confirm' }>, 'kind' | 'resolve'>;

/** Ask for a line of text. Resolves to null if cancelled. */
export function promptDialog(opts: PromptOptions): Promise<string | null> {
  return new Promise((resolve) =>
    useDialogStore.setState({
      current: {
        kind: 'prompt',
        ...opts,
        resolve: (v) => {
          useDialogStore.setState({ current: null });
          resolve(v);
        },
      },
    }),
  );
}

/** Ask a yes/no question. */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) =>
    useDialogStore.setState({
      current: {
        kind: 'confirm',
        ...opts,
        resolve: (ok) => {
          useDialogStore.setState({ current: null });
          resolve(ok);
        },
      },
    }),
  );
}
