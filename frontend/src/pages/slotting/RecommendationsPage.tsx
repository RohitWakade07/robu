import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, ListChecks } from 'lucide-react'
import { api } from '../../api/client'
import { Card, DataTable, Button, PageHeader, ErrorState, LoadingSpinner, toast, type Column } from '../../components/ui'

type Recommendation = Awaited<ReturnType<typeof api.slotting.recommendations>>[number] & Record<string, unknown>

export function RecommendationsPage() {
  const queryClient = useQueryClient()
  const recs = useQuery({ queryKey: ['slotting-recommendations'], queryFn: api.slotting.recommendations })
  const products = useQuery({ queryKey: ['products'], queryFn: api.products.list })

  const skuById = new Map((products.data ?? []).map((p) => [p.id, p.sku]))

  const optimize = useMutation({
    mutationFn: api.slotting.optimize,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['slotting-recommendations'] })
      toast.success(`Optimizer finished: ${res.recommendations_generated} recommendations generated.`)
    },
    onError: (err: Error) => toast.error(`Optimizer failed: ${err.message}`),
  })

  const reslot = useMutation({
    mutationFn: api.slotting.reslot,
    onSuccess: (res) => toast.success(`${res.tasks_generated} relocation tasks generated.`),
    onError: (err: Error) => toast.error(`Could not generate tasks: ${err.message}`),
  })

  const columns: Column<Recommendation>[] = [
    {
      header: 'SKU',
      sortable: true,
      sortValue: (r) => skuById.get(r.product_id) ?? r.product_id,
      cell: (r) => <span className="font-mono text-xs font-semibold text-text-primary">{skuById.get(r.product_id) ?? r.product_id}</span>,
    },
    { header: 'Recommended slot', accessorKey: 'slot_id', sortable: true, cell: (r) => <span className="font-mono text-xs font-semibold text-action-primary">{r.slot_id}</span> },
    { header: 'Priority', accessorKey: 'priority_score', sortable: true, cell: (r) => <span className="t-numeric text-xs text-text-primary">{Number(r.priority_score).toFixed(2)}</span> },
    { header: 'Slot score', accessorKey: 'slot_score', sortable: true, cell: (r) => <span className="t-numeric text-xs text-success">{Number(r.slot_score).toFixed(2)}</span> },
    { header: 'Rationale', cell: (r) => <span className="block max-w-sm text-xs text-text-secondary">{r.reason || '—'}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Slotting Recommendations"
        description="Product-to-slot assignments produced by the slotting optimizer to minimize picking and replenishment travel."
        actions={
          <>
            <Button variant="outline" icon={<ListChecks className="h-4 w-4" />} loading={reslot.isPending} onClick={() => reslot.mutate()}>
              Generate relocation tasks
            </Button>
            <Button icon={<Sparkles className="h-4 w-4" />} loading={optimize.isPending} onClick={() => optimize.mutate()}>
              Run optimizer
            </Button>
          </>
        }
      />

      <Card>
        {recs.isLoading ? (
          <LoadingSpinner label="Loading recommendations" />
        ) : recs.isError ? (
          <ErrorState title="Could not load recommendations" error={recs.error} onRetry={() => recs.refetch()} />
        ) : (
          <DataTable
            caption="Slotting recommendations"
            columns={columns}
            data={(recs.data ?? []) as Recommendation[]}
            emptyTitle="No recommendations yet"
            emptyDescription="Run the optimizer to generate slot assignments for your products."
          />
        )}
      </Card>
    </div>
  )
}
