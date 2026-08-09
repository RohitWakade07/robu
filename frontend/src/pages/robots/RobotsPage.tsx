import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, Camera, Video, Radio, Edit3, Trash2, Globe } from 'lucide-react'
import { api } from '../../api/client'
import { Card, StatusBadge, LoadingSpinner, EmptyState, Button, Modal, Input } from '../../components/ui'
import type { Robot } from '../../types'

export function RobotsPage() {
  const queryClient = useQueryClient()
  
  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [editingRobot, setEditingRobot] = useState<Robot | null>(null)
  const [deletingRobot, setDeletingRobot] = useState<Robot | null>(null)

  // Register Form
  const [name, setName] = useState('')
  const [model, setModel] = useState('AMR-V2')
  const [serialNumber, setSerialNumber] = useState('')
  const [ipAddress, setIpAddress] = useState('192.168.1.12')

  // Edit Form
  const [editName, setEditName] = useState('')
  const [editModel, setEditModel] = useState('')
  const [editSerial, setEditSerial] = useState('')
  const [editIp, setEditIp] = useState('')

  const [isCameraActive, setIsCameraActive] = useState(true)

  const { data: robots, isLoading } = useQuery({
    queryKey: ['robots'],
    queryFn: api.robots.list,
  })

  // Mutations
  const registerMutation = useMutation({
    mutationFn: api.robots.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['robots'] })
      setIsRegisterOpen(false)
      setName('')
      setSerialNumber('')
      setIpAddress('192.168.1.12')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Robot> }) => api.robots.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['robots'] })
      setEditingRobot(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.robots.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['robots'] })
      setDeletingRobot(null)
    },
  })

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !serialNumber) return
    registerMutation.mutate({ name, model, serial_number: serialNumber, ip_address: ipAddress })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRobot) return
    updateMutation.mutate({
      id: editingRobot.id,
      data: {
        name: editName,
        model: editModel,
        serial_number: editSerial,
        ip_address: editIp,
      },
    })
  }

  const openEditModal = (robot: Robot) => {
    setEditingRobot(robot)
    setEditName(robot.name)
    setEditModel(robot.model)
    setEditSerial(robot.serial_number)
    setEditIp(robot.ip_address || '192.168.1.12')
  }

  if (isLoading) return <LoadingSpinner />

  const activeRobot = robots && robots.length > 0 ? robots[0] : null
  const currentIp = activeRobot?.ip_address || '192.168.1.12'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Autonomous Robot Fleet</h1>
          <p className="text-xs text-text-secondary">Monitor, manage and configure autonomous mobile robots (AMRs)</p>
        </div>
        <Button variant="secondary" icon={<Bot className="h-4 w-4" />} onClick={() => setIsRegisterOpen(true)}>
          Register AMR Robot
        </Button>
      </div>

      {/* Live Camera Stream Viewer Card */}
      <Card className="p-4 border border-cyan/30 bg-bg-surface/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-cyan" />
            <h3 className="text-sm font-bold text-text-primary">Live AMR Camera Feed ({currentIp}:8005)</h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-success/10 text-success border border-success/30">
              <Radio className="h-3 w-3 animate-pulse" /> LIVE STREAM
            </span>
          </div>
          <Button
            variant="outline"
            className="text-xs py-1"
            onClick={() => setIsCameraActive(!isCameraActive)}
          >
            <Camera className="h-3.5 w-3.5 mr-1" />
            {isCameraActive ? 'Pause Stream' : 'Resume Stream'}
          </Button>
        </div>

        <div className="relative aspect-video max-h-[380px] w-full overflow-hidden rounded-lg bg-black border border-border-primary flex items-center justify-center">
          {isCameraActive ? (
            <img
              src="http://localhost:8000/api/v1/robot-communication/video_feed"
              alt="AMR Live ROS 2 Camera Stream"
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
                const fallback = (e.target as HTMLImageElement).nextElementSibling
                if (fallback) fallback.classList.remove('hidden')
              }}
            />
          ) : null}

          <div className={`text-center space-y-2 p-6 ${isCameraActive ? 'hidden' : ''}`}>
            <Camera className="h-10 w-10 text-text-secondary mx-auto animate-pulse" />
            <p className="text-xs font-mono text-text-secondary">
              {isCameraActive ? `Waiting for camera frame stream from ${currentIp}:8005...` : 'Camera feed paused by operator.'}
            </p>
            <p className="text-[10px] text-text-secondary font-mono">
              ROS Topic: /camera/image_raw (sensor_msgs/Image)
            </p>
          </div>
        </div>
      </Card>

      {!robots?.length ? (
        <EmptyState title="No Robots in Fleet" description="Register robots to begin autonomous operations." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {robots.map((robot) => (
            <Card key={robot.id} className="space-y-4 relative group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-action-primary/10 border border-action-primary/30 flex items-center justify-center text-action-primary">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{robot.name}</h3>
                    <p className="text-[11px] text-text-secondary font-mono">{robot.model} · {robot.serial_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={robot.status} />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(robot)}
                      className="p-1 rounded text-text-secondary hover:text-cyan hover:bg-bg-hover transition-colors"
                      title="Edit Robot IP & Configuration"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingRobot(robot)}
                      className="p-1 rounded text-text-secondary hover:text-error hover:bg-bg-hover transition-colors"
                      title="Delete Robot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-2 rounded bg-bg-secondary border border-border-primary flex items-center justify-between text-xs font-mono">
                <span className="text-text-secondary flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-cyan" /> Robot IP:
                </span>
                <span className="font-bold text-cyan">{robot.ip_address || '192.168.1.12'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-bg-secondary border border-border-primary">
                  <span className="text-text-secondary block text-[10px] uppercase font-mono">Battery</span>
                  <span className="font-semibold text-text-primary font-mono">{robot.battery_level.toFixed(1)}%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-bg-secondary border border-border-primary">
                  <span className="text-text-secondary block text-[10px] uppercase font-mono">Enabled</span>
                  <span className={`font-semibold ${robot.is_enabled ? 'text-success' : 'text-error'}`}>
                    {robot.is_enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>

              {robot.position_x != null && (
                <div className="p-2.5 rounded-lg bg-bg-secondary border border-border-primary text-xs font-mono">
                  <span className="text-text-secondary block text-[10px] uppercase">Live Position (SLAM)</span>
                  <span className="text-cyan">
                    X: {robot.position_x.toFixed(2)} | Y: {robot.position_y?.toFixed(2)} | θ: {robot.orientation_z?.toFixed(2)}
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Register Robot Modal */}
      <Modal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} title="Register Autonomous Mobile Robot (AMR)">
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <Input label="Robot Name" placeholder="e.g. AMR-004 Fleet Scout" value={name} onChange={setName} required />
          <Input label="Robot IP Address" placeholder="e.g. 192.168.1.12" value={ipAddress} onChange={setIpAddress} required />
          <Input label="Model / Spec" placeholder="e.g. AMR-V2 Heavy Payload" value={model} onChange={setModel} required />
          <Input label="Serial Number" placeholder="e.g. SN-AMR-2026-981" value={serialNumber} onChange={setSerialNumber} required />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsRegisterOpen(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? 'Registering...' : 'Register AMR'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Robot Modal */}
      <Modal isOpen={!!editingRobot} onClose={() => setEditingRobot(null)} title={`Edit Robot - ${editingRobot?.name}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input label="Robot Name" value={editName} onChange={setEditName} required />
          <Input label="Robot IP Address" value={editIp} onChange={setEditIp} required />
          <Input label="Model / Spec" value={editModel} onChange={setEditModel} required />
          <Input label="Serial Number" value={editSerial} onChange={setEditSerial} required />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setEditingRobot(null)} type="button">Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deletingRobot} onClose={() => setDeletingRobot(null)} title="Delete Robot">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to remove <strong className="text-text-primary">{deletingRobot?.name}</strong> ({deletingRobot?.ip_address}) from your fleet?
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setDeletingRobot(null)}>Cancel</Button>
            <Button
              variant="outline"
              className="border-error text-error hover:bg-error/10"
              onClick={() => deletingRobot && deleteMutation.mutate(deletingRobot.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
