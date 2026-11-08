export interface Player {
  id: string;
  name: string;
  number: string;        // jersey number as string to support "00", "0"
  position: string;      // free-form: "PG", "SG", "SF", "PF", "C"
  isStarter: boolean;
  photoId: string | null; // IDB key in basketball-roster db
  createdAt: number;
}

export type RosterSide = 'home' | 'away';
