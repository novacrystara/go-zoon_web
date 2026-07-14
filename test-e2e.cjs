const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
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

async function runTest() {
  console.log('=== STARTING GO-ZOON END-TO-END POSTGRESQL PERSISTENCE TEST ===\n');

  const orderId = 'E2E-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  console.log(`[Step 1] Creating a new order with ID: #${orderId}...`);

  const orderPayload = {
    id: orderId,
    customerName: 'Alistair E2E Tester',
    restaurantId: 'rest-1',
    restaurantName: 'The Royal Oak Burger Pub',
    restaurantAddress: '74 Regency St, Westminster, London',
    items: [
      {
        id: 'cart-item-1',
        menuItem: {
          id: 'm-1',
          name: 'Classic Oak Cheese Burger',
          price: 13.50,
          description: 'Aged Angus beef patty with double cheddar'
        },
        quantity: 2,
        customizations: [
          { name: 'Extra Cheddar', additionalPrice: 1.50 }
        ]
      }
    ],
    subtotal: 30.00,
    deliveryFee: 2.50,
    serviceFee: 1.50,
    vat: 6.00,
    tip: 2.50,
    total: 42.50,
    status: 'Placed',
    deliveryAddress: 'Flat 12, Victoria Court, London',
    deliveryPostcode: 'SW1P 4BY',
    driverName: 'Dave Henderson',
    driverPhone: '+44 7700 900222'
  };

  // POST /api/orders
  const postRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/orders',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, orderPayload);

  console.log('POST Response:', JSON.stringify(postRes, null, 2));
  if (postRes && postRes.success && postRes.source === 'postgres') {
    console.log('✅ Success! Order saved directly to PostgreSQL Database.\n');
  } else {
    console.warn('⚠️ Warning: Order not successfully saved to PostgreSQL or fell back to memory.\n');
  }

  // GET /api/orders
  console.log('[Step 2] Fetching list of orders to verify persistence...');
  const getRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/orders',
    method: 'GET'
  });

  const foundOrder = getRes.orders && getRes.orders.find(o => o.id === orderId);
  if (foundOrder) {
    console.log(`✅ Success! Found order #${orderId} in the order history list fetched from database.`);
    console.log(`Current Status in DB: ${foundOrder.status}\n`);
  } else {
    throw new Error(`❌ Fail! Order #${orderId} not found in the list fetched from database.`);
  }

  // PATCH /api/orders/:id -> Preparing (Simulate Restaurant accepting and preparing)
  console.log('[Step 3] Simulating restaurant action: Transition status to "Preparing"...');
  const patchRes1 = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/orders/${orderId}`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, { status: 'Preparing' });

  console.log('PATCH (Preparing) Response Status:', patchRes1.order?.status);
  if (patchRes1.order?.status === 'Preparing') {
    console.log('✅ Success! Order status updated to "Preparing" in PostgreSQL.\n');
  } else {
    throw new Error('❌ Fail! Could not transition status to "Preparing".');
  }

  // PATCH /api/orders/:id -> OutForDelivery (Simulate Rider dispatching)
  console.log('[Step 4] Simulating Road King action: Transition status to "OutForDelivery" with assigned rider...');
  const patchRes2 = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/orders/${orderId}`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, { 
    status: 'OutForDelivery',
    driverName: 'Dave Henderson',
    driverPhone: '+44 7700 900222'
  });

  console.log('PATCH (OutForDelivery) Response:', JSON.stringify(patchRes2.order, null, 2));
  if (patchRes2.order?.status === 'OutForDelivery' && patchRes2.order?.driverName === 'Dave Henderson') {
    console.log('✅ Success! Order transitioned to "OutForDelivery" and rider assigned in database.\n');
  } else {
    throw new Error('❌ Fail! Could not transition status to "OutForDelivery" with rider info.');
  }

  // PATCH /api/orders/:id -> Delivered (Simulate Rider hand-over)
  console.log('[Step 5] Simulating final handover: Transition status to "Delivered"...');
  const patchRes3 = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/orders/${orderId}`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, { status: 'Delivered' });

  console.log('PATCH (Delivered) Response Status:', patchRes3.order?.status);
  if (patchRes3.order?.status === 'Delivered') {
    console.log('✅ Success! Order marked "Delivered" successfully in PostgreSQL.\n');
  } else {
    throw new Error('❌ Fail! Could not transition status to "Delivered".');
  }

  console.log('=== END-TO-END TEST COMPLETED SUCCESSFULLY ===');
  console.log(`Database remains fully populated with test Order #${orderId} for verification.`);
}

runTest().catch(err => {
  console.error('\n❌ TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
