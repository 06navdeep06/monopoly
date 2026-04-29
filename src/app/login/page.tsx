'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const guestInFlight = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: email.split('@')[0],
            },
          },
        });
        if (signUpError) throw signUpError;
        setMessage('Check your email for a confirmation link.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push('/lobby');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (guestInFlight.current) return;
    guestInFlight.current = true;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: { username: `Guest_${Math.floor(Math.random() * 9999)}` },
        },
      });

      if (error) throw error;
      if (!data.session) throw new Error('No session returned');
      router.push('/lobby');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guest login failed');
    } finally {
      setLoading(false);
      guestInFlight.current = false;
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-4xl font-bold text-game-gold text-center mb-2">RICHUP</h1>
        <p className="text-game-text-muted text-center text-sm mb-8">
          {isSignUp ? 'Create your account' : 'Sign in to play'}
        </p>

        <form onSubmit={handleSubmit} className="card-container p-6 space-y-4">
          <div>
            <label htmlFor="email" className="text-xs text-game-text-muted font-semibold uppercase block mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-game-navy border border-game-card-border rounded-lg px-4 py-2.5
                         text-sm text-game-text-primary placeholder:text-game-text-muted/50
                         focus:outline-none focus:ring-2 focus:ring-game-gold/50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-xs text-game-text-muted font-semibold uppercase block mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-game-navy border border-game-card-border rounded-lg px-4 py-2.5
                         text-sm text-game-text-primary placeholder:text-game-text-muted/50
                         focus:outline-none focus:ring-2 focus:ring-game-gold/50"
              placeholder="Min 6 characters"
            />
          </div>

          {error && (
            <div className="bg-game-danger/20 border border-game-danger/50 rounded-lg p-2">
              <p className="text-game-danger text-xs text-center">{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-game-success/20 border border-game-success/50 rounded-lg p-2">
              <p className="text-game-success text-xs text-center">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="action-btn-primary w-full py-3"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="w-full text-center text-xs text-game-text-muted hover:text-game-gold transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </form>

        <div className="mt-4">
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-game-card-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-game-navy px-3 text-xs text-game-text-muted">or</span>
            </div>
          </div>

          <button
            onClick={handleGuestLogin}
            disabled={loading}
            className="action-btn-secondary w-full py-3"
          >
            Play as Guest
          </button>
        </div>
      </div>
    </main>
  );
}
