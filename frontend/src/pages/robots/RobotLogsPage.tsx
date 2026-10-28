import { useQuery, useQueries } from '@tanstack/react-query'
import { Terminal, Cpu, HardDrive, Thermometer } from 'lucide-react'
import { api } from '../../api/client'
import { Card, LoadingSpinner, DataTable, PageHeader, ErrorState, StatusBadge, type Column } from '../../components/ui'
import type { RobotHealth } from '../../types'

type EventRow = Awaited<ReturnType<typeof api.robotCommunication.listEvents>>[number] & Record<string, unknown>

const avg = (values: (number | undefined)[]) => {
  const nums = values.filter((v): v is number => typeof v === 'number')
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

export function RobotLogsPage() {
  const robots = useQuery({ queryKey: ['robots'], queryFn: api.robots.list })
  const events = useQuery({ queryKey: ['robot-events'], queryFn: api.robotCommunication.listEvents, refetchInterval: 10_000 })

  const healthQueries = useQueries({
    queries: (robots.data ?? []).map((r) => ({
      queryKey: ['robot-health', r.id],
      queryFn: () => api.robots.health(r.id),
      retry: false,
      staleTime: 15_000,
    })),
  })
  const healths = healthQueries.map((q) => q.data).filter((h): h is RobotHealth => Boolean(h))

  const cpu = avg(healths.map((h) => h.cpu_usage))
  const mem = avg(healths.map((h) => h.memory_usage))
  const temp = avg(healths.map((h) => h.temperature))
  const fmt = (v: number | null, suffix: string) => (v == null ? '—' : `${v.toFixed(1)}${suffix}`)

  const columns: Column<EventRow>[] = [
    { header: 'Time', sortable: true, sortValue: (r) => r.timestamp, cell: (r) => <span className="font-mono text-xs text-text-secondary">{new Date(r.timestamp).toLocaleTimeString()}</span> },
    { header: 'Type', accessorKey: 'message_type', sortable: true, cell: (r) => <StatusBadge status={r.message_type} /> },
    { header: 'Task', cell: (r) => <span className="font-mono text-xs text-text-secondary">{r.task_id ?? '—'}</span> },
    { header: 'Payload', cell: (r) => <span className="block max-w-md truncate font-mono text-xs text-text-primary" title={r.payload ? JSON.stringify(r.payload) : ''}>{r.payload ? JSON.stringify(r.payload) : '—'}</span> },
  ]

  if (robots.isLoading) return <LoadingSpinner label="Loading telemetry" />

  return (
    <div className="space-y-6">
      <PageHeader title="Telemetry & Logs" description="Fleet health averages and the robot message event stream." />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {[
          { label: 'Avg CPU load', value: fmt(cpu, '%'), icon: Cpu },
          { label: 'Avg memory use', value: fmt(mem, '%'), icon: HardDrive },
          { label: 'Avg temperature', value: fmt(temp, '°C'), icon: Thermometer },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="flex items-center gap-4">
            <span className="neu-inset flex h-11 w-11 items-center justify-center text-action-primary" aria-hidden="true">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="t-label uppercase">{label}</p>
              <p className="t-numeric text-xl text-text-primary">{value}</p>
            </div>
          </Card>
        ))}
      </div>
      {healths.length === 0 && !robots.isError && <p className="text-xs text-text-secondary">No robots have reported health metrics yet.</p>}

      <Card>
        <h2 className="t-section-title mb-4 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-action-primary" aria-hidden="true" /> Robot event stream
        </h2>
        {events.isLoading ? (
          <LoadingSpinner label="Loading events" />
        ) : events.isError ? (
          <ErrorState title="Could not load events" error={events.error} onRetry={() => events.refetch()} />
        ) : (
          <DataTable caption="Robot events" columns={columns} data={(events.data ?? []) as EventRow[]} emptyTitle="No events" emptyDescription="Robot messages will appear here as tasks run." />
        )}
      </Card>
    </div>
  )
}
