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
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import logoSrc from '../../assets/logo.png'

interface SidebarProps {
  collapsed: boolean
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

const navSections: NavSection[] = [
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

export function GlobalSidebar({ collapsed }: SidebarProps) {
  const { user } = useAuthStore()
  const location = useLocation()
  const userRole = user?.role || 'administrator' // Default to admin if unassigned for dev

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Overview: true,
    Warehouse: true,
    Inventory: true,
    Orders: true,
    Robotics: true,
    Optimization: true,
    Analytics: true,
    Administration: true,
  })

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  // Filter sections by user role
  const visibleSections = navSections.filter((section) => {
    if (!section.roles) return true
    return section.roles.includes(userRole)
  })

  return (
    <aside
      className={`border-r border-border-primary bg-bg-surface backdrop-blur-xl flex flex-col transition-all duration-300 z-40 shrink-0 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 border-b border-border-primary flex items-center px-4 gap-3 shrink-0">
        <div className="h-9 w-9 rounded-lg bg-action-primary/10 border border-action-primary/30 flex items-center justify-center p-1 overflow-hidden shrink-0">
          <img src={logoSrc} alt="Robu" className="w-full h-full object-contain" />
        </div>
        {!collapsed && (
          <div className="truncate">
            <h1 className="text-sm font-bold text-text-primary leading-none flex items-center gap-1">
              Robu<span className="text-action-primary">WMS</span>
            </h1>
            <p className="text-[10px] text-text-secondary font-mono tracking-wider uppercase mt-1">
              Enterprise v4.2
            </p>
          </div>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {visibleSections.map((section) => {
          const isExpanded = expandedSections[section.label] !== false
          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(userRole)
          )

          if (visibleItems.length === 0) return null

          return (
            <div key={section.label} className="space-y-1">
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.label)}
                  className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors cursor-pointer"
                >
                  <span>{section.label}</span>
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              )}

              {(collapsed || isExpanded) && (
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive =
                      location.pathname === item.route ||
                      (item.route !== '/dashboard' && location.pathname.startsWith(item.route))

                    return (
                      <NavLink
                        key={item.route}
                        to={item.route}
                        title={collapsed ? `${section.label}: ${item.label}` : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-action-primary/10 text-action-primary border border-action-primary/20 shadow-sm'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated border border-transparent'
                        }`}
                      >
                        <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-action-primary' : ''}`} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Sidebar Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-border-primary bg-bg-secondary/50 text-xs shrink-0">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-[10px] font-mono">System State</span>
            <span className="text-[10px] font-mono text-cyan flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" /> Operational
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}
