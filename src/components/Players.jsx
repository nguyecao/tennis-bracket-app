import { useState } from 'react'
import { playerSummaries } from '../lib/players'

// Every player with where they stand. Tap a player to highlight them (★) across all tabs.
export default function Players({ t, brackets, groupWord, seedOf, followed, onToggle, onClear }) {
  const [search, setSearch] = useState('')
  const all = playerSummaries(t, brackets)
  const query = search.trim().toLowerCase()
  const shown = query ? all.filter((p) => p.name.toLowerCase().includes(query)) : all

  return (
    <section className="card">
      <h2>Players</h2>
      <p className="muted group-help">
        Tap a player to highlight them with ★ in every tab. Highlights are only on this device.
      </p>

      <div className="players-tools">
        {all.length > 8 && (
          <input
            className="name-input"
            type="search"
            placeholder={`Search ${all.length} players`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        {followed.size > 0 && (
          <button className="text-button" onClick={onClear}>
            Clear highlights ({followed.size})
          </button>
        )}
      </div>

      <ul className="player-list">
        {shown.map((p) => {
          const on = followed.has(p.name)
          return (
            <li key={p.name}>
              <button
                className={`player-row${on ? ' followed' : ''}`}
                aria-pressed={on}
                onClick={() => onToggle(p.name)}
              >
                <span className="star" aria-hidden="true">{on ? '★' : '☆'}</span>
                <span className="pl-main">
                  <span className="pl-name">
                    {seedOf(p.name) && <span className="seed">{seedOf(p.name)}</span>}
                    <span className="name">{p.name}</span>
                  </span>
                  {statusLines(p, groupWord).map((line, i) => (
                    <span key={i} className={`pl-status ${line.tone || ''}`}>
                      {line.text}
                    </span>
                  ))}
                </span>
                <span className="pl-record" title="Wins–losses">
                  {p.wins}–{p.losses}
                </span>
              </button>
            </li>
          )
        })}
        {shown.length === 0 && <li className="muted">No players match “{search}”.</li>}
      </ul>
    </section>
  )
}

// Plain-English status, e.g. "In Semifinals · vs Rafa", "Out in Quarterfinals", "🏆 Champion"
function statusLines(p, word) {
  const lines = []
  const ordinal = (n) => ['1st', '2nd', '3rd'][n - 1] || `${n}th`

  if (p.group) {
    const g = p.group
    const record = `${g.wins}–${g.losses}`
    if (g.champion) lines.push({ text: `🏆 Champion · ${record}`, tone: 'champ-line' })
    else if (!g.done) lines.push({ text: `${word} ${g.name} · ${record} so far` })
    else if (g.out) lines.push({ text: `Out in ${word.toLowerCase()} stage · ${ordinal(g.place)} in ${word} ${g.name}`, tone: 'out' })
    else lines.push({ text: `${ordinal(g.place)} in ${word} ${g.name} · ${record}` })
  }

  const bracket = (s, label) => {
    if (!s) return
    if (s.state === 'champion') lines.push({ text: `🏆 ${label}Champion`, tone: 'champ-line' })
    else if (s.state === 'out') lines.push({ text: `${label}Out in ${s.round}`, tone: 'out' })
    else lines.push({ text: `${label}In ${s.round} · ${s.opponent ? `vs ${s.opponent}` : 'opponent TBD'}`, tone: 'alive' })
  }
  bracket(p.main, '')
  bracket(p.consolation, 'Consolation: ')

  return lines
}
