import ThemePicker from './ThemePicker'

// theme / onThemeChange come from the page (Host or Viewer), which owns the theme.
export default function Header({ theme, onThemeChange, hostTheme, children }) {
  return (
    <header>
      <h1>{theme.emoji} Tennis Bracket</h1>
      <div className="actions">
        {children}
        <ThemePicker theme={theme} onChange={onThemeChange} hostTheme={hostTheme} />
      </div>
    </header>
  )
}
