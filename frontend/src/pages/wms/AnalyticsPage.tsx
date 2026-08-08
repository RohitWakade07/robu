import { useEffect, useRef, useState } from 'react'

declare const Chart: any

function loadChartJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = 'chartjs-cdn'
    if (document.getElementById(id)) return resolve()
    const s = document.createElement('script')
    s.id = id
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}

// Read state from localStorage (saved by SpatialScoringPage)
function loadWMSState() {
  try {
    const raw = localStorage.getItem('nexusWMS_state')
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  return null
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: string
}

function StatCard({ label, value, sub, accent = '#1e293b' }: StatCardProps) {
  return (
    <div style={{
      background: '#ffffff', borderRadius: 14, padding: '1.25rem 1.5rem',
      border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: '2.25rem', fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

export function AnalyticsPage() {
  const velRef = useRef<HTMLCanvasElement>(null)
  const zoneRef = useRef<HTMLCanvasElement>(null)
  const handlingRef = useRef<HTMLCanvasElement>(null)
  const chartsRef = useRef<any[]>([])
  const [stats, setStats] = useState({ packages: 0, avgScore: 0, avgDist: 0, utilPct: 0, history: [] as any[] })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadChartJs().then(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready) return

    const state = loadWMSState()
    const history: any[] = state?.placementHistory || []
    const pkgCount = history.length

    const avgScore = pkgCount
      ? Math.round(history.reduce((s: number, r: any) => s + (r.score || 0), 0) / pkgCount)
      : 0

    // Compute avg dist from slot IDs (we store positions in placementHistory? No — but we can approximate)
    // We'll just show score-based metrics
    const avgDist = pkgCount
      ? (history.reduce((s: number, r: any) => {
          // rough heuristic from slot name: use shelf row depth
          const match = r.slot?.match(/R(\d+)/)
          const row = match ? parseInt(match[1]) : 0
          return s + row * 7.5 + 20 // approximate Manhattan from dock
        }, 0) / pkgCount).toFixed(1)
      : 0

    setStats({ packages: pkgCount, avgScore, avgDist: Number(avgDist), utilPct: state?.utilPct || 0, history })

    // Destroy old charts
    chartsRef.current.forEach(c => c?.destroy())
    chartsRef.current = []

    if (!pkgCount) return

    // Velocity distribution
    const velCounts = { High: 0, Medium: 0, Low: 0 } as Record<string, number>
    history.forEach((r: any) => { velCounts[r.params?.velocity]++ })

    if (velRef.current) {
      chartsRef.current.push(new Chart(velRef.current, {
        type: 'doughnut',
        data: {
          labels: ['High', 'Medium', 'Low'],
          datasets: [{ data: [velCounts.High, velCounts.Medium, velCounts.Low], backgroundColor: ['#ef4444', '#facc15', '#3b82f6'], borderWidth: 2, borderColor: '#fff' }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
      }))
    }

    // Zone counts
    const zoneCounts: Record<string, number> = {}
    history.forEach((r: any) => {
      // extract zone from slot like "Standard-R0C1-L2" -> "Standard"
      const z = r.slot?.split('-R')[0] || 'Standard'
      zoneCounts[z] = (zoneCounts[z] || 0) + 1
    })

    if (zoneRef.current) {
      chartsRef.current.push(new Chart(zoneRef.current, {
        type: 'bar',
        data: {
          labels: Object.keys(zoneCounts),
          datasets: [{ label: 'Packages', data: Object.values(zoneCounts), backgroundColor: ['#3b82f6','#60a5fa','#a78bfa','#f87171','#10b981','#f59e0b'], borderRadius: 6 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
          plugins: { legend: { display: false } },
        },
      }))
    }

    // Handling unit distribution
    const handCounts: Record<string, number> = {}
    history.forEach((r: any) => {
      const h = r.params?.handling || 'Each'
      handCounts[h] = (handCounts[h] || 0) + 1
    })

    if (handlingRef.current) {
      chartsRef.current.push(new Chart(handlingRef.current, {
        type: 'pie',
        data: {
          labels: Object.keys(handCounts),
          datasets: [{ data: Object.values(handCounts), backgroundColor: ['#6366f1','#0ea5e9','#14b8a6'], borderWidth: 2, borderColor: '#fff' }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
      }))
    }

    return () => { chartsRef.current.forEach(c => c?.destroy()) }
  }, [ready])

  const refresh = () => {
    chartsRef.current.forEach(c => c?.destroy())
    chartsRef.current = []
    setReady(false)
    setTimeout(() => setReady(true), 50)
  }

  const cardStyle: React.CSSProperties = {
    background: '#ffffff', borderRadius: 14, padding: '1.25rem',
    border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', background: '#f8fafc', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
              📊 Analytics Dashboard
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Live metrics from the Spatial Scoring Engine session
            </p>
          </div>
          <button onClick={refresh} style={{
            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10,
            padding: '0.6rem 1.25rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard label="Total Packages" value={stats.packages} sub="Ingested this session" accent="#0f172a" />
          <StatCard label="Avg. Score" value={stats.avgScore || '—'} sub="Optimization quality" accent="#2563eb" />
          <StatCard label="Avg. Travel" value={stats.packages ? `${stats.avgDist}m` : '—'} sub="Approx. dock distance" accent="#7c3aed" />
          <StatCard label="Session Active" value={stats.packages > 0 ? 'Yes' : 'No'} sub="WMS Engine" accent={stats.packages > 0 ? '#16a34a' : '#94a3b8'} />
        </div>

        {stats.packages === 0 ? (
          <div style={{
            ...cardStyle, textAlign: 'center', padding: '4rem',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>No data yet</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Go to the Slotting Engine, ingest some packages, and come back here to see charts.
            </p>
            <a href="/wms" style={{
              display: 'inline-block', background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
              color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '0.6rem 1.5rem',
              fontWeight: 700, fontSize: '0.875rem',
            }}>
              Go to Slotting Engine →
            </a>
          </div>
        ) : (
          <>
            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={cardStyle}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Velocity Distribution</h3>
                <div style={{ height: 220 }}><canvas ref={velRef} /></div>
              </div>
              <div style={cardStyle}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Zone Assignments</h3>
                <div style={{ height: 220 }}><canvas ref={zoneRef} /></div>
              </div>
              <div style={cardStyle}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Handling Unit Mix</h3>
                <div style={{ height: 220 }}><canvas ref={handlingRef} /></div>
              </div>
            </div>

            {/* Recent placements table */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Recent Placements</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                      {['Package', 'Location', 'Velocity', 'Handling', 'Score', 'Reasoning'].map(h => (
                        <th key={h} style={{ padding: '0.6rem 0.875rem', textAlign: 'left', fontWeight: 700, color: '#94a3b8', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...stats.history].reverse().slice(0, 15).map((r: any) => {
                      const velColor = r.params?.velocity === 'High' ? '#dc2626' : r.params?.velocity === 'Low' ? '#2563eb' : '#d97706'
                      const velBg = r.params?.velocity === 'High' ? '#fef2f2' : r.params?.velocity === 'Low' ? '#eff6ff' : '#fffbeb'
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}>
                          <td style={{ padding: '0.6rem 0.875rem', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                            PKG-{String(r.id).padStart(4, '0')}
                          </td>
                          <td style={{ padding: '0.6rem 0.875rem', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>{r.slot}</td>
                          <td style={{ padding: '0.6rem 0.875rem' }}>
                            <span style={{ background: velBg, color: velColor, padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 700, fontSize: '0.65rem' }}>
                              {r.params?.velocity}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem 0.875rem', color: '#475569' }}>{r.params?.handling}</td>
                          <td style={{ padding: '0.6rem 0.875rem', fontWeight: 700, color: (r.score || 0) >= 800 ? '#16a34a' : (r.score || 0) >= 500 ? '#2563eb' : '#64748b' }}>
                            {r.score}
                          </td>
                          <td style={{ padding: '0.6rem 0.875rem', color: '#64748b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.reason}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
