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

const jsonRequest = (path, method, body, token) => makeRequest({
  hostname: 'localhost',
  port: 3000,
  path,
  method,
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}, body);

async function login(phone) {
  const otpRes = await jsonRequest('/api/auth/request-otp', 'POST', { phone });
  if (!otpRes.body?.success) {
    throw new Error(`❌ Fail! Could not request OTP for ${phone}: ${JSON.stringify(otpRes.body)}`);
  }
  const verifyRes = await jsonRequest('/api/auth/verify-otp', 'POST', { phone, otp: otpRes.body.demoOtp });
  if (!verifyRes.body?.success || !verifyRes.body?.sessionToken) {
    throw new Error(`❌ Fail! Could not verify OTP for ${phone}: ${JSON.stringify(verifyRes.body)}`);
  }
  return verifyRes.body; // { customerId, phone, sessionToken }
}

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

  // [Step 0.5] Demo phone+OTP login for two demo accounts.
  console.log('[Step 0.5] Logging in with demo phone numbers...');
  const customerA = await login('+44 7700 900000');
  const customerB = await login('+44 7700 900001');
  console.log(`✅ Success! Logged in as ${customerA.phone} (${customerA.customerId}) and ${customerB.phone} (${customerB.customerId}).\n`);

  // [Step 0.6] A non-demo number must be rejected.
  const badLoginRes = await jsonRequest('/api/auth/request-otp', 'POST', { phone: '+44 7700 555555' });
  if (badLoginRes.status !== 400) {
    throw new Error(`❌ Fail! Expected 400 for a non-demo phone number, got ${badLoginRes.status}.`);
  }
  console.log('✅ Success! Non-demo phone number correctly rejected.\n');

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

  // [Step 1] Unauthenticated checkout must be rejected.
  console.log('[Step 1] Submitting an order with no session token...');
  const unauthRes = await jsonRequest('/api/orders', 'POST', {
    restaurantId: restaurant.id, restaurantName: restaurant.name, items: basketItems, total: expectedTotal, deliveryPostcode
  });
  if (unauthRes.status !== 401) {
    throw new Error(`❌ Fail! Expected 401 for unauthenticated order, got ${unauthRes.status}.`);
  }
  console.log('✅ Success! Unauthenticated order creation rejected with 401.\n');

  // [Step 2] Reject a tampered/incorrect total.
  console.log('[Step 2] Submitting a basket with a deliberately wrong total (price tampering)...');
  const tamperedRes = await jsonRequest('/api/orders', 'POST', {
    restaurantId: restaurant.id, restaurantName: restaurant.name, items: basketItems, total: 0.01, deliveryPostcode
  }, customerA.sessionToken);
  if (tamperedRes.status === 400) {
    console.log('✅ Success! Server rejected a tampered total with 400.\n');
  } else {
    throw new Error(`❌ Fail! Expected 400 for tampered total, got ${tamperedRes.status}: ${JSON.stringify(tamperedRes.body)}`);
  }

  // [Step 3] Reject a basket referencing a menu item that doesn't exist on the restaurant.
  console.log('[Step 3] Submitting a basket with a non-existent menu item...');
  const unknownItemRes = await jsonRequest('/api/orders', 'POST', {
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    items: [{ id: 'fake', menuItem: { id: 'does-not-exist', name: 'Fake Item', price: 1 }, quantity: 1, customizations: [] }],
    total: 1,
    deliveryPostcode
  }, customerA.sessionToken);
  if (unknownItemRes.status === 400) {
    console.log('✅ Success! Server rejected an unknown menu item with 400.\n');
  } else {
    throw new Error(`❌ Fail! Expected 400 for unknown item, got ${unknownItemRes.status}: ${JSON.stringify(unknownItemRes.body)}`);
  }

  // [Step 4] Create a legitimate order for customer A.
  console.log('[Step 4] Creating a valid order for customer A...');
  const createRes = await jsonRequest('/api/orders', 'POST', {
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    restaurantAddress: restaurant.address,
    items: basketItems,
    total: expectedTotal,
    deliveryAddress: '10 Downing Street, Westminster',
    deliveryPostcode
  }, customerA.sessionToken);
  if (!createRes.body?.success || !createRes.body?.order?.id) {
    throw new Error(`❌ Fail! Order creation did not succeed: ${JSON.stringify(createRes.body)}`);
  }
  const orderId = createRes.body.order.id;
  if (Math.abs(createRes.body.order.total - expectedTotal) > 0.02) {
    throw new Error(`❌ Fail! Server-stored total ${createRes.body.order.total} doesn't match expected ${expectedTotal}.`);
  }
  if (createRes.body.order.customerId !== customerA.customerId) {
    throw new Error(`❌ Fail! Order customerId should be derived from the session, got ${createRes.body.order.customerId}.`);
  }
  console.log(`✅ Success! Order #${orderId} created with server-computed total £${createRes.body.order.total}, correctly attributed to the logged-in customer.\n`);

  // [Step 5] A second order for customer B, to test per-customer scoping below.
  console.log('[Step 5] Creating a second order for a different customer (B)...');
  const createRes2 = await jsonRequest('/api/orders', 'POST', {
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    restaurantAddress: restaurant.address,
    items: basketItems,
    total: expectedTotal,
    deliveryAddress: 'Flat 2, Baker Street, London',
    deliveryPostcode
  }, customerB.sessionToken);
  const orderIdB = createRes2.body?.order?.id;
  if (!orderIdB) {
    throw new Error(`❌ Fail! Second order creation did not succeed: ${JSON.stringify(createRes2.body)}`);
  }
  console.log(`✅ Success! Order #${orderIdB} created for customer B.\n`);

  // [Step 6] Session-scoped fetch: customer A must see their own order and not customer B's,
  // even if they try to pass customer B's id as a query param (session always wins).
  console.log('[Step 6] Verifying GET /api/orders is scoped by session, not a spoofable query param...');
  const scopedRes = await jsonRequest(`/api/orders?customerId=${encodeURIComponent(customerB.customerId)}`, 'GET', null, customerA.sessionToken);
  const scopedIds = (scopedRes.body?.orders || []).map(o => o.id);
  if (scopedIds.includes(orderId) && !scopedIds.includes(orderIdB)) {
    console.log('✅ Success! Session-derived identity wins over a spoofed customerId query param.\n');
  } else {
    throw new Error(`❌ Fail! Customer scoping broken. Scoped ids: ${JSON.stringify(scopedIds)}`);
  }

  // [Step 7] Promo code validation and application.
  console.log('[Step 7] Validating and applying promo code CHIPPY10...');
  const promoRes = await jsonRequest('/api/promo/validate', 'POST', { code: 'CHIPPY10' });
  if (!promoRes.body?.valid || promoRes.body.discountPercent !== 10) {
    throw new Error(`❌ Fail! Expected CHIPPY10 to validate at 10%: ${JSON.stringify(promoRes.body)}`);
  }
  const discount = Math.round(subtotal * 0.1 * 100) / 100;
  const discountedTotal = Math.round((subtotal - discount + deliveryFee + serviceFee) * 100) / 100;
  const promoOrderRes = await jsonRequest('/api/orders', 'POST', {
    restaurantId: restaurant.id, restaurantName: restaurant.name, items: basketItems,
    total: discountedTotal, deliveryPostcode, promoCode: 'CHIPPY10'
  }, customerA.sessionToken);
  if (!promoOrderRes.body?.success || Math.abs(promoOrderRes.body.order.discount - discount) > 0.02) {
    throw new Error(`❌ Fail! Promo discount not applied correctly: ${JSON.stringify(promoOrderRes.body)}`);
  }
  console.log(`✅ Success! Promo discount of £${promoOrderRes.body.order.discount} applied and total matched server computation.\n`);

  // [Step 8] Minimum order enforcement, when toggled on for a restaurant.
  console.log('[Step 8] Checking minimum-order enforcement toggle...');
  const toggleOnRes = await jsonRequest(`/api/restaurants/${restaurant.id}/toggle-min-order-enforcement`, 'POST');
  if (!toggleOnRes.body?.enforceMinOrder) {
    throw new Error(`❌ Fail! Expected enforceMinOrder=true after toggling: ${JSON.stringify(toggleOnRes.body)}`);
  }
  const tinyBasket = [{ id: `${menuItem.id}-tiny`, menuItem, quantity: 1, customizations: [] }];
  const tinyTotal = Math.round((menuItem.price + deliveryFee + 0.99) * 100) / 100;
  const belowMinRes = await jsonRequest('/api/orders', 'POST', {
    restaurantId: restaurant.id, restaurantName: restaurant.name, items: tinyBasket, total: tinyTotal, deliveryPostcode
  }, customerA.sessionToken);
  if (restaurant.minOrder > menuItem.price && belowMinRes.status !== 400) {
    throw new Error(`❌ Fail! Expected 400 for a basket below the enforced minimum order, got ${belowMinRes.status}.`);
  }
  console.log('✅ Success! Minimum order enforcement correctly rejects a too-small basket when enabled.\n');
  // Toggle back off to leave the restaurant in its original state.
  await jsonRequest(`/api/restaurants/${restaurant.id}/toggle-min-order-enforcement`, 'POST');

  // [Step 9] Saved addresses CRUD.
  console.log('[Step 9] Testing saved address book...');
  const addAddrRes = await jsonRequest('/api/addresses', 'POST', { label: 'Home', addressLine: '221B Baker Street', postcode: 'NW1 6XE', isDefault: true }, customerA.sessionToken);
  if (!addAddrRes.body?.success || !addAddrRes.body?.address?.id) {
    throw new Error(`❌ Fail! Could not save address: ${JSON.stringify(addAddrRes.body)}`);
  }
  const listAddrRes = await jsonRequest('/api/addresses', 'GET', null, customerA.sessionToken);
  if (!listAddrRes.body?.addresses?.some(a => a.id === addAddrRes.body.address.id)) {
    throw new Error('❌ Fail! Newly saved address not present in the address list.');
  }
  const delAddrRes = await jsonRequest(`/api/addresses/${addAddrRes.body.address.id}`, 'DELETE', null, customerA.sessionToken);
  if (!delAddrRes.body?.success) {
    throw new Error('❌ Fail! Could not delete saved address.');
  }
  console.log('✅ Success! Address book create/list/delete all verified.\n');

  // [Step 10] Order status lifecycle: Placed -> Preparing -> OutForDelivery -> Delivered.
  console.log('[Step 10] Walking order #' + orderId + ' through its status lifecycle...');
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

  // [Step 11] Post-delivery rating.
  console.log('[Step 11] Submitting a post-delivery rating...');
  const reviewRes = await jsonRequest('/api/reviews', 'POST', { orderId, rating: 5, comment: 'Great chips!' }, customerA.sessionToken);
  if (!reviewRes.body?.success) {
    throw new Error(`❌ Fail! Could not submit review: ${JSON.stringify(reviewRes.body)}`);
  }
  const duplicateReviewRes = await jsonRequest('/api/reviews', 'POST', { orderId, rating: 3 }, customerA.sessionToken);
  if (duplicateReviewRes.status !== 400) {
    throw new Error(`❌ Fail! Expected 400 when rating the same order twice, got ${duplicateReviewRes.status}.`);
  }
  console.log('✅ Success! Review submitted, and duplicate rating on the same order correctly rejected.\n');

  // [Step 12] Cancellation path for the still-open second order.
  console.log('[Step 12] Cancelling order #' + orderIdB + ' (customer-initiated cancellation)...');
  const cancelRes = await jsonRequest(`/api/orders/${orderIdB}`, 'PATCH', { status: 'Cancelled' });
  if (cancelRes.body?.order?.status !== 'Cancelled') {
    throw new Error('❌ Fail! Could not cancel order.');
  }
  console.log('✅ Success! Order cancellation verified.\n');

  // [Step 13] Destructive bulk-delete must be refused when NODE_ENV=production.
  console.log('[Step 13] Checking DELETE /api/orders production gating...');
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
