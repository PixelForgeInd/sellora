import test, { before } from "node:test";
import assert from "node:assert/strict";

const baseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:4000").replace(/\/$/, "");

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
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

test("health endpoint reports the Sellora API", async () => {
  const response = await request("/api/health");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "sellora-api" });
});

test("workspace business endpoint rejects unauthenticated requests", async () => {
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

test("signup rejects malformed input before database access", async () => {
  const response = await request("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", password: "short" }),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "Validation failed");
});

test("login rejects malformed input before database access", async () => {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "bad-email", password: "" }),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "Validation failed");
});
