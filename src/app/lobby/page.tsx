'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, LogIn, LogOut, User } from 'lucide-react';

export default function LobbyPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { username?: string } } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id, email: data.user.email, user_metadata: data.user.user_metadata } : null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email, user_metadata: session.user.user_metadata } : null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  };

  const ensureProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_token, preferred_color')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) {
        const username =
          (await supabase.auth.getSession()).data.session?.user.user_metadata?.username ??
          `Player_${Math.floor(Math.random() * 9999)}`;

        const { error: insertErr } = await supabase.from('profiles').insert({
          id: userId,
          username,
          avatar_token: 'hat',
          preferred_color: '#F59E0B',
        });

        if (insertErr) {
          throw new Error(`Profile creation failed: ${insertErr.message}`);
        }

        return { username, avatar_token: 'hat', preferred_color: '#F59E0B' };
      }
      return profile;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes("Could not find the table 'public.profiles'") || msg.includes('relation "profiles" does not exist')) {
        throw new Error(
          "Database table 'profiles' is missing. Run the Supabase migration: npx supabase db push"
        );
      }
      throw err;
    }
  };

  const createRoom = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Ensure profile exists (required by FK constraints)
      const profile = await ensureProfile(user.id);

      // Generate room code (retry on collision)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      let room: { id: string; code: string } | null = null;
      let roomError: { message: string } | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        code = '';
        for (let i = 0; i < 6; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        const { data, error } = await supabase
          .from('rooms')
          .insert({
            code,
            host_id: user.id,
            status: 'waiting',
          })
          .select('id, code')
          .single();
        if (!error) {
          room = data;
          break;
        }
        roomError = error;
      }
      if (!room) throw new Error(roomError ? `Room creation failed: ${roomError.message}` : 'Room was not created');

      // Join as player
      const { error: joinErr } = await supabase.from('room_players').insert({
        room_id: room.id,
        player_id: user.id,
        display_name: profile.username ?? 'Player',
        token: profile.avatar_token ?? 'hat',
        color: profile.preferred_color ?? '#F59E0B',
        turn_order: 1,
        status: 'waiting',
      });

      if (joinErr) throw new Error(`Join room failed: ${joinErr.message}`);

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

      // Ensure profile exists (required by FK constraints)
      const profile = await ensureProfile(user.id);

      // Check if already in room
      const { data: existing } = await supabase
        .from('room_players')
        .select('id')
        .eq('room_id', room.id)
        .eq('player_id', user.id)
        .maybeSingle();

      if (!existing) {
        const { count: playerCount } = await supabase
          .from('room_players')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', room.id);

        const { error: joinErr } = await supabase.from('room_players').insert({
          room_id: room.id,
          player_id: user.id,
          display_name: profile.username ?? 'Player',
          token: profile.avatar_token ?? 'hat',
          color: profile.preferred_color ?? '#3B82F6',
          turn_order: (playerCount ?? 0) + 1,
          status: 'waiting',
        });
        if (joinErr) throw new Error(`Join room failed: ${joinErr.message}`);
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
      <h1 className="font-display text-4xl font-bold text-game-gold mb-4">Game Lobby</h1>

      {user && (
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2 bg-game-card border border-game-card-border rounded-full px-4 py-2">
            <User className="w-4 h-4 text-game-gold" />
            <span className="text-game-text-primary text-sm">
              {user.user_metadata?.username ?? user.email ?? 'Player'}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 text-game-danger text-sm hover:underline"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}

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
