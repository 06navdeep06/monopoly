'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User } from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<{ email?: string; user_metadata?: { username?: string } } | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="text-center max-w-2xl">
        <h1 className="font-display text-6xl sm:text-8xl font-extrabold text-game-gold mb-4 text-shadow-lg">
          KathPoly
        </h1>
        <p className="text-game-text-muted text-lg sm:text-xl mb-2">
          Au khela Ghar Ghar
        </p>
        <p className="text-game-text-muted text-sm mb-10">
          Sathi haru sanga
        </p>

        {!loading && user && (
          <div className="flex items-center justify-center gap-3 mb-6">
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

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/lobby"
            className="action-btn-primary text-lg px-8 py-4 rounded-xl shadow-lg shadow-game-gold/30 text-center"
          >
            Play Now
          </Link>
          {!user && (
            <Link
              href="/login"
              className="action-btn-secondary text-lg px-8 py-4 rounded-xl text-center"
            >
              Sign In
            </Link>
          )}
        </div>

        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: '2-8 Players', icon: '👥' },
            { label: '6 Themes', icon: '🎨' },
            { label: '16 Tokens', icon: '🎩' },
            { label: 'Bot AI', icon: '🤖' },
          ].map((feature) => (
            <div key={feature.label} className="card-container p-4">
              <span className="text-2xl mb-2 block">{feature.icon}</span>
              <span className="text-sm font-display text-game-text-muted">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
