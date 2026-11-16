/**
 * Module: POS
 * 
 * React UI page component representing the POS view.
 */

import React, { useState } from 'react'
import {
  CreditCard,
  Plus,
  Minus,
  Check,
  Package,
  Barcode,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  X,
  PauseCircle,
  History,
  Tag,
  UserPlus,
  ScanLine,
  Users,
  AlertCircle,
  ReceiptText,
  Wallet
} from 'lucide-react'
import { SectionHeading } from '../../components/SectionHeading'
import { formatCurrency, authConfig } from '../../utils'
import { getOfflineShifts } from '../../utils/offlineSync'

export function POS({
  api,
  session,
  catalogProducts,
  catalogQuery,
  setCatalogQuery,
  cart,
  setCart,
  addProductToCart,
  changeCartQuantity,
  checkoutForm,
  setCheckoutForm,
  handleCheckout,
  busyAction,
  cartSubtotal,
  cartTotal,
  discountAmount,
  barcodeValue,
  customers,
  onNotice,
}) {
  const [cartPage, setCartPage] = useState(0)
  const itemsPerPage = 6

  // Reset to first page when cart changes (e.g. items added/removed)
  React.useEffect(() => {
    if (cart.length > 0 && cart.length <= cartPage * itemsPerPage) {
      setCartPage(0)
    }
  }, [cart.length])

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [modalSearch, setModalSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [modalQty, setModalQty] = useState(1)
  const [modalCategory, setModalCategory] = useState('All')

  const [heldBills, setHeldBills] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')

  const [unpaidMetrics, setUnpaidMetrics] = useState({ totalUnpaid: 0, oldestUnpaidDays: 0, isOverdue: false })

  const [hasActiveJob, setHasActiveJob] = useState(true)

  // Drawer Cash Out / Expenses Modal State
  const [isCashOutModalOpen, setIsCashOutModalOpen] = useState(false)
  const [cashOutForm, setCashOutForm] = useState({
    category: 'Lunch',
    amount: '',
    notes: ''
  })
  const [isSubmittingCashOut, setIsSubmittingCashOut] = useState(false)

  const handleCashOutSubmit = async (e) => {
    e.preventDefault()
    if (!cashOutForm.amount || Number(cashOutForm.amount) <= 0) {
      if (onNotice) onNotice({ type: 'error', text: 'Please enter a valid expense amount.' })
      return
    }

    if (!hasActiveJob) {
      if (onNotice) onNotice({ type: 'error', text: 'Please start your shift (Start Job) before recording cash out.' })
      return
    }

    try {
      setIsSubmittingCashOut(true)
      await api.post('/shifts/expenses', cashOutForm, authConfig(session.token))
      if (onNotice) onNotice({ type: 'success', text: `Cash out of Rs. ${Number(cashOutForm.amount).toLocaleString()} (${cashOutForm.category}) recorded.` })
      setIsCashOutModalOpen(false)
      setCashOutForm({ category: 'Lunch', amount: '', notes: '' })
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to record cash out'
      if (onNotice) onNotice({ type: 'error', text: errMsg })
    } finally {
      setIsSubmittingCashOut(false)
    }
  }

  React.useEffect(() => {
    async function checkActiveJob() {
      if (!session || !api) return
      
      if (!navigator.onLine) {
        const offlineShifts = await getOfflineShifts()
        if (offlineShifts.length > 0) {
          const lastShift = offlineShifts[offlineShifts.length - 1]
          setHasActiveJob(lastShift.action === 'open')
        } else {
          const lastKnown = localStorage.getItem('ims-last-known-job') === 'true'
          setHasActiveJob(lastKnown) 
        }
        return
      }

      try {
        const res = await api.get(`/shifts/current?_t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${session.token}` }
        })
        setHasActiveJob(!!res.data)
        localStorage.setItem('ims-last-known-job', !!res.data ? 'true' : 'false')
      } catch (err) {
        setHasActiveJob(true)
      }
    }
    checkActiveJob()
  }, [session, api])

  React.useEffect(() => {
    if (!checkoutForm.customerId || !api || !session) {
      setUnpaidMetrics({ totalUnpaid: 0, oldestUnpaidDays: 0, isOverdue: false })
      return
    }

    const fetchUnpaid = async () => {
      try {
        const resp = await api.get(`/customer-invoices/customer/${checkoutForm.customerId}`, {
          headers: { Authorization: `Bearer ${session.token}` }
        })
        const unpaidInvoices = resp.data.filter(inv => inv.status === 'UNPAID' || inv.status === 'PARTIAL')
        
        let total = 0
        let oldestDays = 0
        const now = new Date()

        unpaidInvoices.forEach(inv => {
          total += Number(inv.balanceAmount || 0)
          const invDate = new Date(inv.date)
          const diffTime = Math.abs(now - invDate)
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
          if (diffDays > oldestDays) {
            oldestDays = diffDays
          }
        })

        const customerObj = customers.find(c => c._id === checkoutForm.customerId)
        const limitDays = customerObj?.creditPeriodDays || 0
        const isOverdue = limitDays > 0 && oldestDays > limitDays

        setUnpaidMetrics({ totalUnpaid: total, oldestUnpaidDays: oldestDays, isOverdue })
      } catch (err) {
        console.error("Failed to fetch unpaid metrics", err)
      }
    }
    fetchUnpaid()
  }, [checkoutForm.customerId, api, session, customers])

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const categories = ['All', ...new Set(catalogProducts.map(p => p.category))]
  const filteredProducts = catalogProducts.filter(p =>
    (activeCategory === 'All' || p.category === activeCategory)
  )

  const getRegularPrice = (item) => Number(item.price || 0)
  const getLoyaltySellingPrice = (item) => {
    const regularPrice = getRegularPrice(item)
    const loyaltyPrice = Number(item.loyaltyDiscount || 0)
    return checkoutForm.loyaltyCard
      ? Math.max(0, Math.min(regularPrice, loyaltyPrice || regularPrice))
      : regularPrice
  }
  const getSavedAmount = (item) => Math.max(0, getRegularPrice(item) - getLoyaltySellingPrice(item))

  const handleHoldBill = () => {
    if (cart.length === 0) return
    const newHold = {
      id: Date.now(),
      cart: [...cart],
      customer: checkoutForm.customerName || 'Walk-in Customer',
      total: cartTotal,
      time: new Date().toLocaleTimeString()
    }
    setHeldBills([newHold, ...heldBills])
    setCart([])
    setCheckoutForm({ ...checkoutForm, customerName: '' })
  }

  const handleResumeBill = (hold) => {
    setCart(hold.cart)
    setHeldBills(heldBills.filter(h => h.id !== hold.id))
  }

  return (
    <div className="pos-grid animate-fade" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', width: '100%', padding: '0 10px' }}>
      {!hasActiveJob && (
        <div className="p-3 cluster gap-2 align-center justify-center" style={{ gridColumn: '1 / -1', background: 'var(--warning-soft)', borderRadius: '8px', border: '1px solid var(--warning)', color: 'var(--warning-strong)', textAlign: 'center', fontSize: '1rem', fontWeight: 600 }}>
          <PauseCircle size={20} />
          You have not started your job yet. You must go to the "Work Shift" tab to Start Job before processing sales.
        </div>
      )}
      {unpaidMetrics.totalUnpaid > 0 && !unpaidMetrics.isOverdue && (
        <div className="p-3 cluster gap-2 align-center justify-center" style={{ gridColumn: '1 / -1', background: 'var(--warning-soft)', borderRadius: '8px', border: '1px solid var(--warning)', color: 'var(--warning-strong)', textAlign: 'center', fontSize: '1rem', fontWeight: 600 }}>
          <AlertCircle size={20} />
          This customer has an unpaid balance of {formatCurrency(unpaidMetrics.totalUnpaid)}.
        </div>
      )}
      {unpaidMetrics.isOverdue && (
        <div className="p-3 stack gap-1 align-center justify-center" style={{ gridColumn: '1 / -1', background: 'var(--danger-soft)', borderRadius: '8px', border: '1px solid var(--danger)', color: 'var(--danger-strong)', textAlign: 'center', fontSize: '1rem', fontWeight: 600 }}>
          <div className="cluster gap-2"><AlertCircle size={20} /> Customer has an unpaid balance of {formatCurrency(unpaidMetrics.totalUnpaid)}!</div>
          <div className="x-small">Payments are overdue (older than {customers.find(c => c._id === checkoutForm.customerId)?.creditPeriodDays || 0} days). Cannot process new credit bills until cleared.</div>
        </div>
      )}
      <aside className="stack gap-4 sticky-panel">
        <div className="panel p-4 stack gap-4 glass-panel" style={{ minHeight: '400px' }}>
          <div className="between wrap-row gap-2 mb-2">
            <SectionHeading title="Active Cart" text={`${cart.length} items`} />
            <div className="cluster gap-2">
              <button 
                type="button"
                className="btn small glow-on-hover" 
                title={hasActiveJob ? "Log Lunch, Transport or Drawer Cash Out" : "Please start shift first"}
                onClick={() => {
                  if (!hasActiveJob) {
                    if (onNotice) onNotice({ type: 'warning', text: 'You need to start your work shift (Start Job) before recording cash out.' })
                    return
                  }
                  setIsCashOutModalOpen(true)
                }}
                style={{ 
                  height: '38px', 
                  padding: '0 14px',
                  borderRadius: '10px',
                  background: 'var(--amber-soft, rgba(245, 158, 11, 0.12))', 
                  color: 'var(--amber-strong, #b45309)',
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: hasActiveJob ? 1 : 0.6
                }}
              >
                <Wallet size={16} />
                <span>Cash Out</span>
              </button>
            </div>
          </div>

          <div className="input-shell compact mb-2" style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '999px',
            cursor: 'pointer',
            padding: '2px 24px',
            boxShadow: 'var(--shadow-sm)'
          }} onClick={() => setIsSearchModalOpen(true)}>
            <Search size={18} className="muted" />
            <input
              readOnly
              className="ghost-input"
              placeholder="Find item..."
              style={{ cursor: 'pointer', fontSize: '0.9rem' }}
            />
          </div>

          <div className={`scanner-panel p-3 ${barcodeValue ? 'animate-pulse-soft' : ''}`} style={{ borderRadius: '12px', background: barcodeValue ? 'linear-gradient(145deg, var(--accent-soft), transparent)' : 'var(--bg-soft)', border: `1px solid ${barcodeValue ? 'var(--accent)' : 'var(--border)'}`, transition: 'all 0.3s ease', marginBottom: '8px' }}>
            <div className="between mb-1">
              <div className="cluster gap-2">
                <ScanLine size={14} className={barcodeValue ? 'accent-text' : 'muted'} />
                <strong style={{ fontSize: '0.8rem' }}>Barcode Scanner</strong>
              </div>
              {barcodeValue && <div className="pill" style={{ fontSize: '0.55rem', background: 'var(--accent)', color: 'white' }}>Captured</div>}
            </div>
            <p className="muted small" style={{ fontSize: '0.7rem' }}>
              {barcodeValue ? 'Item added to cart' : 'Awaiting barcode input...'}
            </p>
            {barcodeValue && (
              <div className="mt-2 p-2" style={{ borderRadius: '8px', background: 'var(--panel-strong)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-strong)', border: '1px solid var(--accent-soft)', textAlign: 'center', fontWeight: 600 }}>
                {barcodeValue}
              </div>
            )}
          </div>

          <div className="stack gap-0" style={{ flex: 1, overflowY: 'auto', maxHeight: '600px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-soft)', overflowX: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 1.5fr) 90px 1fr 1fr 1fr 34px', gap: '5px', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', fontSize: '0.7rem', fontWeight: 800, position: 'sticky', top: 0, zIndex: 10, letterSpacing: '0.03em', textTransform: 'uppercase', alignItems: 'center' }}>
              <span style={{ paddingRight: '4px', whiteSpace: 'nowrap' }}>Item Description</span>
              <span style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Qty</span>
              <span style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Price</span>
              <span style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Discount</span>
              <span style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Total</span>
              <span></span>
            </div>
            {cart.map((item) => (
              <div key={item.productId} style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 1.5fr) 90px 1fr 1fr 1fr 34px', gap: '5px', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', alignItems: 'center', transition: 'background 0.2s' }} className="glow-on-hover">
                <div className="stack" style={{ minWidth: 0, gap: '2px', justifySelf: 'stretch', paddingRight: '4px' }}>
                  <strong style={{ fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.1' }}>{item.name}</strong>
                  <div className="cluster gap-2" style={{ fontSize: '0.66rem', lineHeight: '1.05' }}>
                    <span className="muted">{item.sku}</span>
                    {item.activeBatch?.batchNumber && (
                      <span className="pill" style={{ 
                        fontSize: '0.62rem', 
                        padding: '1px 5px', 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        color: 'var(--accent)', 
                        fontWeight: 700,
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                      }}>
                        Batch: {item.activeBatch.batchNumber}
                        {item.activeBatch.expiryDate && ` (Exp: ${new Date(item.activeBatch.expiryDate).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })})`}
                      </span>
                    )}
                  </div>
                  {item.itemType === 'TABLET_CAPSULE' && (
                    <div className="cluster gap-1 mt-1">
                      <button
                        type="button"
                        className="btn small"
                        style={{ padding: '1px 5px', fontSize: '0.62rem', background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                        onClick={() => {
                          const cardTabs = item.tabletsPerCard || 12;
                          const nextQty = Math.min(cardTabs, item.available);
                          setCart(currentCart => currentCart.map(c => {
                            if (c.productId === item.productId) {
                              const effPrice = checkoutForm.loyaltyCard ? (c.loyaltyDiscount || c.price) : c.price;
                              return { ...c, quantity: nextQty, lineTotal: nextQty * effPrice };
                            }
                            return c;
                          }));
                        }}
                        title={`Set to 1 Card (${item.tabletsPerCard || 12} Tablets)`}
                      >
                        1 Card ({item.tabletsPerCard || 12} tabs)
                      </button>
                    </div>
                  )}
                </div>
                <div className="qty-box" style={{ background: 'var(--bg-soft)', borderRadius: '999px', padding: '2px', justifyContent: 'center', width: 'fit-content', justifySelf: 'center' }}>
                  <button className="qty-btn" type="button" style={{ width: '24px', height: '24px', fontSize: '0.85rem', borderRadius: '999px' }} onClick={() => changeCartQuantity(item.productId, 'decrease')}>-</button>
                  <strong style={{ minWidth: '24px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 800 }}>{item.quantity}</strong>
                  <button className="qty-btn" type="button" style={{ width: '24px', height: '24px', fontSize: '0.85rem', borderRadius: '999px' }} onClick={() => changeCartQuantity(item.productId, 'increase')}>+</button>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', minWidth: '84px', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-strong)' }}>{formatCurrency(getRegularPrice(item))}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', minWidth: '84px', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: getSavedAmount(item) > 0 ? 'var(--success)' : 'var(--text-soft)' }}>{formatCurrency(getSavedAmount(item))}</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-strong)' }}>{formatCurrency(item.lineTotal)}</div>
                <button
                  type="button"
                  onClick={() => setCart(cart.filter(c => c.productId !== item.productId))}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.6, justifySelf: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="empty-state compact" style={{ padding: '80px 20px' }}>
                <ShoppingCart size={40} className="muted mb-3" style={{ opacity: 0.3 }} />
                <p className="muted small">Cart is empty. Scan items or select from the catalog above.</p>
              </div>
            )}
          </div>

          {heldBills.length > 0 && (
            <div className="stack gap-3 mt-4 pt-4" style={{ borderTop: '1px dashed var(--border)' }}>
              <div className="cluster gap-2 muted">
                <History size={14} />
                <span className="eyebrow" style={{ fontSize: '0.65rem' }}>Held Orders ({heldBills.length})</span>
              </div>
              <div className="cluster gap-2 wrap-row">
                {heldBills.map(hold => (
                  <button key={hold.id} className="pill neutral-soft glow-on-hover" style={{ cursor: 'pointer', border: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 12px' }} onClick={() => handleResumeBill(hold)}>
                    <span style={{ fontWeight: 700 }}>{hold.customer}</span>
                    <span className="accent-text" style={{ fontSize: '0.75rem' }}>{formatCurrency(hold.total)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bill-summary stack gap-2 mt-auto">
            <div className="between">
              <span className="muted small">Subtotal</span>
              <span className="font-strong small">{formatCurrency(cartSubtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="between">
                <span className="small" style={{ color: 'var(--danger)' }}>
                  Discount {checkoutForm.discountType === 'fixed' ? '(LKR Cash)' : `(${checkoutForm.discount}%)`}
                </span>
                <span className="font-strong small" style={{ color: 'var(--danger)' }}>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="between total-line pt-2" style={{ borderTop: '1px dashed var(--border)', marginTop: '8px' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>Payable Amount</span>
              <strong>{formatCurrency(cartTotal)}</strong>
            </div>
          </div>
        </div>
      </aside>

      <aside className="stack gap-3 sticky-panel">
        <form className="panel p-4 stack gap-4 glass-panel" onSubmit={handleCheckout} style={{ position: 'sticky', top: '16px', border: '1px solid var(--accent-soft)' }}>
          <div className="stack gap-3">
            {checkoutForm.loyaltyCard && (
              <div className="p-4 mb-4" style={{
                borderRadius: '16px',
                background: 'linear-gradient(135deg, var(--accent-soft), rgba(59, 130, 246, 0.04))',
                border: '1px solid rgba(37, 99, 235, 0.15)',
                boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.08)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '40%', height: '80%', background: 'var(--accent)', opacity: 0.03, filter: 'blur(40px)', transform: 'rotate(-15deg)' }} />

                <div className="between mb-3">
                  <div className="cluster gap-3">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', background: 'white', borderRadius: '12px', color: 'var(--accent)', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Loyalty Member</h4>
                      <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-soft)', fontWeight: 500 }}>Special Member Pricing</p>
                    </div>
                  </div>
                  <div className="pill" style={{ background: 'var(--success)', color: 'white', fontSize: '0.6rem', fontWeight: 900, padding: '4px 10px', letterSpacing: '0.05em', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
                    APPLIED
                  </div>
                </div>

                <div className="stack gap-2 p-3" style={{ background: 'rgba(255, 255, 255, 0.6)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)' }}>
                  <div className="between align-center">
                    <span style={{ fontSize: '0.6rem', color: 'black', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member ID</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 900, color: 'black', letterSpacing: '0.08em', textAlign: 'center' }}>
                    {checkoutForm.loyaltyCard}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', padding: '0 4px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(37, 99, 235, 0.1)' }}></div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-soft)', fontWeight: 500 }}>Exclusive discount active</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(37, 99, 235, 0.1)' }}></div>
                </div>
              </div>
            )}

            <label className="field">
              <span>Customer Identification</span>
              <button
                type="button"
                className="input-shell" style={{ height: '42px', justifyContent: 'space-between', cursor: 'pointer', border: '1px solid var(--border)', background: checkoutForm.customerName ? 'var(--panel)' : 'var(--bg-soft)', display: 'flex', alignItems: 'center' }}
                onClick={() => setIsCustomerModalOpen(true)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={16} className="muted" />
                  <div className="stack gap-0" style={{ alignItems: 'flex-start' }}>
                    <span style={{ color: checkoutForm.customerName ? 'var(--text)' : 'var(--text-soft)' }}>{checkoutForm.customerName || 'Walk-in Customer'}</span>
                    {checkoutForm.customerId && unpaidMetrics.totalUnpaid > 0 && (
                      <span className="x-small font-strong" style={{ color: unpaidMetrics.isOverdue ? 'var(--danger)' : 'var(--text-soft)' }}>
                        Unpaid: {formatCurrency(unpaidMetrics.totalUnpaid)} | Oldest: {unpaidMetrics.oldestUnpaidDays} days
                      </span>
                    )}
                  </div>
                </div>
                <Users size={16} className="muted" />
              </button>
            </label>

            <div className="split-fields" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label className="field">
                <span>Payment</span>
                <select
                  className="input"
                  style={{ height: '42px', padding: '0 12px' }}
                  value={checkoutForm.paymentMethod}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, paymentMethod: e.target.value })}
                >
                  <option value="cash">Cash Payment</option>
                  <option value="card">Card Payment</option>
                  <option value="upi">UPI / Digital</option>
                  <option value="credit" disabled={!checkoutForm.customerId}>Store Credit / Account</option>
                  <option value="split">Split / Multiple</option>
                </select>
              </label>
              <label className="field">
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Discount</span>
                <div 
                  className="input-shell" 
                  style={{ 
                    height: '42px', 
                    padding: '3px 4px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    border: '1.5px solid var(--border)',
                    borderRadius: '10px'
                  }}
                >
                  {/* Segmented Big Mode Toggle inside the input: RS first, then % */}
                  <div 
                    style={{ 
                      display: 'inline-flex', 
                      background: 'var(--bg-soft)', 
                      padding: '2px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border)' 
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: checkoutForm.discountType === 'fixed' || !checkoutForm.discountType ? 'var(--accent)' : 'transparent',
                        color: checkoutForm.discountType === 'fixed' || !checkoutForm.discountType ? '#ffffff' : 'var(--text-soft)',
                        boxShadow: checkoutForm.discountType === 'fixed' || !checkoutForm.discountType ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                      }}
                      onClick={() => setCheckoutForm({ ...checkoutForm, discountType: 'fixed' })}
                      title="Cash / Flat Discount in LKR (Rs.)"
                    >
                      Rs
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: checkoutForm.discountType === 'percentage' ? 'var(--accent)' : 'transparent',
                        color: checkoutForm.discountType === 'percentage' ? '#ffffff' : 'var(--text-soft)',
                        boxShadow: checkoutForm.discountType === 'percentage' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                      }}
                      onClick={() => setCheckoutForm({ ...checkoutForm, discountType: 'percentage' })}
                      title="Percentage Discount (%)"
                    >
                      %
                    </button>
                  </div>

                  <input
                    className="ghost-input"
                    type="number"
                    min="0"
                    placeholder="0"
                    style={{ 
                      flex: 1, 
                      fontSize: '1rem', 
                      fontWeight: 700, 
                      textAlign: 'center',
                      padding: '0 4px'
                    }}
                    value={checkoutForm.discount}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, discount: e.target.value })}
                  />

                  <span 
                    className="font-strong" 
                    style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--text-muted)', 
                      paddingRight: '6px' 
                    }}
                  >
                    {checkoutForm.discountType === 'fixed' ? 'LKR' : '%'}
                  </span>
                </div>
              </label>
            </div>

            <div className="cluster gap-2 mt-2">
              {checkoutForm.discountType === 'fixed' ? (
                <>
                  {[2, 5, 10, 15, 20].map(val => (
                    <button
                      key={val}
                      type="button"
                      className="pill neutral-soft small glow-on-hover"
                      style={{ cursor: 'pointer', padding: '4px 10px', border: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 600 }}
                      onClick={() => setCheckoutForm({ ...checkoutForm, discount: String(val) })}
                    >
                      Rs. {val}
                    </button>
                  ))}
                  {cartSubtotal > 0 && cartSubtotal % 10 !== 0 && (
                    <button
                      type="button"
                      className="pill neutral-soft small glow-on-hover"
                      style={{ cursor: 'pointer', padding: '4px 10px', border: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 700 }}
                      onClick={() => {
                        const remainder = cartSubtotal % 10
                        setCheckoutForm({ ...checkoutForm, discount: String(remainder) })
                      }}
                      title="Round to nearest 10 (e.g. Rs. 95 -> Rs. 90)"
                    >
                      -Rs. {cartSubtotal % 10} (Round)
                    </button>
                  )}
                </>
              ) : (
                [5, 10, 15, 20].map(val => (
                  <button
                    key={val}
                    type="button"
                    className="pill neutral-soft small glow-on-hover"
                    style={{ cursor: 'pointer', padding: '4px 12px', border: '1px solid var(--border)', fontSize: '0.7rem' }}
                    onClick={() => setCheckoutForm({ ...checkoutForm, discount: String(val) })}
                  >
                    {val}%
                  </button>
                ))
              )}
            </div>

            {checkoutForm.paymentMethod === 'cash' && (
              <div className="stack gap-3 p-3 mt-1" style={{ borderRadius: '14px', background: 'var(--panel-strong)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="between">
                  <span className="muted small font-strong">Received Amount</span>
                  <div style={{ position: 'relative', width: '130px' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem' }}>Rs.</span>
                    <input
                      className="input"
                      type="number"
                      placeholder="0.00"
                      style={{ textAlign: 'right', paddingLeft: '32px', fontSize: '1.05rem', width: '100%', fontWeight: 700, height: '38px', borderRadius: '8px' }}
                      value={checkoutForm.receivedAmount || ''}
                      onChange={(e) => setCheckoutForm({ ...checkoutForm, receivedAmount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="between pt-2" style={{ borderTop: '1px dashed var(--border)' }}>
                  <span className="muted small font-strong">Change to Return</span>
                  <strong className="accent-text" style={{ fontSize: '1.25rem' }}>
                    {formatCurrency(Math.max(0, (Number(checkoutForm.receivedAmount || 0) - cartTotal)))}
                  </strong>
                </div>
              </div>
            )}

            {checkoutForm.paymentMethod === 'credit' && (
              <div className="stack gap-3 p-3 mt-1" style={{ borderRadius: '14px', background: 'var(--panel-strong)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="between align-center">
                  <span className="small">Bill Payment Period (Days)</span>
                  <input
                    className="input"
                    type="number"
                    placeholder="e.g. 30"
                    style={{ width: '130px', textAlign: 'right', height: '34px', padding: '0 8px', fontSize: '0.9rem' }}
                    value={checkoutForm.creditPeriodDays || ''}
                    onChange={e => setCheckoutForm({ ...checkoutForm, creditPeriodDays: e.target.value })}
                  />
                </div>
                <div className="between align-center">
                  <span className="small">Store in Payment Times</span>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. 3 installments"
                    style={{ width: '130px', textAlign: 'right', height: '34px', padding: '0 8px', fontSize: '0.9rem' }}
                    value={checkoutForm.paymentTerms || ''}
                    onChange={e => setCheckoutForm({ ...checkoutForm, paymentTerms: e.target.value })}
                  />
                </div>
              </div>
            )}

            {checkoutForm.paymentMethod === 'split' && (
              <div className="stack gap-3 p-3 mt-1" style={{ borderRadius: '14px', background: 'var(--panel-strong)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="between align-center" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  <span className="muted small font-strong">Split Allocation</span>
                  <span className="x-small pill neutral-soft" style={{ fontSize: '0.7rem' }}>Total: {formatCurrency(cartTotal)}</span>
                </div>

                <div className="stack gap-2">
                  <div className="between align-center">
                    <span className="small">Cash Portion</span>
                    <input
                      className="input"
                      type="number"
                      placeholder="0.00"
                      style={{ width: '120px', textAlign: 'right', height: '34px', padding: '0 8px', fontSize: '0.9rem' }}
                      value={checkoutForm.splitCash || ''}
                      onChange={e => setCheckoutForm({ ...checkoutForm, splitCash: e.target.value })}
                    />
                  </div>

                  <div className="between align-center">
                    <span className="small">Card Portion</span>
                    <input
                      className="input"
                      type="number"
                      placeholder="0.00"
                      style={{ width: '120px', textAlign: 'right', height: '34px', padding: '0 8px', fontSize: '0.9rem' }}
                      value={checkoutForm.splitCard || ''}
                      onChange={e => setCheckoutForm({ ...checkoutForm, splitCard: e.target.value })}
                    />
                  </div>

                  <div className="between align-center">
                    <span className="small">UPI Portion</span>
                    <input
                      className="input"
                      type="number"
                      placeholder="0.00"
                      style={{ width: '120px', textAlign: 'right', height: '34px', padding: '0 8px', fontSize: '0.9rem' }}
                      value={checkoutForm.splitUpi || ''}
                      onChange={e => setCheckoutForm({ ...checkoutForm, splitUpi: e.target.value })}
                    />
                  </div>

                  <div className="between align-center" style={{ opacity: checkoutForm.customerId ? 1 : 0.5 }}>
                    <div className="stack gap-0">
                      <span className="small">Credit Portion</span>
                      {!checkoutForm.customerId && <span className="muted" style={{ fontSize: '0.65rem' }}>Select customer first</span>}
                    </div>
                    <input
                      className="input"
                      type="number"
                      placeholder="0.00"
                      disabled={!checkoutForm.customerId}
                      style={{ width: '120px', textAlign: 'right', height: '34px', padding: '0 8px', fontSize: '0.9rem' }}
                      value={checkoutForm.splitCredit || ''}
                      onChange={e => setCheckoutForm({ ...checkoutForm, splitCredit: e.target.value })}
                    />
                  </div>
                </div>

                <div className="between pt-2" style={{ borderTop: '1px dashed var(--border)' }}>
                  <span className="muted small font-strong">Remaining to Split</span>
                  <strong style={{ color: Math.abs(cartTotal - (Number(checkoutForm.splitCash || 0) + Number(checkoutForm.splitCard || 0) + Number(checkoutForm.splitUpi || 0) + Number(checkoutForm.splitCredit || 0))) < 0.01 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatCurrency(cartTotal - (Number(checkoutForm.splitCash || 0) + Number(checkoutForm.splitCard || 0) + Number(checkoutForm.splitUpi || 0) + Number(checkoutForm.splitCredit || 0)))}
                  </strong>
                </div>
              </div>
            )}

            <button
              className="btn btn-primary w-full mt-2 glow-on-hover"
              type="submit"
              disabled={
                !hasActiveJob ||
                busyAction === 'checkout' ||
                cart.length === 0 ||
                (unpaidMetrics.isOverdue && (checkoutForm.paymentMethod === 'credit' || (checkoutForm.paymentMethod === 'split' && Number(checkoutForm.splitCredit || 0) > 0))) ||
                (checkoutForm.paymentMethod === 'split' && Math.abs(cartTotal - (Number(checkoutForm.splitCash || 0) + Number(checkoutForm.splitCard || 0) + Number(checkoutForm.splitUpi || 0) + Number(checkoutForm.splitCredit || 0))) > 0.01) ||
                (checkoutForm.paymentMethod === 'cash' && (!checkoutForm.receivedAmount || Number(checkoutForm.receivedAmount) < cartTotal))
              }
              style={{ height: '48px', borderRadius: '14px' }}
            >
              {busyAction === 'checkout' ? <div className="spinner" style={{ width: '20px', height: '20px' }}></div> : <Receipt size={18} />}
              {busyAction === 'checkout' ? 'Processing...' : (
                checkoutForm.paymentMethod === 'split' && Math.abs(cartTotal - (Number(checkoutForm.splitCash || 0) + Number(checkoutForm.splitCard || 0) + Number(checkoutForm.splitUpi || 0) + Number(checkoutForm.splitCredit || 0))) > 0.01
                  ? `Remaining: ${formatCurrency(cartTotal - (Number(checkoutForm.splitCash || 0) + Number(checkoutForm.splitCard || 0) + Number(checkoutForm.splitUpi || 0) + Number(checkoutForm.splitCredit || 0)))}`
                  : `Finalize & Pay ${formatCurrency(cartTotal)}`
              )}
            </button>
          </div>
        </form>
      </aside>

      {/* Premium Item Search Modal */}
      {isSearchModalOpen && (
        <div className="modal-overlay animate-fade" style={{ position: 'fixed', inset: 0, backdropFilter: 'blur(12px)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '10px' }}>
          <div className="panel p-0 stack glass-panel animate-scale" style={{ width: '100%', maxWidth: '950px', maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>

            {/* Modal Header */}
            <div className="p-4 between" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)' }}>
              <div className="stack gap-0">
                <div className="cluster gap-2">
                  <div className="icon-btn-small" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', width: '32px', height: '32px' }}><ShoppingCart size={16} /></div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Quick Product Finder</h3>
                </div>
                <p className="muted x-small" style={{ marginLeft: '40px' }}>Search through entire inventory catalog</p>
              </div>
              <button className="icon-btn glow-on-hover" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: '10px', width: '36px', height: '36px' }} onClick={() => { setIsSearchModalOpen(false); setSelectedItem(null); setModalSearch(''); setModalCategory('All'); }}><X size={18} /></button>
            </div>

            {!selectedItem ? (
              <div className="stack gap-0 flex-1 overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="p-3 stack gap-2" style={{ background: 'rgba(0,0,0,0.05)' }}>
                  <div className="input-shell" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px', boxShadow: 'var(--shadow-sm)' }}>
                    <Search size={18} className="muted" />
                    <input
                      autoFocus
                      className="ghost-input"
                      placeholder="Type name, barcode, or SKU..."
                      style={{ fontSize: '0.9rem' }}
                      value={modalSearch}
                      onChange={e => setModalSearch(e.target.value)}
                    />
                  </div>

                  <div className="cluster gap-2 wrap-row no-scrollbar" style={{ overflowX: 'auto', paddingBottom: '2px' }}>
                    {['All', ...new Set(catalogProducts.map(p => p.category))].map(cat => (
                      <button
                        key={cat}
                        className={`pill ${modalCategory === cat ? 'active' : 'neutral-soft'}`}
                        style={{ cursor: 'pointer', border: 'none', padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700, transition: 'all 0.2s' }}
                        onClick={() => setModalCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Results Grid (Box-like cards) */}
                <div className="product-grid flex-1 p-3 custom-scrollbar" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '10px',
                  background: 'rgba(0,0,0,0.02)',
                  overflowY: 'scroll'
                }}>
                  {catalogProducts.filter(p => {
                    const matchesSearch = p.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                      p.sku.toLowerCase().includes(modalSearch.toLowerCase()) ||
                      p.barcode?.includes(modalSearch);
                    const matchesCategory = modalCategory === 'All' || p.category === modalCategory;
                    return matchesSearch && matchesCategory;
                  }).map(product => (
                    <div
                      key={product._id}
                      className="product-card stack glass-panel-sm glow-on-hover"
                      style={{
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        background: 'var(--panel)',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                      onClick={() => { setSelectedItem(product); setModalQty(1); }}
                    >
                      <div style={{ position: 'relative', height: '80px', overflow: 'hidden' }}>
                        <img src={product.image || null} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {product.quantityInStock <= product.reorderLevel && (
                          <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--danger)', color: 'white', padding: '2px 6px', borderRadius: '6px', fontSize: '0.55rem', fontWeight: 800, boxShadow: 'var(--shadow-sm)' }}>
                            LOW
                          </div>
                        )}
                        {product.quantityInStock <= 0 && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 900, fontSize: '0.75rem' }}>SOLD OUT</div>
                        )}
                      </div>

                      <div className="stack gap-1 p-2">
                        <strong style={{ fontSize: '0.75rem', color: 'var(--text-strong)', height: '2.4em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.2' }}>{product.name}</strong>
                        <div className="between align-end mt-0">
                          <div className="stack">
                            <span className="muted x-small" style={{ fontSize: '0.55rem' }}>LKR</span>
                            <strong className="accent-text" style={{ fontSize: '0.9rem' }}>{product.price.toLocaleString()}</strong>
                          </div>
                          <div className="icon-btn-small" style={{ width: '24px', height: '24px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: '6px' }}>
                            <Plus size={12} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (() => {
              const regularPrice = getRegularPrice(selectedItem)
              const loyaltyPrice = getLoyaltySellingPrice(selectedItem)
              const isLoyaltyDiscountActive = checkoutForm.loyaltyCard && loyaltyPrice < regularPrice
              const activePrice = loyaltyPrice
              return (
                <div className="grid cols-1 md-cols-2 gap-6 p-6 md:p-8 flex-1 overflow-y-auto animate-scale" style={{ alignContent: 'start' }}>
                  {/* Left Column: Showcase */}
                  <div className="stack gap-4" style={{ alignItems: 'center' }}>
                    <div className="panel p-4 stack gap-4 relative w-full" style={{
                      background: 'var(--panel-strong)',
                      borderRadius: '24px',
                      boxShadow: 'var(--shadow-lg)',
                      border: '1px solid var(--border)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* Category Badge */}
                      {selectedItem.category && (
                        <div style={{
                          position: 'absolute',
                          top: 16,
                          left: 16,
                          background: 'var(--accent-soft)',
                          color: 'var(--accent-strong)',
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          zIndex: 2
                        }}>
                          {selectedItem.category}
                        </div>
                      )}

                      {/* Stock Warning Badge */}
                      {selectedItem.quantityInStock <= selectedItem.reorderLevel && (
                        <div style={{
                          position: 'absolute',
                          top: 16,
                          right: 16,
                          background: 'var(--danger-soft)',
                          color: 'var(--danger)',
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          zIndex: 2,
                          border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                          {selectedItem.quantityInStock <= 0 ? 'SOLD OUT' : 'LOW STOCK'}
                        </div>
                      )}

                      {/* Image Container */}
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '1.3',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        background: 'var(--bg-soft)',
                        border: '1px solid var(--border)',
                        marginTop: selectedItem.category || selectedItem.quantityInStock <= selectedItem.reorderLevel ? '24px' : '0px'
                      }}>
                        <img
                          src={selectedItem.image || null}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      </div>

                      {/* Product Metadata Details */}
                      <div className="stack gap-2 pt-3" style={{ borderTop: '1px dashed var(--border)' }}>
                        <div className="between">
                          <div className="cluster gap-2 muted x-small">
                            <Barcode size={13} />
                            <span>SKU</span>
                          </div>
                          <strong className="x-small" style={{ color: 'var(--text)' }}>{selectedItem.sku || 'N/A'}</strong>
                        </div>

                        <div className="between">
                          <div className="cluster gap-2 muted x-small">
                            <Package size={13} />
                            <span>Available Stock</span>
                          </div>
                          <strong className="x-small" style={{ color: selectedItem.quantityInStock <= selectedItem.reorderLevel ? 'var(--danger)' : 'var(--success)' }}>
                            {selectedItem.quantityInStock} units
                          </strong>
                        </div>

                        {selectedItem.barcode && (
                          <div className="between">
                            <div className="cluster gap-2 muted x-small">
                              <ScanLine size={13} />
                              <span>Barcode</span>
                            </div>
                            <strong className="x-small" style={{ color: 'var(--text)' }}>{selectedItem.barcode}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Pricing & Controls */}
                  <div className="stack gap-5" style={{ textAlign: 'left', justifyContent: 'center' }}>
                    <div className="stack gap-2">
                      <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: 'var(--text)', lineHeight: '1.2' }}>
                        {selectedItem.name}
                      </h2>
                      {isLoyaltyDiscountActive ? (
                        <div className="stack gap-1">
                          <div className="cluster gap-2">
                            <span style={{ textDecoration: 'line-through', color: 'var(--text-soft)', fontSize: '1rem' }}>
                              {formatCurrency(regularPrice)}
                            </span>
                            <span style={{ background: 'var(--success-soft)', color: 'var(--success)', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Loyalty Discount Active
                            </span>
                          </div>
                          <div className="accent-text font-bold" style={{ fontSize: '1.6rem' }}>
                            {formatCurrency(loyaltyPrice)} <span className="muted font-medium x-small">/ unit</span>
                          </div>
                        </div>
                      ) : (
                        <div className="accent-text font-bold" style={{ fontSize: '1.6rem' }}>
                          {formatCurrency(regularPrice)} <span className="muted font-medium x-small">/ unit</span>
                        </div>
                      )}
                    </div>

                    {/* Quantity Selector Stepper */}
                    <div className="stack gap-2">
                      <span className="eyebrow muted x-small uppercase tracking-wider font-bold">Select Quantity</span>
                      <div className="cluster gap-4 wrap-row">
                        <div className="qty-box" style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: 'var(--bg-soft)',
                          borderRadius: '999px',
                          padding: '6px',
                          border: '1px solid var(--border)',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)',
                          gap: '12px'
                        }}>
                          <button
                            type="button"
                            className="qty-btn glow-on-hover"
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: 'var(--panel-strong)',
                              border: '1px solid var(--border)',
                              color: 'var(--text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => setModalQty(q => Math.max(1, q - 1))}
                          >
                            <Minus size={16} />
                          </button>
                          <input
                            type="number"
                            className="ghost-input"
                            style={{ width: '60px', textAlign: 'center', fontWeight: 900, fontSize: '1.3rem', color: 'var(--text)' }}
                            value={modalQty}
                            onChange={e => setModalQty(Math.max(1, parseInt(e.target.value) || 1))}
                          />
                          <button
                            type="button"
                            className="qty-btn glow-on-hover"
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: 'var(--panel-strong)',
                              border: '1px solid var(--border)',
                              color: 'var(--text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => setModalQty(q => q + 1)}
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="cluster gap-2">
                          {[1, 2, 5, 10].map(val => (
                            <button
                              key={val}
                              type="button"
                              className="pill neutral-soft glow-on-hover"
                              style={{
                                cursor: 'pointer',
                                border: '1px solid var(--border)',
                                background: 'var(--panel-strong)',
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                borderRadius: '10px',
                                transition: 'all 0.2s'
                              }}
                              onClick={() => setModalQty(q => q + val)}
                            >
                              +{val}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="pill neutral-soft"
                            style={{
                              cursor: 'pointer',
                              border: '1px solid var(--border)',
                              background: 'var(--panel-strong)',
                              padding: '6px 12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: 'var(--danger)',
                              borderRadius: '10px',
                              transition: 'all 0.2s'
                            }}
                            onClick={() => setModalQty(1)}
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Receipt-Style Pricing Ticket */}
                    <div className="panel p-4 stack gap-2" style={{
                      background: 'var(--panel-strong)',
                      borderRadius: '16px',
                      border: '1px dashed var(--border)',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      <div className="between">
                        <span className="muted small">Unit Price</span>
                        <span className="font-medium small">{formatCurrency(activePrice)}</span>
                      </div>
                      <div className="between">
                        <span className="muted small">Quantity</span>
                        <span className="font-medium small">x {modalQty}</span>
                      </div>
                      {isLoyaltyDiscountActive && (
                        <div className="between" style={{ color: 'var(--success)' }}>
                          <span className="small">Loyalty Savings</span>
                          <span className="font-bold small">-{formatCurrency((regularPrice - loyaltyPrice) * modalQty)}</span>
                        </div>
                      )}
                      <div style={{ margin: '8px 0', borderTop: '1px dashed var(--border)' }}></div>
                      <div className="between">
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text)' }}>Total Amount</strong>
                        <strong className="accent-text" style={{ fontSize: '1.4rem', fontWeight: 900 }}>
                          {formatCurrency(activePrice * modalQty)}
                        </strong>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="cluster gap-3 w-full pt-2">
                      <button
                        type="button"
                        className="btn btn-secondary glow-on-hover"
                        style={{ flex: 1, padding: '12px 20px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700 }}
                        onClick={() => setSelectedItem(null)}
                      >
                        Back to Search
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary glow-on-hover"
                        style={{
                          flex: 1.8,
                          padding: '12px 20px',
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          fontWeight: 800,
                          background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                          boxShadow: 'var(--shadow-accent)',
                          color: '#fff'
                        }}
                        onClick={() => {
                          for (let i = 0; i < modalQty; i++) {
                            addProductToCart(selectedItem);
                          }
                          setIsSearchModalOpen(false);
                          setSelectedItem(null);
                          setModalSearch('');
                          setModalCategory('All');
                        }}
                      >
                        <Check size={18} />
                        <span>Confirm & Add to Bill</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Customer Selection Modal */}
      {isCustomerModalOpen && (
        <div className="modal-overlay animate-fade" style={{ position: 'fixed', inset: 0, backdropFilter: 'blur(12px)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '10px' }}>
          <div className="panel p-0 stack glass-panel animate-scale" style={{ width: '100%', maxWidth: '450px', maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>

            {/* Modal Header */}
            <div className="p-4 between" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)' }}>
              <div className="stack gap-0">
                <div className="cluster gap-2">
                  <div className="icon-btn-small" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', width: '32px', height: '32px' }}><Users size={16} /></div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Select Customer</h3>
                </div>
                <p className="muted x-small" style={{ marginLeft: '40px' }}>Choose or add customer for this bill</p>
              </div>
              <button className="icon-btn glow-on-hover" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: '10px', width: '36px', height: '36px' }} onClick={() => { setIsCustomerModalOpen(false); setCustomerSearch(''); }}><X size={18} /></button>
            </div>

            {/* Search Bar */}
            <div className="p-3" style={{ background: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--border)' }}>
              <div className="input-shell" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px', boxShadow: 'var(--shadow-sm)' }}>
                <Search size={18} className="muted" />
                <input
                  autoFocus
                  className="ghost-input"
                  placeholder="Search by customer name..."
                  style={{ fontSize: '0.9rem' }}
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Customer List */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: '200px' }}>
              {/* Walk-in Option */}
              <button
                type="button"
                onClick={() => {
                  setCheckoutForm({ 
                    ...checkoutForm, 
                    customerName: 'Walk-in Customer', 
                    customerId: '',
                    paymentMethod: checkoutForm.paymentMethod === 'credit' ? 'cash' : checkoutForm.paymentMethod,
                    splitCredit: '' 
                  })
                  setIsCustomerModalOpen(false)
                  setCustomerSearch('')
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: checkoutForm.customerName === 'Walk-in Customer' ? 'var(--accent-soft)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s'
                }}
                className="glow-on-hover"
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--neutral-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} style={{ color: 'var(--text-soft)' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text)' }}>Walk-in Customer</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>No customer details</span>
                </div>
              </button>

              {/* Customer List */}
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(customer => (
                  <button
                    key={customer._id}
                    type="button"
                    onClick={() => {
                      setCheckoutForm({ ...checkoutForm, customerName: customer.name, customerId: customer._id })
                      setIsCustomerModalOpen(false)
                      setCustomerSearch('')
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: checkoutForm.customerName === customer.name ? 'var(--accent-soft)' : 'transparent',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background 0.2s'
                    }}
                    className="glow-on-hover"
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--neutral-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)' }}>
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text)' }}>{customer.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>{customer.phone || 'No phone'}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-soft)' }}>
                  <Users size={32} style={{ opacity: 0.2, marginBottom: '10px' }} />
                  <p>No customers found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cash Out / Expenses Modal */}
      {isCashOutModalOpen && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '440px', width: '100%' }}>
            <div className="between mb-3">
              <div className="cluster gap-2">
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--amber-soft, rgba(245, 158, 11, 0.15))',
                  color: 'var(--amber-strong, #b45309)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Cash Out / Drawer Expense</h3>
                  <p className="muted x-small" style={{ margin: 0 }}>Record petty cash taken from drawer (Lunch, Transport, etc.)</p>
                </div>
              </div>
              <button 
                type="button"
                className="icon-btn" 
                onClick={() => setIsCashOutModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCashOutSubmit} className="stack gap-3">
              <label className="field">
                <span className="small font-strong">Expense Category</span>
                <select
                  className="input"
                  style={{ height: '42px', borderRadius: '10px' }}
                  value={cashOutForm.category}
                  onChange={(e) => setCashOutForm({ ...cashOutForm, category: e.target.value })}
                  required
                >
                  <option value="Lunch">🍱 Lunch / Food</option>
                  <option value="Transport">🚕 Transport / Delivery Fare</option>
                  <option value="Tea/Snacks">☕ Tea & Snacks</option>
                  <option value="Cleaning/Supplies">🧹 Cleaning & Supplies</option>
                  <option value="Emergency Purchase">🚨 Emergency Purchase</option>
                  <option value="Other">📝 Other Drawer Expense</option>
                </select>
              </label>

              <label className="field">
                <span className="small font-strong">Amount (LKR) *</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  className="input"
                  placeholder="e.g. 450"
                  style={{ height: '44px', fontSize: '1.1rem', fontWeight: 700, borderRadius: '10px' }}
                  value={cashOutForm.amount}
                  onChange={(e) => setCashOutForm({ ...cashOutForm, amount: e.target.value })}
                  required
                  autoFocus
                />
              </label>

              {/* Quick amount shortcuts */}
              <div className="cluster gap-2">
                {[100, 200, 300, 500, 1000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    className="pill neutral-soft"
                    style={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px' }}
                    onClick={() => setCashOutForm(prev => ({ ...prev, amount: amt.toString() }))}
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              <label className="field">
                <span className="small font-strong">Notes / Reason (Optional)</span>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Lunch for 2 cashiers"
                  style={{ height: '40px', borderRadius: '10px' }}
                  value={cashOutForm.notes}
                  onChange={(e) => setCashOutForm({ ...cashOutForm, notes: e.target.value })}
                />
              </label>

              <div className="between pt-2 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsCashOutModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={isSubmittingCashOut || !cashOutForm.amount}
                  style={{ fontWeight: 700 }}
                >
                  {isSubmittingCashOut ? 'Recording...' : 'Confirm Cash Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
