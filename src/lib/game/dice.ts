// ═══════════════════════════════════════════════════════════════
// DICE LOGIC — Rolling, doubles detection, jail on 3x doubles
// ═══════════════════════════════════════════════════════════════

/** Roll two six-sided dice */
export function rollDice(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

/** Check if both dice show the same value */
export function isDoubles(dice: [number, number]): boolean {
  return dice[0] === dice[1];
}

/** Sum of both dice */
export function getDiceTotal(dice: [number, number]): number {
  return dice[0] + dice[1];
}

/**
 * Process a dice roll including doubles tracking.
 * Returns the new consecutive doubles count and whether the player goes to jail.
 */
export function processDiceRoll(
  dice: [number, number],
  previousConsecutiveDoubles: number
): {
  total: number;
  doubles: boolean;
  consecutiveDoubles: number;
  goToJail: boolean;
} {
  const doubles = isDoubles(dice);
  const consecutiveDoubles = doubles ? previousConsecutiveDoubles + 1 : 0;
  const goToJail = consecutiveDoubles >= 3;

  return {
    total: getDiceTotal(dice),
    doubles,
    consecutiveDoubles: goToJail ? 0 : consecutiveDoubles,
    goToJail,
  };
}

/** Maximum consecutive doubles before going to jail */
export const MAX_DOUBLES_BEFORE_JAIL = 3;

/** Maximum jail turns before forced payment */
export const MAX_JAIL_TURNS = 3;

/** Cost to pay out of jail */
export const JAIL_FINE = 50;
