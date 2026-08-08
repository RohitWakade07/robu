import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Map, Upload, CheckCircle2 } from 'lucide-react'
import { api } from '../../api/client'
import { Card, LoadingSpinner, Button, Modal, Input } from '../../components/ui'

export function WarehouseMapPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [resolution, setResolution] = useState('0.05')
  const [width, setWidth] = useState('800')
  const [height, setHeight] = useState('600')

  const { data: mapData, isLoading } = useQuery({ queryKey: ['map', 'current'], queryFn: api.map.getCurrent })

  const uploadMutation = useMutation({
    mutationFn: api.map.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map'] })
      setIsModalOpen(false)
      setLabel('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!label) return
    uploadMutation.mutate({
      label,
      pgm_data: 'P5 800 600 255 ...',
      resolution: parseFloat(resolution) || 0.05,
      origin_x: 0.0,
      origin_y: 0.0,
      width_px: parseInt(width, 10) || 800,
      height_px: parseInt(height, 10) || 600,
    })
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Spatial SLAM Warehouse Map</h1>
          <p className="text-xs text-text-secondary">2D occupancy grid maps ingested from ROS2 Cartographer / SLAM</p>
        </div>
        <Button icon={<Upload className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
          Upload PGM Map
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Map className="h-4 w-4 text-cyan" />
              Active Map Canvas: {mapData?.label || 'Warehouse Main Layout'}
            </h3>
            {mapData && (
              <span className="text-xs font-mono text-cyan flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Active Synced
              </span>
            )}
          </div>

          <div className="h-96 bg-[#020617] rounded-xl border border-border-primary flex items-center justify-center p-4 relative overflow-hidden grid-bg">
            <div className="text-center space-y-2">
              <Map className="h-12 w-12 text-cyan opacity-40 mx-auto animate-pulse" />
              <p className="text-xs font-mono text-text-secondary">
                Map Label: {mapData?.label || 'Warehouse Grid Model'}
              </p>
              <p className="text-xs font-mono text-cyan">
                Dimensions: {mapData?.width_px || 800}px × {mapData?.height_px || 600}px ({mapData?.resolution || 0.05} m/px)
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Map Metadata & Metrics</h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-bg-secondary border border-border-primary space-y-1">
              <span className="text-text-secondary text-[10px] uppercase font-mono block">Origin Coordinates</span>
              <span className="font-mono text-cyan">
                X: {mapData?.origin_x || 0.0}m | Y: {mapData?.origin_y || 0.0}m
              </span>
            </div>

            <div className="p-3 rounded-lg bg-bg-secondary border border-border-primary space-y-1">
              <span className="text-text-secondary text-[10px] uppercase font-mono block">Zones Synchronization</span>
              <span className="font-mono text-success">Auto-Synced from SLAM</span>
            </div>

            <div className="p-3 rounded-lg bg-bg-secondary border border-border-primary space-y-1">
              <span className="text-text-secondary text-[10px] uppercase font-mono block">Robot Path Constraints</span>
              <span className="font-mono text-text-primary">No-Go Zones Configured</span>
            </div>
          </div>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload ROS2 Occupancy Grid Map (.PGM)">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Map Label / Name" placeholder="e.g. Facility-A-Floor-1 SLAM Model" value={label} onChange={setLabel} required />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Resolution (m/px)" type="number" step="0.01" value={resolution} onChange={setResolution} required />
            <Input label="Width (px)" type="number" value={width} onChange={setWidth} required />
            <Input label="Height (px)" type="number" value={height} onChange={setHeight} required />
          </div>
          <div className="p-4 border-2 border-dashed border-border-primary rounded-xl text-center cursor-pointer hover:border-action-primary transition-colors">
            <Upload className="h-6 w-6 text-action-primary mx-auto mb-2" />
            <p className="text-xs font-semibold text-text-primary">Click or drop .PGM/.YAML map payload file</p>
            <p className="text-[10px] text-text-secondary">Cartographer 2D grid export supported</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading...' : 'Ingest Map'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
