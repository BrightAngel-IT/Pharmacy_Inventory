/**
 * Module: Purchase
 * 
 * Mongoose database schema and model definition for Pharmacy Purchase.
 */

const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    batchNumber: { type: String, trim: true, default: '' },
    expiryDate: { type: Date },
    manufactureDate: { type: Date },
    
    // Pack Info
    packType: { type: String, default: '100 Pack' }, // e.g. "100 Pack", "50 Pack"
    piecesPerPack: { type: Number, default: 1 },
    packQuantity: { type: Number, default: 1 }, // how many packs purchased
    quantity: { type: Number, required: true }, // total units (packQuantity * piecesPerPack)

    costPrice: { type: Number, required: true }, // unit cost
    sellingPrice: { type: Number, default: 0 },  // unit selling price
    costPerPack: { type: Number, default: 0 },
    sellingPerPack: { type: Number, default: 0 }
  }],
  date: { type: Date, default: Date.now },
  branch: { type: String, default: 'Main Branch' },
  returnDays: { type: Number, default: 0 },
  total: { type: Number, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
