import { ListTodo, CheckCircle, Clock } from 'lucide-react'
import { Card, StatusBadge, DataTable, type Column } from '../../components/ui'

export function RobotTasksPage() {

  // Mock task queue data for task display
  const tasksData = [
    { id: 'TSK-001', type: 'RELOCATE', robot: 'Alpha-1', priority: 1, status: 'processing', reason: 'Slot Optimization (+18.4% gain)', time: '10:42 AM' },
    { id: 'TSK-002', type: 'STORE_CRATE', robot: 'Beta-2', priority: 2, status: 'completed', reason: 'Inbound Intake #SHP-99', time: '10:15 AM' },
    { id: 'TSK-003', type: 'RETRIEVE_CRATE', robot: 'Alpha-1', priority: 1, status: 'completed', reason: 'Customer Order #ORD-104', time: '09:50 AM' },
    { id: 'TSK-004', type: 'RELOCATE', robot: 'Unassigned', priority: 3, status: 'pending', reason: 'Co-occurrence pairing SKU-04/12', time: '11:00 AM' },
  ]

  const columns: Column<Record<string, unknown>>[] = [
    {
      header: 'Task ID',
      cell: (row) => <span className="font-mono text-cyan text-xs font-semibold">{String(row.id)}</span>,
    },
    {
      header: 'Task Type',
      cell: (row) => <span className="font-mono text-xs text-text-primary uppercase">{String(row.type)}</span>,
    },
    {
      header: 'Assigned AMR',
      cell: (row) => <span className="text-xs text-text-primary font-medium">{String(row.robot)}</span>,
    },
    {
      header: 'Priority',
      cell: (row) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-bg-secondary text-text-secondary border border-border-primary">
          P{String(row.priority)}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={String(row.status)} />,
    },
    {
      header: 'Optimization Reason',
      cell: (row) => <span className="text-xs text-text-secondary">{String(row.reason)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Robot Execution Tasks</h1>
        <p className="text-xs text-text-secondary">Autonomous task queue, relocation jobs & execution audit log</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan/10 text-cyan">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-text-secondary">Active Tasks</p>
            <p className="text-lg font-bold text-text-primary font-mono">1 Running</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber/10 text-amber">
            <ListTodo className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-text-secondary">Queued Tasks</p>
            <p className="text-lg font-bold text-text-primary font-mono">1 Pending</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-success/10 text-success">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-text-secondary">Completed Today</p>
            <p className="text-lg font-bold text-text-primary font-mono">24 Completed</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-cyan" />
            Task Execution Queue
          </h3>
        </div>
        <DataTable columns={columns} data={tasksData as unknown as Record<string, unknown>[]} />
      </Card>
    </div>
  )
}
