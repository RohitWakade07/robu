import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Warehouse,
  Layers,
  Map,
  Grid3X3,
  Boxes,
  Package,
  Tags,
  ArrowLeftRight,
  ShoppingCart,
  Hand,
  Truck,
  Bot,
  ListTodo,
  Radar,
  Terminal,
  Sparkles,
  TrendingUp,
  History,
  BarChart3,
  FileText,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import logoSrc from '../../assets/logo.png'

interface SidebarProps {
  collapsed: boolean
  drawerOpen: boolean
  onCloseDrawer: () => void
}

export interface NavSection {
  label: string
  roles?: string[]
  items: {
    label: string
    route: string
    icon: typeof LayoutDashboard
    roles?: string[]
  }[]
}

export const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', route: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Warehouse',
    roles: ['warehouse_operator', 'administrator'],
    items: [
      { label: 'Warehouses', route: '/warehouses', icon: Warehouse },
      { label: 'Racks & Shelves', route: '/racks', icon: Layers },
      { label: 'Warehouse Map', route: '/warehouse-map', icon: Map },
      { label: 'Zones', route: '/zones', icon: Grid3X3 },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Stock Inventory', route: '/inventory', icon: Boxes },
      { label: 'Products', route: '/products', icon: Package },
      { label: 'Categories', route: '/categories', icon: Tags },
      { label: 'Stock Movements', route: '/stock-movements', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Orders',
    items: [
      { label: 'Orders Pipeline', route: '/orders', icon: ShoppingCart },
      { label: 'Picking Queue', route: '/picking', icon: Hand },
      { label: 'Shipping & Intake', route: '/shipping', icon: Truck },
    ],
  },
  {
    label: 'Robotics',
    roles: ['warehouse_operator', 'administrator'],
    items: [
      { label: 'Robot Fleet', route: '/robots', icon: Bot },
      { label: 'Robot Tasks', route: '/robot-tasks', icon: ListTodo },
      { label: 'Vision & Control', route: '/robot-fleet', icon: Radar },
      { label: 'Telemetry & Logs', route: '/robot-logs', icon: Terminal },
    ],
  },
  {
    label: 'Optimization',
    roles: ['administrator', 'warehouse_operator'],
    items: [
      { label: 'Slotting Engine', route: '/slotting', icon: Boxes },
      { label: 'Recommendations', route: '/slotting/recommendations', icon: Sparkles },
      { label: 'Demand Analytics', route: '/analytics/demand', icon: TrendingUp },
      { label: 'Optimization History', route: '/optimization/history', icon: History },
    ],
  },
  {
    label: 'Analytics',
    roles: ['administrator'],
    items: [
      { label: 'Analytics', route: '/analytics', icon: BarChart3 },
      { label: 'Reports', route: '/reports', icon: FileText },
    ],
  },
  {
    label: 'Administration',
    roles: ['administrator'],
    items: [
      { label: 'User Management', route: '/users', icon: Users },
      { label: 'System Settings', route: '/settings', icon: Settings },
    ],
  },
]

export function GlobalSidebar({ collapsed, drawerOpen, onCloseDrawer }: SidebarProps) {
  const { user } = useAuthStore()
  const location = useLocation()
  // Unknown/unassigned role gets the least-privileged navigation.
  const userRole = user?.role || 'customer'

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const toggleSection = (label: string) => {
    setCollapsedSections((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const visibleSections = navSections.filter((section) => !section.roles || section.roles.includes(userRole))

  // On the mobile drawer we always show labels; the icon rail only applies at lg+.
  const rail = collapsed

  const closeOnEscape = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && drawerOpen) onCloseDrawer()
  }

  return (
    <>
      {drawerOpen && (
        <div
          aria-hidden="true"
          onClick={onCloseDrawer}
          className="fixed inset-0 z-30 bg-[color-mix(in_srgb,var(--c-base)_70%,transparent)] backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        id="app-sidebar"
        onKeyDown={closeOnEscape}
        aria-label="Primary"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col bg-bg-primary shadow-[var(--neu-float)] transition-transform duration-300 lg:static lg:translate-x-0 lg:shadow-[6px_0_14px_var(--sh-dark)] ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        } ${rail ? 'lg:w-[4.75rem]' : 'lg:w-64'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center gap-3 px-4">
          <div className="neu-inset flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden p-1.5">
            <img src={logoSrc} alt="ARMS" className="h-full w-full object-contain" />
          </div>
          <div className={`min-w-0 flex-1 ${rail ? 'lg:hidden' : ''}`}>
            <p className="text-sm font-extrabold leading-none tracking-wider text-text-primary">ARMS</p>
            <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-widest text-text-secondary">Robotic Management</p>
          </div>
          <button
            type="button"
            onClick={onCloseDrawer}
            aria-label="Close navigation"
            className="neu-pressable flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary lg:hidden cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav List */}
        <nav aria-label="Main" className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {visibleSections.map((section) => {
            const isExpanded = !collapsedSections[section.label]
            const visibleItems = section.items.filter((item) => !item.roles || item.roles.includes(userRole))
            if (visibleItems.length === 0) return null
            const listId = `nav-${section.label}`
            const singleSection = section.items.length === 1 && section.label === 'Overview'

            return (
              <div key={section.label} className="space-y-1.5">
                {!singleSection && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.label)}
                    aria-expanded={isExpanded}
                    aria-controls={listId}
                    className={`flex w-full items-center justify-between rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary cursor-pointer ${rail ? 'lg:hidden' : ''}`}
                  >
                    <span>{section.label}</span>
                    {isExpanded ? <ChevronDown className="h-3 w-3" aria-hidden="true" /> : <ChevronRight className="h-3 w-3" aria-hidden="true" />}
                  </button>
                )}

                <ul id={listId} className={`space-y-1.5 ${isExpanded ? '' : rail ? '' : 'hidden'}`}>
                  {visibleItems.map((item) => {
                    // Match the longest route so /slotting doesn't also highlight /slotting/recommendations.
                    const isActive =
                      location.pathname === item.route ||
                      (location.pathname.startsWith(item.route + '/') &&
                        !visibleSections.some((s) => s.items.some((o) => o.route.length > item.route.length && location.pathname.startsWith(o.route))))

                    return (
                      <li key={item.route}>
                        <NavLink
                          to={item.route}
                          aria-current={isActive ? 'page' : undefined}
                          title={rail ? item.label : undefined}
                          aria-label={rail ? item.label : undefined}
                          className={`flex min-h-10 items-center gap-3 rounded-[var(--radius-neu-sm)] px-3 py-2 text-sm font-medium transition-all ${rail ? 'lg:justify-center lg:px-0' : ''} ${
                            isActive
                              ? 'bg-bg-secondary text-action-primary shadow-[var(--neu-pressed)]'
                              : 'text-text-secondary hover:text-text-primary hover:shadow-[var(--neu-flat)]'
                          }`}
                        >
                          <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className={`truncate ${rail ? 'lg:sr-only' : ''}`}>{item.label}</span>
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
