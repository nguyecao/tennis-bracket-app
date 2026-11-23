export const BYE = '__BYE__'

// Standard seeding order, e.g. size 8 -> [1, 8, 4, 5, 2, 7, 3, 6]
function seedOrder(size) {
  let order = [1]
  while (order.length < size) {
    const sum = order.length * 2 + 1
    order = order.flatMap((s) => [s, sum - s])
  }
  return order
}

export function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Players in seed order -> first-round slots (padded to a power of 2 with byes).
// Top seeds get the byes.
export function makeSlots(players) {
  let size = 2
  while (size < players.length) size *= 2
  return seedOrder(size).map((seed) => players[seed - 1] ?? BYE)
}

// Who wins a match? null = not decided yet
function decide(a, b, picked) {
  if (a === BYE && b === BYE) return BYE
  if (a === BYE) return b
  if (b === BYE) return a
  if (a && b && (picked === a || picked === b)) return picked
  return null
}

// Build every round from the first-round slots and the saved winners.
export function buildRounds(slots, winners, prefix) {
  const rounds = []
  let entries = slots
  for (let r = 0; entries.length >= 2; r++) {
    const matches = []
    for (let i = 0; i < entries.length; i += 2) {
      const id = `${prefix}${r}-${i / 2}`
      const [a, b] = [entries[i], entries[i + 1]]
      matches.push({ id, a, b, winner: decide(a, b, winners[id]) })
    }
    rounds.push(matches)
    entries = matches.map((m) => m.winner)
  }
  return rounds
}

function loserOf(m) {
  if (m.a === BYE || m.b === BYE) return BYE
  if (!m.winner) return null
  return m.winner === m.a ? m.b : m.a
}

// Consolation = everyone who loses their FIRST match
// (round 1, or round 2 for players who had a bye).
export function consolationSlots(main) {
  const [r1, r2] = main
  return r1.map((m, i) => {
    if (m.a !== BYE && m.b !== BYE) return loserOf(m)
    const p = m.winner // player who got the bye
    if (p === BYE || !r2) return BYE
    const lost = loserOf(r2[Math.floor(i / 2)])
    if (lost === null) return null
    return lost === p ? p : BYE
  })
}

// Main draw + optional consolation, as rounds of matches.
export function getBrackets(t) {
  const main = buildRounds(t.slots, t.winners, 'm')
  const consolation = t.consolation ? buildRounds(consolationSlots(main), t.winners, 'c') : null
  return { main, consolation }
}

// Toggle a winner, then drop any later picks that no longer apply
// (e.g. you changed an earlier result and that player is no longer in the match).
export function withPick(t, id, name) {
  const winners = { ...t.winners }
  if (winners[id] === name) delete winners[id]
  else winners[id] = name

  const { main, consolation } = getBrackets({ ...t, winners })
  const kept = {}
  for (const m of [...main, ...(consolation || [])].flat()) {
    if (winners[m.id] && winners[m.id] === m.winner) kept[m.id] = m.winner
  }
  return { ...t, winners: kept }
}

// Sanity-check a tournament from localStorage or from a live room.
export function isTournament(t) {
  const n = t?.slots?.length
  return (
    Array.isArray(t?.slots) &&
    n >= 2 &&
    (n & (n - 1)) === 0 &&
    t.slots.every((s) => typeof s === 'string') &&
    !!t.winners &&
    typeof t.winners === 'object' &&
    (t.seeds == null || Array.isArray(t.seeds))
  )
}
