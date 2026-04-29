'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GamePhase } from '@/types/game';
import { Settings, Dice5, X, Lock, Unlock } from 'lucide-react';

interface AdminPanelProps {
  forcedDice: [number, number] | null;
  setForcedDice: (dice: [number, number] | null) => void;
  rollDiceWithValues: (die1: number, die2: number) => Promise<void>;
  isMyTurn: boolean;
  phase: GamePhase;
}

/**
 * Hidden admin panel toggled by Ctrl+Delete.
 * Allows the user to pre-select dice values before rolling.
 * The forced values are sent to the server and used instead of random rolls.
 */
export default function AdminPanel({
  forcedDice,
  setForcedDice,
  rollDiceWithValues,
  isMyTurn,
  phase,
}: AdminPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [die1, setDie1] = useState<number>(1);
  const [die2, setDie2] = useState<number>(1);
  const [isLocked, setIsLocked] = useState(false);

  // Ctrl+Delete toggles the panel
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Delete') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Sync lock state with forcedDice
  const handleLockToggle = () => {
    if (isLocked) {
      // Unlock: clear forced dice
      setForcedDice(null);
      setIsLocked(false);
    } else {
      // Lock: set forced dice to current selection
      setForcedDice([die1, die2]);
      setIsLocked(true);
    }
  };

  // Update forcedDice whenever die values change while locked
  useEffect(() => {
    if (isLocked) {
      setForcedDice([die1, die2]);
    }
  }, [die1, die2, isLocked, setForcedDice]);

  const handleQuickRoll = async () => {
    await rollDiceWithValues(die1, die2);
  };

  const canRoll = isMyTurn && (phase === 'roll' || phase === 'jail_decision');

  const dieFaces = [1, 2, 3, 4, 5, 6];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 right-4 z-[9999] w-72"
        >
          <div className="bg-game-card border-2 border-game-gold/40 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-game-gold/10 border-b border-game-gold/20">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-game-gold animate-spin" style={{ animationDuration: '3s' }} />
                <span className="font-display text-sm font-bold text-game-gold tracking-wide">
                  ADMIN PANEL
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-game-text-muted" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Dice Selector */}
              <div>
                <p className="text-xs text-game-text-muted font-semibold uppercase tracking-wider mb-2">
                  Set Dice Values
                </p>

                <div className="flex gap-6 justify-center">
                  {/* Die 1 */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] text-game-text-muted uppercase">Die 1</span>
                    <div className="grid grid-cols-3 gap-1">
                      {dieFaces.map((val) => (
                        <button
                          key={`d1-${val}`}
                          onClick={() => setDie1(val)}
                          className={cn(
                            'w-8 h-8 rounded-md text-sm font-bold transition-all duration-150',
                            'border hover:scale-110 active:scale-95',
                            die1 === val
                              ? 'bg-game-gold text-game-navy border-game-gold shadow-md shadow-game-gold/30'
                              : 'bg-game-navy/60 text-game-text-muted border-game-card-border hover:border-game-gold/50'
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Die 2 */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] text-game-text-muted uppercase">Die 2</span>
                    <div className="grid grid-cols-3 gap-1">
                      {dieFaces.map((val) => (
                        <button
                          key={`d2-${val}`}
                          onClick={() => setDie2(val)}
                          className={cn(
                            'w-8 h-8 rounded-md text-sm font-bold transition-all duration-150',
                            'border hover:scale-110 active:scale-95',
                            die2 === val
                              ? 'bg-game-gold text-game-navy border-game-gold shadow-md shadow-game-gold/30'
                              : 'bg-game-navy/60 text-game-text-muted border-game-card-border hover:border-game-gold/50'
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="flex items-center gap-2 bg-game-navy/60 rounded-lg px-4 py-2 border border-game-card-border">
                  <span className="text-2xl font-bold text-game-gold font-mono">{die1}</span>
                  <span className="text-game-text-muted text-sm">+</span>
                  <span className="text-2xl font-bold text-game-gold font-mono">{die2}</span>
                  <span className="text-game-text-muted text-sm">=</span>
                  <span className="text-2xl font-bold text-game-text-primary font-mono">{die1 + die2}</span>
                </div>
                {die1 === die2 && (
                  <span className="text-xs font-bold text-game-success bg-game-success/20 px-2 py-0.5 rounded-full">
                    DOUBLES
                  </span>
                )}
              </div>

              {/* Lock Toggle */}
              <button
                onClick={handleLockToggle}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all',
                  'border',
                  isLocked
                    ? 'bg-game-gold/20 border-game-gold/50 text-game-gold hover:bg-game-gold/30'
                    : 'bg-game-navy/60 border-game-card-border text-game-text-muted hover:border-game-gold/40 hover:text-game-text-primary'
                )}
              >
                {isLocked ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Dice Locked — Next roll uses {die1} + {die2}
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    Lock Dice Values
                  </>
                )}
              </button>

              {/* Quick Roll Button */}
              <button
                onClick={handleQuickRoll}
                disabled={!canRoll}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all',
                  canRoll
                    ? 'bg-game-gold text-game-navy hover:brightness-110 active:scale-[0.98] shadow-lg shadow-game-gold/30'
                    : 'bg-game-navy/40 text-game-text-muted/40 cursor-not-allowed border border-game-card-border'
                )}
              >
                <Dice5 className="w-5 h-5" />
                Force Roll ({die1} + {die2} = {die1 + die2})
              </button>

              {/* Status */}
              <div className="text-center space-y-1">
                {forcedDice ? (
                  <p className="text-xs text-game-gold">
                    Rigged: next roll will be [{forcedDice[0]}, {forcedDice[1]}]
                  </p>
                ) : (
                  <p className="text-xs text-game-text-muted">Dice are random (not rigged)</p>
                )}
                <p className="text-[10px] text-game-text-muted/50">
                  Ctrl+Delete to toggle this panel
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
