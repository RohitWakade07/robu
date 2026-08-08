import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Trash2, Package } from 'lucide-react'
import { api } from '../../api/client'
import { Button, Input, LoadingSpinner, EmptyState, StatusBadge } from '../../components/ui'

interface ShipmentItemDraft {
  expected_quantity: number
  crate_label: string
  aruco_marker_id?: number
}

export function WarehouseShipmentsPage() {
  const { data: shipments, isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: api.shipments.list,
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">Incoming Shipments</h1>
      <p className="text-sm text-text-secondary mb-8">Monitor robot processing of registered shipments</p>

      {!shipments?.length ? (
        <EmptyState title="No shipments registered" description="Create a new shipment to begin intake processing." />
      ) : (
        <div className="space-y-3">
          {shipments.map((shipment) => (
            <motion.div
              key={shipment.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel rounded-xl p-5 border border-border-primary"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-mono text-sm text-cyan">{shipment.shipment_number}</span>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {new Date(shipment.created_at).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={shipment.status} />
              </div>
              <div className="flex items-center gap-4 text-sm text-text-secondary">
                <span>{shipment.items.length} crate(s)</span>
                {shipment.task_id && (
                  <span className="font-mono text-xs">Task: {shipment.task_id.slice(0, 8)}...</span>
                )}
              </div>
              <div className="mt-3 space-y-1">
                {shipment.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs text-text-secondary">
                    <Package className="h-3 w-3" />
                    {item.crate_label || 'Unlabeled crate'} — qty: {item.expected_quantity}
                    {item.aruco_marker_id && <span className="font-mono">ArUco: {item.aruco_marker_id}</span>}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export function NewShipmentPage() {
  const [items, setItems] = useState<ShipmentItemDraft[]>([
    { expected_quantity: 1, crate_label: '' },
  ])
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      api.shipments.create({
        items: items.map((item) => ({
          expected_quantity: item.expected_quantity,
          crate_label: item.crate_label || undefined,
          aruco_marker_id: item.aruco_marker_id,
        })),
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      setItems([{ expected_quantity: 1, crate_label: '' }])
      setNotes('')
    },
  })

  const addItem = () => setItems([...items, { expected_quantity: 1, crate_label: '' }])
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))
  const updateItem = (index: number, field: keyof ShipmentItemDraft, value: string | number) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Register Shipment</h1>
      <p className="text-sm text-text-secondary mb-8">
        Register incoming crates for autonomous robot processing and storage
      </p>

      <div className="glass-panel rounded-xl p-6 space-y-6 border border-border-primary">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-primary">Crates</h3>
          {items.map((item, index) => (
            <div key={index} className="flex gap-3 items-end">
              <div className="flex-1">
                <Input
                  label={index === 0 ? 'Crate Label' : undefined}
                  value={item.crate_label}
                  onChange={(v) => updateItem(index, 'crate_label', v)}
                  placeholder="Crate identifier"
                />
              </div>
              <div className="w-24">
                <Input
                  label={index === 0 ? 'Qty' : undefined}
                  type="number"
                  value={String(item.expected_quantity)}
                  onChange={(v) => updateItem(index, 'expected_quantity', parseInt(v) || 1)}
                />
              </div>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(index)}
                  className="p-2.5 text-text-secondary hover:text-error transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <Button variant="ghost" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Add Crate
          </Button>
        </div>

        <Input label="Notes" value={notes} onChange={setNotes} placeholder="Optional shipment notes" />

        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || items.every((i) => !i.crate_label)}
          className="w-full"
        >
          {mutation.isPending ? 'Submitting...' : 'Submit for Robot Processing'}
        </Button>

        {mutation.isSuccess && (
          <p className="text-sm text-success text-center">
            Shipment registered. Robot storage task queued.
          </p>
        )}
        {mutation.isError && (
          <p className="text-sm text-error text-center">
            {mutation.error instanceof Error ? mutation.error.message : 'Failed to create shipment'}
          </p>
        )}
      </div>
    </div>
  )
}
