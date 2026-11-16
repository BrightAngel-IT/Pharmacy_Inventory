/**
 * Module: store
 * 
 * Core business logic and database queries for the store/application.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { isDatabaseReady } = require('../config/database');
const { buildDemoSales, demoProducts, demoUsers } = require('../data/demoData');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const User = require('../models/User');
const CustomerInvoice = require('../models/CustomerInvoice');
const SupplierInvoice = require('../models/SupplierInvoice');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Return = require('../models/Return');
const Branch = require('../models/Branch');
const BranchStock = require('../models/BranchStock');
const Purchase = require('../models/Purchase');
const Transfer = require('../models/Transfer');
const Batch = require('../models/Batch');
const Company = require('../models/Company');
const Shift = require('../models/Shift');

const memoryStore = {
  ready: false,
  users: [],
  products: [],
  sales: [],
  returns: [],
  purchases: [],
  branches: [],
  branchStocks: [],
  company: {
    name: 'Inventory System',
    tagline: 'Excellence in Management',
    address: '',
    phone: '',
    email: '',
    logo: '',
  },
};

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function generateId() {
  return new mongoose.Types.ObjectId().toString();
}

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function formatCurrencyAmount(value) {
  return Number((value || 0).toFixed(2));
}

function sanitizeUser(user) {
  return {
    _id: String(user._id),
    name: user.name,
    username: user.username,
    role: user.role,
    branch: user.branch,
  };
}

function makeInvoiceNumber() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ];
  const suffix = String(Date.now()).slice(-4);
  return `C-INV-${parts.join('')}-${suffix}`;
}

async function generateInvoiceNumber() {
  if (isDatabaseReady()) {
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create({
        name: 'Inventory System',
        tagline: 'Excellence in Management',
        nextInvoiceNumber: 1000,
        invoicePrefix: 'C-INV-',
      });
    }
    const prefix = company.invoicePrefix || 'C-INV-';
    const nextNum = company.nextInvoiceNumber || 1000;

    // Increment nextInvoiceNumber in DB
    await Company.updateOne({}, { $inc: { nextInvoiceNumber: 1 } });

    return `${prefix}${nextNum}`;
  } else {
    const prefix = memoryStore.company.invoicePrefix || 'C-INV-';
    const nextNum = memoryStore.company.nextInvoiceNumber || 1000;
    memoryStore.company.nextInvoiceNumber = nextNum + 1;
    return `${prefix}${nextNum}`;
  }
}

function getRackLabel(rack) {
  return `R${rack.rowNumber}-C${rack.columnNumber}-S${rack.shelfNumber}`;
}

function sameDay(dateA, dateB) {
  const left = new Date(dateA);
  const right = new Date(dateB);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function startOfWeek(date) {
  const clone = new Date(date);
  const day = (clone.getDay() + 6) % 7;
  clone.setDate(clone.getDate() - day);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function startOfMonth(date) {
  const clone = new Date(date);
  clone.setDate(1);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function startOfYear(date) {
  const clone = new Date(date);
  clone.setMonth(0, 1);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

async function prepareSeedUsers() {
  const prepared = [];

  for (const user of demoUsers) {
    prepared.push({
      _id: generateId(),
      name: user.name,
      username: user.username.toLowerCase(),
      passwordHash: await bcrypt.hash(user.password, 10),
      role: user.role,
      branch: user.branch,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return prepared;
}

function prepareSeedProducts() {
  return demoProducts.map((product) => ({
    _id: generateId(),
    ...clonePlain(product),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

async function seedMemoryStore() {
  if (memoryStore.ready) {
    return;
  }

  const users = await prepareSeedUsers();
  const products = prepareSeedProducts();
  const sales = buildDemoSales(products, users).map((sale) => ({
    _id: generateId(),
    ...sale,
  }));

  memoryStore.users = users;
  memoryStore.products = products;
  memoryStore.sales = sales;

  // Initialize branches
  memoryStore.branches = [
    {
      _id: generateId(),
      name: 'Main Warehouse',
      location: 'Colombo 06',
      phone: '+94 11 234 5678',
      email: 'main@inventory.com',
      manager: 'Store Admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: generateId(),
      name: 'Counter 01',
      location: 'Colombo 06',
      phone: '+94 11 234 5679',
      email: 'counter01@inventory.com',
      manager: 'Front Cashier',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  // Initialize branch stocks
  memoryStore.branchStocks = [];
  products.forEach(p => {
    memoryStore.branchStocks.push({
      _id: generateId(),
      branch: 'Main Warehouse',
      productId: String(p._id),
      quantityInStock: Number(p.quantityInStock),
      reorderLevel: Number(p.reorderLevel),
      rack: p.rack,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    memoryStore.branchStocks.push({
      _id: generateId(),
      branch: 'Counter 01',
      productId: String(p._id),
      quantityInStock: Math.max(0, Math.floor(Number(p.quantityInStock) / 2)),
      reorderLevel: Number(p.reorderLevel),
      rack: p.rack,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  memoryStore.ready = true;
}

async function seedDatabase() {
  const [userCount, productCount, saleCount] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Sale.countDocuments(),
  ]);

  if (userCount === 0) {
    const users = await prepareSeedUsers();
    await User.insertMany(users);
  }

  if (productCount === 0) {
    const products = prepareSeedProducts();
    await Product.insertMany(products);
  }

  // if (saleCount === 0) {
  //   const [users, products] = await Promise.all([User.find().lean(), Product.find().lean()]);
  //   const sales = buildDemoSales(products, users);
  //   await Sale.insertMany(sales);
  // }

  const branchCount = await Branch.countDocuments();
  if (branchCount === 0) {
    const branches = [
      {
        name: 'Main Warehouse',
        location: 'Colombo 06',
        phone: '+94 11 234 5678',
        email: 'main@inventory.com',
        manager: 'Store Admin',
        status: 'active',
      },
      {
        name: 'Counter 01',
        location: 'Colombo 06',
        phone: '+94 11 234 5679',
        email: 'counter01@inventory.com',
        manager: 'Front Cashier',
        status: 'active',
      }
    ];
    await Branch.insertMany(branches);
  }

  const branchStockCount = await BranchStock.countDocuments();
  if (branchStockCount === 0) {
    const allProducts = await Product.find().lean();
    const branchStocks = [];
    allProducts.forEach(p => {
      branchStocks.push({
        branch: 'Main Warehouse',
        productId: p._id,
        quantityInStock: p.quantityInStock,
        reorderLevel: p.reorderLevel,
        rack: p.rack,
      });
      branchStocks.push({
        branch: 'Counter 01',
        productId: p._id,
        quantityInStock: Math.max(0, Math.floor(p.quantityInStock / 2)),
        reorderLevel: p.reorderLevel,
        rack: p.rack,
      });
    });
    if (branchStocks.length > 0) {
      await BranchStock.insertMany(branchStocks);
    }
  }
}

async function initializeStore() {
  if (isDatabaseReady()) {
    await seedDatabase();
    memoryStore.users = await User.find().lean();
    return;
  }

  await seedMemoryStore();
}

function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      username: user.username,
    },
    process.env.JWT_SECRET || 'inventory-demo-secret',
    { expiresIn: '12h' },
  );
}

async function loginUser(username, password) {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const user = await findUserByUsername(normalizedUsername);

  if (!user) {
    throw createError('Invalid username or password.', 401);
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);

  if (!validPassword) {
    throw createError('Invalid username or password.', 401);
  }

  const sanitizedUser = sanitizeUser(user);

  return {
    token: signToken(sanitizedUser),
    user: sanitizedUser,
  };
}

async function findUserByUsername(username) {
  if (isDatabaseReady()) {
    return User.findOne({ username }).lean();
  }

  return memoryStore.users.find((user) => user.username === username) || null;
}

async function getUserById(id) {
  if (isDatabaseReady()) {
    try {
      const user = await User.findById(id).lean();
      return user ? sanitizeUser(user) : null;
    } catch (err) {
      return null; // invalid ID format or error
    }
  }
  const user = memoryStore.users.find((item) => String(item._id) === String(id));
  return user ? sanitizeUser(user) : null;
}

async function getAllUsersForLookup() {
  if (isDatabaseReady()) {
    const users = await User.find().lean();
    memoryStore.users = users;
    return users;
  }

  return memoryStore.users;
}

async function getAllProducts() {
  if (isDatabaseReady()) {
    const products = await Product.find().sort({ name: 1 }).lean();
    return products.map((product) => ({
      ...product,
      _id: String(product._id),
    }));
  }

  return clonePlain(memoryStore.products).sort((left, right) => left.name.localeCompare(right.name));
}

async function getAllSales() {
  if (isDatabaseReady()) {
    const sales = await Sale.find().sort({ createdAt: -1 }).lean();

    // Fetch related invoices to get actual balances
    const invoiceNos = sales.map(s => s.invoiceNumber);
    const invoices = await CustomerInvoice.find({ invoiceNo: { $in: invoiceNos } }).lean();
    const invoiceMap = new Map(invoices.map(i => [i.invoiceNo, i]));

    return sales.map((sale) => {
      const inv = invoiceMap.get(sale.invoiceNumber);
      return {
        ...sale,
        _id: String(sale._id),
        balanceAmount: inv ? inv.balanceAmount : (sale.paymentMethod === 'credit' ? sale.total : 0),
        status: inv ? inv.status : (sale.paymentMethod === 'credit' ? 'UNPAID' : 'PAID'),
        items: sale.items.map((item) => ({
          ...item,
          productId: String(item.productId),
        })),
      };
    });
  }

  return clonePlain(memoryStore.sales).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

async function getProducts(filters = {}) {
  const products = await getAllProducts();
  const branchName = filters.branch;

  let branchStocks = [];
  let branchBatches = [];
  if (isDatabaseReady()) {
    if (branchName) {
      const normalizedBranch = String(branchName).toLowerCase();
      const isMain = ['main branch', 'main warehouse', 'main'].includes(normalizedBranch);
      const branchQuery = isMain
        ? { branch: { $regex: /^(main branch|main warehouse|main)$/i } }
        : { branch: branchName };
      branchStocks = await BranchStock.find(branchQuery).lean();
      branchBatches = await Batch.find({
        ...branchQuery,
        status: 'ACTIVE',
        availableQuantity: { $gt: 0 }
      }).sort({ expiryDate: 1 }).lean();
    } else {
      branchStocks = await BranchStock.find().lean();
      branchBatches = await Batch.find({
        status: 'ACTIVE',
        availableQuantity: { $gt: 0 }
      }).sort({ expiryDate: 1 }).lean();
    }
  } else {
    if (branchName) {
      const normalizedBranch = String(branchName).toLowerCase();
      const isMain = ['main branch', 'main warehouse', 'main'].includes(normalizedBranch);
      if (isMain) {
        branchStocks = memoryStore.branchStocks.filter(bs => {
          const bsNorm = String(bs.branch).toLowerCase();
          return ['main branch', 'main warehouse', 'main'].includes(bsNorm);
        });
      } else {
        branchStocks = memoryStore.branchStocks.filter(bs => bs.branch === branchName);
      }
    } else {
      branchStocks = memoryStore.branchStocks;
    }
  }

  const stockMap = new Map();
  branchStocks.forEach(bs => {
    const prodId = String(bs.productId);
    if (!stockMap.has(prodId)) {
      stockMap.set(prodId, { 
        quantityInStock: 0, 
        reorderLevel: bs.reorderLevel, 
        rack: bs.rack, 
        count: 0, 
        branches: [],
        manualActiveBatchId: bs.manualActiveBatchId 
      });
    }
    const entry = stockMap.get(prodId);
    entry.branches.push({
      branch: bs.branch,
      quantityInStock: Number(bs.quantityInStock || 0),
      reorderLevel: bs.reorderLevel,
      rack: bs.rack,
      rackLabel: getRackLabel(bs.rack)
    });
    if (branchName) {
      entry.quantityInStock += Number(bs.quantityInStock);
      entry.reorderLevel = bs.reorderLevel;
      entry.rack = bs.rack;
    } else {
      entry.quantityInStock += Number(bs.quantityInStock);
      if (entry.count === 0) {
        entry.reorderLevel = bs.reorderLevel;
        entry.rack = bs.rack;
      }
      entry.count++;
    }
  });

  const batchMap = new Map();
  branchBatches.forEach(b => {
    const prodId = String(b.product);
    if (!batchMap.has(prodId)) {
      batchMap.set(prodId, []);
    }
    batchMap.get(prodId).push({
      _id: String(b._id),
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      availableQuantity: Number(b.availableQuantity || 0),
      costPricePerUnit: Number(b.costPricePerUnit || 0),
      sellingPricePerUnit: Number(b.sellingPricePerUnit || 0),
      packType: b.packType,
      piecesPerPack: b.piecesPerPack,
      branch: b.branch
    });
  });

  return products
    .map((product) => {
      const stock = stockMap.get(String(product._id));
      const finalQuantity = stock ? stock.quantityInStock : 0;
      const finalReorder = stock ? stock.reorderLevel : product.reorderLevel;
      const finalRack = stock ? stock.rack : product.rack;
      const activeBatches = batchMap.get(String(product._id)) || [];
      
      // If Admin has manually selected a batch for this branch or product, find that first; otherwise fallback to FEFO (earliest expiry)
      const branchManualBatchId = stock?.manualActiveBatchId || product.manualActiveBatchId;
      let primaryBatch = null;
      if (branchManualBatchId) {
        primaryBatch = activeBatches.find(b => String(b._id) === String(branchManualBatchId) && b.availableQuantity > 0);
      }
      if (!primaryBatch && activeBatches.length > 0) {
        primaryBatch = activeBatches[0];
      }

      // In Pharmacy FEFO, active selling price and cost price follow the active batch on shelf!
      const effectiveSellingPrice = (primaryBatch && primaryBatch.sellingPricePerUnit > 0)
        ? primaryBatch.sellingPricePerUnit
        : Number(product.price || 0);

      const effectiveCostPrice = (primaryBatch && primaryBatch.costPricePerUnit > 0)
        ? primaryBatch.costPricePerUnit
        : Number(product.costPrice || 0);

      return {
        ...product,
        price: effectiveSellingPrice,
        costPrice: effectiveCostPrice,
        catalogPrice: Number(product.price || 0),
        catalogCostPrice: Number(product.costPrice || 0),
        activeBatch: primaryBatch,
        batches: activeBatches,
        quantityInStock: finalQuantity,
        reorderLevel: finalReorder,
        rack: finalRack,
        rackLabel: getRackLabel(finalRack),
        branchStocks: stock ? stock.branches : [],
      };
    })
    .filter((product) => {
      const matchesQuery = filters.query
        ? `${product.name} ${product.sku} ${product.barcode}`
          .toLowerCase()
          .includes(String(filters.query).toLowerCase())
        : true;
      const matchesCategory = filters.category
        ? product.category.toLowerCase() === String(filters.category).toLowerCase()
        : true;
      const matchesStock = filters.lowStockOnly
        ? Number(product.quantityInStock) <= Number(product.reorderLevel)
        : true;

      return matchesQuery && matchesCategory && matchesStock;
    });
}

async function saveProduct(payload) {
  const productData = {
    name: String(payload.name || '').trim(),
    sku: String(payload.sku || '').trim(),
    barcode: String(payload.barcode || '').trim(),
    category: String(payload.category || '').trim(),
    description: String(payload.description || '').trim(),
    unit: String(payload.unit || 'pcs').trim(),
    price: Number(payload.price || 0),
    costPrice: Number(payload.costPrice || 0),
    loyaltyDiscount: Number(payload.loyaltyDiscount || 0),
    quantityInStock: Number(payload.quantityInStock || 0),
    reorderLevel: Number(payload.reorderLevel || 0),
    rack: {
      rowNumber: Number(payload.rack?.rowNumber || 1),
      columnNumber: Number(payload.rack?.columnNumber || 1),
      shelfNumber: Number(payload.rack?.shelfNumber || 1),
    },
    image: String(payload.image || '').trim(),
  };

  if (!productData.name || !productData.sku || !productData.barcode || !productData.category) {
    throw createError('Name, SKU, barcode, and category are required.');
  }

  if (!productData.image) {
    productData.image =
      'data:image/svg+xml;charset=UTF-8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" rx="40" fill="#dbeafe"/><text x="72" y="220" font-size="54" font-family="Segoe UI, Arial, sans-serif" fill="#0f172a">${productData.name}</text><text x="72" y="286" font-size="26" font-family="Segoe UI, Arial, sans-serif" fill="#475569">${productData.category}</text></svg>`,
      );
  }

  if (isDatabaseReady()) {
    let product;
    if (payload._id) {
      product = await Product.findByIdAndUpdate(payload._id, productData, {
        new: true,
        runValidators: true,
      }).lean();

      if (!product) {
        throw createError('Product not found.', 404);
      }
    } else {
      product = await Product.create(productData);
      product = product.toObject();
    }

    const branchName = payload.branch;
    if (branchName) {
      await BranchStock.findOneAndUpdate(
        { branch: branchName, productId: product._id },
        {
          quantityInStock: Number(payload.quantityInStock || 0),
          reorderLevel: Number(payload.reorderLevel || 0),
          rack: productData.rack
        },
        { upsert: true, new: true }
      );
    }

    if (!payload._id) {
      const branches = await Branch.find().lean();
      for (const b of branches) {
        if (b.name !== branchName) {
          await BranchStock.create({
            branch: b.name,
            productId: product._id,
            quantityInStock: 0,
            reorderLevel: productData.reorderLevel,
            rack: productData.rack,
          });
        }
      }
    }

    let finalQty = product.quantityInStock;
    let finalReorder = product.reorderLevel;
    let finalRack = product.rack;

    if (branchName) {
      const bs = await BranchStock.findOne({ branch: branchName, productId: product._id }).lean();
      if (bs) {
        finalQty = bs.quantityInStock;
        finalReorder = bs.reorderLevel;
        finalRack = bs.rack;
      }
    }

    return {
      ...product,
      _id: String(product._id),
      quantityInStock: finalQty,
      reorderLevel: finalReorder,
      rack: finalRack,
      rackLabel: getRackLabel(finalRack)
    };
  }

  let product;
  if (payload._id) {
    const index = memoryStore.products.findIndex((p) => String(p._id) === String(payload._id));
    if (index < 0) {
      throw createError('Product not found.', 404);
    }

    memoryStore.products[index] = {
      ...memoryStore.products[index],
      ...productData,
      updatedAt: new Date().toISOString(),
    };
    product = memoryStore.products[index];
  } else {
    product = {
      _id: generateId(),
      ...productData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryStore.products.push(product);

    memoryStore.branches.forEach(b => {
      if (b.name !== payload.branch) {
        memoryStore.branchStocks.push({
          _id: generateId(),
          branch: b.name,
          productId: String(product._id),
          quantityInStock: 0,
          reorderLevel: product.reorderLevel,
          rack: product.rack,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  if (payload.branch) {
    let bs = memoryStore.branchStocks.find(b => b.branch === payload.branch && String(b.productId) === String(product._id));
    if (!bs) {
      bs = {
        _id: generateId(),
        branch: payload.branch,
        productId: String(product._id),
        createdAt: new Date().toISOString(),
      };
      memoryStore.branchStocks.push(bs);
    }
    bs.quantityInStock = Number(payload.quantityInStock || 0);
    bs.reorderLevel = Number(payload.reorderLevel || 0);
    bs.rack = productData.rack;
    bs.updatedAt = new Date().toISOString();
  }

  let finalQty = product.quantityInStock;
  let finalReorder = product.reorderLevel;
  let finalRack = product.rack;

  if (payload.branch) {
    const bs = memoryStore.branchStocks.find(b => b.branch === payload.branch && String(b.productId) === String(product._id));
    if (bs) {
      finalQty = bs.quantityInStock;
      finalReorder = bs.reorderLevel;
      finalRack = bs.rack;
    }
  }

  return {
    ...clonePlain(product),
    quantityInStock: finalQty,
    reorderLevel: finalReorder,
    rack: finalRack,
    rackLabel: getRackLabel(finalRack),
  };
}

async function deleteProduct(productId) {
  if (isDatabaseReady()) {
    const product = await Product.findByIdAndDelete(productId);
    if (!product) {
      throw createError('Product not found.', 404);
    }
    await BranchStock.deleteMany({ productId });
    return { success: true };
  }

  const index = memoryStore.products.findIndex((p) => String(p._id) === String(productId));
  if (index < 0) {
    throw createError('Product not found.', 404);
  }

  memoryStore.products.splice(index, 1);
  memoryStore.branchStocks = memoryStore.branchStocks.filter((bs) => String(bs.productId) !== String(productId));
  return { success: true };
}

async function createSale(payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (items.length === 0) {
    throw createError('Add at least one item before checking out.');
  }

  // Ensure cashier has an active shift
  if (payload.cashier && payload.cashier.role === 'cashier') {
    const shift = await getCurrentShift(payload.cashier._id);
    if (!shift) {
      throw createError('You must Start Job before processing sales.', 403);
    }
  }

  if (payload.customerId && isDatabaseReady()) {
    const customer = await Customer.findById(payload.customerId).lean();
    if (customer) {
      const allowedDays = Number(customer.paymentPeriodDays) || 30; // Default to 30 if undefined
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - allowedDays);

      const overdueInvoices = await CustomerInvoice.find({
        customerId: payload.customerId,
        status: { $in: ['UNPAID', 'PARTIAL'] },
        date: { $lt: cutoffDate }
      }).lean();

      if (overdueInvoices.length > 0) {
        throw createError(`Customer has overdue payments (older than ${allowedDays} days). Cannot process new bill until they are cleared.`, 400);
      }
    }
  }

  const branchName = payload.cashier?.branch || 'Main Branch';
  const products = await getProducts({ branch: branchName });
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const saleItems = items.map((item) => {
    const product = productMap.get(String(item.productId));

    if (!product) {
      throw createError('One of the selected products was not found.', 404);
    }

    const quantity = Number(item.quantity || 0);

    if (quantity <= 0) {
      throw createError(`Quantity must be greater than zero for ${product.name}.`);
    }

    if (quantity > Number(product.quantityInStock)) {
      throw createError(`Not enough stock for ${product.name}.`);
    }

    const isLoyalty = !!payload.loyaltyCard;
    const regularPrice = Number(product.price || 0);
    const memberPriceInDb = Number(product.loyaltyDiscount || regularPrice);

    // POS Page Logic: Loyalty Price is the value in DB (interpreted as member price)
    const effectivePrice = isLoyalty
      ? Math.max(0, Math.min(regularPrice, memberPriceInDb))
      : regularPrice;

    const lineTotal = formatCurrencyAmount(effectivePrice * quantity);

    return {
      productId: product._id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      price: effectivePrice, // The actual selling price
      costPrice: Number(product.costPrice || 0),
      batchNumber: product.activeBatch?.batchNumber || '',
      expiryDate: product.activeBatch?.expiryDate || undefined,
      originalPrice: regularPrice, // The base price
      loyaltyDiscount: isLoyalty ? Math.max(0, regularPrice - effectivePrice) : 0,
      quantity,
      lineTotal,
      image: product.image,
      rack: product.rack,
    };
  });

  const subtotal = formatCurrencyAmount(
    saleItems.reduce((sum, item) => sum + item.lineTotal, 0),
  );
  const discount = formatCurrencyAmount(Number(payload.discount || 0));
  const tax = 0;
  const total = formatCurrencyAmount(subtotal - discount);
  
  console.log("createSale: Generating invoice number...");
  const invoiceNumber = await generateInvoiceNumber();
  console.log("createSale: Invoice number generated:", invoiceNumber);
  
  const salePayload = {
    invoiceNumber,
    customerName: String(payload.customerName || 'Walk-in customer').trim(),
    loyaltyCard: String(payload.loyaltyCard || '').trim(),
    paymentMethod: ['cash', 'card', 'credit', 'split', 'upi', 'bank-transfer'].includes(payload.paymentMethod)
      ? payload.paymentMethod
      : 'cash',
    splitPayments: payload.splitPayments || undefined,
    discount,
    tax,
    subtotal,
    total,
    customerId: payload.customerId || undefined, // Optional customer link
    items: saleItems,
    branch: branchName,
    cashier: {
      userId: payload.cashier._id,
      name: payload.cashier.name,
      username: payload.cashier.username,
    },
    notes: String(payload.notes || '').trim(),
    returnDays: Number(payload.returnDays || 0),
  };

  if (isDatabaseReady()) {
    console.log("createSale: Checking for open shift...");
    const activeShift = await Shift.findOne({ cashierId: payload.cashier._id, status: 'open' });
    if (!activeShift) {
      throw createError('You must Start Job before processing sales.', 400);
    }

    console.log("createSale: Creating sale in DB...");
    const sale = await Sale.create(salePayload);
    console.log("createSale: Sale created in DB.");

    console.log("createSale: Updating branch stock and batches (FEFO)...");
    for (const item of saleItems) {
      await BranchStock.findOneAndUpdate(
        { branch: branchName, productId: item.productId },
        { $inc: { quantityInStock: -item.quantity } }
      );

      // Deduct from Batches: First check if item was sold from a specific batch (e.g. manual active batch), then fallback to FEFO
      try {
        let remainingToDeduct = item.quantity;
        const normalizedBranch = String(branchName).toLowerCase();
        const isMain = ['main branch', 'main warehouse', 'main'].includes(normalizedBranch);
        const branchQuery = isMain
          ? { branch: { $regex: /^(main branch|main warehouse|main)$/i } }
          : { branch: branchName };

        // If the sale item specified a batchNumber, deduct from that batch first!
        if (item.batchNumber) {
          const targetedBatch = await Batch.findOne({
            product: item.productId,
            batchNumber: item.batchNumber,
            ...branchQuery,
            status: 'ACTIVE',
            availableQuantity: { $gt: 0 }
          });
          if (targetedBatch) {
            const deduct = Math.min(targetedBatch.availableQuantity, remainingToDeduct);
            targetedBatch.availableQuantity -= deduct;
            remainingToDeduct -= deduct;
            if (targetedBatch.availableQuantity <= 0) {
              targetedBatch.availableQuantity = 0;
              targetedBatch.status = 'DEPLETED';
            }
            await targetedBatch.save();
          }
        }

        // If any remaining quantity remains, deduct from active batches in FEFO order
        if (remainingToDeduct > 0) {
          const activeBatches = await Batch.find({
            product: item.productId,
            ...branchQuery,
            status: 'ACTIVE',
            availableQuantity: { $gt: 0 }
          }).sort({ expiryDate: 1 });

          for (const b of activeBatches) {
            if (remainingToDeduct <= 0) break;
            const deductFromThisBatch = Math.min(b.availableQuantity, remainingToDeduct);
            b.availableQuantity -= deductFromThisBatch;
            remainingToDeduct -= deductFromThisBatch;

            if (b.availableQuantity <= 0) {
              b.availableQuantity = 0;
              b.status = 'DEPLETED';
            }
            await b.save();
          }
        }
      } catch (batchErr) {
        console.error("Error updating batch stock in FEFO:", batchErr);
      }
    }
    console.log("createSale: Branch stock & batches updated.");

    // Create Invoice if Credit or has Credit component in split
    let creditAmount = 0;
    if (salePayload.paymentMethod === 'credit') {
      creditAmount = salePayload.total;
    } else if (salePayload.paymentMethod === 'split' && salePayload.splitPayments) {
      const creditPart = salePayload.splitPayments.find(p => p.method === 'credit');
      if (creditPart) {
        creditAmount = Number(creditPart.amount || 0);
      }
    }

    if (creditAmount > 0 && salePayload.customerId) {
      await CustomerInvoice.create({
        invoiceNo: salePayload.invoiceNumber,
        customerId: salePayload.customerId,
        date: new Date(),
        totalAmount: creditAmount,
        balanceAmount: creditAmount,
        status: 'UNPAID'
      });
    }

    const plainSale = sale.toObject();
    return {
      ...plainSale,
      _id: String(plainSale._id),
      items: plainSale.items.map((item) => ({
        ...item,
        productId: String(item.productId),
      })),
    };
  }

  saleItems.forEach((item) => {
    let bs = memoryStore.branchStocks.find((entry) => entry.branch === branchName && String(entry.productId) === String(item.productId));
    if (bs) {
      bs.quantityInStock -= item.quantity;
      bs.updatedAt = new Date().toISOString();
    }
  });

  const sale = {
    _id: generateId(),
    ...salePayload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  memoryStore.sales.unshift(sale);

  return clonePlain(sale);
}

async function createReturn(payload) {
  const { type, entityId, referenceNo, items, refundMethod, reason, processedBy, branch } = payload;

  if (!items || items.length === 0) {
    throw createError('At least one item must be returned.');
  }

  const user = await getUserById(processedBy);
  const branchName = branch || user?.branch || 'Main Branch';

  // 1. Verify and Process Stock, and calculate item totals
  const processedItems = [];
  for (const item of items) {
    let product;
    if (isDatabaseReady()) {
      product = await Product.findById(item.productId);
    } else {
      product = memoryStore.products.find(p => String(p._id) === String(item.productId));
    }
    if (!product) throw createError(`Product not found: ${item.name}`, 404);

    const qtyChange = type === 'customer' ? item.quantity : -item.quantity;

    if (isDatabaseReady()) {
      await BranchStock.findOneAndUpdate(
        { branch: branchName, productId: item.productId },
        { $inc: { quantityInStock: qtyChange } },
        { upsert: true }
      );
    } else {
      let bs = memoryStore.branchStocks.find((entry) => entry.branch === branchName && String(entry.productId) === String(item.productId));
      if (bs) {
        bs.quantityInStock = Math.max(0, bs.quantityInStock + qtyChange);
        bs.updatedAt = new Date().toISOString();
      }
    }

    processedItems.push({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice
    });
  }

  // 2. Calculate Total
  const totalAmount = processedItems.reduce((sum, item) => sum + item.total, 0);

  // 3. Update Financials
  if (type === 'customer') {
    if (entityId) {
      if (isDatabaseReady()) {
        const customer = await Customer.findById(entityId);
        if (customer && refundMethod === 'credit-note') {
          await Customer.findByIdAndUpdate(entityId, { $inc: { balance: -totalAmount } });

          if (referenceNo) {
            const inv = await CustomerInvoice.findOne({ invoiceNo: referenceNo, customerId: entityId });
            if (inv) {
              const nextBalance = Math.max(0, inv.balanceAmount - totalAmount);
              const status = nextBalance === 0 ? 'PAID' : 'PARTIAL';
              await CustomerInvoice.findByIdAndUpdate(inv._id, {
                balanceAmount: nextBalance,
                status: status
              });
            }
          }
        }
      }
    }
  } else {
    if (entityId) {
      if (isDatabaseReady()) {
        const supplier = await Supplier.findById(entityId);
        if (supplier && refundMethod === 'credit-note') {
          await Supplier.findByIdAndUpdate(entityId, { $inc: { balance: -totalAmount } });

          if (referenceNo) {
            const inv = await SupplierInvoice.findOne({ invoiceNo: referenceNo, supplierId: entityId });
            if (inv) {
              const nextBalance = Math.max(0, inv.balanceAmount - totalAmount);
              const status = nextBalance === 0 ? 'PAID' : 'PARTIAL';
              await SupplierInvoice.findByIdAndUpdate(inv._id, {
                balanceAmount: nextBalance,
                status: status
              });
            }
          }
        }
      }
    }
  }

  // 4. Create Return Document
  const returnNo = `RET-${Date.now().toString().slice(-6)}`;
  const returnPayload = {
    returnNo,
    type,
    entityId: entityId || null,
    entityName: payload.entityName || (type === 'customer' ? 'Walk-in customer' : 'Default Supplier'),
    referenceNo,
    items: processedItems,
    totalAmount,
    reason,
    refundMethod,
    branch: branchName,
    processedBy
  };

  if (isDatabaseReady()) {
    return Return.create(returnPayload);
  }

  const returnDoc = {
    _id: generateId(),
    ...returnPayload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  memoryStore.returns.unshift(returnDoc);
  return clonePlain(returnDoc);
}

async function getReturns(filters = {}) {
  const branchFilter = filters.branch;
  if (isDatabaseReady()) {
    const query = {};
    if (filters.type) query.type = filters.type;
    if (filters.entityId) query.entityId = filters.entityId;
    if (branchFilter) query.branch = branchFilter;

    return Return.find(query).sort({ createdAt: -1 }).lean();
  }

  let list = memoryStore.returns;
  if (branchFilter) {
    list = list.filter(r => r.branch === branchFilter);
  }
  if (filters.type) {
    list = list.filter(r => r.type === filters.type);
  }
  if (filters.entityId) {
    list = list.filter(r => String(r.entityId) === String(filters.entityId));
  }

  return clonePlain(list).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

async function settleReturn(id, amount) {
  if (isDatabaseReady()) {
    const returnDoc = await Return.findById(id);
    if (!returnDoc) throw new Error('Return not found');

    if (amount !== undefined) {
      returnDoc.paidAmount = (returnDoc.paidAmount || 0) + Number(amount);
    } else {
      returnDoc.paidAmount = returnDoc.totalAmount;
    }

    if (returnDoc.paidAmount >= returnDoc.totalAmount) {
      returnDoc.paymentStatus = 'paid';
      returnDoc.status = 'completed';
    } else {
      returnDoc.paymentStatus = 'partial';
      returnDoc.status = 'pending';
    }
    await returnDoc.save();
    return returnDoc;
  }

  const idx = memoryStore.returns.findIndex(r => String(r._id) === String(id));
  if (idx === -1) throw new Error('Return not found');
  const ret = memoryStore.returns[idx];
  if (amount !== undefined) {
    ret.paidAmount = (ret.paidAmount || 0) + Number(amount);
  } else {
    ret.paidAmount = ret.totalAmount;
  }

  if (ret.paidAmount >= ret.totalAmount) {
    ret.paymentStatus = 'paid';
    ret.status = 'completed';
  } else {
    ret.paymentStatus = 'partial';
    ret.status = 'pending';
  }
  return clonePlain(ret);
}

async function getRecentSales(limit = 8) {
  const sales = await getAllSales();
  return sales.slice(0, limit);
}

function createTrend(range, sales, customStartDate = null, customEndDate = null) {
  const now = new Date();

  if (range === 'custom') {
    const buckets = [];
    let start = customStartDate ? new Date(customStartDate) : now;
    let end = customEndDate ? new Date(customEndDate) : now;
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const step = diffDays <= 31 ? 'daily' : (diffDays <= 180 ? 'weekly' : 'monthly');

    if (step === 'daily') {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        buckets.push({
          key,
          label: `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()}`,
          revenue: 0,
          orders: 0
        });
      }
    } else if (step === 'weekly') {
      let current = startOfWeek(start);
      while (current <= end) {
        const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        buckets.push({
          key,
          label: `W${current.toLocaleDateString('en-US', { month: 'short' })} ${current.getDate()}`,
          revenue: 0,
          orders: 0
        });
        current.setDate(current.getDate() + 7);
      }
    } else {
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current <= end) {
        const key = `${current.getFullYear()}-${current.getMonth() + 1}`;
        buckets.push({
          key,
          label: `${current.toLocaleDateString('en-US', { month: 'short' })} ${current.getFullYear()}`,
          revenue: 0,
          orders: 0
        });
        current.setMonth(current.getMonth() + 1);
      }
    }

    const map = new Map(buckets.map(b => [b.key, b]));

    sales.forEach((sale) => {
      const saleDate = new Date(sale.createdAt);
      let key = '';
      if (step === 'daily') {
        key = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}-${String(saleDate.getDate()).padStart(2, '0')}`;
      } else if (step === 'weekly') {
        const wDate = startOfWeek(saleDate);
        key = `${wDate.getFullYear()}-${String(wDate.getMonth() + 1).padStart(2, '0')}-${String(wDate.getDate()).padStart(2, '0')}`;
      } else {
        key = `${saleDate.getFullYear()}-${saleDate.getMonth() + 1}`;
      }
      const bucket = map.get(key);
      if (bucket) {
        bucket.revenue = formatCurrencyAmount(bucket.revenue + Number(sale.total));
        bucket.orders += 1;
      }
    });

    return buckets;
  }

  const buckets = [];

  if (range === 'daily') {
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - index);
      date.setHours(0, 0, 0, 0);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      buckets.push({
        key,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: 0,
        orders: 0,
      });
    }
  } else if (range === 'weekly') {
    for (let index = 7; index >= 0; index -= 1) {
      const date = startOfWeek(now);
      date.setDate(date.getDate() - index * 7);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      buckets.push({
        key,
        label: `W${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()}`,
        revenue: 0,
        orders: 0,
      });
    }
  } else if (range === 'monthly') {
    for (let index = 11; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      buckets.push({
        key: `${date.getFullYear()}-${date.getMonth() + 1}`,
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        revenue: 0,
        orders: 0,
      });
    }
  } else {
    for (let index = 4; index >= 0; index -= 1) {
      const year = now.getFullYear() - index;
      buckets.push({
        key: String(year),
        label: String(year),
        revenue: 0,
        orders: 0,
      });
    }
  }

  const map = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  sales.forEach((sale) => {
    const saleDate = new Date(sale.createdAt);
    let key = '';

    if (range === 'daily') {
      key = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}-${String(saleDate.getDate()).padStart(2, '0')}`;
    } else if (range === 'weekly') {
      const wDate = startOfWeek(saleDate);
      key = `${wDate.getFullYear()}-${String(wDate.getMonth() + 1).padStart(2, '0')}-${String(wDate.getDate()).padStart(2, '0')}`;
    } else if (range === 'monthly') {
      key = `${saleDate.getFullYear()}-${saleDate.getMonth() + 1}`;
    } else {
      key = String(saleDate.getFullYear());
    }

    const bucket = map.get(key);
    if (bucket) {
      bucket.revenue = formatCurrencyAmount(bucket.revenue + Number(sale.total));
      bucket.orders += 1;
    }
  });

  return buckets;
}

function getRangeStart(range) {
  const now = new Date();

  if (range === 'daily') {
    const date = new Date(now);
    date.setDate(now.getDate() - 6);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (range === 'weekly') {
    const date = startOfWeek(now);
    date.setDate(date.getDate() - 7 * 7);
    return date;
  }

  if (range === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth() - 11, 1);
  }

  return new Date(now.getFullYear() - 4, 0, 1);
}

async function getSalesReport(range = 'weekly', branchFilter = null, customStartDate = null, customEndDate = null) {
  const sales = await getAllSales();
  const products = await getAllProducts();
  const todayProductSalesMap = new Map();
  salesToday.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!todayProductSalesMap.has(item.productId)) {
        todayProductSalesMap.set(item.productId, {
          productId: item.productId,
          name: item.name,
          quantity: 0,
          revenue: 0,
          image: item.image,
          rackLabel: getRackLabel(item.rack),
        });
      }
      const entry = todayProductSalesMap.get(item.productId);
      entry.quantity += Number(item.quantity);
      entry.revenue = formatCurrencyAmount(entry.revenue + Number(item.lineTotal));
    });
  });

  const productSalesMap = new Map();
  const validRange = ['daily', 'weekly', 'monthly', 'annual', 'custom'].includes(range) ? range : 'weekly';

  let rangeStart, rangeEnd;
  if (validRange === 'custom') {
    rangeStart = customStartDate ? new Date(customStartDate) : new Date(0);
    rangeEnd = customEndDate ? new Date(new Date(customEndDate).setHours(23, 59, 59, 999)) : new Date();
  } else {
    rangeStart = getRangeStart(validRange);
    rangeEnd = new Date();
  }

  let filteredSales = sales.filter((sale) => {
    const d = new Date(sale.createdAt);
    return d >= rangeStart && d <= rangeEnd;
  });
  if (branchFilter) {
    const isMain = ['main branch', 'main warehouse', 'main'].includes(String(branchFilter).toLowerCase());
    filteredSales = filteredSales.filter((sale) => {
      if (isMain) {
        return ['main branch', 'main warehouse', 'main'].includes(String(sale.branch).toLowerCase());
      }
      return sale.branch === branchFilter;
    });
  }
  const totalRevenue = formatCurrencyAmount(
    filteredSales.reduce((sum, sale) => sum + Number(sale.total), 0),
  );
  const totalOrders = filteredSales.length;
  const unitsSold = filteredSales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + Number(item.quantity), 0),
    0,
  );

  const paymentBreakdownMap = new Map();
  const categoryBreakdownMap = new Map();

  filteredSales.forEach((sale) => {
    if (sale.paymentMethod === 'split' && sale.splitPayments && sale.splitPayments.length > 0) {
      sale.splitPayments.forEach((p) => {
        paymentBreakdownMap.set(
          p.method,
          formatCurrencyAmount((paymentBreakdownMap.get(p.method) || 0) + Number(p.amount)),
        );
      });
    } else {
      paymentBreakdownMap.set(
        sale.paymentMethod,
        formatCurrencyAmount((paymentBreakdownMap.get(sale.paymentMethod) || 0) + Number(sale.total)),
      );
    }

    sale.items.forEach((item) => {
      const product = products.find((entry) => String(entry._id) === String(item.productId));
      const category = product?.category || 'Uncategorized';
      categoryBreakdownMap.set(
        category,
        formatCurrencyAmount((categoryBreakdownMap.get(category) || 0) + Number(item.lineTotal)),
      );

      // Track top products
      if (!productSalesMap.has(item.productId)) {
        productSalesMap.set(item.productId, {
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          image: item.image,
          category,
          quantity: 0,
          revenue: 0
        });
      }
      const entry = productSalesMap.get(item.productId);
      entry.quantity += Number(item.quantity);
      entry.revenue = formatCurrencyAmount(entry.revenue + Number(item.lineTotal));
    });
  });

  const topSellingProducts = [...productSalesMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 50);

  return {
    range: validRange,
    summary: {
      totalRevenue,
      totalOrders,
      unitsSold,
      averageTicket: totalOrders ? formatCurrencyAmount(totalRevenue / totalOrders) : 0,
    },
    trend: createTrend(validRange, filteredSales, customStartDate, customEndDate),
    paymentBreakdown: [...paymentBreakdownMap.entries()].map(([label, value]) => ({
      label,
      value,
    })),
    categoryBreakdown: [...categoryBreakdownMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value),
    topSellingProducts,
    recentSales: filteredSales.slice(0, 50).map(sale => ({
      ...sale,
      cashierName: sale.cashierName || (sale.cashier?.name) || 'System'
    })),
  };
}

async function getOverviewData(user, branchFilter = null, trendRange = 'monthly', customStartDate = null, customEndDate = null) {
  const activeBranch = (user && user.role !== 'super_admin') ? user.branch : branchFilter;

  let [products, sales, users, allPurchases, allReturns, allCustomerInvoices, allSupplierInvoices, todayShifts] = await Promise.all([
    getProducts({ branch: activeBranch }),
    getAllSales(),
    getAllUsersForLookup(),
    isDatabaseReady() ? Purchase.find().sort({ createdAt: -1 }).populate('supplier').lean() : clonePlain(memoryStore.purchases || []),
    isDatabaseReady() ? Return.find().sort({ createdAt: -1 }).lean() : clonePlain(memoryStore.returns || []),
    isDatabaseReady() ? CustomerInvoice.find().sort({ updatedAt: -1 }).populate('customerId').lean() : [],
    isDatabaseReady() ? SupplierInvoice.find().sort({ updatedAt: -1 }).populate('supplierId').lean() : [],
    isDatabaseReady() ? Shift.find({ date: new Date().toISOString().split('T')[0] }).lean() : []
  ]);

  let activeShift = null;
  if (user && user.role === 'cashier' && isDatabaseReady()) {
    activeShift = await Shift.findOne({ cashierId: user._id, status: 'open' }).lean();
  }

  if (activeBranch) {
    sales = sales.filter((sale) => sale.branch === activeBranch);
    users = users.filter((u) => u.branch === activeBranch);
    allReturns = allReturns.filter(r => r.branch === activeBranch);
    allPurchases = allPurchases.filter(p => p.branch === activeBranch);
  } else if (user && user.role === 'cashier') {
    sales = sales.filter((sale) =>
      String(sale.cashier?.userId || sale.cashierId) === String(user._id)
    );
  }

  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  const inventoryValue = formatCurrencyAmount(
    products.reduce((sum, product) => sum + Number(product.quantityInStock) * Number(product.price), 0),
  );
  const stockCost = formatCurrencyAmount(
    products.reduce((sum, product) => sum + Number(product.quantityInStock) * Number(product.costPrice), 0),
  );
  const lowStockProducts = products
    .filter((product) => Number(product.quantityInStock) <= Number(product.reorderLevel))
    .sort((left, right) => left.quantityInStock - right.quantityInStock)
    .map((product) => ({
      ...product,
      rackLabel: getRackLabel(product.rack),
    }));

  let salesToday = [];
  if (user && user.role === 'cashier') {
    if (activeShift) {
      salesToday = sales.filter((sale) => new Date(sale.createdAt) >= new Date(activeShift.startTime));
    } else {
      salesToday = [];
    }
  } else {
    salesToday = sales.filter((sale) => sameDay(sale.createdAt, now));
  }
  const salesThisWeek = sales.filter((sale) => new Date(sale.createdAt) >= weekStart);
  const salesThisMonth = sales.filter((sale) => new Date(sale.createdAt) >= monthStart);
  const salesThisYear = sales.filter((sale) => new Date(sale.createdAt) >= yearStart);

  const rackSummaryMap = new Map();
  products.forEach((product) => {
    const key = `Row ${product.rack.rowNumber}`;
    if (!rackSummaryMap.has(key)) {
      rackSummaryMap.set(key, { row: key, items: 0, units: 0 });
    }
    const entry = rackSummaryMap.get(key);
    entry.items += 1;
    entry.units += Number(product.quantityInStock);
  });

  const todayProductSalesMap = new Map();
  salesToday.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!todayProductSalesMap.has(item.productId)) {
        todayProductSalesMap.set(item.productId, {
          productId: item.productId,
          name: item.name,
          quantity: 0,
          revenue: 0,
          image: item.image,
          rackLabel: getRackLabel(item.rack),
        });
      }
      const entry = todayProductSalesMap.get(item.productId);
      entry.quantity += Number(item.quantity);
      entry.revenue = formatCurrencyAmount(entry.revenue + Number(item.lineTotal));
    });
  });

  const productSalesMap = new Map();
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!productSalesMap.has(item.productId)) {
        productSalesMap.set(item.productId, {
          productId: item.productId,
          name: item.name,
          quantity: 0,
          revenue: 0,
          image: item.image,
          rackLabel: getRackLabel(item.rack),
        });
      }
      const entry = productSalesMap.get(item.productId);
      entry.quantity += Number(item.quantity);
      entry.revenue = formatCurrencyAmount(entry.revenue + Number(item.lineTotal));
    });
  });

  // Dynamic Trend Calculation
  let rangeStart, rangeEnd;
  const validRange = ['daily', 'weekly', 'monthly', 'annual', 'custom'].includes(trendRange) ? trendRange : 'monthly';
  if (validRange === 'custom') {
    rangeStart = customStartDate ? new Date(customStartDate) : new Date(0);
    rangeEnd = customEndDate ? new Date(new Date(customEndDate).setHours(23, 59, 59, 999)) : new Date();
  } else {
    rangeStart = getRangeStart(validRange);
    rangeEnd = new Date();
  }

  let filteredSalesForTrend = sales.filter((sale) => {
    const d = new Date(sale.createdAt);
    return d >= rangeStart && d <= rangeEnd;
  });

  let buckets = [];
  if (validRange === 'daily') {
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - index);
      date.setHours(0, 0, 0, 0);
      buckets.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        label: date.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }
  } else if (validRange === 'weekly') {
    for (let index = 7; index >= 0; index -= 1) {
      const date = startOfWeek(now);
      date.setDate(date.getDate() - index * 7);
      buckets.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        label: `W${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()}`
      });
    }
  } else if (validRange === 'monthly') {
    for (let index = 11; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      buckets.push({
        key: `${date.getFullYear()}-${date.getMonth() + 1}`,
        label: date.toLocaleDateString('en-US', { month: 'short' })
      });
    }
  } else if (validRange === 'annual') {
    for (let index = 4; index >= 0; index -= 1) {
      const year = now.getFullYear() - index;
      buckets.push({
        key: String(year),
        label: String(year)
      });
    }
  } else { // Custom
    const diffTime = Math.abs(rangeEnd - rangeStart);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let step = 'daily';
    if (diffDays > 60 && diffDays <= 180) step = 'weekly';
    else if (diffDays > 180 && diffDays <= 730) step = 'monthly';
    else if (diffDays > 730) step = 'annual';

    let current = new Date(rangeStart);
    if (step === 'daily') {
      while (current <= rangeEnd) {
        const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        buckets.push({ key, label: `${current.toLocaleDateString('en-US', { month: 'short' })} ${current.getDate()}` });
        current.setDate(current.getDate() + 1);
      }
    } else if (step === 'weekly') {
      current = startOfWeek(current);
      while (current <= rangeEnd) {
        const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        buckets.push({ key, label: `W${current.toLocaleDateString('en-US', { month: 'short' })} ${current.getDate()}` });
        current.setDate(current.getDate() + 7);
      }
    } else if (step === 'monthly') {
      current.setDate(1);
      while (current <= rangeEnd) {
        const key = `${current.getFullYear()}-${current.getMonth() + 1}`;
        buckets.push({ key, label: `${current.toLocaleDateString('en-US', { month: 'short' })} ${current.getFullYear()}` });
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      while (current <= rangeEnd) {
        const key = String(current.getFullYear());
        buckets.push({ key, label: key });
        current.setFullYear(current.getFullYear() + 1);
      }
    }
  }

  let branchMonthlySales = [];
  let allBranches = [];

  if (activeBranch) {
    branchMonthlySales = buckets.map((bucket) => {
      const bSales = filteredSalesForTrend.filter(s => {
        const d = new Date(s.createdAt);
        if (validRange === 'daily' || buckets.length > 12) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === bucket.key;
        } else if (validRange === 'weekly') {
          const wDate = startOfWeek(d);
          return `${wDate.getFullYear()}-${String(wDate.getMonth() + 1).padStart(2, '0')}-${String(wDate.getDate()).padStart(2, '0')}` === bucket.key;
        } else if (validRange === 'monthly') {
          return `${d.getFullYear()}-${d.getMonth() + 1}` === bucket.key;
        } else {
          return String(d.getFullYear()) === bucket.key;
        }
      });
      return {
        month: bucket.label,
        revenue: formatCurrencyAmount(bSales.reduce((sum, s) => sum + Number(s.total), 0))
      };
    });
  } else {
    allBranches = [...new Set(sales.map(s => s.branch || 'Unknown'))];
    branchMonthlySales = buckets.map((bucket) => {
      const monthData = { month: bucket.label };
      allBranches.forEach(branch => {
        const branchSales = filteredSalesForTrend.filter(s => {
          if ((s.branch || 'Unknown') !== branch) return false;
          const d = new Date(s.createdAt);
          if (validRange === 'daily' || buckets.length > 12 && buckets[0].key.length > 7) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === bucket.key;
          } else if (validRange === 'weekly') {
            const wDate = startOfWeek(d);
            return `${wDate.getFullYear()}-${String(wDate.getMonth() + 1).padStart(2, '0')}-${String(wDate.getDate()).padStart(2, '0')}` === bucket.key;
          } else if (validRange === 'monthly' || buckets[0].key.length <= 7) {
            if (bucket.key.includes('-')) return `${d.getFullYear()}-${d.getMonth() + 1}` === bucket.key;
            return String(d.getFullYear()) === bucket.key;
          } else {
            return String(d.getFullYear()) === bucket.key;
          }
        });
        monthData[branch] = formatCurrencyAmount(branchSales.reduce((sum, s) => sum + Number(s.total), 0));
      });
      return monthData;
    });
  }

  const recentSales = sales.slice(0, 50).map((sale) => ({
    ...sale,
    cashierName: sale.cashier?.name || 'Unknown cashier',
  }));

  const recentPurchases = allPurchases.slice(0, 50).map(p => ({
    ...p,
    supplierName: p.supplier?.name || p.supplierName || 'Unknown',
    _id: String(p._id)
  }));

  const recentCustomerReturns = allReturns.filter(r => r.type === 'customer').slice(0, 50).map(r => ({ ...r, _id: String(r._id) }));
  const recentSupplierReturns = allReturns.filter(r => r.type === 'supplier').slice(0, 50).map(r => ({ ...r, _id: String(r._id) }));
  const recentCustomerSettlements = allCustomerInvoices.filter(i => i.status === 'PAID' || i.status === 'PARTIAL').slice(0, 50).map(i => ({ ...i, _id: String(i._id) }));
  const recentSupplierSettlements = allSupplierInvoices.filter(i => i.status === 'PAID' || i.status === 'PARTIAL').slice(0, 50).map(i => ({ ...i, _id: String(i._id) }));

  const salesTotal = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const customerInvoiceBalances = allCustomerInvoices.reduce((sum, inv) => sum + Number(inv.balanceAmount), 0);
  const cashFromSales = salesTotal - customerInvoiceBalances;

  const purchasesTotal = allPurchases.reduce((sum, p) => sum + Number(p.total), 0);
  const supplierInvoiceBalances = allSupplierInvoices.reduce((sum, inv) => sum + Number(inv.balanceAmount), 0);
  const cashToSuppliers = purchasesTotal - supplierInvoiceBalances;

  const customerReturnsCash = allReturns.filter(r => r.type === 'customer').reduce((sum, r) => sum + Number(r.paidAmount), 0);
  const supplierReturnsCash = allReturns.filter(r => r.type === 'supplier').reduce((sum, r) => sum + Number(r.paidAmount), 0);

  const totalBalance = formatCurrencyAmount(cashFromSales + supplierReturnsCash - cashToSuppliers - customerReturnsCash);

  // Today Net Profit Calculation
  // 1. Product cost lookup map from products catalog
  const productCostMap = new Map();
  products.forEach(p => {
    productCostMap.set(String(p._id), Number(p.costPrice || 0));
  });

  // 2. Gross profit from today's sales: (LineTotal - (CostPrice * Qty))
  let todayGrossProfit = 0;
  salesToday.forEach(sale => {
    let saleCost = 0;
    (sale.items || []).forEach(item => {
      const unitCost = item.costPrice !== undefined ? Number(item.costPrice) : (productCostMap.get(String(item.productId)) || 0);
      saleCost += unitCost * Number(item.quantity || 0);
    });
    // Profit = Sale Total (after discounts) - Total Cost of items
    const saleProfit = Number(sale.total || 0) - saleCost;
    todayGrossProfit += saleProfit;
  });

  // 3. Today's drawer expenses (Lunch, Transport, etc.)
  let relevantShifts = todayShifts || [];
  if (activeBranch) {
    relevantShifts = relevantShifts.filter(s => s.branch === activeBranch);
  }
  const todayDrawerExpenses = relevantShifts.reduce((sum, s) => {
    const expSum = (s.expenses || []).reduce((eSum, e) => eSum + Number(e.amount || 0), 0);
    return sum + expSum;
  }, 0);

  // 4. Net Profit = Gross Profit - Cashier Expenses
  const todayNetProfit = formatCurrencyAmount(todayGrossProfit - todayDrawerExpenses);

  const todayExpenseList = relevantShifts.flatMap(s => (s.expenses || []).map(e => ({
    category: e.category,
    amount: e.amount,
    notes: e.notes,
    time: e.time,
    cashierName: s.cashierName || s.cashierUsername,
    branch: s.branch
  })));

  return {
    user: sanitizeUser(user),
    metrics: {
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      inventoryValue,
      stockCost,
      revenueToday: formatCurrencyAmount(salesToday.reduce((sum, sale) => sum + Number(sale.total), 0)),
      totalOrdersToday: salesToday.length,
      revenueWeekly: formatCurrencyAmount(
        salesThisWeek.reduce((sum, sale) => sum + Number(sale.total), 0),
      ),
      revenueMonthly: formatCurrencyAmount(
        salesThisMonth.reduce((sum, sale) => sum + Number(sale.total), 0),
      ),
      revenueYearly: formatCurrencyAmount(
        salesThisYear.reduce((sum, sale) => sum + Number(sale.total), 0),
      ),
      totalBalance,
      todayNetProfit,
      todayDrawerExpenses: formatCurrencyAmount(todayDrawerExpenses),
      todayGrossProfit: formatCurrencyAmount(todayGrossProfit),
      todayExpenseList,
      activeUsers: users.length,
    },
    monthlySales: branchMonthlySales,
    branchMonthlySales,
    allBranches,
    lowStockProducts,
    products: products.map((product) => ({
      ...product,
      rackLabel: getRackLabel(product.rack),
    })),
    recentSales,
    recentPurchases,
    recentCustomerReturns,
    recentSupplierReturns,
    recentCustomerSettlements,
    recentSupplierSettlements,
    topProducts: [...productSalesMap.values()]
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, 5),
    todayTopProducts: [...todayProductSalesMap.values()]
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, 10),
    rackSummary: [...rackSummaryMap.values()],
  };
}
module.exports = {
  createSale,
  deleteProduct,
  getOverviewData,
  getProducts,
  getRecentSales,
  getSales,
  getSalesReport,
  getUserById,
  initializeStore,
  loginUser,
  saveProduct,
  getUsers,
  saveUser,
  deleteUser,
  getCompany,
  updateCompany,
};



async function getUsers(reqUser) {
  let allUsers = [];
  if (isDatabaseReady()) {
    allUsers = await User.find().sort({ name: 1 }).lean();
  } else {
    allUsers = memoryStore.users.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (reqUser && reqUser.role === 'admin') {
    allUsers = allUsers.filter(u => String(u.branch || '').toLowerCase() === String(reqUser.branch || '').toLowerCase());
  }

  return allUsers.map((user) => sanitizeUser(user));
}

async function saveUser(payload, reqUser) {
  const userData = {
    name: String(payload.name || '').trim(),
    username: String(payload.username || '').trim().toLowerCase(),
    role: ['super_admin', 'admin', 'cashier'].includes(payload.role) ? payload.role : 'cashier',
    branch: String(payload.branch || 'Main Branch').trim(),
  };

  if (reqUser && reqUser.role === 'admin') {
    userData.role = 'cashier';
    userData.branch = reqUser.branch;
  }

  if (!userData.name || !userData.username) {
    throw createError('Name and username are required.');
  }

  if (payload.password) {
    userData.passwordHash = await bcrypt.hash(payload.password, 10);
  }

  if (isDatabaseReady()) {
    if (payload._id) {
      const user = await User.findByIdAndUpdate(payload._id, userData, {
        new: true,
        runValidators: true,
      }).lean();

      if (!user) {
        throw createError('User not found.', 404);
      }

      memoryStore.users = await User.find().lean();
      return sanitizeUser(user);
    }

    if (!payload.password) {
      throw createError('Password is required for new users.');
    }

    const existing = await User.findOne({ username: userData.username });
    if (existing) {
      throw createError('User with this username already exists.');
    }

    const user = await User.create(userData);
    memoryStore.users = await User.find().lean();
    return sanitizeUser(user);
  }

  if (payload._id) {
    const index = memoryStore.users.findIndex((u) => String(u._id) === String(payload._id));
    if (index < 0) {
      throw createError('User not found.', 404);
    }

    memoryStore.users[index] = {
      ...memoryStore.users[index],
      ...userData,
      updatedAt: new Date().toISOString(),
    };

    return sanitizeUser(memoryStore.users[index]);
  }

  const existing = memoryStore.users.find((u) => u.username === userData.username);
  if (existing) {
    throw createError('User with this username already exists.');
  }

  if (!payload.password) {
    throw createError('Password is required for new users.');
  }

  const newUser = {
    _id: generateId(),
    ...userData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  memoryStore.users.push(newUser);

  return sanitizeUser(newUser);
}

async function deleteUser(userId) {
  if (isDatabaseReady()) {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw createError('User not found.', 404);
    }
    memoryStore.users = await User.find().lean();
    return { success: true };
  }

  const index = memoryStore.users.findIndex((u) => String(u._id) === String(userId));
  if (index < 0) {
    throw createError('User not found.', 404);
  }

  memoryStore.users.splice(index, 1);
  return { success: true };
}

async function getSales(filters = {}) {
  if (isDatabaseReady()) {
    const query = {};
    const now = new Date();

    if (filters.date === 'today') {
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (filters.date === 'this-week') {
      query.createdAt = { $gte: startOfWeek(now) };
    } else if (filters.date === 'this-month') {
      const start = startOfMonth(now);
      query.createdAt = { $gte: start };
    }

    if (filters.cashierId) {
      query['cashier.userId'] = filters.cashierId;
    }
    
    if (filters.customerId) {
      query.customerId = filters.customerId;
    }

    if (filters.query) {
      const q = String(filters.query).trim();
      query.$or = [
        { invoiceNumber: new RegExp(q, 'i') },
        { customerName: new RegExp(q, 'i') }
      ];
    }

    const sales = await Sale.find(query).sort({ createdAt: -1 }).lean();

    const invoiceNos = sales.map(s => s.invoiceNumber);
    const invoices = await CustomerInvoice.find({ invoiceNo: { $in: invoiceNos } }).lean();
    const invoiceMap = new Map(invoices.map(i => [i.invoiceNo, i]));

    return sales.map((sale) => {
      const inv = invoiceMap.get(sale.invoiceNumber);
      return {
        ...sale,
        _id: String(sale._id),
        balanceAmount: inv ? inv.balanceAmount : (sale.paymentMethod === 'credit' ? sale.total : 0),
        status: inv ? inv.status : (sale.paymentMethod === 'credit' ? 'UNPAID' : 'PAID'),
        items: sale.items.map((item) => ({
          ...item,
          productId: String(item.productId),
        })),
      };
    });
  }

  const sales = await getAllSales();

  return sales.filter((sale) => {
    const saleDate = new Date(sale.createdAt);
    const now = new Date();

    if (filters.date === 'today') {
      if (!sameDay(sale.createdAt, now)) return false;
    } else if (filters.date === 'this-week') {
      const weekStart = startOfWeek(now);
      if (new Date(sale.createdAt) < weekStart) return false;
    } else if (filters.date === 'this-month') {
      if (saleDate.getMonth() !== now.getMonth() || saleDate.getFullYear() !== now.getFullYear()) return false;
    }

    if (filters.cashierId && String(sale.cashier?.userId) !== String(filters.cashierId)) {
      return false;
    }

    if (filters.customerId && String(sale.customerId) !== String(filters.customerId)) {
      return false;
    }

    if (filters.query) {
      const q = String(filters.query).toLowerCase();
      const invNo = String(sale.invoiceNumber || '').toLowerCase();
      const custName = String(sale.customerName || '').toLowerCase();
      if (!invNo.includes(q) && !custName.includes(q)) {
        return false;
      }
    }

    return true;
  });
}

async function getCompany() {
  if (isDatabaseReady()) {
    let company = await Company.findOne().lean();
    if (!company) {
      company = await Company.create({
        name: 'Inventory System',
        tagline: 'Excellence in Management',
        loyaltyCardCode: 'NILMA-2026-DISC295',
        invoicePrefix: 'C-INV-',
        nextInvoiceNumber: 1000,
      });
    }
    return { ...company, _id: String(company._id) };
  }

  return memoryStore.company;
}

async function updateCompany(payload) {
  const companyData = {
    name: String(payload.name || 'Inventory System').trim(),
    tagline: String(payload.tagline || 'Excellence in Management').trim(),
    address: String(payload.address || '').trim(),
    phone: String(payload.phone || '').trim(),
    email: String(payload.email || '').trim(),
    watermark: String(payload.watermark || '').trim(),
    loyaltyCardCode: String(payload.loyaltyCardCode || 'NILMA-2026-DISC295').trim(),
    invoicePrefix: String(payload.invoicePrefix || 'C-INV-').trim(),
    nextInvoiceNumber: payload.nextInvoiceNumber ? Number(payload.nextInvoiceNumber) : 1000,
  };

  if (payload.logo) {
    companyData.logo = payload.logo;
  }
  if (isDatabaseReady()) {
    let company = await Company.findOneAndUpdate({}, companyData, {
      new: true,
      upsert: true,
      runValidators: true,
    }).lean();

    return { ...company, _id: String(company._id) };
  }

  memoryStore.company = {
    ...memoryStore.company,
    ...companyData,
  };

  return memoryStore.company;
}

module.exports = {
  createSale,
  deleteProduct,
  getOverviewData,
  getProducts,
  getRecentSales,
  getSales,
  getSalesReport,
  getUserById,
  initializeStore,
  loginUser,
  saveProduct,
  getUsers,
  saveUser,
  deleteUser,
  createReturn,
  getReturns,
  getCompany,
  updateCompany,
  getBranches,
  saveBranch,
  deleteBranch,
  getPurchases,
  createPurchase,
  transferInventory,
  receiveTransfer,
  receiveTripTransfer,
  cancelTransfer,
  updateTransfer,
  getTransfers,
  settleReturn,
  openShift,
  getWorksheets,
  getCurrentShift,
  closeShift,
  addShiftExpense,
  deleteShiftExpense,
};

async function getPurchases(filters = {}) {
  const branchFilter = filters.branch;
  if (isDatabaseReady()) {
    const query = {};
    if (branchFilter) query.branch = branchFilter;
    return await Purchase.find(query)
      .populate('supplier')
      .populate('products.product')
      .sort({ createdAt: -1, date: -1, _id: -1 })
      .lean();
  }

  let list = memoryStore.purchases;
  if (branchFilter) {
    list = list.filter(p => p.branch === branchFilter);
  }

  return list.map(p => {
    const supplier = memoryStore.users.find(u => String(u._id) === String(p.supplier)) || { name: 'Supplier' };
    const resolvedProducts = p.products.map(item => {
      const prod = memoryStore.products.find(pr => String(pr._id) === String(item.product));
      return {
        ...item,
        product: prod,
      };
    });
    return {
      ...p,
      supplier,
      products: resolvedProducts,
    };
  });
}

async function createPurchase(payload) {
  const { supplier, products, total, date, branch } = payload;
  const branchName = branch || 'Main Branch';

  const purchaseData = {
    supplier,
    products: products.map(item => {
      const packQty = Number(item.packQuantity || 1);
      const pcsPerPack = Number(item.piecesPerPack || 1);
      const totalUnits = Number(item.quantity) || (packQty * pcsPerPack);
      const unitCost = Number(item.costPrice);
      const unitSelling = Number(item.sellingPrice || 0);

      return {
        product: item.product,
        batchNumber: item.batchNumber ? String(item.batchNumber).trim() : `BAT-${Date.now().toString().slice(-6)}`,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : new Date(Date.now() + 365*24*60*60*1000),
        manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : undefined,
        packType: item.packType || (pcsPerPack > 1 ? `${pcsPerPack} Pack` : 'Units'),
        piecesPerPack: pcsPerPack,
        packQuantity: packQty,
        quantity: totalUnits,
        costPrice: unitCost,
        sellingPrice: unitSelling,
        costPerPack: Number(item.costPerPack || (unitCost * pcsPerPack)),
        sellingPerPack: Number(item.sellingPerPack || (unitSelling * pcsPerPack)),
      };
    }),
    total: Number(total),
    date: date || new Date(),
    branch: branchName,
    returnDays: Number(payload.returnDays || 0),
  };

  if (isDatabaseReady()) {
    const purchase = new Purchase(purchaseData);
    await purchase.save();

    const updatePromises = purchaseData.products.map(async (item) => {
      // 1. Update BranchStock
      await BranchStock.findOneAndUpdate(
        { branch: branchName, productId: item.product },
        { $inc: { quantityInStock: item.quantity } },
        { upsert: true, new: true }
      );

      // 2. Update Product prices & stock
      const productUpdate = {
        latestPurchaseCost: item.costPrice,
        costPrice: item.costPrice
      };
      if (item.sellingPrice > 0) {
        productUpdate.price = item.sellingPrice;
      }
      await Product.findByIdAndUpdate(item.product, {
        $set: productUpdate,
        $inc: { quantityInStock: item.quantity }
      });

      // 3. Create or update Pharmacy Batch
      await Batch.create({
        product: item.product,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        manufactureDate: item.manufactureDate,
        branch: branchName,
        packType: item.packType,
        piecesPerPack: item.piecesPerPack,
        initialPacks: item.packQuantity,
        initialQuantity: item.quantity,
        availableQuantity: item.quantity,
        costPricePerUnit: item.costPrice,
        sellingPricePerUnit: item.sellingPrice,
        costPricePerPack: item.costPerPack,
        sellingPricePerPack: item.sellingPerPack,
        supplier: supplier,
        purchaseRef: purchase._id,
        status: 'ACTIVE'
      });
    });
    await Promise.all(updatePromises);

    await SupplierInvoice.create({
      invoiceNo: `PUR-${Date.now()}`,
      supplierId: supplier,
      date: date || new Date(),
      totalAmount: total,
      balanceAmount: total,
      status: 'UNPAID',
      branch: branchName,
      returnDays: Number(payload.returnDays || 0)
    });

    return purchase.toObject();
  }

  const newPurchase = {
    _id: generateId(),
    ...purchaseData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  memoryStore.purchases.push(newPurchase);

  products.forEach(item => {
    let bs = memoryStore.branchStocks.find(entry => entry.branch === branchName && String(entry.productId) === String(item.product));
    if (!bs) {
      bs = {
        _id: generateId(),
        branch: branchName,
        productId: String(item.product),
        quantityInStock: 0,
        reorderLevel: 0,
        rack: { rowNumber: 1, columnNumber: 1, shelfNumber: 1 },
        createdAt: new Date().toISOString(),
      };
      memoryStore.branchStocks.push(bs);
    }
    bs.quantityInStock += Number(item.quantity);
    bs.updatedAt = new Date().toISOString();

    const p = memoryStore.products.find(prod => String(prod._id) === String(item.product));
    if (p) {
      p.latestPurchaseCost = Number(item.costPrice);
      p.costPrice = Number(item.costPrice);
    }
  });

  return newPurchase;
}

async function transferInventory({ sourceBranch, destBranch, products, transports = [] }) {
  if (isDatabaseReady()) {
    const updatePromises = products.map(async (item) => {
      // Check stock in source branch first
      const sourceStock = await BranchStock.findOne({ branch: sourceBranch, productId: item.product });
      const currentStock = sourceStock ? sourceStock.quantityInStock : 0;
      if (currentStock < item.quantity) {
        const prod = await Product.findById(item.product).lean();
        const prodName = prod ? prod.name : item.product;
        throw createError(`Insufficient stock in ${sourceBranch} for "${prodName}". Available stock: ${currentStock} pcs, but requested: ${item.quantity} pcs.`);
      }

      // Subtract from source branch immediately (dispatched)
      await BranchStock.findOneAndUpdate(
        { branch: sourceBranch, productId: item.product },
        { $inc: { quantityInStock: -Number(item.quantity) } }
      );

      // If a specific Batch was chosen, deduct from Batch availableQuantity as well!
      if (item.batchId) {
        try {
          const Batch = require('../models/Batch');
          await Batch.findByIdAndUpdate(item.batchId, {
            $inc: { availableQuantity: -Number(item.quantity) }
          });
        } catch (bErr) {
          console.error('Error updating batch quantity during transfer:', bErr);
        }
      }
      // NOTE: Destination branch stock will ONLY be credited when confirmed/received by destination branch
    });

    await Promise.all(updatePromises);

    // Filter valid transports if any
    const validTransports = Array.isArray(transports) 
      ? transports
          .filter(t => t && (t.vehicleNumber || t.driverName || t.dispatchedQty || t.notes))
          .map(t => ({
            ...t,
            status: 'IN_TRANSIT'
          }))
      : [];

    // Save transfer record in IN_TRANSIT status
    const transfer = await Transfer.create({
      sourceBranch,
      destBranch,
      products,
      transports: validTransports,
      status: 'IN_TRANSIT'
    });

    return transfer;
  } else {
    // In-memory version
    products.forEach(item => {
      let sourceBs = memoryStore.branchStocks.find(entry => entry.branch === sourceBranch && String(entry.productId) === String(item.product));
      if (!sourceBs || sourceBs.quantityInStock < item.quantity) {
        throw createError(`Insufficient stock in source branch for product ID ${item.product}.`);
      }
      sourceBs.quantityInStock -= Number(item.quantity);
      sourceBs.updatedAt = new Date().toISOString();
    });

    if (!memoryStore.transfers) memoryStore.transfers = [];
    const validTransports = Array.isArray(transports) 
      ? transports
          .filter(t => t && (t.vehicleNumber || t.driverName || t.dispatchedQty || t.notes))
          .map(t => ({
            ...t,
            status: 'IN_TRANSIT'
          }))
      : [];
    const newTransfer = {
      _id: generateId(),
      sourceBranch,
      destBranch,
      products,
      transports: validTransports,
      status: 'IN_TRANSIT',
      createdAt: new Date().toISOString()
    };
    memoryStore.transfers.push(newTransfer);

    return newTransfer;
  }
}

async function receiveTripTransfer({ transferId, tripIndex, user, decision = 'ACCEPTED', inspectionItems = [], notes = '' }) {
  if (isDatabaseReady()) {
    const transfer = await Transfer.findById(transferId);
    if (!transfer) throw createError('Transfer record not found.', 404);

    // Check authorization: Destination branch admin OR Super Admin when destination is Main Warehouse
    const isAuthorized = (user.branch === transfer.destBranch) || 
                         (user.role === 'super_admin' && (transfer.destBranch === 'Main Warehouse' || user.branch === transfer.destBranch));
    if (!isAuthorized) {
      throw createError(`Only the admin of ${transfer.destBranch} can confirm receipt of this stock.`, 403);
    }

    if (!transfer.transports || !transfer.transports[tripIndex]) {
      throw createError('Trip not found.', 404);
    }

    const trip = transfer.transports[tripIndex];
    if (trip.status === 'RECEIVED' || trip.status === 'REJECTED') {
      throw createError(`This trip has already been processed (${trip.status}).`, 400);
    }

    const isRejected = decision === 'REJECTED';
    let totalAcceptedInTrip = 0;
    let totalRejectedInTrip = 0;

    const hasTripItems = Array.isArray(trip.items) && trip.items.length > 0;
    let addStockPromises = [];

    if (hasTripItems) {
      addStockPromises = trip.items.map(async (tItem, itemIdx) => {
        const itemInspection = (Array.isArray(inspectionItems) ? inspectionItems : []).find(
          ins => String(ins.productId || ins.product) === String(tItem.product) || ins.index === itemIdx
        ) || {};

        // Find matching main transfer product for correct packaging pieces per pack
        const mainProd = (transfer.products || []).find(p => String(p.product) === String(tItem.product));
        const piecesPerPack = Number(mainProd?.piecesPerPack || tItem.piecesPerPack || 1);
        const dispatchedPacks = Number(tItem.packQuantity || (Number(tItem.quantity || 0) / piecesPerPack) || 1);

        if (isRejected) {
          tItem.receivedPackQuantity = 0;
          tItem.damagedPackQuantity = 0;
          tItem.acceptedPackQuantity = 0;
          tItem.acceptedQuantity = 0;
          tItem.rejectedQuantity = Number(tItem.quantity || (dispatchedPacks * piecesPerPack));
          totalRejectedInTrip += tItem.rejectedQuantity;
          return;
        }

        // Custom inspected quantities
        const arrivedPacks = itemInspection.receivedPackQuantity !== undefined
          ? Number(itemInspection.receivedPackQuantity)
          : dispatchedPacks;
        const damagedPacks = itemInspection.damagedPackQuantity !== undefined
          ? Math.max(0, Number(itemInspection.damagedPackQuantity))
          : 0;

        // Accepted packs = arrived - damaged
        const acceptedPacks = Math.max(0, arrivedPacks - damagedPacks);
        const acceptedUnits = acceptedPacks * piecesPerPack;
        const rejectedUnits = Math.max(0, (dispatchedPacks * piecesPerPack) - acceptedUnits);

        tItem.receivedPackQuantity = arrivedPacks;
        tItem.damagedPackQuantity = damagedPacks;
        tItem.acceptedPackQuantity = acceptedPacks;
        tItem.acceptedQuantity = acceptedUnits;
        tItem.rejectedQuantity = rejectedUnits;

        totalAcceptedInTrip += acceptedUnits;
        totalRejectedInTrip += rejectedUnits;

        // Only add strictly ACCEPTED units into Destination Branch Stock
        if (acceptedUnits > 0) {
          await BranchStock.findOneAndUpdate(
            { branch: transfer.destBranch, productId: tItem.product },
            { $inc: { quantityInStock: Number(acceptedUnits) } },
            { upsert: true, new: true }
          );

          // If batch was tracked, create or update batch in destination branch!
          const batchNo = tItem.batchNumber || mainProd?.batchNumber;
          const expDate = tItem.expiryDate || mainProd?.expiryDate;
          if (batchNo) {
            try {
              const Batch = require('../models/Batch');
              let destBatch = await Batch.findOne({
                batchNumber: batchNo,
                product: tItem.product,
                branch: transfer.destBranch
              });

              if (destBatch) {
                destBatch.availableQuantity += Number(acceptedUnits);
                destBatch.status = 'ACTIVE';
                await destBatch.save();
              } else {
                await Batch.create({
                  product: tItem.product,
                  batchNumber: batchNo,
                  expiryDate: expDate,
                  branch: transfer.destBranch,
                  packType: mainProd?.packType || tItem.packType || 'Master Carton',
                  piecesPerPack: piecesPerPack,
                  initialPacks: acceptedPacks,
                  initialQuantity: acceptedUnits,
                  availableQuantity: acceptedUnits,
                  costPricePerUnit: mainProd?.costPricePerUnit || tItem.costPricePerUnit || 0,
                  sellingPricePerUnit: mainProd?.sellingPricePerUnit || tItem.sellingPricePerUnit || 0,
                  status: 'ACTIVE'
                });
              }
            } catch (bDestErr) {
              console.error('Error crediting destination batch:', bDestErr);
            }
          }
        }
      });
    } else {
      // Fallback if trip didn't have discrete items
      const totalTrips = transfer.transports.length;
      const alreadyProcessedTrips = transfer.transports.filter(t => t.status === 'RECEIVED' || t.status === 'REJECTED').length;
      const isLastTrip = (alreadyProcessedTrips + 1) >= totalTrips;

      addStockPromises = transfer.products.map(async (item, itemIdx) => {
        let qtyForThisTrip = Math.floor(item.quantity / totalTrips);
        if (isLastTrip) {
          const alreadyCredited = Math.floor(item.quantity / totalTrips) * alreadyProcessedTrips;
          qtyForThisTrip = item.quantity - alreadyCredited;
        }

        if (isRejected) {
          totalRejectedInTrip += qtyForThisTrip;
          return;
        }

        const itemInspection = (Array.isArray(inspectionItems) ? inspectionItems : [])[itemIdx] || {};
        const arrivedUnits = itemInspection.receivedQuantity !== undefined ? Number(itemInspection.receivedQuantity) : qtyForThisTrip;
        const damagedUnits = itemInspection.damagedQuantity !== undefined ? Number(itemInspection.damagedQuantity) : 0;
        const acceptedUnits = Math.max(0, arrivedUnits - damagedUnits);

        totalAcceptedInTrip += acceptedUnits;
        totalRejectedInTrip += (qtyForThisTrip - acceptedUnits);

        if (acceptedUnits > 0) {
          await BranchStock.findOneAndUpdate(
            { branch: transfer.destBranch, productId: item.product },
            { $inc: { quantityInStock: Number(acceptedUnits) } },
            { upsert: true, new: true }
          );
        }
      });
    }

    await Promise.all(addStockPromises);

    // Mark trip inspection state
    trip.status = isRejected ? 'REJECTED' : 'RECEIVED';
    trip.inspectionDecision = isRejected ? 'REJECTED' : (totalRejectedInTrip > 0 ? 'PARTIAL' : 'ACCEPTED');
    trip.receivedBy = `${user.name || user.username || 'Admin'} (${user.branch || user.role})`;
    trip.receivedAt = new Date();
    trip.receivedNotes = notes || (isRejected ? 'Rejected by destination branch' : 'Inspected & Accepted');

    // Check if ALL trips have been finished
    const allTripsDone = transfer.transports.every(t => t.status === 'RECEIVED' || t.status === 'REJECTED');
    if (allTripsDone) {
      const anyReceived = transfer.transports.some(t => t.status === 'RECEIVED');
      transfer.status = anyReceived ? 'RECEIVED' : 'CANCELLED';
      transfer.receivedBy = trip.receivedBy;
      transfer.receivedAt = new Date();
      transfer.receivedNotes = notes || '';
    }

    await transfer.save();
    return transfer;
  } else {
    // In-memory
    const transfer = (memoryStore.transfers || []).find(t => String(t._id) === String(transferId));
    if (!transfer) throw createError('Transfer not found.', 404);
    if (!transfer.transports || !transfer.transports[tripIndex]) throw createError('Trip not found.', 404);

    // Check authorization: Destination branch admin OR Super Admin when destination is Main Warehouse
    const isAuthorized = (user.branch === transfer.destBranch) || 
                         (user.role === 'super_admin' && (transfer.destBranch === 'Main Warehouse' || user.branch === transfer.destBranch));
    if (!isAuthorized) {
      throw createError(`Only the admin of ${transfer.destBranch} can confirm receipt of this stock.`, 403);
    }

    const trip = transfer.transports[tripIndex];
    if (trip.status === 'RECEIVED') throw createError('Trip already received.', 400);

    const totalTrips = transfer.transports.length;
    const alreadyReceivedTrips = transfer.transports.filter(t => t.status === 'RECEIVED').length;
    const isLastTrip = (alreadyReceivedTrips + 1) >= totalTrips;

    transfer.products.forEach(item => {
      let qtyForThisTrip = Math.floor(item.quantity / totalTrips);
      if (isLastTrip) {
        const alreadyCredited = Math.floor(item.quantity / totalTrips) * alreadyReceivedTrips;
        qtyForThisTrip = item.quantity - alreadyCredited;
      }

      let destBs = memoryStore.branchStocks.find(entry => entry.branch === transfer.destBranch && String(entry.productId) === String(item.product));
      if (!destBs) {
        destBs = {
          _id: generateId(),
          branch: transfer.destBranch,
          productId: String(item.product),
          quantityInStock: 0,
          reorderLevel: 0,
          rack: { rowNumber: 1, columnNumber: 1, shelfNumber: 1 },
          createdAt: new Date().toISOString(),
        };
        memoryStore.branchStocks.push(destBs);
      }
      destBs.quantityInStock += Number(qtyForThisTrip);
      destBs.updatedAt = new Date().toISOString();
    });

    trip.status = 'RECEIVED';
    trip.receivedBy = `${user.name || user.username || 'Admin'} (${user.branch || user.role})`;
    trip.receivedAt = new Date().toISOString();

    if (transfer.transports.every(t => t.status === 'RECEIVED')) {
      transfer.status = 'RECEIVED';
      transfer.receivedBy = trip.receivedBy;
      transfer.receivedAt = new Date().toISOString();
    }

    return transfer;
  }
}

async function receiveTransfer({ transferId, user, notes = '' }) {
  if (isDatabaseReady()) {
    const transfer = await Transfer.findById(transferId);
    if (!transfer) {
      throw createError('Transfer record not found.', 404);
    }

    if (transfer.status === 'RECEIVED') {
      throw createError('This transfer has already been confirmed and received.', 400);
    }

    if (transfer.status === 'CANCELLED') {
      throw createError('Cannot receive a cancelled transfer.', 400);
    }

    // Check authorization: Must be super_admin OR admin of the destination branch
    // Check authorization: Destination branch admin OR Super Admin when destination is Main Warehouse
    const isAuthorized = (user.branch === transfer.destBranch) || 
                         (user.role === 'super_admin' && (transfer.destBranch === 'Main Warehouse' || user.branch === transfer.destBranch));
    if (!isAuthorized) {
      throw createError(`Only the admin of ${transfer.destBranch} can confirm receipt of this stock.`, 403);
    }

    // Now increment the stock in destination branch and create/credit Batches
    const addStockPromises = transfer.products.map(async (item) => {
      await BranchStock.findOneAndUpdate(
        { branch: transfer.destBranch, productId: item.product },
        { $inc: { quantityInStock: Number(item.quantity) } },
        { upsert: true, new: true }
      );

      // Create or increment batch in destination branch
      if (item.batchNumber) {
        try {
          let destBatch = await Batch.findOne({
            batchNumber: item.batchNumber,
            product: item.product,
            branch: transfer.destBranch
          });

          if (destBatch) {
            destBatch.availableQuantity += Number(item.quantity);
            destBatch.status = 'ACTIVE';
            await destBatch.save();
          } else {
            await Batch.create({
              product: item.product,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate || new Date(),
              branch: transfer.destBranch,
              packType: item.packType || 'Packs',
              piecesPerPack: Number(item.piecesPerPack || 1),
              initialPacks: Number(item.packQuantity || 1),
              initialQuantity: Number(item.quantity),
              availableQuantity: Number(item.quantity),
              costPricePerUnit: Number(item.costPricePerUnit || item.costPrice || 0),
              sellingPricePerUnit: Number(item.sellingPricePerUnit || item.sellingPrice || 0),
              status: 'ACTIVE'
            });
          }
        } catch (bErr) {
          console.error('Error creating batch in destination branch on receiveTransfer:', bErr);
        }
      }
    });

    await Promise.all(addStockPromises);

    // Update status to RECEIVED
    transfer.status = 'RECEIVED';
    transfer.receivedBy = `${user.name || user.username || 'Admin'} (${user.branch || user.role})`;
    transfer.receivedAt = new Date();
    if (notes) transfer.receivedNotes = notes;
    await transfer.save();

    return transfer;
  } else {
    // In-memory
    const transfer = (memoryStore.transfers || []).find(t => String(t._id) === String(transferId));
    if (!transfer) throw createError('Transfer not found.', 404);
    if (transfer.status === 'RECEIVED') throw createError('Transfer already received.', 400);

    // Check authorization: Destination branch admin OR Super Admin when destination is Main Warehouse
    const isAuthorized = (user.branch === transfer.destBranch) || 
                         (user.role === 'super_admin' && (transfer.destBranch === 'Main Warehouse' || user.branch === transfer.destBranch));
    if (!isAuthorized) {
      throw createError(`Only the admin of ${transfer.destBranch} can confirm receipt of this stock.`, 403);
    }

    transfer.products.forEach(item => {
      let destBs = memoryStore.branchStocks.find(entry => entry.branch === transfer.destBranch && String(entry.productId) === String(item.product));
      if (!destBs) {
        destBs = {
          _id: generateId(),
          branch: transfer.destBranch,
          productId: String(item.product),
          quantityInStock: 0,
          reorderLevel: 0,
          rack: { rowNumber: 1, columnNumber: 1, shelfNumber: 1 },
          createdAt: new Date().toISOString(),
        };
        memoryStore.branchStocks.push(destBs);
      }
      destBs.quantityInStock += Number(item.quantity);
      destBs.updatedAt = new Date().toISOString();
    });

    transfer.status = 'RECEIVED';
    transfer.receivedBy = `${user.name || user.username || 'Admin'} (${user.branch || user.role})`;
    transfer.receivedAt = new Date().toISOString();
    if (notes) transfer.receivedNotes = notes;

    return transfer;
  }
}

async function cancelTransfer({ transferId, user, reason = '' }) {
  if (isDatabaseReady()) {
    const transfer = await Transfer.findById(transferId);
    if (!transfer) throw createError('Transfer record not found.', 404);

    if (transfer.status === 'RECEIVED') {
      throw createError('Cannot cancel/undo a transfer that has already been fully received by the destination branch.', 400);
    }

    if (transfer.status === 'CANCELLED') {
      throw createError('This transfer is already cancelled.', 400);
    }

    // Check if any trip was already received
    const anyTripReceived = transfer.transports?.some(tr => tr.status === 'RECEIVED');
    if (anyTripReceived) {
      throw createError('Cannot cancel transfer because one or more trips have already been received by destination branch.', 400);
    }

    // Authorization: Super Admin or Source Branch Admin can cancel before delivery
    const isAuthorized = user.role === 'super_admin' || user.branch === transfer.sourceBranch;
    if (!isAuthorized) {
      throw createError('Only Super Admin or Source Branch Admin can cancel this transfer.', 403);
    }

    // Revert/refund the stock back to the SOURCE branch
    const revertPromises = transfer.products.map(async (item) => {
      await BranchStock.findOneAndUpdate(
        { branch: transfer.sourceBranch, productId: item.product },
        { $inc: { quantityInStock: Number(item.quantity) } },
        { upsert: true, new: true }
      );
    });

    await Promise.all(revertPromises);

    transfer.status = 'CANCELLED';
    transfer.receivedNotes = reason ? `Cancelled by ${user.name || user.username}: ${reason}` : `Cancelled by ${user.name || user.username}`;
    await transfer.save();

    return transfer;
  } else {
    // In-memory version
    const transfer = (memoryStore.transfers || []).find(t => String(t._id) === String(transferId));
    if (!transfer) throw createError('Transfer not found.', 404);
    if (transfer.status === 'RECEIVED') throw createError('Cannot cancel already received transfer.', 400);
    if (transfer.status === 'CANCELLED') throw createError('Transfer already cancelled.', 400);

    const anyTripReceived = transfer.transports?.some(tr => tr.status === 'RECEIVED');
    if (anyTripReceived) throw createError('Cannot cancel transfer with received trips.', 400);

    // Revert stock back to source branch
    transfer.products.forEach(item => {
      let sourceBs = memoryStore.branchStocks.find(entry => entry.branch === transfer.sourceBranch && String(entry.productId) === String(item.product));
      if (!sourceBs) {
        sourceBs = {
          _id: generateId(),
          branch: transfer.sourceBranch,
          productId: String(item.product),
          quantityInStock: 0,
          reorderLevel: 0,
          rack: { rowNumber: 1, columnNumber: 1, shelfNumber: 1 },
          createdAt: new Date().toISOString(),
        };
        memoryStore.branchStocks.push(sourceBs);
      }
      sourceBs.quantityInStock += Number(item.quantity);
      sourceBs.updatedAt = new Date().toISOString();
    });

    transfer.status = 'CANCELLED';
    transfer.receivedNotes = reason ? `Cancelled by ${user.name || user.username}: ${reason}` : `Cancelled by ${user.name || user.username}`;
    return transfer;
  }
}

async function updateTransfer({ transferId, user, sourceBranch, destBranch, products, transports }) {
  if (isDatabaseReady()) {
    const transfer = await Transfer.findById(transferId);
    if (!transfer) throw createError('Transfer record not found.', 404);

    if (transfer.status === 'RECEIVED') {
      throw createError('Cannot edit an exchange that has already been fully received by destination branch.', 400);
    }
    if (transfer.status === 'CANCELLED') {
      throw createError('Cannot edit a cancelled exchange.', 400);
    }

    const anyTripReceived = transfer.transports?.some(tr => tr.status === 'RECEIVED');
    if (anyTripReceived) {
      throw createError('Cannot edit exchange because one or more trips have already been received.', 400);
    }

    const isAuthorized = user.role === 'super_admin' || user.branch === transfer.sourceBranch;
    if (!isAuthorized) {
      throw createError('Only Super Admin or Source Branch Admin can edit this exchange.', 403);
    }

    // Step 1: Revert previous stock deduction from the original source branch
    const revertOldPromises = transfer.products.map(async (oldItem) => {
      await BranchStock.findOneAndUpdate(
        { branch: transfer.sourceBranch, productId: oldItem.product },
        { $inc: { quantityInStock: Number(oldItem.quantity) } },
        { upsert: true, new: true }
      );
    });
    await Promise.all(revertOldPromises);

    // Step 2: Validate available stock for the new products in the source branch
    const checkStockPromises = products.map(async (newItem) => {
      const sourceStock = await BranchStock.findOne({ branch: sourceBranch, productId: newItem.product });
      const currentStock = sourceStock ? sourceStock.quantityInStock : 0;
      if (currentStock < newItem.quantity) {
        const prod = await Product.findById(newItem.product).lean();
        const prodName = prod ? prod.name : newItem.product;
        throw createError(`Insufficient stock in ${sourceBranch} for "${prodName}". Available stock: ${currentStock} pcs, requested: ${newItem.quantity} pcs.`);
      }
    });

    try {
      await Promise.all(checkStockPromises);
    } catch (err) {
      // If validation fails, re-deduct the original items so stock stays consistent!
      const reDeductPromises = transfer.products.map(async (oldItem) => {
        await BranchStock.findOneAndUpdate(
          { branch: transfer.sourceBranch, productId: oldItem.product },
          { $inc: { quantityInStock: -Number(oldItem.quantity) } }
        );
      });
      await Promise.all(reDeductPromises);
      throw err;
    }

    // Step 3: Deduct the new stock quantities from the source branch
    const deductNewPromises = products.map(async (newItem) => {
      await BranchStock.findOneAndUpdate(
        { branch: sourceBranch, productId: newItem.product },
        { $inc: { quantityInStock: -Number(newItem.quantity) } }
      );
    });
    await Promise.all(deductNewPromises);

    // Step 4: Update the transfer document
    const validTransports = Array.isArray(transports) 
      ? transports
          .filter(t => t && (t.vehicleNumber || t.driverName || t.dispatchedQty || t.notes || (t.items && t.items.length > 0)))
          .map(t => ({
            ...t,
            status: 'IN_TRANSIT'
          }))
      : [];

    transfer.sourceBranch = sourceBranch;
    transfer.destBranch = destBranch;
    transfer.products = products;
    transfer.transports = validTransports;
    transfer.status = 'IN_TRANSIT';
    await transfer.save();

    return transfer;
  } else {
    // In-memory
    const transfer = (memoryStore.transfers || []).find(t => String(t._id) === String(transferId));
    if (!transfer) throw createError('Transfer not found.', 404);
    if (transfer.status === 'RECEIVED' || transfer.status === 'CANCELLED') {
      throw createError('Cannot edit received or cancelled transfer.', 400);
    }

    // Revert old
    transfer.products.forEach(oldItem => {
      let sourceBs = memoryStore.branchStocks.find(entry => entry.branch === transfer.sourceBranch && String(entry.productId) === String(oldItem.product));
      if (sourceBs) sourceBs.quantityInStock += Number(oldItem.quantity);
    });

    // Deduct new
    products.forEach(newItem => {
      let sourceBs = memoryStore.branchStocks.find(entry => entry.branch === sourceBranch && String(entry.productId) === String(newItem.product));
      if (!sourceBs || sourceBs.quantityInStock < newItem.quantity) {
        throw createError(`Insufficient stock in ${sourceBranch} for product ${newItem.product}`);
      }
      sourceBs.quantityInStock -= Number(newItem.quantity);
    });

    transfer.sourceBranch = sourceBranch;
    transfer.destBranch = destBranch;
    transfer.products = products;
    transfer.transports = transports;
    return transfer;
  }
}

async function getTransfers(filters = {}) {
  if (isDatabaseReady()) {
    const query = {};
    if (filters.branch) {
      // Return transfers where branch is either source or destination
      query.$or = [{ sourceBranch: filters.branch }, { destBranch: filters.branch }];
    }
    const transfers = await Transfer.find(query).populate('products.product', 'name sku image').sort({ createdAt: -1 }).lean();
    return transfers;
  }
  let list = memoryStore.transfers || [];
  if (filters.branch) {
    list = list.filter(t => t.sourceBranch === filters.branch || t.destBranch === filters.branch);
  }
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getBranches() {
  if (isDatabaseReady()) {
    return await Branch.find().sort({ name: 1 }).lean();
  }
  return memoryStore.branches;
}

async function saveBranch(payload) {
  const branchData = {
    name: String(payload.name || '').trim(),
    location: String(payload.location || '').trim(),
    phone: String(payload.phone || '').trim(),
    email: String(payload.email || '').trim(),
    manager: String(payload.manager || '').trim(),
    status: ['active', 'inactive'].includes(payload.status) ? payload.status : 'active',
  };

  if (!branchData.name) {
    throw createError('Branch name is required.');
  }

  if (isDatabaseReady()) {
    if (payload._id) {
      const original = await Branch.findById(payload._id).lean();
      if (!original) throw createError('Branch not found.', 404);

      const updated = await Branch.findByIdAndUpdate(payload._id, branchData, { new: true }).lean();

      if (original.name !== branchData.name) {
        await Promise.all([
          BranchStock.updateMany({ branch: original.name }, { branch: branchData.name }),
          User.updateMany({ branch: original.name }, { branch: branchData.name }),
          Sale.updateMany({ branch: original.name }, { branch: branchData.name }),
          Purchase.updateMany({ branch: original.name }, { branch: branchData.name }),
          Return.updateMany({ branch: original.name }, { branch: branchData.name }),
        ]);
      }

      if (original.manager !== branchData.manager) {
        if (original.manager) {
          await User.updateMany({ name: original.manager }, { branch: 'Unassigned' });
        }
      }
      if (branchData.manager) {
        await User.updateMany({ name: branchData.manager }, { branch: branchData.name });
      }

      return updated;
    }

    const existing = await Branch.findOne({ name: branchData.name });
    if (existing) {
      throw createError('Branch with this name already exists.');
    }

    const branch = await Branch.create(branchData);

    if (branchData.manager) {
      await User.updateMany({ name: branchData.manager }, { branch: branchData.name });
    }

    const products = await Product.find().lean();
    const branchStocks = products.map(p => ({
      branch: branchData.name,
      productId: p._id,
      quantityInStock: 0,
      reorderLevel: p.reorderLevel,
      rack: p.rack,
    }));
    if (branchStocks.length > 0) {
      await BranchStock.insertMany(branchStocks);
    }

    return branch.toObject();
  }

  if (payload._id) {
    const index = memoryStore.branches.findIndex((b) => String(b._id) === String(payload._id));
    if (index < 0) throw createError('Branch not found.', 404);

    const oldName = memoryStore.branches[index].name;
    const oldManager = memoryStore.branches[index].manager;
    memoryStore.branches[index] = {
      ...memoryStore.branches[index],
      ...branchData,
      updatedAt: new Date().toISOString(),
    };

    if (oldName !== branchData.name) {
      memoryStore.branchStocks.forEach(bs => { if (bs.branch === oldName) bs.branch = branchData.name; });
      memoryStore.users.forEach(u => { if (u.branch === oldName) u.branch = branchData.name; });
      memoryStore.sales.forEach(s => { if (s.branch === oldName) s.branch = branchData.name; });
      memoryStore.returns.forEach(r => { if (r.branch === oldName) r.branch = branchData.name; });
    }

    if (oldManager !== branchData.manager) {
      if (oldManager) {
        memoryStore.users.forEach(u => { if (u.name === oldManager) u.branch = 'Unassigned'; });
      }
      if (branchData.manager) {
        memoryStore.users.forEach(u => { if (u.name === branchData.manager) u.branch = branchData.name; });
      }
    }

    return memoryStore.branches[index];
  }

  const existing = memoryStore.branches.find(b => b.name === branchData.name);
  if (existing) throw createError('Branch with this name already exists.');

  const newBranch = {
    _id: generateId(),
    ...branchData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  memoryStore.branches.push(newBranch);

  if (branchData.manager) {
    memoryStore.users.forEach(u => { if (u.name === branchData.manager) u.branch = branchData.name; });
  }

  memoryStore.products.forEach(p => {
    memoryStore.branchStocks.push({
      _id: generateId(),
      branch: newBranch.name,
      productId: String(p._id),
      quantityInStock: 0,
      reorderLevel: Number(p.reorderLevel),
      rack: p.rack,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  return newBranch;
}

async function deleteBranch(branchId) {
  if (isDatabaseReady()) {
    const branch = await Branch.findById(branchId).lean();
    if (!branch) throw createError('Branch not found.', 404);

    await Branch.findByIdAndDelete(branchId);
    await BranchStock.deleteMany({ branch: branch.name });
    return { success: true };
  }

  const index = memoryStore.branches.findIndex(b => String(b._id) === String(branchId));
  if (index < 0) throw createError('Branch not found.', 404);

  const branchName = memoryStore.branches[index].name;
  memoryStore.branches.splice(index, 1);
  memoryStore.branchStocks = memoryStore.branchStocks.filter(bs => bs.branch !== branchName);

  return { success: true };
}

// ==========================================
// SHIFT & WORKSHEET MANAGEMENT
// ==========================================

async function getCurrentShift(cashierId) {
  const today = new Date().toISOString().split('T')[0];

  if (!isDatabaseReady()) {
    const shift = memoryStore.shifts?.find(s => String(s.cashierId) === String(cashierId) && s.status === 'open');
    if (shift && shift.date !== today) {
      await closeShift(cashierId);
      return null;
    }
    return shift || null;
  }

  const shift = await Shift.findOne({ cashierId, status: 'open' }).lean();
  if (shift && shift.date !== today) {
    await closeShift(cashierId);
    return null;
  }
  return shift || null;
}

async function openShift(cashierId, branchName, startTime = null) {
  const shiftDate = startTime ? new Date(startTime) : new Date();
  const today = shiftDate.toISOString().split('T')[0];

  if (!isDatabaseReady()) {
    if (!memoryStore.shifts) memoryStore.shifts = [];
    const existing = memoryStore.shifts.find(s => String(s.cashierId) === String(cashierId) && s.status === 'open');
    if (existing) {
      if (existing.date === today) {
        throw createError('You already have an active shift.', 400);
      } else {
        existing.status = 'closed';
        existing.endTime = shiftDate;
      }
    }

    const shift = {
      _id: generateId(),
      cashierId,
      cashierName: 'Demo Cashier',
      cashierUsername: 'cashier',
      branch: branchName || 'Main Branch',
      date: today,
      startTime: shiftDate,
      status: 'open',
      totals: { cash: 0, card: 0, credit: 0, total: 0 },
      salesCount: 0
    };
    memoryStore.shifts.push(shift);
    return shift;
  }
  
  const cashier = await User.findById(cashierId).lean();
  if (!cashier) throw createError('Cashier not found.', 404);

  const existingShift = await Shift.findOne({ cashierId, status: 'open' });
  if (existingShift) {
    if (existingShift.date === today) {
      throw createError('You already have an active shift.', 400);
    } else {
      existingShift.status = 'closed';
      existingShift.endTime = shiftDate;
      await existingShift.save();
    }
  }

  const shift = await Shift.create({
    cashierId: cashier._id,
    cashierName: cashier.name,
    cashierUsername: cashier.username,
    branch: branchName || 'Main Branch',
    date: today,
    startTime: shiftDate
  });

  return shift.toObject();
}

async function closeShift(cashierId, endTime = null) {
  const finalEndTime = endTime ? new Date(endTime) : new Date();

  if (!isDatabaseReady()) {
    const shift = memoryStore.shifts?.find(s => String(s.cashierId) === String(cashierId) && s.status === 'open');
    if (!shift) throw createError('No open shift found for this cashier.', 400);
    shift.status = 'closed';
    shift.endTime = finalEndTime;
    return shift;
  }
  
  const cashier = await User.findById(cashierId).lean();
  if (!cashier) throw createError('Cashier not found.', 404);

  // Find an open shift
  const shift = await Shift.findOne({ cashierId, status: 'open' });
  if (!shift) {
    throw createError('No open shift found for this cashier.', 400);
  }

  // Calculate totals from sales during this shift (up to finalEndTime just in case, though usually all sales till now)
  const sales = await Sale.find({
    'cashier.userId': cashierId,
    createdAt: { $gte: shift.startTime, $lte: finalEndTime }
  }).lean();

  let cashTotal = 0;
  let cardTotal = 0;
  let creditTotal = 0;
  let totalSales = 0;

  sales.forEach(sale => {
    totalSales += sale.total;
    if (sale.paymentMethod === 'split' && sale.splitPayments) {
      sale.splitPayments.forEach(p => {
        if (p.method === 'cash') cashTotal += p.amount;
        if (p.method === 'card') cardTotal += p.amount;
        if (p.method === 'credit') creditTotal += p.amount;
      });
    } else {
      if (sale.paymentMethod === 'cash') cashTotal += sale.total;
      if (sale.paymentMethod === 'card') cardTotal += sale.total;
      if (sale.paymentMethod === 'credit') creditTotal += sale.total;
    }
  });

  const cashOutTotal = (shift.expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netCash = Math.max(0, cashTotal - cashOutTotal);

  shift.totals = {
    cash: formatCurrencyAmount(cashTotal),
    card: formatCurrencyAmount(cardTotal),
    credit: formatCurrencyAmount(creditTotal),
    total: formatCurrencyAmount(totalSales),
    cashOutTotal: formatCurrencyAmount(cashOutTotal),
    netCash: formatCurrencyAmount(netCash)
  };
  shift.salesCount = sales.length;
  shift.endTime = finalEndTime;
  shift.status = 'closed';

  await shift.save();

  return shift.toObject();
}

async function addShiftExpense(cashierId, { category, amount, notes }) {
  if (!category || !amount || Number(amount) <= 0) {
    throw createError('Category and a valid positive amount are required.', 400);
  }

  const shift = await Shift.findOne({ cashierId, status: 'open' });
  if (!shift) {
    throw createError('No active open shift found for this cashier.', 400);
  }

  const expenseItem = {
    category: String(category).trim(),
    amount: Number(amount),
    notes: String(notes || '').trim(),
    time: new Date()
  };

  shift.expenses = shift.expenses || [];
  shift.expenses.push(expenseItem);

  const cashOutTotal = shift.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  if (!shift.totals) shift.totals = {};
  shift.totals.cashOutTotal = cashOutTotal;
  shift.totals.netCash = Math.max(0, (shift.totals.cash || 0) - cashOutTotal);

  await shift.save();
  return shift.toObject();
}

async function deleteShiftExpense(cashierId, expenseId) {
  const shift = await Shift.findOne({ cashierId, status: 'open' });
  if (!shift) {
    throw createError('No active open shift found for this cashier.', 400);
  }

  shift.expenses = (shift.expenses || []).filter(e => String(e._id) !== String(expenseId));
  const cashOutTotal = shift.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  if (!shift.totals) shift.totals = {};
  shift.totals.cashOutTotal = cashOutTotal;
  shift.totals.netCash = Math.max(0, (shift.totals.cash || 0) - cashOutTotal);

  await shift.save();
  return shift.toObject();
}

async function getWorksheets(filters = {}) {
  if (!isDatabaseReady()) return [];
  
  const query = { status: 'closed' };
  if (filters.cashierId) query.cashierId = filters.cashierId;
  if (filters.date) query.date = filters.date;
  if (filters.branch) query.branch = filters.branch;

  return Shift.find(query).sort({ endTime: -1 }).populate('cashierId', 'name username').lean();
}
