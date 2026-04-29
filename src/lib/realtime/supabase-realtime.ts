// ═══════════════════════════════════════════════════════════════
// SUPABASE REALTIME MANAGER — Channel setup + event routing
// ═══════════════════════════════════════════════════════════════
//
// Event flow architecture:
// 1. User takes action in UI → optimistic update applied locally
// 2. Action sent to Edge Function via fetch() with auth token
// 3. Edge Function validates action server-side
// 4. Edge Function updates database (game_states, player_states, etc.)
// 5. Postgres Change fires → all clients receive DB update → merge with optimistic state
// 6. Edge Function also broadcasts event via Realtime → triggers UI animations
// 7. If validation fails → Edge Function returns error → revert optimistic update
// ═══════════════════════════════════════════════════════════════

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { BroadcastEvent, BroadcastEventMap, BroadcastPayload } from './broadcast-events';

export interface PresenceData {
  playerId: string;
  displayName: string;
  token: string;
  color: string;
  online_at: string;
}

export type PostgresChangeHandler = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) => void;

export type EventHandlers = {
  [K in BroadcastEvent]?: (payload: BroadcastPayload<K>) => void;
};

export type PostgresChangeHandlers = {
  game_states?: PostgresChangeHandler;
  player_states?: PostgresChangeHandler;
  property_states?: PostgresChangeHandler;
  trades?: PostgresChangeHandler;
  auctions?: PostgresChangeHandler;
  auction_bids?: PostgresChangeHandler;
  chat_messages?: PostgresChangeHandler;
  room_players?: PostgresChangeHandler;
};

export type PresenceHandlers = {
  onSync?: (state: Record<string, PresenceData[]>) => void;
  onJoin?: (key: string, newPresences: PresenceData[]) => void;
  onLeave?: (key: string, leftPresences: PresenceData[]) => void;
};

/**
 * Manages a single Supabase Realtime channel for a game room.
 * Handles broadcast events, Postgres Changes, and Presence tracking.
 */
export class GameRealtimeManager {
  private channel: RealtimeChannel | null = null;
  private supabase: SupabaseClient;
  private roomCode: string = '';

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Subscribe to a room's realtime channel with event handlers.
   */
  subscribe(
    roomCode: string,
    eventHandlers: EventHandlers,
    postgresHandlers: PostgresChangeHandlers,
    presenceHandlers: PresenceHandlers,
    onStatus?: (status: 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT') => void
  ): void {
    this.roomCode = roomCode;

    // Clean up any existing channel first to avoid duplicates
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
    }

    this.channel = this.supabase.channel(`room:${roomCode}`, {
      config: {
        broadcast: { self: true },
        presence: { key: '' },
      },
    });

    // Register broadcast event listeners
    for (const [event, handler] of Object.entries(eventHandlers)) {
      if (handler) {
        this.channel.on('broadcast', { event }, (payload: { payload: unknown }) => {
          (handler as (p: unknown) => void)(payload.payload);
        });
      }
    }

    // Register Postgres Changes listeners
    const tableConfigs: { table: string; handler?: PostgresChangeHandler }[] = [
      { table: 'game_states', handler: postgresHandlers.game_states },
      { table: 'player_states', handler: postgresHandlers.player_states },
      { table: 'property_states', handler: postgresHandlers.property_states },
      { table: 'trades', handler: postgresHandlers.trades },
      { table: 'auctions', handler: postgresHandlers.auctions },
      { table: 'auction_bids', handler: postgresHandlers.auction_bids },
      { table: 'chat_messages', handler: postgresHandlers.chat_messages },
      { table: 'room_players', handler: postgresHandlers.room_players },
    ];

    for (const { table, handler } of tableConfigs) {
      if (handler) {
        this.channel.on(
          'postgres_changes' as never,
          {
            event: '*',
            schema: 'public',
            table,
          } as never,
          (payload: unknown) => {
            const p = payload as {
              eventType: 'INSERT' | 'UPDATE' | 'DELETE';
              new: Record<string, unknown>;
              old: Record<string, unknown>;
            };
            handler(p);
          }
        );
      }
    }

    // Register presence handlers
    if (presenceHandlers.onSync) {
      this.channel.on('presence', { event: 'sync' }, () => {
        const state = this.channel?.presenceState<PresenceData>() ?? {};
        presenceHandlers.onSync?.(state as Record<string, PresenceData[]>);
      });
    }

    if (presenceHandlers.onJoin) {
      this.channel.on('presence', { event: 'join' }, ({ key, newPresences }: { key: string; newPresences: unknown[] }) => {
        presenceHandlers.onJoin?.(key, (newPresences as unknown) as PresenceData[]);
      });
    }

    if (presenceHandlers.onLeave) {
      this.channel.on('presence', { event: 'leave' }, ({ key, leftPresences }: { key: string; leftPresences: unknown[] }) => {
        presenceHandlers.onLeave?.(key, (leftPresences as unknown) as PresenceData[]);
      });
    }

    this.channel.subscribe((status: 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT') => {
      if (onStatus) onStatus(status);
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`Realtime channel error for room ${roomCode}: ${status}`);
      }
    });
  }

  /**
   * Broadcast a typed event to all clients in the room.
   */
  broadcast<T extends BroadcastEvent>(
    event: T,
    payload: BroadcastPayload<T>
  ): void {
    if (!this.channel) {
      console.warn('Cannot broadcast: channel not initialized');
      return;
    }

    this.channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  }

  /**
   * Track this player's presence in the room.
   */
  trackPresence(playerData: PresenceData): void {
    if (!this.channel) {
      console.warn('Cannot track presence: channel not initialized');
      return;
    }

    this.channel.track(playerData);
  }

  /**
   * Untrack presence (go offline).
   */
  untrackPresence(): void {
    if (!this.channel) return;
    this.channel.untrack();
  }

  /**
   * Get current presence state.
   */
  getPresenceState(): Record<string, PresenceData[]> {
    if (!this.channel) return {};
    return this.channel.presenceState<PresenceData>() as Record<string, PresenceData[]>;
  }

  /**
   * Clean up: unsubscribe from the channel.
   */
  unsubscribe(): void {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  /** Check if currently subscribed */
  get isSubscribed(): boolean {
    return this.channel !== null;
  }

  /** Get the room code */
  get currentRoom(): string {
    return this.roomCode;
  }
}
