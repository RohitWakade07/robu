import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { api } from '../../api/client'
import { Card, LoadingSpinner, DataTable, type Column, Button, Modal, Input } from '../../components/ui'

export function ProductsPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [weight, setWeight] = useState('')

  const { data: products, isLoading } = useQuery({ queryKey: ['products'], queryFn: api.products.list })

  const createMutation = useMutation({
    mutationFn: api.products.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsModalOpen(false)
      setName('')
      setSku('')
      setPrice('')
      setWeight('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !sku) return
    createMutation.mutate({
      name,
      sku,
      unit_price: parseFloat(price) || 0,
      weight_kg: parseFloat(weight) || 1.0,
    })
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      header: 'SKU',
      cell: (row) => <span className="font-mono text-xs font-semibold text-cyan">{String(row.sku)}</span>,
    },
    {
      header: 'Product Title',
      cell: (row) => <span className="font-medium text-xs text-text-primary">{String(row.name)}</span>,
    },
    {
      header: 'Price',
      cell: (row) => <span className="font-mono text-xs text-text-primary">${Number(row.unit_price || 0).toFixed(2)}</span>,
    },
    {
      header: 'Weight',
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{Number(row.weight_kg || 1.2).toFixed(2)} kg</span>,
    },
    {
      header: 'Dimensions (H×W×D)',
      cell: () => <span className="font-mono text-xs text-text-secondary">25×15×10 cm</span>,
    },
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-page-title">Product Catalog</h1>
          <p className="text-xs text-text-secondary">Master product SKU definitions, weights & dimensions</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
          Add New SKU
        </Button>
      </div>

      <Card>
        <DataTable columns={columns} data={(products || []) as unknown as Record<string, unknown>[]} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Product SKU">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="SKU Code" placeholder="e.g. SKU-1004" value={sku} onChange={setSku} required />
          <Input label="Product Name" placeholder="e.g. Industrial Conveyor Belt Roller" value={name} onChange={setName} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Unit Price ($)" type="number" step="0.01" placeholder="199.99" value={price} onChange={setPrice} />
            <Input label="Weight (kg)" type="number" step="0.1" placeholder="2.5" value={weight} onChange={setWeight} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
