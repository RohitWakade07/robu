import { Bot } from 'lucide-react'
import { Card, DataTable, type Column, StatusBadge } from '../../components/ui'

export function StockMovementsPage() {
  const movementsData = [
    { id: 'MOV-1001', sku: 'SKU-001', type: 'RELOCATION', from: 'Shelf C-04', to: 'Slot A-01', executor: 'Alpha-1 (AMR)', time: '10:42 AM' },
    { id: 'MOV-1002', sku: 'SKU-004', type: 'PUTAWAY', from: 'Intake Dock 1', to: 'Shelf B-02', executor: 'Beta-2 (AMR)', time: '10:15 AM' },
    { id: 'MOV-1003', sku: 'SKU-012', type: 'PICKING', from: 'Slot A-02', to: 'Dispatch Station 2', executor: 'Alpha-1 (AMR)', time: '09:50 AM' },
  ]

  const columns: Column<Record<string, unknown>>[] = [
    {
      header: 'Movement ID',
      cell: (row) => <span className="font-mono text-xs text-cyan font-semibold">{String(row.id)}</span>,
    },
    {
      header: 'SKU',
      cell: (row) => <span className="font-mono text-xs text-text-primary">{String(row.sku)}</span>,
    },
    {
      header: 'Movement Type',
      cell: (row) => <StatusBadge status={String(row.type)} />,
    },
    {
      header: 'Source Location',
      cell: (row) => <span className="text-xs text-text-secondary">{String(row.from)}</span>,
    },
    {
      header: 'Destination Location',
      cell: (row) => <span className="text-xs text-cyan font-medium">{String(row.to)}</span>,
    },
    {
      header: 'Executor',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-text-primary">
          <Bot className="h-3.5 w-3.5 text-action-primary" />
          {String(row.executor)}
        </div>
      ),
    },
    {
      header: 'Timestamp',
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{String(row.time)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Stock Movement Audit Trail</h1>
        <p className="text-xs text-text-secondary">Verifiable log of all automated putaways, relocations & picking dispatches</p>
      </div>

      <Card>
        <DataTable columns={columns} data={movementsData as unknown as Record<string, unknown>[]} />
      </Card>
    </div>
  )
}
