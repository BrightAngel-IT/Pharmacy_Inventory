/**
 * Module: Purchases
 * 
 * React UI page component representing the Purchases view.
 */

import React, { useEffect, useState } from 'react'
import {
  Truck,
  Plus,
  Search,
  Calendar,
  DollarSign,
  X,
  Trash2,
  ShoppingBag,
  FileText,
  Boxes,
  CheckCircle2
} from 'lucide-react'
import { SectionHeading } from '../../components/SectionHeading'
import { authConfig, readErrorMessage, formatCurrency, formatDate } from '../../utils'
import { Pagination } from '../../components/Pagination'

export default function Purchases({ api, session, onNotice, refreshCoreData }) {
  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [expandedPurchaseId, setExpandedPurchaseId] = useState(null)
  const itemsPerPage = 10

  const [formData, setFormData] = useState({
    supplier: '',
    branch: '',
    returnDays: 0,
    items: [], // { productId, unit, piecesPerUnit, quantity, costPrice }
    total: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [pRes, sRes, prRes, bRes] = await Promise.all([
        api.get('/purchases', authConfig(session.token)),
        api.get('/suppliers', authConfig(session.token)),
        api.get('/products', authConfig(session.token)),
        session.user.role === 'super_admin' ? api.get('/branches', authConfig(session.token)) : Promise.resolve({ data: [] })
      ])
      setPurchases(pRes.data)
      setSuppliers(sRes.data)
      setProducts(prRes.data.products || [])
      setBranches(bRes.data)
    } catch (err) {
      onNotice({ type: 'error', text: 'Failed to sync purchase records.' })
    } finally {
      setLoading(false)
    }
  }

  function addItem() {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          productId: '',
          batchNumber: '',
          expiryDate: '',
          unit: 'pack',
          packType: '100 Pack',
          piecesPerUnit: 100,
          quantity: 1, // number of packs
          costPrice: '', // cost per pack
          unitPrice: '', // cost per piece
          sellingPrice: '', // selling price per piece
        }
      ]
    })
  }

  function removeItem(index) {
    const newItems = formData.items.filter((_, i) => i !== index)
    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.costPrice)), 0)
    setFormData({ ...formData, items: newItems, total: newTotal })
  }

  function updateItem(index, field, value) {
    const newItems = [...formData.items]
    newItems[index][field] = value

    // Auto-set piecesPerUnit to 1 if unit is not a bulk unit
    if (field === 'unit' && !['box', 'carton', 'bag', 'case', 'pack', 'dozen', 'bundle', 'roll', 'set'].includes(value)) {
      newItems[index].piecesPerUnit = 1
    }

    const item = newItems[index]
    const ppu = Number(item.piecesPerUnit) || 1

    if (field === 'costPrice' && value !== '') {
      item.unitPrice = (Number(value) / ppu).toFixed(2)
      // Remove trailing .00 if needed, but toFixed is fine
    } else if (field === 'unitPrice' && value !== '') {
      item.costPrice = (Number(value) * ppu).toFixed(2)
    } else if (field === 'piecesPerUnit') {
      if (item.costPrice) {
        item.unitPrice = (Number(item.costPrice) / ppu).toFixed(2)
      } else if (item.unitPrice) {
        item.costPrice = (Number(item.unitPrice) * ppu).toFixed(2)
      }
    } else if (field === 'unit') {
      // if switched to pieces, clear unitPrice if we want to simplify, but it's fine.
      if (!['box', 'carton', 'bag', 'case', 'pack', 'dozen', 'bundle', 'roll', 'set'].includes(value)) {
        item.unitPrice = item.costPrice;
      }
    } else if (field === 'productId') {
      const selectedProduct = products.find(p => String(p._id) === String(value));
      if (selectedProduct) {
        item.itemType = selectedProduct.itemType || 'TABLET_CAPSULE';
        item.tabletsPerCard = Number(selectedProduct.tabletsPerCard || 12);
        item.cardsPerBox = Number(selectedProduct.cardsPerBox || 10);
        item.boxesPerCarton = Number(selectedProduct.boxesPerCarton || 20);

        if (item.itemType === 'TABLET_CAPSULE') {
          item.packType = 'Master Carton';
          // 1 Master Carton = boxesPerCarton * cardsPerBox * tabletsPerCard
          item.piecesPerUnit = item.boxesPerCarton * item.cardsPerBox * item.tabletsPerCard; // 20 * 10 * 12 = 2,400
        } else {
          item.packType = 'Master Carton';
          // 1 Master Carton = boxesPerCarton * cardsPerBox (Units per Box)
          item.piecesPerUnit = Math.max(1, item.boxesPerCarton * item.cardsPerBox);
        }

        if (selectedProduct.costPrice) {
          item.unitPrice = Number(selectedProduct.costPrice).toFixed(2);
          item.costPrice = (Number(selectedProduct.costPrice) * item.piecesPerUnit).toFixed(2);
        }
        if (selectedProduct.price) {
          item.sellingPrice = Number(selectedProduct.price).toFixed(2);
        }
      }
    } else if (field === 'boxesPerCarton' || field === 'cardsPerBox' || field === 'tabletsPerCard') {
      const bpc = Number(item.boxesPerCarton || 20);
      const cpb = Number(item.cardsPerBox || 10);
      const tpc = item.itemType === 'TABLET_CAPSULE' ? Number(item.tabletsPerCard || 12) : 1;
      item.piecesPerUnit = Math.max(1, bpc * cpb * tpc);
      // When packaging hierarchy changes, keep Unit Cost constant and adjust Carton Cost accordingly!
      if (item.unitPrice && Number(item.unitPrice) > 0) {
        item.costPrice = (Number(item.unitPrice) * item.piecesPerUnit).toFixed(2);
      } else if (item.costPrice) {
        item.unitPrice = (Number(item.costPrice) / item.piecesPerUnit).toFixed(2);
      }
    } else if (field === 'packType') {
      if (value === '100 Pack') {
        item.piecesPerUnit = 100;
        item.unit = 'pack';
      } else if (value === '50 Pack') {
        item.piecesPerUnit = 50;
        item.unit = 'pack';
      } else if (value === '20 Pack') {
        item.piecesPerUnit = 20;
        item.unit = 'pack';
      } else if (value === '10 Pack') {
        item.piecesPerUnit = 10;
        item.unit = 'pack';
      } else if (value === 'Bottle' || value === 'Tube' || value === 'Loose/Single') {
        item.piecesPerUnit = 1;
        item.unit = value.toLowerCase();
      }
      const newPpu = Number(item.piecesPerUnit) || 1;
      if (item.unitPrice) {
        item.costPrice = (Number(item.unitPrice) * newPpu).toFixed(2);
      } else if (item.costPrice) {
        item.unitPrice = (Number(item.costPrice) / newPpu).toFixed(2);
      }
    }

    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.costPrice)), 0)
    setFormData({ ...formData, items: newItems, total: newTotal })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.supplier) return onNotice({ type: 'error', text: 'Please select a supplier partner.' })
    if (session.user.role === 'super_admin' && !formData.branch) return onNotice({ type: 'error', text: 'Please select a destination branch.' })
    if (formData.items.length === 0) return onNotice({ type: 'error', text: 'Add at least one item to the procurement order.' })

    // Strict Pharmacy Validation
    for (let idx = 0; idx < formData.items.length; idx++) {
      const item = formData.items[idx];
      const lineNum = idx + 1;
      if (!item.productId) return onNotice({ type: 'error', text: `Item #${lineNum}: Please select a medicine / product.` })
      if (!item.batchNumber || !String(item.batchNumber).trim()) return onNotice({ type: 'error', text: `Item #${lineNum}: Batch Number is required for medical inventory.` })
      if (!item.expiryDate) return onNotice({ type: 'error', text: `Item #${lineNum}: Expiry Date is mandatory.` })
      if (!item.quantity || Number(item.quantity) <= 0) return onNotice({ type: 'error', text: `Item #${lineNum}: Please enter a valid quantity.` })
      if (!item.costPrice || Number(item.costPrice) <= 0) return onNotice({ type: 'error', text: `Item #${lineNum}: Please enter the purchase cost.` })
      if (!item.sellingPrice || Number(item.sellingPrice) <= 0) return onNotice({ type: 'error', text: `Item #${lineNum}: Please enter the retail selling price (Sell/Tab).` })
    }

    try {
      const formattedProducts = formData.items.map(i => {
        const totalPieces = Number(i.quantity) * Number(i.piecesPerUnit || 1)
        const costPerPiece = Number(i.unitPrice) || (Number(i.costPrice) / Number(i.piecesPerUnit || 1))
        return {
          product: i.productId,
          batchNumber: i.batchNumber || `BAT-${Date.now().toString().slice(-6)}`,
          expiryDate: i.expiryDate,
          packType: i.packType || `${i.piecesPerUnit || 1} Pack`,
          packQuantity: Number(i.quantity),
          piecesPerPack: Number(i.piecesPerUnit || 1),
          tabletsPerCard: Number(i.tabletsPerCard || 1),
          cardsPerBox: Number(i.cardsPerBox || 1),
          boxesPerCarton: Number(i.boxesPerCarton || 1),
          quantity: totalPieces,
          costPrice: costPerPiece,
          sellingPrice: Number(i.sellingPrice || 0),
          costPerPack: Number(i.costPrice || 0)
        }
      })

      await api.post('/purchases', {
        supplier: formData.supplier,
        branch: session.user.role === 'super_admin' ? formData.branch : session.user.branch,
        returnDays: formData.returnDays,
        products: formattedProducts,
        total: formData.total,
        date: new Date()
      }, authConfig(session.token))

      onNotice({ type: 'success', text: 'Purchase order processed. Supplier invoice generated.' })
      setShowForm(false)
      setFormData({ supplier: '', branch: '', returnDays: 0, items: [], total: 0 })
      if (refreshCoreData) await refreshCoreData()
      fetchData()
    } catch (err) {
      onNotice({ type: 'error', text: readErrorMessage(err) })
    }
  }

  const filteredPurchases = [...purchases]
    .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0))
    .filter(p => {
      let match = true;
    if (search) {
      const q = search.toLowerCase();
      const s = suppliers.find(sup => String(sup._id) === String(p.supplier?._id || p.supplier));
      const supName = (p.supplier?.name || s?.name || '').toLowerCase();
      const branchName = (p.branch?.name || p.branch || 'Main Branch').toLowerCase();
      if (!supName.includes(q) && !branchName.includes(q)) match = false;
    }
    const pDate = p.date ? new Date(p.date) : (p.createdAt ? new Date(p.createdAt) : null);
    if (match && pDate && startDate) {
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      if (pDate < sDate) match = false;
    }
    if (match && pDate && endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      if (pDate > eDate) match = false;
    }
    return match;
  })

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage)
  const paginatedPurchases = filteredPurchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="stack gap-6 animate-fade">
      <div className="between wrap-row panel p-6 glass-panel" style={{ borderLeft: '4px solid var(--accent)' }}>
        <div className="cluster gap-4">
          <div className="icon-btn" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: 'none' }}>
            <Truck size={24} />
          </div>
          <SectionHeading
            title="Procurement Log"
            text="Track incoming stock and supplier liabilities."
          />
        </div>
        <button className="btn btn-primary glow-on-hover" onClick={() => setShowForm(true)}>
          <Plus size={18} />
          Record Purchase
        </button>
      </div>

      <div className="panel glass-panel stack gap-4 p-4 overflow-hidden" style={{ borderLeft: '4px solid var(--accent)', borderRadius: '16px' }}>
        <div className="grid-12 gap-4 align-center wrap-row">
          <div className="grid-colspan-6 stack gap-1">
            <span className="muted small font-bold uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Search</span>
            <div className="input-shell compact" style={{ background: 'var(--bg-soft)', borderRadius: '10px', height: '38px', padding: '0 12px' }}>
              <Search size={16} className="muted" />
              <input
                type="text"
                placeholder="Search by supplier or branch..."
                className="ghost-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ fontSize: '0.85rem', color: 'var(--text)' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="icon-btn ghost hover-danger"
                  style={{ width: '20px', height: '20px', border: 'none', background: 'transparent', display: 'grid', placeItems: 'center' }}
                  title="Clear Search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="grid-colspan-6 cluster gap-3 align-end">
            <div className="stack gap-1 flex-1">
              <span className="muted small font-bold uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>From Date</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ height: '38px', borderRadius: '10px', background: 'var(--bg-soft)', border: '1px solid var(--border)', padding: '0 10px', color: 'var(--text)', fontSize: '0.85rem' }}
              />
            </div>
            <div className="stack gap-1 flex-1">
              <span className="muted small font-bold uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>To Date</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ height: '38px', borderRadius: '10px', background: 'var(--bg-soft)', border: '1px solid var(--border)', padding: '0 10px', color: 'var(--text)', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="panel p-8 glass-panel animate-fade relative">
          <button className="icon-btn ghost absolute top-4 right-4" onClick={() => setShowForm(false)}>
            <X size={20} />
          </button>
          <form onSubmit={handleSubmit} className="stack gap-6">
            <h3 className="accent-text">New Procurement Order</h3>

            <div className="grid-2 gap-4">
              <label className="field">
                <span>Select Supplier</span>
                <select className="input" value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} required>
                  <option value="">-- Select Partner --</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </label>

              {session.user.role === 'super_admin' && (
                <label className="field" style={{ flex: 1 }}>
                  <span>Target Branch</span>
                  <select className="input" value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })} required>
                    <option value="">-- Select Branch --</option>
                    {branches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                  </select>
                </label>
              )}

              <label className="field" style={{ flex: 1 }}>
                <span>Return Policy</span>
                <div className="cluster gap-2">
                  <select
                    className="input"
                    style={{ flex: 1 }}
                    value={formData.returnDays === '' ? 'custom' : [0, 3, 5, 7].includes(Number(formData.returnDays)) ? formData.returnDays : 'custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setFormData({ ...formData, returnDays: '' });
                      } else {
                        setFormData({ ...formData, returnDays: Number(val) });
                      }
                    }}
                  >
                    <option value={0}>No Returns (0 days)</option>
                    <option value={3}>3 Days</option>
                    <option value={5}>5 Days</option>
                    <option value={7}>7 Days</option>
                    <option value="custom">Custom</option>
                  </select>
                  {(![0, 3, 5, 7].includes(Number(formData.returnDays)) || formData.returnDays === '') && (
                    <div className="input-shell compact" style={{ width: '80px', padding: '0 8px' }}>
                      <input
                        className="ghost-input"
                        type="number"
                        placeholder="Days"
                        min="0"
                        value={formData.returnDays}
                        onChange={(e) => setFormData({ ...formData, returnDays: e.target.value ? Number(e.target.value) : '' })}
                      />
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="stack gap-4">
              <div className="between">
                <span className="eyebrow">Order Items</span>
                <button type="button" className="btn btn-secondary small" onClick={addItem}>
                  <Plus size={14} /> Add Line
                </button>
              </div>

              <div className="stack gap-3">
                {formData.items.map((item, idx) => {
                  return (
                    <div key={idx} className="stack gap-2 p-3 panel-strong wrap-row" style={{ borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div className="cluster gap-2 align-center flex-wrap">
                        <span className="badge neutral bold" style={{ width: '28px', textAlign: 'center' }}>#{idx + 1}</span>
                        <select
                          className="input flex-1"
                          style={{ minWidth: '220px' }}
                          value={item.productId}
                          onChange={e => updateItem(idx, 'productId', e.target.value)}
                          required
                        >
                          <option value="">-- Select Medicine / Product --</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                        </select>

                        <input
                          className="input"
                          style={{ width: '140px' }}
                          placeholder="Batch Number"
                          value={item.batchNumber || ''}
                          onChange={e => updateItem(idx, 'batchNumber', e.target.value)}
                          required
                        />

                        <div className="cluster gap-1 align-center">
                          <span className="x-small muted whitespace-nowrap">Exp:</span>
                          <input
                            className="input"
                            type="date"
                            style={{ width: '140px' }}
                            value={item.expiryDate ? item.expiryDate.split('T')[0] : ''}
                            onChange={e => updateItem(idx, 'expiryDate', e.target.value)}
                            required
                          />
                        </div>

                        <button type="button" className="icon-btn ghost hover-danger" onClick={() => removeItem(idx)}>
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Row 2: Packaging Hierarchy & Quantities */}
                      <div className="between align-center flex-wrap gap-3 pt-3" style={{ borderTop: '1px dashed var(--border)' }}>
                        <div className="cluster gap-2 align-center flex-wrap">
                          <span className="badge info font-bold" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                            {item.packType || 'Master Carton'}
                          </span>

                          {/* Master Carton Hierarchy Breakdown for Tablets */}
                          {item.itemType === 'TABLET_CAPSULE' && (
                            <div className="cluster gap-2 align-center p-2 rounded" style={{ background: 'var(--bg-soft)', border: '1px dashed var(--border)' }}>
                              <div className="cluster gap-1 align-center">
                                <span className="x-small muted font-bold">Boxes:</span>
                                <input
                                  className="input compact font-strong text-center"
                                  type="number"
                                  style={{ width: '60px', padding: '4px' }}
                                  value={item.boxesPerCarton || 20}
                                  onChange={e => updateItem(idx, 'boxesPerCarton', Number(e.target.value))}
                                  min="1"
                                />
                              </div>
                              <span className="muted x-small">×</span>
                              <div className="cluster gap-1 align-center">
                                <span className="x-small muted font-bold">Cards:</span>
                                <input
                                  className="input compact font-strong text-center"
                                  type="number"
                                  style={{ width: '60px', padding: '4px' }}
                                  value={item.cardsPerBox || 10}
                                  onChange={e => updateItem(idx, 'cardsPerBox', Number(e.target.value))}
                                  min="1"
                                />
                              </div>
                              <span className="muted x-small">×</span>
                              <div className="cluster gap-1 align-center">
                                <span className="x-small muted font-bold">Tabs:</span>
                                <input
                                  className="input compact font-strong text-center"
                                  type="number"
                                  style={{ width: '60px', padding: '4px' }}
                                  value={item.tabletsPerCard || 12}
                                  onChange={e => updateItem(idx, 'tabletsPerCard', Number(e.target.value))}
                                  min="1"
                                />
                              </div>
                              <span className="badge neutral x-small font-mono font-bold" style={{ color: 'var(--accent)' }}>
                                = {item.piecesPerUnit || 2400} tabs/carton
                              </span>
                            </div>
                          )}

                          {/* Master Carton Hierarchy Breakdown for Syrups, Creams, Injections, Medical Supplies */}
                          {item.itemType !== 'TABLET_CAPSULE' && (
                            <div className="cluster gap-2 align-center p-2 rounded" style={{ background: 'var(--bg-soft)', border: '1px dashed var(--border)' }}>
                              <div className="cluster gap-1 align-center">
                                <span className="x-small muted font-bold">Boxes:</span>
                                <input
                                  className="input compact font-strong text-center"
                                  type="number"
                                  style={{ width: '60px', padding: '4px' }}
                                  value={item.boxesPerCarton || 20}
                                  onChange={e => updateItem(idx, 'boxesPerCarton', Number(e.target.value))}
                                  min="1"
                                />
                              </div>
                              <span className="muted x-small">×</span>
                              <div className="cluster gap-1 align-center">
                                <span className="x-small muted font-bold">Units/Box:</span>
                                <input
                                  className="input compact font-strong text-center"
                                  type="number"
                                  style={{ width: '60px', padding: '4px' }}
                                  value={item.cardsPerBox || 1}
                                  onChange={e => updateItem(idx, 'cardsPerBox', Number(e.target.value))}
                                  min="1"
                                />
                              </div>
                              <span className="badge neutral x-small font-mono font-bold" style={{ color: 'var(--accent)' }}>
                                = {item.piecesPerUnit || (Number(item.boxesPerCarton || 20) * Number(item.cardsPerBox || 1))} units/carton
                              </span>
                            </div>
                          )}

                          <div className="cluster gap-1 align-center">
                            <span className="x-small muted font-bold">Cartons:</span>
                            <input
                              className="input font-strong"
                              type="number"
                              style={{ width: '80px', textAlign: 'center', borderColor: 'var(--accent)' }}
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                              required
                              min="1"
                            />
                            <span className="badge neutral small font-mono font-bold">
                              = {Number(item.quantity || 1) * Number(item.piecesPerUnit || 1)} {item.itemType === 'TABLET_CAPSULE' ? 'Tablets' : 'Units'}
                            </span>
                          </div>
                        </div>

                        {/* Pricing Inputs - High Visibility Inputs with Clear Labels */}
                        <div className="cluster gap-3 align-center flex-wrap" style={{ minWidth: '380px' }}>
                          <div className="stack" style={{ gap: '3px' }}>
                            <span className="x-small muted font-bold uppercase" style={{ fontSize: '0.65rem' }}>Cost / Carton</span>
                            <input
                              className="input font-strong"
                              type="number"
                              style={{ width: '120px', padding: '6px 10px' }}
                              placeholder="Carton Cost"
                              value={item.costPrice}
                              onChange={e => updateItem(idx, 'costPrice', e.target.value)}
                              required
                              min="0"
                              step="0.01"
                            />
                          </div>

                          <div className="stack" style={{ gap: '3px' }}>
                            <span className="x-small muted font-bold uppercase" style={{ fontSize: '0.65rem' }}>Cost / Unit</span>
                            <input
                              className="input font-mono"
                              type="number"
                              style={{ width: '90px', padding: '6px 10px' }}
                              placeholder="Cost/Pc"
                              value={item.unitPrice || ''}
                              onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                          </div>

                          <div className="stack" style={{ gap: '3px' }}>
                            <span className="x-small font-bold uppercase" style={{ color: 'var(--accent-strong)', fontSize: '0.65rem' }}>Selling / Unit</span>
                            <input
                              className="input font-strong"
                              type="number"
                              style={{ width: '110px', padding: '6px 10px', borderColor: 'var(--accent)' }}
                              placeholder="Sell Price"
                              value={item.sellingPrice || ''}
                              onChange={e => updateItem(idx, 'sellingPrice', e.target.value)}
                              required
                              min="0.01"
                              step="0.01"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="between panel-strong p-4" style={{ borderRadius: '14px' }}>
              <span className="font-strong">Total Commitment:</span>
              <h2 className="accent-text">{formatCurrency(formData.total)}</h2>
            </div>

            <button className="btn btn-primary w-full" type="submit">
              Finalize Order
            </button>
          </form>
        </div>
      )}

      <div className="panel glass-panel overflow-auto">
        <table className="w-full professional-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: '24px' }}>Purchase ID</th>
              <th>Supplier Partner</th>
              <th>Assigned Branch</th>
              <th>Order Volume</th>
              <th>Financial Valuation</th>
              <th style={{ textAlign: 'right', paddingRight: '24px' }}>Date Processed</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPurchases.map(pur => {
              const isExpanded = expandedPurchaseId === pur._id;

              return (
                <React.Fragment key={pur._id}>
                  <tr 
                    className={`table-row-hover cursor-pointer ${isExpanded ? 'row-selected' : ''}`}
                    onClick={() => setExpandedPurchaseId(isExpanded ? null : pur._id)}
                    style={{ background: isExpanded ? 'var(--bg-soft)' : undefined }}
                    title="Click row to view / hide purchase order details"
                  >
                    <td style={{ paddingLeft: '24px' }}>
                      <div className="cluster gap-2 align-center">
                        <button 
                          type="button" 
                          className="icon-btn ghost compact" 
                          style={{ width: '22px', height: '22px', padding: 0 }}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{isExpanded ? '▼' : '▶'}</span>
                        </button>
                        <FileText size={14} className="text-accent" />
                        <strong className="small font-mono text-accent hover-underline">#{pur._id.slice(-6).toUpperCase()}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="stack">
                        <strong className="small">{pur.supplier?.name || 'Manual Entry'}</strong>
                        <span className="muted x-small">{pur.supplier?.category || 'General Supply'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="small badge bg-primary-soft">{pur.branch?.name || pur.branch || 'Main Branch'}</span>
                    </td>
                    <td>
                      <div className="cluster gap-2">
                        <Boxes size={14} className="muted" />
                        <span className="small font-bold">{pur.products?.length || 0} Line Items</span>
                      </div>
                    </td>
                    <td>
                      <strong className="accent-text">{formatCurrency(pur.total)}</strong>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                      <span className="muted small">{formatDate(pur.date || pur.createdAt)}</span>
                    </td>
                  </tr>

                  {/* Inline Expanded Purchase Invoice Breakdown (Directly Below the Row) */}
                  {isExpanded && (
                    <tr style={{ background: 'var(--bg-soft)' }}>
                      <td colSpan="6" style={{ padding: '16px 24px 20px 36px' }}>
                        <div className="panel p-4 glass-panel stack gap-3" style={{ border: '1px solid var(--accent)', borderRadius: '14px', background: 'var(--bg-card)' }}>
                          <div className="between align-center flex-wrap gap-2 pb-2" style={{ borderBottom: '1px dashed var(--border)' }}>
                            <div className="cluster gap-2 align-center">
                              <span className="badge info font-bold">📄 INVOICE BREAKDOWN</span>
                              <span className="small font-mono">Invoice #{pur._id.slice(-6).toUpperCase()}</span>
                            </div>
                            <div className="cluster gap-4 align-center small font-mono">
                              <span>Supplier: <strong>{pur.supplier?.name || 'Manual Supplier'}</strong></span>
                              <span>Return Terms: <strong>{pur.returnDays || 0} Days</strong></span>
                              <span>Total: <strong className="accent-text" style={{ fontSize: '1rem' }}>{formatCurrency(pur.total)}</strong></span>
                            </div>
                          </div>

                          <div className="overflow-auto" style={{ border: '1px solid var(--border)', borderRadius: '10px' }}>
                            <table className="w-full professional-table compact" style={{ fontSize: '0.84rem' }}>
                              <thead>
                                <tr style={{ background: 'var(--bg-soft)' }}>
                                  <th style={{ padding: '8px 12px' }}>Medicine / Item</th>
                                  <th>Batch Number</th>
                                  <th>Expiry Date</th>
                                  <th>Packaging Type</th>
                                  <th>Quantity (Units)</th>
                                  <th>Cost / Unit</th>
                                  <th style={{ textAlign: 'right', paddingRight: '12px' }}>Total Cost</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(pur.products || []).map((item, idx) => {
                                  const prodName = item.product?.name || item.name || 'Medicine';
                                  const prodSku = item.product?.sku || item.sku || '';
                                  // Use exact costPerPack * packQuantity if available, or line total
                                  const lineTotal = item.costPerPack && item.packQuantity
                                    ? (Number(item.costPerPack) * Number(item.packQuantity))
                                    : (Number(item.quantity || 0) * Number(item.costPrice || 0));

                                  return (
                                    <tr key={idx}>
                                      <td style={{ padding: '8px 12px' }}>
                                        <strong>{prodName}</strong>
                                        {prodSku && <span className="muted x-small font-mono d-block">{prodSku}</span>}
                                      </td>
                                      <td>
                                        <strong className="font-mono text-accent">{item.batchNumber || 'N/A'}</strong>
                                      </td>
                                      <td>
                                        <span style={{ fontWeight: 600 }}>
                                          {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                                        </span>
                                      </td>
                                      <td>
                                        <span className="pill neutral small">{item.packType || 'Carton'} ({item.piecesPerPack || 1} pcs)</span>
                                      </td>
                                      <td>
                                        <strong className="font-mono">{item.quantity}</strong>
                                        {item.packQuantity && <span className="muted x-small"> ({item.packQuantity} cartons)</span>}
                                      </td>
                                      <td>{formatCurrency(item.costPrice)}</td>
                                      <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                                        <strong className="accent-text">{formatCurrency(lineTotal)}</strong>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            {purchases.length === 0 && !loading && (
              <tr>
                <td colSpan="6" className="p-12 text-center muted">No procurement history recorded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredPurchases.length}
        itemsPerPage={itemsPerPage}
      />
    </div>
  )
}
