import { BYE, seedOrder } from './bracket'

// ---------- Group stage (round robin) ----------
// A tournament with format 'groups' stores:
//   groups:  [{ name: 'A', players: [...] }, ...]
//   advance: how many from each group go into the Main Draw
//   tieOrder: { [groupIndex]: [names...] }   host's order for players still tied
// Group match winners live in the same `winners` map as the bracket (ids "g<group>-<round>-<n>").

export const RECOMMENDED_GROUP_SIZE = 4
export const GROUP_SIZES = [3, 4, 5, 6, 8]
// One group of n players means n×(n−1)/2 matches: 16 players is already 120
export const MAX_SINGLE_GROUP = 16

const groupName = (i) => (i < 26 ? String.fromCharCode(65 + i) : String(i + 1))
const ordinal = (n) => ['1st', '2nd', '3rd'][n - 1] || `${n}th`

// How players split for a given group size ('all' = one group).
export function planGroups(count, size) {
  const groups = size === 'all' ? 1 : Math.max(1, Math.ceil(count / size))
  const base = Math.floor(count / groups)
  const extra = count % groups
  const sizes = Array.from({ length: groups }, (_, i) => base + (i < extra ? 1 : 0))
  return { groups, sizes, smallest: Math.min(...sizes), largest: Math.max(...sizes) }
}

// Players in seed (or shuffled) order -> groups, "snake" style so seeds are spread evenly:
// A B C D D C B A A B C D ...
export function makeGroups(players, size) {
  const { groups } = planGroups(players.length, size)
  const result = Array.from({ length: groups }, (_, i) => ({ name: groupName(i), players: [] }))
  players.forEach((p, i) => {
    const row = Math.floor(i / groups)
    const col = i % groups
    result[row % 2 ? groups - 1 - col : col].players.push(p)
  })
  return result
}

// Everyone plays everyone once, arranged in rounds (circle method).
function roundRobin(players) {
  const list = players.length % 2 ? [...players, null] : [...players]
  const n = list.length
  const rounds = []
  for (let r = 0; r < n - 1; r++) {
    const pairs = []
    for (let i = 0; i < n / 2; i++) {
      const [a, b] = [list[i], list[n - 1 - i]]
      if (a && b) pairs.push([a, b])
    }
    rounds.push(pairs)
    list.splice(1, 0, list.pop()) // rotate everyone except the first player
  }
  return rounds
}

// Standings: most wins first; ties broken by head-to-head among the tied players; then,
// if the tournament uses scores for tiebreaks, set difference and then game difference
// (from all of a player's group matches); anyone still tied is ordered by the host
// (tieOrder), otherwise by seed/list order.
function standings(players, matches, tieOrder = [], useScores = false) {
  const rows = players.map((name) => ({ name, w: 0, l: 0, sets: 0, games: 0 }))
  const row = Object.fromEntries(rows.map((r) => [r.name, r]))
  for (const m of matches) {
    if (m.winner) {
      row[m.winner].w++
      row[m.winner === m.a ? m.b : m.a].l++
    }
    // Set and game difference: +1 per set won, −1 per set lost; same for games.
    // Only finished matches count, so a half-entered score can't move anyone.
    for (const [x, y] of (m.winner && m.score) || []) {
      if (x !== y) {
        row[m.a].sets += x > y ? 1 : -1
        row[m.b].sets += y > x ? 1 : -1
      }
      row[m.a].games += x - y
      row[m.b].games += y - x
    }
  }
  const bySets = (x, y) => (useScores ? y.sets - x.sets || y.games - x.games : 0)

  const manual = (name) => {
    const i = tieOrder.indexOf(name)
    return i === -1 ? 1000 + players.indexOf(name) : i
  }

  const result = []
  const byWins = [...new Set(rows.map((r) => r.w))].sort((x, y) => y - x)
  for (const w of byWins) {
    const level = rows.filter((r) => r.w === w)
    const names = new Set(level.map((r) => r.name))
    const h2h = (name) =>
      matches.filter((m) => m.winner === name && names.has(m.a) && names.has(m.b)).length
    level.forEach((r) => (r.h2h = h2h(r.name)))
    level.sort((x, y) => y.h2h - x.h2h || bySets(x, y) || manual(x.name) - manual(y.name))
    for (const r of level) {
      // still tied after head-to-head (and scores, when used)
      const key = useScores ? `${w}|${r.h2h}|${r.sets}|${r.games}` : `${w}|${r.h2h}`
      const same = level.filter((o) => (useScores ? `${w}|${o.h2h}|${o.sets}|${o.games}` : `${w}|${o.h2h}`) === key)
      r.tieKey = same.length > 1 ? key : null
      result.push(r)
    }
  }
  return result
}

