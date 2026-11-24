import { useEffect } from 'react'
import { useViewer } from '../lib/live'
import { useTheme, findTheme } from '../lib/theme'
import { savedRoom } from '../lib/storage'
import Header from './Header'
import Tournament from './Tournament'

const LABELS = { connecting: 'Connecting…', live: 'Live', offline: 'Host offline, retrying…' }

// Read-only view of someone else's live room.
export default function Viewer({ code, onLeave, onHost }) {
  const { status, tournament, theme: hostTheme } = useViewer(code)

  // Follow the host's theme when you join and whenever the host changes it.
  // You can still pick another theme; it isn't saved, so your own choice stays intact.
  const [theme, setTheme] = useTheme({ persist: false })
  useEffect(() => {
    if (hostTheme) setTheme(hostTheme)
  }, [hostTheme, setTheme])

  // This browser is the host of this room (e.g. you opened your own share link)
  const ownRoom = savedRoom() === code

  return (
    <div className="app">
      <Header theme={theme} onThemeChange={setTheme} hostTheme={hostTheme}>
        <span className={`pill ${status}`}>
          Room {code} ·{' '}
          <span className={status === 'live' ? '' : 'loading'}>{LABELS[status]}</span>
        </span>
        <button onClick={onLeave}>Leave</button>
      </Header>

      {ownRoom && status !== 'live' && (
        <div className="notice-bar own-room">
          This is your room. You're viewing it as a spectator.
          <button className="primary" onClick={onHost}>
            Go to host view
          </button>
        </div>
      )}

      {tournament ? (
        // An unnamed tournament is named after the host's theme, so everyone sees the same name
        <Tournament
          key={tournament.created}
          t={tournament}
          shareRoom={code}
          defaultName={findTheme(hostTheme ?? theme.id).defaultName}
        />
      ) : (
        <p className="notice loading">
          {tournament === null ? 'The host is setting up a new bracket…' : 'Waiting for the host…'}
        </p>
      )}
    </div>
  )
}
