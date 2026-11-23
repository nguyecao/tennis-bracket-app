import { useState } from 'react'
import { useHost, makeCode, roomLink } from '../lib/live'
import Modal from './Modal'

// Host side of a live room: Go live / room status / Copy link / Stop sharing.
export default function LiveControls({ room, tournament, theme, onRoomChange }) {
  const { status, viewers } = useHost(room, tournament, theme)
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
        {status === 'live'
          ? `${viewers} watching`
          : status === 'elsewhere'
            ? 'live in another tab'
            : 'Connecting…'}
      </span>
      <button onClick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
      <button onClick={() => onRoomChange(null)}>Stop sharing</button>
      {manualCopy && (
        <Modal title="Share this link" onClose={() => setManualCopy(false)}>
          <p>Your browser blocked copying. Select the link and copy it yourself:</p>
          <input className="link-box" readOnly value={roomLink(room)} onFocus={(e) => e.target.select()} autoFocus />
        </Modal>
      )}
    </>
  )
}
