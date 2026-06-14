import type { SpaceDef } from './types.js';

// Standard US Monopoly board, indices 0..39 going clockwise from GO.
// rent ladder = [base, 1 house, 2, 3, 4, hotel]
export const BOARD: SpaceDef[] = [
  { idx: 0, name: 'GO', kind: 'go' },
  { idx: 1, name: 'Guwahati', kind: 'street', group: 'brown', price: 60, houseCost: 50, rent: [2, 10, 30, 90, 160, 250] },
  { idx: 2, name: 'Community Chest', kind: 'chest' },
  { idx: 3, name: 'Patna', kind: 'street', group: 'brown', price: 60, houseCost: 50, rent: [4, 20, 60, 180, 320, 450] },
  { idx: 4, name: 'Income Tax', kind: 'tax', tax: 200 },
  { idx: 5, name: 'Mumbai Airport', kind: 'railroad', price: 200 },
  { idx: 6, name: 'Jaipur', kind: 'street', group: 'lightblue', price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550] },
  { idx: 7, name: 'Chance', kind: 'chance' },
  { idx: 8, name: 'Bhopal', kind: 'street', group: 'lightblue', price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550] },
  { idx: 9, name: 'Indore', kind: 'street', group: 'lightblue', price: 120, houseCost: 50, rent: [8, 40, 100, 300, 450, 600] },
  { idx: 10, name: 'Jail / Just Visiting', kind: 'jail' },
  { idx: 11, name: 'Nagpur', kind: 'street', group: 'pink', price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750] },
  { idx: 12, name: 'Electricity Board', kind: 'utility', price: 150 },
  { idx: 13, name: 'Kanpur', kind: 'street', group: 'pink', price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750] },
  { idx: 14, name: 'Lucknow', kind: 'street', group: 'pink', price: 160, houseCost: 100, rent: [12, 60, 180, 500, 700, 900] },
  { idx: 15, name: 'Delhi Airport', kind: 'railroad', price: 200 },
  { idx: 16, name: 'Surat', kind: 'street', group: 'orange', price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950] },
  { idx: 17, name: 'Community Chest', kind: 'chest' },
  { idx: 18, name: 'Coimbatore', kind: 'street', group: 'orange', price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950] },
  { idx: 19, name: 'Visakhapatnam', kind: 'street', group: 'orange', price: 200, houseCost: 100, rent: [16, 80, 220, 600, 800, 1000] },
  { idx: 20, name: 'Free Parking', kind: 'freeparking' },
  { idx: 21, name: 'Kochi', kind: 'street', group: 'red', price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050] },
  { idx: 22, name: 'Chance', kind: 'chance' },
  { idx: 23, name: 'Goa', kind: 'street', group: 'red', price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050] },
  { idx: 24, name: 'Chandigarh', kind: 'street', group: 'red', price: 240, houseCost: 150, rent: [20, 100, 300, 750, 925, 1100] },
  { idx: 25, name: 'Kolkata Airport', kind: 'railroad', price: 200 },
  { idx: 26, name: 'Hyderabad', kind: 'street', group: 'yellow', price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150] },
  { idx: 27, name: 'Chennai', kind: 'street', group: 'yellow', price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150] },
  { idx: 28, name: 'Water Board', kind: 'utility', price: 150 },
  { idx: 29, name: 'Ahmedabad', kind: 'street', group: 'yellow', price: 280, houseCost: 150, rent: [24, 120, 360, 850, 1025, 1200] },
  { idx: 30, name: 'Go To Jail', kind: 'gotojail' },
  { idx: 31, name: 'Pune', kind: 'street', group: 'green', price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275] },
  { idx: 32, name: 'Gurugram', kind: 'street', group: 'green', price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275] },
  { idx: 33, name: 'Community Chest', kind: 'chest' },
  { idx: 34, name: 'Noida', kind: 'street', group: 'green', price: 320, houseCost: 200, rent: [28, 150, 450, 1000, 1200, 1400] },
  { idx: 35, name: 'Bengaluru Airport', kind: 'railroad', price: 200 },
  { idx: 36, name: 'Chance', kind: 'chance' },
  { idx: 37, name: 'Connaught Place', kind: 'street', group: 'darkblue', price: 350, houseCost: 200, rent: [35, 175, 500, 1100, 1300, 1500] },
  { idx: 38, name: 'Luxury Tax', kind: 'tax', tax: 100 },
  { idx: 39, name: 'Marine Drive', kind: 'street', group: 'darkblue', price: 400, houseCost: 200, rent: [50, 200, 600, 1400, 1700, 2000] },
];

export const RAILROADS = BOARD.filter((s) => s.kind === 'railroad').map((s) => s.idx);
export const UTILITIES = BOARD.filter((s) => s.kind === 'utility').map((s) => s.idx);
export const JAIL_IDX = 10;
export const GO_SALARY = 200;
export const JAIL_FINE = 50;

/** Spaces in a color group. */
export function groupSpaces(group: string): number[] {
  return BOARD.filter((s) => s.group === group).map((s) => s.idx);
}

/** Hex colors for the visual board bars per group. */
export const GROUP_COLOR: Record<string, string> = {
  brown: '#955436',
  lightblue: '#aae0fa',
  pink: '#d93a96',
  orange: '#f7941d',
  red: '#ed1b24',
  yellow: '#fef200',
  green: '#1fb25a',
  darkblue: '#0072bb',
};

/** Mortgage value = price / 2 (all standard spaces). */
export function mortgageValue(def: SpaceDef): number {
  return def.mortgage ?? Math.floor((def.price ?? 0) / 2);
}
