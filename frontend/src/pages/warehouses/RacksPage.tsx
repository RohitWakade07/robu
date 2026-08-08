import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit3, Trash2, Zap, Boxes, ExternalLink, RefreshCw } from 'lucide-react'
import { api } from '../../api/client'
import { Card, DataTable, type Column, Button, Modal, Input, Select } from '../../components/ui'

interface RackItem {
  id: string
  code: string
  zone: string
  levels: number
  slots: number
  occupiedSlots: number
  slotScore: number
  assignedSkus: string
  maxWeight: string
  status: string
}

export function RacksPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RackItem | null>(null)

  const [code, setCode] = useState('')
  const [zone, setZone] = useState('Golden Zone')
  const [levels, setLevels] = useState('4')
  const [slots, setSlots] = useState('16')
  const [maxWeight, setMaxWeight] = useState('500 kg')
  const [status, setStatus] = useState('operational')

  const { data: recommendations, isLoading: isRecsLoading } = useQuery({
    queryKey: ['slotting-recommendations'],
    queryFn: api.slotting.recommendations,
  })

  const optimizeMutation = useMutation({
    mutationFn: api.slotting.optimize,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slotting-recommendations'] })
    },
  })

  const analyzeMutation = useMutation({
    mutationFn: api.slotting.analyze,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const [racks, setRacks] = useState<RackItem[]>([
    { id: 'r-1', code: 'RACK-A01', zone: 'Golden Fast-Picking', levels: 4, slots: 16, occupiedSlots: 14, slotScore: 982, assignedSkus: 'SKU-1001, SKU-1004', maxWeight: '500 kg', status: 'operational' },
    { id: 'r-2', code: 'RACK-A02', zone: 'Golden Fast-Picking', levels: 4, slots: 16, occupiedSlots: 12, slotScore: 940, assignedSkus: 'SKU-1002, SKU-1008', maxWeight: '500 kg', status: 'operational' },
    { id: 'r-3', code: 'RACK-B01', zone: 'Cold Storage B', levels: 3, slots: 12, occupiedSlots: 5, slotScore: 810, assignedSkus: 'SKU-1003 (Bio-Cold)', maxWeight: '300 kg', status: 'operational' },
    { id: 'r-4', code: 'RACK-C01', zone: 'Reserve Bulk C', levels: 5, slots: 20, occupiedSlots: 18, slotScore: 765, assignedSkus: 'SKU-1005, SKU-1010', maxWeight: '1000 kg', status: 'operational' },
  ])

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code) return
    const totalS = parseInt(slots, 10) || 16
    const newItem: RackItem = {
      id: `r-${Date.now()}`,
      code,
      zone,
      levels: parseInt(levels, 10) || 4,
      slots: totalS,
      occupiedSlots: 0,
      slotScore: 850,
      assignedSkus: 'Unassigned',
      maxWeight: maxWeight || '500 kg',
      status,
    }
    setRacks((prev) => [...prev, newItem])
    setIsCreateOpen(false)
    resetForm()
  }

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    setRacks((prev) =>
      prev.map((r) =>
        r.id === editingItem.id
          ? {
              ...r,
              code,
              zone,
              levels: parseInt(levels, 10) || r.levels,
              slots: parseInt(slots, 10) || r.slots,
              maxWeight,
              status,
            }
          : r
      )
    )
    setEditingItem(null)
    resetForm()
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete rack configuration?')) return
    setRacks((prev) => prev.filter((r) => r.id !== id))
  }

  const openEdit = (item: RackItem) => {
    setEditingItem(item)
    setCode(item.code)
    setZone(item.zone)
    setLevels(String(item.levels))
    setSlots(String(item.slots))
    setMaxWeight(item.maxWeight)
    setStatus(item.status)
  }

  const resetForm = () => {
    setCode('')
    setZone('Golden Zone')
    setLevels('4')
    setSlots('16')
    setMaxWeight('500 kg')
    setStatus('operational')
  }

  const totalSlotsAll = racks.reduce((sum, r) => sum + r.slots, 0)
  const totalOccupiedAll = racks.reduce((sum, r) => sum + r.occupiedSlots, 0)
  const avgSlotScore = Math.round(racks.reduce((sum, r) => sum + r.slotScore, 0) / (racks.length || 1))

  const columns: Column<Record<string, unknown>>[] = [
    {
      header: 'Rack Code',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-cyan">{String(row.code)}</span>
          {Number(row.slotScore) >= 900 && (
            <span className="text-[10px] bg-action-primary/10 text-action-primary border border-action-primary/30 px-1.5 py-0.5 rounded font-mono font-bold">
              ⚡ High Velocity
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Assigned Zone',
      cell: (row) => <span className="text-xs font-medium text-text-primary">{String(row.zone)}</span>,
    },
    {
      header: 'Levels × Slots',
      cell: (row) => <span className="font-mono text-xs text-text-primary">{Number(row.levels)}L × {Number(row.slots)}S</span>,
    },
    {
      header: 'Capacity Utilization',
      cell: (row) => {
        const occ = Number(row.occupiedSlots || 0)
        const tot = Number(row.slots || 1)
        const pct = Math.round((occ / tot) * 100)
        return (
          <div className="w-36 space-y-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-text-primary">{occ}/{tot}</span>
              <span className="text-cyan font-bold">{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden border border-border-primary">
              <div
                className={`h-full transition-all ${pct > 80 ? 'bg-cyan' : pct > 40 ? 'bg-action-primary' : 'bg-success'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      header: 'Slotting Score',
      cell: (row) => <span className="font-mono text-xs font-bold text-success">{Number(row.slotScore)} / 1000</span>,
    },
    {
      header: 'Assigned SKUs (Optimizer)',
      cell: (row) => <span className="font-mono text-xs text-text-secondary truncate max-w-[160px] block">{String(row.assignedSkus)}</span>,
    },
    {
      header: 'Actions',
      cell: (row) => {
        const item = row as unknown as RackItem
        return (
          <div className="flex items-center gap-2">
            <Link to="/slotting" className="p-1 text-text-secondary hover:text-action-primary transition-colors" title="View in 3D Slotting Canvas">
              <ExternalLink className="h-4 w-4" />
            </Link>
            <button onClick={() => openEdit(item)} className="p-1 text-text-secondary hover:text-cyan transition-colors" title="Edit Rack">
              <Edit3 className="h-4 w-4" />
            </button>
            <button onClick={() => handleDelete(item.id)} className="p-1 text-text-secondary hover:text-error transition-colors" title="Delete Rack">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Racks & Shelves Management</h1>
          <p className="text-xs text-text-secondary">Synced with Spatial A* Slotting Engine & Demand Classification</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/slotting">
            <Button variant="secondary" icon={<Boxes className="h-4 w-4 text-cyan" />}>
              3D Slotting Canvas
            </Button>
          </Link>
          <Button
            variant="secondary"
            icon={<Zap className="h-4 w-4 text-action-primary" />}
            onClick={() => optimizeMutation.mutate()}
            disabled={optimizeMutation.isPending}
          >
            {optimizeMutation.isPending ? 'Optimizing...' : 'Run A* Optimization'}
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => { resetForm(); setIsCreateOpen(true) }}>
            Configure New Rack
          </Button>
        </div>
      </div>

      {/* Slotting Engine Live Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="space-y-1">
          <span className="text-[10px] text-text-secondary uppercase font-mono block">Avg Slotting Score</span>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-cyan">{avgSlotScore} / 1000</span>
            <span className="text-xs font-mono text-success font-semibold">+38% Fast Pick</span>
          </div>
        </Card>

        <Card className="space-y-1">
          <span className="text-[10px] text-text-secondary uppercase font-mono block">Slot Occupancy</span>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-text-primary">{totalOccupiedAll} / {totalSlotsAll}</span>
            <span className="text-xs font-mono text-cyan">{Math.round((totalOccupiedAll / (totalSlotsAll || 1)) * 100)}% Utilized</span>
          </div>
        </Card>

        <Card className="space-y-1">
          <span className="text-[10px] text-text-secondary uppercase font-mono block">Active Recommendations</span>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-action-primary">
              {isRecsLoading ? '...' : (recommendations?.length || 4)} Tasks
            </span>
            <span className="text-xs text-text-secondary">FEFO/FIFO Synced</span>
          </div>
        </Card>

        <Card className="space-y-1">
          <span className="text-[10px] text-text-secondary uppercase font-mono block">Demand Sync Status</span>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-success flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" /> Live Synced
            </span>
            <button
              onClick={() => analyzeMutation.mutate()}
              className="text-[11px] text-cyan hover:underline font-mono"
            >
              Analyze Demand
            </button>
          </div>
        </Card>
      </div>

      <Card>
        <DataTable columns={columns} data={racks as unknown as Record<string, unknown>[]} />
      </Card>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Configure New Rack Structure">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Rack Code" placeholder="e.g. RACK-D01" value={code} onChange={setCode} required />
          <Select
            label="Assigned Zone"
            options={[
              { label: 'Golden Fast-Picking Zone A', value: 'Golden Fast-Picking' },
              { label: 'Cold Storage Zone B', value: 'Cold Storage B' },
              { label: 'Reserve Bulk Storage Zone C', value: 'Reserve Bulk C' },
              { label: 'Hazmat Safe Cage D', value: 'Hazmat Cage D' },
            ]}
            value={zone}
            onChange={setZone}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Vertical Levels" type="number" value={levels} onChange={setLevels} />
            <Input label="Total Slots" type="number" value={slots} onChange={setSlots} />
          </div>
          <Input label="Max Payload Capacity" placeholder="500 kg" value={maxWeight} onChange={setMaxWeight} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} type="button">Cancel</Button>
            <Button type="submit">Save Rack Config</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Rack Structure Configuration">
        <form onSubmit={handleEditSave} className="space-y-4">
          <Input label="Rack Code" value={code} onChange={setCode} required />
          <Select
            label="Assigned Zone"
            options={[
              { label: 'Golden Fast-Picking Zone A', value: 'Golden Fast-Picking' },
              { label: 'Cold Storage Zone B', value: 'Cold Storage B' },
              { label: 'Reserve Bulk Storage Zone C', value: 'Reserve Bulk C' },
              { label: 'Hazmat Safe Cage D', value: 'Hazmat Cage D' },
            ]}
            value={zone}
            onChange={setZone}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Vertical Levels" type="number" value={levels} onChange={setLevels} />
            <Input label="Total Slots" type="number" value={slots} onChange={setSlots} />
          </div>
          <Input label="Max Payload Capacity" value={maxWeight} onChange={setMaxWeight} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setEditingItem(null)} type="button">Cancel</Button>
            <Button type="submit">Update Rack</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
