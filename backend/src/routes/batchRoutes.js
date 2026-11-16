const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Batch = require('../models/Batch');

/**
 * Batch Routes for Pharmacy
 */

// Get all batches (with optional filters: product, branch, status)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { product, branch, status } = req.query;
    const filter = {};

    if (product) filter.product = product;
    if (branch) filter.branch = branch;
    if (status) filter.status = status;
    else filter.status = { $ne: 'DEPLETED' }; // default active batches

    const batches = await Batch.find(filter)
      .populate('product', 'name sku barcode category unit price costPrice itemType tabletsPerCard cardsPerBox boxesPerCarton')
      .sort({ expiryDate: 1 }); // FEFO: First Expired, First Out

    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get batches for a specific product
router.get('/product/:productId', requireAuth, async (req, res) => {
  try {
    const { branch } = req.query;
    const filter = { product: req.params.productId };
    if (branch) filter.branch = branch;

    const batches = await Batch.find(filter)
      .sort({ expiryDate: 1 });

    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single batch details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id).populate('product');
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    res.json(batch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin / Super Admin manual override: Set active selling batch for a product per branch
router.post('/set-active', requireAuth, async (req, res) => {
  try {
    const { productId, batchId, branch } = req.body;
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const Product = require('../models/Product');
    const BranchStock = require('../models/BranchStock');
    const targetBranch = branch || req.user?.branch;

    if (batchId) {
      const batch = await Batch.findById(batchId);
      if (!batch) {
        return res.status(404).json({ message: 'Batch not found' });
      }

      // Check if this batch belongs to the target branch
      if (targetBranch && batch.branch !== targetBranch) {
        return res.status(400).json({ 
          message: `Batch ${batch.batchNumber} belongs to "${batch.branch}", but you are managing "${targetBranch}". You cannot activate another branch's batch.` 
        });
      }

      if (targetBranch) {
        await BranchStock.findOneAndUpdate(
          { productId, branch: targetBranch },
          { manualActiveBatchId: batchId }
        );
      }
      await Product.findByIdAndUpdate(productId, { manualActiveBatchId: batchId });

      res.json({ success: true, message: `Active batch manually set to ${batch.batchNumber} (${batch.branch})`, activeBatchId: batchId });
    } else {
      // Revert to automatic FEFO
      if (targetBranch) {
        await BranchStock.findOneAndUpdate(
          { productId, branch: targetBranch },
          { $unset: { manualActiveBatchId: 1 } }
        );
      }
      await Product.findByIdAndUpdate(productId, {
        $unset: { manualActiveBatchId: 1 }
      });
      res.json({ success: true, message: 'Reverted to Auto FEFO batch selection', activeBatchId: null });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

