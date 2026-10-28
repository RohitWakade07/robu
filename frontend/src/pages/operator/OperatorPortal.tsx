import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertOctagon, Battery, Navigation, Activity } from 'lucide-react'
import { api } from '../../api/client'
import { useWebSocket } from '../../hooks/useWebSocket'
import { Button, StatusBadge, LoadingSpinner } from '../../components/ui'
import { drawMapToCanvas } from '../../utils/mapRenderer'

export function OperatorPortal() {
  const { data: mapData, isLoading: mapLoading } = useQuery({
    queryKey: ['map', 'current'],
    queryFn: api.map.getCurrent,
  })

  const { data: robots, isLoading: robotsLoading } = useQuery({
    queryKey: ['robots'],
    queryFn: api.robots.list,
  })

  const [activeRobotId, setActiveRobotId] = useState<string | null>(null)
  const [robotPositions, setRobotPositions] = useState<Record<string, { x: number, y: number, theta: number }>>({})
  
  // Use a ref for the canvas to draw the map and robots
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { sendCommand } = useWebSocket({
    onRobotPosition: (data) => {
      setRobotPositions(prev => ({
        ...prev,
        [data.robot_id]: { x: data.x, y: data.y, theta: data.theta_z }
      }))
    }
  })

  // Basic drawing loop for the canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number

    const draw = () => {
      // Draw 2D SLAM Occupancy Grid Map background
      drawMapToCanvas(ctx, canvas.width, canvas.height, mapData)

      // Draw robots
      Object.entries(robotPositions).forEach(([id, pos]) => {
        // Convert world coords to canvas coords (simplified)
        const scale = 50
        const cx = canvas.width/2 + pos.x * scale
        const cy = canvas.height/2 - pos.y * scale

        // Draw robot body
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(-pos.theta) // Negative because canvas y is down

        ctx.fillStyle = id === activeRobotId ? '#0ea5e9' : '#0f172a'
        ctx.strokeStyle = '#0ea5e9'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(0, 0, 15, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Draw heading indicator (arrow)
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.moveTo(10, 0)
        ctx.lineTo(-5, 5)
        ctx.lineTo(-5, -5)
        ctx.closePath()
        ctx.fill()

        ctx.restore()

        // Draw label
        const robot = robots?.find(r => r.id === id)
        if (robot) {
          ctx.fillStyle = '#f8fafc' // text-primary
          ctx.font = '12px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(robot.name, cx, cy - 25)
        }
      })

      animationFrameId = window.requestAnimationFrame(draw)
    }
    
    draw()

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [mapData, robotPositions, activeRobotId, robots])


  if (robotsLoading || mapLoading) return <LoadingSpinner />

  const activeRobot = robots?.find(r => r.id === activeRobotId)

  const handleEStop = () => {
    if (activeRobot) {
      sendCommand('emergency_stop', { robot_id: activeRobot.id })
    }
  }

  const handleMove = (direction: string) => {
    if (!activeRobot) return
    let linear = 0
    let angular = 0
    switch(direction) {
      case 'up': linear = 0.5; break;
      case 'down': linear = -0.5; break;
      case 'left': angular = 1.0; break;
      case 'right': angular = -1.0; break;
    }
    sendCommand('manual_velocity', { robot_id: activeRobot.id, linear_v: linear, angular_v: angular })
  }

  return (
    <div className="flex h-full flex-col gap-6 lg:flex-row">
      <div className="neu-raised relative flex min-h-[22rem] flex-1 flex-col overflow-hidden">
        <div className="p-4 border-b border-border-primary flex justify-between items-center bg-bg-primary/50">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Navigation className="h-4 w-4 text-cyan" />
            Live Fleet Map
          </h2>
          {mapData && <span className="text-xs text-text-secondary">Resolution: {mapData.resolution} m/px</span>}
        </div>
        <div className="relative flex-1 bg-bg-secondary shadow-[var(--neu-inset)]">
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={600} 
            className="absolute inset-0 w-full h-full object-contain"
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-4 lg:w-80">
        <div className="neu-raised p-4">
          <h3 className="font-semibold text-text-primary mb-3">Select Robot</h3>
          <div className="space-y-2">
            {robots?.map(robot => (
              <button
                key={robot.id}
                onClick={() => setActiveRobotId(robot.id)}
                aria-pressed={activeRobotId === robot.id}
                className="neu-pressable flex min-h-10 w-full cursor-pointer items-center justify-between rounded-[var(--radius-neu-sm)] px-3 py-2 text-left text-sm text-text-primary" 
              >
                <span>{robot.name}</span>
                <StatusBadge status={robot.status} />
              </button>
            ))}
            {!robots?.length && <p className="text-xs text-text-secondary">No robots in fleet.</p>}
          </div>
        </div>

        {activeRobot && (
          <div className="neu-raised flex-1 flex flex-col">
             <div className="p-4 border-b border-border-primary">
                <h3 className="font-semibold text-text-primary">{activeRobot.name} Telemetry</h3>
             </div>
             
             <div className="p-4 space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="neu-inset p-3">
                    <div className="text-text-secondary text-xs flex items-center gap-1 mb-1">
                      <Battery className="h-3 w-3"/> Battery
                    </div>
                    <div className="text-text-primary font-medium">{activeRobot.battery_level.toFixed(1)}%</div>
                  </div>
                  <div className="neu-inset p-3">
                    <div className="text-text-secondary text-xs flex items-center gap-1 mb-1">
                      <Activity className="h-3 w-3"/> Status
                    </div>
                    <div className="text-text-primary font-medium capitalize">{activeRobot.status}</div>
                  </div>
                </div>

                <div className="neu-inset p-3 text-sm">
                   <div className="text-text-secondary text-xs mb-1">Odometry</div>
                   <div className="font-mono text-cyan text-xs">
                     X: {robotPositions[activeRobot.id]?.x?.toFixed(2) || '0.00'} <br/>
                     Y: {robotPositions[activeRobot.id]?.y?.toFixed(2) || '0.00'} <br/>
                     θ: {robotPositions[activeRobot.id]?.theta?.toFixed(2) || '0.00'}
                   </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border-primary">
                  <h4 className="text-xs font-medium text-text-secondary mb-3">Manual Control</h4>
                  
                  <div className="grid grid-cols-3 gap-2 w-48 mx-auto mb-6">
                    <div />
                    <Button variant="secondary" aria-label="Move forward" className="h-12 p-2" onClick={() => handleMove('up')}>↑</Button>
                    <div />
                    <Button variant="secondary" aria-label="Rotate left" className="h-12 p-2" onClick={() => handleMove('left')}>⟲</Button>
                    <Button variant="secondary" aria-label="Move backward" className="h-12 p-2" onClick={() => handleMove('down')}>↓</Button>
                    <Button variant="secondary" aria-label="Rotate right" className="h-12 p-2" onClick={() => handleMove('right')}>⟳</Button>
                  </div>

                  <Button 
                    variant="danger" className="w-full"
                    onClick={handleEStop}
                  >
                    <AlertOctagon className="h-4 w-4 mr-2" />
                    EMERGENCY STOP
                  </Button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  )
}
