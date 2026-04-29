'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Users, Plus, LogIn } from 'lucide-react';

export default function LobbyPage() {
  const supabase = createClient();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Generate room code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }

      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          code,
          host_id: user.id,
          status: 'waiting',
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_token, preferred_color')
        .eq('id', user.id)
        .single();

      // Join as player
      await supabase.from('room_players').insert({
        room_id: room.id,
        player_id: user.id,
        display_name: profile?.username ?? 'Player',
        token: profile?.avatar_token ?? 'hat',
        color: profile?.preferred_color ?? '#F59E0B',
        turn_order: 1,
        status: 'waiting',
      });

      router.push(`/room/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return;
    setIsJoining(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', joinCode.toUpperCase().trim())
        .single();

      if (roomError || !room) {
        setError('Room not found');
        return;
      }

      if (room.status !== 'waiting') {
        setError('Game already in progress');
        return;
      }

      // Check if already in room
      const { data: existing } = await supabase
        .from('room_players')
        .select('id')
        .eq('room_id', room.id)
        .eq('player_id', user.id)
        .single();

      if (!existing) {
        const { data: playerCount } = await supabase
          .from('room_players')
          .select('id', { count: 'exact' })
          .eq('room_id', room.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_token, preferred_color')
          .eq('id', user.id)
          .single();

        await supabase.from('room_players').insert({
          room_id: room.id,
          player_id: user.id,
          display_name: profile?.username ?? 'Player',
          token: profile?.avatar_token ?? 'hat',
          color: profile?.preferred_color ?? '#3B82F6',
          turn_order: (playerCount?.length ?? 0) + 1,
          status: 'waiting',
        });
      }

      router.push(`/room/${room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <h1 className="font-display text-4xl font-bold text-game-gold mb-8">Game Lobby</h1>

      <div className="w-full max-w-md space-y-6">
        {/* Create Room */}
        <div className="card-container p-6">
          <h2 className="font-display text-lg font-semibold text-game-text-primary mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-game-gold" />
            Create Room
          </h2>
          <button
            onClick={createRoom}
            disabled={isCreating}
            className="action-btn-primary w-full py-3 text-base"
          >
            {isCreating ? 'Creating...' : 'Create New Game'}
          </button>
        </div>

        {/* Join Room */}
        <div className="card-container p-6">
          <h2 className="font-display text-lg font-semibold text-game-text-primary mb-4 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-game-success" />
            Join Room
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="flex-1 bg-game-navy border border-game-card-border rounded-lg px-4 py-3
                         text-center font-mono text-lg tracking-widest uppercase
                         text-game-text-primary placeholder:text-game-text-muted/50
                         focus:outline-none focus:ring-2 focus:ring-game-gold/50"
            />
            <button
              onClick={joinRoom}
              disabled={isJoining || joinCode.length < 6}
              className="action-btn-success px-6 py-3"
            >
              {isJoining ? '...' : 'Join'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-game-danger/20 border border-game-danger/50 rounded-lg p-3 text-center">
            <p className="text-game-danger text-sm">{error}</p>
          </div>
        )}
      </div>
    </main>
  );
}
