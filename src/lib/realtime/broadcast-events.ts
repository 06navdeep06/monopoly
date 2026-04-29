// ═══════════════════════════════════════════════════════════════
// BROADCAST EVENT DEFINITIONS — Typed Supabase Realtime events
// ═══════════════════════════════════════════════════════════════

export type BroadcastEventMap = {
  'player:joined': {
    playerId: string;
    displayName: string;
    token: string;
    color: string;
  };
  'player:ready': { playerId: string };
  'player:disconnected': { playerId: string };
  'game:starting': { countdown: number };
  'game:started': { gameStateId: string; turnOrder: string[] };
  'dice:rolled': {
    playerId: string;
    values: [number, number];
    total: number;
    isDoubles: boolean;
  };
  'player:moved': {
    playerId: string;
    from: number;
    to: number;
    passedGo: boolean;
  };
  'property:purchased': {
    playerId: string;
    propertyId: number;
    price: number;
  };
  'property:mortgaged': {
    playerId: string;
    propertyId: number;
    received: number;
  };
  'property:unmortgaged': {
    playerId: string;
    propertyId: number;
    paid: number;
  };
  'house:built': {
    playerId: string;
    propertyId: number;
    newCount: number;
  };
  'hotel:built': {
    playerId: string;
    propertyId: number;
  };
  'rent:paid': {
    from: string;
    to: string;
    amount: number;
    propertyId: number;
  };
  'tax:paid': {
    playerId: string;
    amount: number;
    taxType: string;
  };
  'card:drawn': {
    playerId: string;
    cardType: 'chance' | 'community_chest';
    cardId: number;
    action: string;
  };
  'jail:sent': {
    playerId: string;
    reason: 'go_to_jail_space' | 'three_doubles' | 'card';
  };
  'jail:escaped': {
    playerId: string;
    method: 'paid' | 'card' | 'doubles';
  };
  'auction:started': {
    auctionId: string;
    propertyId: number;
    startingBid: number;
    endsAt: string;
  };
  'auction:bid': {
    playerId: string;
    amount: number;
  };
  'auction:won': {
    playerId: string;
    propertyId: number;
    price: number;
  };
  'trade:proposed': {
    tradeId: string;
    proposerId: string;
    recipientId: string;
  };
  'trade:accepted': { tradeId: string };
  'trade:rejected': { tradeId: string };
  'bankruptcy:declared': {
    playerId: string;
    creditorId: string | 'bank';
  };
  'turn:ended': {
    playerId: string;
    nextPlayerId: string;
    turnNumber: number;
  };
  'turn:timeout': { playerId: string };
  'game:won': {
    winnerId: string;
    winnerName: string;
  };
  'chat:message': {
    playerId: string;
    message: string;
    displayName: string;
  };
  'free_parking:collected': {
    playerId: string;
    amount: number;
  };
};

export type BroadcastEvent = keyof BroadcastEventMap;

export type BroadcastPayload<T extends BroadcastEvent> = BroadcastEventMap[T];
