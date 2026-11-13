import type { Sponsor } from '../types/media';
import type { PresentationState } from '../types/presentation';

type Layouts = Pick<PresentationState, 'sponsorLayout' | 'savedLayouts'>;

/** Names of the working and saved layouts that play this media item in a section. */
export const layoutsUsing = (id: string, { sponsorLayout, savedLayouts }: Layouts): string[] => [
  ...(sponsorLayout.media.some((m) => m.includes(id)) ? ['the current layout'] : []),
  ...savedLayouts.filter((l) => l.layout.media.some((m) => m.includes(id))).map((l) => `saved layout "${l.name}"`),
];

/** Everything that depends on a media item: sponsor logos and rotations, and layouts. Empty means unused. */
export const mediaUsedBy = (id: string, sponsors: Sponsor[], layouts: Layouts): string[] => [
  ...sponsors.filter((s) => s.logoId === id).map((s) => `${s.name} logo`),
  ...sponsors.filter((s) => s.imageIds.includes(id)).map((s) => `${s.name} rotation`),
  ...layoutsUsing(id, layouts),
];
