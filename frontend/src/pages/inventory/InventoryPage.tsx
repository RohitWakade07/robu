import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { api } from '../../api/client'
import { Card, LoadingSpinner, DataTable, type Column, StatusBadge, Input, Select } from '../../components/ui'

export function InventoryPage() {
  const [search, setSearch] = useState('')
  const [abcFilter, setAbcFilter] = useState('ALL')

  const { data: products, isLoading } = useQuery({ queryKey: ['products'], queryFn: api.products.list })

  const filtered = (products || []).filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    const matchesAbc = abcFilter === 'ALL' || (p.abc_class || 'A') === abcFilter
    return matchesSearch && matchesAbc
  })

  const columns: Column<Record<string, unknown>>[] = [
    {
      header: 'SKU',
      cell: (row) => <span className="font-mono text-xs font-semibold text-cyan">{String(row.sku)}</span>,
    },
    {
      header: 'Product Name',
      cell: (row) => <span className="font-medium text-xs text-text-primary">{String(row.name)}</span>,
    },
    {
      header: 'Unit Price',
      cell: (row) => <span className="font-mono text-xs text-text-primary">${Number(row.unit_price || 0).toFixed(2)}</span>,
    },
    {
      header: 'Weight (kg)',
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{Number(row.weight_kg || 0).toFixed(2)} kg</span>,
    },
    {
      header: 'ABC Class',
      cell: (row) => <StatusBadge status={String(row.abc_class || 'A')} />,
    },
    {
      header: 'XYZ Predictability',
      cell: (row) => <StatusBadge status={String(row.xyz_class || 'X')} />,
    },
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Warehouse Stock Inventory</h1>
        <p className="text-xs text-text-secondary">Synchronized inventory counts, rack assignments & demand classifications</p>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-4">
          <Input
            placeholder="Search by SKU or Product Name..."
            value={search}
            onChange={setSearch}
            icon={<Search className="h-4 w-4 text-text-secondary" />}
            className="w-full sm:w-72"
          />

          <div className="flex gap-2">
            <Select
              value={abcFilter}
              onChange={setAbcFilter}
              options={[
                { label: 'All ABC Classes', value: 'ALL' },
                { label: 'Class A (Top 80% Revenue)', value: 'A' },
                { label: 'Class B (Next 15%)', value: 'B' },
                { label: 'Class C (Bottom 5%)', value: 'C' },
              ]}
              className="w-48"
            />
          </div>
        </div>

        <DataTable columns={columns} data={filtered as unknown as Record<string, unknown>[]} />
      </Card>
    </div>
  )
}
