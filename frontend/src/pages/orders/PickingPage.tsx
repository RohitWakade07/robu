import { useQuery } from '@tanstack/react-query'
import { Bot } from 'lucide-react'
import { api } from '../../api/client'
import { Card, DataTable, StatusBadge, PageHeader, ErrorState, LoadingSpinner, type Column } from '../../components/ui'
import type { Order, Robot } from '../../types'

type Row = Order & Record<string, unknown>

const IN_FLIGHT = ['pending', 'confirmed', 'processing', 'retrieving', 'queued']

export function PickingPage() {
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.orders.list, refetchInterval: 15_000 })
  const robots = useQuery({ queryKey: ['robots'], queryFn: api.robots.list, retry: false })

  const robotName = new Map((robots.data ?? ([] as Robot[])).map((r) => [r.id, r.name]))
  const queue = (orders.data ?? []).filter((o) => IN_FLIGHT.includes(o.status))

  const columns: Column<Row>[] = [
    { header: 'Order', accessorKey: 'order_number', sortable: true, cell: (r) => <span className="font-mono text-xs font-semibold text-action-primary">{r.order_number}</span> },
    { header: 'Items', sortable: true, sortValue: (r) => r.items.length, cell: (r) => <span className="t-numeric text-xs text-text-primary">{r.items.reduce((n, i) => n + i.quantity, 0)} units / {r.items.length} lines</span> },
    {
      header: 'Assigned robot',
      cell: (r) =>
        r.assigned_robot_id ? (
          <div className="flex items-center gap-1.5 text-xs text-text-primary">
            <Bot className="h-3.5 w-3.5 text-action-primary" aria-hidden="true" />
            {robotName.get(r.assigned_robot_id) ?? r.assigned_robot_id}
          </div>
        ) : (
          <span className="text-xs text-text-secondary">Unassigned</span>
        ),
    },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { header: 'Created', sortable: true, sortValue: (r) => r.created_at, cell: (r) => <span className="font-mono text-xs text-text-secondary">{new Date(r.created_at).toLocaleString()}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Picking Queue" description="Open orders waiting for or undergoing robot retrieval. Refreshes every 15 seconds." />
      <Card>
        {orders.isLoading ? (
          <LoadingSpinner label="Loading picking queue" />
        ) : orders.isError ? (
          <ErrorState title="Could not load orders" error={orders.error} onRetry={() => orders.refetch()} />
        ) : (
          <DataTable caption="Picking queue" columns={columns} data={queue as Row[]} emptyTitle="Picking queue is empty" emptyDescription="Orders that need picking will appear here." />
        )}
      </Card>
    </div>
  )
}
