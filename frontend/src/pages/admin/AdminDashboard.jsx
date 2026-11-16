/**
 * Module: AdminDashboard
 * 
 * React UI page component representing the AdminDashboard view.
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Warehouse,
  ShoppingCart,
  PackagePlus,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertCircle,
  FileText,
  UserPlus,
  X,
  Eye,
  Wallet,
  ReceiptText,
  Printer,
  Download
} from 'lucide-react'
import { MetricCard } from '../../components/MetricCard'
import { SectionHeading } from '../../components/SectionHeading'
import { formatCurrency, formatDate, authConfig, exportToCSV } from '../../utils'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export function AdminDashboard({ api, overview, session, startTransition }) {
  const navigate = useNavigate();

  const [showAllStock, setShowAllStock] = useState(false)
  const [showAllVelocity, setShowAllVelocity] = useState(false)
  const [showAllInvoices, setShowAllInvoices] = useState(false)
  const [trendRange, setTrendRange] = useState('monthly');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [trendData, setTrendData] = useState(null);
  const [showProfitModal, setShowProfitModal] = useState(false)
  const handleExportProfitCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    const data = [
      { Metric: "Date", Value: today },
      { Metric: "Total Sales Revenue", Value: (overview?.metrics.revenueToday ?? 0).toFixed(2) },
      { Metric: "Cost of Goods Sold (COGS)", Value: (Math.max(0, (overview?.metrics.revenueToday ?? 0) - (overview?.metrics.todayGrossProfit ?? 0))).toFixed(2) },
      { Metric: "Gross Profit", Value: (overview?.metrics.todayGrossProfit ?? 0).toFixed(2) },
      { Metric: "Cashier Drawer Expenses", Value: (overview?.metrics.todayDrawerExpenses ?? 0).toFixed(2) },
      { Metric: "Today Net Profit", Value: (overview?.metrics.todayNetProfit ?? 0).toFixed(2) },
    ];
    exportToCSV(data, `Daily_Net_Profit_Audit_${today}`);
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
            <h1 class="title">Daily Net Profit & Performance Audit</h1>
            <p class="subtitle">${today} · Branch Operations</p>
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

  const displayLimit = 3;

  useEffect(() => {
    async function fetchTrend() {
      try {
        if (!api) return;
        const res = await api.get(`/dashboard/overview?trendRange=${trendRange}&startDate=${customDates.start}&endDate=${customDates.end}`, authConfig(session.token));
        setTrendData(res.data.monthlySales || []);
      } catch (err) {
        console.error('Error fetching trend:', err);
      }
    }
    fetchTrend();
  }, [api, trendRange, customDates.start, customDates.end, session]);

  const quickActions = [
    { label: 'New Bill', icon: ShoppingCart, path: '/pos', color: 'var(--accent)' },
    { label: 'Add SKU', icon: PackagePlus, path: '/inventory', color: 'var(--info)' },
    { label: 'View Reports', icon: Zap, path: '/reports', color: 'var(--success)' },
    { label: 'Manage Staff', icon: UserPlus, path: '/staff', color: 'var(--text-soft)' },
  ]

  return (
    <div className="stack gap-6 animate-fade">
      <div className="between align-center panel p-4 glass-panel" style={{ borderRadius: '16px' }}>
        <h2 className="font-strong m-0">Operations Command</h2>
      </div>

      <section className="metric-grid">
        <MetricCard
          icon={Warehouse}
          title="Inventory Assets"
          value={formatCurrency(overview?.metrics.inventoryValue ?? 0)}
          helper={`Market value of ${overview?.metrics.totalStock ?? 0} units`}
        />
        <MetricCard
          icon={TrendingUp}
          title="Monthly Revenue"
          value={formatCurrency(overview?.metrics.revenueMonthly ?? 0)}
          helper="Current month sales"
        />
        <div onClick={() => setShowProfitModal(true)} style={{ cursor: 'pointer' }}>
          <MetricCard
            icon={Zap}
            title="Today Net Profit"
            value={formatCurrency(overview?.metrics.todayNetProfit ?? 0)}
            helper="Earnings after costs & expenses"
            accent="#10b981"
            actionIcon={Eye}
            onActionClick={() => setShowProfitModal(true)}
          />
        </div>
        <MetricCard
          icon={AlertCircle}
          title="Critical Alerts"
          value={String(overview?.metrics.lowStockCount ?? 0)}
          helper="Items requiring immediate restock"
          variant={overview?.metrics.lowStockCount > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          icon={ShieldCheck}
          title="Terminal Mode"
          value="Administrator"
          helper={`${overview?.metrics.activeUsers ?? 0} active session(s)`}
        />
      </section>

      <section className="panel p-6 stack gap-5 glass-panel">
        <SectionHeading title="Admin Shortcuts" text="Accelerate your workflow with one-click access." />
        <div className="cluster gap-4 wrap-row">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="quick-action-card glow-on-hover"
              style={{ flex: 1, minWidth: '160px' }}
              onClick={() => navigate(action.path)}
            >
              <div className="quick-action-icon" style={{ color: action.color }}>
                <action.icon size={24} />
              </div>
              <span className="font-strong" style={{ fontSize: '0.9rem' }}>{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="content-grid">
        <div className="panel p-6 stack gap-5">
          <SectionHeading
            title="Stock Watchlist"
            text="High-priority replenishment items."
          />
          <div className="stack gap-3">
            {(overview?.lowStockProducts?.length || 0) === 0 ? (
              <div className="p-4 center muted" style={{ borderRadius: '16px', border: '1px dashed var(--border)' }}>No critical stock alerts.</div>
            ) : (overview?.lowStockProducts || []).slice(0, displayLimit).map((product) => (
              <div key={product._id} className="list-row p-3 panel-strong glow-on-hover" style={{ borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div className="cluster gap-3">
                  <img src={product.image} alt={product.name} className="thumb" />
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{product.name}</strong>
                    <p className="muted small">
                      {product.quantityInStock} {product.unit} left · {product.rackLabel}
                    </p>
                  </div>
                </div>
                <div className={`pill ${product.quantityInStock <= 0 ? 'danger' : 'warning'}`}>
                  {product.quantityInStock <= 0 ? 'Empty' : 'Low'}
                </div>
              </div>
            ))}
            {(overview?.lowStockProducts?.length || 0) > displayLimit && (
              <div className="pt-3 mt-2 text-center" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-secondary w-full"
                  style={{ borderRadius: '14px' }}
                  onClick={() => setShowAllStock(true)}
                >
                  See All ({overview.lowStockProducts.length})
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="panel p-6 stack gap-5">
          <SectionHeading
            title="Top Velocity"
            text="Best selling products this period."
          />
          <div className="stack gap-3">
            {(overview?.topProducts?.length || 0) === 0 ? (
              <div className="p-4 center muted" style={{ borderRadius: '16px', border: '1px dashed var(--border)' }}>No top velocity products found.</div>
            ) : (overview?.topProducts || []).slice(0, displayLimit).map((product) => (
              <div key={product.productId} className="list-row p-3 panel-strong glow-on-hover" style={{ borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div className="cluster gap-3">
                  <img src={product.image} alt={product.name} className="thumb" />
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{product.name}</strong>
                    <p className="muted small">
                      {product.quantity} sold · {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
                <div className="pill success" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>Peak</div>
              </div>
            ))}
            {(overview?.topProducts?.length || 0) > displayLimit && (
              <div className="pt-3 mt-2 text-center" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-secondary w-full"
                  style={{ borderRadius: '14px' }}
                  onClick={() => setShowAllVelocity(true)}
                >
                  See All ({overview.topProducts.length})
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="panel p-6 stack gap-5">
          <SectionHeading
            title="Latest Invoices"
            text="Recent transaction stream."
          />
          <div className="stack gap-3">
            {(overview?.recentSales?.length || 0) === 0 ? (
              <div className="p-4 center muted" style={{ borderRadius: '16px', border: '1px dashed var(--border)' }}>No recent invoices found.</div>
            ) : (overview?.recentSales || []).slice(0, displayLimit).map((sale) => (
              <div key={sale._id} className="list-row p-3 panel-strong glow-on-hover" style={{ borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div className="stack gap-1">
                  <div className="cluster gap-2">
                    <FileText size={14} className="muted" />
                    <strong style={{ fontSize: '0.95rem' }}>{sale.invoiceNumber.replace(/^saayi-?/i, '').replace(/^c-/i, 'INVC-')}</strong>
                  </div>
                  <p className="muted small">
                    {sale.cashierName} · {formatDate(sale.createdAt)}
                  </p>
                </div>
                <strong style={{ color: 'var(--accent-strong)' }}>{formatCurrency(sale.total)}</strong>
              </div>
            ))}
            {(overview?.recentSales?.length || 0) > displayLimit && (
              <div className="pt-3 mt-2 text-center" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-secondary w-full"
                  style={{ borderRadius: '14px' }}
                  onClick={() => setShowAllInvoices(true)}
                >
                  See All ({overview.recentSales.length})
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="panel p-6 stack gap-5 glass-panel mt-6">
        <div className="between align-center wrap-row gap-3">
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
            <BarChart data={trendData || overview?.monthlySales || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-soft)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-soft)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--text)' }}
                cursor={{ fill: 'var(--accent)', opacity: 0.1 }}
              />
              <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Stock Watchlist Modal */}
      {showAllStock && (
        <div className="modal-overlay animate-fade" onClick={() => setShowAllStock(false)} style={{ position: 'fixed', inset: 0, backdropFilter: 'blur(12px)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '20px', background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-content panel glass-panel p-6 animate-fade-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%' }}>
            <div className="between align-center mb-6">
              <SectionHeading title="All Stock Watchlist" text="Complete list of high-priority replenishment items." />
              <button className="icon-btn" onClick={() => setShowAllStock(false)}><X size={20} /></button>
            </div>
            <div className="stack gap-3 overflow-auto" style={{ maxHeight: '60vh', paddingRight: '8px' }}>
              {(overview?.lowStockProducts || []).map((product) => (
                <div key={product._id} className="list-row p-3 panel-strong glow-on-hover" style={{ borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div className="cluster gap-3">
                    <img src={product.image} alt={product.name} className="thumb" />
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>{product.name}</strong>
                      <p className="muted small">{product.quantityInStock} {product.unit} left · {product.rackLabel}</p>
                    </div>
                  </div>
                  <div className={`pill ${product.quantityInStock <= 0 ? 'danger' : 'warning'}`}>
                    {product.quantityInStock <= 0 ? 'Empty' : 'Low'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Velocity Modal */}
      {showAllVelocity && (
        <div className="modal-overlay animate-fade" onClick={() => setShowAllVelocity(false)} style={{ position: 'fixed', inset: 0, backdropFilter: 'blur(12px)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '20px', background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-content panel glass-panel p-6 animate-fade-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', width: '100%' }}>
            <div className="between align-center mb-6">
              <SectionHeading title="All Top Velocity SKUs" text="Complete list of best selling products this period." />
              <button className="icon-btn" onClick={() => setShowAllVelocity(false)}><X size={20} /></button>
            </div>
            <div className="stack gap-3 overflow-auto" style={{ maxHeight: '60vh', paddingRight: '8px' }}>
              {(overview?.topProducts || []).map((product) => (
                <div key={product.productId} className="list-row p-3 panel-strong glow-on-hover" style={{ borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div className="cluster gap-3">
                    <img src={product.image} alt={product.name} className="thumb" />
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>{product.name}</strong>
                      <p className="muted small">{product.quantity} sold · {formatCurrency(product.revenue)}</p>
                    </div>
                  </div>
                  <div className="pill success" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>Peak</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Latest Invoices Modal */}
      {showAllInvoices && (
        <div className="modal-overlay animate-fade" onClick={() => setShowAllInvoices(false)} style={{ position: 'fixed', inset: 0, backdropFilter: 'blur(12px)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '20px', background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-content panel glass-panel p-6 animate-fade-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', width: '100%' }}>
            <div className="between align-center mb-6">
              <SectionHeading title="All Latest Invoices" text="Complete list of recent transaction stream." />
              <button className="icon-btn" onClick={() => setShowAllInvoices(false)}><X size={20} /></button>
            </div>
            <div className="stack gap-3 overflow-auto" style={{ maxHeight: '60vh', paddingRight: '8px' }}>
              {(overview?.recentSales || []).map((sale) => (
                <div key={sale._id} className="list-row p-3 panel-strong glow-on-hover" style={{ borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div className="stack gap-1">
                    <div className="cluster gap-2">
                      <FileText size={14} className="muted" />
                      <strong style={{ fontSize: '0.95rem' }}>{sale.invoiceNumber.replace(/^saayi-?/i, '').replace(/^c-/i, 'INVC-')}</strong>
                    </div>
                    <p className="muted small">{sale.cashierName} · {formatDate(sale.createdAt)}</p>
                  </div>
                  <strong style={{ color: 'var(--accent-strong)' }}>{formatCurrency(sale.total)}</strong>
                </div>
              ))}
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
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Today's Net Profit & Performance Audit</h2>
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
                  <span className="x-small muted">{overview?.metrics.totalOrdersToday ?? 0} Invoices billed to customers</span>
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
                            <div className="muted x-small mt-1">{exp.cashierName ? `Cashier: ${exp.cashierName}` : ''} {exp.time ? `· Time: ${new Date(exp.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
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
