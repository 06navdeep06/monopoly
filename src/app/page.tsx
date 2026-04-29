import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="text-center max-w-2xl">
        <h1 className="font-display text-6xl sm:text-8xl font-extrabold text-game-gold mb-4 text-shadow-lg">
          RICHUP
        </h1>
        <p className="text-game-text-muted text-lg sm:text-xl mb-2">
          Au khela Ghar Ghar
        </p>
        <p className="text-game-text-muted text-sm mb-10">
          Sathi haru sanga
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/lobby"
            className="action-btn-primary text-lg px-8 py-4 rounded-xl shadow-lg shadow-game-gold/30 text-center"
          >
            Play Now
          </Link>
          <Link
            href="/login"
            className="action-btn-secondary text-lg px-8 py-4 rounded-xl text-center"
          >
            Sign In
          </Link>
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
