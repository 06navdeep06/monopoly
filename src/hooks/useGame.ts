'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GameRealtimeManager } from '@/lib/realtime/supabase-realtime';
import type {
  GameState,
  PlayerState,
  PropertyState,
  RoomPlayer,
  GamePhase,
  TradeOffer,
  Auction,
  Trade,
} from '@/types/game';

const EDGE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/game-action`;

interface UseGameReturn {
  gameState: GameState | null;
  myPlayerState: PlayerState | null;
  allPlayerStates: PlayerState[];
  propertyStates: PropertyState[];
  roomPlayers: RoomPlayer[];
  currentPlayer: RoomPlayer | null;
  isMyTurn: boolean;
  phase: GamePhase;
  activeAuction: Auction | null;
  activeTrade: Trade | null;

  rollDice: () => Promise<void>;
  rollDiceWithValues: (die1: number, die2: number) => Promise<void>;
  forcedDice: [number, number] | null;
  setForcedDice: (dice: [number, number] | null) => void;
  buyProperty: (propertyId: number) => Promise<void>;
  declineProperty: (propertyId: number) => Promise<void>;
  buildHouse: (propertyId: number) => Promise<void>;
  mortgage: (propertyId: number) => Promise<void>;
  unmortgage: (propertyId: number) => Promise<void>;
  endTurn: () => Promise<void>;
  payJailFine: () => Promise<void>;
  useJailCard: () => Promise<void>;
  proposeTrade: (offer: TradeOffer, request: TradeOffer, recipientId: string) => Promise<void>;
  respondTrade: (tradeId: string, accept: boolean) => Promise<void>;
  placeBid: (auctionId: string, amount: number) => Promise<void>;
  declareBankruptcy: () => Promise<void>;

  isActionPending: boolean;
  lastError: string | null;
  clearError: () => void;
}

export function useGame(roomId: string, roomCode: string): UseGameReturn {
  // Memoize supabase client so it doesn't recreate on every render
  const supabase = useMemo(() => createClient(), []);
  const realtimeRef = useRef<GameRealtimeManager | null>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [allPlayerStates, setAllPlayerStates] = useState<PlayerState[]>([]);
  const [propertyStates, setPropertyStates] = useState<PropertyState[]>([]);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [activeAuction, setActiveAuction] = useState<Auction | null>(null);
  const [activeTrade, setActiveTrade] = useState<Trade | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [forcedDice, setForcedDice] = useState<[number, number] | null>(null);

  // Fetch initial state
  useEffect(() => {
    if (!roomId) return;

    async function loadInitialState() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rp } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .eq('player_id', user.id)
        .single();

      if (rp) setMyPlayerId(rp.id);

      const { data: allRp } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('turn_order');

      if (allRp) setRoomPlayers(allRp as RoomPlayer[]);

      const { data: gs } = await supabase
        .from('game_states')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (gs) {
        setGameState(gs as GameState);

        const { data: ps } = await supabase
          .from('player_states')
          .select('*')
          .eq('game_state_id', gs.id);

        if (ps) setAllPlayerStates(ps as PlayerState[]);

        const { data: props } = await supabase
          .from('property_states')
          .select('*')
          .eq('game_state_id', gs.id);

        if (props) setPropertyStates(props as PropertyState[]);
      }
    }

    loadInitialState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Setup realtime
  useEffect(() => {
    if (!roomCode) return;

    const manager = new GameRealtimeManager(supabase);
    realtimeRef.current = manager;

    manager.subscribe(
      roomCode,
      {},
      {
        game_states: (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setGameState(payload.new as unknown as GameState);
          }
        },
        player_states: (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as unknown as PlayerState;
            setAllPlayerStates((prev) => {
              const exists = prev.some((ps) => ps.id === updated.id);
              return exists
                ? prev.map((ps) => (ps.id === updated.id ? updated : ps))
                : [...prev, updated];
            });
          }
        },
        property_states: (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as unknown as PropertyState;
            setPropertyStates((prev) => {
              const exists = prev.some((ps) => ps.id === updated.id);
              return exists
                ? prev.map((ps) => (ps.id === updated.id ? updated : ps))
                : [...prev, updated];
            });
          }
        },
        auctions: (payload) => {
          if (payload.eventType === 'DELETE') {
            setActiveAuction(null);
            return;
          }
          const auction = payload.new as unknown as Auction;
          if (auction.status === 'active') {
            setActiveAuction(auction);
          } else {
            setActiveAuction(null);
          }
        },
        trades: (payload) => {
          if (payload.eventType === 'DELETE') {
            setActiveTrade(null);
            return;
          }
          const trade = payload.new as unknown as Trade;
          if (trade.status === 'pending') {
            setActiveTrade(trade);
          } else {
            setActiveTrade(null);
          }
        },
        room_players: (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as unknown as RoomPlayer;
            setRoomPlayers((prev) => {
              const exists = prev.some((rp) => rp.id === updated.id);
              return exists
                ? prev.map((rp) => (rp.id === updated.id ? updated : rp))
                : [...prev, updated];
            });
          } else if (payload.eventType === 'DELETE') {
            const removed = payload.old as unknown as RoomPlayer;
            setRoomPlayers((prev) => prev.filter((rp) => rp.id !== removed.id));
          }
        },
      },
      {},
      (status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setLastError('Realtime connection failed. Please refresh the page.');
        }
      }
    );

    return () => {
      manager.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // Action dispatcher
  const dispatch = useCallback(
    async (action: Record<string, unknown>) => {
      setIsActionPending(true);
      setLastError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const res = await fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ roomId, action }),
        });

        const result = await res.json();

        if (!result.success) {
          setLastError(result.error ?? 'Unknown error');
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Network error';
        setLastError(message);
        return { success: false, error: message };
      } finally {
        setIsActionPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId]
  );

  // Derived state
  const myPlayerState = allPlayerStates.find((ps) => ps.player_id === myPlayerId) ?? null;
  const isMyTurn = gameState?.current_player_id === myPlayerId;
  const phase: GamePhase = gameState?.phase ?? 'roll';
  const currentPlayer = roomPlayers.find((rp) => rp.id === gameState?.current_player_id) ?? null;

  const clearError = useCallback(() => setLastError(null), []);

  // Action methods
  const rollDice = useCallback(() => {
    if (forcedDice) {
      return dispatch({ type: 'ROLL_DICE', forcedDice });
    }
    return dispatch({ type: 'ROLL_DICE' });
  }, [dispatch, forcedDice]);

  const rollDiceWithValues = useCallback(
    (die1: number, die2: number) => dispatch({ type: 'ROLL_DICE', forcedDice: [die1, die2] }),
    [dispatch]
  );
  const buyProperty = useCallback(
    (propertyId: number) => dispatch({ type: 'BUY_PROPERTY', propertyId }),
    [dispatch]
  );
  const declineProperty = useCallback(
    (propertyId: number) => dispatch({ type: 'DECLINE_PROPERTY', propertyId }),
    [dispatch]
  );
  const buildHouse = useCallback(
    (propertyId: number) => dispatch({ type: 'BUILD_HOUSE', propertyId }),
    [dispatch]
  );
  const mortgage = useCallback(
    (propertyId: number) => dispatch({ type: 'MORTGAGE_PROPERTY', propertyId }),
    [dispatch]
  );
  const unmortgage = useCallback(
    (propertyId: number) => dispatch({ type: 'UNMORTGAGE_PROPERTY', propertyId }),
    [dispatch]
  );
  const endTurn = useCallback(() => dispatch({ type: 'END_TURN' }), [dispatch]);
  const payJailFine = useCallback(() => dispatch({ type: 'PAY_JAIL_FINE' }), [dispatch]);
  const useJailCard = useCallback(() => dispatch({ type: 'USE_JAIL_CARD' }), [dispatch]);
  const proposeTrade = useCallback(
    (offer: TradeOffer, request: TradeOffer, recipientId: string) =>
      dispatch({ type: 'PROPOSE_TRADE', offer, request, recipientId }),
    [dispatch]
  );
  const respondTrade = useCallback(
    (tradeId: string, accept: boolean) =>
      dispatch({ type: 'RESPOND_TRADE', tradeId, accept }),
    [dispatch]
  );
  const placeBid = useCallback(
    (auctionId: string, amount: number) =>
      dispatch({ type: 'PLACE_BID', auctionId, amount }),
    [dispatch]
  );
  const declareBankruptcy = useCallback(
    () => dispatch({ type: 'DECLARE_BANKRUPTCY' }),
    [dispatch]
  );

  return {
    gameState,
    myPlayerState,
    allPlayerStates,
    propertyStates,
    roomPlayers,
    currentPlayer,
    isMyTurn,
    phase,
    activeAuction,
    activeTrade,
    rollDice,
    rollDiceWithValues,
    forcedDice,
    setForcedDice,
    buyProperty,
    declineProperty,
    buildHouse,
    mortgage,
    unmortgage,
    endTurn,
    payJailFine,
    useJailCard,
    proposeTrade,
    respondTrade,
    placeBid,
    declareBankruptcy,
    isActionPending,
    lastError,
    clearError,
  };
}
