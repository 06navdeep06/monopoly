// ═══════════════════════════════════════════════════════════════
// PRESENCE TRACKING — Player online/offline status
// ═══════════════════════════════════════════════════════════════

import type { PresenceData } from './supabase-realtime';

export interface PresenceState {
  onlinePlayers: Map<string, PresenceData>;
  lastSeen: Map<string, string>;
}

/** Create initial presence state */
export function createPresenceState(): PresenceState {
  return {
    onlinePlayers: new Map(),
    lastSeen: new Map(),
  };
}

/** Process presence sync event */
export function handlePresenceSync(
  state: Record<string, PresenceData[]>
): Map<string, PresenceData> {
  const online = new Map<string, PresenceData>();

  for (const [_key, presences] of Object.entries(state)) {
    for (const presence of presences) {
      online.set(presence.playerId, presence);
    }
  }

  return online;
}

/** Check if a player is currently online */
export function isPlayerOnline(
  playerId: string,
  onlinePlayers: Map<string, PresenceData>
): boolean {
  return onlinePlayers.has(playerId);
}

/** Get count of online players */
export function getOnlineCount(onlinePlayers: Map<string, PresenceData>): number {
  return onlinePlayers.size;
}
