// ═══════════════════════════════════════════════════════════════
// TURN MANAGER — Complete turn flow state machine
// ═══════════════════════════════════════════════════════════════

import type { BoardSpace, CardAction, GamePhase, GameState, PlayerState, PropertyState, RoomSettings } from '@/types/game';
import { BOARD_SIZE, BOARD_SPACES, GO_SALARY, GO_TO_JAIL_POSITION, JAIL_POSITION, getBoardSpace } from './board-data';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS, drawCard } from './card-data';
import { JAIL_FINE, MAX_JAIL_TURNS, getDiceTotal, isDoubles, processDiceRoll, rollDice } from './dice';
import { calculateRent } from './rent';
import { RAILROAD_IDS, UTILITY_IDS } from './board-data';

// ─── Turn Phase Transitions ─────────────────────────────────

export type TurnPhase =
  | 'roll'
  | 'doubles_roll'
  | 'action'
  | 'buy_decision'
  | 'auction'
  | 'trade'
  | 'jail_decision'
  | 'card_action'
  | 'end_turn';

export interface TurnAction {
  type: string;
  payload: Record<string, unknown>;
}

export interface TurnResult {
  newPhase: GamePhase;
  events: TurnEvent[];
  stateChanges: StateChange[];
}

export interface TurnEvent {
  type: string;
  data: Record<string, unknown>;
}

export interface StateChange {
  table: 'game_states' | 'player_states' | 'property_states' | 'transactions';
  operation: 'update' | 'insert';
  data: Record<string, unknown>;
}

// ─── Movement Logic ──────────────────────────────────────────

/**
 * Calculate new position after moving, handling board wrapping.
 * Returns new position and whether player passed Go.
 */
export function movePlayer(
  currentPosition: number,
  spaces: number
): { newPosition: number; passedGo: boolean } {
  const newPosition = (currentPosition + spaces) % BOARD_SIZE;
  const passedGo = currentPosition + spaces >= BOARD_SIZE;
  return { newPosition, passedGo };
}

/**
 * Move to a specific space (for cards). Check if passing Go.
 * passedGo is true only if the target is behind the current position
 * (i.e. we wrapped around the board) AND the card says to collect Go salary.
 * Landing exactly on Go (target 0) does NOT count as "passing" Go.
 */
export function moveToSpace(
  currentPosition: number,
  targetSpace: number,
  collectGo: boolean
): { newPosition: number; passedGo: boolean } {
  const passedGo = collectGo && targetSpace < currentPosition && targetSpace !== 0;
  return { newPosition: targetSpace, passedGo };
}

/**
 * Find nearest railroad from current position (moving forward).
 */
export function findNearestRailroad(currentPosition: number): number {
  for (const rr of RAILROAD_IDS) {
    if (rr > currentPosition) return rr;
  }
  return RAILROAD_IDS[0]!;
}

/**
 * Find nearest utility from current position (moving forward).
 */
export function findNearestUtility(currentPosition: number): number {
  for (const u of UTILITY_IDS) {
    if (u > currentPosition) return u;
  }
  return UTILITY_IDS[0]!;
}

// ─── Landing Resolution ─────────────────────────────────────

export interface LandingResult {
  nextPhase: GamePhase;
  rentOwed?: number;
  rentTo?: string;
  taxAmount?: number;
  cardDrawn?: { type: 'chance' | 'community_chest'; cardId: number; action: CardAction };
  goToJail?: boolean;
  canBuy?: boolean;
  freeParkingCollect?: number;
  passedGoSalary?: number;
}

/**
 * Resolve what happens when a player lands on a space.
 * This is the core dispatcher for all space types.
 */
