'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DiceRollProps {
  values: [number, number] | null;
  isRolling: boolean;
  isDoubles?: boolean;
  onRollComplete?: () => void;
  className?: string;
}

const PIP_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

/**
 * Animated dice component with pip faces.
 * Shows rolling animation, glows on doubles, shakes on "Go To Jail".
 */
export default function DiceRoll({
  values,
  isRolling,
  isDoubles = false,
  onRollComplete,
  className,
}: DiceRollProps) {
  const [displayValues, setDisplayValues] = useState<[number, number]>([1, 1]);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isRolling) {
      setAnimating(true);
      const intervalId = setInterval(() => {
        setDisplayValues([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ]);
      }, 80);

      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        if (values) {
          setDisplayValues(values);
        }
        setAnimating(false);
        onRollComplete?.();
      }, 1200);

      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    } else if (values) {
      setDisplayValues(values);
    }
  }, [isRolling, values, onRollComplete]);

  return (
    <div className={cn('flex items-center justify-center gap-4', className)}>
      {[0, 1].map((dieIndex) => {
        const value = displayValues[dieIndex] ?? 1;
        const pips = PIP_POSITIONS[value] ?? [];

        return (
          <motion.div
            key={dieIndex}
            animate={
              animating
                ? {
                    rotateX: [0, 360, 720],
                    rotateY: [0, 180, 360],
                    scale: [1, 1.2, 1],
                  }
                : { rotateX: 0, rotateY: 0, scale: 1 }
            }
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className={cn(
              'relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl',
              'bg-white shadow-lg border-2',
              isDoubles && !animating
                ? 'border-game-gold shadow-game-gold/50 animate-pulse-gold'
                : 'border-gray-200'
            )}
          >
            <div className="absolute inset-0">
              {pips.map(([x, y], i) => (
                <div
                  key={i}
                  className="absolute w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-game-navy"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              ))}
            </div>
          </motion.div>
        );
      })}

      <AnimatePresence>
        {values && !animating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center ml-2"
          >
            <span className="font-mono text-2xl font-bold text-game-text-primary">
              {values[0] + values[1]}
            </span>
            {isDoubles && (
              <span className="text-xs font-semibold text-game-gold animate-pulse">
                DOUBLES!
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
