import { BarChart3, TrendingUp, DollarSign, Activity } from 'lucide-react'
import { Card, MetricCard } from '../../components/ui'

export function AnalyticsDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Operational Analytics Dashboard</h1>
        <p className="text-xs text-text-secondary">High-level throughput, picker performance, inventory turnover & fleet uptime</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Fulfillment Velocity" value="48 orders/hr" icon={<TrendingUp className="h-5 w-5" />} accent="cyan" />
        <MetricCard label="Average Pick Distance" value="18.2 meters" icon={<Activity className="h-5 w-5" />} accent="green" />
        <MetricCard label="Fleet Operational Uptime" value="99.4%" icon={<Activity className="h-5 w-5" />} accent="electric" />
        <MetricCard label="Monthly Shipping Value" value="$42,850.00" icon={<DollarSign className="h-5 w-5" />} accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-64 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan" />
            Fulfillment Throughput (Orders per Hour)
          </h3>
          <div className="flex-1 flex items-end justify-between gap-2 pt-6 px-4">
            {[32, 45, 28, 56, 42, 60, 48].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-cyan/20 border border-cyan/40 rounded-t transition-all hover:bg-cyan/40"
                  style={{ height: `${val * 2}px` }}
                />
                <span className="text-[10px] font-mono text-text-secondary">H0{i + 1}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="h-64 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Activity className="h-4 w-4 text-action-primary" />
            AMR Battery Efficiency & Utilization
          </h3>
          <div className="flex-1 flex items-end justify-between gap-2 pt-6 px-4">
            {[85, 78, 92, 88, 95, 90, 94].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-action-primary/20 border border-action-primary/40 rounded-t transition-all hover:bg-action-primary/40"
                  style={{ height: `${val * 1.8}px` }}
                />
                <span className="text-[10px] font-mono text-text-secondary">D0{i + 1}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
