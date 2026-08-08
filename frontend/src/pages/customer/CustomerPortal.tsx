import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { api } from '../../api/client'
import type { Product } from '../../types'
import { Button, LoadingSpinner, EmptyState, StatusBadge } from '../../components/ui'

export function CustomerProductsPage() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: api.products.list,
  })

  const [cart, setCart] = useState<Record<string, number>>({})

  const addToCart = (productId: string) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }))
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const qty = (prev[productId] || 0) - 1
      if (qty <= 0) {
        const { [productId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [productId]: qty }
    })
  }

  const queryClient = useQueryClient()
  const orderMutation = useMutation({
    mutationFn: () =>
      api.orders.create(
        Object.entries(cart).map(([product_id, quantity]) => ({ product_id, quantity })),
      ),
    onSuccess: () => {
      setCart({})
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartTotal = products
    ? Object.entries(cart).reduce((sum, [id, qty]) => {
        const product = products.find((p) => p.id === id)
        return sum + (product?.unit_price || 0) * qty
      }, 0)
    : 0

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Product Catalog</h1>
          <p className="text-sm text-text-secondary mt-1">Browse available inventory and place orders</p>
        </div>
        {cartCount > 0 && (
          <Button onClick={() => orderMutation.mutate()} disabled={orderMutation.isPending}>
            <ShoppingCart className="h-4 w-4" />
            Place Order ({cartCount}) — ${cartTotal.toFixed(2)}
          </Button>
        )}
      </div>

      {!products?.length ? (
        <EmptyState title="No products available" description="Check back later for new inventory." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product: Product, i: number) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel rounded-xl p-5 border border-border-primary hover:border-action-primary/20 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium text-text-primary">{product.name}</h3>
                  <p className="text-xs text-text-secondary font-mono mt-0.5">{product.sku}</p>
                </div>
                <span className="text-lg font-semibold text-cyan">${product.unit_price.toFixed(2)}</span>
              </div>
              {product.description && (
                <p className="text-sm text-text-secondary mb-4 line-clamp-2">{product.description}</p>
              )}
              <div className="flex items-center justify-between">
                {cart[product.id] ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="h-8 w-8 rounded-lg border border-border-primary flex items-center justify-center text-text-secondary hover:text-text-primary"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-text-primary font-medium w-6 text-center">{cart[product.id]}</span>
                    <button
                      onClick={() => addToCart(product.id)}
                      className="h-8 w-8 rounded-lg border border-border-primary flex items-center justify-center text-text-secondary hover:text-text-primary"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Button variant="secondary" onClick={() => addToCart(product.id)}>
                    <Plus className="h-4 w-4" />
                    Add to Order
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {orderMutation.isSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 right-8 glass-panel rounded-xl p-4 border border-success/30 glow-electric"
        >
          <p className="text-success text-sm font-medium">Order placed successfully! Robot task queued.</p>
        </motion.div>
      )}
    </div>
  )
}

export function CustomerOrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: api.orders.list,
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">My Orders</h1>
      <p className="text-sm text-text-secondary mb-8">Track your order execution in real time</p>

      {!orders?.length ? (
        <EmptyState title="No orders yet" description="Browse products and place your first order." />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="glass-panel rounded-xl p-5 border border-border-primary">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-mono text-sm text-cyan">{order.order_number}</span>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{order.items.length} item(s)</span>
                <span className="text-text-primary font-medium">${order.total_amount.toFixed(2)}</span>
              </div>
              {order.task_id && (
                <p className="text-xs text-text-secondary mt-2 font-mono">Task: {order.task_id.slice(0, 8)}...</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
