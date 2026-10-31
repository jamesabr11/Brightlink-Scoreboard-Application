import { createJSONStorage } from 'zustand/middleware';
import { notify } from './feedback';

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// A full or blocked localStorage must not break live operation.
export const safeStorage = createJSONStorage(() => ({
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      console.error('Could not save game state', error);
      notify('Browser storage is full or blocked, so recent changes may not be saved.', 'error');
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
}));

// Stores without a BroadcastChannel pick up other tabs' writes from localStorage.
export const followOtherTabs = (key: string, rehydrate: () => unknown) => {
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', (event) => {
    if (event.key === key) void rehydrate();
  });
};
