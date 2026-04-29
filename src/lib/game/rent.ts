// ═══════════════════════════════════════════════════════════════
// RENT CALCULATION ENGINE — All Monopoly rent rules
// ═══════════════════════════════════════════════════════════════

import type { BoardSpace, PropertyState } from '@/types/game';
import { BOARD_SPACES, RAILROAD_IDS, UTILITY_IDS, getColorGroupSpaces } from './board-data';

interface CalculateRentParams {
  space: BoardSpace;
  propertyState: PropertyState;
  allPropertyStates: PropertyState[];
  diceRoll?: number;
  ownerRoomPlayerId: string;
}

/**
 * Calculate rent owed when landing on a property.
 *
 * Rules:
 * - Mortgaged property: $0 rent
 * - Standard property with no houses: base rent (index 0)
 * - Full color group owned, no houses on any in group: 2× base rent
 * - Houses 1-4: rent from board data index 1-4
 * - Hotel (houses === 5): rent from board data index 5
 * - Railroad: $25 × 2^(count-1) where count = # railroads owned by same player
 * - Utility: dice × 4 (one owned) or dice × 10 (both owned)
 */
export function calculateRent(params: CalculateRentParams): number {
  const { space, propertyState, allPropertyStates, diceRoll, ownerRoomPlayerId } = params;

  if (propertyState.is_mortgaged) return 0;
  if (!propertyState.owner_id) return 0;

  switch (space.type) {
    case 'property':
      return calculatePropertyRent(space, propertyState, allPropertyStates, ownerRoomPlayerId);
    case 'railroad':
      return calculateRailroadRent(allPropertyStates, ownerRoomPlayerId);
    case 'utility':
      return calculateUtilityRent(allPropertyStates, ownerRoomPlayerId, diceRoll ?? 0);
    default:
      return 0;
  }
}

function calculatePropertyRent(
  space: BoardSpace,
  propertyState: PropertyState,
  allPropertyStates: PropertyState[],
  ownerId: string
): number {
  if (!space.rent || space.rent.length === 0) return 0;

  if (propertyState.houses > 0) {
    const rentIndex = Math.min(propertyState.houses, space.rent.length - 1);
    return space.rent[rentIndex] ?? 0;
  }

  const baseRent = space.rent[0] ?? 0;

  if (space.color_group && ownsFullColorGroup(ownerId, space.color_group, allPropertyStates)) {
    return baseRent * 2;
  }

  return baseRent;
}

function calculateRailroadRent(
  allPropertyStates: PropertyState[],
  ownerId: string
): number {
  const ownedRailroadCount = RAILROAD_IDS.filter((rId) => {
    const ps = allPropertyStates.find((p) => p.property_id === rId);
    return ps?.owner_id === ownerId && !ps.is_mortgaged;
  }).length;

  if (ownedRailroadCount === 0) return 0;
  return 25 * Math.pow(2, ownedRailroadCount - 1);
}

function calculateUtilityRent(
  allPropertyStates: PropertyState[],
  ownerId: string,
  diceRoll: number
): number {
  const ownedUtilityCount = UTILITY_IDS.filter((uId) => {
    const ps = allPropertyStates.find((p) => p.property_id === uId);
    return ps?.owner_id === ownerId && !ps.is_mortgaged;
  }).length;

  if (ownedUtilityCount === 0) return 0;
  const multiplier = ownedUtilityCount >= 2 ? 10 : 4;
  return diceRoll * multiplier;
}

/** Check if a player owns all properties in a color group (none mortgaged not required for ownership check) */
function ownsFullColorGroup(
  playerId: string,
  colorGroup: string,
  allPropertyStates: PropertyState[]
): boolean {
  const groupSpaces = getColorGroupSpaces(colorGroup as import('@/types/game').ColorGroup);
  return groupSpaces.every((space) => {
    const ps = allPropertyStates.find((p) => p.property_id === space.id);
    return ps?.owner_id === playerId;
  });
}

/**
 * Calculate rent for "Advance to nearest Railroad" Chance card.
 * Owner gets 2× normal railroad rent.
 */
export function calculateDoubleRailroadRent(
  allPropertyStates: PropertyState[],
  ownerId: string
): number {
  return calculateRailroadRent(allPropertyStates, ownerId) * 2;
}

/**
 * Calculate rent for "Advance to nearest Utility" Chance card.
 * Dice roll × 10 regardless of how many utilities owned.
 */
export function calculateChanceUtilityRent(diceRoll: number): number {
  return diceRoll * 10;
}
