import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot } from 'lucide-react'
import { api } from '../../api/client'
import { Card, StatusBadge, LoadingSpinner, EmptyState, Button, Modal, Input } from '../../components/ui'

export function RobotsPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [model, setModel] = useState('AMR-V2')
  const [serialNumber, setSerialNumber] = useState('')

  const { data: robots, isLoading } = useQuery({
    queryKey: ['robots'],
    queryFn: api.robots.list,
  })

  const registerMutation = useMutation({
    mutationFn: api.robots.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['robots'] })
      setIsModalOpen(false)
      setName('')
      setSerialNumber('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !serialNumber) return
    registerMutation.mutate({ name, model, serial_number: serialNumber })
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Autonomous Robot Fleet</h1>
          <p className="text-xs text-text-secondary">Monitor, manage and configure autonomous mobile robots (AMRs)</p>
        </div>
        <Button variant="secondary" icon={<Bot className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
          Register AMR Robot
        </Button>
      </div>

      {!robots?.length ? (
        <EmptyState title="No Robots in Fleet" description="Register robots to begin autonomous operations." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {robots.map((robot) => (
            <Card key={robot.id} className="space-y-4">
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
                <StatusBadge status={robot.status} />
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Autonomous Mobile Robot (AMR)">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Robot Name" placeholder="e.g. AMR-004 Fleet Scout" value={name} onChange={setName} required />
          <Input label="Model / Spec" placeholder="e.g. AMR-V2 Heavy Payload" value={model} onChange={setModel} required />
          <Input label="Serial Number" placeholder="e.g. SN-AMR-2026-981" value={serialNumber} onChange={setSerialNumber} required />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? 'Registering...' : 'Register AMR'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
