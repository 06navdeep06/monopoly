// ═══════════════════════════════════════════════════════════════
// BOT AI — Decision engine for 3 difficulty levels
// ═══════════════════════════════════════════════════════════════

import type { BotDecision, GameState, PlayerState, PropertyState, ColorGroup } from '@/types/game';
import { BOARD_SPACES, getColorGroupSpaces } from './board-data';
import { canBuildHouse, canBuildHotel, doesPlayerOwnFullGroup, canMortgage } from './property-rules';

type BotContext = 'buy_decision' | 'auction' | 'action_phase' | 'jail_decision';

interface BotDecisionParams {
  botPlayer: PlayerState;
  gameState: GameState;
  propertyStates: PropertyState[];
  allPlayerStates: PlayerState[];
  difficulty: 'easy' | 'medium' | 'hard';
  context: BotContext;
  currentPropertyId?: number;
  currentAuctionPrice?: number;
}

/**
 * Main bot decision entry point.
 * Dispatches to difficulty-specific strategies.
 */
export function makeBotDecision(params: BotDecisionParams): BotDecision {
  const { difficulty, context } = params;

  switch (context) {
    case 'buy_decision':
      return decideBuy(params);
    case 'auction':
      return decideAuction(params);
    case 'action_phase':
      return decideAction(params);
    case 'jail_decision':
      return decideJail(params);
    default:
      return { action: 'end_turn' };
  }
}

// ─── Buy Decision ────────────────────────────────────────────

function decideBuy(params: BotDecisionParams): BotDecision {
  const { botPlayer, propertyStates, difficulty, currentPropertyId } = params;

  if (currentPropertyId === undefined) return { action: 'skip' };

  const space = BOARD_SPACES[currentPropertyId];
  if (!space?.price) return { action: 'skip' };

  if (botPlayer.cash < space.price) return { action: 'skip' };

  switch (difficulty) {
    case 'easy':
      return easyBuyDecision(botPlayer, space.price);
    case 'medium':
      return mediumBuyDecision(botPlayer, space.price, currentPropertyId, propertyStates);
    case 'hard':
      return hardBuyDecision(botPlayer, space.price, currentPropertyId, propertyStates, params.allPlayerStates);
    default:
      return { action: 'skip' };
  }
}

function easyBuyDecision(player: PlayerState, price: number): BotDecision {
  if (player.cash >= price && Math.random() > 0.3) {
    return { action: 'buy', params: {} };
  }
  return { action: 'skip' };
}

function mediumBuyDecision(
  player: PlayerState,
  price: number,
  propertyId: number,
  propertyStates: PropertyState[]
): BotDecision {
  const space = BOARD_SPACES[propertyId];
  if (!space) return { action: 'skip' };

  if (player.cash < price * 1.5) {
    if (space.color_group && wouldCompleteGroup(player.player_id, space.color_group, propertyId, propertyStates)) {
      return { action: 'buy', params: {} };
    }
    return { action: 'skip' };
  }

  return { action: 'buy', params: {} };
}

function hardBuyDecision(
  player: PlayerState,
  price: number,
  propertyId: number,
  propertyStates: PropertyState[],
  allPlayerStates: PlayerState[]
): BotDecision {
  const space = BOARD_SPACES[propertyId];
  if (!space) return { action: 'skip' };

  if (space.color_group && wouldCompleteGroup(player.player_id, space.color_group, propertyId, propertyStates)) {
    if (player.cash >= price) {
      return { action: 'buy', params: {} };
    }
  }

  if (space.color_group && wouldBlockOpponent(player.player_id, space.color_group, propertyId, propertyStates)) {
    if (player.cash >= price * 1.2) {
      return { action: 'buy', params: {} };
    }
  }

  if (space.type === 'railroad' || space.type === 'utility') {
    if (player.cash >= price * 2) {
      return { action: 'buy', params: {} };
    }
  }

  if (player.cash >= price * 2.5) {
    return { action: 'buy', params: {} };
  }

  return { action: 'skip' };
}

// ─── Auction Decision ────────────────────────────────────────

function decideAuction(params: BotDecisionParams): BotDecision {
  const { botPlayer, difficulty, currentPropertyId, currentAuctionPrice } = params;

  if (currentPropertyId === undefined) return { action: 'skip' };

  const space = BOARD_SPACES[currentPropertyId];
  if (!space?.price) return { action: 'skip' };

  const currentBid = currentAuctionPrice ?? 0;
  let maxBid: number;

  switch (difficulty) {
    case 'easy':
      maxBid = Math.floor(space.price * 0.7);
      break;
    case 'medium':
      maxBid = space.price;
      break;
    case 'hard': {
      const multiplier = wouldCompleteGroup(
        botPlayer.player_id,
        space.color_group as ColorGroup,
        currentPropertyId,
        params.propertyStates
      ) ? 1.5 : 1.1;
      maxBid = Math.floor(space.price * multiplier);
      break;
    }
  }

  const bidAmount = currentBid + getBidIncrement(currentBid);

  if (bidAmount <= maxBid && bidAmount <= botPlayer.cash * 0.8) {
    return { action: 'bid', params: { amount: bidAmount } };
  }

  return { action: 'skip' };
}

