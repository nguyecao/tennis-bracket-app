import { useState } from 'react'
import { MAX_SETS, scoreWinner } from '../lib/scores'
import Modal from './Modal'

// Score entry for one match: a column per set, a row per player. Type numbers, add or
// remove sets, Save. The winner is filled in from the score when it's clear who won.
export default function ScoreEditor({ match, onSave, onClose }) {
  const { a, b } = match
  const [sets, setSets] = useState(() =>
    match.score?.length ? match.score.map(([x, y]) => [String(x), String(y)]) : [['', '']]
  )

  const parsed = sets
    .filter(([x, y]) => x !== '' || y !== '')
    .map(([x, y]) => [Number(x) || 0, Number(y) || 0])
  const winner = scoreWinner(parsed, a, b)

  const change = (i, k, value) => {
    const digits = value.replace(/\D/g, '').slice(0, 2)
    setSets((list) => list.map((set, j) => (j === i ? (k === 0 ? [digits, set[1]] : [set[0], digits]) : set)))
  }

  return (
    <Modal title="Score" confirmLabel="Save" onConfirm={() => onSave(parsed)} onClose={onClose}>
      <table className="score-table">
        <thead>
          <tr>
            <th />
            {sets.map((_, i) => (
              <th key={i}>Set {i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[a, b].map((p, k) => (
            <tr key={p}>
              <th className="score-player" title={p}>
                {p}
              </th>
              {sets.map((set, i) => (
                <td key={i}>
                  <input
                    inputMode="numeric"
                    aria-label={`${p}, set ${i + 1}`}
                    value={set[k]}
                    autoFocus={i === 0 && k === 0 && !match.score}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => change(i, k, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="score-tools">
        <button disabled={sets.length >= MAX_SETS} onClick={() => setSets((l) => [...l, ['', '']])}>
          + Set
        </button>
        <button disabled={sets.length <= 1} onClick={() => setSets((l) => l.slice(0, -1))}>
          − Set
        </button>
        {match.score && (
          <button className="text-button" onClick={() => onSave([])}>
            Clear score
          </button>
        )}
      </div>

      <p className="muted score-hint">
        {winner
          ? `Winner: ${winner}`
          : 'Any format works: sets, a single pro set, or a match tiebreak as the last set (e.g. 10–8).'}
      </p>
    </Modal>
  )
}
