const express = require('express');

const { requireAuth, requireRole } = require('../middleware/auth');
const { openShift, closeShift, getWorksheets, getCurrentShift, addShiftExpense, deleteShiftExpense } = require('../services/store');
// const Shift = require('../models/Shift'); // Removed as we use getCurrentShift

const router = express.Router();

/**
 * Shift Routes
 * 
 * Manages daily work shifts for cashiers and allows fetching worksheets.
 */

// ==========================================
// CURRENT SHIFT
// ==========================================
// GET /api/shifts/current
// Gets the current open shift for the logged-in cashier
router.get('/current', requireAuth, requireRole(['cashier']), async (req, res, next) => {
  try {
    const shift = await getCurrentShift(req.user._id);
    res.json(shift); // Returns null if no active shift
  } catch (error) {
    next(error);
  }
});

// ==========================================
// OPEN SHIFT
// ==========================================
// POST /api/shifts/open
// Opens a new shift for the logged-in cashier
router.post('/open', requireAuth, requireRole(['cashier']), async (req, res, next) => {
  try {
    const { startTime } = req.body;
    const shift = await openShift(req.user._id, req.user.branch, startTime);
    res.json({ message: 'Shift opened successfully', shift });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// CLOSE SHIFT
// ==========================================
// POST /api/shifts/close
// Closes the current shift for the logged-in cashier and calculates totals
router.post('/close', requireAuth, requireRole(['cashier']), async (req, res, next) => {
  try {
    const { endTime } = req.body;
    const worksheet = await closeShift(req.user._id, endTime);
    res.json({ message: 'Shift closed successfully', worksheet });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SHIFT EXPENSES / CASH OUT
// ==========================================
// POST /api/shifts/expenses
// Adds an expense (Lunch, Transport, etc.) to the current open shift
router.post('/expenses', requireAuth, requireRole(['cashier']), async (req, res, next) => {
  try {
    const { category, amount, notes } = req.body;
    const shift = await addShiftExpense(req.user._id, { category, amount, notes });
    res.json({ message: 'Cash out recorded successfully', shift });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/shifts/expenses/:expenseId
// Deletes an expense from the current open shift
router.delete('/expenses/:expenseId', requireAuth, requireRole(['cashier']), async (req, res, next) => {
  try {
    const shift = await deleteShiftExpense(req.user._id, req.params.expenseId);
    res.json({ message: 'Cash out deleted successfully', shift });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// FETCH WORKSHEETS
// ==========================================
// GET /api/shifts/worksheets
// Fetches closed worksheets. Cashiers can only see their own.
router.get('/worksheets', requireAuth, async (req, res, next) => {
  try {
    const filters = {};
    if (req.user.role === 'cashier') {
      filters.cashierId = req.user._id;
    } else {
      if (req.query.cashierId) filters.cashierId = req.query.cashierId;
      if (req.user.role !== 'super_admin') {
        filters.branch = req.user.branch;
      }
    }
    
    if (req.query.date) {
      filters.date = req.query.date;
    }

    const worksheets = await getWorksheets(filters);
    res.json(worksheets);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
