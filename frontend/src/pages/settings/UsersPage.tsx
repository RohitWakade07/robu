import { Card, DataTable, StatusBadge, PageHeader, Notice, type Column } from '../../components/ui'
import { useAuthStore } from '../../stores/authStore'
import type { User } from '../../types'

type Row = User & Record<string, unknown>

export function UsersPage() {
  const user = useAuthStore((s) => s.user)

  const columns: Column<Row>[] = [
    { header: 'Name', accessorKey: 'full_name', sortable: true, cell: (r) => <span className="font-semibold text-text-primary">{r.full_name}</span> },
    { header: 'Email', accessorKey: 'email', sortable: true, cell: (r) => <span className="font-mono text-xs text-text-secondary">{r.email}</span> },
    { header: 'Role', cell: (r) => <StatusBadge status={r.role} /> },
    { header: 'Account', cell: (r) => <StatusBadge status={r.is_active ? 'active' : 'offline'} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" description="Platform accounts and role permissions." />
      <Notice tone="info" title="Only your own account is listed">
        The API provides <code className="font-mono">/auth/me</code> and <code className="font-mono">/auth/register</code> but no endpoint to list, edit or deactivate users, so
        organization-wide user management needs a backend addition.
      </Notice>
      <Card>
        <DataTable caption="Users" columns={columns} data={user ? [user as Row] : []} emptyTitle="No session user" />
      </Card>
    </div>
  )
}
