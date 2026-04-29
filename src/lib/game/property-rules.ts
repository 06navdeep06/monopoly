// ═══════════════════════════════════════════════════════════════
// PROPERTY RULES — Buy, build, mortgage, unmortgage validation
// ═══════════════════════════════════════════════════════════════

import type { BoardSpace, ColorGroup, GameState, PlayerState, PropertyState } from '@/types/game';
import { BOARD_SPACES, getColorGroupSpaces } from './board-data';

interface ValidationResult {
  can: boolean;
  reason?: string;
}

/** Check if a player can buy an unowned property */
export function canBuy(
  space: BoardSpace,
  playerState: PlayerState,
  _gameState: GameState
): ValidationResult {
  if (!space.price) {
    return { can: false, reason: 'This space is not purchasable' };
  }
  if (playerState.cash < space.price) {
    return { can: false, reason: `Insufficient funds. Need $${space.price}, have $${playerState.cash}` };
  }
  return { can: true };
}

/**
 * Check if a player can build a house on a property.
 * Requirements:
 * 1. Player owns all properties in the color group
 * 2. No properties in the group are mortgaged
 * 3. Even building rule: cannot build unless all others in group have >= this many houses
 * 4. Current houses < 4 (house limit per property)
 * 5. Bank has houses available
 * 6. Player can afford it
 */
export function canBuildHouse(
  spaceId: number,
  playerState: PlayerState,
  allPropertyStates: PropertyState[],
  gameState: GameState
): ValidationResult {
  const space = BOARD_SPACES[spaceId];
  if (!space || space.type !== 'property' || !space.color_group) {
    return { can: false, reason: 'Cannot build on this space' };
  }

  const propState = allPropertyStates.find((p) => p.property_id === spaceId);
  if (!propState || propState.owner_id !== playerState.player_id) {
    return { can: false, reason: 'You do not own this property' };
  }

  if (!doesPlayerOwnFullGroup(playerState.player_id, space.color_group, allPropertyStates)) {
    return { can: false, reason: 'You must own all properties in the color group' };
  }

  const groupSpaces = getColorGroupSpaces(space.color_group);
  const groupStates = groupSpaces.map((gs) =>
    allPropertyStates.find((p) => p.property_id === gs.id)
  );

  if (groupStates.some((gs) => gs?.is_mortgaged)) {
    return { can: false, reason: 'Cannot build while any property in the group is mortgaged' };
  }

  if (propState.houses >= 4) {
    return { can: false, reason: 'Maximum houses reached. Build a hotel instead.' };
  }

  const minHouses = Math.min(...groupStates.map((gs) => gs?.houses ?? 0));
  if (propState.houses > minHouses) {
    return { can: false, reason: 'Must build evenly. Build on other properties in the group first.' };
  }

  if (gameState.bank_houses_remaining <= 0) {
    return { can: false, reason: 'No houses available in the bank' };
  }

  const cost = space.house_cost ?? 0;
  if (playerState.cash < cost) {
    return { can: false, reason: `Insufficient funds. Need $${cost}` };
  }

  return { can: true };
}

/**
 * Check if a player can build a hotel.
 * Requires 4 houses on this property and all others in the group must have 4+ houses.
 */
export function canBuildHotel(
  spaceId: number,
  playerState: PlayerState,
  allPropertyStates: PropertyState[],
  gameState: GameState
): ValidationResult {
  const space = BOARD_SPACES[spaceId];
  if (!space || space.type !== 'property' || !space.color_group) {
    return { can: false, reason: 'Cannot build on this space' };
  }

  const propState = allPropertyStates.find((p) => p.property_id === spaceId);
  if (!propState || propState.owner_id !== playerState.player_id) {
    return { can: false, reason: 'You do not own this property' };
  }

  if (propState.houses !== 4) {
    return { can: false, reason: 'Must have 4 houses before building a hotel' };
  }

  if (!doesPlayerOwnFullGroup(playerState.player_id, space.color_group, allPropertyStates)) {
    return { can: false, reason: 'You must own all properties in the color group' };
  }

  const groupSpaces = getColorGroupSpaces(space.color_group);
  const groupStates = groupSpaces.map((gs) =>
    allPropertyStates.find((p) => p.property_id === gs.id)
  );

  if (groupStates.some((gs) => gs?.is_mortgaged)) {
    return { can: false, reason: 'Cannot build while any property in the group is mortgaged' };
  }

  const allHave4OrHotel = groupStates.every((gs) => (gs?.houses ?? 0) >= 4);
  if (!allHave4OrHotel) {
    return { can: false, reason: 'All properties in the group must have 4 houses first' };
  }

  if (gameState.bank_hotels_remaining <= 0) {
    return { can: false, reason: 'No hotels available in the bank' };
  }

  const cost = space.hotel_cost ?? 0;
  if (playerState.cash < cost) {
    return { can: false, reason: `Insufficient funds. Need $${cost}` };
  }

  return { can: true };
}

