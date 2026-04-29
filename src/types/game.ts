// ═══════════════════════════════════════════════════════════════
// COMPLETE GAME TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type RoomStatus = 'waiting' | 'starting' | 'in_progress' | 'finished';
export type PlayerStatus = 'waiting' | 'ready' | 'playing' | 'bankrupt' | 'disconnected';
export type BotDifficulty = 'easy' | 'medium' | 'hard';
export type GamePhase = 'roll' | 'action' | 'buy' | 'auction' | 'trade' | 'jail_decision' | 'end_turn';
export type TransactionType = 'rent' | 'purchase' | 'tax' | 'salary' | 'card' | 'trade' | 'mortgage' | 'build' | 'auction' | 'bankruptcy';
export type TradeStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
export type AuctionStatus = 'active' | 'completed' | 'cancelled';
export type ChatMessageType = 'chat' | 'system' | 'game_event';

export type SpaceType =
  | 'go' | 'property' | 'railroad' | 'utility'
  | 'tax' | 'chance' | 'community_chest'
  | 'jail_visit' | 'go_to_jail' | 'free_parking';

export type ColorGroup =
  | 'brown' | 'light_blue' | 'pink' | 'orange'
  | 'red' | 'yellow' | 'green' | 'dark_blue';

export type BoardTheme = 'classic' | 'space' | 'pirate' | 'neon' | 'medieval' | 'tropical';

export type TurnPhase =
  | 'roll' | 'doubles_roll' | 'action' | 'buy_decision'
  | 'auction' | 'trade' | 'jail_decision' | 'card_action' | 'end_turn';

// ─── Board ───────────────────────────────────────────────────

export interface BoardSpace {
  id: number;
  type: SpaceType;
  name: string;
  color_group?: ColorGroup;
  price?: number;
  rent: number[];
  mortgage_value?: number;
  house_cost?: number;
  hotel_cost?: number;
  tax_amount?: number;
  position: { row: 'bottom' | 'right' | 'top' | 'left'; index: number };
}

// ─── Cards ───────────────────────────────────────────────────

export type CardAction =
  | { type: 'move_to'; space: number; collect_go: boolean }
  | { type: 'move_relative'; spaces: number }
  | { type: 'move_to_nearest'; space_type: 'railroad' | 'utility' }
  | { type: 'collect'; amount: number }
  | { type: 'pay'; amount: number }
  | { type: 'pay_per_player'; amount: number }
  | { type: 'collect_per_player'; amount: number }
  | { type: 'pay_per_house_hotel'; house_amount: number; hotel_amount: number }
  | { type: 'get_out_of_jail' }
  | { type: 'go_to_jail' }
  | { type: 'go_back'; spaces: number };

export interface Card {
  id: number;
  type: 'chance' | 'community_chest';
  text: string;
  action: CardAction;
}

// ─── Room Settings ───────────────────────────────────────────

export interface RoomSettings {
  starting_cash: number;
  turn_duration_seconds: number;
  max_players: number;
  allow_bots: boolean;
  board_theme: BoardTheme;
  house_limit: number;
  hotel_limit: number;
  free_parking_jackpot: boolean;
  speed_mode: boolean;
  starting_position: number;
}

// ─── Database Row Types ──────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  avatar_url: string;
  avatar_token: string;
  preferred_color: string;
  total_games_played: number;
  total_wins: number;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  settings: RoomSettings;
  created_at: string;
  updated_at: string;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  player_id: string | null;
  is_bot: boolean;
  bot_difficulty: BotDifficulty | null;
  display_name: string;
  color: string;
  token: string;
  turn_order: number;
  status: PlayerStatus;
  joined_at: string;
}

export interface GameState {
  id: string;
  room_id: string;
  current_player_id: string | null;
  turn_number: number;
  phase: GamePhase;
  dice_values: [number, number] | null;
  consecutive_doubles: number;
  free_parking_pool: number;
  bank_houses_remaining: number;
  bank_hotels_remaining: number;
  community_chest_deck: number[];
  chance_deck: number[];
  community_chest_index: number;
  chance_index: number;
  turn_deadline: string | null;
  winner_id: string | null;
  started_at: string;
  ended_at: string | null;
  updated_at: string;
}

