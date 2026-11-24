import { useMemo, useState } from 'react'
import qrcode from 'qrcode-generator'
import { roomLink } from '../lib/live'
import Modal from './Modal'

// QR code drawn as an SVG: one square per dark module. Scanning it opens the viewer link.
export function QrCode({ text }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'M') // smallest version that fits; medium error correction
    qr.addData(text)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`
    return { size: n, path: d }
  }, [text])
  const quiet = 4 // standard white border so phones can find the code
  const box = size + quiet * 2
  return (
    <svg className="qr" viewBox={`${-quiet} ${-quiet} ${box} ${box}`} role="img" aria-label="QR code for the live bracket" shapeRendering="crispEdges">
      <rect x={-quiet} y={-quiet} width={box} height={box} fill="#fff" />
      <path d={path} fill="#111" />
    </svg>
  )
}

// Large QR code + room code + copyable link, in a popup
function QrModal({ room, onClose }) {
  const [copied, setCopied] = useState(false)
  const link = roomLink(room)

  function copy() {
    navigator.clipboard?.writeText(link).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => {}
    )
  }

  return (
    <Modal title="Scan to watch live" onClose={onClose}>
      <QrCode text={link} />
      <p className="qr-code-label">
        Room <strong>{room}</strong>
      </p>
      <div className="qr-actions">
        <input className="link-box" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Viewer link" />
        <button className="primary" onClick={copy}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </Modal>
  )
}

// Always-visible QR card beside the tournament name, so people can scan straight away.
// Tap it for a big version (easier to scan from across a room) plus the link.
export default function QrCard({ room }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="qr-card" onClick={() => setOpen(true)} aria-label={`QR code to watch room ${room}. Tap to enlarge`}>
        <QrCode text={roomLink(room)} />
        <span className="qr-card-text">
          <strong>Scan to watch live</strong>
          <span>Room {room}</span>
          <span className="qr-card-hint">Tap to enlarge</span>
        </span>
      </button>
      {open && <QrModal room={room} onClose={() => setOpen(false)} />}
    </>
  )
}
