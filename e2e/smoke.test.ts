import { test, expect } from "./fixtures/auth";
import { faker } from "@faker-js/faker";

test("should load with mocked auth and API", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Mock Google OAuth token endpoint
  await page.route('https://oauth2.googleapis.com/token', async route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: faker.string.uuid(),
        expires_in: 3600,
        token_type: "Bearer",
      })
    });
  });

  // Mock Google Calendar API
  await page.route('https://www.googleapis.com/calendar/v3/calendars/primary/events*', async route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: "calendar#events",
        etag: faker.string.uuid(),
        items: [],
      })
    });
  });

  await page.goto("/");

  // Verify the app loaded
  await expect(page).toHaveTitle(/Calendar Summary/);

  // Add more assertions here based on your app's behavior
  // For example, verify events are displayed if your app shows them

  // Fail test if any console errors occurred
  if (consoleErrors.length > 0) {
    throw new Error(`Test failed due to console errors:\n${consoleErrors.join('\n')}`);
  }
});
