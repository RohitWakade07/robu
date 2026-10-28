import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

const routeLabels: Record<string, string> = {
  dashboard: 'Overview',
  warehouses: 'Warehouses',
  racks: 'Racks & Shelves',
  'warehouse-map': 'Spatial Map',
  zones: 'Zones',
  inventory: 'Inventory',
  products: 'Products',
  categories: 'Categories',
  'stock-movements': 'Stock Movements',
  orders: 'Orders',
  picking: 'Picking Queue',
  shipping: 'Shipping & Intake',
  robots: 'Robot Fleet',
  'robot-tasks': 'Robot Tasks',
  'robot-fleet': 'Robot Vision & Control',
  'robot-logs': 'Telemetry & Logs',
  slotting: 'Slotting Engine',
  recommendations: 'Recommendations',
  demand: 'Demand Analytics',
  optimization: 'Optimization',
  history: 'Optimization History',
  analytics: 'Analytics',
  reports: 'Reports',
  users: 'User Management',
  settings: 'System Settings',
  admin: 'Administration',
  operator: 'Operator Portal',
  customer: 'Customer Portal',
  wms: 'Spatial WMS',
}

export function BreadcrumbBar() {
  const location = useLocation()
  const pathnames = location.pathname.split('/').filter((x) => x)

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs text-text-secondary">
      <Link to="/dashboard" aria-label="Dashboard" className="flex shrink-0 items-center gap-1 rounded hover:text-text-primary transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`
        const isLast = index === pathnames.length - 1
        const label = routeLabels[value] || value.replace(/-/g, ' ')

        return (
          <div key={to} className="flex items-center gap-1.5 shrink-0">
            <ChevronRight className="h-3 w-3 text-text-muted" aria-hidden="true" />
            {isLast ? (
              <span aria-current="page" className="font-semibold text-text-primary capitalize">{label}</span>
            ) : (
              <Link to={to} className="hover:text-text-primary transition-colors capitalize">
                {label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
