import { Bot } from 'lucide-react'
import { Card, DataTable, type Column, StatusBadge } from '../../components/ui'

export function PickingPage() {
  const pickingQueue = [
    { orderId: 'ORD-104', sku: 'SKU-001', slot: 'Golden A-01', robot: 'Alpha-1 (AMR)', status: 'retrieving', time: '2 mins ago' },
    { orderId: 'ORD-105', sku: 'SKU-004', slot: 'Shelf B-02', robot: 'Beta-2 (AMR)', status: 'queued', time: 'Just now' },
  ]

  const columns: Column<Record<string, unknown>>[] = [
    {
      header: 'Order Reference',
      cell: (row) => <span className="font-mono text-xs text-cyan font-semibold">{String(row.orderId)}</span>,
    },
    {
      header: 'Pick SKU',
      cell: (row) => <span className="font-mono text-xs text-text-primary">{String(row.sku)}</span>,
    },
    {
      header: 'Pickup Slot Location',
      cell: (row) => <span className="font-mono text-xs text-cyan font-medium">{String(row.slot)}</span>,
    },
    {
      header: 'Assigned AMR Robot',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-text-primary">
          <Bot className="h-3.5 w-3.5 text-action-primary" />
          {String(row.robot)}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={String(row.status)} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Picking & Retrieval Queue</h1>
        <p className="text-xs text-text-secondary">Automated pick task dispatch & rack-to-station retrieval queue</p>
      </div>

      <Card>
        <DataTable columns={columns} data={pickingQueue as unknown as Record<string, unknown>[]} />
      </Card>
    </div>
  )
}
