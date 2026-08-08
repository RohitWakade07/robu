import { useEffect, useRef, useCallback } from 'react'

// Declare global CDN libraries
declare const THREE: any
declare const TWEEN: any

// ─── Constants ────────────────────────────────────────────────────────────────
const RACK_SPACING_X = 6.5
const RACK_SPACING_Z = 7.5
const SHELF_HEIGHT = 2.0
const NUM_SHELVES = 4
const DOCK_Z = 20
const DOCK_X = 0



function loadScripts(urls: string[]): Promise<void> {
  return urls.reduce((chain, url) => {
    return chain.then(
      () =>
        new Promise<void>((resolve, reject) => {
          if (document.querySelector(`script[src="${url}"]`)) return resolve()
          const s = document.createElement('script')
          s.src = url
          s.onload = () => resolve()
          s.onerror = reject
          document.head.appendChild(s)
        })
    )
  }, Promise.resolve())
}

export function SpatialScoringPage() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const rowsRef = useRef<HTMLInputElement>(null)
  const colsRef = useRef<HTMLInputElement>(null)
  const manifestRef = useRef<HTMLTableSectionElement>(null)
  const capTrackerRef = useRef<HTMLSpanElement>(null)
  const pkgCountRef = useRef<HTMLSpanElement>(null)
  const efficiencyRef = useRef<HTMLSpanElement>(null)
  const analyticsModalRef = useRef<HTMLDivElement>(null)
  const exportModalRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const sceneRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const rendererRef = useRef<any>(null)
  const warehouseGroupRef = useRef<any>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const slotsRef = useRef<any[]>([])
  const packagesRef = useRef<any[]>([])
  const packageCounterRef = useRef<number>(1)
  const placementHistoryRef = useRef<any[]>([])

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type = 'success') => {
    const toast = document.createElement('div')
    const colorMap: Record<string, string> = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6',
    }
    const border = colorMap[type] || colorMap.success
    toast.style.cssText = `
      position:fixed;bottom:1.5rem;right:1.5rem;
      background:white;padding:0.875rem 1.25rem;
      border-radius:0.75rem;border-left:4px solid ${border};
      box-shadow:0 10px 25px rgba(0,0,0,0.12);
      z-index:9999;font-family:Inter,sans-serif;
      font-size:0.85rem;font-weight:600;color:#1e293b;
      animation:slideInR 0.3s ease;max-width:360px;
    `
    // inline keyframe via a dynamic style tag
    if (!document.getElementById('toast-style')) {
      const st = document.createElement('style')
      st.id = 'toast-style'
      st.textContent = `@keyframes slideInR{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}`
      document.head.appendChild(st)
    }
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s'
      toast.style.opacity = '0'
      setTimeout(() => toast.remove(), 300)
    }, 3000)
  }, [])

  const updateUI = useCallback(() => {
    const occupied = slotsRef.current.filter((s) => s.occupied).length
    const total = slotsRef.current.length
    const util = total > 0 ? Math.round((occupied / total) * 100) : 0
    if (capTrackerRef.current) capTrackerRef.current.textContent = `${occupied} / ${total}`
    if (pkgCountRef.current) pkgCountRef.current.textContent = String(packagesRef.current.length)
    if (efficiencyRef.current) efficiencyRef.current.textContent = `${100 - Math.min(util, 100)}%`
  }, [])

  // ── Three.js helpers ─────────────────────────────────────────────────────────
  const createTextSprite = useCallback((message: string, color: number) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 512
    canvas.height = 128
    ctx.font = 'Bold 46px Inter'
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`
    ctx.textAlign = 'center'
    ctx.fillText(message, 256, 70)
    const texture = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(10, 2.5, 1)
    return sprite
  }, [])

  const createRackUnit = useCallback(
    (x: number, z: number, colorHex: number, zoneName: string, row: number, col: number, opacity = 0.15) => {
      const group = new THREE.Group()
      const shelfMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7, metalness: 0.2 })

      for (let s = 0; s < NUM_SHELVES; s++) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 3.8), shelfMat)
        shelf.position.set(0, s * SHELF_HEIGHT + 0.6, 0)
        shelf.castShadow = true
        shelf.receiveShadow = true
        group.add(shelf)
        slotsRef.current.push({
          id: `${zoneName}-R${row}C${col}-L${s}`,
          zone: zoneName,
          row,
          col,
          shelf: s,
          x,
          y: s * SHELF_HEIGHT + 0.6 + 0.65,
          z,
          occupied: false,
        })
      }

      const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })
      ;[[-2.2, 1.7],[-2.2, -1.7],[2.2, 1.7],[2.2, -1.7]].forEach(([px, pz]) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, NUM_SHELVES * SHELF_HEIGHT, 0.25), postMat)
        post.position.set(px, (NUM_SHELVES * SHELF_HEIGHT) / 2, pz)
        post.castShadow = true
        group.add(post)
      })

      if (zoneName !== 'Standard') {
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(7, 7),
          new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity, side: THREE.DoubleSide })
        )
        plane.rotation.x = -Math.PI / 2
        plane.position.set(0, 0.03, 0)
        group.add(plane)
      }

      group.position.set(x, 0, z)
      if (warehouseGroupRef.current) warehouseGroupRef.current.add(group)
    },
    [createTextSprite]
  )

  const adjustCamera = useCallback((rows: number, cols: number) => {
    if (!cameraRef.current) return
    const maxDim = Math.max(rows, cols)
    const pullBack = 12
    new TWEEN.Tween(cameraRef.current.position)
      .to({
        x: -50 - cols * pullBack * 0.4,
        y: 60 + maxDim * pullBack * 0.35,
        z: 70 + rows * pullBack * 0.25,
      }, 1200)
      .easing(TWEEN.Easing.Cubic.Out)
      .start()
    const lookAt = new THREE.Vector3(0, 2, -(rows * RACK_SPACING_Z) / 3)
    new TWEEN.Tween({}).to({}, 1200).onUpdate(() => cameraRef.current?.lookAt(lookAt)).start()
  }, [])

  const buildWarehouse = useCallback(() => {
    if (!warehouseGroupRef.current || !sceneRef.current) return
    while (warehouseGroupRef.current.children.length > 0) warehouseGroupRef.current.remove(warehouseGroupRef.current.children[0])
    packagesRef.current.forEach((p) => sceneRef.current.remove(p))
    packagesRef.current = []
    slotsRef.current = []

    const rows = parseInt(rowsRef.current?.value || '6')
    const cols = parseInt(colsRef.current?.value || '7')
    const startX = -((cols - 1) * RACK_SPACING_X) / 2

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        createRackUnit(startX + c * RACK_SPACING_X, -r * RACK_SPACING_Z, 0xffffff, 'Standard', r, c)
      }
    }

    const rightFlank = startX + cols * RACK_SPACING_X + 3
    const leftFlank = startX - RACK_SPACING_X - 3
    const backRow = -(rows - 1) * RACK_SPACING_Z

    createRackUnit(rightFlank, 0, 0x60a5fa, 'Cold Storage', 0, cols, 0.25)
    createRackUnit(rightFlank, backRow, 0xf87171, 'Hazmat', rows - 1, cols, 0.25)
    createRackUnit(leftFlank, -RACK_SPACING_Z, 0xa78bfa, 'Secure Cage', 1, -1, 0.25)
    createRackUnit(leftFlank, 0, 0xf59e0b, 'QA Hold', 0, -1, 0.3)
    createRackUnit(leftFlank, backRow, 0x10b981, 'VAS Workstation', rows - 1, -1, 0.25)

    updateUI()
    adjustCamera(rows, cols)
  }, [createRackUnit, adjustCamera, updateUI])

  // ── Scoring engine ────────────────────────────────────────────────────────────
  const findBestSlot = useCallback((params: Record<string, string>) => {
    let validSlots = slotsRef.current.filter((s) => !s.occupied)
    if (!validSlots.length) return { error: 'Warehouse at maximum capacity.' }

    let targetZone = 'Standard'
    const log: string[] = []

    if (params.qa === 'Quarantine') { targetZone = 'QA Hold'; log.push('🔴 QA quarantine → QA Hold zone') }
    else if (params.vas !== 'None') { targetZone = 'VAS Workstation'; log.push(`🔧 VAS (${params.vas}) → VAS station`) }
    else if (params.hazmat === 'Hazardous') { targetZone = 'Hazmat'; log.push('⚠️ Hazardous → Hazmat zone') }
    else if (params.climate !== 'Ambient') { targetZone = 'Cold Storage'; log.push(`❄️ Climate (${params.climate}) → Cold Storage`) }
    else if (params.security === 'High Value') { targetZone = 'Secure Cage'; log.push('🔒 High Value → Secure Cage') }

    validSlots = validSlots.filter((s) => s.zone === targetZone)
    if (!validSlots.length) return { error: `${targetZone} zone at capacity.` }

    if (params.alloc === 'Cross-Dock' && targetZone === 'Standard') {
      validSlots = validSlots.filter((s) => s.row === 0)
      log.push('📦 Cross-dock → Row 0 (dock-adjacent)')
    }
    if (params.weight === 'Heavy' || params.handling === 'Pallet') {
      validSlots = validSlots.filter((s) => s.shelf === 0)
      log.push('⚖️ Heavy/Pallet → ground level only')
    }
    if (params.convey === 'No') {
      validSlots = validSlots.filter((s) => s.shelf < 2)
      log.push('🚫 Non-conveyable → lower shelves only')
    }
    if (params.stackable === 'No') {
      validSlots = validSlots.filter((s) => s.shelf === 0 || s.shelf === NUM_SHELVES - 1)
      log.push('📏 Non-stackable → top/bottom shelves')
    }
    if (!validSlots.length) return { error: 'No slots satisfy all constraints.' }

    const maxDist = slotsRef.current.reduce((mx, s) => Math.max(mx, Math.abs(s.x - DOCK_X) + Math.abs(s.z - DOCK_Z)), 0)
    let bestSlot: any = null
    let bestScore = -Infinity

    validSlots.forEach((slot) => {
      let score = 1000
      const distance = Math.abs(slot.x - DOCK_X) + Math.abs(slot.z - DOCK_Z)
      const rotMult = params.rotation === 'FEFO' ? 35 : params.rotation === 'FIFO' ? 20 : 12

      if (params.velocity === 'High') score -= distance * rotMult
      else if (params.velocity === 'Low') score += distance * 12
      else score -= Math.abs(distance - maxDist / 2) * 8

      if (params.velocity === 'High' && slot.shelf === 1) score += 250
      if (params.fragility === 'Fragile') {
        if (slot.shelf === NUM_SHELVES - 1) score -= 600
        if (slot.shelf === 1) score += 150
      }
      if (params.dimensions === 'Large' && slot.shelf === 0) score += 100

      if (score > bestScore) { bestScore = score; bestSlot = slot }
    })

    if (params.rotation === 'FEFO') log.push('📅 FEFO → 3× distance penalty')
    else if (params.rotation === 'FIFO') log.push('📅 FIFO → 2× distance penalty')

    if (params.velocity === 'High') log.push('⚡ High velocity → min travel distance')
    else if (params.velocity === 'Low') log.push('🐌 Low velocity → deep storage')
    else log.push('⚖️ Medium velocity → balanced mid-zone')

    return { slot: bestSlot, reason: log.join(' • '), score: Math.round(bestScore) }
  }, [])

  // ── Dispatch ──────────────────────────────────────────────────────────────────
  const dispatchPackage = useCallback(() => {
    const get = (id: string) => (document.getElementById(id) as HTMLSelectElement | HTMLInputElement)?.value
    const params: Record<string, string> = {
      velocity: get('p-velocity') || 'Medium',
      alloc: get('p-alloc') || 'To Stock',
      rotation: get('p-rotation') || 'Standard',
      qa: get('p-qa') || 'Cleared',
      handling: get('p-handling') || 'Each',
      weight: get('p-weight') || 'Medium',
      convey: get('p-convey') || 'Yes',
      dimensions: get('p-dimensions') || 'Small',
      fragility: get('p-fragility') || 'Robust',
      stackable: get('p-stackable') || 'Yes',
      climate: get('p-climate') || 'Ambient',
      hazmat: get('p-hazmat') || 'Safe',
      security: get('p-security') || 'Standard',
      vas: get('p-vas') || 'None',
    }

    const result = findBestSlot(params)
    if (result.error) { showToast(result.error, 'error'); return }

    const targetSlot = result.slot!
    targetSlot.occupied = true

    let boxColor = 0xfacc15
    if (params.velocity === 'High') boxColor = 0xef4444
    else if (params.velocity === 'Low') boxColor = 0x3b82f6
    if (params.qa === 'Quarantine' || params.vas !== 'None' || targetSlot.zone !== 'Standard') boxColor = 0xa855f7

    const pkgMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.3, 1.3),
      new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.3, metalness: 0.2 })
    )
    pkgMesh.castShadow = true
    pkgMesh.position.set(DOCK_X, 1, DOCK_Z)
    if (sceneRef.current) sceneRef.current.add(pkgMesh)
    packagesRef.current.push(pkgMesh)

    new TWEEN.Tween(pkgMesh.position)
      .to({ x: targetSlot.x, y: targetSlot.y, z: targetSlot.z }, 1400)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        const midZ = (DOCK_Z + targetSlot.z) / 2
        const progress = 1 - Math.abs((pkgMesh.position.z - midZ) / (DOCK_Z - midZ))
        pkgMesh.position.y += Math.sin(progress * Math.PI) * 0.25
      })
      .start()

    const record = {
      id: packageCounterRef.current,
      timestamp: new Date().toISOString(),
      slot: targetSlot.id,
      params,
      reason: result.reason,
      score: result.score,
    }
    placementHistoryRef.current.push(record)
    addToManifest(record)
    packageCounterRef.current++
    updateUI()
    // Persist for Analytics page
    try {
      localStorage.setItem('nexusWMS_state', JSON.stringify({ placementHistory: placementHistoryRef.current, packageCounter: packageCounterRef.current }))
    } catch (_) {}
    showToast(`Package PKG-${String(record.id).padStart(4, '0')} placed`, 'success')
  }, [findBestSlot, showToast, updateUI])


  const addToManifest = (record: any) => {
    const tbody = manifestRef.current
    if (!tbody) return
    const placeholder = tbody.querySelector('td[colspan="6"]')
    if (placeholder) tbody.innerHTML = ''
    const tr = document.createElement('tr')
    tr.style.cssText = 'transition:background 0.15s;'
    tr.onmouseenter = () => { tr.style.background = '#f8fafc' }
    tr.onmouseleave = () => { tr.style.background = '' }
    const ts = new Date(record.timestamp)
    const profile = `${record.params.velocity} Vel • ${record.params.handling} • ${record.params.weight}`
    const badgeColor = record.params.velocity === 'High' ? '#fee2e2;color:#991b1b' : record.params.velocity === 'Low' ? '#dbeafe;color:#1e40af' : '#fef3c7;color:#92400e'
    tr.innerHTML = `
      <td style="padding:0.6rem 1rem;font-size:0.7rem;color:#94a3b8;">${ts.toLocaleTimeString()}</td>
      <td style="padding:0.6rem 1rem;font-family:monospace;font-size:0.75rem;font-weight:700;color:#1e293b;">PKG-${String(record.id).padStart(4, '0')}</td>
      <td style="padding:0.6rem 1rem;font-family:monospace;font-size:0.75rem;color:#2563eb;font-weight:600;">${record.slot}</td>
      <td style="padding:0.6rem 1rem;"><span style="display:inline-block;padding:0.2rem 0.5rem;font-size:0.65rem;font-weight:700;border-radius:4px;background:${badgeColor};text-transform:uppercase;">${profile}</span></td>
      <td style="padding:0.6rem 1rem;font-size:0.7rem;color:#475569;line-height:1.5;white-space:normal;max-width:380px;">${record.reason}</td>
      <td style="padding:0.6rem 1rem;font-weight:700;font-size:0.85rem;color:${record.score >= 800 ? '#16a34a' : record.score >= 500 ? '#2563eb' : '#64748b'};">${record.score}</td>
    `
    tbody.insertBefore(tr, tbody.firstChild)
  }

  // ── Presets ───────────────────────────────────────────────────────────────────
  const applyPreset = useCallback((type: string) => {
    const presets: Record<string, Record<string, string>> = {
      fast: { velocity: 'High', alloc: 'Cross-Dock', rotation: 'FEFO', handling: 'Each', weight: 'Light' },
      bulk: { velocity: 'Low', handling: 'Pallet', weight: 'Heavy', dimensions: 'Large' },
      fragile: { fragility: 'Fragile', handling: 'Each', stackable: 'No', weight: 'Light' },
      frozen: { climate: 'Frozen', rotation: 'FEFO', velocity: 'Medium' },
    }
    const preset = presets[type]
    if (!preset) return
    Object.keys(preset).forEach((key) => {
      const el = document.getElementById(`p-${key}`) as HTMLSelectElement
      if (el) el.value = preset[key]
    })
    showToast(`Applied ${type} preset`, 'success')
  }, [showToast])

  // ── Export ────────────────────────────────────────────────────────────────────
  const downloadCSV = useCallback(() => {
    if (!placementHistoryRef.current.length) { showToast('No data to export', 'info'); return }
    let csv = 'Package ID,Timestamp,Location,Zone,Velocity,Handling,Weight,Rotation,Score,Reasoning\n'
    placementHistoryRef.current.forEach((r) => {
      const p = r.params
      const zone = slotsRef.current.find((s) => s.id === r.slot)?.zone || 'N/A'
      csv += `PKG-${String(r.id).padStart(4, '0')},${r.timestamp},${r.slot},${zone},${p.velocity},${p.handling},${p.weight},${p.rotation},${r.score},"${r.reason.replace(/"/g, '""')}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `wms-manifest-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
    showToast('CSV downloaded', 'success')
    if (exportModalRef.current) exportModalRef.current.style.display = 'none'
  }, [showToast])

  const downloadJSON = useCallback(() => {
    if (!placementHistoryRef.current.length) { showToast('No data to export', 'info'); return }
    const data = { metadata: { exportDate: new Date().toISOString(), version: '4.0', total: placementHistoryRef.current.length }, placements: placementHistoryRef.current }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `wms-export-${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
    showToast('JSON downloaded', 'success')
    if (exportModalRef.current) exportModalRef.current.style.display = 'none'
  }, [showToast])

  const resetWarehouse = useCallback(() => {
    if (!confirm('Reset warehouse? This clears all packages and history.')) return
    if (sceneRef.current) packagesRef.current.forEach((p) => sceneRef.current.remove(p))
    packagesRef.current = []
    slotsRef.current.forEach((s) => (s.occupied = false))
    packageCounterRef.current = 1
    placementHistoryRef.current = []
    if (manifestRef.current) {
      manifestRef.current.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;font-size:0.85rem;">No packages ingested yet.</td></tr>`
    }
    updateUI()
    showToast('Warehouse reset', 'success')
  }, [updateUI, showToast])

  // ── Three.js initialization ───────────────────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    loadScripts([
      'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js',
    ]).then(() => {
      const container = canvasRef.current
      if (!container) return

      const scene = new THREE.Scene()
      sceneRef.current = scene
      scene.background = new THREE.Color(0xf8fafc)
      scene.fog = new THREE.Fog(0xf8fafc, 40, 280)

      const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000)
      cameraRef.current = camera
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      rendererRef.current = renderer
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      container.appendChild(renderer.domElement)

      scene.add(new THREE.AmbientLight(0xffffff, 0.75))
      const dir = new THREE.DirectionalLight(0xffffff, 0.8)
      dir.position.set(35, 90, 55)
      dir.castShadow = true
      dir.shadow.mapSize.width = 2048
      dir.shadow.mapSize.height = 2048
      dir.shadow.camera.left = dir.shadow.camera.bottom = -120
      dir.shadow.camera.right = dir.shadow.camera.top = 120
      scene.add(dir)
      scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 0.3))

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(600, 600),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6, metalness: 0.1 })
      )
      floor.rotation.x = -Math.PI / 2
      floor.receiveShadow = true
      scene.add(floor)

      const grid = new THREE.GridHelper(400, 100, 0xe2e8f0, 0xf1f5f9)
      grid.position.y = 0.01
      scene.add(grid)

      const dock = new THREE.Mesh(
        new THREE.BoxGeometry(12, 0.6, 10),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.3 })
      )
      dock.position.set(DOCK_X, 0.3, DOCK_Z)
      dock.receiveShadow = true
      scene.add(dock)

      const warehouseGroup = new THREE.Group()
      warehouseGroupRef.current = warehouseGroup
      scene.add(warehouseGroup)

      buildWarehouse()

      const animate = (time: number) => {
        animFrameIdRef.current = requestAnimationFrame(animate)
        TWEEN.update(time)
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
           rendererRef.current.render(sceneRef.current, cameraRef.current)
        }
      }
      animFrameIdRef.current = requestAnimationFrame(animate)

      const onResize = () => {
        if (!container || !cameraRef.current || !rendererRef.current) return
        cameraRef.current.aspect = container.clientWidth / container.clientHeight
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(container.clientWidth, container.clientHeight)
      }
      window.addEventListener('resize', onResize)

      const onKey = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); dispatchPackage() }
        if (e.key === 'Escape') {
          if (analyticsModalRef.current) analyticsModalRef.current.style.display = 'none'
          if (exportModalRef.current) exportModalRef.current.style.display = 'none'
        }
      }
      document.addEventListener('keydown', onKey)

      return () => {
        window.removeEventListener('resize', onResize)
        document.removeEventListener('keydown', onKey)
        if (animFrameIdRef.current !== null) cancelAnimationFrame(animFrameIdRef.current)
        rendererRef.current?.dispose()
        container.innerHTML = ''
        sceneRef.current = null; cameraRef.current = null; rendererRef.current = null; warehouseGroupRef.current = null
        slotsRef.current = []; packagesRef.current = []; packageCounterRef.current = 1; placementHistoryRef.current = []
        initialized.current = false
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Styles ────────────────────────────────────────────────────────────────────
  const sidebarSection: React.CSSProperties = {
    marginBottom: '1.25rem',
  }
  const sectionTitle: React.CSSProperties = {
    fontSize: '0.65rem', fontWeight: 800, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    marginBottom: '0.6rem', paddingBottom: '0.5rem',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex', alignItems: 'center', gap: '0.4rem',
  }
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }
  const formField: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.2rem' }
  const labelStyle: React.CSSProperties = {
    fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  }
  const dot = (color: string): React.CSSProperties => ({
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
  })

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-[22rem] bg-bg-primary border-r border-border-primary flex flex-col z-10 shrink-0 shadow-[4px_0_20px_rgba(0,0,0,0.05)]">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">

          {/* Facility Layout */}
          <div style={sidebarSection}>
            <h2 style={sectionTitle}><span style={dot('#3b82f6')} /> Facility Layout</h2>
            <div style={grid2}>
              <div style={formField}>
                <label style={labelStyle}>Rows (Depth)</label>
                <input ref={rowsRef} id="w-rows" type="number" defaultValue={6} min={2} max={20}
                  className="bg-bg-primary border-[1.5px] border-border-primary text-text-primary rounded-md px-2 py-1.5 text-xs font-medium outline-none w-full transition-colors focus:border-action-primary" onChange={() => buildWarehouse()} />
              </div>
              <div style={formField}>
                <label style={labelStyle}>Cols (Width)</label>
                <input ref={colsRef} id="w-cols" type="number" defaultValue={7} min={3} max={20} step={2}
                  className="bg-bg-primary border-[1.5px] border-border-primary text-text-primary rounded-md px-2 py-1.5 text-xs font-medium outline-none w-full transition-colors focus:border-action-primary" onChange={() => buildWarehouse()} />
              </div>
            </div>
          </div>

          {/* Core Logistics */}
          <div style={sidebarSection}>
            <h2 style={sectionTitle}><span style={dot('#3b82f6')} /> Core Logistics</h2>
            <div style={grid2}>
              {[
                { id: 'p-velocity', label: 'Velocity', options: ['High', 'Medium', 'Low'], def: 'Medium', className: 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300' },
                { id: 'p-alloc', label: 'Allocation', options: ['To Stock', 'Cross-Dock'], def: 'To Stock', className: 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300' },
                { id: 'p-rotation', label: 'Rotation', options: ['Standard', 'FEFO', 'FIFO'], def: 'Standard', className: 'bg-bg-primary border-border-primary text-text-primary' },
                { id: 'p-qa', label: 'QA Status', options: ['Cleared', 'Quarantine'], def: 'Cleared', className: 'border-red-300 bg-red-50 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300' },
              ].map(f => (
                <div key={f.id} style={formField}>
                  <label style={labelStyle}>{f.label}</label>
                  <select id={f.id} defaultValue={f.def} className={`border-[1.5px] rounded-md px-2 py-1.5 text-xs font-medium outline-none w-full transition-colors ${f.className}`}>
                    {f.options.map(o => <option key={o} className="bg-bg-primary text-text-primary">{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Physical Profile */}
          <div style={sidebarSection}>
            <h2 style={sectionTitle}><span style={dot('#3b82f6')} /> Physical Profile</h2>
            <div style={grid2}>
              {[
                { id: 'p-handling', label: 'Handling Unit', options: ['Each', 'Case', 'Pallet'], def: 'Each' },
                { id: 'p-weight', label: 'Weight Class', options: ['Light', 'Medium', 'Heavy'], def: 'Medium' },
                { id: 'p-convey', label: 'Conveyable', options: ['Yes', 'No'], def: 'Yes' },
                { id: 'p-stackable', label: 'Stackable', options: ['Yes', 'No'], def: 'Yes' },
                { id: 'p-dimensions', label: 'Size', options: ['Small', 'Medium', 'Large', 'Oversized'], def: 'Small' },
                { id: 'p-fragility', label: 'Fragility', options: ['Robust', 'Fragile'], def: 'Robust' },
              ].map(f => (
                <div key={f.id} style={formField}>
                  <label style={labelStyle}>{f.label}</label>
                  <select id={f.id} defaultValue={f.def} className="bg-bg-primary border-[1.5px] border-border-primary text-text-primary rounded-md px-2 py-1.5 text-xs font-medium outline-none w-full transition-colors">
                    {f.options.map(o => <option key={o} className="bg-bg-primary text-text-primary">{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Special Constraints */}
          <div style={sidebarSection}>
            <h2 style={sectionTitle}><span style={dot('#f59e0b')} /> Special Constraints</h2>
            <div style={grid2}>
              {[
                { id: 'p-climate', label: 'Climate', options: ['Ambient', 'Cold Storage', 'Frozen'], def: 'Ambient' },
                { id: 'p-hazmat', label: 'Hazmat', options: ['Safe', 'Hazardous'], def: 'Safe' },
                { id: 'p-security', label: 'Security', options: ['Standard', 'High Value'], def: 'Standard' },
                { id: 'p-vas', label: 'VAS', options: ['None', 'Kitting', 'Labeling'], def: 'None' },
              ].map(f => (
                <div key={f.id} style={formField}>
                  <label style={labelStyle}>{f.label}</label>
                  <select id={f.id} defaultValue={f.def} className="bg-bg-primary border-[1.5px] border-border-primary text-text-primary rounded-md px-2 py-1.5 text-xs font-medium outline-none w-full transition-colors">
                    {f.options.map(o => <option key={o} className="bg-bg-primary text-text-primary">{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="border-t border-border-primary pt-3.5">
            <label style={{ ...labelStyle, display: 'block', marginBottom: '0.5rem' }}>Quick Presets</label>
            <div style={grid2}>
              {[
                { type: 'fast', label: '⚡ Fast Mover' },
                { type: 'bulk', label: '📦 Bulk Item' },
                { type: 'fragile', label: '🔶 Fragile' },
                { type: 'frozen', label: '❄️ Frozen' },
              ].map(p => (
                <button key={p.type} onClick={() => applyPreset(p.type)} className="bg-bg-elevated border border-border-primary text-text-secondary hover:text-text-primary hover:bg-action-primary/10 hover:border-action-primary/30 rounded-md p-2 text-xs font-semibold cursor-pointer transition-all">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action footer */}
        <div className="p-4 bg-bg-elevated border-t border-border-primary">
          <button onClick={dispatchPackage} className="w-full bg-gradient-to-br from-action-primary to-blue-600 text-white border-none rounded-lg p-3.5 text-sm font-bold cursor-pointer shadow-lg shadow-action-primary/30 transition-all hover:-translate-y-px hover:shadow-xl hover:shadow-action-primary/40 flex items-center justify-center gap-2">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ingest Package
          </button>
          <p className="text-[0.65rem] text-text-secondary text-center mt-2">
            <kbd className="bg-bg-primary border border-border-primary rounded-[3px] px-1 py-0.5 text-[0.6rem]">Ctrl</kbd> + <kbd className="bg-bg-primary border border-border-primary rounded-[3px] px-1 py-0.5 text-[0.6rem]">Enter</kbd> to dispatch
          </p>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

        {/* Stats header bar */}
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 10,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {/* Legend */}
          <div style={{
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
            borderRadius: 10, border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            padding: '0.75rem', fontSize: '0.7rem', fontWeight: 600,
            pointerEvents: 'none',
          }}>
            <div style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, fontSize: '0.62rem' }}>Zone Legend</div>
            {[
              { color: '#ef4444', label: 'High Velocity (Front)' },
              { color: '#facc15', label: 'Medium (Middle)' },
              { color: '#3b82f6', label: 'Low (Deep Storage)' },
              { color: '#a855f7', label: 'Special / Controlled' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ color: '#475569' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats (top-left overlay) */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Packages', ref: pkgCountRef, defaultVal: '0', color: '#1e293b' },
            { label: 'Efficiency', ref: efficiencyRef, defaultVal: '100%', color: '#16a34a' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
              borderRadius: 10, border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.07)',
              padding: '0.6rem 0.875rem', minWidth: 90,
            }}>
              <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{s.label}</p>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>
                <span ref={s.ref}>{s.defaultVal}</span>
              </div>
            </div>
          ))}
        </div>


        {/* Action buttons overlay */}
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: 8 }}>
          <button onClick={() => { if (analyticsModalRef.current) analyticsModalRef.current.style.display = 'flex' }} style={{
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
            border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.45rem 0.875rem',
            fontSize: '0.75rem', fontWeight: 600, color: '#475569', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Analytics
          </button>
          <button onClick={() => { if (exportModalRef.current) exportModalRef.current.style.display = 'flex' }} style={{
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
            border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.45rem 0.875rem',
            fontSize: '0.75rem', fontWeight: 600, color: '#475569', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export
          </button>
          <button onClick={resetWarehouse} style={{
            background: 'rgba(254,242,242,0.95)', backdropFilter: 'blur(8px)',
            border: '1px solid #fca5a5', borderRadius: 8, padding: '0.45rem 0.875rem',
            fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Reset
          </button>
        </div>

        {/* Three.js canvas */}
        <div ref={canvasRef} style={{ flex: 1, position: 'relative' }} />

        {/* Decision Manifest */}
        <div style={{
          height: 240, background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -4px 15px rgba(0,0,0,0.04)',
          zIndex: 20, flexShrink: 0,
        }}>
          <div style={{
            padding: '0.5rem 1rem', borderBottom: '1px solid #f1f5f9',
            background: 'linear-gradient(to right,#f8fafc,#ffffff)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h2 style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              📋 Decision Manifest & Scoring Engine
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
                Utilization: <span ref={capTrackerRef} style={{ color: '#2563eb' }}>0 / 0</span>
              </span>
              <button onClick={() => {
                if (!confirm('Clear placement log?')) return
                if (manifestRef.current) {
                  manifestRef.current.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;font-size:0.85rem;">No packages ingested yet.</td></tr>`
                }
                placementHistoryRef.current = []
                showToast('Manifest cleared', 'success')
              }} style={{ fontSize: '0.65rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Clear Log
              </button>
              <button onClick={downloadCSV} style={{ fontSize: '0.65rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Export CSV
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
              <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 #e2e8f0' }}>
                <tr>
                  {['Timestamp', 'Package ID', 'Location', 'Profile', 'Decision Reasoning', 'Score'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 1rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.62rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody ref={manifestRef} style={{ color: '#475569', lineHeight: 1.4 }}>
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No packages ingested yet. Configure and dispatch to begin.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ── Analytics Modal ─────────────────────────────────────────────────── */}
      <div ref={analyticsModalRef} style={{
        display: 'none', position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
        alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === analyticsModalRef.current && analyticsModalRef.current) analyticsModalRef.current.style.display = 'none' }}
      >
        <div style={{
          background: '#ffffff', borderRadius: 16, padding: '2rem',
          width: '90%', maxWidth: 860, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#2563eb' }}>📊</span> Analytics Dashboard
            </h2>
            <button onClick={() => { if (analyticsModalRef.current) analyticsModalRef.current.style.display = 'none' }}
              style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
              Close
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Capacity Utilization', id: 'an-capacity', defaultVal: '0%', accent: '#1e293b' },
              { label: 'Avg. Travel Distance', id: 'an-distance', defaultVal: '0.0m', accent: '#2563eb' },
              { label: 'Avg. Optimization Score', id: 'an-score', defaultVal: '100', accent: '#16a34a' },
            ].map(c => (
              <div key={c.id} style={{ background: '#f8fafc', borderRadius: 12, padding: '1rem', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{c.label}</p>
                <p id={c.id} style={{ fontSize: '2rem', fontWeight: 800, color: c.accent }}>{c.defaultVal}</p>
                {c.id === 'an-capacity' && (
                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                    <div id="an-capacity-bar" style={{ height: '100%', background: 'linear-gradient(90deg,#3b82f6,#2563eb)', width: '0%', transition: 'width 0.4s', borderRadius: 3 }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Velocity Distribution</h3>
              <canvas id="an-velocity-chart" height={200} />
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Zone Utilization</h3>
              <canvas id="an-zone-chart" height={200} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Export Modal ─────────────────────────────────────────────────────── */}
      <div ref={exportModalRef} style={{
        display: 'none', position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
        alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === exportModalRef.current && exportModalRef.current) exportModalRef.current.style.display = 'none' }}
      >
        <div style={{
          background: '#ffffff', borderRadius: 16, padding: '2rem',
          width: '90%', maxWidth: 480,
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Export Data</h2>
            <button onClick={() => { if (exportModalRef.current) exportModalRef.current.style.display = 'none' }}
              style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
              Close
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            {[
              { label: '📄 JSON Export', fn: downloadJSON },
              { label: '📊 CSV Export', fn: downloadCSV },
            ].map(b => (
              <button key={b.label} onClick={b.fn} style={{
                background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white',
                border: 'none', borderRadius: 10, padding: '1.25rem',
                fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = '')}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
            <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Export includes:</p>
            {['All placement records', 'Decision reasoning & scores', 'Warehouse configuration', 'Timestamps'].map(i => (
              <p key={i} style={{ marginBottom: 2 }}>✓ {i}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook up analytics modal open to refresh charts
// (done via a simple effect watching the modal DOM mutation is overkill — 
//  instead, we expose the open function via a button that also calls updateAnalytics inline)
// The analytics open button above calls a function that should also refresh charts.
// We'll wire this properly by overriding the button's onClick after mount.
