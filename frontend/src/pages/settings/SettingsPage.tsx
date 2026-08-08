import { Save, Server, Shield } from 'lucide-react'
import { Card, Input, Button, Select } from '../../components/ui'
import { useState } from 'react'

export function SettingsPage() {
  const [dbUrl, setDbUrl] = useState('sqlite+aiosqlite:///./robu_warehouse.db')
  const [wsPort, setWsPort] = useState('8000')
  const [threshold, setThreshold] = useState('0.15')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">System Configuration & Parameters</h1>
          <p className="text-xs text-text-secondary">Database connections, ROS2 gateway ports & optimization sensitivity</p>
        </div>
        <Button icon={<Save className="h-4 w-4" />}>Save Configuration</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Server className="h-4 w-4 text-cyan" />
            Backend Infrastructure Settings
          </h3>
          <Input label="Database Connection URI" value={dbUrl} onChange={setDbUrl} />
          <Input label="WebSocket Gateway Server Port" value={wsPort} onChange={setWsPort} />
        </Card>

        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Shield className="h-4 w-4 text-action-primary" />
            Slotting Optimizer Parameters
          </h3>
          <Input label="Minimum Relocation Improvement Threshold" value={threshold} onChange={setThreshold} />
          <Select
            label="Default Routing Algorithm"
            value="A_STAR"
            onChange={() => {}}
            options={[
              { label: 'A* Pathfinding (Non-Euclidean)', value: 'A_STAR' },
              { label: 'Dijkstra Shortest Path', value: 'DIJKSTRA' },
            ]}
          />
        </Card>
      </div>
    </div>
  )
}
