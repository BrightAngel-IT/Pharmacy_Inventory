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

// Source Branch Admin (or Super Admin) marks a trip as dispatched and departing
router.post('/:id/trips/:tripIndex/start', requireAuth, requireRole(['super_admin', 'admin']), async (req, res, next) => {
  try {
    const { id, tripIndex } = req.params;
    const Transfer = require('../models/Transfer');
    const BranchStock = require('../models/BranchStock');
    const Batch = require('../models/Batch');
    const Product = require('../models/Product');

    const transfer = await Transfer.findById(id);
    if (!transfer) return res.status(404).json({ message: 'Transfer record not found.' });

    // Authorization check: Only Source Branch Admin or Super Admin can dispatch/start trip
    const isAuthorized = req.user.role === 'super_admin' || req.user.branch === transfer.sourceBranch;
    if (!isAuthorized) {
      return res.status(403).json({ message: `Only the admin of ${transfer.sourceBranch} can dispatch and start this trip.` });
    }

    const idx = parseInt(tripIndex, 10);
    if (!transfer.transports || !transfer.transports[idx]) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    const trip = transfer.transports[idx];
    if (trip.tripStartedAt) {
      return res.status(400).json({ message: `Trip ${idx + 1} has already been dispatched / started!` });
    }

    // Deduct only this trip's assigned items from Source Branch Stock and Batch!
    const tripItems = Array.isArray(trip.items) && trip.items.length > 0 ? trip.items : [];
    for (const itm of tripItems) {
      const mainProd = (transfer.products || []).find(p => String(p.product) === String(itm.product));
      const ppp = Number(itm.piecesPerPack || mainProd?.piecesPerPack || 1);
      const unitsToDeduct = Number(itm.quantity || (Number(itm.packQuantity || 1) * ppp));

      if (unitsToDeduct > 0) {
        // Check source stock
        const sStock = await BranchStock.findOne({ branch: transfer.sourceBranch, productId: itm.product });
        const avail = sStock ? sStock.quantityInStock : 0;
        if (avail < unitsToDeduct) {
          const pr = await Product.findById(itm.product).lean();
          const pName = pr ? pr.name : itm.productName || 'Product';
          return res.status(400).json({ 
            message: `Insufficient stock in ${transfer.sourceBranch} to dispatch "${pName}". Available: ${avail} pcs, Trip requires: ${unitsToDeduct} pcs.` 
          });
        }

        // Deduct from Source BranchStock
        await BranchStock.findOneAndUpdate(
          { branch: transfer.sourceBranch, productId: itm.product },
          { $inc: { quantityInStock: -Number(unitsToDeduct) } }
        );

        // Deduct from Source Batch
        const bId = itm.batchId || mainProd?.batchId;
        if (bId) {
          try {
            await Batch.findByIdAndUpdate(bId, {
              $inc: { availableQuantity: -Number(unitsToDeduct) }
            });
          } catch (bErr) {
            console.error('Error deducting batch quantity during trip start:', bErr);
          }
        }
      }
    }

    trip.status = 'IN_TRANSIT';
    trip.tripStartedAt = new Date();
    trip.tripStartedBy = `${req.user.name || req.user.username || 'Admin'} (${req.user.branch || req.user.role})`;
    
    // update parent transfer status as well
    transfer.status = 'IN_TRANSIT';

    await transfer.save();
    res.json({ message: `Trip ${idx + 1} dispatched! Stock deducted from ${transfer.sourceBranch}. Vehicle is now on route.`, transfer });
  } catch (error) {
    next(error);
  }
});

// Destination Branch Admin (or Super Admin) confirms receipt / inspection of a specific trip (Trip 1, Trip 2, etc.)
router.post('/:id/trips/:tripIndex/receive', requireAuth, requireRole(['super_admin', 'admin']), async (req, res, next) => {
  try {
    const { id, tripIndex } = req.params;
    const { decision, items, notes } = req.body; // decision: 'ACCEPTED' | 'REJECTED', items: array with receivedQty, damagedQty
    const updated = await receiveTripTransfer({ 
      transferId: id, 
      tripIndex: parseInt(tripIndex, 10), 
      user: req.user,
      decision,
      inspectionItems: items,
      notes
    });
    res.json({ message: `Trip ${parseInt(tripIndex, 10) + 1} inspection processed successfully!`, transfer: updated });
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
