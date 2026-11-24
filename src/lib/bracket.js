import { getGroups, mainDrawFromGroups } from './groups'
export const BYE = '__BYE__'

// Standard seeding order, e.g. size 8 -> [1, 8, 4, 5, 2, 7, 3, 6]
export function seedOrder(size) {
  let order = [1]
  while (order.length < size) {
    const sum = order.length * 2 + 1
    order = order.flatMap((s) => [s, sum - s])
  }
  return order
}

// "Final", "Semifinals", "Quarterfinals", "Round of 16"... from the number of matches in a round
export function roundName(matches) {
  if (matches === 1) return 'Final'
  if (matches === 2) return 'Semifinals'
  if (matches === 4) return 'Quarterfinals'
  return `Round of ${matches * 2}`
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

// Everything the screen needs, worked out from the saved tournament:
// groups (group stage only), main draw rounds, consolation rounds, and placeholder labels
// for Main Draw spots still waiting on a group.
export function getBrackets(t) {
  let groups = null
  let slots = t.slots
  let labels = null
  let drawSeeds = null // Main Draw seeds earned in the group stage
  if (t.format === 'groups') {
    groups = getGroups(t)
    const draw = mainDrawFromGroups(groups, t.advance)
    slots = draw?.slots ?? null
    labels = draw?.labels ?? null
    drawSeeds = draw?.seeds ?? null
  }
  const main = slots ? buildRounds(slots, t.winners, 'm') : null
  const consolation =
    main && t.consolation && slots.length >= 4
      ? buildRounds(consolationSlots(main), t.winners, 'c')
      : null
  return { groups, main, consolation, labels, drawSeeds }
}

// Drop any picks that no longer apply (e.g. an earlier result or a group's order changed
// and that player is no longer in the match).
function prune(t) {
  const { groups, main, consolation } = getBrackets(t)
  const kept = {}
  const all = [...(groups || []).flatMap((g) => g.matches), ...[...(main || []), ...(consolation || [])].flat()]
  for (const m of all) {
    if (t.winners[m.id] && t.winners[m.id] === m.winner) kept[m.id] = m.winner
  }
  return { ...t, winners: kept }
}

// Toggle a winner (click again to undo), then tidy up anything that depended on it.
export function withPick(t, id, name) {
  const winners = { ...t.winners }
  if (winners[id] === name) delete winners[id]
  else winners[id] = name

  // A changed group result can create different ties, so the host's tie order for that
  // group no longer applies.
  let tieOrder = t.tieOrder
  const group = /^g(\d+)-/.exec(id)?.[1]
  if (group != null && tieOrder?.[group]) {
    tieOrder = { ...tieOrder }
    delete tieOrder[group]
  }
  return prune({ ...t, winners, tieOrder })
}

// Host put tied group players in order. This can change who advances, so tidy the Main Draw.
export function withTieOrder(t, group, order) {
  return prune({ ...t, tieOrder: { ...t.tieOrder, [group]: order } })
}

// Sanity-check a tournament from localStorage or from a live room.
const isNameList = (l) => Array.isArray(l) && l.every((s) => typeof s === 'string')

export function isTournament(t) {
  if (!t || typeof t !== 'object' || !t.winners || typeof t.winners !== 'object') return false
  if (t.seeds != null && !isNameList(t.seeds)) return false
  if (t.name != null && (typeof t.name !== 'string' || t.name.length > 100)) return false
  if (t.date != null && !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return false

  if (t.format === 'groups') {
    return (
      Array.isArray(t.groups) &&
      t.groups.length >= 1 &&
      t.groups.every((g) => typeof g?.name === 'string' && isNameList(g.players) && g.players.length >= 2) &&
      (t.advance === 'all' ||
        (Number.isInteger(t.advance) &&
          t.advance >= 1 &&
          t.groups.every((g) => g.players.length > t.advance || t.groups.length * t.advance === 1))) &&
      (t.tieOrder == null || Object.values(t.tieOrder).every(isNameList))
    )
  }

  const n = t.slots?.length
  return isNameList(t.slots) && n >= 2 && (n & (n - 1)) === 0
}
