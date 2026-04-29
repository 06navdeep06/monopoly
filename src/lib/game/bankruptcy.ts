// ═══════════════════════════════════════════════════════════════
// BANKRUPTCY RESOLUTION — Asset liquidation and transfer
// ═══════════════════════════════════════════════════════════════

import type { BankruptcyResult, GameState, PlayerState, PropertyState } from '@/types/game';
import { BOARD_SPACES } from './board-data';
import { getSellHouseCost } from './property-rules';

interface BankruptcyParams {
  bankruptPlayerId: string;
  creditorId: string | 'bank';
  debt: number;
  playerStates: PlayerState[];
  propertyStates: PropertyState[];
  gameState: GameState;
}

/**
 * Resolve bankruptcy for a player who cannot pay a debt.
 *
 * Flow:
 * 1. Calculate total liquidation value (sell all houses at half price)
 * 2. Transfer assets to creditor (or auction if bank)
 * 3. Mark player bankrupt
 * 4. Check if game is over (1 player remaining)
 */
export function resolveBankruptcy(params: BankruptcyParams): BankruptcyResult {
  const { bankruptPlayerId, creditorId, playerStates, propertyStates } = params;

  const bankruptPlayer = playerStates.find((p) => p.player_id === bankruptPlayerId);
  if (!bankruptPlayer) {
    throw new Error(`Player ${bankruptPlayerId} not found`);
  }

  const ownedProperties = propertyStates.filter(
    (p) => p.owner_id === bankruptPlayerId
  );

  const houseLiquidation = calculateHouseLiquidation(ownedProperties);
  const totalCash = bankruptPlayer.cash + houseLiquidation;
  const propertyIds = ownedProperties.map((p) => p.property_id);

  const activePlayers = playerStates.filter(
    (p) => !p.is_bankrupt && p.player_id !== bankruptPlayerId
  );

  const gameOver = activePlayers.length <= 1;
  const winner = gameOver ? activePlayers[0]?.player_id : undefined;

  return {
    bankruptPlayer: bankruptPlayerId,
    creditor: creditorId,
    assetsTransferred: {
      properties: propertyIds,
      cash: totalCash,
      gooj_cards: bankruptPlayer.get_out_of_jail_cards,
    },
    gameOver,
    winner,
  };
}

/** Calculate total cash from selling all houses/hotels at half price */
function calculateHouseLiquidation(ownedProperties: PropertyState[]): number {
  let total = 0;

  for (const prop of ownedProperties) {
    if (prop.houses > 0) {
      const space = BOARD_SPACES[prop.property_id];
      if (space) {
        if (prop.houses === 5) {
          const hotelRefund = getSellHouseCost(space);
          const housesRefund = 4 * getSellHouseCost(space);
          total += hotelRefund + housesRefund;
        } else {
          total += prop.houses * getSellHouseCost(space);
        }
      }
    }
  }

  return total;
}

/**
 * Check if a player can avoid bankruptcy by selling assets.
 * Returns the maximum cash they could raise.
 */
export function calculateMaxLiquidation(
  playerId: string,
  playerState: PlayerState,
  propertyStates: PropertyState[]
): number {
  let total = playerState.cash;

  const ownedProperties = propertyStates.filter((p) => p.owner_id === playerId);

  for (const prop of ownedProperties) {
    const space = BOARD_SPACES[prop.property_id];
    if (!space) continue;

    if (prop.houses > 0) {
      if (prop.houses === 5) {
        total += getSellHouseCost(space) * 5;
      } else {
        total += prop.houses * getSellHouseCost(space);
      }
    }

    if (!prop.is_mortgaged) {
      total += space.mortgage_value ?? Math.floor((space.price ?? 0) / 2);
    }
  }

  return total;
}

/** Check if only one active player remains */
export function isGameOver(playerStates: PlayerState[]): boolean {
  const activePlayers = playerStates.filter((p) => !p.is_bankrupt);
  return activePlayers.length <= 1;
}

/** Get the winner (last player standing) */
export function getWinner(playerStates: PlayerState[]): string | null {
  const activePlayers = playerStates.filter((p) => !p.is_bankrupt);
  if (activePlayers.length === 1) {
    return activePlayers[0]?.player_id ?? null;
  }
  return null;
}
