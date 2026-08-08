import { useEffect, useRef, useState, useCallback } from 'react'
import type { WebSocketMessage } from '../types'

interface WebSocketOptions {
  onMessage?: (msg: WebSocketMessage) => void
  onRobotPosition?: (data: any) => void
  onRobotStatus?: (data: any) => void
  onInventoryUpdate?: (data: any) => void
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const optionsRef = useRef(options)
  const isComponentMounted = useRef(true)
  const reconnectTimeout = useRef<number | null>(null)

  // Keep options ref up to date
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:8000/ws`)

    ws.onopen = () => {
      setIsConnected(true)
      // If we need to register this connection for a specific robot later:
      // ws.send(JSON.stringify({ type: 'register_robot', data: { robot_id: ... } }))
    }
    
    ws.onclose = () => {
      setIsConnected(false)
      wsRef.current = null
      if (isComponentMounted.current) {
        if (reconnectTimeout.current) window.clearTimeout(reconnectTimeout.current)
        reconnectTimeout.current = window.setTimeout(connect, 3000)
      }
    }
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WebSocketMessage
        const opts = optionsRef.current
        
        opts.onMessage?.(msg)
        
        switch (msg.type) {
          case 'robot_position':
            opts.onRobotPosition?.(msg.data)
            break
          case 'robot_status':
            opts.onRobotStatus?.(msg.data)
            break
          case 'inventory_update':
            opts.onInventoryUpdate?.(msg.data)
            break
        }
      } catch {
        // ignore malformed messages
      }
    }

    wsRef.current = ws
  }, [])

  useEffect(() => {
    isComponentMounted.current = true
    connect()
    
    return () => {
      isComponentMounted.current = false
      if (reconnectTimeout.current) window.clearTimeout(reconnectTimeout.current)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const sendCommand = useCallback((type: string, data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }))
    }
  }, [])

  return { isConnected, sendCommand }
}