// Everything about each group, worked out from the saved tournament.
export function getGroups(t) {
  return t.groups.map((g, gi) => {
    const rounds = roundRobin(g.players).map((pairs, r) =>
      pairs.map(([a, b], i) => {
        const id = `g${gi}-${r}-${i}`
        const pick = t.winners[id]
        const s = t.scores?.[id]
        return {
          id,
          a,
          b,
          winner: pick === a || pick === b ? pick : null,
          score: s && s.a === a && s.b === b ? s.sets : null,
        }
      })
    )
    const matches = rounds.flat()
    const done = matches.every((m) => m.winner)
    const tiesSet = !!t.tieOrder?.[gi]
    const table = standings(g.players, matches, t.tieOrder?.[gi], t.scoring && t.scoreTiebreak)
    return {
      ...g,
      index: gi,
      rounds,
      matches,
      played: matches.filter((m) => m.winner).length,
      done,
      tiesSet, // host has put tied players in order
      table,
      // finished, but some players are still level after head-to-head and the host hasn't ordered them
      openTie: done && !tiesSet && table.some((r) => r.tieKey),
    }
  })
}

// One group and nobody goes on: a pure round robin, and the group winner is the champion.
// Not while players are still level at the top and the host hasn't put them in order.
export function roundRobinChampion(groups, hasMainDraw) {
  if (hasMainDraw || !groups.every((g) => g.done)) return null
  const top = groups[0].table
  if (groups[0].openTie && top[0].tieKey && top[0].tieKey === top[1]?.tieKey) return null
  return top[0].name
}

// advance is 1–3, or 'all' for pool play for seeding (everyone goes on to the Main Draw).
export const isPoolPlay = (advance) => advance === 'all'
export const groupWord = (advance) => (isPoolPlay(advance) ? 'Pool' : 'Group')

// Where each qualifier goes in the Main Draw. Group winners take the top seeds (and any
// byes); then each next place is placed so players from the same group meet as late as possible.
// sizes: players per group (groups can differ by one). Each entry: { group, place, seed }.
// Returns null when only one player goes on in total (pure round robin: no Main Draw).
function qualifierLayout(sizes, advance) {
  const places = isPoolPlay(advance) ? Math.max(...sizes) : advance
  const total = sizes.reduce((n, s) => n + Math.min(s, places), 0)
  if (total < 2) return null
  let size = 2
  while (size < total) size *= 2
  const posOfSeed = []
  seedOrder(size).forEach((seed, pos) => (posOfSeed[seed] = pos))
  const slots = Array(size).fill(BYE)
  const placed = []
  // Round in which two draw positions would meet (1 = first round)
  const meets = (p, q) => Math.floor(Math.log2(p ^ q)) + 1

  let seed = 1
  for (let place = 0; place < places; place++) {
    // Groups that have a player in this place (a smaller group has no last place)
    const left = sizes.map((s, g) => (s > place ? g : -1)).filter((g) => g >= 0)
    while (left.length) {
      const pos = posOfSeed[seed]
      let best = left[0]
      let bestScore = -1
      for (const g of left) {
        const mates = placed.filter((p) => p.group === g)
        const score = mates.length ? Math.min(...mates.map((p) => meets(p.pos, pos))) : 99
        if (score > bestScore) [best, bestScore] = [g, score]
      }
      left.splice(left.indexOf(best), 1)
      placed.push({ group: best, pos })
      slots[pos] = { group: best, place, seed }
      seed++
    }
  }
  return slots
}

// Main Draw first-round slots: a player's name once their group is finished,
// otherwise null with a label such as "Group A · 1st". Also returns the Main Draw seed
// each finished player earned from the group stage.
export function mainDrawFromGroups(groups, advance) {
  const layout = qualifierLayout(groups.map((g) => g.players.length), advance)
  if (!layout) return null
  const word = groupWord(advance)
  const seeds = {}
  const slots = layout.map((s) => {
    if (s === BYE) return BYE
    const g = groups[s.group]
    if (!g.done) return null
    const name = g.table[s.place].name
    seeds[name] = s.seed
    return name
  })
  return {
    slots,
    seeds,
    labels: layout.map((s) => (s === BYE ? null : `${word} ${groups[s.group].name} · ${ordinal(s.place + 1)}`)),
  }
}
