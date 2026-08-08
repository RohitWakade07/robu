import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit3, Trash2, Warehouse, Grid, Map } from 'lucide-react'
import { Card, DataTable, type Column, Button, StatusBadge, Modal, Input, Select } from '../../components/ui'

interface ZoneItem {
  id: string
  name: string
  type: string
  priority: string
  racks: number
  temp: string
}

export function ZonesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ZoneItem | null>(null)

  const [name, setName] = useState('')
  const [type, setType] = useState('Fast Picking')
  const [priority, setPriority] = useState('Highest')
  const [racks, setRacks] = useState('15')
  const [temp, setTemp] = useState('Ambient (20°C)')

  const [zones, setZones] = useState<ZoneItem[]>([
    { id: 'z-1', name: 'Golden Fast-Picking Zone A', type: 'Fast Picking', priority: 'Highest', racks: 30, temp: 'Ambient (20°C)' },
    { id: 'z-2', name: 'Cold Storage Zone B', type: 'Cold Storage', priority: 'High', racks: 15, temp: 'Frozen (-18°C)' },
    { id: 'z-3', name: 'Hazmat Safe Cage C', type: 'Hazardous', priority: 'High', racks: 8, temp: 'Ventilated' },
    { id: 'z-4', name: 'Reserve Storage Zone D', type: 'Reserve Bulk', priority: 'Standard', racks: 67, temp: 'Ambient (20°C)' },
  ])

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    const newItem: ZoneItem = {
      id: `z-${Date.now()}`,
      name,
      type,
      priority,
      racks: parseInt(racks, 10) || 0,
      temp: temp || 'Ambient (20°C)',
    }
    setZones((prev) => [...prev, newItem])
    setIsCreateOpen(false)
    resetForm()
  }

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    setZones((prev) =>
      prev.map((z) =>
        z.id === editingItem.id
          ? {
              ...z,
              name,
              type,
              priority,
              racks: parseInt(racks, 10) || z.racks,
              temp,
            }
          : z
      )
    )
    setEditingItem(null)
    resetForm()
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete storage zone configuration?')) return
    setZones((prev) => prev.filter((z) => z.id !== id))
  }

  const openEdit = (item: ZoneItem) => {
    setEditingItem(item)
    setName(item.name)
    setType(item.type)
    setPriority(item.priority)
    setRacks(String(item.racks))
    setTemp(item.temp)
  }

  const resetForm = () => {
    setName('')
    setType('Fast Picking')
    setPriority('Highest')
    setRacks('15')
    setTemp('Ambient (20°C)')
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      header: 'Zone Name',
      cell: (row) => <span className="font-semibold text-xs text-text-primary">{String(row.name)}</span>,
    },
    {
      header: 'Zone Type',
      cell: (row) => <StatusBadge status={String(row.type)} />,
    },
    {
      header: 'Dispatch Priority',
      cell: (row) => <span className="font-mono text-xs text-cyan font-medium">{String(row.priority)}</span>,
    },
    {
      header: 'Rack Count',
      cell: (row) => <span className="font-mono text-xs text-text-primary">{Number(row.racks)} Racks</span>,
    },
    {
      header: 'Environmental Specs',
      cell: (row) => <span className="text-xs text-text-secondary">{String(row.temp)}</span>,
    },
    {
      header: 'Actions',
      cell: (row) => {
        const item = row as unknown as ZoneItem
        return (
          <div className="flex items-center gap-2">
            <button onClick={() => openEdit(item)} className="p-1 text-text-secondary hover:text-cyan transition-colors" title="Edit Zone">
              <Edit3 className="h-4 w-4" />
            </button>
            <button onClick={() => handleDelete(item.id)} className="p-1 text-text-secondary hover:text-error transition-colors" title="Delete Zone">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Warehouse Storage Zones</h1>
          <p className="text-xs text-text-secondary">Environmental, security & priority zoning parameters</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/warehouses">
            <Button variant="secondary" icon={<Warehouse className="h-4 w-4" />}>
              Facilities
            </Button>
          </Link>
          <Link to="/racks">
            <Button variant="secondary" icon={<Grid className="h-4 w-4" />}>
              Racks
            </Button>
          </Link>
          <Link to="/warehouse-map">
            <Button variant="secondary" icon={<Map className="h-4 w-4" />}>
              2D SLAM Map
            </Button>
          </Link>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => { resetForm(); setIsCreateOpen(true) }}>
            Create Storage Zone
          </Button>
        </div>
      </div>

      <Card>
        <DataTable columns={columns} data={zones as unknown as Record<string, unknown>[]} />
      </Card>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Storage Zone">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Zone Name" placeholder="e.g. Cold Storage Zone E" value={name} onChange={setName} required />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Zone Classification"
              options={[
                { label: 'Fast Picking (Golden)', value: 'Fast Picking' },
                { label: 'Cold Storage (-18°C)', value: 'Cold Storage' },
                { label: 'Hazardous Cage', value: 'Hazardous' },
                { label: 'Reserve Bulk', value: 'Reserve Bulk' },
              ]}
              value={type}
              onChange={setType}
            />
            <Select
              label="Priority Level"
              options={[
                { label: 'Highest Priority', value: 'Highest' },
                { label: 'High Priority', value: 'High' },
                { label: 'Standard Priority', value: 'Standard' },
              ]}
              value={priority}
              onChange={setPriority}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Allocated Racks" type="number" value={racks} onChange={setRacks} />
            <Input label="Environmental Specs" placeholder="e.g. Ambient (20°C)" value={temp} onChange={setTemp} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} type="button">Cancel</Button>
            <Button type="submit">Save Zone</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Storage Zone Profile">
        <form onSubmit={handleEditSave} className="space-y-4">
          <Input label="Zone Name" value={name} onChange={setName} required />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Zone Classification"
              options={[
                { label: 'Fast Picking (Golden)', value: 'Fast Picking' },
                { label: 'Cold Storage (-18°C)', value: 'Cold Storage' },
                { label: 'Hazardous Cage', value: 'Hazardous' },
                { label: 'Reserve Bulk', value: 'Reserve Bulk' },
              ]}
              value={type}
              onChange={setType}
            />
            <Select
              label="Priority Level"
              options={[
                { label: 'Highest Priority', value: 'Highest' },
                { label: 'High Priority', value: 'High' },
                { label: 'Standard Priority', value: 'Standard' },
              ]}
              value={priority}
              onChange={setPriority}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Allocated Racks" type="number" value={racks} onChange={setRacks} />
            <Input label="Environmental Specs" value={temp} onChange={setTemp} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setEditingItem(null)} type="button">Cancel</Button>
            <Button type="submit">Update Zone</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