function getBidIncrement(currentBid: number): number {
  if (currentBid < 100) return 10;
  if (currentBid < 300) return 25;
  return 50;
}

// ─── Action Phase Decision ───────────────────────────────────

function decideAction(params: BotDecisionParams): BotDecision {
  const { botPlayer, propertyStates, gameState, difficulty } = params;

  if (difficulty === 'easy') {
    return { action: 'end_turn' };
  }

  const buildTarget = findBestBuildTarget(botPlayer, propertyStates, gameState);
  if (buildTarget !== null) {
    const space = BOARD_SPACES[buildTarget];
    if (space) {
      const propState = propertyStates.find((p) => p.property_id === buildTarget);
      if (propState && propState.houses === 4) {
        const hotelResult = canBuildHotel(buildTarget, botPlayer, propertyStates, gameState);
        if (hotelResult.can) {
          return { action: 'build', params: { propertyId: buildTarget, type: 'hotel' } };
        }
      }

      const houseResult = canBuildHouse(buildTarget, botPlayer, propertyStates, gameState);
      if (houseResult.can) {
        return { action: 'build', params: { propertyId: buildTarget, type: 'house' } };
      }
    }
  }

  if (difficulty === 'hard') {
    const unmortgageTarget = findUnmortgageTarget(botPlayer, propertyStates);
    if (unmortgageTarget !== null) {
      return { action: 'unmortgage', params: { propertyId: unmortgageTarget } };
    }
  }

  return { action: 'end_turn' };
}

function findBestBuildTarget(
  player: PlayerState,
  propertyStates: PropertyState[],
  gameState: GameState
): number | null {
  const ownedProperties = propertyStates.filter((p) => p.owner_id === player.player_id);

  for (const prop of ownedProperties) {
    const space = BOARD_SPACES[prop.property_id];
    if (!space?.color_group) continue;

    if (!doesPlayerOwnFullGroup(player.player_id, space.color_group, propertyStates)) continue;

    if (prop.houses < 3 && player.cash > (space.house_cost ?? 0) * 2) {
      const result = canBuildHouse(prop.property_id, player, propertyStates, gameState);
      if (result.can) return prop.property_id;
    }
  }

  return null;
}

function findUnmortgageTarget(
  player: PlayerState,
  propertyStates: PropertyState[]
): number | null {
  const mortgaged = propertyStates.filter(
    (p) => p.owner_id === player.player_id && p.is_mortgaged
  );

  for (const prop of mortgaged) {
    const space = BOARD_SPACES[prop.property_id];
    if (!space) continue;

    const unmortgageCost = Math.ceil((space.mortgage_value ?? 0) * 1.1);
    if (player.cash > unmortgageCost * 3) {
      return prop.property_id;
    }
  }

  return null;
}

// ─── Jail Decision ───────────────────────────────────────────

function decideJail(params: BotDecisionParams): BotDecision {
  const { botPlayer, difficulty } = params;

  if (botPlayer.get_out_of_jail_cards > 0) {
    return { action: 'skip', params: { jailDecision: 'card' } };
  }

  switch (difficulty) {
    case 'easy':
      return Math.random() > 0.5
        ? { action: 'skip', params: { jailDecision: 'pay' } }
        : { action: 'skip', params: { jailDecision: 'roll' } };

    case 'medium':
      if (botPlayer.cash > 500) {
        return { action: 'skip', params: { jailDecision: 'pay' } };
      }
      return { action: 'skip', params: { jailDecision: 'roll' } };

    case 'hard':
      if (botPlayer.jail_turns_remaining <= 1) {
        return { action: 'skip', params: { jailDecision: 'pay' } };
      }
      if (botPlayer.cash > 1000) {
        return { action: 'skip', params: { jailDecision: 'pay' } };
      }
      return { action: 'skip', params: { jailDecision: 'roll' } };
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function wouldCompleteGroup(
  playerId: string,
  colorGroup: ColorGroup | undefined,
  targetPropertyId: number,
  propertyStates: PropertyState[]
): boolean {
  if (!colorGroup) return false;

  const groupSpaces = getColorGroupSpaces(colorGroup);
  return groupSpaces.every((space) => {
    if (space.id === targetPropertyId) return true;
    const ps = propertyStates.find((p) => p.property_id === space.id);
    return ps?.owner_id === playerId;
  });
}

function wouldBlockOpponent(
  playerId: string,
  colorGroup: ColorGroup | undefined,
  _targetPropertyId: number,
  propertyStates: PropertyState[]
): boolean {
  if (!colorGroup) return false;

  const groupSpaces = getColorGroupSpaces(colorGroup);
  const otherOwners = new Set<string>();

  for (const space of groupSpaces) {
    const ps = propertyStates.find((p) => p.property_id === space.id);
    if (ps?.owner_id && ps.owner_id !== playerId) {
      otherOwners.add(ps.owner_id);
    }
  }

  for (const owner of otherOwners) {
    const ownerCount = groupSpaces.filter((s) => {
      const ps = propertyStates.find((p) => p.property_id === s.id);
      return ps?.owner_id === owner;
    }).length;

    if (ownerCount >= groupSpaces.length - 1) {
      return true;
    }
  }

  return false;
}
