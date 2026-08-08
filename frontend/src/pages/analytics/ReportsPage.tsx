import { Download } from 'lucide-react'
import { Card, DataTable, type Column, Button } from '../../components/ui'

export function ReportsPage() {
  const reportsData = [
    { name: 'Monthly Inventory Valuation & ABC Audit', date: 'Aug 01, 2026', type: 'PDF Report', size: '2.4 MB' },
    { name: 'Robot Fleet Health & Maintenance Log', date: 'Jul 28, 2026', type: 'CSV Export', size: '850 KB' },
    { name: 'Spatial Slotting Distance Savings Audit', date: 'Jul 15, 2026', type: 'JSON Dataset', size: '1.1 MB' },
  ]

  const columns: Column<Record<string, unknown>>[] = [
    {
      header: 'Report Document Title',
      cell: (row) => <span className="font-medium text-xs text-text-primary">{String(row.name)}</span>,
    },
    {
      header: 'Generated Date',
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{String(row.date)}</span>,
    },
    {
      header: 'Format',
      cell: (row) => <span className="font-mono text-xs text-cyan">{String(row.type)}</span>,
    },
    {
      header: 'File Size',
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{String(row.size)}</span>,
    },
    {
      header: 'Download',
      cell: () => (
        <Button variant="outline" className="py-1 px-2 text-xs" icon={<Download className="h-3 w-3" />}>
          Export
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Executive Reports & Data Export</h1>
        <p className="text-xs text-text-secondary">Export operational datasets, compliance reports & inventory audits</p>
      </div>

      <Card>
        <DataTable columns={columns} data={reportsData as unknown as Record<string, unknown>[]} />
      </Card>
    </div>
  )
}
