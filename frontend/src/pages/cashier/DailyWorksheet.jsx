import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Calendar,
  Wallet,
  CreditCard,
  Building2,
  Plus,
  Trash2,
  ReceiptText,
  DollarSign
} from 'lucide-react';
import { SectionHeading } from '../../components/SectionHeading';
import { authConfig, formatCurrency } from '../../utils';
import { saveShiftOffline, getOfflineShifts } from '../../utils/offlineSync';

export function DailyWorksheet({ api, session, onNotice, company, refreshCoreData }) {
  const [currentShift, setCurrentShift] = useState(null);
  const [worksheets, setWorksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [opening, setOpening] = useState(false);
  
  const [filters, setFilters] = useState({
    date: ''
  });

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'Lunch',
    amount: '',
    notes: ''
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filters]);

  async function fetchData() {
    setLoading(true);
    try {
      if (!navigator.onLine) {
        const offlineShifts = await getOfflineShifts();
        if (offlineShifts.length > 0) {
          const lastShift = offlineShifts[offlineShifts.length - 1];
          if (lastShift.action === 'open') {
            setCurrentShift(lastShift.payload);
          } else {
            setCurrentShift(null);
          }
        } else {
          const lastKnown = localStorage.getItem('ims-last-known-job') === 'true';
          if (lastKnown) {
             setCurrentShift({ status: 'open', date: new Date().toISOString().split('T')[0] });
          } else {
             setCurrentShift(null);
          }
        }
        setWorksheets([]);
        setLoading(false);
        return;
      }

      // Get current active shift
      const currentRes = await api.get(`/shifts/current?_t=${Date.now()}`, authConfig(session.token));
      setCurrentShift(currentRes.data || null);
      localStorage.setItem('ims-last-known-job', currentRes.data ? 'true' : 'false');

      // Get past closed worksheets
      let query = '';
      if (filters.date) {
        query = `?date=${filters.date}`;
      }
      const historyRes = await api.get(`/shifts/worksheets${query}`, authConfig(session.token));
      setWorksheets(historyRes.data || []);
    } catch (err) {
      onNotice({ type: 'error', text: 'Failed to load daily worksheet data.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenShift() {
    setOpening(true);
    try {
      const startTime = Date.now();
      if (!navigator.onLine) {
        const offlineShiftData = {
          startTime,
          cashierId: session.user._id,
          cashierName: session.user.name,
          cashierUsername: session.user.username,
          branch: session.user.branch || 'Main Branch',
          date: new Date(startTime).toISOString().split('T')[0],
          status: 'open'
        };
        await saveShiftOffline({ action: 'open', payload: { startTime } });
      setCurrentShift(offlineShiftData);
      localStorage.setItem('ims-last-known-job', 'true');
      onNotice({ type: 'success', text: 'Offline: Job started successfully! Will sync when online.' });
      if (refreshCoreData) await refreshCoreData();
      return;
    }
    const res = await api.post('/shifts/open', { startTime }, authConfig(session.token));
    onNotice({ type: 'success', text: 'Job started successfully!' });
    setCurrentShift(res.data.shift);
    localStorage.setItem('ims-last-known-job', 'true');
    if (refreshCoreData) await refreshCoreData();
  } catch (err) {
      onNotice({ type: 'error', text: err.response?.data?.message || 'Failed to start job.' });
    } finally {
      setOpening(false);
    }
  }

  async function handleCloseShift() {
    if (!window.confirm('Are you sure you want to end your job for today?')) return;
    
    setClosing(true);
    try {
      const endTime = Date.now();
      if (!navigator.onLine) {
        await saveShiftOffline({ action: 'close', payload: { endTime } });
        
        // Mock a closed worksheet for local display
        const closedWorksheet = {
          ...currentShift,
          endTime,
          status: 'closed',
          totals: {
            cash: '0.00', card: '0.00', credit: '0.00', total: '0.00' // Real totals will calculate on sync
          },
          salesCount: 0,
          isOfflineMock: true
        };
        setCurrentShift(null);
        localStorage.setItem('ims-last-known-job', 'false');
        setWorksheets(prev => [closedWorksheet, ...prev]);
        onNotice({ type: 'success', text: 'Offline: Job closed successfully! Will sync when online.' });
        if (refreshCoreData) await refreshCoreData();
        return;
      }

      const res = await api.post('/shifts/close', { endTime }, authConfig(session.token));
      
      // Refresh worksheets view
      const wRes = await api.get('/shifts/worksheets', authConfig(session.token));
      setWorksheets(wRes.data || []);
      
      setCurrentShift(null);
      localStorage.setItem('ims-last-known-job', 'false');
      onNotice({ type: 'success', text: 'Job closed successfully.' });
      if (refreshCoreData) await refreshCoreData();
    } catch (err) {
      onNotice({ type: 'error', text: err.response?.data?.message || 'Failed to end job.' });
    } finally {
      setClosing(false);
    }
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      return onNotice({ type: 'error', text: 'Please enter a valid positive amount.' });
    }

    setSubmittingExpense(true);
    try {
      const res = await api.post('/shifts/expenses', expenseForm, authConfig(session.token));
      onNotice({ type: 'success', text: 'Cash out recorded successfully!' });
      setCurrentShift(res.data.shift);
      setShowExpenseModal(false);
      setExpenseForm({ category: 'Lunch', amount: '', notes: '' });
      if (refreshCoreData) await refreshCoreData();
    } catch (err) {
      onNotice({ type: 'error', text: err.response?.data?.message || 'Failed to record expense.' });
    } finally {
      setSubmittingExpense(false);
    }
  }

  async function handleDeleteExpense(expenseId) {
    if (!window.confirm('Are you sure you want to remove this cash out entry?')) return;
    try {
      const res = await api.delete(`/shifts/expenses/${expenseId}`, authConfig(session.token));
      onNotice({ type: 'success', text: 'Cash out removed.' });
      setCurrentShift(res.data.shift);
      if (refreshCoreData) await refreshCoreData();
    } catch (err) {
      onNotice({ type: 'error', text: err.response?.data?.message || 'Failed to delete expense.' });
    }
  }

  function handlePrintWorksheet(sheet) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Worksheet - ${sheet.date}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 20px; color: #000; font-size: 14px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .totals-section { margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; }
          .grand-total { font-size: 16px; font-weight: bold; margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${company?.name || 'Inventory System'}</div>
          <div>Daily Cashier Worksheet</div>
        </div>
        
        <div class="row">
          <span>Date:</span>
          <span>${sheet.date}</span>
        </div>
        <div class="row">
          <span>Cashier:</span>
          <span>${sheet.cashierName || sheet.cashierUsername}</span>
        </div>
        <div class="row">
          <span>Branch:</span>
          <span>${sheet.branch}</span>
        </div>
        <div class="row">
          <span>Sales Count:</span>
          <span>${sheet.salesCount || 0}</span>
        </div>
        <div class="row">
          <span>Opened:</span>
          <span>${new Date(sheet.startTime).toLocaleTimeString()}</span>
        </div>
        <div class="row">
          <span>Closed:</span>
          <span>${new Date(sheet.endTime).toLocaleTimeString()}</span>
        </div>

        <div class="totals-section">
          <div class="row">
            <span>Cash Collection:</span>
            <span>${formatCurrency(sheet.totals?.cash || 0)}</span>
          </div>
          <div class="row">
            <span>Card Collection:</span>
            <span>${formatCurrency(sheet.totals?.card || 0)}</span>
          </div>
          <div class="row">
            <span>Credit Sales:</span>
            <span>${formatCurrency(sheet.totals?.credit || 0)}</span>
          </div>
          
          <div class="row grand-total">
            <span>Total Sales:</span>
            <span>${formatCurrency(sheet.totals?.total || 0)}</span>
          </div>

          ${(sheet.expenses && sheet.expenses.length > 0) || Number(sheet.totals?.cashOutTotal || 0) > 0 ? `
            <div style="margin-top: 15px; border-top: 1px dashed #000; padding-top: 8px;">
              <div style="font-weight: bold; margin-bottom: 6px; text-transform: uppercase;">Cash Out / Expenses Breakdown:</div>
              ${(sheet.expenses || []).map(exp => `
                <div class="row" style="font-size: 12px; margin-bottom: 3px;">
                  <span>• ${exp.category} ${exp.notes ? `(${exp.notes})` : ''}:</span>
                  <span style="color: #b91c1c;">-${formatCurrency(exp.amount || 0)}</span>
                </div>
              `).join('')}
              <div class="row" style="font-weight: bold; margin-top: 6px; border-top: 1px dotted #555; padding-top: 4px;">
                <span>Total Cash Out:</span>
                <span style="color: #b91c1c;">-${formatCurrency(sheet.totals?.cashOutTotal || 0)}</span>
              </div>
            </div>

            <div class="row" style="font-size: 15px; font-weight: 900; margin-top: 10px; border-top: 2px solid #000; padding-top: 6px; background: #f4f4f4;">
              <span>Net Cash in Drawer:</span>
              <span>${formatCurrency(sheet.totals?.netCash !== undefined ? sheet.totals.netCash : Math.max(0, (sheet.totals?.cash || 0) - (sheet.totals?.cashOutTotal || 0)))}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          Signature: ______________________
          <br><br>
          Printed on: ${new Date().toLocaleString()}
        </div>
        <script>
          window.onload = () => { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <div className="stack gap-6 animate-fade">
      <SectionHeading
        title="Work Shift Management"
        subtitle="Start your job to process sales, and end your job to generate the daily summary."
        icon={Clock}
      />

      <div className="grid-2 gap-6 align-start">
        {/* Current Shift Panel */}
        <section className="panel p-6 glass-panel stack gap-6" style={{ borderRadius: '20px' }}>
          <div className="cluster gap-2 mb-2">
            <Clock size={18} style={{ color: 'var(--accent)' }} />
            <span className="eyebrow">Active Shift Status</span>
          </div>

          {loading && !currentShift && !worksheets.length ? (
             <div className="stack align-center gap-3 p-10 muted">
               <div className="spinner accent" />
               Checking shift status...
             </div>
          ) : currentShift ? (
            <div className="stack gap-5">
              <div className="p-4" style={{ borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div className="cluster gap-2 mb-2" style={{ color: 'var(--accent-strong)' }}>
                  <CheckCircle2 size={18} />
                  <strong>Job Currently Active</strong>
                </div>
                <p className="muted small">
                  Your job was started on <strong>{new Date(currentShift.startTime).toLocaleString()}</strong>. You can now process sales.
                </p>
              </div>

              <div className="panel-strong p-4 stack gap-3" style={{ borderRadius: '16px', background: 'var(--bg-soft)', border: '1px dashed var(--border)' }}>
                <div className="between x-small muted font-bold uppercase">
                  <span>Branch</span>
                  <span style={{ color: 'var(--text)' }}>{currentShift.branch}</span>
                </div>
                <div className="between x-small muted font-bold uppercase">
                  <span>Date</span>
                  <span style={{ color: 'var(--text)' }}>{currentShift.date}</span>
                </div>
              </div>

              {/* Cash Out / Expenses Section during Active Shift */}
              <div className="stack gap-3 p-4" style={{ borderRadius: '16px', background: '#fff7ed', border: '1.5px solid #ffedd5' }}>
                <div className="between align-center">
                  <div className="cluster gap-2">
                    <ReceiptText size={18} style={{ color: '#ea580c' }} />
                    <strong style={{ fontSize: '0.9rem', color: '#9a3412' }}>Drawer Cash Out / Expenses</strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline small cluster gap-1 align-center"
                    style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '8px', background: '#ffffff', borderColor: '#fdba74', color: '#c2410c', fontWeight: 700 }}
                    onClick={() => setShowExpenseModal(true)}
                  >
                    <Plus size={14} /> Add Cash Out
                  </button>
                </div>

                {currentShift.expenses && currentShift.expenses.length > 0 ? (
                  <div className="stack gap-2 mt-1">
                    {currentShift.expenses.map((exp, idx) => (
                      <div key={exp._id || idx} className="between align-center p-2" style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '0.8rem' }}>
                        <div>
                          <strong style={{ color: '#0f172a' }}>{exp.category}</strong>
                          {exp.notes && <span className="muted" style={{ marginLeft: '6px', fontSize: '0.75rem' }}>({exp.notes})</span>}
                          <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
                            {exp.time ? new Date(exp.time).toLocaleTimeString() : ''}
                          </div>
                        </div>
                        <div className="cluster gap-3 align-center">
                          <strong style={{ color: '#dc2626', fontFamily: 'var(--font-mono)' }}>-{formatCurrency(exp.amount)}</strong>
                        </div>
                      </div>
                    ))}
                    <div className="between align-center pt-2" style={{ borderTop: '1px dashed #fdba74', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 700, color: '#9a3412' }}>Total Cash Out Recorded:</span>
                      <strong style={{ color: '#dc2626', fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>
                        -{formatCurrency(currentShift.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0))}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p className="muted small" style={{ margin: 0, fontSize: '0.78rem', color: '#9a3412' }}>
                    No cash taken out yet. If you took money from drawer for Lunch, Transport, or Tea, click <strong>+ Add Cash Out</strong>.
                  </p>
                )}
              </div>

              <button
                className="btn btn-primary large-btn"
                onClick={handleCloseShift}
                disabled={closing}
                style={{
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '1rem',
                  background: 'linear-gradient(135deg, var(--danger), #be123c)'
                }}
              >
                {closing ? (
                  <div className="cluster gap-2">
                    <div className="spinner small white" />
                    Ending Job...
                  </div>
                ) : (
                  <div className="cluster gap-2">
                    <CheckCircle2 size={18} />
                    End Job
                  </div>
                )}
              </button>
            </div>
          ) : (
            <div className="stack align-center gap-5 p-10 text-center">
              <div style={{ padding: '20px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)' }}>
                <Clock size={48} style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <h3 className="mb-2">No Active Job</h3>
                <p className="muted small max-w-md" style={{ margin: '0 auto' }}>
                  You must start your job before you can process any sales at the POS terminal.
                </p>
              </div>
              
              <button
                className="btn btn-primary large-btn"
                onClick={handleOpenShift}
                disabled={opening}
                style={{
                  borderRadius: '12px',
                  padding: '16px 32px',
                  fontSize: '1.1rem',
                  marginTop: '10px'
                }}
              >
                {opening ? (
                  <div className="cluster gap-2">
                    <div className="spinner small white" />
                    Starting Job...
                  </div>
                ) : (
                  <div className="cluster gap-2">
                    <CheckCircle2 size={18} />
                    Start Job
                  </div>
                )}
              </button>
            </div>
          )}
        </section>

        {/* History Panel - Hidden for cashier to prevent seeing daily totals/balances */}
        <section className="panel p-6 glass-panel stack gap-4" style={{ borderRadius: '20px' }}>
          <div className="cluster gap-2 mb-2">
            <Wallet size={18} style={{ color: 'var(--accent)' }} />
            <span className="eyebrow">Shift & Handover Guidelines</span>
          </div>
          
          <div className="p-4" style={{ borderRadius: '14px', background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>
              Daily Blind Cash Handover Policy
            </h4>
            <p className="muted small" style={{ fontSize: '0.8rem', lineHeight: '1.5' }}>
              At the end of your shift:
            </p>
            <ol className="muted small" style={{ paddingLeft: '20px', margin: '8px 0', fontSize: '0.8rem', lineHeight: '1.6' }}>
              <li>Record all expenses (Lunch, Transport, etc.) via <strong>+ Add Cash Out</strong>.</li>
              <li>Click <strong>End Job</strong> to close your shift session.</li>
              <li>Count all physical cash, cards slips, and handover directly to Branch Admin / Supervisor.</li>
              <li>Daily reconciliation and final balance verification is performed by Administration.</li>
            </ol>
          </div>

          <div className="p-4" style={{ borderRadius: '14px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <div className="cluster gap-2 mb-1" style={{ color: '#047857' }}>
              <CheckCircle2 size={16} />
              <strong style={{ fontSize: '0.85rem' }}>Secure Shift Logging Active</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#065f46' }}>
              Every transaction and cash out you perform is securely audited and sent to the manager's ledger in real time.
            </p>
          </div>
        </section>
      </div>

      {/* Add Cash Out Modal */}
      {showExpenseModal && (
        <div 
          className="modal-overlay animate-fade"
          style={{
            position: 'fixed',
            inset: 0,
            backdropFilter: 'blur(8px)',
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
              maxWidth: '440px',
              background: '#ffffff',
              borderRadius: '20px',
              border: '1.5px solid #fed7aa',
              boxShadow: '0 20px 40px -15px rgba(234, 88, 12, 0.3)',
              color: '#0f172a'
            }}
          >
            <div className="between align-center mb-4 pb-3" style={{ borderBottom: '1.5px solid #ffedd5' }}>
              <div className="cluster gap-2 align-center">
                <div style={{ background: '#ffedd5', color: '#c2410c', width: '38px', height: '38px', borderRadius: '10px', display: 'grid', placeItems: 'center' }}>
                  <ReceiptText size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#9a3412' }}>Record Cash Out</h3>
                  <span className="muted" style={{ fontSize: '0.75rem', color: '#64748b' }}>Take cash from drawer for expenses</span>
                </div>
              </div>
              <button 
                type="button" 
                className="icon-btn ghost" 
                onClick={() => setShowExpenseModal(false)}
                style={{ borderRadius: '50%' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="stack gap-4">
              <label className="field">
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Expense Category / Purpose:</span>
                <select
                  className="input"
                  style={{ height: '42px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: '#fff', color: '#0f172a', fontWeight: 600 }}
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                >
                  <option value="Lunch">Lunch / Meals</option>
                  <option value="Transport">Transport / Courier / Delivery</option>
                  <option value="Tea">Tea / Refreshments</option>
                  <option value="Cleaning">Cleaning & Supplies</option>
                  <option value="Stationery">Stationery & Paper Rolls</option>
                  <option value="Emergency Cash">Emergency / Cash Draw</option>
                  <option value="Miscellaneous">Other Miscellaneous</option>
                </select>
              </label>

              <label className="field">
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Cash Out Amount (LKR):</span>
                <div className="input-shell" style={{ height: '42px', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '0 10px' }}>
                  <span style={{ fontWeight: 800, color: '#c2410c', marginRight: '6px' }}>Rs.</span>
                  <input
                    className="ghost-input"
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 500"
                    style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
              </label>

              <div className="cluster gap-2">
                {[100, 200, 300, 500, 1000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    className="pill neutral-soft small"
                    style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c' }}
                    onClick={() => setExpenseForm({ ...expenseForm, amount: String(amt) })}
                  >
                    Rs. {amt}
                  </button>
                ))}
              </div>

              <label className="field">
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Remarks / Reason (Optional):</span>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Staff lunch packet, Lorry fare..."
                  style={{ height: '38px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                />
              </label>

              <div className="between align-center pt-3" style={{ borderTop: '1.5px solid #f1f5f9' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ borderRadius: '8px', padding: '8px 16px' }}
                  onClick={() => setShowExpenseModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingExpense}
                  style={{ borderRadius: '8px', padding: '8px 20px', background: '#ea580c', borderColor: '#c2410c', fontWeight: 700 }}
                >
                  {submittingExpense ? 'Saving...' : 'Confirm Cash Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
