import { Card, EmptyState, PageHeader, Notice } from '../../components/ui'

export function StockMovementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Stock Movements" description="Audit trail of putaways, relocations and picks." />
      <Notice tone="info" title="Not available yet">
        The backend does not expose a stock-movement ledger endpoint, so there is nothing to display. This page will list movements once an
        API such as <code className="font-mono">GET /stock-movements</code> exists.
      </Notice>
      <Card>
        <EmptyState title="No movement data source" description="Movements are not currently recorded or served by the API." />
      </Card>
    </div>
  )
}
