import { OperatorPortal } from '../operator/OperatorPortal'

export function RobotFleetPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Robot Vision & Teleoperation</h1>
        <p className="text-xs text-text-secondary">
          Live SLAM map positioning, odometry tracking, manual teleop velocity & emergency fleet control
        </p>
      </div>

      <div className="h-[calc(100vh-210px)] min-h-[500px]">
        <OperatorPortal />
      </div>
    </div>
  )
}
