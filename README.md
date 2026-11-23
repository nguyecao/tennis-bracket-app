# 🎾 Tennis Bracket

Enter 2–128 names and generate a single-elimination bracket. No database — everything is saved in your browser's localStorage.

- **Shuffle** randomizes the draw. **Rank** seeds players in the order you typed them (top seeds get any byes).
- **Consolation bracket** (optional) collects every player who loses their first match.
- Click a player to advance them; click again to undo.
- Pick a theme (Classic, Wimbledon, Australian Open, US Open, Roland Garros) from the menu in the header. Each browser remembers its own choice.
- **Go live** creates a 6-character room code. **Copy link** copies a viewer link to your clipboard. Anyone who opens it (or types the code under "Watching someone else's bracket?") sees results the moment you click them. Viewers can't change anything.

## How live rooms work (no database)

Your browser is the host and sends the bracket straight to viewers' browsers over WebRTC ([PeerJS](https://peerjs.com)). The free PeerJS cloud server only introduces the browsers to each other; it stores nothing. Viewers only get updates while the host's tab is open. If the host leaves, viewers keep the last bracket they saw and reconnect automatically when the host comes back. Your room code survives a refresh.

## Run locally

```bash
npm install
npm run dev
```

## Host on GitHub Pages

1. Push this folder to a GitHub repo (branch `main`).
2. In the repo go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The included workflow builds and deploys on every push. Your site will be at `https://<user>.github.io/<repo>/`.

## Project structure

```
src/
  App.jsx                 picks Host or Viewer from the URL (#room=CODE)
  components/
    Host.jsx              owner of all state: generate, pick winners, go live
    Viewer.jsx            read-only live view of someone else's room
    Header.jsx            title bar + action buttons
    ThemePicker.jsx       Grand Slam theme menu
    LiveControls.jsx      Go live / room code / Copy link / Stop sharing
    Setup.jsx             name list + shuffle/rank + consolation options
    JoinRoom.jsx          "enter a room code" box
    Tournament.jsx        main draw + consolation
    Bracket.jsx           one bracket: rounds and champion
    Match.jsx             one match: two clickable players
  lib/
    bracket.js            pure bracket logic (seeding, byes, rounds, consolation)
    live.js               PeerJS rooms: useHost / useViewer hooks
    names.js              parse + validate the name list
    storage.js            useSavedState: state saved to localStorage
    theme.js              theme list + useTheme (colors live in App.css)
```
