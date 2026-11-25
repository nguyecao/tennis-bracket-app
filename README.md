# 🎾 Tennis Bracket

Enter 2–128 names and generate a single-elimination bracket. No database — everything is saved in your browser's localStorage.

- **Shuffle** randomizes the draw. **Rank** seeds players in the order you typed them (top seeds get any byes).
- **Group stage** (optional): players are split into round-robin groups (4 per group recommended); the top 1–3 from each group advance into the knockout Main Draw. Choose "One group" + "Top 1" for a plain round robin. Choose "Everyone" under Advancing for **pool play for seeding**: nobody is eliminated, and pool results decide each player's Main Draw seed. Hosts and viewers switch between **Group Stage** and **Main Draw** tabs.
- **Consolation bracket** (optional) collects every player who loses their first match.
- Click a player to advance them; click again to undo.
- **Tournament name and date** are optional and editable on the bracket (✎). With no name, the theme's name is used.
- **Keep score** (optional): tap "+ Add score" under a match and enter any number of sets (1–5) in any format; the winner is filled in automatically. Turn on **Use scores to break ties in groups** to rank tied players by set difference, then game difference (after head-to-head).
- **Champion celebration**: when a final is decided (Main Draw, Consolation, or a one-group round robin), confetti and the champion's name appear on the host's and every viewer's screen at once, with the final score if scores are kept. Tap or wait a few seconds to close.
- **Cheers** (live rooms): viewers and the host tap the 👏 button to send 👏 🔥 😮 🎉 or the theme's emoji, which float up everyone's screen. Each person gets 5 quick cheers, then one every 2 seconds (the host enforces this too). The host can switch cheers off with the Cheers switch.
- **Download PDF** (right of the tabs): downloads a printable draw sheet of the bracket as it stands, with group tables and results. Hosts and viewers can both download it.
- **Players** tab: every player's status and record. Tap ★ to highlight players across the bracket (saved on this device only).
- Pick a theme (Classic, Wimbledon, Australian Open, US Open, Roland Garros) from the menu in the header. Each browser remembers its own choice.
- **Go live** creates a 6-character room code. **Copy link** copies a viewer link to your clipboard. Anyone who opens it (or types the code under "Watching someone else's bracket?") sees results the moment you click them. Viewers can't change anything. A QR code beside the title opens the same viewer link (tap it to enlarge). While live, the host's screen is kept awake where the browser supports it.

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
    Tournament.jsx        Group Stage / Main Draw tabs, main draw + consolation
    GroupStage.jsx        group standings tables + round-robin matches
    Bracket.jsx           one bracket: rounds and champion
    Match.jsx             one match: two clickable players (+ score)
    Players.jsx           Players tab: status, records, ★ highlights
    ScoreEditor.jsx       set-by-set score entry
    TournamentTitle.jsx   editable name + date
    QrShare.jsx           QR code card + enlarged view
    Modal.jsx             confirmation dialogs
    Celebration.jsx       confetti + champion card when a final is decided
    Cheers.jsx            Cheer button, tray, and floating cheers
  lib/
    bracket.js            pure bracket logic (seeding, byes, rounds, consolation)
    groups.js             group stage: splitting groups, schedules, standings, qualifiers
    live.js               PeerJS rooms: useHost / useViewer hooks
    names.js              parse + validate the name list
    storage.js            useSavedState: state saved to localStorage
    theme.js              theme list + useTheme (colors live in App.css)
    scores.js             score format + who won from a score
    players.js            per-player status and records
    follow.js             ★ highlights (per device)
    wakeLock.js           keep the screen awake while hosting
    dates.js              date helpers
    cheers.js             cheer emoji, spam limit, and cheer events
    pdf.js                printable PDF draw sheet (jsPDF, loaded on demand)
```
