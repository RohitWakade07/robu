import { Server, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import { Card, PageHeader, Notice } from '../../components/ui'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="break-all font-mono text-xs font-semibold text-text-primary">{value}</dd>
    </div>
  )
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const health = useQuery({ queryKey: ['robot-comm-health'], queryFn: api.robotCommunication.health, retry: false })

  return (
    <div className="space-y-6">
      <PageHeader title="System Settings" description="Runtime configuration this console is connected to." />
      <Notice tone="info" title="Read-only">
        The backend exposes no settings API, so configuration cannot be edited from the console. Values below are read from the running system.
      </Notice>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <h2 className="t-section-title mb-4 flex items-center gap-2">
            <Server className="h-4 w-4 text-action-primary" aria-hidden="true" /> Robot bridge
          </h2>
          <dl className="space-y-3 text-sm">
            <Row label="Bridge status" value={health.isLoading ? 'Checking…' : health.isError ? 'Unreachable' : health.data?.status ?? 'unknown'} />
            <Row label="ROS 2 initialized" value={health.data ? String(health.data.ros_initialized) : '—'} />
            <Row label="Active robots" value={health.data ? String(health.data.active_robots) : '—'} />
            <Row label="Pending tasks" value={health.data ? String(health.data.pending_tasks) : '—'} />
          </dl>
        </Card>

        <Card>
          <h2 className="t-section-title mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-action-primary" aria-hidden="true" /> Signed-in account
          </h2>
          <dl className="space-y-3 text-sm">
            <Row label="Name" value={user?.full_name ?? '—'} />
            <Row label="Email" value={user?.email ?? '—'} />
            <Row label="Role" value={user?.role ?? '—'} />
          </dl>
        </Card>
      </div>
    </div>
  )
}
