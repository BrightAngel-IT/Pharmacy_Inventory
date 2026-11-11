import React, { useState, useEffect } from 'react'
import { Plus, X, ArrowRightLeft, Truck, User, Hash, FileText, Printer, CheckCircle2, Clock, Undo2, Edit2, AlertTriangle } from 'lucide-react'

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

  useEffect(() => {
    if (transferForm.sourceBranch) {
      loadSourceBranchStocks(transferForm.sourceBranch)
    } else {
      setSourceBranchStocks({})
    }
  }, [transferForm.sourceBranch])

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
    const newItem = { productId: '', unit: 'pcs', piecesPerUnit: 1, quantity: 1 }
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
    if (field === 'unit' && !['box', 'case', 'pack', 'dozen', 'bundle', 'roll', 'set'].includes(value)) {
      newItems[index].piecesPerUnit = 1
    }

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

  async function handleReceiveTrip(transferId, tripIndex, tripTitle) {
    if (!window.confirm(`Are you sure you have received ${tripTitle || `Trip ${tripIndex + 1}`}? Stock will be added to your branch inventory.`)) {
      return
    }

    try {
      const key = `${transferId}_${tripIndex}`
      setReceivingTripKey(key)
      const res = await api.post(`/transfers/${transferId}/trips/${tripIndex}/receive`, {}, {
        headers: { Authorization: `Bearer ${session.token}` }
      })
      onNotice({ type: 'success', text: res.data.message || 'Trip stock successfully received and added to inventory!' })
      await loadData()
      if (refreshCoreData) await refreshCoreData()
    } catch (err) {
      console.error(err)
      onNotice({ type: 'error', text: err.response?.data?.message || 'Failed to confirm trip receipt.' })
    } finally {
      setReceivingTripKey(null)
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

    try {
      const formattedProducts = transferForm.items.map(i => {
        const totalPieces = Number(i.quantity) * Number(i.piecesPerUnit || 1)
        return { 
          product: i.productId, 
          quantity: totalPieces,
          unit: i.unit || 'pcs',
          unitQty: Number(i.quantity),
          piecesPerUnit: Number(i.piecesPerUnit || 1)
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
            productName: prodObj?.name || 'Item',
            unit,
            unitQty,
            piecesPerUnit,
            quantity: totalTripPieces
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
                <select className="input" value={transferForm.sourceBranch} onChange={e => setTransferForm({...transferForm, sourceBranch: e.target.value})} required>
                  <option value="">-- Select Source --</option>
                  {branches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                </select>
              </label>

              <label className="field">
                <span>Destination Branch (Transfer To)</span>
                <select className="input" value={transferForm.destBranch} onChange={e => setTransferForm({...transferForm, destBranch: e.target.value})} required>
                  <option value="">-- Select Destination --</option>
                  {branches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                </select>
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
                const isBulk = ['box', 'case', 'pack', 'dozen', 'bundle', 'roll', 'set'].includes(item.unit)
                const availablePieces = sourceBranchStocks[item.productId] ?? null
                const totalPiecesNeeded = Number(item.quantity || 0) * Number(item.piecesPerUnit || 1)
                const isInsufficient = availablePieces !== null && totalPiecesNeeded > availablePieces

                return (
                  <div key={idx} className="cluster gap-2 align-center wrap-row p-2 panel-strong" style={{ borderRadius: '8px', border: isInsufficient ? '1px solid #ef4444' : '1px solid var(--border)' }}>
                    <div style={{ flex: 2, minWidth: '160px' }}>
                      <select
                        required
                        style={{ width: '100%', padding: '10px' }}
                        value={item.productId}
                        onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                      >
                        <option value="">-- Select Product --</option>
                        {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </select>
                      {item.productId && transferForm.sourceBranch && (
                        <div className="x-small mt-1" style={{ fontSize: '0.68rem', color: isInsufficient ? '#ef4444' : 'var(--text-soft)' }}>
                          Available in {transferForm.sourceBranch}: <strong>{availablePieces !== null ? `${availablePieces} pcs` : 'Loading...'}</strong>
                          {isInsufficient && <span style={{ color: '#ef4444', marginLeft: '6px', fontWeight: 'bold' }}>⚠️ Insufficient!</span>}
                        </div>
                      )}
                    </div>
                    
                    <select 
                      className="input" 
                      style={{ width: '100px', padding: '10px' }} 
                      value={item.unit} 
                      onChange={e => updateItem(idx, 'unit', e.target.value)}
                    >
                      <option value="pcs">Pieces</option>
                      <option value="box">Box</option>
                      <option value="pack">Pack</option>
                      <option value="case">Case</option>
                      <option value="dozen">Dozen</option>
                      <option value="bundle">Bundle</option>
                      <option value="roll">Roll</option>
                      <option value="set">Set</option>
                      <option value="kg">KG</option>
                      <option value="ltr">Liter</option>
                    </select>

                    <input
                      type="number"
                      required
                      min="1"
                      style={{ flex: 1, padding: '10px', maxWidth: '80px' }}
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    />

                    {isBulk && (
                      <div className="cluster gap-2" style={{ background: 'var(--bg-soft)', padding: '4px 8px', borderRadius: '8px' }}>
                        <span className="x-small muted whitespace-nowrap">Pieces inside:</span>
                        <input 
                          type="number" 
                          required 
                          min="1" 
                          className="input small" 
                          style={{ width: '60px' }}
                          value={item.piecesPerUnit} 
                          onChange={(e) => updateItem(idx, 'piecesPerUnit', e.target.value)} 
                        />
                      </div>
                    )}

                    <div className="cluster gap-1 justify-end ml-auto">
                      <span className="x-small font-bold" style={{ color: isInsufficient ? '#ef4444' : 'var(--text-soft)' }}>
                        = {totalPiecesNeeded} pcs
                      </span>
                      <button type="button" className="icon-btn ghost danger small" onClick={() => removeItem(idx)}>
                        <X size={14} />
                      </button>
                    </div>
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
                            const currentQty = tripItem ? tripItem.unitQty : 0

                            return (
                              <div key={itIdx} className="between align-center p-1 rounded" style={{ background: 'var(--panel)' }}>
                                <div className="stack gap-0">
                                  <strong className="x-small">{prod?.name || 'Item'}</strong>
                                  <span className="muted" style={{ fontSize: '0.65rem' }}>
                                    Total: {it.quantity} {it.unit || 'pcs'}
                                  </span>
                                </div>
                                <div className="cluster gap-1 align-center">
                                  <span className="x-small muted">Loaded:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={it.quantity}
                                    className="input compact small"
                                    style={{ width: '65px', textAlign: 'center', fontWeight: 'bold' }}
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

                                    {/* Separate Trip Confirm Button for Destination Admin */}
                                    {canConfirm && !isTripReceived && (
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
                                        title={`Receive this ${tr.tripNumber || `Trip ${trIdx + 1}`} at ${t.destBranch}`}
                                      >
                                        <CheckCircle2 size={11} style={{ marginRight: '2px', display: 'inline' }} />
                                        {isTripReceiving ? '...' : 'Receive Trip'}
                                      </button>
                                    )}

                                    {isTripReceived && (
                                      <span className="text-success font-bold" style={{ fontSize: '0.65rem' }}>
                                        Received
                                      </span>
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
                className="btn btn-outline small" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
