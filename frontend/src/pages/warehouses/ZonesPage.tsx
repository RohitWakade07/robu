import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Map as MapIcon } from 'lucide-react'
import { api } from '../../api/client'
import { Card, EmptyState, PageHeader, Notice, StatusBadge, Button } from '../../components/ui'

export function ZonesPage() {
  const map = useQuery({ queryKey: ['map-current'], queryFn: api.map.getCurrent, retry: false })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Storage Zones"
        description="Zone layout derived from the warehouse map."
        actions={
          <Link to="/warehouse-map">
            <Button variant="outline" icon={<MapIcon className="h-4 w-4" />}>Open warehouse map</Button>
          </Link>
        }
      />
      <Notice tone="info" title="Zones are managed on the map">
        The API has no zone records to list or edit. Zones are created by syncing a map from the Warehouse Map page.
      </Notice>
      <Card>
        {map.data ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="t-section-title">{map.data.label}</p>
              <p className="text-sm text-text-secondary">Active map</p>
            </div>
            <StatusBadge status={map.data.zones_synced ? 'active' : 'pending'} />
          </div>
        ) : (
          <EmptyState title="No zone data" description="Upload and sync a warehouse map to generate zones." />
        )}
      </Card>
    </div>
  )
}
