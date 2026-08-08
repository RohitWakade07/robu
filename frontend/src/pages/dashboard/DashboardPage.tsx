import { useQuery } from '@tanstack/react-query'
import {
  Bot,
  Package,
  ShoppingCart,
  Activity,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { api } from '../../api/client'
import { MetricCard, LoadingSpinner, StatusBadge, DataTable, Card, type Column } from '../../components/ui'

export function DashboardPage() {
  const { data: robots, isLoading: robotsLoading } = useQuery({
    queryKey: ['robots'],
    queryFn: api.robots.list,
  })
  const { data: orders } = useQuery({ queryKey: ['orders'], queryFn: api.orders.list })
  const { data: shipments } = useQuery({ queryKey: ['shipments'], queryFn: api.shipments.list })
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: api.products.list })

  if (robotsLoading) return <LoadingSpinner />

  const activeRobots = robots?.filter((r) => r.status === 'busy' || r.status === 'working').length || 0
  const totalRobots = robots?.length || 0
  const pendingOrders = orders?.filter((o) => ['pending', 'processing', 'retrieving'].includes(o.status)).length || 0
  const activeShipments = shipments?.filter((s) => ['registered', 'queued', 'processing'].includes(s.status)).length || 0

  const robotColumns: Column<Record<string, unknown>>[] = [
    {
      header: 'Robot Name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-cyan" />
          <span className="font-semibold text-text-primary">{String(row.name)}</span>
        </div>
      ),
    },
    {
      header: 'Model / Serial',
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{String(row.serial_number)}</span>,
    },
    {
      header: 'Battery',
      cell: (row) => (
        <span className="font-mono text-xs text-text-primary">{Number(row.battery_level).toFixed(0)}%</span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={String(row.status)} />,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Operational Command Center</h1>
        <p className="text-xs text-text-secondary">
          Real-time warehouse telemetry, autonomous fleet control & spatial optimization overview
        </p>
      </div>

      {/* System Status Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="glass-panel p-3 rounded-xl border border-border-primary flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan/10 text-cyan">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-text-secondary">Fleet Online</p>
            <p className="text-sm font-bold text-text-primary font-mono">{activeRobots} / {totalRobots} Active</p>
          </div>
        </div>

        <div className="glass-panel p-3 rounded-xl border border-border-primary flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-text-secondary">API & DB State</p>
            <p className="text-sm font-bold text-success font-mono">100% Operational</p>
          </div>
        </div>

        <div className="glass-panel p-3 rounded-xl border border-border-primary flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber/10 text-amber">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-text-secondary">Avg Pick Time</p>
            <p className="text-sm font-bold text-text-primary font-mono">2.4 min / order</p>
          </div>
        </div>

        <div className="glass-panel p-3 rounded-xl border border-border-primary flex items-center gap-3">
          <div className="p-2 rounded-lg bg-action-primary/10 text-action-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-text-secondary">A* Slotting Gain</p>
            <p className="text-sm font-bold text-action-primary font-mono">+18.4% Efficiency</p>
          </div>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Robot Fleet" value={activeRobots} icon={<Bot className="h-5 w-5" />} accent="cyan" />
        <MetricCard label="Pending Customer Orders" value={pendingOrders} icon={<ShoppingCart className="h-5 w-5" />} accent="amber" />
        <MetricCard label="Inbound Shipments" value={activeShipments} icon={<Package className="h-5 w-5" />} accent="electric" />
        <MetricCard label="Products In Catalog" value={products?.length || 0} icon={<Layers className="h-5 w-5" />} accent="green" />
      </div>

      {/* Main Command Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Robot Fleet Summary */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Bot className="h-4 w-4 text-cyan" />
                Active Robot Fleet Status
              </h3>
              <span className="text-xs text-text-secondary font-mono">{totalRobots} AMRs Registered</span>
            </div>
            <DataTable
              columns={robotColumns}
              data={(robots || []) as unknown as Record<string, unknown>[]}
              pageSize={5}
              emptyTitle="No Robots Registered"
              emptyDescription="Add autonomous mobile robots to monitor real-time fleet operations."
            />
          </Card>
        </div>

        {/* Right Column: Alerts & Recent Activity */}
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-action-primary" />
              Optimization & Relocation Alerts
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-action-primary/10 border border-action-primary/20 text-xs space-y-1">
                <div className="flex justify-between font-semibold text-action-primary">
                  <span>Fast Mover Sub-optimal</span>
                  <span className="font-mono">+24% Dist</span>
                </div>
                <p className="text-text-secondary">
                  SKU-001 is placed in Zone C (Reserve). Recommended relocation to Golden Zone A-01.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber/10 border border-amber/20 text-xs space-y-1">
                <div className="flex justify-between font-semibold text-amber">
                  <span>High Co-occurrence Pair</span>
                  <span className="font-mono">Jaccard 0.82</span>
                </div>
                <p className="text-text-secondary">
                  SKU-004 and SKU-012 frequently ordered together. Recommend adjacent slotting.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan" />
              System Diagnostics
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border-primary/50 text-text-secondary">
                <span>FastAPI Backend Server</span>
                <span className="text-success font-mono font-medium">Online (Port 8000)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border-primary/50 text-text-secondary">
                <span>WebSocket Telemetry Gateway</span>
                <span className="text-cyan font-mono font-medium">Connected</span>
              </div>
              <div className="flex justify-between py-1.5 text-text-secondary">
                <span>Database Engine</span>
                <span className="text-text-primary font-mono">SQLite / SQLAlchemy</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
