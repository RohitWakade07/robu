import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { api } from '../../api/client'
import { Card, LoadingSpinner, DataTable, type Column, StatusBadge, Button, Modal, Input, Select } from '../../components/ui'

export function OrdersPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')

  const { data: orders, isLoading } = useQuery({ queryKey: ['orders'], queryFn: api.orders.list })
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: api.products.list })

  const createMutation = useMutation({
    mutationFn: (data: { items: { product_id: string; quantity: number }[]; notes?: string }) =>
      api.orders.create(data.items, data.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setIsModalOpen(false)
      setSelectedProductId('')
      setQuantity('1')
      setNotes('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const targetProduct = selectedProductId || products?.[0]?.id
    if (!targetProduct) return
    createMutation.mutate({
      items: [{ product_id: targetProduct, quantity: parseInt(quantity, 10) || 1 }],
      notes,
    })
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      header: 'Order Number',
      cell: (row) => <span className="font-mono text-xs font-semibold text-cyan">{String(row.order_number)}</span>,
    },
    {
      header: 'Date Created',
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{new Date(String(row.created_at)).toLocaleString()}</span>,
    },
    {
      header: 'Total Value',
      cell: (row) => <span className="font-mono text-xs font-medium text-text-primary">${Number(row.total_amount || 0).toFixed(2)}</span>,
    },
    {
      header: 'Execution Status',
      cell: (row) => <StatusBadge status={String(row.status)} />,
    },
  ]

  if (isLoading) return <LoadingSpinner />

  const productOptions = (products || []).map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Customer Orders Pipeline</h1>
          <p className="text-xs text-text-secondary">Order dispatch status, execution tasks & fulfillment pipeline</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
          Create New Order
        </Button>
      </div>

      <Card>
        <DataTable columns={columns} data={(orders || []) as unknown as Record<string, unknown>[]} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Customer Order">
        <form onSubmit={handleSubmit} className="space-y-4">
          {productOptions.length > 0 ? (
            <Select
              label="Select Product"
              options={productOptions}
              value={selectedProductId || productOptions[0]?.value || ''}
              onChange={setSelectedProductId}
            />
          ) : (
            <p className="text-xs text-warning">No products found. Please add a product SKU first.</p>
          )}
          <Input label="Quantity" type="number" min="1" value={quantity} onChange={setQuantity} required />
          <Input label="Fulfillment Notes" placeholder="e.g. Expedite cross-dock delivery" value={notes} onChange={setNotes} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || !productOptions.length}>
              {createMutation.isPending ? 'Submitting...' : 'Submit Order'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
