import ThemePicker from './ThemePicker'

// theme / onThemeChange come from the page (Host or Viewer), which owns the theme.
// Desktop: title | actions + theme (the group wraps below the title when space runs out).
// Phones: title + theme on top, actions below.
export default function Header({ theme, onThemeChange, hostTheme, children }) {
  return (
    <header>
      <h1>{theme.emoji} Tennis Bracket</h1>
      {/* Buttons + theme move as one group, so they wrap below the title together */}
      <div className="controls">
        <div className="actions">{children}</div>
        <ThemePicker theme={theme} onChange={onThemeChange} hostTheme={hostTheme} />
      </div>
    </header>
  )
}
