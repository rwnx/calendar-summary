import { CalendarEvent } from "@/api";
import { later, factory } from "@factory-js/factory";
import { faker } from "@faker-js/faker";
import dayjs from "@/dayjs";

export const CalendarEventFactory = factory
  .define<CalendarEvent>({
    props: {
      kind: () => "calendar#event",
      id: () => faker.string.uuid(),
      status: () => "confirmed",
      etag: () => `${faker.string.uuid()}`,
      htmlLink: () => faker.internet.url(),
      created: () => dayjs(),
      updated: () => dayjs(),
      summary: () => faker.lorem.words(3),
      description: () => faker.lorem.sentence(),
      creator: () => ({
        email: faker.internet.email(),
        displayName: faker.person.fullName(),
        self: true,
      }),
      organizer: () => ({
        email: faker.internet.email(),
        displayName: faker.person.fullName(),
        self: true,
      }),
      start: () => dayjs(faker.date.soon()),
      end: later<dayjs.Dayjs>(),
      sequence: () => 0,
      reminders: () => ({
        useDefault: true,
      }),
      eventType: () => "default",
    },
    vars: {},
  })
  .props({
    end: async ({ props }) =>
      (await props.start).add(faker.number.int({ min: 1, max: 4 }), "hours"),
  })