import type { Team } from '../types/basketball';

// The default school identity. Change it here and the default teams, every
// scoreboard preset's accent and the operator header all follow. Operators can
// still rename teams, recolor them and upload logos for any other school.
export const BRAND = {
  school: 'Holy Cross Regional High School',
  red: '#C8102E',
  white: '#FFFFFF',
  black: '#111111',
};

// No official logo ships with the app: without an upload, the scoreboard shows
// the team's initials in its colors.
export const BRAND_TEAM: Partial<Team> = { name: 'Holy Cross', abbreviation: 'HCR', primaryColor: BRAND.red, secondaryColor: BRAND.black };

export const VISITOR_TEAM: Partial<Team> = { name: 'Visitors', abbreviation: 'VIS', primaryColor: BRAND.white, secondaryColor: BRAND.black };
