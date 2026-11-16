/**
 * Module: Inventory
 * 
 * React UI page component representing the Inventory view.
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Boxes,
  Edit,
  Plus,
  Search,
  Tag,
  Warehouse,
  X,
  History,
  TrendingDown,
  TrendingUp,
  Truck,
  AlertCircle,
  Trash2,
  Download,
} from 'lucide-react'
import { SectionHeading } from '../../components/SectionHeading'
import { formatCurrency, exportToCSV, getBaseUrl } from '../../utils'
import { Pagination } from '../../components/Pagination'

export function Inventory({
  api,
  session,
  products,
  refreshCoreData,
  onNotice,
  inventoryQuery,
  setInventoryQuery,
  onlyLowStock,
  setOnlyLowStock,
  productForm,
  handleProductFormChange,
  handleProductSave,
  startEditingProduct,
  resetProductEditor,
  editingProductId,
  busyAction,
  startTransition,
  handleProductDelete,
}) {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeRack, setActiveRack] = useState('All')
  const [activeColumn, setActiveColumn] = useState('All')
  const [activeStatus, setActiveStatus] = useState('All')
  const [activeBranchFilter, setActiveBranchFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const isSuperAdmin = session?.user?.role === 'super_admin'

  // Extract all distinct branches if branchStocks exists on products
  const allBranches = ['All', ...new Set(
    products.flatMap(p => (p.branchStocks || []).map(bs => bs.branch)).filter(Boolean)
  )]

  const categories = ['All', ...new Set(products.map(p => p.category))]
  const racks = ['All', ...new Set(products.map(p => `Row ${p.rack.rowNumber}`))]
  const columns = ['All', ...new Set(products.map(p => `Col ${p.rack.columnNumber}`))]

  const filteredItems = products.filter(p => {
    // Search filter
    const searchString = `${p.name} ${p.barcode} ${p.sku} ${p.category} ${p.rackLabel}`.toLowerCase()
    if (!searchString.includes(inventoryQuery.toLowerCase())) return false

    // Branch filter for Super Admin
    if (activeBranchFilter !== 'All') {
      const bStock = (p.branchStocks || []).find(bs => bs.branch === activeBranchFilter);
      if (!bStock || bStock.quantityInStock <= 0) return false;
    }

    // Category filter
    if (activeCategory !== 'All' && p.category !== activeCategory) return false

    // Rack filters
    if (activeRack !== 'All' && `Row ${p.rack.rowNumber}` !== activeRack) return false
    if (activeColumn !== 'All' && `Col ${p.rack.columnNumber}` !== activeColumn) return false
    
    // Status filters
    if (activeStatus === 'Critical' && p.quantityInStock > 0) return false
    if (activeStatus === 'Low' && (p.quantityInStock <= 0 || p.quantityInStock > p.reorderLevel)) return false
    if (activeStatus === 'Good' && p.quantityInStock <= p.reorderLevel) return false

    // Low stock toggle (global prop)
    if (onlyLowStock && p.quantityInStock > p.reorderLevel) return false

    return true
  })

  // Reset to page 1 on filter change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [inventoryQuery, activeCategory, activeRack, activeColumn, activeStatus, activeBranchFilter, onlyLowStock])

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const totalValue = filteredItems.reduce((sum, p) => sum + (p.price * p.quantityInStock), 0)
  const totalUnits = filteredItems.reduce((sum, p) => sum + p.quantityInStock, 0)
  const criticalCount = filteredItems.filter(p => p.quantityInStock <= p.reorderLevel).length

  const [showHistory, setShowHistory] = useState(false)

  // Mock movement history for visual appeal
  const mockHistory = [
    { type: 'in', qty: 50, date: 'Today, 10:30 AM', user: 'Admin' },
    { type: 'out', qty: 12, date: 'Today, 09:15 AM', user: 'Cashier 1' },
    { type: 'in', qty: 100, date: 'Yesterday', user: 'Admin' },
  ]

  const [expandedProductId, setExpandedProductId] = useState(null)
  const [productBatchesMap, setProductBatchesMap] = useState({})
  const [loadingBatchId, setLoadingBatchId] = useState(null)
  const [settingActiveBatchId, setSettingActiveBatchId] = useState(null)

  async function handleSetActiveBatch(product, batchId) {
    if (!api || !session?.token) return
    setSettingActiveBatchId(batchId || 'auto')
    try {
      const res = await api.post('/batches/set-active', {
        productId: product._id,
        batchId: batchId || null
      }, {
        headers: { Authorization: `Bearer ${session.token}` }
      })
      if (onNotice) {
        onNotice({ type: 'success', text: res.data.message || 'Active batch updated successfully.' })
      }
      if (refreshCoreData) {
        await refreshCoreData()
      }
    } catch (err) {
      if (onNotice) {
        onNotice({ type: 'error', text: err.response?.data?.message || 'Failed to update active batch.' })
      }
    } finally {
      setSettingActiveBatchId(null)
    }
  }

  async function toggleProductBatches(product) {
    if (expandedProductId === product._id) {
      setExpandedProductId(null)
      return
    }

    setExpandedProductId(product._id)

    // Load batches if not already cached
    if (!productBatchesMap[product._id]) {
      setLoadingBatchId(product._id)
      try {
        if (api && session?.token) {
          const branchParam = (!isSuperAdmin && session.user?.branch) ? `?branch=${encodeURIComponent(session.user.branch)}` : ''
          const res = await api.get(`/batches/product/${product._id}${branchParam}`, {
            headers: { Authorization: `Bearer ${session.token}` }
          })
          setProductBatchesMap(prev => ({ ...prev, [product._id]: res.data || [] }))
        }
      } catch (err) {
        console.error('Failed to load batches:', err)
      } finally {
        setLoadingBatchId(null)
      }
    }
  }

  return (
    <div className="stack gap-6 animate-fade">
      {/* Header & Main Stats */}
      <div className="grid-3 gap-6">
        <div className="panel p-6 glass-panel between" style={{ background: 'linear-gradient(135deg, var(--accent-soft), transparent)' }}>
          <div className="stack gap-1">
            <span className="eyebrow muted">Inventory Valuation</span>
            <h2 className="accent-text" style={{ fontSize: '1.8rem', fontWeight: 800 }}>{formatCurrency(totalValue)}</h2>
          </div>
          <div className="icon-btn" style={{ background: 'var(--panel)', color: 'var(--accent)' }}><Tag size={24}/></div>
        </div>
        <div className="panel p-6 glass-panel between">
          <div className="stack gap-1">
            <span className="eyebrow muted">Total Stock Units</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{totalUnits.toLocaleString()} <span style={{ fontSize: '0.9rem', opacity: 0.5 }}>Items</span></h2>
          </div>
          <div className="icon-btn" style={{ background: 'var(--bg-soft)', color: 'var(--text)' }}><Boxes size={24}/></div>
        </div>
        <div className="panel p-6 glass-panel between" style={{ background: criticalCount > 0 ? 'linear-gradient(135deg, var(--danger-soft), transparent)' : '' }}>
          <div className="stack gap-1">
            <span className="eyebrow muted">Critical Alerts</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: criticalCount > 0 ? 'var(--danger)' : 'var(--success)' }}>{criticalCount} <span style={{ fontSize: '0.9rem', opacity: 0.5 }}>Reorders</span></h2>
          </div>
          <div className="icon-btn" style={{ background: 'var(--panel)', color: criticalCount > 0 ? 'var(--danger)' : 'var(--success)' }}><AlertCircle size={24}/></div>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="panel p-5 glass-panel stack gap-5">
        <div className="between wrap-row gap-4">
          <div className="cluster gap-4 wrap-row" style={{ flex: 1 }}>
            <div className="input-shell compact" style={{ flexBasis: '280px', background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <Search size={18} className="muted" />
              <input
                className="ghost-input"
                placeholder="Find by SKU, Name..."
                value={inventoryQuery}
                onChange={(e) => setInventoryQuery(e.target.value)}
              />
            </div>
            
            <div className="cluster gap-3">
              {isSuperAdmin && allBranches.length > 2 && (
                <div className="stack gap-1">
                  <span className="eyebrow muted" style={{ fontSize: '0.6rem' }}>Branch Stock</span>
                  <select className="input compact" style={{ width: '150px' }} value={activeBranchFilter} onChange={(e) => setActiveBranchFilter(e.target.value)}>
                    {allBranches.map(b => (
                      <option key={b} value={b}>{b === 'All' ? 'All Branches' : b}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="stack gap-1">
                <span className="eyebrow muted" style={{ fontSize: '0.6rem' }}>Category</span>
                <select className="input compact" style={{ width: '140px' }} value={activeCategory} onChange={(e) => setActiveCategory(e.target.value)}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="stack gap-1">
                <span className="eyebrow muted" style={{ fontSize: '0.6rem' }}>Rack Row</span>
                <select className="input compact" style={{ width: '120px' }} value={activeRack} onChange={(e) => setActiveRack(e.target.value)}>
                  {racks.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="stack gap-1">
                <span className="eyebrow muted" style={{ fontSize: '0.6rem' }}>Rack Col</span>
                <select className="input compact" style={{ width: '120px' }} value={activeColumn} onChange={(e) => setActiveColumn(e.target.value)}>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="stack gap-1">
                <span className="eyebrow muted" style={{ fontSize: '0.6rem' }}>Health Status</span>
                <select className="input compact" style={{ width: '130px' }} value={activeStatus} onChange={(e) => setActiveStatus(e.target.value)}>
                  <option value="All">All Status</option>
                  <option value="Critical">Out of Stock</option>
                  <option value="Low">Low Stock</option>
                  <option value="Good">Healthy</option>
                </select>
              </div>
            </div>
          </div>

          <div className="cluster gap-2">
            <button 
              className="btn btn-outline" 
              style={{ padding: '12px 24px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', display: 'flex', gap: '8px', alignItems: 'center' }}
              onClick={() => exportToCSV(filteredItems, 'Inventory_Report')}
            >
              <Download size={18} />
              Export Excel
            </button>
            <button 
              className="btn btn-primary"
              style={{ padding: '12px 24px', borderRadius: '14px' }}
              onClick={() => navigate('/product-manager')}
            >
              <Plus size={18} />
              Master Catalog
            </button>
          </div>
        </div>
      </div>

      {/* Stock Ledger Table */}
      <div className="panel glass-panel overflow-auto" style={{ padding: 0, border: '1px solid var(--border)' }}>
        <table className="w-full professional-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: '24px' }}>Product Identifier</th>
              <th>Category</th>
              <th>Warehouse Loc</th>
              <th>Unit Cost</th>
              <th>Unit Price</th>
              <th>Available Stock</th>
              <th>Status</th>
              <th style={{ width: '120px', textAlign: 'right', paddingRight: '24px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((product) => {
              const isLow = product.quantityInStock <= product.reorderLevel;
              const isOut = product.quantityInStock === 0;
              const isExpanded = expandedProductId === product._id;
              const productBatches = productBatchesMap[product._id] || [];
              const isLoadingThis = loadingBatchId === product._id;

              return (
                <React.Fragment key={product._id}>
                  <tr 
                    className={`table-row-hover animate-slide cursor-pointer ${isExpanded ? 'row-selected' : ''}`}
                    onClick={() => toggleProductBatches(product)}
                    style={{ background: isExpanded ? 'var(--bg-soft)' : undefined }}
                    title="Click row to expand / collapse Batch breakdown"
                  >
                    <td style={{ paddingLeft: '24px' }}>
                      <div className="cluster gap-3 align-center">
                        <button 
                          type="button" 
                          className="icon-btn ghost compact" 
                          style={{ width: '24px', height: '24px', padding: 0 }}
                        >
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{isExpanded ? '▼' : '▶'}</span>
                        </button>
                        <div className="avatar small" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-soft)', padding: '2px', overflow: 'hidden' }}>
                          <img 
                            src={product.image?.startsWith('/uploads') ? `${getBaseUrl()}${product.image}` : product.image} 
                            alt="" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        </div>
                        <div className="stack">
                          <strong style={{ fontSize: '0.95rem' }} className="hover-underline">{product.name}</strong>
                          <div className="cluster gap-2 align-center">
                            <span className="muted small font-mono">{product.sku}</span>
                            {product.activeBatch?.batchNumber ? (
                              <span className="pill small" style={{ 
                                background: 'rgba(59, 130, 246, 0.1)', 
                                color: 'var(--accent)', 
                                fontSize: '0.68rem', 
                                padding: '2px 8px', 
                                fontWeight: 700, 
                                border: '1px solid rgba(59, 130, 246, 0.25)' 
                              }}>
                                Active Batch: {product.activeBatch.batchNumber} (Exp: {new Date(product.activeBatch.expiryDate).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })})
                              </span>
                            ) : (
                              <span className="muted small font-mono">• <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{isExpanded ? 'Hide Batches' : 'View Batches'}</span></span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="pill neutral small">{product.category}</span>
                    </td>
                    <td>
                      <div className="cluster gap-2">
                        <Warehouse size={14} className="muted" />
                        <span className="font-strong">{product.rackLabel}</span>
                      </div>
                    </td>
                    <td>
                      <strong>{formatCurrency(product.costPrice)}</strong>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--accent-strong)' }}>{formatCurrency(product.price)}</strong>
                    </td>
                    <td>
                      <div className="stack">
                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)' }}>
                          {product.quantityInStock}
                        </span>
                        <span className="muted small">{product.unit}</span>
                      </div>
                    </td>
                    <td>
                      {isOut ? (
                        <span className="pill danger-soft small">Out of Stock</span>
                      ) : isLow ? (
                        <span className="pill warning-soft small">Low Stock</span>
                      ) : (
                        <span className="pill success-soft small">Healthy</span>
                      )}
                    </td>
                    <td style={{ width: '120px', textAlign: 'right', paddingRight: '24px' }}>
                      <div className="cluster gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="icon-btn ghost hover-accent"
                          title="Edit Product"
                          onClick={() => {
                            startEditingProduct(product);
                            navigate('/product-manager');
                          }}
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          className="icon-btn ghost hover-danger"
                          title="Delete Product"
                          disabled={busyAction === 'product-delete'}
                          onClick={() => handleProductDelete(product._id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline Expanded Batch Details (Below the row) */}
                  {isExpanded && (
                    <tr style={{ background: 'var(--bg-soft)' }}>
                      <td colSpan="8" style={{ padding: '16px 24px 20px 48px' }}>
                        <div className="panel p-4 glass-panel stack gap-4" style={{ border: '1px solid var(--accent)', borderRadius: '14px', background: 'var(--bg-card)' }}>
                          
                          {/* Super Admin Branch Stock Distribution Card */}
                          {isSuperAdmin && product.branchStocks && product.branchStocks.length > 0 && (
                            <div className="stack gap-2" style={{ paddingBottom: '12px', borderBottom: '1px dashed var(--border)' }}>
                              <div className="between align-center">
                                <div className="cluster gap-2 align-center">
                                  <span className="badge warning font-bold">🏢 BRANCH STOCK ALLOCATION</span>
                                  <span className="small muted">Live product quantity distribution per branch</span>
                                </div>
                                <span className="small muted font-mono">Total Locations: {product.branchStocks.length}</span>
                              </div>
                              <div className="grid-3 gap-3">
                                {product.branchStocks.map((bStock, bIdx) => (
                                  <div 
                                    key={bIdx} 
                                    className="panel p-3 glass-panel between align-center" 
                                    style={{ 
                                      borderRadius: '10px', 
                                      border: bStock.quantityInStock > 0 ? '1px solid var(--border)' : '1px dashed var(--border)',
                                      background: bStock.quantityInStock > 0 ? 'var(--panel)' : 'var(--bg-soft)',
                                      opacity: bStock.quantityInStock > 0 ? 1 : 0.6 
                                    }}
                                  >
                                    <div className="stack" style={{ gap: '2px' }}>
                                      <strong style={{ fontSize: '0.88rem' }}>{bStock.branch}</strong>
                                      <span className="x-small muted font-mono">Location: {bStock.rackLabel || 'Unassigned'}</span>
                                    </div>
                                    <div className="stack align-end" style={{ gap: '2px' }}>
                                      <span style={{ 
                                        fontSize: '1.05rem', 
                                        fontWeight: 700, 
                                        color: bStock.quantityInStock === 0 ? 'var(--danger)' : bStock.quantityInStock <= bStock.reorderLevel ? 'var(--warning)' : 'var(--accent)' 
                                      }}>
                                        {bStock.quantityInStock}
                                      </span>
                                      <span className="x-small muted">{product.unit}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="between align-center">
                            <div className="cluster gap-2 align-center">
                              <span className="badge info font-bold">📦 BATCH INVENTORY DETAILS</span>
                              <span className="small muted">Default: FEFO (First Expired, First Out)</span>
                            </div>
                            <div className="cluster gap-2 align-center">
                              {product.manualActiveBatchId && (
                                <button
                                  type="button"
                                  className="btn small"
                                  style={{ padding: '3px 10px', fontSize: '0.72rem', background: 'var(--panel)', border: '1px solid var(--border)' }}
                                  disabled={settingActiveBatchId === 'auto'}
                                  onClick={() => handleSetActiveBatch(product, null)}
                                  title="Reset to automatic earliest expiry batch selection"
                                >
                                  {settingActiveBatchId === 'auto' ? 'Resetting...' : 'Reset to Auto FEFO'}
                                </button>
                              )}
                              <span className="small font-mono">Total Available Stock: <strong>{product.quantityInStock} {product.unit}</strong></span>
                            </div>
                          </div>

                          {isLoadingThis ? (
                            <div className="p-4 text-center muted small">Loading batch records...</div>
                          ) : productBatches.length === 0 ? (
                            <div className="p-4 text-center muted small">
                              No purchase batches found for this product yet. Record a purchase order in <strong>Purchases</strong> to generate tracked batches with expiry dates.
                            </div>
                          ) : (
                            <div className="overflow-auto" style={{ border: '1px solid var(--border)', borderRadius: '10px' }}>
                              <table className="w-full professional-table compact" style={{ fontSize: '0.85rem' }}>
                                <thead>
                                  <tr style={{ background: 'var(--bg-soft)' }}>
                                    <th style={{ padding: '8px 12px' }}>Batch Number</th>
                                    <th>Expiry Date</th>
                                    <th>Pack Type</th>
                                    <th>Available Stock</th>
                                    <th>Unit Cost</th>
                                    <th>Unit Selling</th>
                                    <th>Branch</th>
                                    <th>Batch Status</th>
                                    <th style={{ textAlign: 'right', paddingRight: '12px' }}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {productBatches.map((b) => {
                                    const isExpired = new Date(b.expiryDate) < new Date();
                                    const daysToExpiry = Math.ceil((new Date(b.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                                    const isNearExpiry = !isExpired && daysToExpiry <= 60;
                                    const isCurrentlySelling = (product.activeBatch?._id === b._id) || (product.activeBatch?.batchNumber === b.batchNumber);

                                    return (
                                      <tr key={b._id}>
                                        <td style={{ padding: '8px 12px' }}>
                                          <div className="cluster gap-2 align-center">
                                            <strong className="font-mono text-accent">{b.batchNumber}</strong>
                                            {isCurrentlySelling && (
                                              <span className="pill small" style={{ background: 'var(--accent)', color: 'white', fontSize: '0.6rem', padding: '1px 6px', fontWeight: 800 }}>
                                                CURRENT SELLING
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td>
                                          <div className="stack" style={{ gap: '1px' }}>
                                            <span style={{ fontWeight: 600, color: isExpired ? 'var(--danger)' : isNearExpiry ? 'var(--warning)' : 'inherit' }}>
                                              {new Date(b.expiryDate).toLocaleDateString()}
                                            </span>
                                            <span className="x-small muted font-mono">
                                              {isExpired ? '(Expired)' : `${daysToExpiry} days left`}
                                            </span>
                                          </div>
                                        </td>
                                        <td>
                                          <span className="pill neutral small">{b.packType || 'Packs'} ({b.piecesPerPack || 1} pcs)</span>
                                        </td>
                                        <td>
                                          <strong style={{ fontSize: '0.95rem', color: b.availableQuantity === 0 ? 'var(--danger)' : 'var(--success)' }}>
                                            {b.availableQuantity}
                                          </strong>
                                          <span className="x-small muted"> / {b.initialQuantity}</span>
                                        </td>
                                        <td>{formatCurrency(b.costPricePerUnit)}</td>
                                        <td>
                                          <strong style={{ color: 'var(--accent-strong)' }}>{formatCurrency(b.sellingPricePerUnit)}</strong>
                                        </td>
                                        <td><span className="pill neutral small">{b.branch}</span></td>
                                        <td>
                                          {isExpired ? (
                                            <span className="pill danger-soft small">Expired</span>
                                          ) : b.availableQuantity === 0 ? (
                                            <span className="pill neutral small">Depleted</span>
                                          ) : isNearExpiry ? (
                                            <span className="pill warning-soft small">Near Expiry</span>
                                          ) : (
                                            <span className="pill success-soft small">Active</span>
                                          )}
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                                          {isCurrentlySelling ? (
                                            <span className="x-small font-strong" style={{ color: 'var(--accent)' }}>Active in POS</span>
                                          ) : b.availableQuantity > 0 && !isExpired ? (
                                            <button
                                              type="button"
                                              className="btn small glow-on-hover"
                                              style={{ 
                                                padding: '2px 8px', 
                                                fontSize: '0.7rem', 
                                                fontWeight: 700,
                                                background: 'var(--accent-soft)',
                                                color: 'var(--accent)',
                                                border: '1px solid var(--accent)'
                                              }}
                                              disabled={settingActiveBatchId === b._id}
                                              onClick={() => handleSetActiveBatch(product, b._id)}
                                              title="Make this batch the active selling batch in POS"
                                            >
                                              {settingActiveBatchId === b._id ? 'Activating...' : 'Set as Active'}
                                            </button>
                                          ) : (
                                            <span className="x-small muted">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
        
        {filteredItems.length === 0 && (
          <div className="stack align-center p-8 gap-3" style={{ opacity: 0.6 }}>
            <Boxes size={48} className="muted" />
            <p>No products found matching the current filter criteria.</p>
          </div>
        )}
      </div>

      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredItems.length}
        itemsPerPage={itemsPerPage}
      />
    </div>
  )
}
