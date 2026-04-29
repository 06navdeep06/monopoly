'use client';

import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BOARD_SPACES, COLOR_GROUP_CONFIG } from '@/lib/game/board-data';
import type { BoardSpace, PlayerState, PropertyState, RoomPlayer } from '@/types/game';
import { getTokenEmoji } from '@/lib/utils/tokens';
import { formatMoney } from '@/lib/utils/format';

interface GameBoardProps {
  playerStates: PlayerState[];
  propertyStates: PropertyState[];
  roomPlayers: RoomPlayer[];
  onSpaceClick?: (space: BoardSpace) => void;
  currentPlayerId?: string | null;
  className?: string;
}

/**
 * Main 40-space board rendered as an 11x11 CSS grid.
 * Corners occupy 2x2 cells; edges have 9 spaces each.
 * Player tokens animate between spaces using Framer Motion.
 */
export default function GameBoard({
  playerStates,
  propertyStates,
  roomPlayers,
  onSpaceClick,
  currentPlayerId,
  className,
}: GameBoardProps) {
  const [hoveredSpace, setHoveredSpace] = useState<number | null>(null);

  const getPlayersOnSpace = useCallback(
    (spaceId: number) =>
      playerStates.filter((ps) => ps.position === spaceId && !ps.is_bankrupt),
    [playerStates]
  );

  const getPropertyState = useCallback(
    (spaceId: number) => propertyStates.find((ps) => ps.property_id === spaceId),
    [propertyStates]
  );

  const getRoomPlayer = useCallback(
    (playerId: string) => roomPlayers.find((rp) => rp.id === playerId),
    [roomPlayers]
  );

  const gridPositions = useMemo(() => computeGridPositions(), []);

  return (
    <div className={cn('relative w-full max-w-[720px] aspect-square', className)}>
      <div className="grid grid-cols-11 grid-rows-11 w-full h-full gap-[1px] bg-board-border rounded-xl overflow-hidden">
        {BOARD_SPACES.map((space) => {
          const pos = gridPositions[space.id];
          if (!pos) return null;

          const propState = getPropertyState(space.id);
          const playersHere = getPlayersOnSpace(space.id);
          const isCorner = [0, 10, 20, 30].includes(space.id);
          const ownerRp = propState?.owner_id
            ? getRoomPlayer(propState.owner_id)
            : null;
          const colorHex = space.color_group
            ? COLOR_GROUP_CONFIG[space.color_group]?.hex
            : undefined;
          const isCurrentSpace = playerStates.some(
            (ps) => ps.player_id === currentPlayerId && ps.position === space.id
          );

          return (
            <div
              key={space.id}
              className={cn(
                'board-space relative',
                isCorner && 'col-span-2 row-span-2',
                isCurrentSpace && 'ring-2 ring-game-gold',
                hoveredSpace === space.id && 'brightness-125 z-20'
              )}
              style={{
                gridColumn: pos.col,
                gridRow: pos.row,
              }}
              onClick={() => onSpaceClick?.(space)}
              onMouseEnter={() => setHoveredSpace(space.id)}
              onMouseLeave={() => setHoveredSpace(null)}
            >
              {/* Color band for properties */}
              {colorHex && (
                <div
                  className="board-space-color-band"
                  style={{ backgroundColor: colorHex }}
                />
              )}

              {/* Owner overlay */}
              {ownerRp && (
                <div
                  className="absolute inset-0 opacity-10 rounded-sm"
                  style={{ backgroundColor: ownerRp.color }}
                />
              )}

              {/* Space content */}
              <div className="flex flex-col items-center justify-center p-0.5 text-center z-10 relative w-full h-full">
                {/* Flag + Name for properties */}
                {space.type === 'property' && space.flag && (
                  <div className="flex flex-col items-center gap-0 leading-none">
                    <span className="text-[10px] sm:text-sm leading-none">{space.flag}</span>
                    <span className="text-[5px] sm:text-[7px] leading-tight font-semibold text-game-text-primary truncate max-w-full px-0.5">
                      {space.name}
                    </span>
                    <span className="text-[5px] sm:text-[6px] font-mono text-game-gold leading-none">
                      {formatMoney(space.price ?? 0)}
                    </span>
                  </div>
                )}

                {/* Railroad / Utility */}
                {(space.type === 'railroad' || space.type === 'utility') && space.flag && (
                  <div className="flex flex-col items-center gap-0 leading-none">
                    <span className="text-[8px] sm:text-xs leading-none">{space.flag}</span>
                    <span className="text-[5px] sm:text-[7px] leading-tight font-semibold text-game-text-muted truncate max-w-full px-0.5">
                      {space.name}
                    </span>
                  </div>
                )}

                {/* Special spaces */}
                {space.type === 'go' && (
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] sm:text-xs font-bold text-game-success">START</span>
                    <span className="text-[5px] sm:text-[6px] text-game-gold">+$200</span>
                  </div>
                )}
                {space.type === 'jail_visit' && (
                  <span className="text-[7px] sm:text-[10px] font-bold text-game-danger">EMBASSY</span>
                )}
                {space.type === 'free_parking' && (
                  <span className="text-[6px] sm:text-[8px] font-bold text-game-success">WORLD<br/>TOUR</span>
                )}
                {space.type === 'go_to_jail' && (
                  <span className="text-[6px] sm:text-[7px] font-bold text-game-danger">EXTRADITION</span>
                )}
                {space.type === 'chance' && (
                  <div className="flex flex-col items-center">
                    <span className="text-sm sm:text-lg text-game-gold">?</span>
                    <span className="text-[5px] sm:text-[6px] text-game-text-muted">SURPRISE</span>
                  </div>
                )}
                {space.type === 'community_chest' && (
                  <div className="flex flex-col items-center">
                    <span className="text-[7px] sm:text-[9px] text-game-success">NEWS</span>
                    <span className="text-[5px] sm:text-[6px] text-game-text-muted">WORLD</span>
                  </div>
                )}
                {space.type === 'tax' && (
                  <div className="flex flex-col items-center">
                    <span className="text-[6px] sm:text-[8px] font-bold text-game-danger">{space.name}</span>
                    <span className="text-[5px] sm:text-[6px] font-mono text-game-danger">
                      {formatMoney(space.tax_amount ?? 0)}
                    </span>
                  </div>
                )}

                {/* Houses/Hotels */}
                {propState && propState.houses > 0 && propState.houses < 5 && (
                  <div className="flex gap-px">
                    {Array.from({ length: propState.houses }).map((_, i) => (
                      <span key={i} className="text-[6px] text-green-500">&#9632;</span>
                    ))}
                  </div>
                )}
                {propState?.houses === 5 && (
                  <span className="text-[8px] text-red-500">H</span>
                )}

                {/* Mortgaged indicator */}
                {propState?.is_mortgaged && (
                  <span className="text-[6px] text-game-danger font-bold">M</span>
                )}
              </div>

              {/* Player tokens */}
              <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-px z-20">
                <AnimatePresence>
                  {playersHere.map((ps) => {
                    const rp = getRoomPlayer(ps.player_id);
                    if (!rp) return null;
                    return (
                      <motion.div
                        key={ps.player_id}
                        layoutId={`token-${ps.player_id}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="text-[10px] sm:text-sm leading-none"
                        style={{ filter: `drop-shadow(0 0 3px ${rp.color})` }}
                        title={rp.display_name}
                      >
                        {getTokenEmoji(rp.token)}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}

        {/* Center area */}
        <div
          className="flex items-center justify-center bg-board-bg"
          style={{ gridColumn: '2 / 11', gridRow: '2 / 11' }}
        >
          <div className="text-center">
            <h2 className="font-display text-2xl sm:text-4xl font-bold text-game-gold text-shadow-lg">
              KathPoly
            </h2>
            <p className="text-game-text-muted text-xs mt-1">World Edition</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compute CSS grid positions for each board space.
 * Board layout: bottom row (L→R), left col (B→T), top row (R→L), right col (T→B).
 */
function computeGridPositions(): Record<number, { col: string; row: string }> {
  const positions: Record<number, { col: string; row: string }> = {};

  // Bottom row: spaces 0-10 (right to left visually, but grid L→R)
  // Space 0 (Go) = bottom-right corner
  for (let i = 0; i <= 10; i++) {
    const col = 11 - i;
    if (i === 0) {
      positions[0] = { col: '10 / 12', row: '10 / 12' };
    } else if (i === 10) {
      positions[10] = { col: '1 / 3', row: '10 / 12' };
    } else {
      positions[i] = { col: `${11 - i} / ${12 - i}`, row: '10 / 12' };
    }
  }

  // Left column: spaces 11-19 (bottom to top)
  for (let i = 0; i < 9; i++) {
    positions[11 + i] = { col: '1 / 3', row: `${9 - i} / ${10 - i}` };
  }

  // Top row: spaces 20-30 (left to right)
  positions[20] = { col: '1 / 3', row: '1 / 3' };
  for (let i = 1; i <= 9; i++) {
    positions[20 + i] = { col: `${2 + i} / ${3 + i}`, row: '1 / 3' };
  }
  positions[30] = { col: '10 / 12', row: '1 / 3' };

  // Right column: spaces 31-39 (top to bottom)
  for (let i = 0; i < 9; i++) {
    positions[31 + i] = { col: '10 / 12', row: `${2 + i} / ${3 + i}` };
  }

  return positions;
}
