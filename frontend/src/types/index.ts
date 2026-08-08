export interface User {
  id: string
  email: string
  full_name: string
  role: 'customer' | 'warehouse_operator' | 'administrator' | 'system'
  is_active: boolean
  phone?: string
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface Product {
  id: string
  sku: string
  name: string
  description?: string
  category_id?: string
  unit_price: number
  weight_kg?: number
  abc_class?: string
  xyz_class?: string
  created_at: string
}

export interface OrderItem {
  id: string
  product_id: string
  quantity: number
  unit_price: number
}

export interface Order {
  id: string
  order_number: string
  customer_id: string
  status: string
  total_amount: number
  assigned_robot_id?: string
  task_id?: string
  items: OrderItem[]
  created_at: string
}

export interface ShipmentItem {
  id: string
  product_id?: string
  expected_quantity: number
  aruco_marker_id?: number
  crate_label?: string
  status: string
}

export interface Shipment {
  id: string
  shipment_number: string
  operator_id: string
  status: string
  assigned_robot_id?: string
  task_id?: string
  items: ShipmentItem[]
  created_at: string
}

export interface Robot {
  id: string
  name: string
  model: string
  serial_number: string
  status: string
  battery_level: number
  current_task_id?: string
  position_x?: number
  position_y?: number
  position_z?: number
  orientation_z?: number
  orientation_w?: number
  linear_velocity?: number
  angular_velocity?: number
  last_odom_at?: string
  is_enabled: boolean
  created_at: string
}

export interface RobotOdom {
  robot_id: string
  x: number
  y: number
  theta_z: number
  theta_w: number
  linear_velocity: number
  angular_velocity: number
}

export interface RobotCommand {
  robot_id: string
  command: 'go_to' | 'dock' | 'emergency_stop' | 'manual_velocity' | 'cancel_task'
  payload: Record<string, unknown>
}

export interface WarehouseMap {
  id: string
  label: string
  pgm_data?: string
  resolution: number
  origin_x: number
  origin_y: number
  width_px: number
  height_px: number
  zones_synced: boolean
  is_active: boolean
}

export interface InventoryItem {
  id: string
  product_id: string
  quantity: number
  reserved_quantity: number
  shelf_id?: string
  aruco_marker_id?: number
}

export interface RobotHealth {
  robot_id: string
  cpu_usage?: number
  memory_usage?: number
  temperature?: number
  connectivity: string
  error_count: number
  maintenance_due: boolean
}

export interface WebSocketMessage {
  type: string
  data: Record<string, unknown>
}
