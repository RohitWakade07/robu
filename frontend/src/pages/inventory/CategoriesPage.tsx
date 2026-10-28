import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Card, DataTable, PageHeader, ErrorState, LoadingSpinner, Notice, type Column } from '../../components/ui'

interface CategoryRow extends Record<string, unknown> {
  categoryId: string
  products: number
}

export function CategoriesPage() {
  const products = useQuery({ queryKey: ['products'], queryFn: api.products.list })

  const counts = new Map<string, number>()
  for (const p of products.data ?? []) {
    const key = p.category_id ?? 'Uncategorized'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const rows: CategoryRow[] = [...counts].map(([categoryId, n]) => ({ categoryId, products: n }))

  const columns: Column<CategoryRow>[] = [
    { header: 'Category', accessorKey: 'categoryId', sortable: true, cell: (r) => <span className="font-mono text-xs font-semibold text-text-primary">{r.categoryId}</span> },
    { header: 'Products', accessorKey: 'products', sortable: true, cell: (r) => <span className="t-numeric text-xs text-text-primary">{r.products}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Product Categories" description="Products grouped by their category reference." />
      <Notice tone="info" title="Read-only view">
        The API has no category entity (names, zone defaults, create/edit), so categories are derived from each product's <code className="font-mono">category_id</code>.
      </Notice>
      <Card>
        {products.isLoading ? (
          <LoadingSpinner label="Loading categories" />
        ) : products.isError ? (
          <ErrorState title="Could not load products" error={products.error} onRetry={() => products.refetch()} />
        ) : (
          <DataTable caption="Categories" columns={columns} data={rows} emptyTitle="No categories" emptyDescription="Products have not been assigned categories yet." />
        )}
      </Card>
    </div>
  )
}
