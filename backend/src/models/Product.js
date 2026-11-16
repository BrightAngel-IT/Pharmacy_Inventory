/**
 * Module: Product
 * 
 * Mongoose database schema and model definition for Product.
 */

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    barcode: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    unit: { type: String, default: 'pcs' },
    itemType: { 
      type: String, 
      enum: ['TABLET_CAPSULE', 'BOTTLE_SYRUP', 'CREAM_TUBE', 'INJECTION_VIAL', 'SURGICAL_DEVICE', 'GENERAL'],
      default: 'TABLET_CAPSULE' 
    },
    tabletsPerCard: { type: Number, default: 12 }, // e.g. 12 tablets per card
    cardsPerBox: { type: Number, default: 10 },    // e.g. 10 cards per small box (120 tabs)
    boxesPerCarton: { type: Number, default: 20 }, // e.g. 20 boxes per master carton (2,400 tabs)
    defaultPackType: { type: String, default: 'Carton' }, // 'Pack', 'Bottle', 'Box', 'Strip', 'Tube', 'Vial', 'Set', 'Loose'
    piecesPerPack: { type: Number, default: 1 },
    volumeOrWeight: { type: String, default: '' }, // e.g. "100ml", "500ml", "1L"
    price: { type: Number, default: 0, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    manualActiveBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    latestPurchaseCost: { type: Number, default: 0, min: 0 },
    loyaltyDiscount: { type: Number, default: 0, min: 0 },
    quantityInStock: { type: Number, required: true, min: 0 },
    reorderLevel: { type: Number, default: 0, min: 0 },
    rack: {
      rowNumber: { type: Number, required: true, min: 1 },
      columnNumber: { type: Number, required: true, min: 1 },
      shelfNumber: { type: Number, default: 1, min: 1 },
    },
    image: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
