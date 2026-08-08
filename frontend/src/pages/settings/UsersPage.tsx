import { UserPlus } from 'lucide-react'
import { Card, DataTable, type Column, StatusBadge, Button } from '../../components/ui'

export function UsersPage() {
  const usersData = [
    { name: 'Rohit Wakade (Admin)', email: 'admin@nexus.com', role: 'administrator', status: 'active', lastLogin: 'Today at 10:45 AM' },
    { name: 'Warehouse Operator', email: 'operator@nexus.com', role: 'warehouse_operator', status: 'active', lastLogin: 'Yesterday' },
    { name: 'Customer User', email: 'customer@nexus.com', role: 'customer', status: 'active', lastLogin: '3 days ago' },
  ]

  const columns: Column<Record<string, unknown>>[] = [
    {
      header: 'User Full Name',
      cell: (row) => <span className="font-semibold text-xs text-text-primary">{String(row.name)}</span>,
    },
    {
      header: 'Email Address',
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{String(row.email)}</span>,
    },
    {
      header: 'Role Permission Level',
      cell: (row) => <StatusBadge status={String(row.role)} />,
    },
    {
      header: 'Last Session Login',
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{String(row.lastLogin)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">User & Role Permission Management</h1>
          <p className="text-xs text-text-secondary">Manage platform access, operator roles & security policies</p>
        </div>
        <Button icon={<UserPlus className="h-4 w-4" />}>Provision New User</Button>
      </div>

      <Card>
        <DataTable columns={columns} data={usersData as unknown as Record<string, unknown>[]} />
      </Card>
    </div>
  )
}
