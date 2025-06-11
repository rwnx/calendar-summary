import { test as base } from "@playwright/test";
import { TOKEN_STORAGE_KEY } from "@/constants"

export const test = base.extend<{
  mockAuth: void;
}>({
  mockAuth: [
    async ({ page }, use) => {
      // Mock logged in state by setting localStorage
      await page.addInitScript(() => {
        window.localStorage.setItem(
          TOKEN_STORAGE_KEY,
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
