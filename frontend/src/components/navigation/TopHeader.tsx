import { useNavigate } from 'react-router-dom'
import { Menu, Sun, Moon, LogOut, Wifi, WifiOff, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { BreadcrumbBar } from './BreadcrumbBar'
import { GlobalSearch } from './GlobalSearch'
import { DropdownMenu, IconButton } from '../ui'

interface TopHeaderProps {
  onToggleSidebar: () => void
  drawerOpen: boolean
}

export function TopHeader({ onToggleSidebar, drawerOpen }: TopHeaderProps) {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { isConnected } = useWebSocket()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleLabel = (user?.role || 'guest').replace(/_/g, ' ')

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 bg-bg-primary px-4 shadow-[0_6px_12px_-6px_var(--sh-dark)] md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <IconButton label="Toggle navigation" aria-controls="app-sidebar" aria-expanded={drawerOpen} onClick={onToggleSidebar}>
          <Menu className="h-5 w-5" />
        </IconButton>
        <div className="hidden min-w-0 sm:block">
          <BreadcrumbBar />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <GlobalSearch />

        <div
          role="status"
          className="neu-inset hidden items-center gap-2 px-3 py-1.5 text-xs lg:flex"
          title={isConnected ? 'Realtime telemetry socket connected' : 'Realtime telemetry socket disconnected; retrying'}
        >
          {isConnected ? (
            <>
              <span className="h-2 w-2 rounded-full bg-success motion-safe:animate-pulse" aria-hidden="true" />
              <Wifi className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              <span className="font-semibold text-success">Live</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
              <WifiOff className="h-3.5 w-3.5 text-amber" aria-hidden="true" />
              <span className="font-semibold text-amber">Reconnecting</span>
            </>
          )}
        </div>

        <IconButton label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} onClick={toggleTheme}>
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </IconButton>

        <DropdownMenu
          label="Account"
          trigger={({ open, toggle, id }) => (
            <button
              type="button"
              onClick={toggle}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={open ? id : undefined}
              className="neu-pressable flex min-h-10 items-center gap-2 rounded-[var(--radius-neu-sm)] py-1 pl-1.5 pr-2.5 cursor-pointer"
            >
              <span className="neu-inset flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-action-primary" aria-hidden="true">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </span>
              <span className="hidden text-left md:block">
                <span className="block max-w-[120px] truncate text-xs font-semibold leading-none text-text-primary">{user?.full_name || 'Operator'}</span>
                <span className="mt-1 block text-[10px] capitalize text-text-secondary">{roleLabel}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
            </button>
          )}
        >
          {(close) => (
            <div className="space-y-1">
              <div className="neu-inset mb-2 p-3">
                <p className="truncate text-sm font-semibold text-text-primary">{user?.full_name}</p>
                <p className="truncate text-xs text-text-secondary">{user?.email}</p>
                <p className="mt-1 text-xs capitalize text-action-primary">{roleLabel}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close()
                  handleLogout()
                }}
                className="flex min-h-10 w-full items-center gap-2 rounded-[var(--radius-neu-sm)] px-3 text-sm font-medium text-error hover:shadow-[var(--neu-flat)] cursor-pointer"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </DropdownMenu>
      </div>
    </header>
  )
}
