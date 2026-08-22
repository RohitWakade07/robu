import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Warehouse, MapPin, Edit3, Trash2, Layers, Grid, Map as MapIcon } from 'lucide-react'
import { Card, StatusBadge, Button, Modal, Input, Select } from '../../components/ui'

interface WarehouseItem {
  id: string
  name: string
  code: string
  location: string
  capacity: string
  racks: number
  robots: number
  status: string
}

export function WarehousesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [location, setLocation] = useState('')
  const [racks, setRacks] = useState('60')
  const [status, setStatus] = useState('operational')

  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([
    { id: 'wh-1', name: 'ARMS Central Fulfillment Hub #1', code: 'WH-01', location: 'Main Industrial Zone', capacity: '84% Occupied', racks: 120, robots: 4, status: 'operational' },
    { id: 'wh-2', name: 'ARMS Cold Storage & Bio Facility #2', code: 'WH-02', location: 'North Logistics Park', capacity: '42% Occupied', racks: 45, robots: 2, status: 'operational' },
  ])

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !code) return
    const newItem: WarehouseItem = {
      id: `wh-${Date.now()}`,
      name,
      code,
      location: location || 'Regional Logistics Park',
      capacity: '0% Occupied',
      racks: parseInt(racks, 10) || 0,
      robots: 0,
      status,
    }
    setWarehouses((prev) => [...prev, newItem])
    setIsCreateOpen(false)
    resetForm()
  }

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    setWarehouses((prev) =>
      prev.map((wh) =>
        wh.id === editingItem.id
          ? {
              ...wh,
              name,
              code,
              location,
              racks: parseInt(racks, 10) || wh.racks,
              status,
            }
          : wh
      )
    )
    setEditingItem(null)
    resetForm()
  }

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this facility?')) return
    setWarehouses((prev) => prev.filter((w) => w.id !== id))
  }

  const openEdit = (wh: WarehouseItem) => {
    setEditingItem(wh)
    setName(wh.name)
    setCode(wh.code)
    setLocation(wh.location)
    setRacks(String(wh.racks))
    setStatus(wh.status)
  }

  const resetForm = () => {
    setName('')
    setCode('')
    setLocation('')
    setRacks('60')
    setStatus('operational')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Facility Management</h1>
          <p className="text-xs text-text-secondary">Physical warehouse sites, spatial layout models & capacity metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/racks">
            <Button variant="secondary" icon={<Grid className="h-4 w-4" />}>
              Racks & Shelves
            </Button>
          </Link>
          <Link to="/warehouse-map">
            <Button variant="secondary" icon={<MapIcon className="h-4 w-4" />}>
              2D SLAM Map
            </Button>
          </Link>
          <Button icon={<Warehouse className="h-4 w-4" />} onClick={() => { resetForm(); setIsCreateOpen(true) }}>
            Add Facility Site
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {warehouses.map((wh) => (
          <Card key={wh.id} className="space-y-4 relative group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-cyan/10 text-cyan border border-cyan/30">
                  <Warehouse className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{wh.name}</h3>
                    <span className="font-mono text-[10px] text-cyan px-1.5 py-0.5 rounded bg-cyan/10 border border-cyan/30 font-bold">{wh.code}</span>
                  </div>
                  <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {wh.location}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={wh.status} />
                <button onClick={() => openEdit(wh)} className="p-1 text-text-secondary hover:text-cyan transition-colors" title="Edit Facility">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(wh.id)} className="p-1 text-text-secondary hover:text-error transition-colors" title="Delete Facility">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-bg-secondary border border-border-primary">
                <span className="text-[10px] text-text-secondary uppercase font-mono block">Occupancy</span>
                <span className="font-semibold font-mono text-cyan">{wh.capacity}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-bg-secondary border border-border-primary">
                <span className="text-[10px] text-text-secondary uppercase font-mono block">Storage Racks</span>
                <span className="font-semibold font-mono text-text-primary">{wh.racks} Racks</span>
              </div>
              <div className="p-2.5 rounded-lg bg-bg-secondary border border-border-primary">
                <span className="text-[10px] text-text-secondary uppercase font-mono block">AMR Robots</span>
                <span className="font-semibold font-mono text-text-primary">{wh.robots} Active</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border-primary text-xs">
              <span className="text-text-secondary text-[11px]">Quick Module Links:</span>
              <div className="flex items-center gap-3">
                <Link to="/racks" className="text-cyan hover:underline flex items-center gap-1 text-xs font-medium">
                  <Grid className="h-3.5 w-3.5" /> Racks ({wh.racks})
                </Link>
                <Link to="/zones" className="text-cyan hover:underline flex items-center gap-1 text-xs font-medium">
                  <Layers className="h-3.5 w-3.5" /> Zones
                </Link>
                <Link to="/warehouse-map" className="text-cyan hover:underline flex items-center gap-1 text-xs font-medium">
                  <MapIcon className="h-3.5 w-3.5" /> Map Canvas
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add New Facility Site">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Facility Code" placeholder="e.g. WH-03" value={code} onChange={setCode} required />
          <Input label="Facility Name" placeholder="e.g. ARMS Automated Logistics Hub #3" value={name} onChange={setName} required />
          <Input label="Location Address" placeholder="e.g. South Tech Logistics Park" value={location} onChange={setLocation} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Storage Racks (Auto-Identified from Map)" type="number" value={racks} onChange={setRacks} />
            <Select
              label="Operational Status"
              options={[
                { label: 'Operational', value: 'operational' },
                { label: 'Maintenance', value: 'maintenance' },
                { label: 'Expanding', value: 'expanding' },
              ]}
              value={status}
              onChange={setStatus}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} type="button">Cancel</Button>
            <Button type="submit">Create Facility</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Facility Site Details">
        <form onSubmit={handleEditSave} className="space-y-4">
          <Input label="Facility Code" value={code} onChange={setCode} required />
          <Input label="Facility Name" value={name} onChange={setName} required />
          <Input label="Location Address" value={location} onChange={setLocation} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Storage Racks Count" type="number" value={racks} onChange={setRacks} />
            <Select
              label="Operational Status"
              options={[
                { label: 'Operational', value: 'operational' },
                { label: 'Maintenance', value: 'maintenance' },
                { label: 'Expanding', value: 'expanding' },
              ]}
              value={status}
              onChange={setStatus}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setEditingItem(null)} type="button">Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
