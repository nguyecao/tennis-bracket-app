// How live rooms get through networks: STUN (find a direct path) and TURN (relay when a
// direct path is blocked: strict Wi-Fi, some phone networks, Brave's strict mode...).
//
// The relay comes from Metered's free Open Relay service. VITE_TURN_CREDENTIALS_URL is the
// "credentials" address from the Metered dashboard; it returns a ready-to-use list of servers
// and is meant to be public. It's set as a GitHub secret for the live site and in .env.local
// for running on your own computer. Without it, the app still works, just without a relay.
const CREDENTIALS_URL = import.meta.env.VITE_TURN_CREDENTIALS_URL
const FETCH_TIMEOUT_MS = 4000

// Free public STUN, used alongside (or, if the relay can't be reached, instead of) the relay
const STUN = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]

let cached = null // one fetch per page load (a failed one is tried again next time)

async function fetchRelay() {
  if (!CREDENTIALS_URL) return []
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(CREDENTIALS_URL, { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) throw new Error(`relay credentials: HTTP ${res.status}`)
    const list = await res.json()
    const ok = Array.isArray(list) && list.every((s) => s && (typeof s.urls === 'string' || Array.isArray(s.urls)))
    if (!ok || !list.length) throw new Error('relay credentials: unexpected reply')
    return list
  } finally {
    clearTimeout(timer)
  }
}

// Settings for each WebRTC connection (passed to PeerJS as `config`)
export async function rtcConfig() {
  if (!cached) {
    cached = fetchRelay().catch((err) => {
      console.warn('Live rooms: no relay available, using direct connections only.', err)
      cached = null // try again on the next connection
      return []
    })
  }
  const relay = await cached
  if (forceRelay() && !relay.length) console.warn('?relay: no relay available, so connections are not forced through one.')
  return {
    iceServers: [...STUN, ...relay],
    // Testing aid: add ?relay to the page address to force every connection through the relay
    ...(forceRelay() && relay.length ? { iceTransportPolicy: 'relay' } : {}),
  }
}

export const forceRelay = () => new URLSearchParams(location.search).has('relay')

// Does this config include a relay (TURN) server?
export const hasRelay = (config) =>
  config.iceServers.some((s) => [].concat(s.urls).some((u) => /^turns?:/.test(u)))

// A relay is set up for this site (whether or not it could be reached)
export const relayConfigured = !!CREDENTIALS_URL
