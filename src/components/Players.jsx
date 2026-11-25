import { useState } from 'react'
import { playerSummaries } from '../lib/players'

// Every player with where they stand. Tap a player to highlight them (★) across all tabs.
// alertsOn / onAlertsChange (viewers only): the Match alerts switch. Leave out to hide it.
export default function Players({ t, brackets, groupWord, seedOf, followed, onToggle, onClear, alertsOn = null, onAlertsChange }) {
  const [search, setSearch] = useState('')
  const all = playerSummaries(t, brackets)
  const query = search.trim().toLowerCase()
  const shown = query ? all.filter((p) => p.name.toLowerCase().includes(query)) : all

  return (
    <section className="card">
      {/* "Clear highlights" lives in the heading row, which is always there, so showing or
          hiding it never moves the player list */}
      <h2>
        Players
        {followed.size > 0 && (
          <button className="text-button clear-highlights" onClick={onClear}>
            Clear highlights ({followed.size})
          </button>
        )}
      </h2>
      {alertsOn !== null && (
        <label className="alerts-row">
          <span>
            <b>🔔 Match alerts</b>
            <span className="muted">Get a heads-up when a ★ player finishes a match</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch-input"
            checked={alertsOn}
            onChange={(e) => onAlertsChange(e.target.checked)}
          />
        </label>
      )}
      <p className="muted group-help">
        Tap a player to highlight them with ★ in every tab. Highlights are only on this device.
      </p>

      {all.length > 8 && (
        <div className="players-tools">
          <input
            className="name-input"
            type="search"
            placeholder={`Search ${all.length} players`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

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
                    <span key={i} className={`pl-status ${line.tone || ''}`} title={line.text}>
                      <span className="wide-only">{line.text}</span>
                      <span className="narrow-only">{line.short}</span>
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

// Plain-English status, e.g. "In Semifinals · vs Rafa", "Out in Quarterfinals", "🏆 Champion".
// Each line also has a short form for phones, e.g. "SF vs Rafa", "Out in QF".
const SHORT_ROUND = { Final: 'Final', Semifinals: 'SF', Quarterfinals: 'QF' }
const shortRound = (round) => SHORT_ROUND[round] || round.replace('Round of ', 'R')

function statusLines(p, word) {
  const lines = []
  const ordinal = (n) => ['1st', '2nd', '3rd'][n - 1] || `${n}th`

  if (p.group) {
    const g = p.group
    const record = `${g.wins}–${g.losses}`
    const where = `${word} ${g.name}`
    if (g.champion) lines.push({ text: `🏆 Champion · ${record}`, short: '🏆 Champion', tone: 'champ-line' })
    else if (!g.done) lines.push({ text: `${where} · ${record} so far`, short: `${where} · ${record}` })
    else if (g.out)
      lines.push({
        text: `Out in ${word.toLowerCase()} stage · ${ordinal(g.place)} in ${where}`,
        short: `Out · ${ordinal(g.place)} in ${where}`,
        tone: 'out',
      })
    else lines.push({ text: `${ordinal(g.place)} in ${where} · ${record}`, short: `${ordinal(g.place)} in ${where}` })
  }

  const bracket = (s, label, shortLabel) => {
    if (!s) return
    if (s.state === 'champion')
      lines.push({ text: `🏆 ${label}Champion`, short: `🏆 ${shortLabel}Champion`, tone: 'champ-line' })
    else if (s.state === 'out')
      lines.push({ text: `${label}Out in ${s.round}`, short: `${shortLabel}Out in ${shortRound(s.round)}`, tone: 'out' })
    else
      lines.push({
        text: `${label}In ${s.round} · ${s.opponent ? `vs ${s.opponent}` : 'opponent TBD'}`,
        short: `${shortLabel}${shortRound(s.round)} ${s.opponent ? `vs ${s.opponent}` : '· TBD'}`,
        tone: 'alive',
      })
  }
  bracket(p.main, '', '')
  bracket(p.consolation, 'Consolation: ', 'Cons. ')

  return lines
}
