import { createContext, useContext } from 'react';
import { useBasketballStore } from '../../store/useBasketballStore';
import { usePresentationStore } from '../../store/usePresentationStore';
import type { BasketballState } from '../../types/basketball';
import type { SponsorLayout } from '../../types/presentation';

// Lets the real scoreboard blocks render a saved configuration instead of the live game:
// inside a provider they read this sample state and layout; everywhere else they read the stores as before.
export const PreviewContext = createContext<{ game: BasketballState; layout: SponsorLayout | null } | null>(null);

const nothing = () => undefined;

export function useGame(): BasketballState;
export function useGame<T>(selector: (state: BasketballState) => T): T;
export function useGame<T>(selector?: (state: BasketballState) => T) {
  const preview = useContext(PreviewContext);
  const live = useBasketballStore((preview ? nothing : (selector ?? ((state) => state))) as (state: BasketballState) => T);
  if (!preview) return live;
  return selector ? selector(preview.game) : preview.game;
}

/** The Live Sponsor layout on show: a preview's own saved layout, else the working layout. */
export function useSponsorLayout(): SponsorLayout {
  const preview = useContext(PreviewContext);
  const working = usePresentationStore((state) => state.sponsorLayout);
  return preview?.layout ?? working;
}
