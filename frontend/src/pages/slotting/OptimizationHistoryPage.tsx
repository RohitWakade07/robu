import { Card, DataTable, type Column, StatusBadge } from '../../components/ui'

export function OptimizationHistoryPage() {
  const historyData = [
    { runId: 'OPT-20260808-01', timestamp: '10:40 AM', SKUs: 20, slots: 188, distanceSaved: '142.5 meters', tasksGenerated: 2, status: 'completed' },
    { runId: 'OPT-20260807-02', timestamp: 'Yesterday', SKUs: 18, slots: 188, distanceSaved: '98.2 meters', tasksGenerated: 1, status: 'completed' },
  ]

  const columns: Column<Record<string, unknown>>[] = [
    {
      header: 'Run ID',
      cell: (row) => <span className="font-mono text-xs text-cyan font-semibold">{String(row.runId)}</span>,
    },
    {
      header: 'Run Timestamp',
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{String(row.timestamp)}</span>,
    },
    {
      header: 'Evaluated SKUs',
      cell: (row) => <span className="font-mono text-xs text-text-primary">{Number(row.SKUs)} SKUs</span>,
    },
    {
      header: 'Estimated Travel Savings',
      cell: (row) => <span className="font-mono text-xs font-semibold text-success">{String(row.distanceSaved)}</span>,
    },
    {
      header: 'AMR Relocate Tasks',
      cell: (row) => <span className="font-mono text-xs text-text-primary">{Number(row.tasksGenerated)} Tasks</span>,
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={String(row.status)} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Optimization History & Travel Distance Audit</h1>
        <p className="text-xs text-text-secondary">Historical optimization runs, distance savings & generated AMR relocation jobs</p>
      </div>

      <Card>
        <DataTable columns={columns} data={historyData as unknown as Record<string, unknown>[]} />
      </Card>
    </div>
  )
}
