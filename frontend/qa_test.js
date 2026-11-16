const axios = require('axios');
const API_URL = 'https://inventory.newtrstores.com/api';

async function runTests() {
  console.log("=========================================");
  console.log("    STARTING LIVE QA AUTOMATION SCRIPT   ");
  console.log("=========================================\n");
  
  // 1. Logins
  let cashierToken, adminToken, superToken, cashierUser;
  try {
     console.log("[1] Authenticating Users...");
     const resCashier = await axios.post(`${API_URL}/auth/login`, { username: 'cashier1', password: 'cashier1_123' });
     cashierToken = resCashier.data.token;
     cashierUser = resCashier.data.user;
     console.log("    ✅ Cashier login: SUCCESS");
     
     const resAdmin = await axios.post(`${API_URL}/auth/login`, { username: 'admin1', password: 'admin1_123' });
     adminToken = resAdmin.data.token;
     console.log("    ✅ Admin login: SUCCESS");

     const resSuper = await axios.post(`${API_URL}/auth/login`, { username: 'superadmin', password: 'superadmin123' });
     superToken = resSuper.data.token;
     console.log("    ✅ Super Admin login: SUCCESS\n");
  } catch (e) {
     console.error("    ❌ Login failed:", e.message);
     return;
  }

  // Helper for requests
  const req = async (method, url, token, data) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios({ method, url: `${API_URL}${url}`, headers, data });
      return { status: res.status, data: res.data };
    } catch (err) {
      return { error: true, status: err.response?.status, message: err.response?.data?.message || err.message };
    }
  };

  console.log("[2] Running Billing Flow (Cashier)...");
  // Test 1: Cashier creates a Sale (Expected: SUCCESS)
  const prodRes = await req('get', '/products', cashierToken);
  let productId;
  if (prodRes.data?.products?.length > 0) {
    productId = prodRes.data.products[0]._id;
    console.log(`    ℹ️ Found product to sell: ${prodRes.data.products[0].name}`);
    
    const saleRes = await req('post', '/sales', cashierToken, {
      items: [{ productId, quantity: 1 }],
      paymentMethod: 'cash',
      discount: 0,
      cashier: cashierUser
    });
    if (saleRes.error) {
        console.log(`    ❌ Cashier Sale Creation: FAILED (${saleRes.status} - ${saleRes.message})`);
    } else {
        console.log("    ✅ Cashier Sale Creation: SUCCESS (Billing works correctly)\n");
    }
  } else {
    console.log("    ⚠️ No products found to test billing.\n");
  }

  console.log("[3] Running Security & Role Testing...");

  // Test 2: Cashier accessing Supplier Routes (BUG: Should be blocked)
  const suppRes = await req('post', '/suppliers', cashierToken, {
    name: 'QA Test Supplier (To Delete)', email: 'qa@test.com', phone: '123'
  });
  if (!suppRes.error) {
    console.log("    🚨 VULNERABILITY FOUND: Cashier can create Suppliers (Expected: BLOCKED 403, Actual: SUCCESS)");
    // cleanup
    await req('delete', `/suppliers/${suppRes.data._id}`, cashierToken);
  } else {
    console.log(`    ✅ Cashier create supplier: BLOCKED (${suppRes.status})`);
  }

  // Test 3: Unauthenticated access to Supplier Routes (BUG: Should be blocked)
  const suppGetRes = await req('get', '/suppliers', null);
  if (!suppGetRes.error) {
    console.log("    🚨 VULNERABILITY FOUND: Unauthenticated user can fetch Suppliers (Expected: BLOCKED 401, Actual: SUCCESS)");
  } else {
    console.log(`    ✅ Unauthenticated fetch supplier: BLOCKED (${suppGetRes.status})`);
  }

  // Test 4: Super Admin editing Company Profile (BUG: blocked, admin only)
  const compRes = await req('post', '/company', superToken, { name: 'QA Company Name' });
  if (compRes.error && compRes.status === 403) {
    console.log("    🚨 VULNERABILITY FOUND: Super Admin blocked from editing company profile (Expected: SUCCESS, Actual: BLOCKED 403)");
  } else {
    console.log("    ✅ Super Admin edit company: SUCCESS");
  }

  // Test 5: Cashier deleting a customer (BUG: open)
  const custRes = await req('post', '/customers', adminToken, { name: 'QA Delete Me', phone: '0000000' });
  if (!custRes.error) {
     const delRes = await req('delete', `/customers/${custRes.data._id}`, cashierToken);
     if (!delRes.error) {
       console.log("    🚨 VULNERABILITY FOUND: Cashier can delete Customers (Expected: BLOCKED 403, Actual: SUCCESS)");
     } else {
       console.log(`    ✅ Cashier delete customer: BLOCKED (${delRes.status})`);
     }
  }

  console.log("\n=========================================");
  console.log("    QA AUTOMATION SCRIPT COMPLETE        ");
  console.log("=========================================\n");
}

runTests();
