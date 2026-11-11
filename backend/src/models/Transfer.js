/**
 * Module: Transfer
 * 
 * Mongoose database schema and model definition for Transfer.
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
    quantity: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      default: 'pcs'
    },
    unitQty: {
      type: Number,
      default: 1
    },
    piecesPerUnit: {
      type: Number,
      default: 1
    }
  }],
  transports: [{
    vehicleNumber: { type: String, trim: true },
    driverName: { type: String, trim: true },
    driverPhone: { type: String, trim: true },
    tripNumber: { type: String, trim: true, default: 'Trip 1' },
    dispatchedQty: { type: String, trim: true }, // e.g., "6 Boxes" or "300 pcs"
    items: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      productName: { type: String },
      unit: { type: String, default: 'pcs' },
      unitQty: { type: Number, default: 0 },
      piecesPerUnit: { type: Number, default: 1 },
      quantity: { type: Number, default: 0 } // total pieces in this trip
    }],
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['IN_TRANSIT', 'RECEIVED'],
      default: 'IN_TRANSIT'
    },
    receivedBy: { type: String, trim: true },
    receivedAt: { type: Date }
  }],
  status: {
    type: String,
    enum: ['IN_TRANSIT', 'RECEIVED', 'CANCELLED'],
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

module.exports = mongoose.model('Transfer', transferSchema);
