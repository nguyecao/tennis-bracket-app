import { useState } from 'react'
import { useHost, makeCode, roomLink } from '../lib/live'
import Modal from './Modal'
import { useWakeLock } from '../lib/wakeLock'
import { trayFor } from '../lib/cheers'
import { CheerButton, CheerLayer } from './Cheers'

// Host side of a live room: Go live / room status / Copy link / Cheers on-off / Stop sharing.
// cheers: whether viewers may send cheers (the host can switch it off).
// scoring: the match whose score box the host has open (viewers hold that match's alerts).
export default function LiveControls({ room, tournament, theme, onRoomChange, cheers = true, onCheersChange, scoring = null }) {
  const { status, viewers, sendCheer } = useHost(room, tournament, theme, cheers, scoring)

  // While this tab is hosting a room, keep the screen awake so viewers don't lose
  // the connection when the phone would normally auto-lock.
  useWakeLock(!!room && status !== 'elsewhere' && status !== 'off')
  const [copied, setCopied] = useState(false)
  const [manualCopy, setManualCopy] = useState(false) // clipboard blocked: show the link instead

  function copyLink() {
    const url = roomLink(room)
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setManualCopy(true))
  }

  if (!room) {
    return tournament ? <button onClick={() => onRoomChange(makeCode())}>Go live</button> : null
  }

  return (
    <>
      <span className={`pill ${status}`}>
        Room {room} ·{' '}
        {status === 'live' ? (
          `${viewers} watching`
        ) : (
          // Waiting states gently fade in and out
          <span className="loading">{status === 'elsewhere' ? 'live in another tab' : 'Connecting…'}</span>
        )}
      </span>
      <button onClick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
      <button
        className={`cheers-toggle${cheers ? '' : ' off'}`}
        role="switch"
        aria-checked={cheers}
        title={cheers ? 'Viewers can send cheers. Click to turn off.' : 'Cheers are off. Click to turn on.'}
        onClick={() => onCheersChange(!cheers)}
      >
        <span aria-hidden="true">👏</span>
        <span className="wide-only">Cheers</span>
        <span className="switch" aria-hidden="true" />
      </button>
      <button onClick={() => onRoomChange(null)}>
        Stop<span className="wide-only"> sharing</span>
      </button>
      {/* Cheers float up here too; the host can cheer along while live */}
      <CheerLayer />
      {cheers && status === 'live' && tournament && <CheerButton tray={trayFor(theme)} onSend={sendCheer} />}
      {manualCopy && (
        <Modal title="Share this link" onClose={() => setManualCopy(false)}>
          <p>Your browser blocked copying. Select the link and copy it yourself:</p>
          <input className="link-box" readOnly value={roomLink(room)} onFocus={(e) => e.target.select()} autoFocus />
        </Modal>
      )}
    </>
  )
}
