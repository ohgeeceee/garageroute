/**
 * Smoke test: home page renders.
 * Cheap, fast, catches the most common deploy mistakes
 * (build broken, env missing, layout crashed).
 */
import { test, expect } from "@playwright/test";

test("home page returns 200 and shows brand", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/GarageRoute/i);
});

/**
 * Smoke test: /api/health responds with the expected shape.
 * This is the endpoint uptime monitors will ping. If it 503s
 * for longer than the monitor window, your status page turns red.
 */
test("/api/health returns ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.db).toBe("up");
  expect(typeof body.uptime).toBe("number");
});

/**
 * Smoke test: /api/sales returns a JSON array (possibly empty).
 * Catches a Prisma / DB schema drift in CI before deploy.
 */
test("/api/sales returns JSON array", async ({ request }) => {
  const res = await request.get("/api/sales?limit=1");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
});

/**
 * Smoke test: /states page renders state network.
 * Catches a regression in the State model or its seed.
 */
test("states page renders", async ({ page }) => {
  const response = await page.goto("/states");
  expect(response?.status()).toBe(200);
  await expect(page.locator("body")).toContainText(/state/i);
});

/**
 * Smoke test: legal pages exist (Privacy, Terms, Cookies).
 * These are the minimum-viable legal surface for a US app
 * with public-record features and account creation.
 */
test("legal pages return 200", async ({ request }) => {
  for (const path of ["/legal/privacy", "/legal/terms", "/legal/cookies"]) {
    const res = await request.get(path);
    expect(res.status(), `expected ${path} to be 200`).toBe(200);
  }
});

/**
 * Smoke test: auth rate limit kicks in.
 * Hit /api/auth/login 11 times (limit is 10/10min) and expect
 * the 11th to 429. This is the kind of regression a missing
 * rateLimit import would cause.
 */
test("login endpoint is rate-limited", async ({ request }) => {
  const statuses: number[] = [];
  for (let i = 0; i < 11; i++) {
    const res = await request.post("/api/auth/login", {
      data: { email: "ratelimit-test@example.com", password: "wrongpass" },
    });
    statuses.push(res.status());
  }
  // At least one of the 11 calls must be 429.
  expect(statuses).toContain(429);
});
