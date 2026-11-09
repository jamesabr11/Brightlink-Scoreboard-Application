export type MediaKind = 'image' | 'video';

// Metadata only: the file itself and its thumbnail live in IndexedDB under the same id.
export interface MediaItem {
  id: string;
  name: string;
  kind: MediaKind;
  type: string; // MIME type
  size: number; // bytes
  width: number;
  height: number;
  naturalDuration: number | null; // a video's own length in seconds; null for images
  duration: number; // seconds on screen when played: images default to 10, videos to their length
  categoryId: string;
  sponsorId: string | null;
  createdAt: number;
}

export interface MediaCategory {
  id: string;
  name: string;
  builtIn: boolean; // built-in categories can't be renamed or deleted
}

// Sponsor image entry with display settings
export interface SponsorImage {
  id: string;        // MediaItem id
  duration: number;  // seconds on screen (0 = default)
}

export interface Sponsor {
  id: string;
  name: string;
  logoId: string | null; // an image MediaItem
  imageIds: string[];    // ordered list of ad images
  imageDurations: Record<string, number>; // per-image duration overrides
  createdAt: number;
}
