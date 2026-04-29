import type { Card } from '@/types/game';

/** All 16 Chance cards with their game actions */
export const CHANCE_CARDS: Card[] = [
  {
    id: 0, type: 'chance',
    text: 'Advance to Boardwalk.',
    action: { type: 'move_to', space: 39, collect_go: true },
  },
  {
    id: 1, type: 'chance',
    text: 'Advance to Go. Collect $200.',
    action: { type: 'move_to', space: 0, collect_go: true },
  },
  {
    id: 2, type: 'chance',
    text: 'Advance to Illinois Avenue. If you pass Go, collect $200.',
    action: { type: 'move_to', space: 24, collect_go: true },
  },
  {
    id: 3, type: 'chance',
    text: 'Advance to St. Charles Place. If you pass Go, collect $200.',
    action: { type: 'move_to', space: 11, collect_go: true },
  },
  {
    id: 4, type: 'chance',
    text: 'Advance to the nearest Railroad. If unowned, you may buy it from the Bank. If owned, pay the owner twice the rental to which they are otherwise entitled.',
    action: { type: 'move_to_nearest', space_type: 'railroad' },
  },
  {
    id: 5, type: 'chance',
    text: 'Advance to the nearest Railroad. If unowned, you may buy it from the Bank. If owned, pay the owner twice the rental to which they are otherwise entitled.',
    action: { type: 'move_to_nearest', space_type: 'railroad' },
  },
  {
    id: 6, type: 'chance',
    text: 'Advance token to nearest Utility. If unowned, you may buy it from the Bank. If owned, throw dice and pay owner a total ten times amount thrown.',
    action: { type: 'move_to_nearest', space_type: 'utility' },
  },
  {
    id: 7, type: 'chance',
    text: 'Bank pays you dividend of $50.',
    action: { type: 'collect', amount: 50 },
  },
  {
    id: 8, type: 'chance',
    text: 'Get Out of Jail Free. This card may be kept until needed or sold/traded.',
    action: { type: 'get_out_of_jail' },
  },
  {
    id: 9, type: 'chance',
    text: 'Go Back 3 Spaces.',
    action: { type: 'go_back', spaces: 3 },
  },
  {
    id: 10, type: 'chance',
    text: 'Go to Jail. Go directly to Jail, do not pass Go, do not collect $200.',
    action: { type: 'go_to_jail' },
  },
  {
    id: 11, type: 'chance',
    text: 'Make general repairs on all your property. For each house pay $25. For each hotel pay $100.',
    action: { type: 'pay_per_house_hotel', house_amount: 25, hotel_amount: 100 },
  },
  {
    id: 12, type: 'chance',
    text: 'Speeding fine $15.',
    action: { type: 'pay', amount: 15 },
  },
  {
    id: 13, type: 'chance',
    text: 'Take a trip to Reading Railroad. If you pass Go, collect $200.',
    action: { type: 'move_to', space: 5, collect_go: true },
  },
  {
    id: 14, type: 'chance',
    text: 'You have been elected Chairman of the Board. Pay each player $50.',
    action: { type: 'pay_per_player', amount: 50 },
  },
  {
    id: 15, type: 'chance',
    text: 'Your building loan matures. Collect $150.',
    action: { type: 'collect', amount: 150 },
  },
];

/** All 16 Community Chest cards with their game actions */
export const COMMUNITY_CHEST_CARDS: Card[] = [
  {
    id: 0, type: 'community_chest',
    text: 'Advance to Go. Collect $200.',
    action: { type: 'move_to', space: 0, collect_go: true },
  },
  {
    id: 1, type: 'community_chest',
    text: 'Bank error in your favor. Collect $200.',
    action: { type: 'collect', amount: 200 },
  },
  {
    id: 2, type: 'community_chest',
    text: "Doctor's fee. Pay $50.",
    action: { type: 'pay', amount: 50 },
  },
  {
    id: 3, type: 'community_chest',
    text: 'From sale of stock you get $50.',
    action: { type: 'collect', amount: 50 },
  },
  {
    id: 4, type: 'community_chest',
    text: 'Get Out of Jail Free. This card may be kept until needed or sold/traded.',
    action: { type: 'get_out_of_jail' },
  },
  {
    id: 5, type: 'community_chest',
    text: 'Go to Jail. Go directly to Jail, do not pass Go, do not collect $200.',
    action: { type: 'go_to_jail' },
  },
  {
    id: 6, type: 'community_chest',
    text: 'Holiday fund matures. Receive $100.',
    action: { type: 'collect', amount: 100 },
  },
  {
    id: 7, type: 'community_chest',
    text: 'Income tax refund. Collect $20.',
    action: { type: 'collect', amount: 20 },
  },
  {
    id: 8, type: 'community_chest',
    text: 'It is your birthday. Collect $10 from every player.',
    action: { type: 'collect_per_player', amount: 10 },
  },
  {
    id: 9, type: 'community_chest',
    text: 'Life insurance matures. Collect $100.',
    action: { type: 'collect', amount: 100 },
  },
  {
    id: 10, type: 'community_chest',
    text: 'Pay hospital fees of $100.',
    action: { type: 'pay', amount: 100 },
  },
  {
    id: 11, type: 'community_chest',
    text: 'Pay school fees of $50.',
    action: { type: 'pay', amount: 50 },
  },
  {
    id: 12, type: 'community_chest',
    text: 'Receive $25 consultancy fee.',
    action: { type: 'collect', amount: 25 },
  },
  {
    id: 13, type: 'community_chest',
    text: 'You are assessed for street repair. $40 per house. $115 per hotel.',
    action: { type: 'pay_per_house_hotel', house_amount: 40, hotel_amount: 115 },
  },
  {
    id: 14, type: 'community_chest',
    text: 'You have won second prize in a beauty contest. Collect $10.',
    action: { type: 'collect', amount: 10 },
  },
  {
    id: 15, type: 'community_chest',
    text: 'You inherit $100.',
    action: { type: 'collect', amount: 100 },
  },
];

/** Shuffle an array using Fisher-Yates algorithm, returns indices */
export function createShuffledDeck(size: number): number[] {
  const indices = Array.from({ length: size }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i]!, indices[j]!] = [indices[j]!, indices[i]!];
  }
  return indices;
}

/** Get the next card from a deck, cycling back to the start */
export function drawCard(
  deck: number[],
  currentIndex: number,
  cards: Card[]
): { card: Card; nextIndex: number } {
  const cardIndex = deck[currentIndex % deck.length]!;
  const card = cards[cardIndex]!;
  return {
    card,
    nextIndex: (currentIndex + 1) % deck.length,
  };
}
