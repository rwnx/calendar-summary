import { test, expect } from "./fixtures/withMockedAuth";
import { faker } from "@faker-js/faker";
import { CalendarEventFactory } from "@/__tests__/factories"

test("should load with mocked auth and API", async ({ page }) => {
  const consoleErrors: Error[] = [];
  page.on("pageerror", e => {
    consoleErrors.push(e);
  })

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
        items: await CalendarEventFactory.buildList(10)
      })
    });
  });

  await page.goto("/");
  await page.waitForResponse("https://www.googleapis.com/calendar/v3/calendars/primary/events*")
  await page.waitForLoadState("networkidle")
  // Add more assertions here based on your app's behavior
  // For example, verify events are displayed if your app shows them

  // Fail test if any console errors occurred
  if (consoleErrors.length > 0) {
    throw new Error(`Test failed due to console errors:\n${consoleErrors.join('\n')}`);
  }

  await page.pause()
});
