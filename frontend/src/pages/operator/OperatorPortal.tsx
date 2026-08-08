import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertOctagon, Battery, Navigation, Activity } from 'lucide-react'
import { api } from '../../api/client'
import { useWebSocket } from '../../hooks/useWebSocket'
import { Button, StatusBadge, LoadingSpinner } from '../../components/ui'

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
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw grid as fallback if no map
      ctx.strokeStyle = '#334155' // border-primary
      ctx.lineWidth = 1
      for(let x=0; x<canvas.width; x+=50) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for(let y=0; y<canvas.height; y+=50) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Draw map if available (placeholder logic, assuming we can parse or draw the pgm data)
      // If we had a base64 png we could just drawImage. We'll skip complex PGM rendering for now.
      if (mapData?.pgm_data) {
          ctx.fillStyle = 'rgba(14, 165, 233, 0.1)' // cyan tint
          ctx.fillRect(0,0, canvas.width, canvas.height)
          ctx.fillStyle = '#94a3b8' // text-secondary
          ctx.font = '14px monospace'
          ctx.fillText(`Map: ${mapData.label} (${mapData.width_px}x${mapData.height_px})`, 20, 30)
      }

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
    <div className="flex h-full gap-6">
      <div className="flex-1 glass-panel rounded-xl border border-border-primary overflow-hidden relative flex flex-col">
        <div className="p-4 border-b border-border-primary flex justify-between items-center bg-bg-primary/50">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Navigation className="h-4 w-4 text-cyan" />
            Live Fleet Map
          </h2>
          {mapData && <span className="text-xs text-text-secondary">Resolution: {mapData.resolution} m/px</span>}
        </div>
        <div className="flex-1 bg-[#020617] relative">
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={600} 
            className="absolute inset-0 w-full h-full object-contain"
          />
        </div>
      </div>

      <div className="w-80 flex flex-col gap-4">
        <div className="glass-panel rounded-xl border border-border-primary p-4">
          <h3 className="font-semibold text-text-primary mb-3">Select Robot</h3>
          <div className="space-y-2">
            {robots?.map(robot => (
              <button
                key={robot.id}
                onClick={() => setActiveRobotId(robot.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-colors ${
                  activeRobotId === robot.id 
                    ? 'bg-action-primary/20 border border-action-primary' 
                    : 'bg-bg-elevated border border-transparent hover:border-border-primary'
                }`}
              >
                <span>{robot.name}</span>
                <StatusBadge status={robot.status} />
              </button>
            ))}
            {!robots?.length && <p className="text-xs text-text-secondary">No robots in fleet.</p>}
          </div>
        </div>

        {activeRobot && (
          <div className="glass-panel rounded-xl border border-border-primary flex-1 flex flex-col">
             <div className="p-4 border-b border-border-primary">
                <h3 className="font-semibold text-text-primary">{activeRobot.name} Telemetry</h3>
             </div>
             
             <div className="p-4 space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-bg-elevated rounded-lg">
                    <div className="text-text-secondary text-xs flex items-center gap-1 mb-1">
                      <Battery className="h-3 w-3"/> Battery
                    </div>
                    <div className="text-text-primary font-medium">{activeRobot.battery_level.toFixed(1)}%</div>
                  </div>
                  <div className="p-3 bg-bg-elevated rounded-lg">
                    <div className="text-text-secondary text-xs flex items-center gap-1 mb-1">
                      <Activity className="h-3 w-3"/> Status
                    </div>
                    <div className="text-text-primary font-medium capitalize">{activeRobot.status}</div>
                  </div>
                </div>

                <div className="p-3 bg-bg-elevated rounded-lg text-sm">
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
                    <Button variant="secondary" className="p-2 h-12" onClick={() => handleMove('up')}>↑</Button>
                    <div />
                    <Button variant="secondary" className="p-2 h-12" onClick={() => handleMove('left')}>⟲</Button>
                    <Button variant="secondary" className="p-2 h-12" onClick={() => handleMove('down')}>↓</Button>
                    <Button variant="secondary" className="p-2 h-12" onClick={() => handleMove('right')}>⟳</Button>
                  </div>

                  <Button 
                    className="w-full bg-error/10 text-error border-error/50 hover:bg-error hover:text-white"
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
