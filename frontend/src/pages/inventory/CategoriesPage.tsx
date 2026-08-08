import { Plus } from 'lucide-react'
import { Card, DataTable, type Column, Button } from '../../components/ui'

export function CategoriesPage() {
  const categoriesData = [
    { name: 'Electronics & Components', code: 'CAT-01', items: 42, zone: 'Standard Zone A' },
    { name: 'Cold Storage / Pharmaceuticals', code: 'CAT-02', items: 18, zone: 'Cold Zone B' },
    { name: 'Hazardous Materials', code: 'CAT-03', items: 8, zone: 'Hazmat Cage C' },
    { name: 'Fast Moving Consumer Goods', code: 'CAT-04', items: 124, zone: 'Golden Zone Pick' },
  ]

  const columns: Column<Record<string, unknown>>[] = [
    {
      header: 'Category Code',
      cell: (row) => <span className="font-mono text-xs text-cyan font-semibold">{String(row.code)}</span>,
    },
    {
      header: 'Category Name',
      cell: (row) => <span className="font-medium text-xs text-text-primary">{String(row.name)}</span>,
    },
    {
      header: 'SKUs Tagged',
      cell: (row) => <span className="font-mono text-xs text-text-primary">{Number(row.items)} items</span>,
    },
    {
      header: 'Default Storage Zone',
      cell: (row) => <span className="text-xs text-text-secondary">{String(row.zone)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Product Categories</h1>
          <p className="text-xs text-text-secondary">Inventory classification & zone default mappings</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />}>New Category</Button>
      </div>

      <Card>
        <DataTable columns={columns} data={categoriesData as unknown as Record<string, unknown>[]} />
      </Card>
    </div>
  )
}
