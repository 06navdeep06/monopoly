import type { PlayerToken } from '@/types/game';

/** All player tokens/pieces — ALL UNLOCKED, no paywall */
export const PLAYER_TOKENS: PlayerToken[] = [
  { id: 'hat', name: 'Top Hat', emoji: '\u{1F3A9}', unlocked: true },
  { id: 'car', name: 'Sports Car', emoji: '\u{1F697}', unlocked: true },
  { id: 'ship', name: 'Battleship', emoji: '\u{1F6A2}', unlocked: true },
  { id: 'iron', name: 'Iron', emoji: '\u{1FAA3}', unlocked: true },
  { id: 'dog', name: 'Dog', emoji: '\u{1F415}', unlocked: true },
  { id: 'boot', name: 'Boot', emoji: '\u{1F462}', unlocked: true },
  { id: 'thimble', name: 'Thimble', emoji: '\u{1FAA1}', unlocked: true },
  { id: 'wheelbarrow', name: 'Wheelbarrow', emoji: '\u{1F6D2}', unlocked: true },
  { id: 'rocket', name: 'Rocket', emoji: '\u{1F680}', unlocked: true },
  { id: 'diamond', name: 'Diamond', emoji: '\u{1F48E}', unlocked: true },
  { id: 'crown', name: 'Crown', emoji: '\u{1F451}', unlocked: true },
  { id: 'dragon', name: 'Dragon', emoji: '\u{1F409}', unlocked: true },
  { id: 'unicorn', name: 'Unicorn', emoji: '\u{1F984}', unlocked: true },
  { id: 'robot', name: 'Robot', emoji: '\u{1F916}', unlocked: true },
  { id: 'alien', name: 'Alien', emoji: '\u{1F47D}', unlocked: true },
  { id: 'wizard', name: 'Wizard', emoji: '\u{1F9D9}', unlocked: true },
];

/** Get token by id */
export function getToken(id: string): PlayerToken | undefined {
  return PLAYER_TOKENS.find((t) => t.id === id);
}

/** Get token emoji by id */
export function getTokenEmoji(id: string): string {
  return getToken(id)?.emoji ?? '\u{1F3A9}';
}
