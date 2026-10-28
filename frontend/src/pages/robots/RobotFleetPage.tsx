import { OperatorPortal } from '../operator/OperatorPortal'

export function RobotFleetPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="t-page-title">Robot Vision & Teleoperation</h1>
        <p className="text-xs text-text-secondary">
          Live SLAM map positioning, odometry tracking, manual teleop velocity & emergency fleet control
        </p>
      </div>

      <div className="min-h-[500px] lg:h-[calc(100vh-13rem)]">
        <OperatorPortal />
      </div>
    </div>
  )
}
