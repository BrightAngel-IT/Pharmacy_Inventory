/**
 * Module: Batch
 * 
 * Mongoose database schema and model definition for Pharmacy Batches.
 * Tracks batch numbers, expiry dates, pack configurations, cost & selling prices.
 */

const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    manufactureDate: {
      type: Date,
    },
    branch: {
      type: String,
      required: true,
      default: 'Main Branch',
      trim: true,
    },
    
    // Pack Information
    packType: {
      type: String,
      default: 'Packs', // e.g. "100 Pack", "50 Pack", "Box"
      trim: true,
    },
    piecesPerPack: {
      type: Number,
      default: 1, // Total pieces per master carton / pack
      min: 1,
    },
    tabletsPerCard: {
      type: Number,
      default: 1, // e.g. 12 tabs per card
    },
    cardsPerBox: {
      type: Number,
      default: 1, // e.g. 10 cards per box, or 10 bottles per box
    },
    boxesPerCarton: {
      type: Number,
      default: 1, // e.g. 20 boxes per master carton
    },
    initialPacks: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Quantity in individual units (tablets / capsules / bottles / pcs)
    initialQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    // Financials
    costPricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    costPricePerPack: {
      type: Number,
      default: 0,
      min: 0,
    },
    sellingPricePerPack: {
      type: Number,
      default: 0,
      min: 0,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    purchaseRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'DEPLETED', 'EXPIRED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

// Fast search indexes
batchSchema.index({ product: 1, branch: 1, status: 1 });
batchSchema.index({ batchNumber: 1, branch: 1 });
batchSchema.index({ expiryDate: 1 });

module.exports = mongoose.models.Batch || mongoose.model('Batch', batchSchema);

