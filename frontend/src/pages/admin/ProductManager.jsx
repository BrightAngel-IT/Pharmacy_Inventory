/**
 * Module: ProductManager
 * 
 * React UI page component representing the ProductManager view.
 */

import React from 'react'
import { Edit, Plus, X, Warehouse, Package, Tag, FileText, DollarSign, Barcode, Layers, Image as ImageIcon, Ruler, Activity, CheckCircle2 } from 'lucide-react'
import { SectionHeading } from '../../components/SectionHeading'
import { getBaseUrl } from '../../utils'

export function ProductManager({
  productForm,
  handleProductFormChange,
  handleProductSave,
  resetProductEditor,
  editingProductId,
  busyAction,
}) {
  return (
    <div className="stack gap-4 animate-fade">
      {/* Compact Header */}
      <div className="between wrap-row panel p-4 glass-panel" style={{ borderLeft: '4px solid var(--accent)', borderRadius: '14px' }}>
        <div className="cluster gap-4">
          <div className="icon-btn" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: 'none', width: '42px', height: '42px' }}>
            <Package size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{editingProductId ? 'Modify Inventory Item' : 'Register Master Product'}</h2>
            <p className="muted small">Update technical specifications and warehouse mapping.</p>
          </div>
        </div>
        {editingProductId && (
          <button className="btn btn-secondary" onClick={resetProductEditor} style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem' }}>
            <X size={16} />
            Discard Changes
          </button>
        )}
      </div>

      <form
        onSubmit={handleProductSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
            e.preventDefault();
          }
        }}
        className="grid-2 gap-4 align-start"
      >
        <div className="stack gap-4">
          {/* Main Attributes & Media Panel */}
          <div className="panel p-5 glass-panel stack gap-4" style={{ gridColumn: 'span 2', borderRadius: '16px' }}>

            {/* New Media Section on Left */}
            <div className="stack gap-4">
              <div className="cluster gap-2 mb-1">
                <ImageIcon size={16} className="accent-text" />
                <span className="eyebrow" style={{ fontSize: '0.65rem' }}>Media & Assets</span>
              </div>

              <div className="grid-2 gap-4 align-center" style={{ gridTemplateColumns: '140px 1fr' }}>
                <div
                  className="panel-strong glow-on-hover"
                  style={{
                    height: '110px',
                    borderRadius: '14px',
                    border: '2px dashed var(--border)',
                    display: 'grid',
                    placeItems: 'center',
                    overflow: 'hidden',
                    background: 'var(--bg-soft)',
                    position: 'relative'
                  }}
                >
                  {productForm.imageFile || productForm.image ? (
                    <img
                      src={productForm.imageFile ? URL.createObjectURL(productForm.imageFile) : (productForm.image?.startsWith('/uploads') ? `${getBaseUrl()}${productForm.image}` : productForm.image)}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="stack align-center gap-2 muted">
                      <ImageIcon size={32} strokeWidth={1} />
                      <span className="small">No image</span>
                    </div>
                  )}
                </div>

                <div className="stack gap-3">
                  <label className="btn btn-secondary w-fit" style={{ cursor: 'pointer', padding: '10px 20px' }}>
                    <Plus size={16} />
                    {productForm.imageFile || productForm.image ? 'Change Media' : 'Upload Product Photo'}
                    <input
                      type="file"
                      name="image"
                      accept="image/*"
                      onChange={handleProductFormChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <p className="muted small">Recommended: 800x800px or larger. Max 5MB.</p>
                  {(productForm.imageFile || productForm.image) && (
                    <button
                      type="button"
                      className="btn btn-outline small w-fit"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => handleProductFormChange({ target: { name: 'image', type: 'file', files: null } })}
                    >
                      <X size={14} />
                      Remove Asset
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="stack gap-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="cluster gap-2 mb-1">
                <FileText size={16} className="accent-text" />
                <span className="eyebrow" style={{ fontSize: '0.65rem' }}>Primary Attributes</span>
              </div>

              <label className="field">
                <span className="muted small font-strong uppercase" style={{ fontSize: '0.6rem' }}>Full Product Name</span>
                <input
                  className="input large-input"
                  name="name"
                  placeholder="e.g. Product Name"
                  value={productForm.name}
                  onChange={handleProductFormChange}
                  required
                  style={{ fontSize: '1rem', fontWeight: 100 }}
                />
              </label>

              <label className="field">
                <span className="muted small font-strong uppercase" style={{ fontSize: '0.6rem' }}>Technical Description</span>
                <textarea
                  className="input"
                  name="description"
                  placeholder="Add detailed specs, warranty details..."
                  style={{ minHeight: '100px', resize: 'vertical', fontSize: '0.9rem' }}
                  value={productForm.description}
                  onChange={handleProductFormChange}
                />
              </label>

              <div className="grid-2 gap-5">
                <label className="field">
                  <span className="muted small font-strong uppercase" style={{ fontSize: '0.6rem' }}>Business Category</span>
                  <input
                    className="input"
                    name="category"
                    placeholder="e.g. Pain Relief, Antibiotics, Syrups"
                    value={productForm.category}
                    onChange={handleProductFormChange}
                    required
                  />
                </label>
                <label className="field">
                  <span className="muted small font-strong uppercase" style={{ fontSize: '0.6rem' }}>Medicine Dispensing Form</span>
                  <select
                    className="input"
                    name="itemType"
                    value={productForm.itemType || 'TABLET_CAPSULE'}
                    onChange={handleProductFormChange}
                  >
                    <option value="TABLET_CAPSULE">💊 Tablets / Capsules (Divisible into Cards & Loose Tablets)</option>
                    <option value="BOTTLE_SYRUP">🍾 Syrup / Suspension / Liquid (Bottle Only)</option>
                    <option value="CREAM_TUBE">🧴 Cream / Ointment / Gel (Tube Only)</option>
                    <option value="INJECTION_VIAL">💉 Injection / Vial / Ampoule</option>
                    <option value="SURGICAL_DEVICE">🩹 Saline, Gauze, Cannula, Medical Supplies</option>
                    <option value="GENERAL">📦 General Item (Sold as Single Unit)</option>
                  </select>
                </label>
              </div>

              {/* Conditional Packaging Hierarchy for Tablets/Capsules */}
              {productForm.itemType === 'TABLET_CAPSULE' && (
                <div className="stack gap-3 p-3 rounded" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
                  <div className="cluster gap-2 align-center">
                    <span style={{ fontSize: '1.2rem' }}>💊</span>
                    <strong style={{ fontSize: '0.85rem' }}>Packaging Hierarchy (Master Carton ➔ Small Box ➔ Card ➔ Tablet)</strong>
                  </div>
                  <span className="x-small muted">
                    Set standard packaging sizes. Wholesale purchases are calculated in Master Cartons, while POS cashiers can sell as Single Tablets, Cards, or Boxes.
                  </span>

                  <div className="grid-3 gap-3">
                    <label className="field">
                      <span className="small font-bold">1. Tabs per Card:</span>
                      <input
                        type="number"
                        min="1"
                        className="input compact font-strong text-center"
                        name="tabletsPerCard"
                        placeholder="e.g. 12"
                        value={productForm.tabletsPerCard || '12'}
                        onChange={handleProductFormChange}
                        required
                      />
                      <span className="x-small muted">Tablets in 1 Strip</span>
                    </label>

                    <label className="field">
                      <span className="small font-bold">2. Cards per Small Box:</span>
                      <input
                        type="number"
                        min="1"
                        className="input compact font-strong text-center"
                        name="cardsPerBox"
                        placeholder="e.g. 10"
                        value={productForm.cardsPerBox || '10'}
                        onChange={handleProductFormChange}
                        required
                      />
                      <span className="x-small muted font-mono">= {(Number(productForm.tabletsPerCard || 12) * Number(productForm.cardsPerBox || 10))} tabs/box</span>
                    </label>

                    <label className="field">
                      <span className="small font-bold">3. Boxes per Master Carton:</span>
                      <input
                        type="number"
                        min="1"
                        className="input compact font-strong text-center"
                        name="boxesPerCarton"
                        placeholder="e.g. 20"
                        value={productForm.boxesPerCarton || '20'}
                        onChange={handleProductFormChange}
                        required
                      />
                      <span className="x-small text-accent font-bold font-mono">
                        = {(Number(productForm.tabletsPerCard || 12) * Number(productForm.cardsPerBox || 10) * Number(productForm.boxesPerCarton || 20))} tabs/carton
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="stack gap-3 pt-3" style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
              <div className="cluster gap-2 mb-1">
                <Warehouse size={16} className="accent-text" />
                <span className="eyebrow" style={{ fontSize: '0.65rem' }}>Warehouse Logic & Placement</span>
              </div>

              <div className="grid-3 gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <label className="field">
                  <span className="muted small font-strong uppercase" style={{ fontSize: '0.6rem' }}>Row (R)</span>
                  <input className="input text-center font-mono" style={{ width: '100%', minWidth: '0' }} type="number" name="rack.rowNumber" value={productForm.rack.rowNumber} onChange={handleProductFormChange} required />
                </label>
                <label className="field">
                  <span className="muted small font-strong uppercase" style={{ fontSize: '0.6rem' }}>Column (C)</span>
                  <input className="input text-center font-mono" style={{ width: '100%', minWidth: '0' }} type="number" name="rack.columnNumber" value={productForm.rack.columnNumber} onChange={handleProductFormChange} required />
                </label>
                <label className="field">
                  <span className="muted small font-strong uppercase" style={{ fontSize: '0.6rem' }}>Shelf (S)</span>
                  <input className="input text-center font-mono" style={{ width: '100%', minWidth: '0' }} type="number" name="rack.shelfNumber" value={productForm.rack.shelfNumber} onChange={handleProductFormChange} required />
                </label>
              </div>

              <div className="cluster gap-3 p-3 panel-strong" style={{ borderRadius: '12px', border: '1px dashed var(--border)', background: 'var(--bg-soft)' }}>
                <CheckCircle2 size={16} className="success-text" />
                <p className="muted small">
                  Storage Label: <strong style={{ color: 'var(--text)' }}>R{productForm.rack.rowNumber}-C{productForm.rack.columnNumber}-S{productForm.rack.shelfNumber}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Identification & Pricing */}
        <div className="stack gap-4">
          <div className="panel p-4 glass-panel stack gap-4" style={{ borderRadius: '16px' }}>
            <div className="cluster gap-2">
              <Barcode size={16} className="accent-text" />
              <span className="eyebrow" style={{ fontSize: '0.65rem' }}>Identification</span>
            </div>

            <label className="field">
              <span className="muted small font-strong uppercase" style={{ fontSize: '0.6rem' }}>System SKU</span>
              <input
                className="input font-mono small"
                name="sku"
                placeholder="SKU-001"
                value={productForm.sku}
                onChange={handleProductFormChange}
                required
              />
            </label>

            <label className="field">
              <span className="muted small font-strong uppercase" style={{ fontSize: '0.6rem' }}>Barcode</span>
              <div className="input-shell compact" style={{ background: 'var(--bg-soft)', borderRadius: '10px' }}>
                <Barcode size={14} className="muted" />
                <input
                  className="ghost-input font-mono small"
                  name="barcode"
                  placeholder="Scan Code..."
                  value={productForm.barcode}
                  onChange={handleProductFormChange}
                  required
                />
              </div>
            </label>
          </div>

          {/* Pricing & Stock disabled/hidden in Master Register */}
          <div className="panel p-4 glass-panel stack gap-3" style={{ borderRadius: '16px', opacity: 0.75, background: 'var(--bg-soft)' }}>
            <div className="cluster gap-2 align-center">
              <DollarSign size={16} className="muted" />
              <span className="eyebrow" style={{ fontSize: '0.65rem' }}>Pricing & Stock (Batch Managed)</span>
            </div>

            <div className="p-3 rounded border-dashed" style={{ background: 'var(--bg-card)' }}>
              <p className="x-small muted" style={{ margin: 0, lineHeight: 1.5 }}>
                ℹ️ <strong>Stock & Pricing are automatically managed via Purchases & Batches.</strong><br />
                Single tablet cost, selling price, and stock levels will be populated dynamically as you record Procurement Purchases.
              </p>
            </div>

            <div className="grid-2 gap-4">
              <label className="field">
                <span className="muted small font-strong uppercase" style={{ fontSize: '0.6rem' }}>Min Alert Level</span>
                <input 
                  className="input small font-strong" 
                  type="number" 
                  name="reorderLevel" 
                  value={productForm.reorderLevel} 
                  onChange={handleProductFormChange} 
                  placeholder="Min pieces"
                />
              </label>

              <label className="field">
                <span className="muted small font-strong uppercase" style={{ fontSize: '0.6rem' }}>Current Master Stock</span>
                <input 
                  className="input small font-strong" 
                  type="number" 
                  value={productForm.quantityInStock || 0} 
                  disabled 
                  style={{ background: 'var(--bg-soft)', cursor: 'not-allowed' }}
                />
              </label>
            </div>
          </div>

          <button
            className="btn btn-primary w-full glow-on-hover"
            type="submit"
            disabled={busyAction === 'product-save'}
            style={{ padding: '16px', borderRadius: '16px', fontSize: '0.9rem', fontWeight: 700 }}
          >
            {busyAction === 'product-save' ? (
              <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
            ) : editingProductId ? (
              <Edit size={18} />
            ) : (
              <Plus size={18} />
            )}
            {busyAction === 'product-save' ? 'Processing...' : editingProductId ? 'Update Record' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}
