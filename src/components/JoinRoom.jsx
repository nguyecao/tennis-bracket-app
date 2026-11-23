import { useState } from 'react'
import { cleanCode } from '../lib/live'

// "Watching someone else's bracket?" — typing a code switches to viewer mode.
export default function JoinRoom() {
  const [code, setCode] = useState('')

  function join(e) {
    e.preventDefault()
    if (code.length === 6) location.hash = `room=${code}`
  }

  return (
    <form className="join" onSubmit={join}>
      <span className="muted">Watching someone else's bracket?</span>
      <input value={code} placeholder="ROOM CODE" onChange={(e) => setCode(cleanCode(e.target.value))} />
      <button disabled={code.length !== 6}>Join</button>
    </form>
  )
}
