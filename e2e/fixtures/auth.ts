import { test as base } from "@playwright/test";

export const test = base.extend<{
  mockAuth: void;
}>({
  mockAuth: [
    async ({ page }, use) => {
      // Mock logged in state by setting localStorage
      await page.addInitScript(() => {
        window.localStorage.setItem(
          "googleTokenData",
          JSON.stringify({
            access_token: "mock-access-token",
            expires_at: Date.now() + 3600 * 1000,
          })
        );
      });
      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