/**
 * Check if a property can be mortgaged.
 * Cannot mortgage if any property in the color group has houses.
 */
export function canMortgage(
  spaceId: number,
  propertyState: PropertyState,
  allPropertyStates: PropertyState[]
): ValidationResult {
  const space = BOARD_SPACES[spaceId];
  if (!space) return { can: false, reason: 'Invalid space' };

  if (propertyState.is_mortgaged) {
    return { can: false, reason: 'Property is already mortgaged' };
  }

  if (space.color_group) {
    const groupSpaces = getColorGroupSpaces(space.color_group);
    const hasBuildings = groupSpaces.some((gs) => {
      const ps = allPropertyStates.find((p) => p.property_id === gs.id);
      return ps && ps.houses > 0;
    });

    if (hasBuildings) {
      return { can: false, reason: 'Must sell all houses/hotels in the color group before mortgaging' };
    }
  }

  return { can: true };
}

/** Check if a property can be unmortgaged */
export function canUnmortgage(
  spaceId: number,
  playerState: PlayerState,
  propertyState: PropertyState
): ValidationResult {
  if (!propertyState.is_mortgaged) {
    return { can: false, reason: 'Property is not mortgaged' };
  }

  const space = BOARD_SPACES[spaceId];
  if (!space) return { can: false, reason: 'Invalid space' };

  const cost = getUnmortgageCost(space);
  if (playerState.cash < cost) {
    return { can: false, reason: `Insufficient funds. Need $${cost} to unmortgage` };
  }

  return { can: true };
}

/** Mortgage value = purchase price / 2 */
export function getMortgageValue(space: BoardSpace): number {
  return space.mortgage_value ?? Math.floor((space.price ?? 0) / 2);
}

/** Unmortgage cost = mortgage value × 1.1 (10% interest, rounded up) */
export function getUnmortgageCost(space: BoardSpace): number {
  return Math.ceil(getMortgageValue(space) * 1.1);
}

/** House build cost from board data */
export function getBuildCost(space: BoardSpace): number {
  return space.house_cost ?? 0;
}

/** Selling a house returns half the build cost */
export function getSellHouseCost(space: BoardSpace): number {
  return Math.floor(getBuildCost(space) / 2);
}

/** Get all properties belonging to a color group */
export function getColorGroupProperties(
  colorGroup: ColorGroup,
  allSpaces: BoardSpace[] = BOARD_SPACES
): BoardSpace[] {
  return allSpaces.filter((s) => s.color_group === colorGroup);
}

/** Check if a player owns all properties in a color group */
export function doesPlayerOwnFullGroup(
  playerId: string,
  colorGroup: ColorGroup,
  propertyStates: PropertyState[],
  allSpaces: BoardSpace[] = BOARD_SPACES
): boolean {
  const groupSpaces = getColorGroupProperties(colorGroup, allSpaces);
  return groupSpaces.every((space) => {
    const ps = propertyStates.find((p) => p.property_id === space.id);
    return ps?.owner_id === playerId;
  });
}

/**
 * Check if a player can sell a house from a property.
 * Must sell evenly — can only sell if this property has the most (or tied for most) houses.
 */
export function canSellHouse(
  spaceId: number,
  allPropertyStates: PropertyState[]
): ValidationResult {
  const space = BOARD_SPACES[spaceId];
  if (!space || !space.color_group) {
    return { can: false, reason: 'Invalid property' };
  }

  const propState = allPropertyStates.find((p) => p.property_id === spaceId);
  if (!propState || propState.houses <= 0) {
    return { can: false, reason: 'No houses to sell' };
  }

  const groupSpaces = getColorGroupSpaces(space.color_group);
  const maxHouses = Math.max(
    ...groupSpaces.map((gs) => {
      const ps = allPropertyStates.find((p) => p.property_id === gs.id);
      return ps?.houses ?? 0;
    })
  );

  if (propState.houses < maxHouses) {
    return { can: false, reason: 'Must sell evenly. Sell from properties with more houses first.' };
  }

  return { can: true };
}
