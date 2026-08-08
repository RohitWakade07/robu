import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Package, Bot, ShoppingCart, Warehouse, Layers, ArrowRight } from 'lucide-react'
import { Modal } from '../ui'

interface SearchItem {
  id: string
  title: string
  subtitle: string
  type: 'Product' | 'Robot' | 'Order' | 'Warehouse' | 'Page'
  route: string
  icon: typeof Package
}

const searchDataset: SearchItem[] = [
  { id: '1', title: 'Dashboard', subtitle: 'Operational Command Center', type: 'Page', route: '/dashboard', icon: Warehouse },
  { id: '2', title: 'Robot Fleet', subtitle: 'Live telemetry & map', type: 'Robot', route: '/robots', icon: Bot },
  { id: '3', title: 'Robot Vision & Control', subtitle: 'Operator manual controls', type: 'Robot', route: '/robot-fleet', icon: Bot },
  { id: '4', title: 'Spatial Slotting Engine', subtitle: 'A* Optimization & Slot scoring', type: 'Page', route: '/slotting', icon: Layers },
  { id: '5', title: 'Slotting Recommendations', subtitle: 'Optimal product relocations', type: 'Page', route: '/slotting/recommendations', icon: Layers },
  { id: '6', title: 'Product Catalog', subtitle: 'SKU Inventory & Dimensions', type: 'Product', route: '/products', icon: Package },
  { id: '7', title: 'Customer Orders', subtitle: 'Pipeline & Dispatch', type: 'Order', route: '/orders', icon: ShoppingCart },
  { id: '8', title: 'Stock Inventory', subtitle: 'Rack placements & quantities', type: 'Product', route: '/inventory', icon: Package },
  { id: '9', title: 'Shipments Intake', subtitle: 'Inbound crates & verification', type: 'Order', route: '/shipping', icon: ShoppingCart },
  { id: '10', title: 'User Management', subtitle: 'Roles & access control', type: 'Page', route: '/users', icon: Warehouse },
]

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const filtered = searchDataset.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      item.type.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (route: string) => {
    setIsOpen(false)
    setQuery('')
    navigate(route)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-3 bg-bg-secondary hover:bg-bg-elevated text-text-secondary border border-border-primary rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer w-64"
      >
        <Search className="h-3.5 w-3.5 text-text-secondary" />
        <span className="flex-1 text-left">Search platform...</span>
        <kbd className="font-mono bg-bg-elevated px-1.5 py-0.5 rounded text-[10px] border border-border-primary">Ctrl+K</kbd>
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Global Search & Navigation">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search robots, products, orders, or pages..."
              className="w-full rounded-lg border border-border-primary bg-bg-secondary pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-action-primary focus:outline-none"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
            {filtered.length === 0 ? (
              <p className="text-center py-6 text-xs text-text-secondary">No matching entities found.</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.route)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-bg-elevated text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-bg-secondary text-cyan group-hover:text-action-primary transition-colors">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{item.title}</p>
                      <p className="text-xs text-text-secondary">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-bg-secondary text-text-secondary border border-border-primary">
                      {item.type}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
