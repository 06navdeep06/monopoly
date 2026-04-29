'use client';

import { useParams } from 'next/navigation';
import { useGame } from '@/hooks/useGame';
import GameBoard from '@/components/board/GameBoard';
import DiceRoll from '@/components/board/DiceRoll';
import ActionPanel from '@/components/game/ActionPanel';
import TradeModal from '@/components/game/TradeModal';
import AdminPanel from '@/components/game/AdminPanel';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatMoney } from '@/lib/utils/format';
import { getTokenEmoji } from '@/lib/utils/tokens';
import { cn } from '@/lib/utils';
import type { TradeOffer } from '@/types/game';

export default function GameRoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code ?? '';
  const supabase = useMemo(() => createClient(), []);

  const [roomId, setRoomId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRoom() {
      const { data: room } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', code)
        .single();

      if (room) setRoomId(room.id);
      setLoading(false);
    }
    if (code) loadRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const {
    gameState,
    myPlayerState,
    allPlayerStates,
    propertyStates,
    roomPlayers,
    currentPlayer,
    isMyTurn,
    phase,
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
    declareBankruptcy,
    isActionPending,
    lastError,
  } = useGame(roomId, code);

  const [tradeOpen, setTradeOpen] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);

  const handleRollDice = async () => {
    setDiceRolling(true);
    await rollDice();
    setTimeout(() => setDiceRolling(false), 1500);
  };

  const handleProposeTrade = async (
    offer: TradeOffer,
    request: TradeOffer,
    recipientId: string
  ) => {
    await proposeTrade(offer, request, recipientId);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-game-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-game-text-muted">Loading game...</p>
        </div>
      </main>
    );
  }

  if (!roomId) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center card-container p-8">
          <h2 className="font-display text-xl font-bold text-game-danger mb-2">Room Not Found</h2>
          <p className="text-game-text-muted mb-4">Code: {code}</p>
          <a href="/lobby" className="action-btn-primary">Back to Lobby</a>
        </div>
      </main>
    );
  }

  // Winner screen
  if (gameState?.winner_id) {
    const winner = roomPlayers.find((rp) => rp.id === gameState.winner_id);
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center card-container p-12">
          <span className="text-6xl mb-4 block">{getTokenEmoji(winner?.token ?? 'hat')}</span>
          <h2 className="font-display text-3xl font-bold text-game-gold mb-2">
            {winner?.display_name ?? 'Unknown'} Wins!
          </h2>
          <p className="text-game-text-muted mb-6">Game Over</p>
          <a href="/lobby" className="action-btn-primary">Play Again</a>
        </div>
      </main>
    );
  }

  const myRoomPlayer = roomPlayers.find(
    (rp) => rp.player_id === myPlayerState?.player_id ||
            rp.id === myPlayerState?.player_id
  );

  const otherPlayers = roomPlayers
    .filter((rp) => {
      const isMe = rp.player_id === myPlayerState?.player_id ||
                   rp.id === myPlayerState?.player_id;
      return !isMe;
    })
    .map((rp) => ({
      roomPlayer: rp,
      playerState: allPlayerStates.find(
        (ps) => ps.player_id === rp.id || ps.player_id === rp.player_id
      )!,
    }))
    .filter((p) => p.playerState);

  return (
    <main className="flex flex-col lg:flex-row min-h-screen p-2 sm:p-4 gap-4">
      {/* Left: Board */}
      <section className="flex-1 flex items-center justify-center">
        <GameBoard
          playerStates={allPlayerStates}
          propertyStates={propertyStates}
          roomPlayers={roomPlayers}
          currentPlayerId={gameState?.current_player_id}
        />
      </section>

      {/* Right: Controls */}
      <aside className="w-full lg:w-[360px] flex flex-col gap-3">
        {/* Room code */}
        <div className="card-container p-3 flex items-center justify-between">
          <span className="text-xs text-game-text-muted">Room</span>
          <span className="font-mono text-sm font-bold text-game-gold tracking-widest">{code}</span>
        </div>

        {/* Player list */}
        <div className="card-container p-3">
          <h3 className="text-xs font-semibold text-game-text-muted uppercase mb-2">Players</h3>
          <div className="space-y-2">
            {roomPlayers.map((rp) => {
              const ps = allPlayerStates.find((p) => p.player_id === rp.id);
              const isCurrent = rp.id === gameState?.current_player_id;
              return (
                <div
                  key={rp.id}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-lg transition-all',
                    isCurrent && 'bg-game-gold/10 ring-1 ring-game-gold/30',
                    ps?.is_bankrupt && 'opacity-40'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg" style={{ filter: `drop-shadow(0 0 3px ${rp.color})` }}>
                      {getTokenEmoji(rp.token)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-game-text-primary leading-tight">
                        {rp.display_name}
                        {rp.is_bot && <span className="text-game-text-muted text-xs ml-1">(Bot)</span>}
                      </p>
                      {ps?.is_bankrupt ? (
                        <p className="text-xs text-game-danger">Bankrupt</p>
                      ) : (
                        <p className="text-xs text-game-text-muted font-mono">
                          {formatMoney(ps?.cash ?? 0)}
                        </p>
                      )}
                    </div>
                  </div>
                  {ps && !ps.is_bankrupt && (
                    <span className="text-xs text-game-text-muted font-mono">
                      NW: {formatMoney(ps.net_worth)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dice */}
        <div className="card-container p-4 flex justify-center">
          <DiceRoll
            values={gameState?.dice_values ?? null}
            isRolling={diceRolling}
            isDoubles={
              gameState?.dice_values
                ? gameState.dice_values[0] === gameState.dice_values[1]
                : false
            }
          />
        </div>

        {/* Action Panel */}
        <ActionPanel
          phase={phase}
          isMyTurn={isMyTurn}
          myPlayerState={myPlayerState}
          currentPlayerName={currentPlayer?.display_name ?? 'Unknown'}
          propertyStates={propertyStates}
          onRollDice={handleRollDice}
          onBuyProperty={buyProperty}
          onDeclineProperty={declineProperty}
          onBuildHouse={buildHouse}
          onMortgage={mortgage}
          onUnmortgage={unmortgage}
          onEndTurn={endTurn}
          onPayJailFine={payJailFine}
          onUseJailCard={useJailCard}
          onProposeTrade={() => setTradeOpen(true)}
          onDeclareBankruptcy={declareBankruptcy}
          isActionPending={isActionPending}
        />

        {/* Error display */}
        {lastError && (
          <div className="bg-game-danger/20 border border-game-danger/50 rounded-lg p-2 text-center">
            <p className="text-game-danger text-xs">{lastError}</p>
          </div>
        )}
      </aside>

      {/* Trade Modal */}
      {myPlayerState && myRoomPlayer && (
        <TradeModal
          isOpen={tradeOpen}
          onClose={() => setTradeOpen(false)}
          myPlayerState={myPlayerState}
          myRoomPlayer={myRoomPlayer}
          otherPlayers={otherPlayers}
          propertyStates={propertyStates}
          onProposeTrade={handleProposeTrade}
        />
      )}

      {/* Admin Panel — toggled with Ctrl+Delete */}
      <AdminPanel
        forcedDice={forcedDice}
        setForcedDice={setForcedDice}
        rollDiceWithValues={rollDiceWithValues}
        isMyTurn={isMyTurn}
        phase={phase}
      />
    </main>
  );
}
