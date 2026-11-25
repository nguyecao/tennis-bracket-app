// Scores (optional, per tournament). Works for any format: a score is just a list of sets,
// each a pair of numbers [top player, bottom player]. Best of 3 or 5, one set, pro set (8–6),
// Fast4, a match tiebreak entered as a final "set" (10–8), or points-based games all fit.

export const MAX_SETS = 5

// Who won, from the score: more sets won, or the higher number in a one-set match.
// null when it's level or unfinished.
export function scoreWinner(sets, a, b) {
  let wa = 0
  let wb = 0
  for (const [x, y] of sets) {
    if (x > y) wa++
    else if (y > x) wb++
  }
  return wa > wb ? a : wb > wa ? b : null
}

// Sanity check for saved / received data
export const isScore = (s) =>
  !!s &&
  typeof s.a === 'string' &&
  typeof s.b === 'string' &&
  Array.isArray(s.sets) &&
  s.sets.length <= MAX_SETS &&
  s.sets.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => Number.isInteger(n) && n >= 0 && n < 1000))
