'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/utils/format';
import { getBoardSpace } from '@/lib/game/board-data';
import type { GamePhase, PlayerState, PropertyState, RoomPlayer } from '@/types/game';
import {
  Dice5,
  Home,
  Building2,
  ArrowRightLeft,
  Banknote,
  Ban,
  Timer,
  CreditCard,
  HandCoins,
} from 'lucide-react';

interface ActionPanelProps {
  phase: GamePhase;
  isMyTurn: boolean;
  myPlayerState: PlayerState | null;
  currentPlayerName: string;
  propertyStates: PropertyState[];
  onRollDice: () => void;
  onBuyProperty: (propertyId: number) => void;
  onDeclineProperty: (propertyId: number) => void;
  onBuildHouse: (propertyId: number) => void;
  onMortgage: (propertyId: number) => void;
  onUnmortgage: (propertyId: number) => void;
  onEndTurn: () => void;
  onPayJailFine: () => void;
  onUseJailCard: () => void;
  onProposeTrade: () => void;
  onDeclareBankruptcy: () => void;
  isActionPending: boolean;
  className?: string;
}

/**
 * Context-aware action panel that shows only valid actions for the current game phase.
 */
export default function ActionPanel({
  phase,
  isMyTurn,
  myPlayerState,
  currentPlayerName,
  propertyStates,
  onRollDice,
  onBuyProperty,
  onDeclineProperty,
  onBuildHouse,
  onMortgage,
  onUnmortgage,
  onEndTurn,
  onPayJailFine,
  onUseJailCard,
  onProposeTrade,
  onDeclareBankruptcy,
  isActionPending,
  className,
}: ActionPanelProps) {
  const currentSpace = myPlayerState
    ? getBoardSpace(myPlayerState.position)
    : null;

  const myProperties = useMemo(
    () =>
      myPlayerState
        ? propertyStates.filter((p) => p.owner_id === myPlayerState.player_id)
        : [],
    [propertyStates, myPlayerState]
  );

  if (!isMyTurn) {
    return (
      <div className={cn('card-container flex items-center justify-center py-6', className)}>
        <div className="flex items-center gap-3 text-game-text-muted">
          <Timer className="w-5 h-5 animate-spin" />
          <span className="font-display text-sm">
            {currentPlayerName && currentPlayerName !== 'Unknown' ? (
              <>Waiting for <span className="text-game-text-primary font-semibold">{currentPlayerName}</span>...</>
            ) : (
              'Waiting for the game to start...'
            )}
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('card-container', className)}
    >
      {/* Roll Phase */}
      {phase === 'roll' && (
        <div className="flex flex-col items-center gap-3 py-4">
          <button
            onClick={onRollDice}
            disabled={isActionPending}
            className="action-btn-primary text-lg px-8 py-4 rounded-xl font-bold
                       shadow-lg shadow-game-gold/30 hover:shadow-game-gold/50
                       transition-all duration-200 active:scale-95"
          >
            <span className="flex items-center gap-2">
              <Dice5 className="w-6 h-6" />
              Roll Dice
            </span>
          </button>
        </div>
      )}

      {/* Jail Decision */}
      {phase === 'jail_decision' && (
        <div className="flex flex-col gap-3 py-4">
          <h3 className="font-display text-sm text-center text-game-text-muted mb-1">You&apos;re in Jail!</h3>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={onPayJailFine}
              disabled={isActionPending || (myPlayerState?.cash ?? 0) < 50}
              className="action-btn-primary"
            >
              <span className="flex items-center gap-1.5">
                <Banknote className="w-4 h-4" />
                Pay $50
              </span>
            </button>
            <button
              onClick={onUseJailCard}
              disabled={isActionPending || (myPlayerState?.get_out_of_jail_cards ?? 0) <= 0}
              className="action-btn-success"
            >
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" />
                Use Card ({myPlayerState?.get_out_of_jail_cards ?? 0})
              </span>
            </button>
            <button
              onClick={onRollDice}
              disabled={isActionPending}
              className="action-btn-secondary"
            >
              <span className="flex items-center gap-1.5">
                <Dice5 className="w-4 h-4" />
                Roll for Doubles
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Buy Decision */}
      {phase === 'buy' && currentSpace?.price && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="text-center mb-2">
            <p className="font-display text-sm text-game-text-muted">
              You landed on
            </p>
            <p className="font-display text-lg font-bold text-game-text-primary">
              {currentSpace.name}
            </p>
            <p className="font-mono text-game-gold text-lg font-semibold">
              {formatMoney(currentSpace.price)}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onBuyProperty(currentSpace.id)}
              disabled={isActionPending || (myPlayerState?.cash ?? 0) < (currentSpace.price ?? 0)}
              className="action-btn-success px-6"
            >
              <span className="flex items-center gap-1.5">
                <HandCoins className="w-4 h-4" />
                Buy for {formatMoney(currentSpace.price)}
              </span>
            </button>
            <button
              onClick={() => onDeclineProperty(currentSpace.id)}
              disabled={isActionPending}
              className="action-btn-secondary"
            >
              Auction
            </button>
          </div>
        </div>
      )}

      {/* Action Phase + End Turn Phase */}
      {(phase === 'action' || phase === 'end_turn') && (
        <div className="flex flex-col gap-3 py-3">
          <div className="flex flex-wrap justify-center gap-2">
            {myProperties.some((p) => p.houses < 4 && !p.is_mortgaged) && (
              <button
                onClick={() => {
                  const target = myProperties.find((p) => p.houses < 4 && !p.is_mortgaged);
                  if (target) onBuildHouse(target.property_id);
                }}
                disabled={isActionPending}
                className="action-btn-secondary text-xs"
              >
                <span className="flex items-center gap-1">
                  <Home className="w-3.5 h-3.5" />
                  Build House
                </span>
              </button>
            )}

            {myProperties.some((p) => !p.is_mortgaged && p.houses === 0) && (
              <button
                onClick={() => {
                  const target = myProperties.find((p) => !p.is_mortgaged && p.houses === 0);
                  if (target) onMortgage(target.property_id);
                }}
                disabled={isActionPending}
                className="action-btn-secondary text-xs"
              >
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  Mortgage
                </span>
              </button>
            )}

            {myProperties.some((p) => p.is_mortgaged) && (
              <button
                onClick={() => {
                  const target = myProperties.find((p) => p.is_mortgaged);
                  if (target) onUnmortgage(target.property_id);
                }}
                disabled={isActionPending}
                className="action-btn-secondary text-xs"
              >
                Unmortgage
              </button>
            )}

            <button
              onClick={onProposeTrade}
              disabled={isActionPending}
              className="action-btn-secondary text-xs"
            >
              <span className="flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Trade
              </span>
            </button>

            <button
              onClick={onDeclareBankruptcy}
              disabled={isActionPending}
              className="action-btn-danger text-xs"
            >
              <span className="flex items-center gap-1">
                <Ban className="w-3.5 h-3.5" />
                Bankrupt
              </span>
            </button>
          </div>

          <button
            onClick={onEndTurn}
            disabled={isActionPending}
            className="action-btn-primary w-full mt-2"
          >
            End Turn
          </button>
        </div>
      )}
    </motion.div>
  );
}
