import { create } from 'zustand';

export type ToastKind = 'success' | 'error';

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (confirmed: boolean) => void;
}

interface Feedback {
  toast: { id: number; message: string; kind: ToastKind } | null;
  confirmRequest: ConfirmRequest | null;
}

export const useFeedback = create<Feedback>(() => ({ toast: null, confirmRequest: null }));

export const notify = (message: string, kind: ToastKind = 'success') => {
  useFeedback.setState({ toast: { id: Date.now(), message, kind } });
};

export const askConfirm = (options: { title: string; message: string; confirmLabel: string; danger?: boolean }) =>
  new Promise<boolean>((resolve) => {
    useFeedback.setState({ confirmRequest: { danger: false, ...options, resolve } });
  });
