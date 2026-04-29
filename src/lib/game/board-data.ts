import type { BoardSpace, ColorGroup } from '@/types/game';

/** Complete 40-space Monopoly board definition with standard pricing */
export const BOARD_SPACES: BoardSpace[] = [
  // ─── BOTTOM ROW (right to left: spaces 0-10) ──────────────
  {
    id: 0, type: 'go', name: 'GO',
    rent: [], position: { row: 'bottom', index: 0 },
  },
  {
    id: 1, type: 'property', name: 'Mediterranean Avenue',
    color_group: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250],
    mortgage_value: 30, house_cost: 50, hotel_cost: 50,
    position: { row: 'bottom', index: 1 },
  },
  {
    id: 2, type: 'community_chest', name: 'Community Chest',
    rent: [], position: { row: 'bottom', index: 2 },
  },
  {
    id: 3, type: 'property', name: 'Baltic Avenue',
    color_group: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450],
    mortgage_value: 30, house_cost: 50, hotel_cost: 50,
    position: { row: 'bottom', index: 3 },
  },
  {
    id: 4, type: 'tax', name: 'Income Tax',
    rent: [], tax_amount: 200,
    position: { row: 'bottom', index: 4 },
  },
  {
    id: 5, type: 'railroad', name: 'Reading Railroad',
    price: 200, rent: [25, 50, 100, 200], mortgage_value: 100,
    position: { row: 'bottom', index: 5 },
  },
  {
    id: 6, type: 'property', name: 'Oriental Avenue',
    color_group: 'light_blue', price: 100, rent: [6, 30, 90, 270, 400, 550],
    mortgage_value: 50, house_cost: 50, hotel_cost: 50,
    position: { row: 'bottom', index: 6 },
  },
  {
    id: 7, type: 'chance', name: 'Chance',
    rent: [], position: { row: 'bottom', index: 7 },
  },
  {
    id: 8, type: 'property', name: 'Vermont Avenue',
    color_group: 'light_blue', price: 100, rent: [6, 30, 90, 270, 400, 550],
    mortgage_value: 50, house_cost: 50, hotel_cost: 50,
    position: { row: 'bottom', index: 8 },
  },
  {
    id: 9, type: 'property', name: 'Connecticut Avenue',
    color_group: 'light_blue', price: 120, rent: [8, 40, 100, 300, 450, 600],
    mortgage_value: 60, house_cost: 50, hotel_cost: 50,
    position: { row: 'bottom', index: 9 },
  },
  {
    id: 10, type: 'jail_visit', name: 'Just Visiting / Jail',
    rent: [], position: { row: 'bottom', index: 10 },
  },

  // ─── LEFT SIDE (bottom to top: spaces 11-19) ──────────────
  {
    id: 11, type: 'property', name: 'St. Charles Place',
    color_group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750],
    mortgage_value: 70, house_cost: 100, hotel_cost: 100,
    position: { row: 'left', index: 0 },
  },
  {
    id: 12, type: 'utility', name: 'Electric Company',
    price: 150, rent: [4, 10], mortgage_value: 75,
    position: { row: 'left', index: 1 },
  },
  {
    id: 13, type: 'property', name: 'States Avenue',
    color_group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750],
    mortgage_value: 70, house_cost: 100, hotel_cost: 100,
    position: { row: 'left', index: 2 },
  },
  {
    id: 14, type: 'property', name: 'Virginia Avenue',
    color_group: 'pink', price: 160, rent: [12, 60, 180, 500, 700, 900],
    mortgage_value: 80, house_cost: 100, hotel_cost: 100,
    position: { row: 'left', index: 3 },
  },
  {
    id: 15, type: 'railroad', name: 'Pennsylvania Railroad',
    price: 200, rent: [25, 50, 100, 200], mortgage_value: 100,
    position: { row: 'left', index: 4 },
  },
  {
    id: 16, type: 'property', name: 'St. James Place',
    color_group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950],
    mortgage_value: 90, house_cost: 100, hotel_cost: 100,
    position: { row: 'left', index: 5 },
  },
  {
    id: 17, type: 'community_chest', name: 'Community Chest',
    rent: [], position: { row: 'left', index: 6 },
  },
  {
    id: 18, type: 'property', name: 'Tennessee Avenue',
    color_group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950],
    mortgage_value: 90, house_cost: 100, hotel_cost: 100,
    position: { row: 'left', index: 7 },
  },
  {
    id: 19, type: 'property', name: 'New York Avenue',
    color_group: 'orange', price: 200, rent: [16, 80, 220, 600, 800, 1000],
    mortgage_value: 100, house_cost: 100, hotel_cost: 100,
    position: { row: 'left', index: 8 },
  },

  // ─── TOP ROW (left to right: spaces 20-30) ────────────────
  {
    id: 20, type: 'free_parking', name: 'Free Parking',
    rent: [], position: { row: 'top', index: 0 },
  },
  {
    id: 21, type: 'property', name: 'Kentucky Avenue',
    color_group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050],
    mortgage_value: 110, house_cost: 150, hotel_cost: 150,
    position: { row: 'top', index: 1 },
  },
  {
    id: 22, type: 'chance', name: 'Chance',
    rent: [], position: { row: 'top', index: 2 },
  },
  {
    id: 23, type: 'property', name: 'Indiana Avenue',
    color_group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050],
    mortgage_value: 110, house_cost: 150, hotel_cost: 150,
    position: { row: 'top', index: 3 },
  },
  {
    id: 24, type: 'property', name: 'Illinois Avenue',
    color_group: 'red', price: 240, rent: [20, 100, 300, 750, 925, 1100],
    mortgage_value: 120, house_cost: 150, hotel_cost: 150,
    position: { row: 'top', index: 4 },
  },
  {
    id: 25, type: 'railroad', name: 'B. & O. Railroad',
    price: 200, rent: [25, 50, 100, 200], mortgage_value: 100,
    position: { row: 'top', index: 5 },
  },
  {
    id: 26, type: 'property', name: 'Atlantic Avenue',
    color_group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150],
    mortgage_value: 130, house_cost: 150, hotel_cost: 150,
    position: { row: 'top', index: 6 },
  },
  {
    id: 27, type: 'property', name: 'Ventnor Avenue',
    color_group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150],
    mortgage_value: 130, house_cost: 150, hotel_cost: 150,
    position: { row: 'top', index: 7 },
  },
  {
    id: 28, type: 'utility', name: 'Water Works',
    price: 150, rent: [4, 10], mortgage_value: 75,
    position: { row: 'top', index: 8 },
  },
  {
    id: 29, type: 'property', name: 'Marvin Gardens',
    color_group: 'yellow', price: 280, rent: [24, 120, 360, 850, 1025, 1200],
    mortgage_value: 140, house_cost: 150, hotel_cost: 150,
    position: { row: 'top', index: 9 },
  },
  {
    id: 30, type: 'go_to_jail', name: 'Go To Jail',
    rent: [], position: { row: 'top', index: 10 },
  },

  // ─── RIGHT SIDE (top to bottom: spaces 31-39) ─────────────
  {
    id: 31, type: 'property', name: 'Pacific Avenue',
    color_group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275],
    mortgage_value: 150, house_cost: 200, hotel_cost: 200,
    position: { row: 'right', index: 0 },
  },
  {
    id: 32, type: 'property', name: 'North Carolina Avenue',
    color_group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275],
    mortgage_value: 150, house_cost: 200, hotel_cost: 200,
    position: { row: 'right', index: 1 },
  },
  {
    id: 33, type: 'community_chest', name: 'Community Chest',
    rent: [], position: { row: 'right', index: 2 },
  },
  {
    id: 34, type: 'property', name: 'Pennsylvania Avenue',
    color_group: 'green', price: 320, rent: [28, 150, 450, 1000, 1200, 1400],
    mortgage_value: 160, house_cost: 200, hotel_cost: 200,
    position: { row: 'right', index: 3 },
  },
  {
    id: 35, type: 'railroad', name: 'Short Line',
    price: 200, rent: [25, 50, 100, 200], mortgage_value: 100,
    position: { row: 'right', index: 4 },
  },
  {
    id: 36, type: 'chance', name: 'Chance',
    rent: [], position: { row: 'right', index: 5 },
  },
  {
    id: 37, type: 'property', name: 'Park Place',
    color_group: 'dark_blue', price: 350, rent: [35, 175, 500, 1100, 1300, 1500],
    mortgage_value: 175, house_cost: 200, hotel_cost: 200,
    position: { row: 'right', index: 6 },
  },
  {
    id: 38, type: 'tax', name: 'Luxury Tax',
    rent: [], tax_amount: 100,
    position: { row: 'right', index: 7 },
  },
  {
    id: 39, type: 'property', name: 'Boardwalk',
    color_group: 'dark_blue', price: 400, rent: [50, 200, 600, 1400, 1700, 2000],
    mortgage_value: 200, house_cost: 200, hotel_cost: 200,
    position: { row: 'right', index: 8 },
  },
];

