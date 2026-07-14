const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

const jsonRequest = (path, method, body) => makeRequest({
  hostname: 'localhost',
  port: 3000,
  path,
  method,
  headers: { 'Content-Type': 'application/json' }
}, body);

async function runTest() {
  console.log('=== STARTING GO-ZOON END-TO-END API TEST ===\n');

  // [Step 0] Pull the live restaurant catalog so this test tracks real menu data
  // instead of hardcoding a fake restaurant/item that the server would now reject.
  console.log('[Step 0] Fetching live restaurant catalog...');
  const catalogRes = await jsonRequest('/api/restaurants', 'GET');
  const restaurant = catalogRes.body?.restaurants?.[0];
  const menuItem = restaurant?.menu?.[0];
  if (!restaurant || !menuItem) {
    throw new Error('❌ Fail! No restaurants/menu items available from /api/restaurants to test against.');
  }
  console.log(`Using restaurant "${restaurant.name}" (${restaurant.id}), item "${menuItem.name}" (£${menuItem.price})\n`);

  // Unmatched postcode format => server-side deliveryMultiplier defaults to 1, so the
  // expected total is easy to compute here without duplicating UK_POSTCODES data.
  const deliveryPostcode = 'NOTAPOSTCODE';
  const quantity = 2;
  const subtotal = Math.round(menuItem.price * quantity * 100) / 100;
  const deliveryFee = restaurant.offersFreeDelivery ? 0 : Math.round(restaurant.deliveryFee * 100) / 100;
  const serviceFee = Math.max(0.99, Math.round(subtotal * 0.05 * 100) / 100);
  const expectedTotal = Math.round((subtotal + deliveryFee + serviceFee) * 100) / 100;

  const basketItems = [{
    id: `${menuItem.id}-test`,
    menuItem,
    quantity,
    customizations: []
  }];

  const customerA = 'e2e-customer-a-' + Math.random().toString(36).slice(2, 8);
  const customerB = 'e2e-customer-b-' + Math.random().toString(36).slice(2, 8);

  // [Step 1] Reject a tampered/incorrect total.
  console.log('[Step 1] Submitting a basket with a deliberately wrong total (price tampering)...');
  const tamperedRes = await jsonRequest('/api/orders', 'POST', {
    customerId: customerA,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    items: basketItems,
    total: 0.01,
    deliveryPostcode
  });
  if (tamperedRes.status === 400) {
    console.log('✅ Success! Server rejected a tampered total with 400.\n');
  } else {
    throw new Error(`❌ Fail! Expected 400 for tampered total, got ${tamperedRes.status}: ${JSON.stringify(tamperedRes.body)}`);
  }

  // [Step 2] Reject a basket referencing a menu item that doesn't exist on the restaurant.
  console.log('[Step 2] Submitting a basket with a non-existent menu item...');
  const unknownItemRes = await jsonRequest('/api/orders', 'POST', {
    customerId: customerA,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    items: [{ id: 'fake', menuItem: { id: 'does-not-exist', name: 'Fake Item', price: 1 }, quantity: 1, customizations: [] }],
    total: 1,
    deliveryPostcode
  });
  if (unknownItemRes.status === 400) {
    console.log('✅ Success! Server rejected an unknown menu item with 400.\n');
  } else {
    throw new Error(`❌ Fail! Expected 400 for unknown item, got ${unknownItemRes.status}: ${JSON.stringify(unknownItemRes.body)}`);
  }

  // [Step 3] Create a legitimate order for customer A.
  console.log('[Step 3] Creating a valid order for customer A...');
  const createRes = await jsonRequest('/api/orders', 'POST', {
    customerId: customerA,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    restaurantAddress: restaurant.address,
    items: basketItems,
    total: expectedTotal,
    deliveryAddress: '10 Downing Street, Westminster',
    deliveryPostcode
  });
  if (!createRes.body?.success || !createRes.body?.order?.id) {
    throw new Error(`❌ Fail! Order creation did not succeed: ${JSON.stringify(createRes.body)}`);
  }
  const orderId = createRes.body.order.id;
  if (Math.abs(createRes.body.order.total - expectedTotal) > 0.02) {
    throw new Error(`❌ Fail! Server-stored total ${createRes.body.order.total} doesn't match expected ${expectedTotal}.`);
  }
  console.log(`✅ Success! Order #${orderId} created with server-computed total £${createRes.body.order.total}.\n`);

  // [Step 4] A second order for customer B, to test per-customer scoping below.
  console.log('[Step 4] Creating a second order for a different customer (B)...');
  const createRes2 = await jsonRequest('/api/orders', 'POST', {
    customerId: customerB,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    restaurantAddress: restaurant.address,
    items: basketItems,
    total: expectedTotal,
    deliveryAddress: 'Flat 2, Baker Street, London',
    deliveryPostcode
  });
  const orderIdB = createRes2.body?.order?.id;
  if (!orderIdB) {
    throw new Error(`❌ Fail! Second order creation did not succeed: ${JSON.stringify(createRes2.body)}`);
  }
  console.log(`✅ Success! Order #${orderIdB} created for customer B.\n`);

  // [Step 5] Customer-scoped fetch: customer A must see their own order and not customer B's.
  console.log('[Step 5] Verifying GET /api/orders?customerId= only returns that customer\'s orders...');
  const scopedRes = await jsonRequest(`/api/orders?customerId=${encodeURIComponent(customerA)}`, 'GET');
  const scopedIds = (scopedRes.body?.orders || []).map(o => o.id);
  if (scopedIds.includes(orderId) && !scopedIds.includes(orderIdB)) {
    console.log('✅ Success! Customer A\'s scoped order list contains their own order and not customer B\'s.\n');
  } else {
    throw new Error(`❌ Fail! Customer scoping broken. Scoped ids: ${JSON.stringify(scopedIds)}`);
  }

  // [Step 6] Order status lifecycle: Placed -> Preparing -> OutForDelivery -> Delivered.
  console.log('[Step 6] Walking order #' + orderId + ' through its status lifecycle...');
  const patch1 = await jsonRequest(`/api/orders/${orderId}`, 'PATCH', { status: 'Preparing' });
  if (patch1.body?.order?.status !== 'Preparing') {
    throw new Error('❌ Fail! Could not transition status to "Preparing".');
  }
  const patch2 = await jsonRequest(`/api/orders/${orderId}`, 'PATCH', { status: 'OutForDelivery', driverName: 'Dave Henderson', driverPhone: '+44 7700 900222' });
  if (patch2.body?.order?.status !== 'OutForDelivery' || patch2.body?.order?.driverName !== 'Dave Henderson') {
    throw new Error('❌ Fail! Could not transition status to "OutForDelivery" with rider info.');
  }
  const patch3 = await jsonRequest(`/api/orders/${orderId}`, 'PATCH', { status: 'Delivered' });
  if (patch3.body?.order?.status !== 'Delivered') {
    throw new Error('❌ Fail! Could not transition status to "Delivered".');
  }
  console.log('✅ Success! Order lifecycle Placed -> Preparing -> OutForDelivery -> Delivered all verified.\n');

  // [Step 7] Cancellation path for the still-open second order.
  console.log('[Step 7] Cancelling order #' + orderIdB + ' (customer-initiated cancellation)...');
  const cancelRes = await jsonRequest(`/api/orders/${orderIdB}`, 'PATCH', { status: 'Cancelled' });
  if (cancelRes.body?.order?.status !== 'Cancelled') {
    throw new Error('❌ Fail! Could not cancel order.');
  }
  console.log('✅ Success! Order cancellation verified.\n');

  // [Step 8] Destructive bulk-delete must be refused when NODE_ENV=production.
  console.log('[Step 8] Checking DELETE /api/orders production gating...');
  const deleteRes = await jsonRequest('/api/orders', 'DELETE');
  if (process.env.NODE_ENV === 'production') {
    if (deleteRes.status === 403) {
      console.log('✅ Success! Bulk delete correctly refused (403) in production.\n');
    } else {
      throw new Error(`❌ Fail! Expected 403 in production, got ${deleteRes.status}.`);
    }
  } else {
    console.log(`ℹ️  NODE_ENV is not "production" here (dev/sandbox), so bulk delete is allowed by design. Response: ${deleteRes.status}\n`);
  }

  console.log('=== END-TO-END TEST COMPLETED SUCCESSFULLY ===');
}

runTest().catch(err => {
  console.error('\n❌ TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
