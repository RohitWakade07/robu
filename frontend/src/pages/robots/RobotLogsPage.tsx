import { useQuery } from '@tanstack/react-query'
import { Terminal, Cpu, HardDrive, Thermometer } from 'lucide-react'
import { api } from '../../api/client'
import { Card, LoadingSpinner, DataTable, type Column } from '../../components/ui'

export function RobotLogsPage() {
  const { isLoading } = useQuery({ queryKey: ['robots'], queryFn: api.robots.list })

  const logData = [
    { timestamp: '10:45:12', robot: 'Alpha-1', level: 'INFO', module: 'odom', message: 'Odometry update: X=2.45m Y=1.12m Theta=0.45rad' },
    { timestamp: '10:44:50', robot: 'Beta-2', level: 'WARN', module: 'battery', message: 'Battery level reached 45%. Auto-charge schedule ready.' },
    { timestamp: '10:42:05', robot: 'Alpha-1', level: 'INFO', module: 'navigation', message: 'A* Path generated: 4 nodes, total distance 14.2m' },
    { timestamp: '10:38:19', robot: 'Beta-2', level: 'INFO', module: 'aruco', message: 'ArUco Marker #12 detected at Shelf A-02' },
  ]

  const columns: Column<Record<string, unknown>>[] = [
    {
      header: 'Time',
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{String(row.timestamp)}</span>,
    },
    {
      header: 'Robot',
      cell: (row) => <span className="font-semibold text-xs text-cyan">{String(row.robot)}</span>,
    },
    {
      header: 'Level',
      cell: (row) => (
        <span
          className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
            row.level === 'WARN' ? 'bg-amber/10 text-amber' : 'bg-cyan/10 text-cyan'
          }`}
        >
          {String(row.level)}
        </span>
      ),
    },
    {
      header: 'Module',
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{String(row.module)}</span>,
    },
    {
      header: 'Telemetry Log Message',
      cell: (row) => <span className="font-mono text-xs text-text-primary">{String(row.message)}</span>,
    },
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Robot Hardware Telemetry & Logs</h1>
        <p className="text-xs text-text-secondary">Low-level CPU, Memory, Temperature metrics & ROS2 node logging stream</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex items-center gap-3">
          <Cpu className="h-5 w-5 text-cyan" />
          <div>
            <p className="text-[10px] uppercase font-mono text-text-secondary">Avg CPU Load</p>
            <p className="text-base font-bold font-mono text-text-primary">14.2%</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <HardDrive className="h-5 w-5 text-cyan" />
          <div>
            <p className="text-[10px] uppercase font-mono text-text-secondary">RAM Consumption</p>
            <p className="text-base font-bold font-mono text-text-primary">512 MB / 2 GB</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <Thermometer className="h-5 w-5 text-success" />
          <div>
            <p className="text-[10px] uppercase font-mono text-text-secondary">Core Temperature</p>
            <p className="text-base font-bold font-mono text-success">38.5°C</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Terminal className="h-4 w-4 text-cyan" />
            Live ROS2 Node Telemetry Log
          </h3>
        </div>
        <DataTable columns={columns} data={logData as unknown as Record<string, unknown>[]} />
      </Card>
    </div>
  )
}