/** Color group display configuration */
export const COLOR_GROUP_CONFIG: Record<ColorGroup, { hex: string; label: string; count: number }> = {
  brown:      { hex: '#8B4513', label: 'Brown', count: 2 },
  light_blue: { hex: '#87CEEB', label: 'Light Blue', count: 3 },
  pink:       { hex: '#FF69B4', label: 'Pink', count: 3 },
  orange:     { hex: '#FF8C00', label: 'Orange', count: 3 },
  red:        { hex: '#EF4444', label: 'Red', count: 3 },
  yellow:     { hex: '#F59E0B', label: 'Yellow', count: 3 },
  green:      { hex: '#10B981', label: 'Green', count: 3 },
  dark_blue:  { hex: '#1E40AF', label: 'Dark Blue', count: 2 },
};

/** Railroad space IDs */
export const RAILROAD_IDS = [5, 15, 25, 35] as const;

/** Utility space IDs */
export const UTILITY_IDS = [12, 28] as const;

/** Get all spaces belonging to a color group */
export function getColorGroupSpaces(group: ColorGroup): BoardSpace[] {
  return BOARD_SPACES.filter((s) => s.color_group === group);
}

/** Get board space by ID */
export function getBoardSpace(id: number): BoardSpace | undefined {
  return BOARD_SPACES[id];
}

/** Total number of board spaces */
export const BOARD_SIZE = 40;

/** Go salary amount */
export const GO_SALARY = 200;

/** Jail position */
export const JAIL_POSITION = 10;

/** Go To Jail position */
export const GO_TO_JAIL_POSITION = 30;
