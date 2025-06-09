import dayjs, { Dayjs } from "dayjs";
import { faker } from "@faker-js/faker";
import { getEventsByDayRegion } from "./event-parsing";
import type { CalendarEvent } from "./api";
import { factory, later } from "@factory-js/factory";

const CalendarEventFactory = factory
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
  });

describe("getEventsByDayRegion", () => {
  let events: CalendarEvent[];
  const today = dayjs().startOf("day");

  describe("when an event takes up 3 hours of a region", () => {
    beforeAll(async () => {
      events = [
        await CalendarEventFactory.props({
          id: () => "1",
          summary: () => "Test Event",
          start: () => today.add(6, "hours"), // 6am
          end: () => today.add(9, "hours"), // 9am (3 hours)
        }).build(),
      ];
    });

    it("should subtract 3 hours from the remaining time", async () => {
      const result = getEventsByDayRegion(events);
      const morningRegion = result[0].regions.find((r) => r.regionId === "am");

      expect(morningRegion?.remaining.asHours()).toBe(3); // 6am-12pm is 6 hours, 3 taken
    });
  });

  describe("when multiple events fall in a region", () => {
    beforeAll(async () => {
      events = [
        await CalendarEventFactory.props({
          id: () => "1",
          summary: () => "Event 1",
          start: () => today.add(6, "hours"), // 6am
          end: () => today.add(8, "hours"), // 8am
        }).build(),
        await CalendarEventFactory.props({
          id: () => "2",
          summary: () => "Event 2",
          start: () => today.add(8, "hours"), // 8am
          end: () => today.add(11, "hours"), // 11am
        }).build(),
      ];
    });
    it("should subtract their combined duration from the region", async () => {
      const result = getEventsByDayRegion(events);
      const morningRegion = result[0].regions.find((r) => r.regionId === "am");

      expect(morningRegion?.remaining.asHours()).toBe(1); // 6am-12pm is 6 hours, 5 taken
    });
  });

  describe("when an event overlaps multiple regions", () => {
    it("should repeat that event across multiple regions", async () => {
      const events = [
        await CalendarEventFactory.props({
          id: () => "1",
          summary: () => "Long Event",
          start: () => today.add(11, "hours"), // 11am
          end: () => today.add(14, "hours"), // 2pm (spans am/pm regions)
        }).build(),
      ];

      const result = getEventsByDayRegion(events);
      const morningRegion = result[0].regions.find((r) => r.regionId === "am");
      const afternoonRegion = result[0].regions.find(
        (r) => r.regionId === "pm"
      );

      expect(morningRegion?.events).toHaveLength(1);
      expect(afternoonRegion?.events).toHaveLength(1);
    });
  });

  describe("when an event extends beyond the end of a region", () => {
    it("the end of the event should be set to the end of the region", async () => {
      const events = [
        await CalendarEventFactory.props({
          id: () => "1",
          summary: () => "Overflow Event",
          start: () => today.add(22, "hours"), // 10pm
          end: () => today.add(26, "hours"), // 2am next day
        }).build(),
      ];

      const result = getEventsByDayRegion(events);
      const eveningRegion = result[0].regions.find((r) => r.regionId === "eve");

      expect(eveningRegion?.events[0].boundedEnd.format("HH:mm")).toBe("00:00");
    });
  });

  describe("when an event starts before the start of a region", () => {
    it("should set the start of the event to the start of the region", async () => {
      const events = [
        await CalendarEventFactory.props({
          id: () => "1",
          summary: () => "Early Event",
          start: () => today.add(4, "hours"), // 4am
          end: () => today.add(8, "hours"), // 8am
        }).build(),
      ];

      const result = getEventsByDayRegion(events);
      const morningRegion = result[0].regions.find((r) => r.regionId === "am");

      expect(morningRegion?.events[0].boundedStart.format("HH:mm")).toBe(
        "06:00"
      );
    });
  });

  describe("when multiple events overlap the same time", () => {
    it("the remaining time should reflect consumed time once", async () => {
      events = [
        await CalendarEventFactory.props({
          id: () => "1",
          summary: () => "Overlap 1",
          start: () => today.add(13, "hours"), // 1pm
          end: () => today.add(15, "hours"), // 3pm
        }).build(),
        await CalendarEventFactory.props({
          id: () => "2",
          summary: () => "Overlap 2",
          start: () => today.add(14, "hours"), // 2pm
          end: () => today.add(16, "hours"), // 4pm
        }).build(),
      ];

      const result = getEventsByDayRegion(events);
      const afternoonRegion = result[0].regions.find(
        (r) => r.regionId === "pm"
      );

      // 12-5pm is 5 hours, overlapping events take 3 hours (1-4pm)
      expect(afternoonRegion?.remaining.asHours()).toBe(2);
    });
  });
});
