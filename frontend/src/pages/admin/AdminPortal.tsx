import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bot, Battery, Activity, Package, ShoppingCart, AlertTriangle } from 'lucide-react'
import { api } from '../../api/client'
import { MetricCard, LoadingSpinner, StatusBadge, EmptyState } from '../../components/ui'

export function AdminOverviewPage() {
  const { data: robots, isLoading: robotsLoading } = useQuery({
    queryKey: ['robots'],
    queryFn: api.robots.list,
  })
  const { data: orders } = useQuery({ queryKey: ['orders'], queryFn: api.orders.list })
  const { data: shipments } = useQuery({ queryKey: ['shipments'], queryFn: api.shipments.list })
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: api.products.list })

  if (robotsLoading) return <LoadingSpinner />

  const activeRobots = robots?.filter((r) => r.status === 'busy').length || 0
  const pendingOrders = orders?.filter((o) => ['pending', 'processing', 'retrieving'].includes(o.status)).length || 0
  const pendingShipments = shipments?.filter((s) => ['registered', 'queued', 'processing'].includes(s.status)).length || 0

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">Command Center</h1>
      <p className="text-sm text-text-secondary mb-8">Real-time autonomous warehouse operations overview</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Active Robots" value={activeRobots} icon={<Bot className="h-5 w-5" />} accent="cyan" />
        <MetricCard label="Fleet Size" value={robots?.length || 0} icon={<Activity className="h-5 w-5" />} accent="cyan" />
        <MetricCard label="Pending Orders" value={pendingOrders} icon={<ShoppingCart className="h-5 w-5" />} accent="amber" />
        <MetricCard label="Active Shipments" value={pendingShipments} icon={<Package className="h-5 w-5" />} accent="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-xl p-6 border border-border-primary">
          <h2 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-cyan" />
            Fleet Status
          </h2>
          {!robots?.length ? (
            <EmptyState title="No robots registered" />
          ) : (
            <div className="space-y-3">
              {robots.map((robot) => (
                <motion.div
                  key={robot.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated border border-border-primary"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-action-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-action-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{robot.name}</p>
                      <p className="text-xs text-text-secondary font-mono">{robot.serial_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-text-secondary">
                      <Battery className="h-3.5 w-3.5" />
                      {robot.battery_level.toFixed(0)}%
                    </div>
                    <StatusBadge status={robot.status} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-xl p-6 border border-border-primary">
          <h2 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan" />
            System Activity
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between p-3 rounded-lg bg-bg-elevated">
              <span className="text-text-secondary">Products in catalog</span>
              <span className="text-text-primary font-medium">{products?.length || 0}</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg bg-bg-elevated">
              <span className="text-text-secondary">Total orders</span>
              <span className="text-text-primary font-medium">{orders?.length || 0}</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg bg-bg-elevated">
              <span className="text-text-secondary">Total shipments</span>
              <span className="text-text-primary font-medium">{shipments?.length || 0}</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber/5 border border-amber/20">
              <AlertTriangle className="h-4 w-4 text-amber" />
              <span className="text-amber text-xs">ROS2 bridge awaiting robot connection</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminRobotsPage() {
  const { data: robots, isLoading } = useQuery({
    queryKey: ['robots'],
    queryFn: api.robots.list,
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">Robot Fleet</h1>
      <p className="text-sm text-text-secondary mb-8">Monitor and manage autonomous mobile robots</p>

      {!robots?.length ? (
        <EmptyState title="No robots in fleet" description="Register robots to begin autonomous operations." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {robots.map((robot) => (
            <div key={robot.id} className="glass-panel rounded-xl p-6 border border-border-primary">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-text-primary">{robot.name}</h3>
                  <p className="text-xs text-text-secondary font-mono">{robot.model} · {robot.serial_number}</p>
                </div>
                <StatusBadge status={robot.status} size="md" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-bg-elevated">
                  <p className="text-text-secondary text-xs">Battery</p>
                  <p className="text-text-primary font-medium">{robot.battery_level.toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-elevated">
                  <p className="text-text-secondary text-xs">Enabled</p>
                  <p className={`font-medium ${robot.is_enabled ? 'text-success' : 'text-error'}`}>
                    {robot.is_enabled ? 'Yes' : 'No'}
                  </p>
                </div>
                {robot.position_x != null && (
                  <div className="p-3 rounded-lg bg-bg-elevated col-span-2">
                    <p className="text-text-secondary text-xs">Position</p>
                    <p className="text-text-primary font-mono text-xs">
                      X: {robot.position_x?.toFixed(2)} Y: {robot.position_y?.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AdminInventoryPage() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: api.products.list,
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">Inventory</h1>
      <p className="text-sm text-text-secondary mb-8">Warehouse memory — synchronized from robot observations</p>

      {!products?.length ? (
        <EmptyState title="No inventory items" />
      ) : (
        <div className="glass-panel rounded-xl border border-border-primary overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary text-text-secondary">
                <th className="text-left p-4 font-medium">SKU</th>
                <th className="text-left p-4 font-medium">Product</th>
                <th className="text-right p-4 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-border-primary hover:bg-bg-elevated transition-colors">
                  <td className="p-4 font-mono text-cyan">{product.sku}</td>
                  <td className="p-4 text-text-primary">{product.name}</td>
                  <td className="p-4 text-right text-text-primary">${product.unit_price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function AdminOrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: api.orders.list,
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">Customer Orders</h1>
      <p className="text-sm text-text-secondary mb-8">All order execution pipelines</p>

      {!orders?.length ? (
        <EmptyState title="No orders" />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="glass-panel rounded-xl p-5 border border-border-primary">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm text-cyan">{order.order_number}</span>
                  <p className="text-xs text-text-secondary mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-text-primary font-medium">${order.total_amount.toFixed(2)}</span>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
