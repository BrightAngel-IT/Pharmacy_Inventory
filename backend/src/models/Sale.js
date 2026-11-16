/**
 * Module: Sale
 * 
 * Mongoose database schema and model definition for Sale.
 */

const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    barcode: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0 },
    batchNumber: { type: String, default: '' },
    expiryDate: { type: Date },
    originalPrice: { type: Number, default: 0 },
    loyaltyDiscount: { type: Number, default: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    rack: {
      rowNumber: { type: Number, required: true },
      columnNumber: { type: Number, required: true },
      shelfNumber: { type: Number, required: true },
    },
  },
  { _id: false },
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customerName: { type: String, default: 'Walk-in customer' },
    loyaltyCard: { type: String, default: '' },
    paymentMethod: {
      type: String,
<<<<<<< HEAD
      enum: ['cash', 'card', 'credit', 'split', 'upi', 'bank-transfer'],
=======
      enum: ['cash', 'card', 'upi', 'bank-transfer', 'credit', 'split'],
>>>>>>> 2d307ea5cf9831b78cf27b4773dcc5cb6c24e5d9
      default: 'cash',
    },
    splitPayments: [
      {
<<<<<<< HEAD
        method: { type: String, enum: ['cash', 'card', 'credit', 'upi', 'bank-transfer'] },
=======
        method: { type: String, enum: ['cash', 'card', 'upi', 'bank-transfer', 'credit'] },
>>>>>>> 2d307ea5cf9831b78cf27b4773dcc5cb6c24e5d9
        amount: { type: Number, required: true }
      }
    ],
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    items: { type: [saleItemSchema], default: [] },
    cashier: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      username: { type: String, required: true },
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    branch: { type: String, default: 'Main Branch' },
    returnDays: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
