# Richup — Private Monopoly Clone

A real-time multiplayer Monopoly-style board game with all premium features unlocked. No ads, no paywalls.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript strict, Tailwind CSS, Framer Motion
- **State**: Zustand + React Query
- **Backend**: Supabase (PostgreSQL, Realtime, Auth, Edge Functions)
- **Deployment**: Vercel (frontend), Supabase (backend)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase CLI (`npm install -g supabase`)
- A Supabase project ([supabase.com](https://supabase.com))

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd richup-clone
npm install
```

### 2. Environment Variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Required variables:
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g. `http://localhost:3000`) |

### 3. Database Setup

Start Supabase locally (or use your hosted project):

```bash
# Local development
supabase start
supabase db push

# Or apply migration to remote
supabase link --project-ref <your-project-ref>
supabase db push
```

The migration file at `supabase/migrations/001_initial_schema.sql` creates all tables, enums, RLS policies, indexes, and triggers.

### 4. Deploy Edge Functions

```bash
supabase functions deploy game-action
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   ├── login/page.tsx      # Auth page
│   ├── lobby/page.tsx      # Room create/join
│   ├── room/[code]/page.tsx # Game room
│   └── globals.css         # Tailwind + custom styles
├── components/
│   ├── board/
│   │   ├── GameBoard.tsx   # 40-space board grid
│   │   └── DiceRoll.tsx    # Animated dice
│   └── game/
│       ├── ActionPanel.tsx # Context-aware action buttons
│       └── TradeModal.tsx  # Trade proposal UI
├── hooks/
│   └── useGame.ts          # Main game hook (state + actions)
├── lib/
│   ├── game/               # Core game logic (pure functions)
│   │   ├── board-data.ts   # 40 board spaces
│   │   ├── card-data.ts    # Chance + Community Chest cards
│   │   ├── dice.ts         # Dice rolling + doubles
│   │   ├── rent.ts         # Rent calculation engine
│   │   ├── property-rules.ts # Buy/build/mortgage validation
│   │   ├── bankruptcy.ts   # Asset liquidation
│   │   ├── turn-manager.ts # Turn flow state machine
│   │   └── bot-ai.ts       # Bot AI (easy/medium/hard)
│   ├── realtime/           # Supabase Realtime
│   │   ├── broadcast-events.ts # Typed event definitions
│   │   ├── supabase-realtime.ts # Channel manager
│   │   └── presence.ts     # Online tracking
│   ├── supabase/
│   │   ├── client.ts       # Browser Supabase client
│   │   └── server.ts       # Server Supabase client
│   └── utils/
│       ├── format.ts       # Currency/time formatters
│       ├── tokens.ts       # Player tokens (all unlocked)
│       ├── themes.ts       # Board themes (all unlocked)
│       └── colors.ts       # Player colors
├── types/
│   └── game.ts             # All TypeScript interfaces
└── middleware.ts            # Auth route protection
supabase/
├── migrations/
│   └── 001_initial_schema.sql
└── functions/
    └── game-action/
        └── index.ts        # Edge Function for game mutations
```

## Deployment to Vercel

1. Push to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy — Vercel auto-detects Next.js

## Features

- **2-8 players** with real-time sync
- **Bot AI** with 3 difficulty levels
- **6 board themes** — Classic, Space, Pirate, Neon, Medieval, Tropical
- **16 player tokens** — all unlocked
- **Full Monopoly rules** — rent, building, mortgaging, trading, auctions, jail
- **Free Parking jackpot** (optional house rule)
- **Speed mode** (no auctions)
- **Animated dice, token movement, card draws**
- **Mobile responsive**

## Architecture Notes

- All game mutations go through the `game-action` Edge Function (server-authoritative)
- RLS policies enforce read scoping; mutations bypass RLS via service role key
- Postgres Changes deliver state sync; broadcast events trigger UI animations
- Optimistic UI updates with rollback on server rejection

## License

Private — not for redistribution.
