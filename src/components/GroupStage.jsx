import { useLayoutEffect, useRef } from 'react'
import Match from './Match'
import { isPoolPlay, groupWord, roundRobinChampion } from '../lib/groups'

// All groups: standings table + round-robin matches for each.
// scoreTiebreak: standings also use set and game difference (shown as extra columns).
export default function GroupStage({ groups, advance, hasMainDraw, onPick, onReorder, seedOf, followed, onScore, onShowMain, scoreTiebreak }) {
  const allDone = groups.every((g) => g.done)
  const champion = roundRobinChampion(groups, hasMainDraw)
  const pools = isPoolPlay(advance) // everyone goes on; results only decide seeding
  const word = groupWord(advance)

  return (
    <section className="card">
      <h2>
        {pools ? 'Pool Play' : groups.length === 1 ? 'Round Robin' : 'Group Stage'}
        {champion && <span className="champ">🏆 {champion}</span>}
      </h2>
      <p className="muted group-help">
        {pools
          ? 'Everyone goes on to the Main Draw; pool results decide the seeds (all pool winners first, then 2nd places, and so on). '
          : hasMainDraw
            ? `Top ${advance} in each group advance to the Main Draw. `
            : 'Everyone plays everyone; the best record wins. '}
        Ties are broken by head-to-head{scoreTiebreak ? ', then set difference, then game difference' : ''}
        {onReorder ? '; use ▲▼ to order players who are still tied.' : '.'}
      </p>

      {allDone && hasMainDraw && (
        <div className="notice-bar">
          {pools ? 'Pool play' : 'Group stage'} complete. The Main Draw is set.
          <button className="primary" onClick={onShowMain}>
            View Main Draw →
          </button>
        </div>
      )}

      <div className="groups">
        {groups.map((g) => (
          <GroupCard
            key={g.index}
            group={g}
            advance={pools ? 0 : hasMainDraw ? advance : 1}
            word={word}
            followed={followed}
            onScore={onScore}
            scoreTiebreak={scoreTiebreak}
            onPick={onPick}
            onReorder={onReorder}
            seedOf={seedOf}
          />
        ))}
      </div>
    </section>
  )
}

// +3 / 0 / −2 for set and game difference
const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')

// Smoothly slide table rows to their new position whenever the order changes
// (tie arrows, or a result that changes the standings). Returns a ref setter per row.
function useRowSlide(order) {
  const rows = useRef(new Map())
  const before = useRef(new Map())
  useLayoutEffect(() => {
    const now = new Map()
    rows.current.forEach((el, key) => now.set(key, el.offsetTop))
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!calm) {
      now.forEach((top, key) => {
        const was = before.current.get(key)
        if (was != null && was !== top) {
          rows.current.get(key).animate(
            [{ transform: `translateY(${was - top}px)` }, { transform: 'none' }],
            { duration: 320, easing: 'cubic-bezier(.2,.7,.3,1)' }
          )
        }
      })
    }
    before.current = now
  }, [order])
  return (key) => (el) => (el ? rows.current.set(key, el) : rows.current.delete(key))
}

// advance: how many rows to mark as going through (0 in pool play, where everyone does)
function GroupCard({ group, advance, word, onPick, onReorder, seedOf, followed, onScore, scoreTiebreak }) {
  const { table, rounds, played, matches, done, tiesSet } = group
  const rowRef = useRowSlide(table.map((r) => r.name).join('|'))

  // Swap a still-tied player with the one above/below, saving the new order for this group
  function move(i, dir) {
    const order = table.map((r) => r.name)
    ;[order[i], order[i + dir]] = [order[i + dir], order[i]]
    onReorder(group.index, order)
  }
  // Ties only matter once every match in the group is played. The host can reorder tied
  // players with the arrows; once they have, everyone sees plain positions instead of "=".
  const tied = (i) => done && !!table[i]?.tieKey
  const tiedWith = (i, j) => tied(i) && tied(j) && table[i].tieKey === table[j].tieKey
  const showEquals = (i) => tied(i) && !tiesSet
  // Only make room for the ▲▼ column when there is a tie to order
  const showArrows = onReorder && done && table.some((r) => r.tieKey)

  return (
    <div className={`group${done ? ' done' : ''}`}>
      <div className="group-head">
        <h3>
          {word} {group.name}
        </h3>
        <span className="muted">
          {done ? 'Complete' : `${played}/${matches.length} played`}
        </span>
      </div>

      {group.openTie && onReorder && (
        <p className="tie-note">Players marked = are still tied. Use ▲▼ to set their order.</p>
      )}

      <table className="standings">
        <thead>
          <tr>
            <th className="num-col">#</th>
            <th className="player-col">Player</th>
            <th className="num-col">W</th>
            <th className="num-col">L</th>
            {scoreTiebreak && (
              <>
                <th className="diff-col" title="Set difference">Sets</th>
                <th className="diff-col" title="Game difference">Games</th>
              </>
            )}
            {showArrows && <th className="tie-col" aria-label="Order ties" />}
          </tr>
        </thead>
        <tbody>
          {table.map((r, i) => (
            <tr
              key={r.name}
              ref={rowRef(r.name)}
              className={`${i < advance ? 'advancing' : ''}${followed?.has(r.name) ? ' followed' : ''}`}
            >
              <td title={showEquals(i) ? 'Tied' : undefined}>{showEquals(i) ? '=' : i + 1}</td>
              <td className="player-col" title={r.name}>
                <div className="player-cell">
                  {seedOf(r.name) && <span className="seed">{seedOf(r.name)}</span>}
                  <span className="name">{r.name}</span>
                  {done && i < advance && <span className="q">✓</span>}
                </div>
              </td>
              <td>{r.w}</td>
              <td>{r.l}</td>
              {scoreTiebreak && (
                <>
                  <td className="diff">{signed(r.sets)}</td>
                  <td className="diff">{signed(r.games)}</td>
                </>
              )}
              {showArrows && (
                <td className="tie-arrows">
                  {/* Both spots are always there so arrows line up in columns. A tied player already
                      at the top (or bottom) of their tie gets a faded, disabled arrow. */}
                  {tied(i) ? (
                    <button
                      aria-label={`Move ${r.name} up`}
                      disabled={!tiedWith(i, i - 1)}
                      onClick={() => move(i, -1)}
                    >
                      ▲
                    </button>
                  ) : (
                    <span className="arrow-spot" />
                  )}
                  {tied(i) ? (
                    <button
                      aria-label={`Move ${r.name} down`}
                      disabled={!tiedWith(i, i + 1)}
                      onClick={() => move(i, 1)}
                    >
                      ▼
                    </button>
                  ) : (
                    <span className="arrow-spot" />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="group-matches">
        {rounds.map((pairs, r) => (
          <div key={r}>
            <h4>Round {r + 1}</h4>
            {pairs.map((m) => (
              <Match key={m.id} match={m} onPick={onPick} seedOf={seedOf} followed={followed} onScore={onScore} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
