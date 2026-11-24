import { BYE, roundName } from './bracket'
import { isPoolPlay } from './groups'

const isReal = (p) => p && p !== BYE

// Where a player stands in one bracket (main draw or consolation):
//   { state: 'champion' } | { state: 'out', round } | { state: 'in', round, opponent } | null (not in it)
function bracketStatus(rounds, name) {
  if (!rounds) return null
  let last = null
  rounds.forEach((matches, r) =>
    matches.forEach((m) => {
      if (m.a === name || m.b === name) last = { r, m }
    })
  )
  if (!last) return null
  const { r, m } = last
  const round = roundName(rounds[r].length)
  if (m.winner === name) return { state: 'champion' } // won their latest match = won the final
  if (isReal(m.winner)) return { state: 'out', round }
  const opponent = m.a === name ? m.b : m.a
  return { state: 'in', round, opponent: isReal(opponent) ? opponent : null }
}

// One summary per player, for the Players tab.
export function playerSummaries(t, { groups, main, consolation }) {
  // Everyone in the tournament: seed order when ranked, otherwise A–Z
  const everyone = groups
    ? groups.flatMap((g) => g.players)
    : t.slots.filter(isReal)
  const names = t.seeds ? [...t.seeds] : [...everyone].sort((a, b) => a.localeCompare(b))

  const allMatches = [
    ...(groups || []).flatMap((g) => g.matches),
    ...(main || []).flat(),
    ...(consolation || []).flat(),
  ].filter((m) => isReal(m.a) && isReal(m.b) && isReal(m.winner))

  return names.map((name) => {
    const played = allMatches.filter((m) => m.a === name || m.b === name)
    const wins = played.filter((m) => m.winner === name).length

    let group = null
    const g = groups?.find((x) => x.players.includes(name))
    if (g) {
      const place = g.table.findIndex((r) => r.name === name)
      group = {
        name: g.name,
        place: place + 1,
        wins: g.table[place].w,
        losses: g.table[place].l,
        done: g.done,
        out: g.done && !isPoolPlay(t.advance) && place >= t.advance && !!main, // didn't make the Main Draw
        // Round robin with no Main Draw: the group winner is the champion (once any tie at the top is settled)
        champion:
          !main && groups.length === 1 && g.done && place === 0 &&
          !(g.openTie && g.table[0].tieKey && g.table[0].tieKey === g.table[1]?.tieKey),
      }
    }

    return {
      name,
      wins,
      losses: played.length - wins,
      group,
      main: bracketStatus(main, name),
      consolation: bracketStatus(consolation, name),
    }
  })
}
