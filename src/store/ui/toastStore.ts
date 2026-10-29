import { create } from 'zustand';

interface ToastState {
  message: string | null;
  action: string;
  key: number;
}

export const useToastStore = create<ToastState>(() => ({ message: null, action: '', key: 0 }));

let timer: ReturnType<typeof setTimeout> | undefined;

/** Show a short message, with an optional second line explaining what happens next. */
export function toast(message: string, action = ''): void {
  clearTimeout(timer);
  useToastStore.setState((s) => ({ message, action, key: s.key + 1 }));
  timer = setTimeout(() => useToastStore.setState({ message: null }), 4600);
}
