import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bot,
  Package,
  ShoppingCart,
  LayoutDashboard,
  LogOut,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Warehouse,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useThemeStore } from '../../stores/themeStore'
import logoSrc from '../../assets/logo.png'

interface PortalLayoutProps {
  portal: 'customer' | 'warehouse' | 'admin' | 'operator'
}

const portalConfig = {
  customer: {
    title: 'Customer Portal',
    subtitle: 'Browse & Order',
    accent: 'text-action-primary',
    nav: [
      { to: '/customer', label: 'Products', icon: Package, end: true },
      { to: '/customer/orders', label: 'My Orders', icon: ShoppingCart },
    ],
  },
  warehouse: {
    title: 'Warehouse Intake',
    subtitle: 'Shipment Processing',
    accent: 'text-action-primary',
    nav: [
      { to: '/warehouse', label: 'Shipments', icon: Package, end: true },
      { to: '/warehouse/new', label: 'New Shipment', icon: ShoppingCart },
    ],
  },
  operator: {
    title: 'Operator Portal',
    subtitle: 'Robot Vision & Control',
    accent: 'text-action-primary',
    nav: [
      { to: '/operator', label: 'Fleet Map', icon: Bot, end: true },
    ],
  },
  admin: {
    title: 'Robotics Command',
    subtitle: 'Operations Dashboard',
    accent: 'text-action-primary',
    nav: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/admin/robots', label: 'Fleet', icon: Bot },
      { to: '/admin/inventory', label: 'Inventory', icon: Package },
      { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { to: '/wms', label: 'WMS Engine', icon: Warehouse },
    ],
  },
}


export function PortalLayout({ portal }: PortalLayoutProps) {
  const config = portalConfig[portal]
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { isConnected } = useWebSocket()
  const { theme, toggleTheme } = useThemeStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen grid-bg flex">
      <aside className="w-64 border-r border-border-primary bg-bg-primary backdrop-blur-xl flex flex-col">
        <div className="p-6 border-b border-border-primary">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-action-primary/10 border border-action-primary/30 flex items-center justify-center overflow-hidden p-1">
              <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className={`text-sm font-bold ${config.accent}`}>{config.title}</h1>
              <p className="text-xs text-text-secondary">{config.subtitle}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {config.nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-action-primary/10 text-action-primary border border-action-primary/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border-primary space-y-3">
          <div className="flex items-center gap-2 text-xs">
            {isConnected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-cyan" />
                <span className="text-cyan">Live Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-text-secondary" />
                <span className="text-text-secondary">Reconnecting...</span>
              </>
            )}
          </div>
          <div className="text-xs text-text-secondary truncate">{user?.full_name}</div>
          
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors w-full"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-error transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="p-8"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
