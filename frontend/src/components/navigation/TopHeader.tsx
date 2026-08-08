import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Menu,
  Sun,
  Moon,
  LogOut,
  Wifi,
  WifiOff,
  ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { BreadcrumbBar } from './BreadcrumbBar'
import { GlobalSearch } from './GlobalSearch'

interface TopHeaderProps {
  onToggleSidebar: () => void
}

export function TopHeader({ onToggleSidebar }: TopHeaderProps) {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { isConnected } = useWebSocket()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 border-b border-border-primary bg-bg-surface backdrop-blur-xl px-4 flex items-center justify-between sticky top-0 z-30 shrink-0">
      {/* Left side: Sidebar Toggle & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
          title="Toggle Navigation Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:block">
          <BreadcrumbBar />
        </div>
      </div>

      {/* Right side: Global Search, System Status, Theme Toggle, User Menu */}
      <div className="flex items-center gap-3">
        <GlobalSearch />

        {/* System Operational Status */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-bg-secondary border border-border-primary text-xs">
          {isConnected ? (
            <>
              <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
              <Wifi className="h-3 w-3 text-cyan" />
              <span className="font-mono text-cyan">ROS2 Live</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber" />
              <WifiOff className="h-3 w-3 text-amber" />
              <span className="font-mono text-text-secondary">Reconnecting</span>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-elevated transition-colors cursor-pointer"
          >
            <div className="h-7 w-7 rounded-full bg-action-primary/20 text-action-primary flex items-center justify-center font-semibold text-xs border border-action-primary/30">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-left pr-1">
              <p className="text-xs font-semibold text-text-primary leading-none truncate max-w-[120px]">
                {user?.full_name || 'Operator'}
              </p>
              <p className="text-[10px] text-text-secondary capitalize font-mono mt-0.5">
                {user?.role || 'Guest'}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 glass-panel rounded-xl border border-border-primary shadow-2xl p-2 z-50 space-y-1">
              <div className="p-2 border-b border-border-primary mb-1">
                <p className="text-xs font-semibold text-text-primary">{user?.full_name}</p>
                <p className="text-[11px] text-text-secondary truncate">{user?.email}</p>
              </div>

              <div className="px-2 py-1 flex items-center justify-between text-xs text-text-secondary">
                <span>Role Permission</span>
                <span className="font-mono text-cyan capitalize">{user?.role}</span>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer mt-2 border-t border-border-primary/50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out Platform
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
