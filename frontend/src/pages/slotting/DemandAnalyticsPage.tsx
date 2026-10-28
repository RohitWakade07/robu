import { AnalyticsPage } from '../wms/AnalyticsPage'

export function DemandAnalyticsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="t-page-title">Demand Velocity & Velocity Mix</h1>
        <p className="text-xs text-text-secondary">
          Historical order velocity, ABC/XYZ demand stability curves & zone capacity distribution
        </p>
      </div>

      <AnalyticsPage />
    </div>
  )
}
