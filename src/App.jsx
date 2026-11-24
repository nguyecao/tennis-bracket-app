import { useEffect, useState } from 'react'
import { cleanCode } from './lib/live'
import Host from './components/Host'
import Viewer from './components/Viewer'

const hashRoom = () => cleanCode(new URLSearchParams(location.hash.slice(1)).get('room') || '')

// A link with #room=CODE opens the read-only viewer; otherwise you're the host.
export default function App() {
  const [watching, setWatching] = useState(hashRoom)
  const [leftRoom, setLeftRoom] = useState(false)

  // Leaving a room: drop the #room=... from the URL and go to the home page.
  function leave() {
    history.replaceState(null, '', location.pathname + location.search)
    setWatching('')
    setLeftRoom(true)
  }

  // Opened your own room's link: switch to hosting it instead of watching
  function hostInstead() {
    history.replaceState(null, '', location.pathname + location.search)
    setWatching('')
    setLeftRoom(false)
  }

  useEffect(() => {
    const onHash = () => setWatching(hashRoom())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return watching ? (
    <Viewer key={watching} code={watching} onLeave={leave} onHost={hostInstead} />
  ) : (
    <Host startAtHome={leftRoom} />
  )
}
