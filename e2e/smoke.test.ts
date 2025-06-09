import { test, expect } from "./fixtures/auth";
import { worker } from "./mocks/handlers";

test.beforeAll(async () => {
  await worker.start();
});

test.afterAll(async () => {
  await worker.stop();
});

test("should load with mocked auth and API", async ({ page }) => {
  await page.goto("/");

  // Verify the app loaded
  await expect(page).toHaveTitle(/Calendar Summary/);

  // Add more assertions here based on your app's behavior
  // For example, verify events are displayed if your app shows them
});
