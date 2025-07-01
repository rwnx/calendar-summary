import { test as base } from "@playwright/test";
import { TOKEN_STORAGE_KEY } from "@/constants"

export const test = base.extend<{
  mockAuth: void;
}>({
  mockAuth: [
    async ({ page }, use) => {
      // Mock logged in state by setting localStorage
      await page.addInitScript((tokenKey) => {
        window.localStorage.setItem(
          tokenKey,
          JSON.stringify({
            access_token: "mock-access-token",
            expires_at: Date.now() + 3600 * 1000,
          })
        );
      }, TOKEN_STORAGE_KEY);

      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";