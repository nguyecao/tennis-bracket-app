import { useEffect, useRef } from 'react'
import { BYE, roundName } from '../lib/bracket'
import Match from './Match'


// Each match sits in a "slot" that takes an equal share of the column's height, so a
// match always lines up halfway between the two matches that feed it. The connector
// lines are drawn in CSS (see "Bracket lines" in App.css).
// labels (optional): placeholder text for first-round spots still waiting on a group.
// waiting: the draw can't start yet (group stage still running), so no round is "in progress".
// followed: players highlighted with ★ (shown wherever they appear).
export default function Bracket({ title, rounds, labels, onPick, seedOf, followed, waiting = false }) {
  const champion = rounds.at(-1)[0].winner
  // The round in progress: the earliest round that still has an unplayed match.
  // (-1 when the bracket is finished.)
  const current = waiting ? -1 : rounds.findIndex((matches) => matches.some((m) => m.winner === null))

  // On narrow screens only a column or two fits. When the round in progress changes
  // (or a viewer joins mid-tournament), scroll it into view if it's off screen.
  // Which matches got a winner since the last update, so only those animate
  // (nothing animates on first load or when switching tabs).
  const isReal = (p) => p && p !== BYE
  // Remembered until the results change again, so unrelated re-renders (e.g. the viewer
  // count updating) don't cut an animation short.
  const decidedIds = rounds.flat().filter((m) => isReal(m.winner)).map((m) => m.id)
  const key = decidedIds.join(',')
  const track = useRef(null)
  if (!track.current) {
    track.current = { key, ids: new Set(decidedIds), fresh: new Set() }
  } else if (track.current.key !== key) {
    const before = track.current.ids
    track.current = { key, ids: new Set(decidedIds), fresh: new Set(decidedIds.filter((id) => !before.has(id))) }
  }
  const justDecided = track.current.fresh

  const scroller = useRef(null)
  useEffect(() => {
    const box = scroller.current
    const round = box?.children[current]
    if (!round) return
    const left = round.offsetLeft - box.offsetLeft
    const visible = left >= box.scrollLeft && left + round.offsetWidth <= box.scrollLeft + box.clientWidth
    if (!visible) box.scrollTo({ left: left - 12, behavior: 'smooth' })
  }, [current])

  return (
    <section className="card">
      <h2>
        {title}
        {champion && champion !== BYE && <span className="champ">🏆 {champion}</span>}
      </h2>
      <div className="bracket" ref={scroller}>
        {rounds.map((matches, r) => (
          <div className={`round${r === current ? ' current' : ''}`} key={r}>
            <h3>{roundName(matches.length)}</h3>
            <div className="matches">
              {matches.map((m, i) => {
                // Winner's path: the elbow out of a decided match, and the line into the
                // next match once a winner has arrived there
                const decided = isReal(m.winner)
                const feeders = r > 0 ? [rounds[r - 1][2 * i], rounds[r - 1][2 * i + 1]] : []
                const arrived = feeders.some((f) => f && isReal(f.winner))
                // Animate along the path when a winner was just picked
                const animateOut = justDecided.has(m.id)
                const arriving = feeders.map((f) => f && justDecided.has(f.id))
                const last = r === rounds.length - 1
                return (
                  <div key={m.id} className="slot">
                    {decided && !last && <span className={`path-out${animateOut ? ' draw' : ''}`} />}
                    {arrived && <span className={`path-in${arriving.some(Boolean) ? ' draw' : ''}`} />}
                    <Match
                      match={m}
                      onPick={onPick}
                      seedOf={seedOf}
                      arriving={arriving}
                      followed={followed}
                      labels={r === 0 && labels ? [labels[2 * i], labels[2 * i + 1]] : null}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
