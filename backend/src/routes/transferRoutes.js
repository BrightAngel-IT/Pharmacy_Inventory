const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { transferInventory, receiveTransfer, receiveTripTransfer, cancelTransfer, updateTransfer, getTransfers } = require('../services/store');
const BranchStock = require('../models/BranchStock');

const router = express.Router();

/**
 * Transfer Routes
 * 
 * Handles inventory transfers between different branches.
 */

// Get available stock for a specific branch
router.get('/stock', requireAuth, async (req, res, next) => {
  try {
    const { branch } = req.query;
    if (!branch) return res.status(400).json({ message: 'Branch query parameter is required.' });
    const stocks = await BranchStock.find({ branch }).lean();
    res.json(stocks);
  } catch (error) {
    next(error);
  }
});

// Super Admin and Branch Admins can view transfers (Branch admins see transfers for their branch)
router.get('/', requireAuth, requireRole(['super_admin', 'admin']), async (req, res, next) => {
  try {
    const filters = {};
    if (req.user.role !== 'super_admin') {
      filters.branch = req.user.branch;
    }
    const transfers = await getTransfers(filters);
    res.json(transfers);
  } catch (error) {
    next(error);
  }
});

// Super Admin initiates dispatch
router.post('/', requireAuth, requireRole(['super_admin']), async (req, res, next) => {
  try {
    const { sourceBranch, destBranch, products, transports } = req.body;
    
    if (!sourceBranch || !destBranch || !products || products.length === 0) {
      return res.status(400).json({ message: 'Missing required fields for transfer.' });
    }

    if (sourceBranch === destBranch) {
      return res.status(400).json({ message: 'Source and destination branches must be different.' });
    }

    const transfer = await transferInventory({ sourceBranch, destBranch, products, transports });
    
    res.status(201).json({ message: 'Inventory dispatched successfully and is now in transit.', transfer });
  } catch (error) {
    next(error);
  }
});

// Destination Branch Admin (or Super Admin) confirms receipt of a specific trip (Trip 1, Trip 2, etc.)
router.post('/:id/trips/:tripIndex/receive', requireAuth, requireRole(['super_admin', 'admin']), async (req, res, next) => {
  try {
    const { id, tripIndex } = req.params;
    const updated = await receiveTripTransfer({ 
      transferId: id, 
      tripIndex: parseInt(tripIndex, 10), 
      user: req.user 
    });
    res.json({ message: `Trip ${parseInt(tripIndex, 10) + 1} received and added to inventory!`, transfer: updated });
  } catch (error) {
    next(error);
  }
});

// Destination Branch Admin (or Super Admin) confirms receipt of transfer (all at once)
router.post('/:id/receive', requireAuth, requireRole(['super_admin', 'admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const updated = await receiveTransfer({ transferId: id, user: req.user, notes });
    res.json({ message: 'Stock received and successfully added to destination branch inventory.', transfer: updated });
  } catch (error) {
    next(error);
  }
});

// Update / Edit an existing transfer before it is received
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sourceBranch, destBranch, products, transports } = req.body;

    if (!sourceBranch || !destBranch || !products || products.length === 0) {
      return res.status(400).json({ message: 'Missing required fields for transfer.' });
    }

    if (sourceBranch === destBranch) {
      return res.status(400).json({ message: 'Source and destination branches must be different.' });
    }

    const updated = await updateTransfer({
      transferId: id,
      user: req.user,
      sourceBranch,
      destBranch,
      products,
      transports
    });

    res.json({ message: 'Transfer updated successfully and stock adjusted.', transfer: updated });
  } catch (error) {
    next(error);
  }
});

// Cancel / Undo a transfer before it is received (restores deducted stock back to source branch)
router.post('/:id/cancel', requireAuth, requireRole(['super_admin', 'admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const updated = await cancelTransfer({ transferId: id, user: req.user, reason });
    res.json({ message: 'Transfer cancelled successfully. Stock has been restored back to the source branch.', transfer: updated });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
