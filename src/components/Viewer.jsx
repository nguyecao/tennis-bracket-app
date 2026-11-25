import { useEffect, useRef, useState } from 'react'
import { useViewer } from '../lib/live'
import { useTheme, findTheme } from '../lib/theme'
import { savedRoom } from '../lib/storage'
import Header from './Header'
import Tournament from './Tournament'
import { CheerButton, CheerLayer, CheerNotice } from './Cheers'
import { trayFor } from '../lib/cheers'

const LABELS = { connecting: 'Connecting…', live: 'Live', offline: 'Host offline, retrying…' }

// Read-only view of someone else's live room.
export default function Viewer({ code, onLeave, onHost }) {
  const { status, tournament, theme: hostTheme, cheersOn, sendCheer } = useViewer(code)

  // Let viewers know when the host switches cheers off (not when they first arrive)
  const [cheersOffNote, setCheersOffNote] = useState(false)
  const wasOn = useRef(false)
  useEffect(() => {
    if (wasOn.current && !cheersOn) setCheersOffNote(true)
    if (cheersOn) setCheersOffNote(false)
    wasOn.current = cheersOn
  }, [cheersOn])
  useEffect(() => {
    if (!cheersOffNote) return
    const t = setTimeout(() => setCheersOffNote(false), 3000)
    return () => clearTimeout(t)
  }, [cheersOffNote])

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

      <CheerLayer />
      {status === 'live' && tournament && cheersOn && (
        // The tray's last emoji follows the host's theme
        <CheerButton tray={trayFor(hostTheme ?? theme.id)} onSend={sendCheer} />
      )}
      {cheersOffNote && <CheerNotice>The host has turned cheers off</CheerNotice>}

      {tournament ? (
        // An unnamed tournament is named after the host's theme, so everyone sees the same name
        <Tournament
          key={tournament.created}
          t={tournament}
          shareRoom={code}
          defaultName={findTheme(hostTheme ?? theme.id).defaultName}
        />
      ) : (
        // Nothing to show yet: a bouncing ball, centered in the space below the header
        <div className="waiting" role="status">
          <div className="bounce" aria-hidden="true">
            <div className="bounce-ball">
              <span className="ball" />
            </div>
            <span className="bounce-shadow" />
          </div>
          <p className="notice loading">
            {tournament === null ? 'The host is setting up a new bracket…' : 'Waiting for the host…'}
          </p>
        </div>
      )}
    </div>
  )
}
