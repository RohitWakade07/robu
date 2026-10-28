import { SpatialScoringPage } from '../wms/SpatialScoringPage'

export function SlottingPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="t-page-title">Intelligent Spatial Slotting Engine</h1>
        <p className="text-xs text-text-secondary">
          3D warehouse rack scoring, A* travel distance optimization & automated relocation queue
        </p>
      </div>

      <div className="flex min-h-[600px] flex-col">
        <SpatialScoringPage />
      </div>
    </div>
  )
}
