import { WarehouseShipmentsPage } from '../warehouse/WarehousePortal'

export function ShippingPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="t-page-title">Shipment Processing & Intake</h1>
        <p className="text-xs text-text-secondary">
          Inbound crate registration, ArUco tag verification & automated putaway task generation
        </p>
      </div>

      <WarehouseShipmentsPage />
    </div>
  )
}
