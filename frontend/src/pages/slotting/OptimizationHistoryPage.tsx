import { Card, EmptyState, PageHeader, Notice } from '../../components/ui'

export function OptimizationHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Optimization History" description="Past optimizer runs, travel savings and generated relocation jobs." />
      <Notice tone="info" title="Not available yet">
        Optimizer runs are not persisted by the backend, so no history can be shown. Current results are on the Recommendations page.
      </Notice>
      <Card>
        <EmptyState title="No run history" description="A run-history endpoint is required to populate this page." />
      </Card>
    </div>
  )
}
