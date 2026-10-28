import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Warehouse, Grid, Map as MapIcon } from 'lucide-react'
import { api } from '../../api/client'
import { Card, StatusBadge, PageHeader, ErrorState, LoadingSpinner, EmptyState, Notice, Button } from '../../components/ui'

export function WarehousesPage() {
  const map = useQuery({ queryKey: ['map-current'], queryFn: api.map.getCurrent, retry: false })
  const robots = useQuery({ queryKey: ['robots'], queryFn: api.robots.list })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facilities"
        description="The warehouse site currently loaded in the system."
        actions={
          <>
            <Link to="/racks">
              <Button variant="outline" icon={<Grid className="h-4 w-4" />}>Racks &amp; shelves</Button>
            </Link>
            <Link to="/warehouse-map">
              <Button variant="outline" icon={<MapIcon className="h-4 w-4" />}>Warehouse map</Button>
            </Link>
          </>
        }
      />

      <Notice tone="info" title="Derived from the active map">
        The API has no facility records. The site shown here is the active warehouse map; multi-site management needs a backend addition.
      </Notice>

      {map.isLoading ? (
        <LoadingSpinner label="Loading facility" />
      ) : map.isError ? (
        <EmptyState
          title="No active warehouse map"
          description="Upload a SLAM map on the Warehouse Map page to define your facility."
          action={
            <Link to="/warehouse-map">
              <Button>Go to map upload</Button>
            </Link>
          }
        />
      ) : map.data ? (
        <Card className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="neu-inset flex h-12 w-12 items-center justify-center text-action-primary" aria-hidden="true">
                <Warehouse className="h-6 w-6" />
              </span>
              <div>
                <h2 className="t-section-title">{map.data.label}</h2>
                <p className="text-xs text-text-secondary">Active warehouse map</p>
              </div>
            </div>
            <StatusBadge status={map.data.zones_synced ? 'active' : 'pending'} />
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            {[
              ['Map size', `${map.data.width_px} × ${map.data.height_px} px`],
              ['Resolution', `${map.data.resolution} m/px`],
              ['Zones synced', map.data.zones_synced ? 'Yes' : 'No'],
              ['Robots registered', robots.isError ? '—' : String(robots.data?.length ?? '…')],
            ].map(([k, v]) => (
              <div key={k} className="neu-inset p-3">
                <dt className="t-label uppercase">{k}</dt>
                <dd className="t-numeric mt-1 text-text-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : (
        <ErrorState title="Facility unavailable" />
      )}
    </div>
  )
}
