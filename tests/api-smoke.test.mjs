import test, { before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const baseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:4000").replace(/\/$/, "");

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

async function jsonRequest(path, { token, ...options } = {}) {
  const headers = {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  return request(path, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

before(async () => {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await request("/api/health");
      if (response.ok) return;
      lastError = new Error(`Health endpoint returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw lastError || new Error("API did not become ready within 30 seconds");
});

test("API health reports the Sellora service", async () => {
  const response = await request("/api/health");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "sellora-api" });
});

test("workspace endpoints require authentication", async () => {
  const response = await request("/api/workspace/business");
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /sign in/i);
});

test("legacy product endpoints remain retired", async () => {
  for (const [method, path] of [
    ["GET", "/api/products"],
    ["GET", "/api/products/example-id"],
    ["POST", "/api/products"],
    ["PATCH", "/api/products/example-id"],
  ]) {
    const response = await request(path, {
      method,
      headers: { "content-type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify({ name: "test" }),
    });
    assert.equal(response.status, 410, `${method} ${path} should be retired`);
  }
});

test("signup and login reject malformed input", async () => {
  const signup = await jsonRequest("/api/auth/signup", {
    method: "POST",
    body: { email: "not-an-email", password: "short" },
  });
  assert.equal(signup.status, 400);
  assert.equal((await signup.json()).error, "Validation failed");

  const login = await jsonRequest("/api/auth/login", {
    method: "POST",
    body: { email: "bad-email", password: "" },
  });
  assert.equal(login.status, 400);
  assert.equal((await login.json()).error, "Validation failed");
});

test("account, workspace, product, catalogue and tenant-isolation flow", async (t) => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const email = `sellora-test-${suffix}@example.test`;
  const password = "Test-password-123!";
  let token;
  let productId;
  let catalogueSlug;

  await t.test("creates an account and signs in", async () => {
    const signup = await jsonRequest("/api/auth/signup", {
      method: "POST",
      body: { email, password },
    });
    assert.equal(signup.status, 201);
    const created = await signup.json();
    assert.ok(created.token);
    assert.equal(created.user.email, email);
    token = created.token;

    const me = await jsonRequest("/api/auth/me", { token });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).email, email);

    const login = await jsonRequest("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    assert.equal(login.status, 200);
    assert.ok((await login.json()).token);
  });

  await t.test("creates a business workspace", async () => {
    const response = await jsonRequest("/api/workspace/business", {
      method: "POST",
      token,
      body: {
        name: `Test Business ${suffix}`,
        industry: "Textiles",
        productCategory: "yarn-textiles",
        businessModel: "B2B",
        brandColor: "#599c56",
        sellingMode: "CATALOG_ONLY",
      },
    });
    assert.equal(response.status, 201);
    const business = await response.json();
    assert.equal(business.productCategory, "yarn-textiles");
    assert.ok(business.catalogueFields.some((field) => field.key === "count"));
  });

  await t.test("creates and updates a product", async () => {
    const create = await jsonRequest("/api/workspace/products", {
      method: "POST",
      token,
      body: {
        name: `Test Yarn ${suffix}`,
        price: 155,
        currency: "INR",
        unit: "kg",
        fields: { count: "20s OE", yarnType: "Recycled OE" },
      },
    });
    assert.equal(create.status, 201);
    const product = await create.json();
    productId = product.id;
    assert.equal(product.name, `Test Yarn ${suffix}`);

    const update = await jsonRequest(`/api/workspace/products/${productId}`, {
      method: "PATCH",
      token,
      body: { name: `Updated Yarn ${suffix}` },
    });
    assert.equal(update.status, 200);
    assert.equal((await update.json()).name, `Updated Yarn ${suffix}`);
  });

  await t.test("creates, publishes and reads a public catalogue", async () => {
    const create = await jsonRequest("/api/workspace/catalogues", {
      method: "POST",
      token,
      body: { title: `Test Catalogue ${suffix}`, productIds: [productId] },
    });
    assert.equal(create.status, 201);
    const catalogue = await create.json();
    catalogueSlug = catalogue.slug;
    assert.equal(catalogue.items.length, 1);

    const publish = await jsonRequest(`/api/workspace/catalogues/${catalogue.id}`, {
      method: "PATCH",
      token,
      body: { isPublished: true },
    });
    assert.equal(publish.status, 200);
    assert.equal((await publish.json()).isPublished, true);

    const publicResponse = await request(`/api/public/catalogues/${catalogueSlug}`);
    assert.equal(publicResponse.status, 200);
    const publicCatalogue = await publicResponse.json();
    assert.equal(publicCatalogue.products.length, 1);
    assert.equal(publicCatalogue.products[0].name, `Updated Yarn ${suffix}`);
    assert.equal(publicCatalogue.business.sellingMode, "CATALOG_ONLY");

    const disabledCheckout = await jsonRequest(`/api/public/catalogues/${catalogueSlug}/orders`, {
      method: "POST",
      body: { customerName: "Test Customer", phone: "+919876543210", items: [{ productId, quantity: 2 }] },
    });
    assert.equal(disabledCheckout.status, 403, "catalogue-only mode must not allow checkout");

    // Online payments must remain disabled until Razorpay is connected and verified.
    const enableCheckout = await jsonRequest("/api/workspace/business/settings", {
      method: "PATCH", token, body: { sellingMode: "ONLINE_PAYMENTS" },
    });
    assert.equal(enableCheckout.status, 409);
    assert.match((await enableCheckout.json()).error, /connect and verify Razorpay/i);

    const stillCatalogueOnly = await request(`/api/public/catalogues/${catalogueSlug}`);
    const publicAfterRejectedEnable = await stillCatalogueOnly.json();
    assert.equal(publicAfterRejectedEnable.business.sellingMode, "CATALOG_ONLY");

    for (const eventType of ["page_view", "add_to_cart", "checkout_started"]) {
      const event = await jsonRequest(`/api/public/catalogues/${catalogueSlug}/events`, {
        method: "POST", body: { eventType, sessionId: `test-session-${suffix}` },
      });
      assert.equal(event.status, 202);
    }
    const orderList = await jsonRequest("/api/workspace/orders", { token });
    assert.equal(orderList.status, 200);
    const listedOrders = await orderList.json();
    assert.equal(listedOrders.length, 0);

    const catalogueList = await jsonRequest("/api/workspace/catalogues", { token });
    const currentCatalogue = (await catalogueList.json()).find((item) => item.slug === catalogueSlug);
    const analytics = await jsonRequest(`/api/workspace/catalogues/${currentCatalogue.id}/analytics`, { token });
    assert.equal(analytics.status, 200);
    const metrics = await analytics.json();
    assert.equal(metrics.views, 1);
    assert.equal(metrics.addToCart, 1);
    assert.equal(metrics.checkoutStarted, 1);
    assert.equal(metrics.ordersSubmitted, 0);
    assert.equal(metrics.paymentsConfirmed, 0);
  });

  await t.test("isolates another account from the first account's products", async () => {
    const secondSignup = await jsonRequest("/api/auth/signup", {
      method: "POST",
      body: { email: `other-${suffix}@example.test`, password },
    });
    assert.equal(secondSignup.status, 201);
    const otherToken = (await secondSignup.json()).token;

    const list = await jsonRequest("/api/workspace/products", { token: otherToken });
    assert.equal(list.status, 409, "second account must complete its own setup");

    const deleteAttempt = await jsonRequest(`/api/workspace/products/${productId}`, {
      method: "DELETE",
      token: otherToken,
    });
    assert.equal(deleteAttempt.status, 404);
  });

  await t.test("unpublishing removes public access", async () => {
    const list = await jsonRequest("/api/workspace/catalogues", { token });
    assert.equal(list.status, 200);
    const catalogue = (await list.json()).find((item) => item.slug === catalogueSlug);
    assert.ok(catalogue);

    const unpublish = await jsonRequest(`/api/workspace/catalogues/${catalogue.id}`, {
      method: "PATCH",
      token,
      body: { isPublished: false },
    });
    assert.equal(unpublish.status, 200);
    assert.equal((await unpublish.json()).isPublished, false);

    const publicResponse = await request(`/api/public/catalogues/${catalogueSlug}`);
    assert.equal(publicResponse.status, 404);
  });
});
