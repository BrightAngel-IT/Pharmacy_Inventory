import React, { useState, useEffect } from 'react'
import { Plus, X, ArrowRightLeft, Truck, User, Hash, FileText, Printer, CheckCircle2, Clock, Undo2, Edit2, AlertTriangle, Eye, ShieldAlert } from 'lucide-react'
import { formatCurrency } from '../../utils'

/**
 * Module: InventoryTransfer
 * 
 * React UI page component representing the InventoryTransfer view.
 */

export function InventoryTransfer({ api, session, onNotice, refreshCoreData }) {
  const [branches, setBranches] = useState([])
  const [products, setProducts] = useState([])
  const [transfers, setTransfers] = useState([])
  const [transferForm, setTransferForm] = useState({
    sourceBranch: '',
    destBranch: '',
    items: [],
    transports: []
  })
  const [editingTransferId, setEditingTransferId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [sourceBranchSearch, setSourceBranchSearch] = useState('')
  const [destBranchSearch, setDestBranchSearch] = useState('')
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [sourceBranchSearch, destBranchSearch, vehicleSearch, startDate, endDate])

  const [sourceBranchStocks, setSourceBranchStocks] = useState({})
  const [sourceBranchBatches, setSourceBranchBatches] = useState([])

  useEffect(() => {
    if (transferForm.sourceBranch) {
      loadSourceBranchStocks(transferForm.sourceBranch)
      loadSourceBranchBatches(transferForm.sourceBranch)
    } else {
      setSourceBranchStocks({})
      setSourceBranchBatches([])
    }
  }, [transferForm.sourceBranch])

  async function loadSourceBranchBatches(branchName) {
    try {
      const res = await api.get(`/batches?branch=${encodeURIComponent(branchName)}&status=ACTIVE`, {
        headers: { Authorization: `Bearer ${session.token}` }
      })
      setSourceBranchBatches(res.data || [])
    } catch (e) {
      console.error('Failed to load branch batches:', e)
      setSourceBranchBatches([])
    }
  }

  async function loadSourceBranchStocks(branchName) {
    try {
      const res = await api.get(`/transfers/stock?branch=${encodeURIComponent(branchName)}`, {
        headers: { Authorization: `Bearer ${session.token}` }
      })
      const map = {}
      ;(res.data || []).forEach(bs => {
        map[bs.productId] = bs.quantityInStock
      })
      setSourceBranchStocks(map)
    } catch (e) {
      console.error('Failed to load branch stock:', e)
    }
  }

  const printWaybill = (transfer) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900')
    if (!printWindow) return

    const productRows = transfer.products?.map((p, idx) => {
      const unitLabel = (p.unit || 'pcs').toUpperCase()
      const isBulk = p.unit && p.unit !== 'pcs'
      const unitQtyVal = p.unitQty || (p.piecesPerUnit ? (p.quantity / p.piecesPerUnit) : (isBulk ? '-' : p.quantity))
      const unitQtyText = isBulk ? `${unitQtyVal} ${unitLabel}` : `${p.quantity} PCS`
      const piecesPerUnitText = isBulk ? `${p.piecesPerUnit || '-'} pcs / ${p.unit}` : '1 pc'
      const totalPieces = p.quantity

      return `
        <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
          <td style="padding: 10px 8px; text-align: center; font-weight: bold; color: #555;">${idx + 1}</td>
          <td style="padding: 10px 8px;">
            <strong style="font-size: 14px; color: #111;">${p.product?.name || 'Item'}</strong>
            ${p.product?.sku ? `<br><small style="color: #666; font-family: monospace;">SKU: ${p.product.sku}</small>` : ''}
          </td>
          <td style="padding: 10px 8px; text-align: center; color: #b45309; font-weight: bold; font-size: 13px;">
            ${unitQtyText}
          </td>
          <td style="padding: 10px 8px; text-align: center; color: #374151; font-weight: 500;">
            ${piecesPerUnitText}
          </td>
          <td style="padding: 10px 8px; text-align: right; font-weight: bold; font-size: 14px; color: #111;">
            ${totalPieces} PCS
          </td>
        </tr>
      `
    }).join('') || ''

    const transportRows = transfer.transports?.map((tr, idx) => {
      let breakdownHtml = ''
      if (tr.items && tr.items.length > 0) {
        breakdownHtml = tr.items
          .filter(i => Number(i.unitQty || i.quantity) > 0)
          .map(i => `<div style="font-size: 11px; color: #111;">• <strong>${i.productName || 'Product'}:</strong> ${i.unitQty} ${i.unit ? i.unit.toUpperCase() : 'PCS'} (${i.quantity} pcs)</div>`)
          .join('')
      }
      if (!breakdownHtml) {
        breakdownHtml = tr.dispatchedQty ? `<span style="color:#d97706; font-weight:bold;">${tr.dispatchedQty}</span>` : '-'
      }

      return `
        <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
          <td style="padding: 10px 8px; font-weight: bold; color: #b45309;">${tr.tripNumber || `Trip ${idx + 1}`}</td>
          <td style="padding: 10px 8px; font-weight: bold; font-size: 13px;">${tr.vehicleNumber || '-'}</td>
          <td style="padding: 10px 8px;">${tr.driverName || '-'} ${tr.driverPhone ? `<br><small style="color:#666;">${tr.driverPhone}</small>` : ''}</td>
          <td style="padding: 10px 8px;">${breakdownHtml}</td>
          <td style="padding: 10px 8px; font-size: 11px; color: #555;">${tr.notes || '-'}</td>
        </tr>
      `
    }).join('') || '<tr><td colspan="5" style="padding: 10px 8px; text-align: center; color: #888;">No vehicle details logged</td></tr>'

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Dispatch Note - Waybill</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: bold; text-transform: uppercase; margin: 0; }
          .subtitle { font-size: 12px; color: #666; margin-top: 4px; }
          .meta-grid { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f9f9f9; padding: 12px; border-radius: 6px; border: 1px solid #eee; }
          .meta-col { flex: 1; }
          .meta-label { font-size: 11px; text-transform: uppercase; color: #777; font-weight: bold; }
          .meta-val { font-size: 14px; font-weight: bold; color: #111; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; border: 1px solid #ccc; }
          th { background: #f0f0f0; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; border: 1px solid #ccc; }
          td { border: 1px solid #ddd; }
          .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; margin: 16px 0 8px; color: #333; border-left: 4px solid #f59e0b; padding-left: 8px; }
          .sig-grid { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
          .sig-box { width: 28%; text-align: center; border-top: 1px dashed #777; padding-top: 8px; font-size: 11px; color: #555; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">INVENTORY DISPATCH NOTE / WAYBILL</h1>
          <div class="subtitle">Inter-Branch Stock Transfer Document & Proof of Delivery</div>
        </div>

        <div class="meta-grid">
          <div class="meta-col">
            <div class="meta-label">Transfer Date & Time</div>
            <div class="meta-val">${new Date(transfer.createdAt).toLocaleString()}</div>
          </div>
          <div class="meta-col">
            <div class="meta-label">Source Branch (Dispatched From)</div>
            <div class="meta-val" style="color: #b45309;">${transfer.sourceBranch}</div>
          </div>
          <div class="meta-col">
            <div class="meta-label">Destination Branch (Deliver To)</div>
            <div class="meta-val" style="color: #047857;">${transfer.destBranch}</div>
          </div>
        </div>

        <div class="section-title">1. Transferred Products & Packaging Details</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Product Name / Description</th>
              <th style="text-align: center; width: 120px;">Packaging / Qty</th>
              <th style="text-align: center; width: 130px;">Pieces Per Box/Unit</th>
              <th style="text-align: right; width: 130px;">Total Pieces (PCS)</th>
            </tr>
          </thead>
          <tbody>
            ${productRows}
          </tbody>
        </table>

        <div class="section-title">2. Logistics, Vehicles & Trips Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Trip #</th>
              <th>Vehicle / Lorry No</th>
              <th>Driver & Contact</th>
              <th style="text-align: center;">Dispatched Qty / Boxes</th>
              <th>Notes / Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${transportRows}
          </tbody>
        </table>

        <div class="sig-grid">
          <div class="sig-box">
            <strong>Dispatched By (Sender)</strong><br><br>
            Signature & Stamp
          </div>
          <div class="sig-box">
            <strong>Transporter / Driver</strong><br><br>
            Signature & ID
          </div>
          <div class="sig-box">
            <strong>Received By (Destination)</strong><br><br>
            Signature & Date
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
  }

  // Helper to calculate pack & unit numbers accurately
  const getTripItemQuantities = (item, trip, transfer) => {
    const mainProd = (transfer.products || []).find(p => String(p.product?._id || p.product) === String(item.product?._id || item.product))
    
    let piecesPerPack = 1
    if (Number(mainProd?.piecesPerPack) > 1) {
      piecesPerPack = Number(mainProd.piecesPerPack)
    } else if (Number(item.piecesPerPack) > 1) {
      piecesPerPack = Number(item.piecesPerPack)
    } else if (Number(item.piecesPerUnit) > 1) {
      piecesPerPack = Number(item.piecesPerUnit)
    } else {
      const prodDef = products.find(p => String(p._id) === String(item.product?._id || item.product))
      const tpc = Number(prodDef?.tabletsPerCard || 12)
      const cpb = Number(prodDef?.cardsPerBox || 10)
      const bpc = Number(prodDef?.boxesPerCarton || 20)
      piecesPerPack = bpc * cpb * tpc
    }

    const packType = mainProd?.packType || item.packType || 'Carton'

    let dispatchedPacks = 0
    if (trip.dispatchedQty) {
      const match = String(trip.dispatchedQty).match(/(\d+(\.\d+)?)/)
      if (match) dispatchedPacks = Number(match[1])
    }

    if (dispatchedPacks <= 0 && Number(item.dispatchedPackQuantity) > 0) {
      dispatchedPacks = Number(item.dispatchedPackQuantity)
    } else if (dispatchedPacks <= 0 && Number(item.quantity || 0) > 0 && piecesPerPack > 1) {
      dispatchedPacks = Math.round(Number(item.quantity) / piecesPerPack)
    } else if (dispatchedPacks <= 0 && Number(item.packQuantity || 0) > 0) {
      dispatchedPacks = Number(item.packQuantity)
    }
    if (dispatchedPacks <= 0) dispatchedPacks = 1

    const arrivedPacks = item.receivedPackQuantity !== undefined ? item.receivedPackQuantity : dispatchedPacks
    const damagedPacks = item.damagedPackQuantity !== undefined ? item.damagedPackQuantity : 0
    const acceptedPacks = item.acceptedPackQuantity !== undefined ? item.acceptedPackQuantity : (arrivedPacks - damagedPacks)
    const quarantinedUnits = item.rejectedQuantity || (damagedPacks * piecesPerPack)
    const acceptedUnits = item.acceptedQuantity || (acceptedPacks * piecesPerPack)
    const dispatchedUnits = dispatchedPacks * piecesPerPack

    return {
      productName: item.productName || item.product?.name || mainProd?.product?.name || 'Product',
      packType,
      piecesPerPack,
      dispatchedPacks,
      dispatchedUnits,
      arrivedPacks,
      damagedPacks,
      quarantinedUnits,
      acceptedPacks,
      acceptedUnits
    }
  }

  // Print Inspection / Quarantine Slip for a specific Trip
  const printTripInspectionSlip = (transfer, trip, tripIdx) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900')
    if (!printWindow) return

    const tripTitle = trip.tripNumber || `Trip ${tripIdx + 1}`

    const itemRows = (trip.items || []).map((it, idx) => {
      const q = getTripItemQuantities(it, trip, transfer)
      return `
        <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
          <td style="padding: 10px 8px; font-weight: bold; color: #111;">
            ${q.productName}
            <div style="font-size: 11px; color: #666; font-weight: normal;">Pack Format: ${q.packType} (${q.piecesPerPack} tabs/pack)</div>
          </td>
          <td style="padding: 10px 8px; text-align: center; font-weight: bold;">
            ${q.dispatchedPacks} ${q.packType}
            <div style="font-size: 11px; color: #666;">(${q.dispatchedUnits} units)</div>
          </td>
          <td style="padding: 10px 8px; text-align: center; font-weight: bold;">
            ${q.arrivedPacks} ${q.packType}
          </td>
          <td style="padding: 10px 8px; text-align: center; background: #fef2f2; color: #dc2626; font-weight: bold;">
            ${q.damagedPacks} ${q.packType}
            <div style="font-size: 11px; font-weight: normal;">(${q.quarantinedUnits} quarantined)</div>
          </td>
          <td style="padding: 10px 8px; text-align: center; background: #ecfdf5; color: #047857; font-weight: bold;">
            ${q.acceptedPacks} ${q.packType}
            <div style="font-size: 11px; font-weight: normal;">(${q.acceptedUnits} added to stock)</div>
          </td>
        </tr>
      `
    }).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inspection & Quarantine Slip - ${tripTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: bold; text-transform: uppercase; margin: 0; color: #b91c1c; }
          .subtitle { font-size: 12px; color: #666; margin-top: 4px; }
          .meta-grid { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f9f9f9; padding: 12px; border-radius: 6px; border: 1px solid #eee; }
          .meta-col { flex: 1; }
          .meta-label { font-size: 11px; text-transform: uppercase; color: #777; font-weight: bold; }
          .meta-val { font-size: 14px; font-weight: bold; color: #111; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; border: 1px solid #ccc; }
          th { background: #f0f0f0; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; border: 1px solid #ccc; }
          td { border: 1px solid #ddd; }
          .notes-box { background: #fffbeb; border: 1px solid #fef3c7; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 12px; color: #92400e; }
          .sig-grid { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
          .sig-box { width: 45%; text-align: center; border-top: 1px dashed #777; padding-top: 8px; font-size: 11px; color: #555; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">TRANSIT INSPECTION & QUARANTINE SLIP</h1>
          <div class="subtitle">${tripTitle} Delivery Inspection • Proof of Acceptance & Damage Segregation</div>
        </div>

        <div class="meta-grid">
          <div class="meta-col">
            <div class="meta-label">Route</div>
            <div class="meta-val">${transfer.sourceBranch} ➔ ${transfer.destBranch}</div>
          </div>
          <div class="meta-col">
            <div class="meta-label">Vehicle & Driver</div>
            <div class="meta-val">${trip.vehicleNumber || 'N/A'} (${trip.driverName || 'No Driver'})</div>
          </div>
          <div class="meta-col">
            <div class="meta-label">Inspected & Received By</div>
            <div class="meta-val">${trip.receivedBy || 'Admin'}</div>
            <small style="color: #666;">${trip.receivedAt ? new Date(trip.receivedAt).toLocaleString() : ''}</small>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th style="text-align: center;">Dispatched</th>
              <th style="text-align: center;">Arrived</th>
              <th style="text-align: center; color: #b91c1c;">Damaged (Quarantine)</th>
              <th style="text-align: center; color: #047857;">Net Accepted</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        ${trip.receivedNotes ? `
          <div class="notes-box">
            <strong>Receiver's Inspection Notes / Damage Remarks:</strong><br>
            "${trip.receivedNotes}"
          </div>
        ` : ''}

        <div style="font-size: 11px; color: #777; margin-bottom: 20px;">
          * Note: Quarantined goods are strictly segregated from saleable inventory and logged for insurance/claims.
        </div>

        <div class="sig-grid">
          <div class="sig-box">
            <strong>Transporter / Driver Acknowledgment</strong><br><br>
            Signature & ID
          </div>
          <div class="sig-box">
            <strong>Receiving Branch Inspection Officer</strong><br><br>
            Signature & Date Stamp
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  // Print Complete Transfer Inspection & Quarantine Audit Report (All Trips Combined)
  const printAllTripsInspectionSlip = (transfer) => {
    const printWindow = window.open('', '_blank', 'width=850,height=950')
    if (!printWindow) return

    const tripsHtml = (transfer.transports || []).map((tr, trIdx) => {
      const tripTitle = tr.tripNumber || `Trip ${trIdx + 1}`
      const isReceived = tr.status === 'RECEIVED'
      const statusBadge = tr.inspectionDecision === 'PARTIAL' ? 'PARTIAL DAMAGE QUARANTINED' : (isReceived ? 'FULLY RECEIVED' : tr.status)

      const itemRows = (tr.items || []).map((it, idx) => {
        const q = getTripItemQuantities(it, tr, transfer)
        return `
          <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
            <td style="padding: 8px; font-weight: bold;">
              ${q.productName}
              <div style="font-size: 11px; color: #666; font-weight: normal;">Format: ${q.packType} (${q.piecesPerPack} tabs/pack)</div>
            </td>
            <td style="padding: 8px; text-align: center; font-weight: bold;">${q.dispatchedPacks} ${q.packType}</td>
            <td style="padding: 8px; text-align: center; font-weight: bold;">${q.arrivedPacks} ${q.packType}</td>
            <td style="padding: 8px; text-align: center; background: #fef2f2; color: #dc2626; font-weight: bold;">
              ${q.damagedPacks} ${q.packType} (${q.quarantinedUnits} tabs)
            </td>
            <td style="padding: 8px; text-align: center; background: #ecfdf5; color: #047857; font-weight: bold;">
              ${q.acceptedPacks} ${q.packType} (${q.acceptedUnits} tabs)
            </td>
          </tr>
        `
      }).join('')

      return `
        <div style="margin-bottom: 24px; border: 1px solid #ccc; border-radius: 6px; overflow: hidden;">
          <div style="background: #f1f5f9; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ccc;">
            <div>
              <strong style="font-size: 14px; color: #0f172a;">${tripTitle} — Vehicle: ${tr.vehicleNumber || 'N/A'} (Driver: ${tr.driverName || 'N/A'})</strong>
              <div style="font-size: 11px; color: #555;">Received by: ${tr.receivedBy || 'Pending'} • ${tr.receivedAt ? new Date(tr.receivedAt).toLocaleString() : ''}</div>
            </div>
            <div>
              <span style="font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 4px; background: ${tr.inspectionDecision === 'PARTIAL' ? '#fef2f2; color: #dc2626; border: 1px solid #fca5a5;' : '#ecfdf5; color: #047857; border: 1px solid #a7f3d0;'}">
                ${statusBadge}
              </span>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin: 0;">
            <thead>
              <tr style="background: #fafafa; color: #475569;">
                <th style="padding: 8px; text-align: left;">Product</th>
                <th style="padding: 8px; text-align: center;">Dispatched</th>
                <th style="padding: 8px; text-align: center;">Arrived</th>
                <th style="padding: 8px; text-align: center; color: #b91c1c;">Damaged (Quarantined)</th>
                <th style="padding: 8px; text-align: center; color: #047857;">Net Accepted</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows || '<tr><td colspan="5" style="padding: 8px; text-align: center; color: #888;">No inspection item details</td></tr>'}
            </tbody>
          </table>
          ${tr.receivedNotes ? `<div style="padding: 8px 12px; background: #fffbeb; font-size: 11px; color: #92400e; border-top: 1px solid #fef3c7;"><strong>Receiver Remarks:</strong> "${tr.receivedNotes}"</div>` : ''}
        </div>
      `
    }).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Full Inspection & Quarantine Audit Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: bold; text-transform: uppercase; margin: 0; color: #0f172a; }
          .subtitle { font-size: 12px; color: #666; margin-top: 4px; }
          .meta-grid { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f9f9f9; padding: 12px; border-radius: 6px; border: 1px solid #eee; }
          .meta-col { flex: 1; }
          .meta-label { font-size: 11px; text-transform: uppercase; color: #777; font-weight: bold; }
          .meta-val { font-size: 14px; font-weight: bold; color: #111; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 0px; font-size: 12px; border: 1px solid #ccc; }
          th { padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; border: 1px solid #ccc; }
          td { border: 1px solid #ddd; }
          .sig-grid { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; }
          .sig-box { width: 28%; text-align: center; border-top: 1px dashed #777; padding-top: 8px; font-size: 11px; color: #555; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">COMPLETE TRANSFER INSPECTION & QUARANTINE REPORT</h1>
          <div class="subtitle">Multi-Trip Audit Trail & Damage Discrepancy Statement</div>
        </div>

        <div class="meta-grid">
          <div class="meta-col">
            <div class="meta-label">Transfer Ref & Date</div>
            <div class="meta-val">TRF-${String(transfer._id).slice(-8).toUpperCase()}</div>
            <small style="color: #666;">${new Date(transfer.createdAt).toLocaleString()}</small>
          </div>
          <div class="meta-col">
            <div class="meta-label">Source Branch</div>
            <div class="meta-val" style="color: #b45309;">${transfer.sourceBranch}</div>
          </div>
          <div class="meta-col">
            <div class="meta-label">Destination Branch</div>
            <div class="meta-val" style="color: #047857;">${transfer.destBranch}</div>
          </div>
          <div class="meta-col">
            <div class="meta-label">Total Multi-Trips</div>
            <div class="meta-val">${transfer.transports?.length || 1} Vehicle Trips</div>
          </div>
        </div>

        ${tripsHtml}

        <div class="sig-grid">
          <div class="sig-box">
            <strong>Dispatched Officer (Sender)</strong><br><br>
            Signature & Date
          </div>
          <div class="sig-box">
            <strong>Receiving Officer (Destination)</strong><br><br>
            Signature & Date
          </div>
          <div class="sig-box">
            <strong>Super Admin / Auditor</strong><br><br>
            Approval & Stamp
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  async function loadData() {
    try {
      const [branchesRes, productsRes, transfersRes] = await Promise.all([
        api.get('/branches', { headers: { Authorization: `Bearer ${session.token}` } }),
        api.get('/products', { headers: { Authorization: `Bearer ${session.token}` } }),
        api.get('/transfers', { headers: { Authorization: `Bearer ${session.token}` } })
      ])
      setBranches(branchesRes.data || [])
      setProducts(productsRes.data.products || [])
      setTransfers(transfersRes.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const addItem = () => {
    const newItem = {
      productId: '',
      batchId: '',
      batchNumber: '',
      expiryDate: '',
      packType: '100 Pack',
      unit: 'pack',
      piecesPerUnit: 100,
      quantity: 1, // number of packs
      costPrice: 0,
      sellingPrice: 0,
      totalCost: 0,
      totalSelling: 0
    }
    const updatedItems = [...transferForm.items, newItem]

    // Also sync existing transports so they have an entry for this new item
    const updatedTrans = (transferForm.transports || []).map(tr => ({
      ...tr,
      items: updatedItems.map(it => {
        const existing = tr.items?.find(i => String(i.productId) === String(it.productId))
        return existing || {
          productId: it.productId,
          unit: it.unit || 'pcs',
          piecesPerUnit: it.piecesPerUnit || 1,
          unitQty: 0
        }
      })
    }))

    setTransferForm({
      ...transferForm,
      items: updatedItems,
      transports: updatedTrans
    })
  }

  const removeItem = (index) => {
    const removedItem = transferForm.items[index]
    const updatedItems = transferForm.items.filter((_, i) => i !== index)
    const updatedTrans = (transferForm.transports || []).map(tr => ({
      ...tr,
      items: (tr.items || []).filter(i => String(i.productId) !== String(removedItem?.productId))
    }))

    setTransferForm({
      ...transferForm,
      items: updatedItems,
      transports: updatedTrans
    })
  }

  const updateItem = (index, field, value) => {
    const newItems = [...transferForm.items]
    newItems[index][field] = value

    const currentItem = newItems[index]

    // If product changed, find default prices and reset batch
    if (field === 'productId') {
      const prod = products.find(p => String(p._id) === String(value))
      if (prod) {
        currentItem.costPrice = prod.costPrice || 0
        currentItem.sellingPrice = prod.price || 0
      }
      currentItem.batchId = ''
      currentItem.batchNumber = ''
      currentItem.expiryDate = ''
    }

    // If batch selected, auto-fill prices, expiry, and pack details from that batch!
    if (field === 'batchId') {
      const selectedBatch = sourceBranchBatches.find(b => String(b._id) === String(value))
      if (selectedBatch) {
        currentItem.batchNumber = selectedBatch.batchNumber
        currentItem.expiryDate = selectedBatch.expiryDate
        currentItem.costPrice = selectedBatch.costPricePerUnit || 0
        currentItem.sellingPrice = selectedBatch.sellingPricePerUnit || 0
        
        // Find product to determine packaging hierarchy options
        const prod = products.find(p => String(p._id) === String(currentItem.productId || selectedBatch.product?._id || selectedBatch.product))
        const tpc = Number(prod?.tabletsPerCard || selectedBatch.product?.tabletsPerCard || 12)
        const cpb = Number(prod?.cardsPerBox || selectedBatch.product?.cardsPerBox || 10)
        const bpc = Number(prod?.boxesPerCarton || selectedBatch.product?.boxesPerCarton || 20)
        const isTablet = (prod?.itemType || selectedBatch.product?.itemType) === 'TABLET_CAPSULE' || (prod?.category || '').toLowerCase() === 'medicine' || selectedBatch.packType === 'Master Carton'

        if (isTablet) {
          // Default to Master Carton from batch purchase
          currentItem.packType = selectedBatch.packType || 'Master Carton'
          currentItem.piecesPerUnit = selectedBatch.piecesPerPack || (bpc * cpb * tpc)
          currentItem.unit = 'carton'
        } else {
          currentItem.packType = selectedBatch.packType || 'Unit'
          currentItem.piecesPerUnit = selectedBatch.piecesPerPack || 1
          currentItem.unit = 'pcs'
        }
      }
    }

    // If packType changed
    if (field === 'packType') {
      const prod = products.find(p => String(p._id) === String(currentItem.productId))
      const selectedBatch = sourceBranchBatches.find(b => String(b._id) === String(currentItem.batchId))
      const tpc = Number(prod?.tabletsPerCard || selectedBatch?.product?.tabletsPerCard || 12)
      const cpb = Number(prod?.cardsPerBox || selectedBatch?.product?.cardsPerBox || 10)
      const bpc = Number(prod?.boxesPerCarton || selectedBatch?.product?.boxesPerCarton || 20)

      if (value === 'Master Carton') {
        currentItem.piecesPerUnit = selectedBatch?.piecesPerPack || (bpc * cpb * tpc)
        currentItem.unit = 'carton'
      } else if (value === 'Small Box') {
        currentItem.piecesPerUnit = cpb * tpc
        currentItem.unit = 'box'
      } else if (value === 'Card / Strip') {
        currentItem.piecesPerUnit = tpc
        currentItem.unit = 'strip'
      } else if (value === 'Single Tablet / Pc' || value === 'Loose/Single') {
        currentItem.piecesPerUnit = 1
        currentItem.unit = 'pcs'
      } else if (value === 'Standard Pack') {
        currentItem.piecesPerUnit = selectedBatch?.piecesPerPack || 1
        currentItem.unit = 'pack'
      }
    }

    if (field === 'unit' && !['box', 'case', 'pack', 'dozen', 'bundle', 'roll', 'set'].includes(value)) {
      newItems[index].piecesPerUnit = 1
    }

    // Auto calculate Total Cost and Total Selling Value
    const totalUnits = Number(currentItem.quantity || 0) * Number(currentItem.piecesPerUnit || 1)
    currentItem.totalCost = totalUnits * Number(currentItem.costPrice || 0)
    currentItem.totalSelling = totalUnits * Number(currentItem.sellingPrice || 0)

    // Keep transports in sync with updated unit / piecesPerUnit
    const updatedTrans = (transferForm.transports || []).map(tr => ({
      ...tr,
      items: newItems.map(it => {
        const existing = tr.items?.find(i => String(i.productId) === String(it.productId))
        return {
          productId: it.productId,
          unit: it.unit || 'pcs',
          piecesPerUnit: it.piecesPerUnit || 1,
          unitQty: existing ? existing.unitQty : 0
        }
      })
    }))

    setTransferForm({ ...transferForm, items: newItems, transports: updatedTrans })
  }

  const addTransport = () => {
    const nextTrip = (transferForm.transports?.length || 0) + 1
    // Pre-populate trip items from current transferForm.items
    const tripItems = (transferForm.items || []).map(it => ({
      productId: it.productId,
      unit: it.unit || 'pcs',
      piecesPerUnit: it.piecesPerUnit || 1,
      unitQty: 0
    }))

    setTransferForm({
      ...transferForm,
      transports: [
        ...(transferForm.transports || []),
        { 
          vehicleNumber: '', 
          driverName: '', 
          driverPhone: '', 
          tripNumber: `Trip ${nextTrip}`, 
          dispatchedQty: '', 
          items: tripItems,
          notes: '' 
        }
      ]
    })
  }

  const removeTransport = (index) => {
    setTransferForm({
      ...transferForm,
      transports: transferForm.transports.filter((_, i) => i !== index)
    })
  }

  const updateTransport = (index, field, value) => {
    const updated = [...(transferForm.transports || [])]
    updated[index][field] = value
    setTransferForm({ ...transferForm, transports: updated })
  }

  const updateTripItemQty = (tIdx, pId, qty) => {
    const updatedTrans = [...(transferForm.transports || [])]
    const trip = updatedTrans[tIdx]
    const numQty = qty === '' ? 0 : Number(qty)

    if (!trip.items) {
      trip.items = (transferForm.items || []).map(it => ({
        productId: it.productId,
        unit: it.unit || 'pcs',
        piecesPerUnit: it.piecesPerUnit || 1,
        unitQty: 0
      }))
    }
    const targetItem = trip.items.find(i => String(i.productId) === String(pId))
    const mainItem = transferForm.items.find(mi => String(mi.productId) === String(pId))

    if (targetItem) {
      targetItem.unitQty = numQty
      if (mainItem) {
        targetItem.unit = mainItem.unit || 'pcs'
        targetItem.piecesPerUnit = mainItem.piecesPerUnit || 1
      }
    } else {
      trip.items.push({
        productId: pId,
        unit: mainItem?.unit || 'pcs',
        piecesPerUnit: mainItem?.piecesPerUnit || 1,
        unitQty: numQty
      })
    }

    // Auto-update summary dispatchedQty text (e.g., "Product A: 2 boxes, Product B: 3 boxes")
    const summary = trip.items
      .filter(i => Number(i.unitQty) > 0)
      .map(i => {
        const prod = products.find(p => String(p._id) === String(i.productId))
        return `${Number(i.unitQty)} ${i.unit || 'pcs'} ${prod?.name ? `(${prod.name})` : ''}`
      }).join(', ')

    if (summary) {
      trip.dispatchedQty = summary
    } else {
      trip.dispatchedQty = ''
    }

    setTransferForm({ ...transferForm, transports: updatedTrans })
  }

  const [receivingId, setReceivingId] = useState(null)
  const [receivingTripKey, setReceivingTripKey] = useState(null)

  const [cancellingId, setCancellingId] = useState(null)

  async function handleCancelTransfer(transferId) {
    const reason = window.prompt('Are you sure you want to cancel / undo this transfer? The deducted stock will be restored back to the source branch.\n\nEnter reason (optional):')
    if (reason === null) return // User clicked cancel on prompt

    try {
      setCancellingId(transferId)
      const res = await api.post(`/transfers/${transferId}/cancel`, { reason }, {
        headers: { Authorization: `Bearer ${session.token}` }
      })
      onNotice({ type: 'success', text: res.data.message || 'Transfer cancelled and stock restored to source branch!' })
      await loadData()
      if (transferForm.sourceBranch) {
        await loadSourceBranchStocks(transferForm.sourceBranch)
      }
      if (refreshCoreData) await refreshCoreData()
    } catch (err) {
      console.error(err)
      onNotice({ type: 'error', text: err.response?.data?.message || 'Failed to cancel transfer.' })
    } finally {
      setCancellingId(null)
    }
  }

  function handleEditTransfer(transfer) {
    if (transfer.status === 'RECEIVED') {
      return onNotice({ type: 'error', text: 'Cannot edit an exchange that has already been received.' })
    }
    const anyTripReceived = transfer.transports?.some(tr => tr.status === 'RECEIVED')
    if (anyTripReceived) {
      return onNotice({ type: 'error', text: 'Cannot edit because one or more trips have already been received.' })
    }

    // Populate transfer form with existing transfer details
    const items = (transfer.products || []).map(p => ({
      productId: p.product?._id || p.product,
      unit: p.unit || 'pcs',
      piecesPerUnit: p.piecesPerUnit || 1,
      quantity: p.unitQty || (p.quantity / (p.piecesPerUnit || 1))
    }))

    const transports = (transfer.transports || []).map(tr => ({
      vehicleNumber: tr.vehicleNumber || '',
      driverName: tr.driverName || '',
      driverPhone: tr.driverPhone || '',
      tripNumber: tr.tripNumber || '',
      dispatchedQty: tr.dispatchedQty || '',
      notes: tr.notes || '',
      items: (tr.items || []).map(ti => ({
        productId: ti.product?._id || ti.product,
        unit: ti.unit || 'pcs',
        piecesPerUnit: ti.piecesPerUnit || 1,
        unitQty: ti.unitQty || 0
      }))
    }))

    setTransferForm({
      sourceBranch: transfer.sourceBranch,
      destBranch: transfer.destBranch,
      items,
      transports
    })
    setEditingTransferId(transfer._id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const [startingTripKey, setStartingTripKey] = useState(null)

  async function handleStartTrip(transferId, tripIndex, tripTitle) {
    if (!window.confirm(`Are you ready to dispatch ${tripTitle || `Trip ${tripIndex + 1}`}? This will record the start time and mark it as IN_TRANSIT.`)) {
      return
    }

    try {
      const key = `${transferId}_${tripIndex}`
      setStartingTripKey(key)
      const res = await api.post(`/transfers/${transferId}/trips/${tripIndex}/start`, {}, {
        headers: { Authorization: `Bearer ${session.token}` }
      })
      onNotice({ type: 'success', text: res.data.message || 'Trip started and vehicle is now in transit!' })
      await loadData()
      if (refreshCoreData) await refreshCoreData()
    } catch (err) {
      console.error(err)
      onNotice({ type: 'error', text: err.response?.data?.message || 'Failed to start trip.' })
    } finally {
      setStartingTripKey(null)
    }
  }

  const [inspectingTrip, setInspectingTrip] = useState(null)
  // inspectingTrip: { transferId, tripIndex, tripTitle, destBranch, sourceBranch, items: [{ ...item, receivedPackQuantity, damagedPackQuantity }], notes: '' }
  const [submittingInspection, setSubmittingInspection] = useState(false)
  const [viewingInspectionModal, setViewingInspectionModal] = useState(null)

  function openInspectionModal(transfer, trIdx, transport) {
    // If transport has items, use them, otherwise use transfer.products
    const tripItems = (transport.items && transport.items.length > 0)
      ? transport.items
      : (transfer.products || []).map(p => ({
          product: p.product?._id || p.product,
          productName: p.product?.name || 'Product',
          packType: p.packType || 'Packs',
          packQuantity: Math.ceil((p.packQuantity || p.quantity || 1) / (transfer.transports?.length || 1)),
          unitQty: Math.ceil((p.packQuantity || p.quantity || 1) / (transfer.transports?.length || 1)),
          piecesPerPack: p.piecesPerPack || 1,
          quantity: Math.ceil((p.quantity || 1) / (transfer.transports?.length || 1)),
        }))

    const initialInspectionItems = tripItems.map(item => {
      // Find matching main transfer product for formatting fallback
      const mainProd = (transfer.products || []).find(p => String(p.product?._id || p.product) === String(item.product?._id || item.product))
      
      // Determine true packaging pieces per pack from main product definition or fallback
      let piecesPerPack = 1
      if (Number(mainProd?.piecesPerPack) > 1) {
        piecesPerPack = Number(mainProd.piecesPerPack)
      } else if (Number(item.piecesPerPack) > 1) {
        piecesPerPack = Number(item.piecesPerPack)
      } else if (Number(item.piecesPerUnit) > 1) {
        piecesPerPack = Number(item.piecesPerUnit)
      } else if (mainProd?.packType === 'Master Carton') {
        const prodDef = products.find(p => String(p._id) === String(item.product?._id || item.product))
        const tpc = Number(prodDef?.tabletsPerCard || 12)
        const cpb = Number(prodDef?.cardsPerBox || 10)
        const bpc = Number(prodDef?.boxesPerCarton || 20)
        piecesPerPack = bpc * cpb * tpc
      }

      const packType = mainProd?.packType || item.packType || 'Master Carton'

      // Calculate exact cartons/packs dispatched in this trip:
      let dispatchedPacks = 0

      // If text says "2 carton (pendol)" or "2 boxes"
      if (transport.dispatchedQty) {
        const match = String(transport.dispatchedQty).match(/(\d+(\.\d+)?)/)
        if (match) dispatchedPacks = Number(match[1])
      }

      // If total tablets quantity is given (e.g. 4800 tablets) and piecesPerPack = 2400 -> 2 cartons
      if (dispatchedPacks <= 0 && Number(item.quantity || 0) > 0 && piecesPerPack > 1) {
        dispatchedPacks = Math.round(Number(item.quantity) / piecesPerPack)
      } else if (dispatchedPacks <= 0 && Number(item.packQuantity || 0) > 0) {
        dispatchedPacks = Number(item.packQuantity)
      } else if (dispatchedPacks <= 0 && Number(item.unitQty || 0) > 0) {
        dispatchedPacks = Number(item.unitQty)
      }

      if (dispatchedPacks <= 0) {
        dispatchedPacks = 1
      }

      return {
        product: item.product?._id || item.product,
        productName: item.productName || item.product?.name || mainProd?.product?.name || 'Product',
        packType: packType,
        dispatchedPackQuantity: dispatchedPacks,
        piecesPerPack: piecesPerPack,
        receivedPackQuantity: dispatchedPacks, // default to actual dispatched count for this trip (e.g. 2)
        damagedPackQuantity: 0, // default 0 damaged
      }
    })

    setInspectingTrip({
      transferId: transfer._id,
      tripIndex: trIdx,
      tripTitle: transport.tripNumber || `Trip ${trIdx + 1}`,
      vehicleNumber: transport.vehicleNumber,
      driverName: transport.driverName,
      sourceBranch: transfer.sourceBranch,
      destBranch: transfer.destBranch,
      items: initialInspectionItems,
      notes: ''
    })
  }

  async function submitInspection(decision) {
    if (!inspectingTrip) return

    if (decision === 'REJECTED') {
      if (!window.confirm(`Are you sure you want to REJECT this entire shipment (${inspectingTrip.tripTitle})? The goods will NOT be added to ${inspectingTrip.destBranch} stock.`)) {
        return
      }
    }

    if (decision === 'ACCEPTED') {
      for (const itm of inspectingTrip.items) {
        if (Number(itm.receivedPackQuantity || 0) > Number(itm.dispatchedPackQuantity || 0)) {
          return onNotice({
            type: 'error',
            text: `Arrived quantity for "${itm.productName}" (${itm.receivedPackQuantity}) cannot be greater than dispatched quantity (${itm.dispatchedPackQuantity}).`
          })
        }
        if (Number(itm.damagedPackQuantity || 0) > Number(itm.receivedPackQuantity || 0)) {
          return onNotice({
            type: 'error',
            text: `Damaged quantity for "${itm.productName}" (${itm.damagedPackQuantity}) cannot be greater than arrived quantity (${itm.receivedPackQuantity}).`
          })
        }
      }
    }

    try {
      setSubmittingInspection(true)
      const res = await api.post(`/transfers/${inspectingTrip.transferId}/trips/${inspectingTrip.tripIndex}/receive`, {
        decision,
        items: inspectingTrip.items.map(item => ({
          productId: item.product,
          receivedPackQuantity: Number(item.receivedPackQuantity || 0),
          damagedPackQuantity: Number(item.damagedPackQuantity || 0),
        })),
        notes: inspectingTrip.notes
      }, {
        headers: { Authorization: `Bearer ${session.token}` }
      })

      onNotice({ 
        type: 'success', 
        text: res.data.message || (decision === 'REJECTED' ? 'Trip shipment rejected and quarantined.' : 'Trip received and accepted stock added to inventory!') 
      })
      setInspectingTrip(null)
      await loadData()
      if (refreshCoreData) await refreshCoreData()
    } catch (err) {
      console.error(err)
      onNotice({ type: 'error', text: err.response?.data?.message || 'Failed to process trip inspection.' })
    } finally {
      setSubmittingInspection(false)
    }
  }

  async function handleReceiveTrip(transferId, tripIndex, tripTitle) {
    const t = transfers.find(tr => String(tr._id) === String(transferId))
    const tr = t?.transports?.[tripIndex]
    if (t && tr) {
      openInspectionModal(t, tripIndex, tr)
    }
  }

  async function handleReceive(transferId) {
    if (!window.confirm('Are you sure you have received and inspected all items in this transfer? Stock will be added to your branch inventory.')) {
      return
    }

    try {
      setReceivingId(transferId)
      const res = await api.post(`/transfers/${transferId}/receive`, {}, {
        headers: { Authorization: `Bearer ${session.token}` }
      })
      onNotice({ type: 'success', text: res.data.message || 'Stock successfully received and added to inventory!' })
      await loadData()
      if (refreshCoreData) await refreshCoreData()
    } catch (err) {
      console.error(err)
      onNotice({ type: 'error', text: err.response?.data?.message || 'Failed to confirm receipt.' })
    } finally {
      setReceivingId(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (transferForm.items.length === 0) return onNotice({ type: 'error', text: 'Add at least one item to transfer.' })
    if (transferForm.sourceBranch === transferForm.destBranch) return onNotice({ type: 'error', text: 'Source and destination branches must be different.' })

    // Strict batch and branch stock pre-check before dispatch
    for (let i = 0; i < transferForm.items.length; i++) {
      const item = transferForm.items[i]
      const totalPiecesNeeded = Number(item.quantity || 0) * Number(item.piecesPerUnit || 1)
      const selectedBatch = sourceBranchBatches.find(b => String(b._id) === String(item.batchId))
      
      if (selectedBatch && totalPiecesNeeded > Number(selectedBatch.availableQuantity || 0)) {
        const maxCartons = Math.floor(Number(selectedBatch.availableQuantity || 0) / Number(item.piecesPerUnit || 1))
        return onNotice({ 
          type: 'error', 
          text: `Batch ${selectedBatch.batchNumber} has only ${selectedBatch.availableQuantity} tablets (${maxCartons} ${item.packType || 'cartons'}) available. You requested ${item.quantity} ${item.packType || 'cartons'}.` 
        })
      }

      const branchStock = sourceBranchStocks[item.productId] ?? 0
      if (totalPiecesNeeded > branchStock) {
        return onNotice({
          type: 'error',
          text: `Insufficient total stock in ${transferForm.sourceBranch}. Available: ${branchStock} pcs, requested: ${totalPiecesNeeded} pcs.`
        })
      }
    }

    // Strict multi-trip distribution validation:
    // The sum of loaded items across all trips cannot exceed the transfer item's total quantity!
    if (transferForm.transports && transferForm.transports.length > 0) {
      for (const item of transferForm.items) {
        const prod = products.find(p => String(p._id) === String(item.productId))
        const totalDispatchedAcrossTrips = transferForm.transports.reduce((sum, tr) => {
          const tItem = tr.items?.find(ti => String(ti.productId) === String(item.productId))
          return sum + Number(tItem?.unitQty || 0)
        }, 0)

        const maxAllowed = Number(item.quantity || 0)
        if (totalDispatchedAcrossTrips > maxAllowed) {
          return onNotice({
            type: 'error',
            text: `Allocated trip quantity for "${prod?.name || 'item'}" (${totalDispatchedAcrossTrips} ${item.unit || 'boxes'}) exceeds the total Transfer Quantity (${maxAllowed} ${item.unit || 'boxes'}). Please adjust the quantities in Trip 1, Trip 2, etc.`
          })
        }
      }
    }

    try {
      const formattedProducts = transferForm.items.map(i => {
        const totalPieces = Number(i.quantity) * Number(i.piecesPerUnit || 1)
        const prod = products.find(p => String(p._id) === String(i.productId))
        const unitCost = Number(prod?.costPrice || 0)
        const unitSelling = Number(prod?.price || 0)
        return { 
          product: i.productId,
          batchId: i.batchId || undefined,
          batchNumber: i.batchNumber || '',
          expiryDate: i.expiryDate || undefined,
          packType: i.packType || (i.piecesPerUnit > 1 ? `${i.piecesPerUnit} Pack` : 'Pcs'),
          packQuantity: Number(i.quantity),
          piecesPerPack: Number(i.piecesPerUnit || 1),
          quantity: totalPieces,
          unit: i.unit || 'pcs',
          unitQty: Number(i.quantity),
          piecesPerUnit: Number(i.piecesPerUnit || 1),
          costPricePerUnit: unitCost,
          sellingPricePerUnit: unitSelling,
          totalCostValue: unitCost * totalPieces,
          totalSellingValue: unitSelling * totalPieces
        }
      })

      const formattedTransports = (transferForm.transports || []).map(tr => {
        const formattedTripItems = (tr.items || []).map(ti => {
          const matchingMainItem = transferForm.items.find(mi => String(mi.productId) === String(ti.productId))
          const unit = ti.unit || matchingMainItem?.unit || 'pcs'
          const piecesPerUnit = Number(ti.piecesPerUnit || matchingMainItem?.piecesPerUnit || 1)
          const unitQty = Number(ti.unitQty || 0)
          const totalTripPieces = unitQty * piecesPerUnit
          const prodObj = products.find(p => String(p._id) === String(ti.productId))

          return {
            product: ti.productId,
            productName: prodObj?.name || matchingMainItem?.name || 'Item',
            packType: matchingMainItem?.packType || 'Packs',
            packQuantity: unitQty,
            unit,
            unitQty,
            piecesPerPack: piecesPerUnit,
            piecesPerUnit,
            quantity: totalTripPieces,
            costPricePerUnit: matchingMainItem?.costPrice || prodObj?.costPrice || 0,
            sellingPricePerUnit: matchingMainItem?.sellingPrice || prodObj?.price || 0
          }
        })

        return {
          ...tr,
          items: formattedTripItems
        }
      })

      if (editingTransferId) {
        await api.put(`/transfers/${editingTransferId}`, {
          sourceBranch: transferForm.sourceBranch,
          destBranch: transferForm.destBranch,
          products: formattedProducts,
          transports: formattedTransports
        }, { headers: { Authorization: `Bearer ${session.token}` } })
        onNotice({ type: 'success', text: 'Inventory transfer successfully updated and stock adjusted.' })
      } else {
        await api.post('/transfers', {
          sourceBranch: transferForm.sourceBranch,
          destBranch: transferForm.destBranch,
          products: formattedProducts,
          transports: formattedTransports
        }, { headers: { Authorization: `Bearer ${session.token}` } })
        onNotice({ type: 'success', text: 'Inventory successfully transferred.' })
      }
      
      setTransferForm({ sourceBranch: '', destBranch: '', items: [], transports: [] })
      setEditingTransferId(null)
      setShowForm(false)
      loadData()
      if (transferForm.sourceBranch) {
        await loadSourceBranchStocks(transferForm.sourceBranch)
      }
      if (refreshCoreData) await refreshCoreData()
    } catch (err) {
      console.error(err)
      onNotice({ type: 'error', text: err.response?.data?.message || 'Transfer failed.' })
    }
  }

  const filteredTransfers = transfers.filter(t => {
    let match = true;
    if (sourceBranchSearch) {
      const q = sourceBranchSearch.toLowerCase();
      const sBranch = t.sourceBranch?.toLowerCase() || '';
      if (!sBranch.includes(q)) match = false;
    }
    if (destBranchSearch) {
      const q = destBranchSearch.toLowerCase();
      const dBranch = t.destBranch?.toLowerCase() || '';
      if (!dBranch.includes(q)) match = false;
    }
    if (vehicleSearch) {
      const q = vehicleSearch.toLowerCase();
      const hasVehicle = t.transports?.some(tr => 
        tr.vehicleNumber?.toLowerCase().includes(q) || 
        tr.driverName?.toLowerCase().includes(q) || 
        tr.tripNumber?.toLowerCase().includes(q) ||
        tr.notes?.toLowerCase().includes(q)
      );
      if (!hasVehicle) match = false;
    }
    const tDate = t.createdAt ? new Date(t.createdAt) : null;
    if (match && tDate && startDate) {
      const sDate = new Date(startDate);
      sDate.setHours(0,0,0,0);
      if (tDate < sDate) match = false;
    }
    if (match && tDate && endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23,59,59,999);
      if (tDate > eDate) match = false;
    }
    return match;
  });

  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage);
  const paginatedTransfers = filteredTransfers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="stack gap-6 p-6 animate-fade-in">
      <div className="between align-end">
        <div>
          <h2 className="title">Inventory Exchange</h2>
          <p className="muted">
            {session?.user?.role === 'super_admin'
              ? 'Transfer bulk products between branches and track incoming dispatches'
              : `Stock transfers and incoming inventory for ${session?.user?.branch || 'your branch'}`}
          </p>
        </div>
        {session?.user?.role === 'super_admin' && (
          <button 
            className="btn btn-primary glow-on-hover" 
            onClick={() => {
              setEditingTransferId(null)
              setTransferForm({ sourceBranch: '', destBranch: '', items: [], transports: [] })
              setShowForm(true)
            }}
          >
            <ArrowRightLeft size={18} />
            New Transfer
          </button>
        )}
      </div>

      {showForm && session?.user?.role === 'super_admin' && (
        <div className="panel p-8 glass-panel animate-fade relative">
          <button 
            className="icon-btn ghost absolute top-4 right-4" 
            onClick={() => {
              setShowForm(false)
              setEditingTransferId(null)
            }}
          >
            <X size={20} />
          </button>
          <form onSubmit={handleSubmit} className="stack gap-6">
            <div className="between align-center">
              <h3 className="accent-text" style={{ margin: 0 }}>
                {editingTransferId ? '✏️ Edit Transfer Details' : 'Transfer Details'}
              </h3>
              {editingTransferId && (
                <span className="badge warning small font-bold">
                  Editing In-Transit Transfer (Stock will re-adjust automatically)
                </span>
              )}
            </div>
            
            <div className="grid-2 gap-4">
              <label className="field">
                <span>Source Branch (Transfer From)</span>
                <select 
                  className="input" 
                  value={transferForm.sourceBranch} 
                  onChange={e => {
                    const newSource = e.target.value
                    setTransferForm(prev => ({
                      ...prev, 
                      sourceBranch: newSource,
                      // Automatically reset destination branch if it matches source
                      destBranch: prev.destBranch === newSource ? '' : prev.destBranch
                    }))
                  }} 
                  required
                >
                  <option value="">-- Select Source --</option>
                  {branches.map(b => (
                    <option 
                      key={b._id} 
                      value={b.name}
                      disabled={transferForm.destBranch && b.name === transferForm.destBranch}
                    >
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Destination Branch (Transfer To)</span>
                <select 
                  className="input" 
                  value={transferForm.destBranch} 
                  onChange={e => setTransferForm(prev => ({ ...prev, destBranch: e.target.value }))} 
                  required
                  style={{
                    borderColor: transferForm.sourceBranch && transferForm.destBranch && transferForm.sourceBranch === transferForm.destBranch ? '#ef4444' : undefined
                  }}
                >
                  <option value="">-- Select Destination --</option>
                  {branches
                    .filter(b => b.name !== transferForm.sourceBranch)
                    .map(b => (
                      <option key={b._id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                </select>
                {transferForm.sourceBranch && transferForm.destBranch && transferForm.sourceBranch === transferForm.destBranch && (
                  <span className="x-small text-danger font-bold mt-1">
                    ⚠️ Source and Destination branches cannot be the same!
                  </span>
                )}
              </label>
            </div>

            <div className="stack gap-3">
              <div className="between align-center">
                <span className="eyebrow" style={{ fontSize: '0.65rem' }}>Transfer Items</span>
                <button type="button" className="btn btn-outline small" onClick={addItem}>
                  <Plus size={12} /> Add Item
                </button>
              </div>

              {transferForm.items.map((item, idx) => {
                const availablePieces = sourceBranchStocks[item.productId] ?? null
                const totalPiecesNeeded = Number(item.quantity || 0) * Number(item.piecesPerUnit || 1)
                
                const selectedBatchObj = sourceBranchBatches.find(b => String(b._id) === String(item.batchId))
                const batchAvailPieces = selectedBatchObj ? Number(selectedBatchObj.availableQuantity || 0) : null
                
                // Max limit based on selected batch (or total branch stock if no batch selected)
                const limitPieces = batchAvailPieces !== null ? batchAvailPieces : availablePieces
                const maxPacksAllowed = limitPieces !== null ? Math.floor(limitPieces / Number(item.piecesPerUnit || 1)) : undefined
                const isInsufficient = limitPieces !== null && totalPiecesNeeded > limitPieces

                const productBatches = sourceBranchBatches.filter(b => String(b.product?._id || b.product) === String(item.productId))
                const currentProd = products.find(p => String(p._id) === String(item.productId))
                const isTabletCapsule = (currentProd?.itemType || selectedBatchObj?.product?.itemType) === 'TABLET_CAPSULE' || 
                                       (currentProd?.category || '').toLowerCase() === 'medicine' ||
                                       selectedBatchObj?.packType === 'Master Carton'
                
                const tpc = Number(currentProd?.tabletsPerCard || selectedBatchObj?.product?.tabletsPerCard || 12)
                const cpb = Number(currentProd?.cardsPerBox || selectedBatchObj?.product?.cardsPerBox || 10)
                const bpc = Number(currentProd?.boxesPerCarton || selectedBatchObj?.product?.boxesPerCarton || 20)
                const cartonPieces = selectedBatchObj?.piecesPerPack || (bpc * cpb * tpc)
                const boxPieces = cpb * tpc
                const cardPieces = tpc

                return (
                  <div key={idx} className="stack gap-2 p-3 panel-strong" style={{ borderRadius: '12px', border: isInsufficient ? '1px solid #ef4444' : '1px solid var(--border)' }}>
                    <div className="cluster gap-2 align-center flex-wrap">
                      <span className="badge neutral bold" style={{ width: '28px', textAlign: 'center' }}>#{idx + 1}</span>
                      
                      {/* Product Selector */}
                      <div style={{ flex: 2, minWidth: '200px' }}>
                        <select
                          required
                          className="input"
                          style={{ width: '100%' }}
                          value={item.productId}
                          onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                        >
                          <option value="">-- Select Medicine / Product --</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                        </select>
                      </div>

                      {/* Available Batches Dropdown */}
                      <div style={{ flex: 2, minWidth: '220px' }}>
                        <select
                          className="input"
                          style={{ width: '100%', borderColor: item.batchId ? 'var(--accent)' : 'var(--border)' }}
                          value={item.batchId || ''}
                          onChange={(e) => updateItem(idx, 'batchId', e.target.value)}
                          disabled={!item.productId}
                        >
                          <option value="">
                            {productBatches.length > 0 ? `-- Select Batch (${productBatches.length} Available) --` : '-- No Active Batches (Default) --'}
                          </option>
                          {productBatches.map(b => (
                            <option key={b._id} value={b._id}>
                              {b.batchNumber} | Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'N/A'} | Avail: {b.availableQuantity} pcs
                            </option>
                          ))}
                        </select>
                      </div>

                      <button type="button" className="icon-btn ghost hover-danger ml-auto" onClick={() => removeItem(idx)}>
                        <X size={16} />
                      </button>
                    </div>

                    {/* Stock & Batch Details Row */}
                    <div className="cluster gap-3 align-center flex-wrap pt-2" style={{ borderTop: '1px dashed var(--border)' }}>
                      <div className="cluster gap-1 align-center">
                        <span className="x-small muted">Packaging Unit:</span>
                        <select
                          className="input"
                          style={{ minWidth: '150px' }}
                          value={item.packType || (isTabletCapsule ? 'Master Carton' : 'Unit')}
                          onChange={e => updateItem(idx, 'packType', e.target.value)}
                        >
                          {isTabletCapsule ? (
                            <>
                              <option value="Master Carton">Master Carton ({cartonPieces} tabs)</option>
                              <option value="Small Box">Small Box ({boxPieces} tabs)</option>
                              <option value="Card / Strip">Card / Strip ({cardPieces} tabs)</option>
                              <option value="Single Tablet / Pc">Single Tablet (1 tab)</option>
                            </>
                          ) : (
                            <>
                              <option value="Standard Pack">
                                {selectedBatchObj?.packType ? `${selectedBatchObj.packType} (${selectedBatchObj.piecesPerPack || 1} pcs)` : 'Standard Pack (1 pc)'}
                              </option>
                              <option value="Loose/Single">Loose / 1 Pc</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="cluster gap-1 align-center">
                        <span className="x-small muted">Transfer Qty:</span>
                        <input
                          type="number"
                          required
                          min="1"
                          max={maxPacksAllowed !== undefined && maxPacksAllowed > 0 ? maxPacksAllowed : undefined}
                          className="input font-strong"
                          style={{ 
                            width: '80px',
                            borderColor: isInsufficient ? '#ef4444' : undefined,
                            color: isInsufficient ? '#ef4444' : 'inherit'
                          }}
                          placeholder="Packs"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        />
                        <span className="badge neutral x-small font-mono">
                          = {totalPiecesNeeded} tablets
                        </span>
                      </div>

                      {/* Auto Calculated Cost & Selling Values */}
                      <div className="cluster gap-2 align-center ml-auto">
                        <div className="stack" style={{ textAlign: 'right' }}>
                          <span className="x-small muted">Total Cost:</span>
                          <strong className="small font-mono">{formatCurrency(item.totalCost || 0)}</strong>
                        </div>

                        <div className="stack" style={{ textAlign: 'right' }}>
                          <span className="x-small muted" style={{ color: 'var(--accent-strong)' }}>Total Selling:</span>
                          <strong className="small font-mono" style={{ color: 'var(--accent-strong)' }}>{formatCurrency(item.totalSelling || 0)}</strong>
                        </div>
                      </div>
                    </div>

                    {item.productId && transferForm.sourceBranch && (
                      <div className="x-small" style={{ fontSize: '0.72rem', color: isInsufficient ? '#ef4444' : 'var(--text-soft)' }}>
                        Branch Stock: <strong>{availablePieces !== null ? `${availablePieces} pcs` : 'Loading...'}</strong>
                        {item.batchNumber && (
                          <span>
                            {' • '}Selected Batch: <strong>{item.batchNumber}</strong> ({selectedBatchObj ? `${selectedBatchObj.availableQuantity} tabs / ${Math.floor(selectedBatchObj.availableQuantity / Number(item.piecesPerUnit || 1))} max ${item.packType || 'packs'}` : ''})
                          </span>
                        )}
                        {item.expiryDate && <span> • Exp: <strong>{new Date(item.expiryDate).toLocaleDateString()}</strong></span>}
                        {isInsufficient && (
                          <span style={{ color: '#ef4444', marginLeft: '6px', fontWeight: 'bold' }}>
                            ⚠️ Insufficient Stock! Selected batch has only {selectedBatchObj ? `${Math.floor(selectedBatchObj.availableQuantity / Number(item.piecesPerUnit || 1))} ${item.packType || 'cartons'}` : `${availablePieces} tabs`}.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              
              {transferForm.items.length === 0 && (
                <div className="p-4 rounded border-dashed text-center muted small">
                  No items added yet. Click "Add Item" to start.
                </div>
              )}
            </div>

            {/* Transport & Trips Details Section */}
            <div className="stack gap-3 pt-2" style={{ borderTop: '1px dashed var(--border)' }}>
              <div className="between align-center">
                <div>
                  <span className="eyebrow" style={{ fontSize: '0.65rem' }}>Transport & Logistics (Vehicles / Trips)</span>
                  <p className="muted x-small" style={{ margin: 0 }}>Add vehicle numbers, drivers, boxes/pieces dispatched per trip</p>
                </div>
                <button type="button" className="btn btn-outline small" onClick={addTransport}>
                  <Truck size={14} /> Add Vehicle / Trip
                </button>
              </div>

              {/* Transport Cards Container: side-by-side in a responsive grid/cluster */}
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: (transferForm.transports && transferForm.transports.length > 1) ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', 
                  gap: '16px' 
                }}
              >
                {(transferForm.transports || []).map((trans, tIdx) => (
                  <div key={tIdx} className="stack gap-3 p-3 panel-strong" style={{ borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div className="between align-center">
                      <span className="badge warning font-bold x-small">
                        <Truck size={12} style={{ marginRight: '4px', display: 'inline' }} />
                        {trans.tripNumber || `Trip ${tIdx + 1}`}
                      </span>
                      <button type="button" className="icon-btn ghost danger small" onClick={() => removeTransport(tIdx)}>
                        <X size={14} />
                      </button>
                    </div>

                    <div className="grid-2 gap-2">
                      <label className="field">
                        <span className="x-small muted">Vehicle / Lorry No</span>
                        <input
                          type="text"
                          className="input small"
                          placeholder="WP CAA-1234"
                          value={trans.vehicleNumber}
                          onChange={(e) => updateTransport(tIdx, 'vehicleNumber', e.target.value)}
                        />
                      </label>

                      <label className="field">
                        <span className="x-small muted">Dispatched Boxes / Qty</span>
                        <input
                          type="text"
                          className="input small"
                          placeholder="e.g. 6 Boxes"
                          value={trans.dispatchedQty}
                          onChange={(e) => updateTransport(tIdx, 'dispatchedQty', e.target.value)}
                        />
                      </label>
                    </div>

                    <div className="grid-2 gap-2">
                      <label className="field">
                        <span className="x-small muted">Driver Name & Phone</span>
                        <input
                          type="text"
                          className="input small"
                          placeholder="Kamal (077...)"
                          value={trans.driverName}
                          onChange={(e) => updateTransport(tIdx, 'driverName', e.target.value)}
                        />
                      </label>

                      <label className="field">
                        <span className="x-small muted">Trip Title / Identifier</span>
                        <input
                          type="text"
                          className="input small"
                          placeholder={`Trip ${tIdx + 1}`}
                          value={trans.tripNumber}
                          onChange={(e) => updateTransport(tIdx, 'tripNumber', e.target.value)}
                        />
                      </label>
                    </div>

                    {/* Breakdown of products inside this trip */}
                    {transferForm.items && transferForm.items.length > 0 && (
                      <div className="p-2 rounded stack gap-2" style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
                        <div className="between align-center">
                          <span className="x-small font-bold text-primary">📦 Products Loaded into this Trip:</span>
                        </div>
                        <div className="stack gap-1">
                          {transferForm.items.map((it, itIdx) => {
                            const prod = products.find(p => String(p._id) === String(it.productId))
                            const tripItem = trans.items?.find(i => String(i.productId) === String(it.productId))
                            const currentQty = tripItem ? Number(tripItem.unitQty || 0) : 0
                            
                            // Calculate how much has been loaded across other trips (excluding this current trip)
                            const loadedInOtherTrips = (transferForm.transports || []).reduce((sum, tr, oIdx) => {
                              if (oIdx === tIdx) return sum
                              const otherItem = tr.items?.find(i => String(i.productId) === String(it.productId))
                              return sum + Number(otherItem?.unitQty || 0)
                            }, 0)

                            const maxRemainingForThisTrip = Math.max(0, Number(it.quantity || 0) - loadedInOtherTrips)
                            const isTripItemOverAllocated = (loadedInOtherTrips + currentQty) > Number(it.quantity || 0)

                            return (
                              <div key={itIdx} className="between align-center p-2 rounded" style={{ background: isTripItemOverAllocated ? 'rgba(239, 68, 68, 0.1)' : 'var(--panel)', border: isTripItemOverAllocated ? '1px solid #ef4444' : '1px solid var(--border)' }}>
                                <div className="stack gap-0">
                                  <strong className="x-small">{prod?.name || 'Item'}</strong>
                                  <span className="muted" style={{ fontSize: '0.65rem' }}>
                                    Total Transfer: {it.quantity} {it.unit || 'boxes'} (Remaining: {maxRemainingForThisTrip})
                                  </span>
                                </div>
                                <div className="cluster gap-1 align-center">
                                  <span className="x-small muted">Loaded:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={maxRemainingForThisTrip}
                                    className="input compact small"
                                    style={{ 
                                      width: '65px', 
                                      textAlign: 'center', 
                                      fontWeight: 'bold',
                                      borderColor: isTripItemOverAllocated ? '#ef4444' : undefined,
                                      color: isTripItemOverAllocated ? '#ef4444' : 'inherit'
                                    }}
                                    value={currentQty}
                                    onChange={(e) => updateTripItemQty(tIdx, it.productId, e.target.value)}
                                  />
                                  <span className="x-small font-bold" style={{ textTransform: 'uppercase' }}>
                                    {it.unit || 'pcs'}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <label className="field">
                      <span className="x-small muted">Proof / Waybill / Notes</span>
                      <input
                        type="text"
                        className="input small"
                        placeholder="Waybill No / Gate pass note"
                        value={trans.notes}
                        onChange={(e) => updateTransport(tIdx, 'notes', e.target.value)}
                      />
                    </label>
                  </div>
                ))}
              </div>

              {(!transferForm.transports || transferForm.transports.length === 0) && (
                <div className="p-3 rounded border-dashed text-center muted x-small">
                  No vehicle or trip details added. Click "Add Vehicle / Trip" if transferring via lorries/trips.
                </div>
              )}
            </div>

            <div className="cluster justify-end pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => {
                  setShowForm(false)
                  setEditingTransferId(null)
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingTransferId ? 'Save & Update Transfer' : 'Transfer Inventory'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {!showForm && (
        <div className="stack gap-4">
          <div className="between align-center mt-4 wrap-row gap-4">
            <h3 className="accent-text" style={{ margin: 0 }}>Transfer History</h3>
            
            <div className="cluster gap-3 wrap-row" style={{ background: 'var(--panel-strong)', padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div className="cluster gap-2">
                <span className="muted small font-bold">Source</span>
                <input 
                  type="text" 
                  placeholder="Search source..." 
                  value={sourceBranchSearch}
                  onChange={e => setSourceBranchSearch(e.target.value)}
                  className="input compact"
                  style={{ width: '120px' }}
                />
              </div>
              <div className="cluster gap-2">
                <span className="muted small font-bold">Dest</span>
                <input 
                  type="text" 
                  placeholder="Search dest..." 
                  value={destBranchSearch}
                  onChange={e => setDestBranchSearch(e.target.value)}
                  className="input compact"
                  style={{ width: '120px' }}
                />
              </div>
              <div className="cluster gap-2">
                <span className="muted small font-bold">Vehicle / Driver</span>
                <input 
                  type="text" 
                  placeholder="Vehicle / Driver..." 
                  value={vehicleSearch}
                  onChange={e => setVehicleSearch(e.target.value)}
                  className="input compact"
                  style={{ width: '140px' }}
                />
              </div>
              <div className="cluster gap-2">
                <span className="muted small font-bold">From</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="input compact"
                />
              </div>
              <div className="cluster gap-2">
                <span className="muted small font-bold">To</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="input compact"
                />
              </div>
              {(sourceBranchSearch || destBranchSearch || vehicleSearch || startDate || endDate) && (
                <button 
                  onClick={() => { setSourceBranchSearch(''); setDestBranchSearch(''); setVehicleSearch(''); setStartDate(''); setEndDate(''); }}
                  className="btn btn-ghost hover-danger"
                  style={{ padding: '0 8px' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          
          {filteredTransfers.length === 0 ? (
            <div className="panel p-8 glass-panel text-center">
              <ArrowRightLeft size={48} className="muted" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3>No Transfer History</h3>
              <p className="muted mb-4">Click "New Transfer" to move stock between branches.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ padding: '16px' }}>Date</th>
                    <th style={{ padding: '16px' }}>Source Branch</th>
                    <th style={{ padding: '16px' }}>Destination Branch</th>
                    <th style={{ padding: '16px' }}>Products Transferred</th>
                    <th style={{ padding: '16px' }}>Transport / Trips</th>
                    <th style={{ padding: '16px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '16px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransfers.map(t => {
                    // Destination Admin of that branch OR Super Admin when destination is Main Warehouse (or destination branch matches)
                    const isDestAdmin = (session?.user?.role === 'admin' && session?.user?.branch === t.destBranch) ||
                                        (session?.user?.role === 'super_admin' && (t.destBranch === 'Main Warehouse' || session?.user?.branch === t.destBranch))
                    const canConfirm = isDestAdmin && t.status === 'IN_TRANSIT'

                    return (
                      <tr key={t._id}>
                        <td style={{ padding: '16px' }}>{new Date(t.createdAt).toLocaleString()}</td>
                        <td style={{ padding: '16px' }}>
                          <span className="badge warning">{t.sourceBranch}</span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span className="badge success">{t.destBranch}</span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div className="stack gap-1">
                            {t.products.map((p, idx) => (
                              <div key={idx} className="cluster gap-2 align-center x-small">
                                <span className="muted">{p.quantity}x</span>
                                <strong>{p.product?.name || 'Unknown Product'}</strong>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          {t.transports && t.transports.length > 0 ? (
                            <div className="cluster gap-2 wrap-row align-center">
                              {t.transports.map((tr, trIdx) => {
                                const isTripReceived = tr.status === 'RECEIVED'
                                const tripKey = `${t._id}_${trIdx}`
                                const isTripReceiving = receivingTripKey === tripKey

                                return (
                                  <div 
                                    key={trIdx} 
                                    className="cluster gap-2 align-center p-2 rounded x-small"
                                    style={{ 
                                      background: isTripReceived ? 'rgba(16, 185, 129, 0.1)' : 'var(--panel-strong)', 
                                      border: isTripReceived ? '1px solid #10b981' : '1px solid var(--border)',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    <span className={`badge small font-bold ${isTripReceived ? 'success' : ''}`} style={{ fontSize: '0.65rem' }}>
                                      {isTripReceived ? '✓ ' : ''}{tr.tripNumber || `Trip ${trIdx + 1}`}
                                    </span>

                                    {tr.vehicleNumber && (
                                      <strong className="text-primary">{tr.vehicleNumber}</strong>
                                    )}

                                    {tr.dispatchedQty && (
                                      <span className="badge warning small" style={{ fontSize: '0.65rem' }}>
                                        {tr.dispatchedQty}
                                      </span>
                                    )}

                                    {tr.driverName && (
                                      <span className="muted" style={{ fontSize: '0.7rem' }}>
                                        • {tr.driverName} {tr.driverPhone ? `(${tr.driverPhone})` : ''}
                                      </span>
                                    )}

                                    {/* Start Trip Button (Source Branch Admin or Super Admin) */}
                                    {(!tr.tripStartedAt && !isTripReceived && (session.user.role === 'super_admin' || session.user.branch === t.sourceBranch)) && (
                                      <button
                                        type="button"
                                        className="btn btn-secondary small"
                                        style={{
                                          padding: '2px 8px',
                                          fontSize: '0.65rem',
                                          background: '#3b82f6',
                                          color: '#fff',
                                          marginLeft: '4px'
                                        }}
                                        onClick={() => handleStartTrip(t._id, trIdx, tr.tripNumber)}
                                        disabled={startingTripKey === `${t._id}_${trIdx}`}
                                        title="Lorry loaded and departing source branch"
                                      >
                                        <Truck size={11} style={{ marginRight: '2px', display: 'inline' }} />
                                        {startingTripKey === `${t._id}_${trIdx}` ? '...' : 'Start Trip'}
                                      </button>
                                    )}

                                    {tr.tripStartedAt && !isTripReceived && (
                                      <span className="badge info small font-mono" style={{ fontSize: '0.65rem', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                                        Started: {new Date(tr.tripStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}

                                    {/* Separate Trip Inspect & Confirm Button for Destination Admin */}
                                    {canConfirm && !isTripReceived && tr.status !== 'REJECTED' && (
                                      <button
                                        type="button"
                                        className="btn btn-primary small glow-on-hover"
                                        style={{ 
                                          padding: '2px 8px', 
                                          fontSize: '0.65rem', 
                                          background: '#10b981', 
                                          borderColor: '#059669', 
                                          color: '#fff',
                                          marginLeft: '4px' 
                                        }}
                                        onClick={() => handleReceiveTrip(t._id, trIdx, tr.tripNumber)}
                                        disabled={isTripReceiving}
                                        title={`Inspect & receive ${tr.tripNumber || `Trip ${trIdx + 1}`} at ${t.destBranch}`}
                                      >
                                        <CheckCircle2 size={11} style={{ marginRight: '2px', display: 'inline' }} />
                                        Inspect & Receive
                                      </button>
                                    )}

                                    {tr.status === 'REJECTED' && (
                                      <span className="text-danger font-bold" style={{ fontSize: '0.65rem' }}>
                                        ❌ Rejected & Returned
                                      </span>
                                    )}

                                    {isTripReceived && (
                                      <div className="cluster gap-1 align-center">
                                        <span className="text-success font-bold" style={{ fontSize: '0.65rem' }}>
                                          ✓ {tr.inspectionDecision === 'PARTIAL' ? 'Received (With Damage Quarantined)' : 'Fully Received'}
                                        </span>
                                        {tr.items && tr.items.some(it => (it.damagedPackQuantity || 0) > 0 || (it.rejectedQuantity || 0) > 0) && (
                                          <button
                                            type="button"
                                            className="badge warning small font-mono"
                                            style={{
                                              fontSize: '0.65rem',
                                              background: '#fef2f2',
                                              color: '#dc2626',
                                              borderColor: '#fca5a5',
                                              cursor: 'pointer',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                              padding: '2px 6px',
                                              borderRadius: '6px'
                                            }}
                                            onClick={() => setViewingInspectionModal({
                                              transfer: t,
                                              trip: tr,
                                              tripIndex: trIdx
                                            })}
                                            title="Click to view Quarantine & Inspection record"
                                          >
                                            <ShieldAlert size={11} />
                                            Quarantined: {tr.items.reduce((acc, it) => acc + (Number(it.damagedPackQuantity) || (Number(it.rejectedQuantity || 0) / Number(it.piecesPerPack || 1))), 0)} {tr.items[0]?.packType || 'Carton'}
                                            <Eye size={10} style={{ marginLeft: '2px' }} />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <span className="muted x-small">Direct / No vehicle logged</span>
                          )}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          {t.status === 'RECEIVED' ? (
                            <div className="stack align-center gap-1">
                              <span className="badge success small cluster gap-1 align-center" style={{ padding: '4px 8px' }}>
                                <CheckCircle2 size={12} /> ALL RECEIVED
                              </span>
                              {t.receivedBy && (
                                <span className="muted" style={{ fontSize: '0.65rem' }} title={`Received at: ${t.receivedAt ? new Date(t.receivedAt).toLocaleString() : ''}`}>
                                  by {t.receivedBy}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="stack align-center gap-1">
                              <span className="badge warning small cluster gap-1 align-center" style={{ padding: '4px 8px' }}>
                                <Clock size={12} /> IN TRANSIT
                              </span>
                              {t.transports && t.transports.some(tr => tr.status === 'RECEIVED') ? (
                                <span className="text-success font-bold" style={{ fontSize: '0.65rem' }}>Partially Received</span>
                              ) : (
                                <span className="muted" style={{ fontSize: '0.65rem' }}>Awaiting destination</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <div className="cluster gap-2 justify-center align-center">
                            {canConfirm && (!t.transports || t.transports.length === 0) && (
                              <button
                                className="btn btn-primary small glow-on-hover"
                                style={{ padding: '6px 12px', background: '#10b981', borderColor: '#059669', color: '#fff' }}
                                onClick={() => handleReceive(t._id)}
                                disabled={receivingId === t._id}
                                title={`Confirm items received at ${t.destBranch}`}
                              >
                                <CheckCircle2 size={14} />
                                {receivingId === t._id ? 'Receiving...' : 'Confirm Received'}
                              </button>
                            )}

                            {/* Edit Button: available before destination confirms */}
                            {session?.user?.role === 'super_admin' && t.status === 'IN_TRANSIT' && (!t.transports || !t.transports.some(tr => tr.status === 'RECEIVED')) && (
                              <button
                                className="btn btn-outline small hover-accent"
                                title="Edit transfer details or quantities"
                                onClick={() => handleEditTransfer(t)}
                                style={{ padding: '6px 10px' }}
                              >
                                <Edit2 size={14} /> Edit
                              </button>
                            )}

                            {/* Undo / Cancel Button: available before destination confirms */}
                            {(session?.user?.role === 'super_admin' || session?.user?.branch === t.sourceBranch) && t.status === 'IN_TRANSIT' && (!t.transports || !t.transports.some(tr => tr.status === 'RECEIVED')) && (
                              <button
                                className="btn btn-outline small hover-danger"
                                title="Cancel and restore deducted stock to source branch"
                                onClick={() => handleCancelTransfer(t._id)}
                                disabled={cancellingId === t._id}
                                style={{ padding: '6px 10px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              >
                                <Undo2 size={14} />
                                {cancellingId === t._id ? 'Reverting...' : 'Undo'}
                              </button>
                            )}

                            <button 
                              className="btn btn-outline small" 
                              title="Print Waybill / Dispatch Note"
                              onClick={() => printWaybill(t)}
                              style={{ padding: '6px 10px' }}
                            >
                              <Printer size={14} /> Slip
                            </button>

                            {t.transports && t.transports.some(tr => tr.status === 'RECEIVED' || tr.status === 'REJECTED' || (tr.items && tr.items.some(it => (it.damagedPackQuantity || 0) > 0 || (it.rejectedQuantity || 0) > 0))) && (
                              <button
                                className="btn btn-outline small hover-danger"
                                style={{ padding: '6px 10px', color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2', fontWeight: 600 }}
                                title="View Complete Inspection & Quarantine Audit Statement (All Trips)"
                                onClick={() => {
                                  setViewingInspectionModal({
                                    transfer: t,
                                    trip: null, // null means view all trips combined
                                    tripIndex: -1
                                  })
                                }}
                              >
                                <ShieldAlert size={14} /> Log
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {totalPages > 1 && (
            <div className="cluster justify-center mt-4 gap-4 align-center">
              <button 
                className="btn btn-outline small" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="muted small font-bold">Page {currentPage} of {totalPages}</span>
              <button 
                className="btn btn-outline small" em
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Inspect & Receive Trip Modal */}
      {inspectingTrip && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="animate-scale-up stack gap-4" style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#ffffff',
            color: '#1e293b',
            border: '2px solid #f59e0b',
            borderRadius: '18px',
            padding: '26px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)'
          }}>
            <div className="between align-center" style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '14px' }}>
              <div className="cluster gap-2 align-center">
                <Truck size={24} style={{ color: '#d97706' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                    Inspect & Receive {inspectingTrip.tripTitle}
                  </h3>
                  <span className="small font-mono" style={{ color: '#64748b' }}>
                    {inspectingTrip.sourceBranch} ➔ <strong style={{ color: '#0f172a' }}>{inspectingTrip.destBranch}</strong>
                    {inspectingTrip.vehicleNumber && ` • Lorry: ${inspectingTrip.vehicleNumber}`}
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                className="icon-btn ghost hover-danger" 
                onClick={() => setInspectingTrip(null)}
                disabled={submittingInspection}
                style={{ color: '#64748b', width: '32px', height: '32px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '12px 16px', color: '#166534', fontSize: '0.85rem', lineHeight: '1.4' }}>
              💡 <strong>Inspection Instructions:</strong> Enter the actual quantity unloaded from the vehicle (Arrived) and any defective or damaged quantity (Damaged). Net accepted stock (Arrived - Damaged) will be credited to <strong>{inspectingTrip.destBranch}</strong> inventory. Damaged items will be quarantined and logged in returns.
            </div>

            <div className="stack gap-3">
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Arrival Inspection & Count per Item
              </span>

              {inspectingTrip.items.map((item, iIdx) => {
                const arrived = Number(item.receivedPackQuantity || 0)
                const damaged = Number(item.damagedPackQuantity || 0)
                const accepted = Math.max(0, arrived - damaged)
                const totalAcceptedUnits = accepted * (item.piecesPerPack || 1)
                const totalDamagedUnits = damaged * (item.piecesPerPack || 1)

                return (
                  <div 
                    key={iIdx} 
                    className="stack gap-3" 
                    style={{ 
                      borderRadius: '14px', 
                      border: damaged > 0 ? '2px solid #ef4444' : '1px solid #cbd5e1',
                      background: '#f8fafc',
                      padding: '16px'
                    }}
                  >
                    <div className="between align-center">
                      <div className="stack" style={{ gap: '2px' }}>
                        <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{item.productName}</strong>
                        <span className="small font-mono" style={{ color: '#64748b' }}>
                          Format: {item.packType} ({item.piecesPerPack} tabs/pack)
                        </span>
                      </div>
                      <span className="badge font-mono" style={{ background: '#e2e8f0', color: '#1e293b', fontSize: '0.85rem', fontWeight: 700, padding: '4px 10px' }}>
                        Dispatched: {item.dispatchedPackQuantity} {item.packType}
                      </span>
                    </div>

                    <div className="grid-3 gap-3 pt-2" style={{ borderTop: '1px dashed #cbd5e1' }}>
                      <div className="stack gap-1">
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>1. Arrived Packs:</span>
                        <input
                          type="number"
                          min="0"
                          max={item.dispatchedPackQuantity}
                          className="font-strong"
                          style={{ 
                            padding: '8px 12px', 
                            fontSize: '1.05rem', 
                            borderRadius: '8px', 
                            border: item.receivedPackQuantity > item.dispatchedPackQuantity ? '2px solid #ef4444' : '1.5px solid #94a3b8',
                            background: item.receivedPackQuantity > item.dispatchedPackQuantity ? '#fef2f2' : '#ffffff',
                            color: item.receivedPackQuantity > item.dispatchedPackQuantity ? '#b91c1c' : '#0f172a'
                          }}
                          value={item.receivedPackQuantity}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value))
                            setInspectingTrip(prev => {
                              const newItems = [...prev.items]
                              newItems[iIdx].receivedPackQuantity = val
                              return { ...prev, items: newItems }
                            })
                          }}
                        />
                        <span className="x-small font-mono" style={{ color: item.receivedPackQuantity > item.dispatchedPackQuantity ? '#dc2626' : '#64748b' }}>
                          {item.receivedPackQuantity > item.dispatchedPackQuantity ? `⚠️ Cannot exceed dispatched (${item.dispatchedPackQuantity})` : `Max: ${item.dispatchedPackQuantity} ${item.packType}`}
                        </span>
                      </div>

                      <div className="stack gap-1">
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>2. Damaged Packs:</span>
                        <input
                          type="number"
                          min="0"
                          max={arrived}
                          className="font-strong"
                          style={{ 
                            padding: '8px 12px', 
                            fontSize: '1.05rem', 
                            borderRadius: '8px', 
                            border: item.damagedPackQuantity > arrived ? '2px solid #ef4444' : damaged > 0 ? '2px solid #f59e0b' : '1.5px solid #94a3b8',
                            background: item.damagedPackQuantity > arrived ? '#fef2f2' : '#ffffff',
                            color: item.damagedPackQuantity > arrived ? '#b91c1c' : '#0f172a'
                          }}
                          value={item.damagedPackQuantity}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value))
                            setInspectingTrip(prev => {
                              const newItems = [...prev.items]
                              newItems[iIdx].damagedPackQuantity = val
                              return { ...prev, items: newItems }
                            })
                          }}
                        />
                        <span className="x-small font-mono" style={{ color: item.damagedPackQuantity > arrived ? '#dc2626' : damaged > 0 ? '#d97706' : '#64748b', fontWeight: (item.damagedPackQuantity > arrived || damaged > 0) ? 700 : 'normal' }}>
                          {item.damagedPackQuantity > arrived 
                            ? `⚠️ Cannot exceed arrived packs (${arrived})` 
                            : damaged > 0 
                            ? `⚠️ ${totalDamagedUnits} tabs quarantined` 
                            : 'No damage'}
                        </span>
                      </div>

                      <div className="stack gap-1" style={{ background: '#ecfdf5', padding: '10px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857' }}>Net Accepted:</span>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: accepted > 0 ? '#059669' : '#dc2626' }}>
                          {accepted} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.packType}</span>
                        </div>
                        <span className="x-small font-mono" style={{ color: '#047857', fontWeight: 600 }}>
                          = {totalAcceptedUnits} units added
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="stack gap-1 mt-1">
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Inspection Notes / Remarks:</span>
                <textarea
                  rows="2"
                  placeholder="e.g. 2 boxes damaged during transit; remaining 8 boxes accepted in good condition."
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit'
                  }}
                  value={inspectingTrip.notes}
                  onChange={(e) => setInspectingTrip(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="between align-center pt-3" style={{ borderTop: '2px solid #e2e8f0', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-danger"
                style={{ padding: '10px 18px', display: 'flex', gap: '8px', alignItems: 'center', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 600 }}
                onClick={() => submitInspection('REJECTED')}
                disabled={submittingInspection}
                title="Reject delivery and send all back to source branch quarantine"
              >
                <X size={16} />
                {submittingInspection ? 'Processing...' : 'Reject Entire Trip'}
              </button>

              <div className="cluster gap-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setInspectingTrip(null)}
                  disabled={submittingInspection}
                  style={{ padding: '10px 18px', borderRadius: '10px', color: '#475569', borderColor: '#cbd5e1', background: '#f8fafc' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', background: '#10b981', borderColor: '#059669', color: '#fff', display: 'flex', gap: '8px', alignItems: 'center', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)' }}
                  onClick={() => submitInspection('ACCEPTED')}
                  disabled={submittingInspection}
                >
                  <CheckCircle2 size={18} />
                  {submittingInspection ? 'Updating Stock...' : 'Accept & Update Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Inspection & Quarantine Details Modal (Single Trip or All Trips Audit) */}
      {viewingInspectionModal && (() => {
        const isAllTrips = !viewingInspectionModal.trip
        const transfer = viewingInspectionModal.transfer
        const tripsToShow = isAllTrips 
          ? (transfer.transports || []) 
          : [viewingInspectionModal.trip]

        return (
          <div
            className="modal-overlay animate-fade"
            style={{
              position: 'fixed',
              inset: 0,
              backdropFilter: 'blur(10px)',
              background: 'rgba(15, 23, 42, 0.65)',
              zIndex: 1050,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <div
              className="panel p-6 animate-slide"
              style={{
                width: '100%',
                maxWidth: isAllTrips ? '850px' : '650px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#ffffff',
                borderRadius: '20px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1.5px solid #e2e8f0',
                color: '#0f172a'
              }}
            >
              <div className="between align-center pb-4" style={{ borderBottom: '1.5px solid #f1f5f9' }}>
                <div className="cluster gap-3 align-center">
                  <div style={{ background: '#fef2f2', color: '#dc2626', width: '42px', height: '42px', borderRadius: '12px', display: 'grid', placeItems: 'center', border: '1px solid #fecaca' }}>
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                      {isAllTrips ? 'Inspection & Quarantine Multi-Trip Statement' : 'Trip Inspection & Quarantine Record'}
                    </h3>
                    <span className="muted" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {isAllTrips 
                        ? `Transfer Reference: TRF-${String(transfer._id).slice(-8).toUpperCase()} • ${tripsToShow.length} Logistics Trip(s)`
                        : `${viewingInspectionModal.trip.tripNumber || `Trip ${viewingInspectionModal.tripIndex + 1}`} • Vehicle: ${viewingInspectionModal.trip.vehicleNumber || 'N/A'}`
                      }
                    </span>
                  </div>
                </div>

                <div className="cluster gap-2 align-center">
                  {isAllTrips ? (
                    <button
                      type="button"
                      className="btn btn-outline small cluster gap-1 align-center"
                      style={{ padding: '6px 12px', color: '#0f172a', borderColor: '#cbd5e1', background: '#f8fafc', fontWeight: 600, fontSize: '0.8rem' }}
                      onClick={() => printAllTripsInspectionSlip(transfer)}
                    >
                      <Printer size={13} /> Print Full Audit Slip
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline small cluster gap-1 align-center"
                      style={{ padding: '6px 12px', color: '#0f172a', borderColor: '#cbd5e1', background: '#f8fafc', fontWeight: 600, fontSize: '0.8rem' }}
                      onClick={() => printTripInspectionSlip(transfer, viewingInspectionModal.trip, viewingInspectionModal.tripIndex)}
                    >
                      <Printer size={13} /> Print Trip Slip
                    </button>
                  )}

                  <button
                    type="button"
                    className="icon-btn ghost"
                    style={{ borderRadius: '50%', color: '#64748b', cursor: 'pointer' }}
                    onClick={() => setViewingInspectionModal(null)}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="stack gap-4 py-4">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>Route</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                      {transfer.sourceBranch} ➔ {transfer.destBranch}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>Transfer Date</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                      {new Date(transfer.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>Overall Status</span>
                    <span className={`badge small font-bold ${transfer.status === 'RECEIVED' ? 'success' : 'warning'}`}>
                      {transfer.status === 'RECEIVED' ? 'ALL RECEIVED' : transfer.status}
                    </span>
                  </div>
                </div>

                {/* Iterate through each trip */}
                {tripsToShow.map((tr, trIdx) => {
                  const actualIdx = isAllTrips ? trIdx : viewingInspectionModal.tripIndex
                  const tripTitle = tr.tripNumber || `Trip ${actualIdx + 1}`
                  const isReceived = tr.status === 'RECEIVED'
                  const isRejected = tr.status === 'REJECTED'
                  const hasDamage = tr.items && tr.items.some(it => (it.damagedPackQuantity || 0) > 0 || (it.rejectedQuantity || 0) > 0)

                  return (
                    <div 
                      key={trIdx} 
                      style={{ 
                        border: '1.5px solid #e2e8f0', 
                        borderRadius: '14px', 
                        overflow: 'hidden',
                        background: '#ffffff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Trip Header with Print Slip Button */}
                      <div 
                        style={{ 
                          background: hasDamage ? '#fff1f2' : '#f8fafc', 
                          padding: '10px 14px', 
                          borderBottom: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                            {tripTitle} — Vehicle: {tr.vehicleNumber || 'N/A'} {tr.driverName ? `(${tr.driverName})` : ''}
                          </strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {tr.receivedBy ? `Inspected by: ${tr.receivedBy}` : 'Status: Pending Arrival'} 
                            {tr.receivedAt ? ` • ${new Date(tr.receivedAt).toLocaleTimeString()}` : ''}
                          </div>
                        </div>

                        <div className="cluster gap-2 align-center">
                          <span 
                            className="badge small font-mono" 
                            style={{ 
                              background: hasDamage ? '#fef2f2' : isReceived ? '#ecfdf5' : '#f8fafc',
                              color: hasDamage ? '#dc2626' : isReceived ? '#047857' : '#64748b',
                              borderColor: hasDamage ? '#fca5a5' : isReceived ? '#a7f3d0' : '#cbd5e1',
                              fontWeight: 700,
                              fontSize: '0.7rem'
                            }}
                          >
                            {tr.inspectionDecision === 'PARTIAL' ? '⚠️ PARTIAL DAMAGE' : isRejected ? '❌ REJECTED' : isReceived ? '✓ FULLY RECEIVED' : tr.status}
                          </span>

                          <button
                            type="button"
                            className="btn btn-outline small cluster gap-1 align-center"
                            style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '6px', color: '#0f172a', background: '#ffffff', borderColor: '#cbd5e1' }}
                            title={`Print individual slip for ${tripTitle}`}
                            onClick={() => printTripInspectionSlip(transfer, tr, actualIdx)}
                          >
                            <Printer size={11} /> Print Trip Slip
                          </button>
                        </div>
                      </div>

                      {/* Items table for this trip */}
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                              <th style={{ padding: '8px 12px' }}>Product</th>
                              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Dispatched</th>
                              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Arrived</th>
                              <th style={{ padding: '8px 12px', textAlign: 'center', color: '#dc2626' }}>Damaged (Quarantine)</th>
                              <th style={{ padding: '8px 12px', textAlign: 'center', color: '#059669' }}>Net Accepted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(tr.items || []).map((it, itIdx) => {
                              const q = getTripItemQuantities(it, tr, transfer)
                              return (
                                <tr key={itIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                                    {q.productName}
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'normal' }}>
                                      Format: {q.packType} ({q.piecesPerPack} tabs/pack)
                                    </div>
                                  </td>
                                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>
                                    {q.dispatchedPacks} {q.packType}
                                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>({q.dispatchedUnits} units)</div>
                                  </td>
                                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>
                                    {q.arrivedPacks} {q.packType}
                                  </td>
                                  <td style={{ padding: '8px 12px', textAlign: 'center', background: q.damagedPacks > 0 ? '#fef2f2' : 'transparent', color: '#dc2626', fontWeight: 800 }}>
                                    {q.damagedPacks} {q.packType}
                                    <div style={{ fontSize: '0.68rem', fontWeight: 600 }}>({q.quarantinedUnits} units)</div>
                                  </td>
                                  <td style={{ padding: '8px 12px', textAlign: 'center', background: '#ecfdf5', color: '#059669', fontWeight: 800 }}>
                                    {q.acceptedPacks} {q.packType}
                                    <div style={{ fontSize: '0.68rem', fontWeight: 600 }}>({q.acceptedUnits} units)</div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {tr.receivedNotes && (
                        <div style={{ background: '#fffbeb', borderTop: '1px solid #fef3c7', padding: '8px 12px', fontSize: '0.78rem', color: '#92400e' }}>
                          <strong>Receiver Notes:</strong> "{tr.receivedNotes}"
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="between align-center pt-3" style={{ borderTop: '1.5px solid #f1f5f9' }}>
                <span className="muted" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Quarantined goods are strictly segregated from destination branch inventory.
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '8px 20px', borderRadius: '10px', background: '#0f172a', color: '#ffffff', border: 'none', fontWeight: 600 }}
                  onClick={() => setViewingInspectionModal(null)}
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
