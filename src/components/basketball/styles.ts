export const buttonBase = 'rounded font-bold text-white transition-colors active:brightness-75 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2';
export const neutral = `${buttonBase} bg-neutral-700 hover:bg-neutral-600`;
export const positive = `${buttonBase} bg-green-600 hover:bg-green-500`;
export const negative = `${buttonBase} bg-red-600 hover:bg-red-500`;
export const primary = `${buttonBase} bg-blue-600 hover:bg-blue-500`;
// School red: --brand is set from lib/branding.ts in main.tsx.
export const brand = `${buttonBase} bg-[var(--brand)] hover:brightness-110`;
export const input = 'mt-1 w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-white';
