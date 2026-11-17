/**
 * Module: Transfer
 * 
 * Mongoose database schema and model definition for Pharmacy Transfer.
 * Supports batch tracking, pack-wise transfer (100 pack, 50 pack), cost/selling valuations,
 * and live trip tracking (trip started timestamp / driver info).
 */

const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
  sourceBranch: {
    type: String,
    required: true,
  },
  destBranch: {
    type: String,
    required: true,
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch'
    },
    batchNumber: {
      type: String,
      trim: true,
      default: ''
    },
    expiryDate: {
      type: Date
    },
    packType: {
      type: String,
      default: 'Packs' // "100 Pack", "50 Pack", etc.
    },
    packQuantity: {
      type: Number,
      default: 1
    },
    piecesPerPack: {
      type: Number,
      default: 1
    },
    quantity: {
      type: Number,
      required: true // total units
    },
    unit: {
      type: String,
      default: 'pcs'
    },
    costPricePerUnit: {
      type: Number,
      default: 0
    },
    sellingPricePerUnit: {
      type: Number,
      default: 0
    },
    totalCostValue: {
      type: Number,
      default: 0
    },
    totalSellingValue: {
      type: Number,
      default: 0
    }
  }],
  transports: [{
    vehicleNumber: { type: String, trim: true },
    driverName: { type: String, trim: true },
    driverPhone: { type: String, trim: true },
    tripNumber: { type: String, trim: true, default: 'Trip 1' },
    dispatchedQty: { type: String, trim: true },
    scheduledDate: { type: Date, default: Date.now },
    
    // Live Trip Dispatch Tracking
    tripStartedAt: { type: Date },
    tripStartedBy: { type: String, trim: true },
    
    items: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch'
      },
      batchNumber: { type: String },
      expiryDate: { type: Date },
      productName: { type: String },
      packType: { type: String },
      packQuantity: { type: Number, default: 0 },
      piecesPerPack: { type: Number, default: 1 },
      quantity: { type: Number, default: 0 }, // total pieces dispatched in this trip
      receivedPackQuantity: { type: Number, default: null }, // actual packs arrived
      damagedPackQuantity: { type: Number, default: 0 }, // packs damaged upon arrival
      damagedQuantity: { type: Number, default: 0 }, // actual damaged pieces/units (Quarantine)
      shortagePackQuantity: { type: Number, default: 0 }, // packs missing in transit (undelivered)
      shortageQuantity: { type: Number, default: 0 }, // actual missing pieces/units (Shortage)
      acceptedPackQuantity: { type: Number, default: null }, // packs accepted into stock (received - damaged)
      acceptedQuantity: { type: Number, default: 0 }, // total units/tablets added to stock
      rejectedQuantity: { type: Number, default: 0 }, // total variance (shortage + damaged)
      costPricePerUnit: { type: Number, default: 0 },
      sellingPricePerUnit: { type: Number, default: 0 },
      totalCostValue: { type: Number, default: 0 },
      totalSellingValue: { type: Number, default: 0 }
    }],
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['READY_TO_DISPATCH', 'IN_TRANSIT', 'RECEIVED', 'REJECTED'],
      default: 'READY_TO_DISPATCH'
    },
    inspectionDecision: {
      type: String,
      enum: ['ACCEPTED', 'REJECTED', 'PARTIAL'],
      default: null
    },
    receivedBy: { type: String, trim: true },
    receivedAt: { type: Date },
    receivedNotes: { type: String, trim: true }
  }],
  status: {
    type: String,
    enum: ['DRAFT', 'READY_TO_DISPATCH', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'],
    default: 'IN_TRANSIT'
  },
  receivedBy: {
    type: String,
    trim: true
  },
  receivedAt: {
    type: Date
  },
  receivedNotes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.models.Transfer || mongoose.model('Transfer', transferSchema);