export function resolveLanding(
  space: BoardSpace,
  playerId: string,
  playerState: PlayerState,
  allPropertyStates: PropertyState[],
  gameState: GameState,
  settings: RoomSettings,
  diceTotal: number
): LandingResult {
  const result: LandingResult = { nextPhase: 'action' };

  switch (space.type) {
    case 'go':
      result.nextPhase = 'action';
      break;

    case 'property':
    case 'railroad':
    case 'utility': {
      const propState = allPropertyStates.find((p) => p.property_id === space.id);

      if (!propState?.owner_id) {
        result.nextPhase = 'buy';
        result.canBuy = true;
      } else if (propState.owner_id !== playerId) {
        if (!propState.is_mortgaged) {
          const rent = calculateRent({
            space,
            propertyState: propState,
            allPropertyStates,
            diceRoll: diceTotal,
            ownerRoomPlayerId: propState.owner_id,
          });
          result.rentOwed = rent;
          result.rentTo = propState.owner_id;
        }
        result.nextPhase = 'action';
      } else {
        result.nextPhase = 'action';
      }
      break;
    }

    case 'tax': {
      result.taxAmount = space.tax_amount ?? 0;
      result.nextPhase = 'action';
      break;
    }

    case 'chance': {
      const drawn = drawCard(
        gameState.chance_deck,
        gameState.chance_index,
        CHANCE_CARDS
      );
      result.cardDrawn = {
        type: 'chance',
        cardId: drawn.card.id,
        action: drawn.card.action,
      };
      result.nextPhase = 'action';
      break;
    }

    case 'community_chest': {
      const drawn = drawCard(
        gameState.community_chest_deck,
        gameState.community_chest_index,
        COMMUNITY_CHEST_CARDS
      );
      result.cardDrawn = {
        type: 'community_chest',
        cardId: drawn.card.id,
        action: drawn.card.action,
      };
      result.nextPhase = 'action';
      break;
    }

    case 'go_to_jail':
      result.goToJail = true;
      result.nextPhase = 'action';
      break;

    case 'free_parking':
      if (settings.free_parking_jackpot && gameState.free_parking_pool > 0) {
        result.freeParkingCollect = gameState.free_parking_pool;
      }
      result.nextPhase = 'action';
      break;

    case 'jail_visit':
      result.nextPhase = 'action';
      break;
  }

  return result;
}

// ─── Jail Logic ─────────────────────────────────────────────

export type JailDecision = 'pay' | 'card' | 'roll';

export interface JailResult {
  escaped: boolean;
  method?: 'paid' | 'card' | 'doubles';
  cost?: number;
  diceValues?: [number, number];
  moveSpaces?: number;
  forcePayment?: boolean;
}

/**
 * Process a jail decision.
 * After 3 failed turns in jail, player must pay $50 and move.
 */
export function processJailDecision(
  decision: JailDecision,
  playerState: PlayerState
): JailResult {
  switch (decision) {
    case 'pay': {
      return {
        escaped: true,
        method: 'paid',
        cost: JAIL_FINE,
      };
    }

    case 'card': {
      if (playerState.get_out_of_jail_cards <= 0) {
        return { escaped: false };
      }
      return {
        escaped: true,
        method: 'card',
      };
    }

    case 'roll': {
      const dice = rollDice();
      const doubles = isDoubles(dice);

      if (doubles) {
        return {
          escaped: true,
          method: 'doubles',
          diceValues: dice,
          moveSpaces: getDiceTotal(dice),
        };
      }

      const turnsLeft = playerState.jail_turns_remaining - 1;
      if (turnsLeft <= 0) {
        return {
          escaped: true,
          method: 'paid',
          cost: JAIL_FINE,
          forcePayment: true,
          diceValues: dice,
          moveSpaces: getDiceTotal(dice),
        };
      }

      return {
        escaped: false,
        diceValues: dice,
      };
    }
  }
}

// ─── Turn Advancement ────────────────────────────────────────

/**
 * Get the next active (non-bankrupt) player in turn order.
 */
