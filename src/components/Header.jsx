import ThemePicker from './ThemePicker'

// theme / onThemeChange come from the page (Host or Viewer), which owns the theme.
// Desktop: title | actions | theme. Phones: title + theme on top, actions below.
export default function Header({ theme, onThemeChange, hostTheme, children }) {
  return (
    <header>
      <h1>{theme.emoji} Tennis Bracket</h1>
      <div className="actions">{children}</div>
      <ThemePicker theme={theme} onChange={onThemeChange} hostTheme={hostTheme} />
    </header>
  )
}
