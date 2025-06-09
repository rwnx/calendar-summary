import { http, HttpResponse, type RequestHandler } from "msw";
import { setupWorker } from "msw/browser";
import { faker } from "@faker-js/faker";

// Mock Google OAuth token endpoint
const mockTokenHandler: RequestHandler = http.post(
  "https://oauth2.googleapis.com/token",
  () => {
    return HttpResponse.json({
      access_token: faker.string.uuid(),
      expires_in: 3600,
      token_type: "Bearer",
    });
  }
);

// Mock Google Calendar API
const mockCalendarHandler: RequestHandler = http.get(
  "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  () => {
    return HttpResponse.json({
      kind: "calendar#events",
      etag: faker.string.uuid(),
      items: [],
    });
  }
);

export const handlers = [mockTokenHandler, mockCalendarHandler];
export const worker = setupWorker(...handlers);
