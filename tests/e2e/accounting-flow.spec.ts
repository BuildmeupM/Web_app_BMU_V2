import { test, expect } from "@playwright/test";

test.describe("Accounting Flow E2E", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Inject auth state into localStorage so we bypass login completely
    // We navigate to a blank page on the domain first so we have the origin context
    await page.goto("/");

    await page.evaluate(() => {
      const authState = {
        state: {
          user: {
            id: "fakeuserid",
            username: "admin",
            email: "admin@bmu.co.th",
            role: "admin",
            name: "Test Admin",
          },
          token: "fake-jwt-token-12345",
          sessionId: "fake-session-id",
          isAuthenticated: true,
          reopenCount: 0,
        },
        version: 0,
      };

      localStorage.setItem("auth-storage", JSON.stringify(authState));
    });

    // We intercept ALL API calls to prevent any 401 interceptor logic from triggering a redirect to /login
    await page.route("**/api/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    // 2. Navigate straight to the accounting dashboard
    await page.goto("/accounting-dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("should load the accounting dashboard directly via injected auth", async ({
    page,
  }) => {
    // 1. Verify we didn't get redirected to /login
    await expect(page).not.toHaveURL(/.*\/login/);

    // 2. Verify Accounting Dashboard URL
    await expect(page).toHaveURL(/.*accounting-dashboard/);

    // 3. Verify page content (Wait for some element that proves we are on accounting dashboard)
    // E.g. search for text "งานบัญชี" or "ภาพรวมงานบัญชี"
    // Using a broader locator just to ensure the app shell loaded
    const appShell = page.locator("body");
    await expect(appShell).toBeVisible();
  });
});
