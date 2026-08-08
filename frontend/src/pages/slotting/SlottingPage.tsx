import { SpatialScoringPage } from '../wms/SpatialScoringPage'

export function SlottingPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Intelligent Spatial Slotting Engine</h1>
        <p className="text-xs text-text-secondary">
          3D warehouse rack scoring, A* travel distance optimization & automated relocation queue
        </p>
      </div>

      <div className="min-h-[600px]">
        <SpatialScoringPage />
      </div>
    </div>
  )
}
