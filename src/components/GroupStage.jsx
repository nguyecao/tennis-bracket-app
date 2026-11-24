import Match from './Match'
import { isPoolPlay, groupWord } from '../lib/groups'

// All groups: standings table + round-robin matches for each.
export default function GroupStage({ groups, advance, hasMainDraw, onPick, onReorder, seedOf, onShowMain }) {
  const allDone = groups.every((g) => g.done)
  // One group and nobody goes on: pure round robin, the group winner is the champion
  // (not while players are still level at the top and the host hasn't ordered them)
  const top = groups[0].table
  const champion =
    !hasMainDraw && allDone && !(groups[0].openTie && top[0].tieKey && top[0].tieKey === top[1]?.tieKey)
      ? top[0].name
      : null
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
        Ties are broken by head-to-head
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
            onPick={onPick}
            onReorder={onReorder}
            seedOf={seedOf}
          />
        ))}
      </div>
    </section>
  )
}

// advance: how many rows to mark as going through (0 in pool play, where everyone does)
function GroupCard({ group, advance, word, onPick, onReorder, seedOf }) {
  const { table, rounds, played, matches, done, tiesSet } = group

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
            {onReorder && done && <th className="tie-col" aria-label="Order ties" />}
          </tr>
        </thead>
        <tbody>
          {table.map((r, i) => (
            <tr key={r.name} className={i < advance ? 'advancing' : ''}>
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
              {onReorder && done && (
                <td className="tie-arrows">
                  {tiedWith(i, i - 1) && (
                    <button aria-label={`Move ${r.name} up`} onClick={() => move(i, -1)}>▲</button>
                  )}
                  {tiedWith(i, i + 1) && (
                    <button aria-label={`Move ${r.name} down`} onClick={() => move(i, 1)}>▼</button>
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
              <Match key={m.id} match={m} onPick={onPick} seedOf={seedOf} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
