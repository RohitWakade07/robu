import { Sparkles } from 'lucide-react'
import { Card, DataTable, type Column, Button } from '../../components/ui'

export function RecommendationsPage() {
  const recommendationsData = [
    {
      sku: 'SKU-001 (Fast Mover)',
      currentLoc: 'Reserve Zone C-04',
      recLoc: 'Golden Zone A-01',
      currentScore: 0.42,
      recScore: 0.95,
      gain: '+0.53 (+126%)',
      reason: 'Top 80% revenue contribution (Class AX). Proximity to Shipping Zone.',
      priority: 'Highest',
    },
    {
      sku: 'SKU-004 / SKU-012 Pair',
      currentLoc: 'Dispersed Racks',
      recLoc: 'Adjacent Slots A-02/A-03',
      currentScore: 0.55,
      recScore: 0.88,
      gain: '+0.33 (+60%)',
      reason: 'High product affinity (Jaccard 0.82). Frequently co-ordered in single baskets.',
      priority: 'High',
    },
  ]

  const columns: Column<Record<string, unknown>>[] = [
    {
      header: 'Product / SKU',
      cell: (row) => <span className="font-semibold text-xs text-text-primary">{String(row.sku)}</span>,
    },
    {
      header: 'Current Rack Location',
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{String(row.currentLoc)}</span>,
    },
    {
      header: 'Recommended Slot',
      cell: (row) => <span className="font-mono text-xs text-cyan font-semibold">{String(row.recLoc)}</span>,
    },
    {
      header: 'Score Gain',
      cell: (row) => <span className="font-mono text-xs text-success font-bold">{String(row.gain)}</span>,
    },
    {
      header: 'Optimization Rationale',
      cell: (row) => <span className="text-xs text-text-secondary max-w-xs block">{String(row.reason)}</span>,
    },
    {
      header: 'Action',
      cell: () => (
        <Button variant="secondary" className="py-1 px-2 text-xs">
          Generate Task
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Slotting Recommendations</h1>
          <p className="text-xs text-text-secondary">AI & heuristic relocations to minimize total picking & replenishment travel</p>
        </div>
        <Button icon={<Sparkles className="h-4 w-4" />}>Run Global Optimizer</Button>
      </div>

      <Card>
        <DataTable columns={columns} data={recommendationsData as unknown as Record<string, unknown>[]} />
      </Card>
    </div>
  )
}
