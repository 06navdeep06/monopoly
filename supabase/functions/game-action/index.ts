// ═══════════════════════════════════════════════════════════════
// GAME ACTION EDGE FUNCTION — Server-authoritative game logic
// Supabase Edge Function (Deno runtime)
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GameActionRequest {
  roomId: string;
  action: {
    type: string;
    [key: string]: unknown;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client for auth verification
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    // Service role client for mutations (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body: GameActionRequest = await req.json();
    const { roomId, action } = body;

    if (!roomId || !action?.type) {
      return errorResponse('Missing roomId or action type', 400);
    }

    // Load current game state
    const { data: gameState, error: gsError } = await adminClient
      .from('game_states')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (gsError || !gameState) {
      return errorResponse('Game state not found', 404);
    }

    // Load room player for this user
    const { data: roomPlayer, error: rpError } = await adminClient
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('player_id', user.id)
      .single();

    if (rpError || !roomPlayer) {
      return errorResponse('Player not in this room', 403);
    }

    // Load all player states
    const { data: playerStates } = await adminClient
      .from('player_states')
      .select('*')
      .eq('game_state_id', gameState.id);

    // Load property states
    const { data: propertyStates } = await adminClient
      .from('property_states')
      .select('*')
      .eq('game_state_id', gameState.id);

    // Load room settings
    const { data: room } = await adminClient
      .from('rooms')
      .select('settings')
      .eq('id', roomId)
      .single();

    const myPlayerState = (playerStates ?? []).find(
      (ps: Record<string, unknown>) => ps.player_id === roomPlayer.id
    );

    if (!myPlayerState) {
      return errorResponse('Player state not found', 404);
    }

    // ─── ACTION ROUTER ───────────────────────────────────────

    const isTurnAction = !['RESPOND_TRADE', 'PLACE_BID', 'SEND_CHAT'].includes(action.type);
    if (isTurnAction && gameState.current_player_id !== roomPlayer.id) {
      return errorResponse('Not your turn', 403);
    }

    const channel = adminClient.channel(`room:${roomId}`);

    try {
      // Subscribe before broadcasting — otherwise messages are silently dropped
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Realtime subscribe timeout')), 5000);
        channel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve();
          } else if (status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            reject(new Error('Realtime channel error'));
          }
        });
      });

      switch (action.type) {
      case 'ROLL_DICE': {
        if (gameState.phase !== 'roll' && gameState.phase !== 'jail_decision') {
          return errorResponse('Cannot roll dice in current phase', 400);
        }

        // Admin panel can force specific dice values
        const forced = action.forcedDice as [number, number] | undefined;
        const die1 = (forced && forced[0] >= 1 && forced[0] <= 6)
          ? forced[0]
          : Math.floor(Math.random() * 6) + 1;
        const die2 = (forced && forced[1] >= 1 && forced[1] <= 6)
          ? forced[1]
          : Math.floor(Math.random() * 6) + 1;
        const total = die1 + die2;
        const doubles = die1 === die2;
        const consecutiveDoubles = doubles
          ? gameState.consecutive_doubles + 1
          : 0;

        // Three consecutive doubles → jail
        if (consecutiveDoubles >= 3) {
          await adminClient.from('player_states').update({
            position: 10,
            jail_turns_remaining: 3,
          }).eq('id', myPlayerState.id);

          await adminClient.from('game_states').update({
            dice_values: [die1, die2],
            consecutive_doubles: 0,
            phase: 'action',
          }).eq('id', gameState.id);

          await channel.send({
            type: 'broadcast',
            event: 'jail:sent',
            payload: { playerId: roomPlayer.id, reason: 'three_doubles' },
          });

          return successResponse({ jailed: true, dice: [die1, die2] });
        }

        // Normal movement
        const oldPosition = myPlayerState.position as number;
        const newPosition = (oldPosition + total) % 40;
        const passedGo = oldPosition + total >= 40;

        let cashChange = 0;
        if (passedGo) {
          cashChange = 200;
        }

        await adminClient.from('player_states').update({
          position: newPosition,
          cash: (myPlayerState.cash as number) + cashChange,
        }).eq('id', myPlayerState.id);

        await adminClient.from('game_states').update({
          dice_values: [die1, die2],
          consecutive_doubles: consecutiveDoubles,
          phase: 'buy',
        }).eq('id', gameState.id);

        await channel.send({
          type: 'broadcast',
          event: 'dice:rolled',
          payload: {
            playerId: roomPlayer.id,
            values: [die1, die2],
            total,
            isDoubles: doubles,
          },
        });

        await channel.send({
          type: 'broadcast',
          event: 'player:moved',
          payload: {
            playerId: roomPlayer.id,
            from: oldPosition,
            to: newPosition,
            passedGo,
          },
        });

        if (passedGo) {
          await adminClient.from('transactions').insert({
            game_state_id: gameState.id,
            from_player_id: null,
            to_player_id: roomPlayer.id,
            amount: 200,
            reason: 'Passed Go',
            transaction_type: 'salary',
          });
        }

        return successResponse({
          dice: [die1, die2],
          total,
          doubles,
          newPosition,
          passedGo,
        });
      }

      case 'BUY_PROPERTY': {
        if (gameState.phase !== 'buy') {
          return errorResponse('Cannot buy in current phase', 400);
        }

        const propertyId = action.propertyId as number;
        const propState = (propertyStates ?? []).find(
          (p: Record<string, unknown>) => p.property_id === propertyId
        );

        if (propState?.owner_id) {
          return errorResponse('Property already owned', 400);
        }

        // Find the board space price (import from board data not available in Deno,
        // so we use a lookup table approach or embed prices)
        const prices: Record<number, number> = {
          1: 60, 3: 60, 5: 200, 6: 100, 8: 100, 9: 120,
          11: 140, 12: 150, 13: 140, 14: 160, 15: 200,
          16: 180, 18: 180, 19: 200,
          21: 220, 23: 220, 24: 240, 25: 200,
          26: 260, 27: 260, 28: 150, 29: 280,
          31: 300, 32: 300, 34: 320, 35: 200,
          37: 350, 39: 400,
        };

        const price = prices[propertyId];
        if (!price) {
          return errorResponse('Not a purchasable property', 400);
        }

        if ((myPlayerState.cash as number) < price) {
          return errorResponse('Insufficient funds', 400);
        }

        await adminClient.from('player_states').update({
          cash: (myPlayerState.cash as number) - price,
        }).eq('id', myPlayerState.id);

        await adminClient.from('property_states').update({
          owner_id: roomPlayer.id,
          purchase_price_paid: price,
        }).eq('game_state_id', gameState.id).eq('property_id', propertyId);

        await adminClient.from('game_states').update({
          phase: 'action',
        }).eq('id', gameState.id);

        await adminClient.from('transactions').insert({
          game_state_id: gameState.id,
          from_player_id: roomPlayer.id,
          to_player_id: null,
          amount: price,
          reason: `Purchased property ${propertyId}`,
          transaction_type: 'purchase',
        });

        await channel.send({
          type: 'broadcast',
          event: 'property:purchased',
          payload: { playerId: roomPlayer.id, propertyId, price },
        });

        return successResponse({ purchased: true, propertyId, price });
      }

      case 'DECLINE_PROPERTY': {
        if (gameState.phase !== 'buy') {
          return errorResponse('Cannot decline in current phase', 400);
        }

        const settings = room?.settings as Record<string, unknown>;
        if (settings?.speed_mode) {
          await adminClient.from('game_states').update({
            phase: 'action',
          }).eq('id', gameState.id);
          return successResponse({ declined: true, speedMode: true });
        }

        const propertyId = action.propertyId as number;
        const auctionEndsAt = new Date(Date.now() + 30000).toISOString();

        const { data: auction, error: auctionError } = await adminClient.from('auctions').insert({
          game_state_id: gameState.id,
          property_id: propertyId,
          initiated_by_player_id: roomPlayer.id,
          status: 'active',
          current_highest_bid: 0,
          ends_at: auctionEndsAt,
        }).select().single();

        if (auctionError || !auction) {
          return errorResponse('Failed to create auction', 500);
        }

        await adminClient.from('game_states').update({
          phase: 'auction',
        }).eq('id', gameState.id);

        await channel.send({
          type: 'broadcast',
          event: 'auction:started',
          payload: {
            auctionId: auction.id,
            propertyId,
            startingBid: 1,
            endsAt: auctionEndsAt,
          },
        });

        return successResponse({ auctionStarted: true });
      }

      case 'BUILD_HOUSE': {
        if (gameState.phase !== 'action') {
          return errorResponse('Cannot build in current phase', 400);
        }

        const propertyId = action.propertyId as number;
        const propState = (propertyStates ?? []).find(
          (p: Record<string, unknown>) => p.property_id === propertyId
        );

        if (!propState || propState.owner_id !== roomPlayer.id) {
          return errorResponse('You do not own this property', 400);
        }

        const houseCosts: Record<number, number> = {
          1: 50, 3: 50, 6: 50, 8: 50, 9: 50,
          11: 100, 13: 100, 14: 100, 16: 100, 18: 100, 19: 100,
          21: 150, 23: 150, 24: 150, 26: 150, 27: 150, 29: 150,
          31: 200, 32: 200, 34: 200, 37: 200, 39: 200,
        };

        const cost = houseCosts[propertyId] ?? 0;
        if ((myPlayerState.cash as number) < cost) {
          return errorResponse('Insufficient funds', 400);
        }

        const currentHouses = (propState.houses as number) ?? 0;
        if (currentHouses >= 4) {
          return errorResponse('Maximum houses reached', 400);
        }

        await adminClient.from('player_states').update({
          cash: (myPlayerState.cash as number) - cost,
        }).eq('id', myPlayerState.id);

        await adminClient.from('property_states').update({
          houses: currentHouses + 1,
        }).eq('game_state_id', gameState.id).eq('property_id', propertyId);

        await adminClient.from('game_states').update({
          bank_houses_remaining: gameState.bank_houses_remaining - 1,
        }).eq('id', gameState.id);

        await channel.send({
          type: 'broadcast',
          event: 'house:built',
          payload: { playerId: roomPlayer.id, propertyId, newCount: currentHouses + 1 },
        });

        return successResponse({ built: true, houses: currentHouses + 1 });
      }

      case 'MORTGAGE_PROPERTY': {
        if (gameState.phase !== 'action') {
          return errorResponse('Cannot mortgage in current phase', 400);
        }

        const propertyId = action.propertyId as number;
        const propState = (propertyStates ?? []).find(
          (p: Record<string, unknown>) => p.property_id === propertyId
        );

        if (!propState || propState.owner_id !== roomPlayer.id) {
          return errorResponse('You do not own this property', 400);
        }

        if (propState.is_mortgaged) {
          return errorResponse('Already mortgaged', 400);
        }

        const mortgageValues: Record<number, number> = {
          1: 30, 3: 30, 5: 100, 6: 50, 8: 50, 9: 60,
          11: 70, 12: 75, 13: 70, 14: 80, 15: 100,
          16: 90, 18: 90, 19: 100,
          21: 110, 23: 110, 24: 120, 25: 100,
          26: 130, 27: 130, 28: 75, 29: 140,
          31: 150, 32: 150, 34: 160, 35: 100,
          37: 175, 39: 200,
        };

        const received = mortgageValues[propertyId] ?? 0;

        await adminClient.from('player_states').update({
          cash: (myPlayerState.cash as number) + received,
        }).eq('id', myPlayerState.id);

        await adminClient.from('property_states').update({
          is_mortgaged: true,
        }).eq('game_state_id', gameState.id).eq('property_id', propertyId);

        await adminClient.from('transactions').insert({
          game_state_id: gameState.id,
          from_player_id: null,
          to_player_id: roomPlayer.id,
          amount: received,
          reason: `Mortgaged property ${propertyId}`,
          transaction_type: 'mortgage',
        });

        await channel.send({
          type: 'broadcast',
          event: 'property:mortgaged',
          payload: { playerId: roomPlayer.id, propertyId, received },
        });

        return successResponse({ mortgaged: true, received });
      }

      case 'UNMORTGAGE_PROPERTY': {
        if (gameState.phase !== 'action') {
          return errorResponse('Cannot unmortgage in current phase', 400);
        }

        const propertyId = action.propertyId as number;
        const propState = (propertyStates ?? []).find(
          (p: Record<string, unknown>) => p.property_id === propertyId
        );

        if (!propState || propState.owner_id !== roomPlayer.id) {
          return errorResponse('You do not own this property', 400);
        }

        if (!propState.is_mortgaged) {
          return errorResponse('Not mortgaged', 400);
        }

        const mortgageValues: Record<number, number> = {
          1: 30, 3: 30, 5: 100, 6: 50, 8: 50, 9: 60,
          11: 70, 12: 75, 13: 70, 14: 80, 15: 100,
          16: 90, 18: 90, 19: 100,
          21: 110, 23: 110, 24: 120, 25: 100,
          26: 130, 27: 130, 28: 75, 29: 140,
          31: 150, 32: 150, 34: 160, 35: 100,
          37: 175, 39: 200,
        };

        const cost = Math.ceil((mortgageValues[propertyId] ?? 0) * 1.1);

        if ((myPlayerState.cash as number) < cost) {
          return errorResponse('Insufficient funds', 400);
        }

        await adminClient.from('player_states').update({
          cash: (myPlayerState.cash as number) - cost,
        }).eq('id', myPlayerState.id);

        await adminClient.from('property_states').update({
          is_mortgaged: false,
        }).eq('game_state_id', gameState.id).eq('property_id', propertyId);

        await channel.send({
          type: 'broadcast',
          event: 'property:unmortgaged',
          payload: { playerId: roomPlayer.id, propertyId, paid: cost },
        });

        return successResponse({ unmortgaged: true, cost });
      }

      case 'PAY_JAIL_FINE': {
        if (gameState.phase !== 'jail_decision') {
          return errorResponse('Not in jail decision phase', 400);
        }

        if ((myPlayerState.cash as number) < 50) {
          return errorResponse('Insufficient funds to pay $50 fine', 400);
        }

        await adminClient.from('player_states').update({
          cash: (myPlayerState.cash as number) - 50,
          jail_turns_remaining: 0,
        }).eq('id', myPlayerState.id);

        await adminClient.from('game_states').update({
          phase: 'roll',
        }).eq('id', gameState.id);

        await channel.send({
          type: 'broadcast',
          event: 'jail:escaped',
          payload: { playerId: roomPlayer.id, method: 'paid' },
        });

        return successResponse({ escaped: true, method: 'paid' });
      }

      case 'USE_JAIL_CARD': {
        if (gameState.phase !== 'jail_decision') {
          return errorResponse('Not in jail decision phase', 400);
        }

        if ((myPlayerState.get_out_of_jail_cards as number) <= 0) {
          return errorResponse('No Get Out of Jail Free cards', 400);
        }

        await adminClient.from('player_states').update({
          get_out_of_jail_cards: (myPlayerState.get_out_of_jail_cards as number) - 1,
          jail_turns_remaining: 0,
        }).eq('id', myPlayerState.id);

        await adminClient.from('game_states').update({
          phase: 'roll',
        }).eq('id', gameState.id);

        await channel.send({
          type: 'broadcast',
          event: 'jail:escaped',
          payload: { playerId: roomPlayer.id, method: 'card' },
        });

        return successResponse({ escaped: true, method: 'card' });
      }

      case 'END_TURN': {
        if (gameState.phase !== 'action' && gameState.phase !== 'end_turn') {
          return errorResponse('Cannot end turn in current phase', 400);
        }

        // Find next non-bankrupt player
        const { data: allRoomPlayers } = await adminClient
          .from('room_players')
          .select('id, turn_order, status')
          .eq('room_id', roomId)
          .order('turn_order');

        const activePlayers = (allRoomPlayers ?? []).filter((rp: Record<string, unknown>) => {
          const ps = (playerStates ?? []).find(
            (p: Record<string, unknown>) => p.player_id === rp.id
          );
          return ps && !(ps.is_bankrupt as boolean);
        });

        const currentIdx = activePlayers.findIndex(
          (p: Record<string, unknown>) => p.id === roomPlayer.id
        );
        const nextIdx = (currentIdx + 1) % activePlayers.length;
        const nextPlayer = activePlayers[nextIdx] as Record<string, unknown>;

        if (!nextPlayer) {
          return errorResponse('No next player found', 500);
        }

        const nextPlayerState = (playerStates ?? []).find(
          (ps: Record<string, unknown>) => ps.player_id === nextPlayer.id
        );
        const nextPhase = nextPlayerState &&
          (nextPlayerState.jail_turns_remaining as number) > 0
          ? 'jail_decision'
          : 'roll';

        const turnDuration = (room?.settings as Record<string, unknown>)?.turn_duration_seconds as number ?? 60;
        const turnDeadline = turnDuration > 0
          ? new Date(Date.now() + turnDuration * 1000).toISOString()
          : null;

        await adminClient.from('game_states').update({
          current_player_id: nextPlayer.id as string,
          turn_number: gameState.turn_number + 1,
          phase: nextPhase,
          consecutive_doubles: 0,
          dice_values: null,
          turn_deadline: turnDeadline,
        }).eq('id', gameState.id);

        await channel.send({
          type: 'broadcast',
          event: 'turn:ended',
          payload: {
            playerId: roomPlayer.id,
            nextPlayerId: nextPlayer.id as string,
            turnNumber: gameState.turn_number + 1,
          },
        });

        return successResponse({
          turnEnded: true,
          nextPlayerId: nextPlayer.id,
        });
      }

      case 'PLACE_BID': {
        const auctionId = action.auctionId as string;
        const amount = action.amount as number;

        const { data: auction } = await adminClient
          .from('auctions')
          .select('*')
          .eq('id', auctionId)
          .single();

        if (!auction || auction.status !== 'active') {
          return errorResponse('Auction not active', 400);
        }

        if (amount <= (auction.current_highest_bid as number)) {
          return errorResponse('Bid must be higher than current bid', 400);
        }

        if ((myPlayerState.cash as number) < amount) {
          return errorResponse('Insufficient funds for bid', 400);
        }

        await adminClient.from('auctions').update({
          current_highest_bid: amount,
          current_highest_bidder_id: roomPlayer.id,
        }).eq('id', auctionId);

        await adminClient.from('auction_bids').insert({
          auction_id: auctionId,
          player_id: roomPlayer.id,
          amount,
        });

        await channel.send({
          type: 'broadcast',
          event: 'auction:bid',
          payload: { playerId: roomPlayer.id, amount },
        });

        return successResponse({ bidPlaced: true, amount });
      }

      case 'PROPOSE_TRADE': {
        const recipientId = action.recipientId as string;
        const offer = action.offer as Record<string, unknown>;
        const request = action.request as Record<string, unknown>;

        const { data: trade } = await adminClient.from('trades').insert({
          game_state_id: gameState.id,
          proposer_id: roomPlayer.id,
          recipient_id: recipientId,
          status: 'pending',
          offer,
          request,
          expires_at: new Date(Date.now() + 60000).toISOString(),
        }).select().single();

        if (trade) {
          await channel.send({
            type: 'broadcast',
            event: 'trade:proposed',
            payload: {
              tradeId: trade.id as string,
              proposerId: roomPlayer.id,
              recipientId,
            },
          });
        }

        return successResponse({ tradeProposed: true, tradeId: trade?.id });
      }

      case 'RESPOND_TRADE': {
        const tradeId = action.tradeId as string;
        const accept = action.accept as boolean;

        const { data: trade } = await adminClient
          .from('trades')
          .select('*')
          .eq('id', tradeId)
          .single();

        if (!trade || trade.status !== 'pending') {
          return errorResponse('Trade not found or not pending', 400);
        }

        if (trade.recipient_id !== roomPlayer.id) {
          return errorResponse('Not the trade recipient', 403);
        }

        if (!accept) {
          await adminClient.from('trades').update({
            status: 'rejected',
          }).eq('id', tradeId);

          await channel.send({
            type: 'broadcast',
            event: 'trade:rejected',
            payload: { tradeId },
          });

          return successResponse({ rejected: true });
        }

        // Execute trade
        const offer = trade.offer as Record<string, unknown>;
        const request = trade.request as Record<string, unknown>;

        const proposerState = (playerStates ?? []).find(
          (ps: Record<string, unknown>) => ps.player_id === trade.proposer_id
        );
        const recipientState = myPlayerState;

        if (!proposerState || !recipientState) {
          return errorResponse('Player states not found', 500);
        }

        const offerCash = (offer.cash as number) ?? 0;
        const requestCash = (request.cash as number) ?? 0;

        // Transfer cash
        await adminClient.from('player_states').update({
          cash: (proposerState.cash as number) - offerCash + requestCash,
          get_out_of_jail_cards: (proposerState.get_out_of_jail_cards as number) -
            ((offer.gooj_cards as number) ?? 0) +
            ((request.gooj_cards as number) ?? 0),
        }).eq('id', proposerState.id);

        await adminClient.from('player_states').update({
          cash: (recipientState.cash as number) - requestCash + offerCash,
          get_out_of_jail_cards: (recipientState.get_out_of_jail_cards as number) -
            ((request.gooj_cards as number) ?? 0) +
            ((offer.gooj_cards as number) ?? 0),
        }).eq('id', recipientState.id);

        // Transfer offered properties
        for (const propId of ((offer.properties as number[]) ?? [])) {
          await adminClient.from('property_states').update({
            owner_id: trade.recipient_id,
          }).eq('game_state_id', gameState.id).eq('property_id', propId);
        }

        // Transfer requested properties
        for (const propId of ((request.properties as number[]) ?? [])) {
          await adminClient.from('property_states').update({
            owner_id: trade.proposer_id,
          }).eq('game_state_id', gameState.id).eq('property_id', propId);
        }

        await adminClient.from('trades').update({
          status: 'accepted',
        }).eq('id', tradeId);

        await channel.send({
          type: 'broadcast',
          event: 'trade:accepted',
          payload: { tradeId },
        });

        return successResponse({ accepted: true });
      }

      case 'DECLARE_BANKRUPTCY': {
        await adminClient.from('player_states').update({
          is_bankrupt: true,
          bankrupt_at: new Date().toISOString(),
          cash: 0,
        }).eq('id', myPlayerState.id);

        // Return all properties to bank
        await adminClient.from('property_states').update({
          owner_id: null,
          is_mortgaged: false,
          houses: 0,
        }).eq('game_state_id', gameState.id).eq('owner_id', roomPlayer.id);

        await adminClient.from('room_players').update({
          status: 'bankrupt',
        }).eq('id', roomPlayer.id);

        // Check for winner
        const remaining = (playerStates ?? []).filter(
          (ps: Record<string, unknown>) =>
            !(ps.is_bankrupt as boolean) && ps.player_id !== roomPlayer.id
        );

        if (remaining.length === 1) {
          const winner = remaining[0] as Record<string, unknown>;
          await adminClient.from('game_states').update({
            winner_id: winner.player_id as string,
          }).eq('id', gameState.id);

          const { data: winnerRp } = await adminClient
            .from('room_players')
            .select('display_name')
            .eq('id', winner.player_id)
            .single();

          await channel.send({
            type: 'broadcast',
            event: 'game:won',
            payload: {
              winnerId: winner.player_id as string,
              winnerName: (winnerRp?.display_name as string) ?? 'Unknown',
            },
          });
        }

        await channel.send({
          type: 'broadcast',
          event: 'bankruptcy:declared',
          payload: { playerId: roomPlayer.id, creditorId: 'bank' },
        });

        return successResponse({ bankrupt: true });
      }

      default:
        return errorResponse(`Unknown action type: ${action.type}`, 400);
      }
    } finally {
      await adminClient.removeChannel(channel);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
});

function successResponse(data: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ success: true, data }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}
