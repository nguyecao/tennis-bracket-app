import { useEffect } from 'react'
import { useViewer } from '../lib/live'
import { useTheme } from '../lib/theme'
import Header from './Header'
import Tournament from './Tournament'

const LABELS = { connecting: 'Connecting…', live: 'Live', offline: 'Host offline, retrying…' }

// Read-only view of someone else's live room.
export default function Viewer({ code, onLeave }) {
  const { status, tournament, theme: hostTheme } = useViewer(code)

  // Follow the host's theme when you join and whenever the host changes it.
  // You can still pick another theme; it isn't saved, so your own choice stays intact.
  const [theme, setTheme] = useTheme({ persist: false })
  useEffect(() => {
    if (hostTheme) setTheme(hostTheme)
  }, [hostTheme, setTheme])

  return (
    <div className="app">
      <Header theme={theme} onThemeChange={setTheme} hostTheme={hostTheme}>
        <span className={`pill ${status}`}>
          Room {code} · {LABELS[status]}
        </span>
        <button onClick={onLeave}>Leave</button>
      </Header>

      {tournament ? (
        <Tournament key={tournament.created} t={tournament} />
      ) : (
        <p className="notice">
          {tournament === null ? 'The host is setting up a new bracket…' : 'Waiting for the host…'}
        </p>
      )}
    </div>
  )
}
