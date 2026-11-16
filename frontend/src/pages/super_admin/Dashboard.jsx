/**
 * Module: Dashboard
 * 
 * React UI page component representing the Dashboard view.
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Users,
  TrendingUp,
  Warehouse,
  Plus,
  ArrowRight,
  ShieldCheck,
  FileText,
  ShoppingCart,
  Package,
  CornerDownLeft,
  CornerUpLeft,
  CreditCard,
  RefreshCcw,
  X,
  Zap,
  Eye,
  Wallet,
  ReceiptText,
  Printer,
  Download
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { MetricCard } from '../../components/MetricCard'
import { SectionHeading } from '../../components/SectionHeading'
import { formatCurrency, formatDate, authConfig, exportToCSV } from '../../utils'

export function SuperAdminDashboard({ api, session }) {
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showActivitiesModal, setShowActivitiesModal] = useState(false)
  const [selectedActivityCategory, setSelectedActivityCategory] = useState(null)
  const [trendRange, setTrendRange] = useState('monthly')
  const [customDates, setCustomDates] = useState({ start: '', end: '' })
  const [selectedBranch, setSelectedBranch] = useState('')
  const [showProfitModal, setShowProfitModal] = useState(false)

  const handleExportProfitCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    const data = [
      { Metric: "Date", Value: today },
      { Metric: "Scope", Value: selectedBranch || "Consolidated (All Branches)" },
      { Metric: "Total Sales Revenue", Value: (overview?.metrics.revenueToday ?? 0).toFixed(2) },
      { Metric: "Cost of Goods Sold (COGS)", Value: (Math.max(0, (overview?.metrics.revenueToday ?? 0) - (overview?.metrics.todayGrossProfit ?? 0))).toFixed(2) },
      { Metric: "Gross Profit", Value: (overview?.metrics.todayGrossProfit ?? 0).toFixed(2) },
      { Metric: "Cashier Drawer Expenses", Value: (overview?.metrics.todayDrawerExpenses ?? 0).toFixed(2) },
      { Metric: "Today Net Profit", Value: (overview?.metrics.todayNetProfit ?? 0).toFixed(2) },
    ];
    exportToCSV(data, `Corporate_Net_Profit_Audit_${today}`);
  };

  const handlePrintProfitAudit = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const cogs = Math.max(0, (overview?.metrics.revenueToday ?? 0) - (overview?.metrics.todayGrossProfit ?? 0));
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Today Net Profit Audit - ${today}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
            .title { font-size: 24px; font-weight: 800; margin: 0; }
            .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .kpi-card { border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; text-align: center; background: #f8fafc; }
            .kpi-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; }
            .kpi-value { font-size: 20px; font-weight: 800; margin-top: 5px; font-family: monospace; }
            .table-section { margin-top: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background: #f1f5f9; font-weight: 700; }
            .total-box { margin-top: 30px; padding: 20px; border: 2px solid #0f172a; border-radius: 8px; background: #f8fafc; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .grand-profit { font-size: 22px; font-weight: 800; color: #10b981; border-top: 2px solid #0f172a; padding-top: 10px; margin-top: 10px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Corporate Net Profit & Performance Audit</h1>
            <p class="subtitle">${today} · ${selectedBranch || 'All Branches Consolidated'}</p>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Sales Revenue</div>
              <div class="kpi-value">${formatCurrency(overview?.metrics.revenueToday ?? 0)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total COGS (Cost)</div>
              <div class="kpi-value" style="color: #dc2626;">-${formatCurrency(cogs)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Drawer Expenses</div>
              <div class="kpi-value" style="color: #ea580c;">-${formatCurrency(overview?.metrics.todayDrawerExpenses ?? 0)}</div>
            </div>
            <div class="kpi-card" style="border: 2px solid #10b981; background: #ecfdf5;">
              <div class="kpi-label" style="color: #047857;">Net Profit</div>
              <div class="kpi-value" style="color: #047857;">${formatCurrency(overview?.metrics.todayNetProfit ?? 0)}</div>
            </div>
          </div>

          <div class="total-box">
            <div class="row">
              <span>Today's Total Gross Billings:</span>
              <strong style="font-family: monospace;">${formatCurrency(overview?.metrics.revenueToday ?? 0)}</strong>
            </div>
            <div class="row" style="color: #dc2626;">
              <span>Less Wholesale Cost of Goods Sold (COGS):</span>
              <strong style="font-family: monospace;">-${formatCurrency(cogs)}</strong>
            </div>
            <div class="row" style="border-top: 1px dashed #94a3b8; padding-top: 6px;">
              <span>Gross Product Margin (Profit):</span>
              <strong style="font-family: monospace;">${formatCurrency(overview?.metrics.todayGrossProfit ?? 0)}</strong>
            </div>
            <div class="row" style="color: #ea580c;">
              <span>Less Petty Cash / Drawer Expenses:</span>
              <strong style="font-family: monospace;">-${formatCurrency(overview?.metrics.todayDrawerExpenses ?? 0)}</strong>
            </div>
            <div class="row grand-profit">
              <span>FINAL NET PROFIT:</span>
              <span style="font-family: monospace;">${formatCurrency(overview?.metrics.todayNetProfit ?? 0)}</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [overviewRes, branchesRes] = await Promise.all([
          api.get(`/dashboard/overview?trendRange=${trendRange}&startDate=${customDates.start}&endDate=${customDates.end}${selectedBranch ? `&branch=${encodeURIComponent(selectedBranch)}` : ''}`, authConfig(session.token)),
          api.get('/branches', authConfig(session.token))
        ])
        setOverview(overviewRes.data)
        setBranches(branchesRes.data)
      } catch (err) {
        console.error('Error fetching super admin dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [api, trendRange, customDates.start, customDates.end, selectedBranch])

  if (loading) {
    return (
      <div className="panel loading-state">
        <div className="spinner" />
        <p>Analyzing corporate workspace...</p>
      </div>
    )
  }

  return (
    <div className="stack gap-6 animate-fade">
      {/* Filters Row */}
      <div className="between align-center panel p-4 glass-panel" style={{ borderRadius: '16px' }}>
        <h2 className="font-strong m-0">Operations Command</h2>
        <div className="cluster gap-3 wrap">
          <select 
            className="input" 
            value={selectedBranch} 
            onChange={e => setSelectedBranch(e.target.value)} 
            style={{ padding: '8px 12px', fontSize: '0.9rem', width: '200px', backgroundColor: 'var(--panel-strong)' }}
          >
            <option value="">All Branches</option>
            {branches.filter(b => b.status === 'active').map(b => (
              <option key={b._id} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Row */}
      <section className="metric-grid">
        <MetricCard
          icon={TrendingUp}
          title={selectedBranch ? "Branch Monthly Rev" : "Consolidated Monthly Rev"}
          value={formatCurrency(overview?.metrics.revenueMonthly ?? 0)}
          helper="Current month sales"
        />
        <MetricCard
          icon={Warehouse}
          title={selectedBranch ? "Branch Stock" : "Consolidated Stock"}
          value={formatCurrency(overview?.metrics.inventoryValue ?? 0)}
          helper={`Across ${overview?.metrics.totalProducts ?? 0} SKUs`}
        />
        <div onClick={() => setShowProfitModal(true)} style={{ cursor: 'pointer' }}>
          <MetricCard
            icon={Zap}
            title={selectedBranch ? "Today Net Profit" : "Consolidated Net Profit"}
            value={formatCurrency(overview?.metrics.todayNetProfit ?? 0)}
            helper="Earnings after costs & expenses"
            accent="#10b981"
            actionIcon={Eye}
            onActionClick={() => setShowProfitModal(true)}
          />
        </div>
        <MetricCard
          icon={Building2}
          title="Active Branches"
          value={String(branches.filter(b => b.status === 'active').length)}
          helper={`Out of ${branches.length} registered`}
        />
        <MetricCard
          icon={Users}
          title="System Operators"
          value={String(overview?.metrics.activeUsers ?? 0)}
          helper="Total branch employees"
        />
      </section>

      {/* Main Directory & Activity */}
      <div className="grid-2 gap-6" style={{ gridTemplateColumns: '2fr 1fr' }}>

        {/* Branches Console */}
        <section className="panel p-6 stack gap-5 glass-panel">
          <div className="between align-center">
            <SectionHeading
              title="Branch Directory"
              text="Corporate network of storefronts and distribution warehouses."
            />
            <button
              className="btn btn-primary"
              style={{ padding: '10px 16px', borderRadius: '12px' }}
              onClick={() => navigate('/super-admin/branches')}
            >
              <Plus size={16} />
              Register Branch
            </button>
          </div>

          <div className="grid-2 gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[...branches].sort((a, b) => a.name === 'Main Branch' ? -1 : b.name === 'Main Branch' ? 1 : a.name.localeCompare(b.name)).map((branch) => {
              const isMain = branch.name === 'Main Branch' || branch.name === 'Main Warehouse';
              return (
                <div
                  key={branch._id}
                  className="panel-strong glow-on-hover p-4 cursor-pointer stack gap-3 relative"
                  style={{
                    borderRadius: '16px',
                    border: isMain ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: isMain ? 'linear-gradient(145deg, var(--panel), var(--accent-soft))' : 'linear-gradient(145deg, var(--panel-strong), var(--bg-soft))'
                  }}
                  onClick={() => navigate(`/super-admin/branches/${encodeURIComponent(branch.name)}`)}
                >
                  <div className="between align-center">
                    <div className="cluster gap-2">
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'var(--accent-soft)',
                          color: 'var(--accent-strong)',
                          display: 'grid',
                          placeItems: 'center'
                        }}
                      >
                        <Building2 size={18} />
                      </div>
                      <strong style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                        {branch.name}
                        {isMain && <span className="pill small accent ml-2" style={{ fontSize: '0.6rem' }}>HEADQUARTERS</span>}
                      </strong>
                    </div>
                    <span className={`pill ${branch.status === 'active' ? 'success' : 'danger'}`} style={{ fontSize: '0.65rem' }}>
                      {branch.status}
                    </span>
                  </div>

                  <div className="stack gap-1 muted small">
                    <p>📍 {branch.location || 'No location set'}</p>
                    <p>📞 {branch.phone || 'No phone set'}</p>
                    <p>👤 Manager: {branch.manager || 'Unassigned'}</p>
                  </div>

                  <div className="between align-center pt-2" style={{ borderTop: '1px solid var(--border)', marginTop: '4px' }}>
                    <span className="accent-text font-bold small cluster gap-1 align-center">
                      Enter Cockpit
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>



        {/* Recent Operations */}
        <section className="panel p-6 stack gap-5">
          <div className="cluster gap-2">
            <SectionHeading
              title="Recent Activity"
              text="Latest transactions across all terminals."
            />
            <button className="btn btn-outline btn-sm" onClick={() => setShowActivitiesModal(true)} title="See all activities">See All</button>

          </div>
          <div className="stack gap-3">
            {(overview?.recentSales || []).slice(0, 6).map((sale) => (
              <div
                key={sale._id}
                className="list-row p-3 panel-strong glow-on-hover"
                style={{
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'between',
                  alignItems: 'center'
                }}
              >
                <div className="stack gap-1">
                  <div className="cluster gap-2">
                    <FileText size={14} className="muted" />
                    <strong style={{ fontSize: '0.9rem' }}>{sale.invoiceNumber.replace(/^saayi-?/i, '').replace(/^c-/i, 'INVC-')}</strong>
                  </div>
                  <p className="muted small" style={{ fontSize: '0.75rem' }}>
                    🏢 {sale.branch} · 👤 {sale.cashierName}
                  </p>
                </div>
                <strong style={{ color: 'var(--accent-strong)', fontSize: '0.95rem' }}>
                  {formatCurrency(sale.total)}
                </strong>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Monthly Sales Trend */}
      <section className="panel p-6 stack gap-5 mt-6">

        <div className="between align-center">
          <SectionHeading title="Sales Trend" text="Revenue progression across selected timeline." />
          
          <div className="cluster gap-3 wrap">
            {trendRange === 'custom' && (
              <div className="cluster gap-2 align-center">
                <input type="date" className="input" value={customDates.start} onChange={e => setCustomDates(prev => ({ ...prev, start: e.target.value }))} style={{ padding: '8px 12px', fontSize: '0.85rem' }} />
                <span className="muted small">to</span>
                <input type="date" className="input" value={customDates.end} onChange={e => setCustomDates(prev => ({ ...prev, end: e.target.value }))} style={{ padding: '8px 12px', fontSize: '0.85rem' }} />
              </div>
            )}
            <select 
              className="input" 
              value={trendRange} 
              onChange={e => setTrendRange(e.target.value)} 
              style={{ padding: '8px 12px', fontSize: '0.9rem', width: '160px', backgroundColor: 'var(--panel-strong)' }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer>
            <BarChart data={overview?.branchMonthlySales || []} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-soft)" fontSize={12} tickLine={false} axisLine={false} angle={-45} textAnchor="end" tickMargin={15} />
              <YAxis stroke="var(--text-soft)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
              <Tooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px' }}>
                      <p className="font-strong mb-2">{label}</p>
                      {payload.map((entry, index) => (
                        <div key={index} className="cluster gap-2 mb-1">
                          <div style={{ width: '12px', height: '12px', backgroundColor: entry.color, borderRadius: '3px' }} />
                          <span className="small">{entry.name} : {entry.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }} cursor={{ fill: 'var(--accent)', opacity: 0.1 }} />
              {(overview?.allBranches || []).map((branch, index) => {
                const colors = ['var(--accent)', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
                return (
                  <Bar
                    key={branch}
                    dataKey={branch}
                    name={branch}
                    fill={colors[index % colors.length]}
                    radius={[4, 4, 0, 0]}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>


      {/* Expanded Activities Modal */}
      {showActivitiesModal && (
        <div className="modal-backdrop animate-fade" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="panel p-6" style={{ width: '90vw', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px' }}>
            <div className="between align-center mb-5">
              <SectionHeading title="All Recent Activities" text="Comprehensive view of all recent transactions across the system." />
              <button className="icon-btn hover-danger" onClick={() => setShowActivitiesModal(false)}><X size={24} /></button>
            </div>

            <div className="grid-3 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

              {/* Billing Column */}
              <div className="stack gap-3">
                <div className="between align-center">
                  <h4 className="cluster gap-2"><ShoppingCart size={16} className="accent-text" /> Billing (Sales)</h4>
                  <button className="btn btn-sm btn-outline" onClick={() => setSelectedActivityCategory('billing')}>See All</button>
                </div>
                <div className="stack gap-2">
                  {(overview?.recentSales || []).slice(0, 6).map(sale => (
                    <div key={sale._id} className="p-3 panel-strong glow-on-hover small" style={{ borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div className="between align-center mb-1">
                        <strong>{sale.invoiceNumber}</strong>
                        <span className="accent-text font-bold">{formatCurrency(sale.total)}</span>
                      </div>
                      <div className="muted">{sale.branch} &middot; {sale.cashierName}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Purchase Column */}
              <div className="stack gap-3">
                <div className="between align-center">
                  <h4 className="cluster gap-2"><Warehouse size={16} className="accent-text" /> Purchases</h4>
                  <button className="btn btn-sm btn-outline" onClick={() => setSelectedActivityCategory('purchases')}>See All</button>
                </div>
                <div className="stack gap-2">
                  {(overview?.recentPurchases || []).slice(0, 6).map(p => (
                    <div key={p._id} className="p-3 panel-strong glow-on-hover small" style={{ borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div className="between align-center mb-1">
                        <strong>{p.invoiceNumber || p._id.substring(0, 8)}</strong>
                        <span className="accent-text font-bold">{formatCurrency(p.total)}</span>
                      </div>
                      <div className="muted">{p.supplierName}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Returns Column */}
              <div className="stack gap-3">
                <div className="between align-center">
                  <h4 className="cluster gap-2"><RefreshCcw size={16} className="accent-text" /> Returns (Customer)</h4>
                  <button className="btn btn-sm btn-outline" onClick={() => setSelectedActivityCategory('returns_customer')}>See All</button>
                </div>
                <div className="stack gap-2">
                  {(overview?.recentCustomerReturns || []).slice(0, 6).map(r => (
                    <div key={r._id} className="p-3 panel-strong glow-on-hover small" style={{ borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div className="between align-center mb-1">
                        <strong>{r.returnNo}</strong>
                        <span className="accent-text font-bold">{formatCurrency(r.totalAmount)}</span>
                      </div>
                      <div className="muted">{r.entityName || 'Customer'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supplier Returns Column */}
              <div className="stack gap-3">
                <div className="between align-center">
                  <h4 className="cluster gap-2"><RefreshCcw size={16} className="accent-text" /> Returns (Supplier)</h4>
                  <button className="btn btn-sm btn-outline" onClick={() => setSelectedActivityCategory('returns_supplier')}>See All</button>
                </div>
                <div className="stack gap-2">
                  {(overview?.recentSupplierReturns || []).slice(0, 6).map(r => (
                    <div key={r._id} className="p-3 panel-strong glow-on-hover small" style={{ borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div className="between align-center mb-1">
                        <strong>{r.returnNo}</strong>
                        <span className="accent-text font-bold">{formatCurrency(r.totalAmount)}</span>
                      </div>
                      <div className="muted">{r.entityName || 'Supplier'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Settlements */}
              <div className="stack gap-3">
                <div className="between align-center">
                  <h4 className="cluster gap-2"><CreditCard size={16} className="accent-text" /> Settlements (Customer)</h4>
                  <button className="btn btn-sm btn-outline" onClick={() => setSelectedActivityCategory('settlements_customer')}>See All</button>
                </div>
                <div className="stack gap-2">
                  {(overview?.recentCustomerSettlements || []).slice(0, 6).map(s => (
                    <div key={s._id} className="p-3 panel-strong glow-on-hover small" style={{ borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div className="between align-center mb-1">
                        <strong>{s.invoiceNo}</strong>
                        <span className="accent-text font-bold">{formatCurrency(s.totalAmount - s.balanceAmount)} Paid</span>
                      </div>
                      <div className="muted">{s.customerId?.name || 'Customer'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supplier Settlements */}
              <div className="stack gap-3">
                <div className="between align-center">
                  <h4 className="cluster gap-2"><CreditCard size={16} className="accent-text" /> Settlements (Supplier)</h4>
                  <button className="btn btn-sm btn-outline" onClick={() => setSelectedActivityCategory('settlements_supplier')}>See All</button>
                </div>
                <div className="stack gap-2">
                  {(overview?.recentSupplierSettlements || []).slice(0, 6).map(s => (
                    <div key={s._id} className="p-3 panel-strong glow-on-hover small" style={{ borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div className="between align-center mb-1">
                        <strong>{s.invoiceNo}</strong>
                        <span className="accent-text font-bold">{formatCurrency(s.totalAmount - s.balanceAmount)} Paid</span>
                      </div>
                      <div className="muted">{s.supplierId?.name || 'Supplier'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedActivityCategory && (
        <div className="modal-overlay animate-fade" onClick={() => setSelectedActivityCategory(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content animate-slide-up panel p-6" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '80vh', overflowY: 'auto', borderRadius: '12px' }}>
            <div className="between align-center mb-4">
              <h3 className="font-strong">
                {selectedActivityCategory === 'billing' && 'All Recent Billing (Sales)'}
                {selectedActivityCategory === 'purchases' && 'All Recent Purchases'}
                {selectedActivityCategory === 'returns_customer' && 'All Recent Returns (Customer)'}
                {selectedActivityCategory === 'returns_supplier' && 'All Recent Returns (Supplier)'}
                {selectedActivityCategory === 'settlements_customer' && 'All Recent Settlements (Customer)'}
                {selectedActivityCategory === 'settlements_supplier' && 'All Recent Settlements (Supplier)'}
              </h3>
              <button className="icon-btn hover-danger" onClick={() => setSelectedActivityCategory(null)}><X size={24} /></button>
            </div>

            <div className="table-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Entity</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedActivityCategory === 'billing' && (overview?.recentSales || []).map(s => (
                    <tr key={s._id}>
                      <td>{s.receiptNumber || s.invoiceNo || s.invoiceNumber}</td>
                      <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td>{s.customerName || s.customer?.name || 'Walk-in'}</td>
                      <td className="text-right accent-text font-bold">{s.total ? `$${s.total}` : '-'}</td>
                    </tr>
                  ))}
                  {selectedActivityCategory === 'purchases' && (overview?.recentPurchases || []).map(p => (
                    <tr key={p._id}>
                      <td>{p._id.substring(0, 8)}</td>
                      <td>{new Date(p.date || p.createdAt || Date.now()).toLocaleDateString()}</td>
                      <td>{p.supplierName}</td>
                      <td className="text-right accent-text font-bold">{p.total ? `$${p.total}` : '-'}</td>
                    </tr>
                  ))}
                  {selectedActivityCategory === 'returns_customer' && (overview?.recentCustomerReturns || []).map(r => (
                    <tr key={r._id}>
                      <td>{r.returnNo}</td>
                      <td>{new Date(r.createdAt || r.date || Date.now()).toLocaleDateString()}</td>
                      <td>{r.entityName || r.customer?.name || r.customerName || 'Customer'}</td>
                      <td className="text-right text-red font-bold">-{r.totalAmount ? `$${r.totalAmount}` : '-'}</td>
                    </tr>
                  ))}
                  {selectedActivityCategory === 'returns_supplier' && (overview?.recentSupplierReturns || []).map(r => (
                    <tr key={r._id}>
                      <td>{r.returnNo}</td>
                      <td>{new Date(r.createdAt || r.date || Date.now()).toLocaleDateString()}</td>
                      <td>{r.entityName || r.supplier?.name || r.supplierName || 'Supplier'}</td>
                      <td className="text-right text-green font-bold">+{r.totalAmount ? `$${r.totalAmount}` : '-'}</td>
                    </tr>
                  ))}
                  {selectedActivityCategory === 'settlements_customer' && (overview?.recentCustomerSettlements || []).map(s => (
                    <tr key={s._id}>
                      <td>{s.invoiceNo}</td>
                      <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td>{s.customerId?.name || 'Customer'}</td>
                      <td className="text-right text-green font-bold">+{s.totalAmount ? `$${s.totalAmount - (s.balanceAmount || 0)}` : '-'}</td>
                    </tr>
                  ))}
                  {selectedActivityCategory === 'settlements_supplier' && (overview?.recentSupplierSettlements || []).map(s => (
                    <tr key={s._id}>
                      <td>{s.invoiceNo}</td>
                      <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td>{s.supplierId?.name || 'Supplier'}</td>
                      <td className="text-right text-red font-bold">-{s.totalAmount ? `$${s.totalAmount - (s.balanceAmount || 0)}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Today Net Profit Audit Modal (Wide Detailed View) */}
      {showProfitModal && (
        <div className="modal-overlay animate-fade" onClick={() => setShowProfitModal(false)} style={{ position: 'fixed', inset: 0, backdropFilter: 'blur(12px)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '16px', background: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content panel glass-panel p-6 animate-fade-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '1240px', width: '96vw', height: '94vh', display: 'flex', flexDirection: 'column', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div className="between align-center mb-4 pb-3 border-b" style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div className="cluster gap-3">
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
                    {selectedBranch ? `${selectedBranch} - Today's Net Profit & Performance Audit` : "Today's Corporate Net Profit & Performance Audit"}
                  </h2>
                  <p className="muted small" style={{ margin: 0 }}>Full financial audit stream for {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <div className="cluster gap-2">
                <button
                  type="button"
                  className="btn btn-secondary cluster gap-2 align-center"
                  style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem' }}
                  onClick={handleExportProfitCSV}
                  title="Export audit summary to CSV"
                >
                  <Download size={16} />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary cluster gap-2 align-center"
                  style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem' }}
                  onClick={handlePrintProfitAudit}
                  title="Print audit statement"
                >
                  <Printer size={16} />
                  <span>Print Audit</span>
                </button>
                <button className="icon-btn" onClick={() => setShowProfitModal(false)}><X size={20} /></button>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="stack gap-4" style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
              {/* Top 4 KPI Highlights */}
              <div className="grid-4 gap-3">
                <div className="panel p-4 stack gap-1" style={{ borderRadius: '14px', background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
                  <span className="eyebrow muted x-small">Today Revenue (Sales)</span>
                  <strong className="h3 font-mono text-accent">{formatCurrency(overview?.metrics.revenueToday ?? 0)}</strong>
                  <span className="x-small muted">{overview?.metrics.totalOrdersToday ?? 0} Invoices billed</span>
                </div>
                <div className="panel p-4 stack gap-1" style={{ borderRadius: '14px', background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
                  <span className="eyebrow muted x-small">Total COGS (Wholesale Cost)</span>
                  <strong className="h3 font-mono text-danger">-{formatCurrency(Math.max(0, (overview?.metrics.revenueToday ?? 0) - (overview?.metrics.todayGrossProfit ?? 0)))}</strong>
                  <span className="x-small muted">Wholesale purchase cost of items sold</span>
                </div>
                <div className="panel p-4 stack gap-1" style={{ borderRadius: '14px', background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
                  <span className="eyebrow muted x-small">Drawer Expenses (Petty Cash)</span>
                  <strong className="h3 font-mono text-warning">-{formatCurrency(overview?.metrics.todayDrawerExpenses ?? 0)}</strong>
                  <span className="x-small muted">Lunch, Transport, etc. taken from drawer</span>
                </div>
                <div className="panel p-4 stack gap-1" style={{ borderRadius: '14px', background: 'rgba(16, 185, 129, 0.12)', border: '2px solid var(--success)' }}>
                  <span className="eyebrow x-small font-bold" style={{ color: 'var(--success)' }}>Today Net Profit</span>
                  <strong className="h2 font-mono" style={{ color: (overview?.metrics.todayNetProfit ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatCurrency(overview?.metrics.todayNetProfit ?? 0)}
                  </strong>
                  <span className="x-small muted">Final pure earnings in hand today</span>
                </div>
              </div>

              {/* Split Breakdown Tables */}
              <div className="grid-2 gap-4" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
                {/* Product Profitability */}
                <div className="panel p-4 stack gap-3" style={{ borderRadius: '14px', background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
                  <div className="between align-center">
                    <strong className="small font-bold uppercase tracking-wider">Top Velocity Sold Items (Today)</strong>
                    <span className="badge neutral x-small font-mono">{(overview?.todayTopProducts || []).length} items</span>
                  </div>
                  <div className="stack gap-2 overflow-auto" style={{ maxHeight: '320px' }}>
                    {(!overview?.todayTopProducts || overview?.todayTopProducts.length === 0) ? (
                      <div className="p-5 text-center muted small">No product sales processed yet today.</div>
                    ) : (
                      overview.todayTopProducts.map(item => (
                        <div key={item.productId} className="between align-center p-3 rounded glow-on-hover" style={{ background: 'var(--panel)', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                          <div>
                            <strong style={{ fontSize: '0.9rem' }}>{item.name}</strong>
                            <div className="muted x-small font-mono mt-1">Quantity Sold: {item.quantity} units</div>
                          </div>
                          <div className="text-right">
                            <span className="x-small muted block">Sales Value</span>
                            <strong className="font-mono text-accent" style={{ fontSize: '1rem' }}>{formatCurrency(item.revenue)}</strong>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Drawer Cash Out / Expenses Breakdown */}
                <div className="panel p-4 stack gap-3" style={{ borderRadius: '14px', background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
                  <div className="between align-center">
                    <strong className="small font-bold uppercase tracking-wider" style={{ color: '#b45309' }}>Cash Out / Drawer Expenses</strong>
                    <span className="badge warning x-small font-mono">{(overview?.metrics.todayExpenseList || []).length} items</span>
                  </div>
                  <div className="stack gap-2 overflow-auto" style={{ maxHeight: '320px' }}>
                    {(!overview?.metrics.todayExpenseList || overview?.metrics.todayExpenseList.length === 0) ? (
                      <div className="p-5 text-center muted small">No cash taken out from drawer today.</div>
                    ) : (
                      overview.metrics.todayExpenseList.map((exp, idx) => (
                        <div key={idx} className="between align-center p-3 rounded glow-on-hover" style={{ background: 'var(--panel)', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                          <div>
                            <strong style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{exp.category}</strong>
                            {exp.notes && <span className="muted x-small ml-1 font-bold">({exp.notes})</span>}
                            <div className="muted x-small mt-1">{exp.branch ? `${exp.branch} · ` : ''}{exp.cashierName ? `Cashier: ${exp.cashierName}` : ''} {exp.time ? `· Time: ${new Date(exp.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
                          </div>
                          <strong className="font-mono text-danger" style={{ fontSize: '1.05rem' }}>-{formatCurrency(exp.amount)}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom calculation summary bar */}
              <div className="panel-strong p-4 between align-center" style={{ borderRadius: '14px', background: 'var(--panel)', border: '1px solid var(--border)' }}>
                <div>
                  <span className="x-small muted font-bold uppercase tracking-wider">Accounting Formula</span>
                  <p className="small muted m-0">
                    <strong>Net Profit</strong> = (Today's Total Sales Revenue: {formatCurrency(overview?.metrics.revenueToday ?? 0)}) 
                    − (Wholesale COGS: {formatCurrency(Math.max(0, (overview?.metrics.revenueToday ?? 0) - (overview?.metrics.todayGrossProfit ?? 0)))}) 
                    − (Drawer Cash Out: {formatCurrency(overview?.metrics.todayDrawerExpenses ?? 0)})
                  </p>
                </div>
                <div className="text-right">
                  <span className="x-small muted font-bold uppercase">Today's Net Pure Profit</span>
                  <h2 className="font-mono m-0" style={{ color: (overview?.metrics.todayNetProfit ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatCurrency(overview?.metrics.todayNetProfit ?? 0)}
                  </h2>
                </div>
              </div>
            </div>

            {/* Fixed Footer Bar */}
            <div className="between align-center pt-3 border-t mt-3" style={{ borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <span className="small muted">
                🔒 System Auto-Reset: Clears to <strong>LKR 0.00</strong> daily at midnight. Historical audits saved under Sales Reports.
              </span>
              <button className="btn btn-primary" onClick={() => setShowProfitModal(false)} style={{ padding: '10px 32px', borderRadius: '12px', fontWeight: 700 }}>
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