export function getNextPlayer(
  currentPlayerId: string,
  playerStates: PlayerState[],
  roomPlayers: { id: string; turn_order: number; status: string }[]
): string | null {
  const activePlayers = roomPlayers
    .filter((rp) => {
      const ps = playerStates.find((p) => p.player_id === rp.id);
      return ps && !ps.is_bankrupt && rp.status !== 'bankrupt';
    })
    .sort((a, b) => a.turn_order - b.turn_order);

  if (activePlayers.length === 0) return null;
  if (activePlayers.length === 1) return activePlayers[0]!.id;

  const currentIndex = activePlayers.findIndex((p) => p.id === currentPlayerId);
  const nextIndex = (currentIndex + 1) % activePlayers.length;
  return activePlayers[nextIndex]!.id;
}

/**
 * Determine the initial phase for a player's turn.
 */
export function getInitialPhase(playerState: PlayerState): GamePhase {
  if (playerState.jail_turns_remaining > 0) {
    return 'jail_decision';
  }
  return 'roll';
}

/**
 * Process passing Go — player collects salary.
 */
export function processPassGo(passedGo: boolean): number {
  return passedGo ? GO_SALARY : 0;
}

/**
 * Send player to jail: set position to jail, set jail turns.
 */
export function sendToJail(): { position: number; jailTurns: number } {
  return {
    position: JAIL_POSITION,
    jailTurns: MAX_JAIL_TURNS,
  };
}

// ─── Card Action Resolution ─────────────────────────────────

export interface CardResolutionResult {
  moveToSpace?: number;
  collectAmount?: number;
  payAmount?: number;
  payPerPlayer?: number;
  collectPerPlayer?: number;
  payPerHouseHotel?: { houseAmount: number; hotelAmount: number };
  goToJail?: boolean;
  getOutOfJailCard?: boolean;
  passedGo?: boolean;
  goBackSpaces?: number;
  moveToNearestRailroad?: boolean;
  moveToNearestUtility?: boolean;
}

/**
 * Resolve a card action into concrete game effects.
 */
export function resolveCardAction(
  action: CardAction,
  currentPosition: number
): CardResolutionResult {
  switch (action.type) {
    case 'move_to': {
      const passedGo = action.collect_go && action.space < currentPosition && action.space !== 0;
      return { moveToSpace: action.space, passedGo };
    }
    case 'move_relative':
      return { moveToSpace: (currentPosition + action.spaces + BOARD_SIZE) % BOARD_SIZE };
    case 'move_to_nearest':
      if (action.space_type === 'railroad') {
        return { moveToNearestRailroad: true, moveToSpace: findNearestRailroad(currentPosition) };
      }
      return { moveToNearestUtility: true, moveToSpace: findNearestUtility(currentPosition) };
    case 'collect':
      return { collectAmount: action.amount };
    case 'pay':
      return { payAmount: action.amount };
    case 'pay_per_player':
      return { payPerPlayer: action.amount };
    case 'collect_per_player':
      return { collectPerPlayer: action.amount };
    case 'pay_per_house_hotel':
      return { payPerHouseHotel: { houseAmount: action.house_amount, hotelAmount: action.hotel_amount } };
    case 'get_out_of_jail':
      return { getOutOfJailCard: true };
    case 'go_to_jail':
      return { goToJail: true };
    case 'go_back':
      return { goBackSpaces: action.spaces, moveToSpace: (currentPosition - action.spaces + BOARD_SIZE) % BOARD_SIZE };
  }
}

/**
 * Calculate total house/hotel payment for repair cards.
 */
export function calculateRepairCost(
  playerId: string,
  propertyStates: PropertyState[],
  houseAmount: number,
  hotelAmount: number
): number {
  let totalCost = 0;

  for (const prop of propertyStates) {
    if (prop.owner_id !== playerId) continue;
    if (prop.houses === 5) {
      totalCost += hotelAmount;
    } else if (prop.houses > 0) {
      totalCost += prop.houses * houseAmount;
    }
  }

  return totalCost;
}