export interface PlayerState {
  id: string;
  game_state_id: string;
  player_id: string;
  cash: number;
  position: number;
  jail_turns_remaining: number;
  get_out_of_jail_cards: number;
  is_bankrupt: boolean;
  bankrupt_at: string | null;
  net_worth: number;
  updated_at: string;
}

export interface PropertyState {
  id: string;
  game_state_id: string;
  property_id: number;
  owner_id: string | null;
  is_mortgaged: boolean;
  houses: number;
  purchase_price_paid: number | null;
  updated_at: string;
}

export interface Transaction {
  id: string;
  game_state_id: string;
  from_player_id: string | null;
  to_player_id: string | null;
  amount: number;
  reason: string;
  transaction_type: TransactionType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Trade {
  id: string;
  game_state_id: string;
  proposer_id: string;
  recipient_id: string;
  status: TradeStatus;
  offer: TradeOffer;
  request: TradeOffer;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeOffer {
  cash: number;
  properties: number[];
  gooj_cards: number;
}

export interface Auction {
  id: string;
  game_state_id: string;
  property_id: number;
  initiated_by_player_id: string;
  status: AuctionStatus;
  current_highest_bid: number;
  current_highest_bidder_id: string | null;
  ends_at: string;
  winner_id: string | null;
  final_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface AuctionBid {
  id: string;
  auction_id: string;
  player_id: string;
  amount: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  player_id: string | null;
  message: string;
  message_type: ChatMessageType;
  created_at: string;
}

export interface GameEvent {
  id: string;
  game_state_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  player_id: string | null;
  created_at: string;
}

// ─── Action Types (sent to Edge Functions) ───────────────────

export type GameAction =
  | { type: 'ROLL_DICE' }
  | { type: 'BUY_PROPERTY'; propertyId: number }
  | { type: 'DECLINE_PROPERTY'; propertyId: number }
  | { type: 'BUILD_HOUSE'; propertyId: number }
  | { type: 'BUILD_HOTEL'; propertyId: number }
  | { type: 'SELL_HOUSE'; propertyId: number }
  | { type: 'MORTGAGE_PROPERTY'; propertyId: number }
  | { type: 'UNMORTGAGE_PROPERTY'; propertyId: number }
  | { type: 'PAY_JAIL_FINE' }
  | { type: 'USE_JAIL_CARD' }
  | { type: 'END_TURN' }
  | { type: 'PROPOSE_TRADE'; offer: TradeOffer; request: TradeOffer; recipientId: string }
  | { type: 'RESPOND_TRADE'; tradeId: string; accept: boolean }
  | { type: 'PLACE_BID'; auctionId: string; amount: number }
  | { type: 'DECLARE_BANKRUPTCY' };

// ─── Bot AI ──────────────────────────────────────────────────

export interface BotDecision {
  action: 'buy' | 'skip' | 'bid' | 'build' | 'mortgage' | 'unmortgage' | 'end_turn';
  params?: Record<string, unknown>;
}

// ─── Bankruptcy ──────────────────────────────────────────────

export interface BankruptcyResult {
  bankruptPlayer: string;
  creditor: string | 'bank';
  assetsTransferred: {
    properties: number[];
    cash: number;
    gooj_cards: number;
  };
  gameOver: boolean;
  winner?: string;
}

// ─── Tokens & Themes ─────────────────────────────────────────

export interface PlayerToken {
  id: string;
  name: string;
  emoji: string;
  unlocked: boolean;
}

export interface ThemeConfig {
  name: string;
  boardBg: string;
  spaceBg: string;
  spaceBorder: string;
  accentColor: string;
  textColor: string;
  fontClass: string;
  propertyColors: Record<ColorGroup, string>;
}
