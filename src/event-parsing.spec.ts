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
  const testDate = dayjs("2025-06-06").startOf("day");

  describe("when an event occupies 50% of a region", () => {
    it("should mark that region as busy", async () => {
      const events = [
        await CalendarEventFactory.props({
          id: () => "1",
          summary: () => "Test Event",
          start: () => testDate.add(6, "hours"), // 6am
          end: () => testDate.add(9, "hours"), // 9am (3 hours)
        }).build(),
      ];

      const result = getEventsByDayRegion(events);
      const morningRegion = result[0].regions.find((r) => r.regionId === "am");

      expect(morningRegion?.remaining.asHours()).toBe(3); // 6am-12pm is 6 hours, 3 taken
    });
  });

  describe("when multiple events occupy 50% of a region", () => {
    it("should mark that region as busy", async () => {
      const events = [
        await CalendarEventFactory.props({
          id: () => "1",
          summary: () => "Event 1",
          start: () => testDate.add(6, "hours"), // 6am
          end: () => testDate.add(8, "hours"), // 8am
        }).build(),
        await CalendarEventFactory.props({
          id: () => "2",
          summary: () => "Event 2",
          start: () => testDate.add(8, "hours"), // 8am
          end: () => testDate.add(11, "hours"), // 11am
        }).build(),
      ];

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
          start: () => testDate.add(11, "hours"), // 11am
          end: () => testDate.add(14, "hours"), // 2pm (spans am/pm regions)
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

  describe("when a recurring event is returned", () => {
    it("should calculate the correct region based on the recurring event, not the original event", async () => {
      const events = [
        await CalendarEventFactory.props({
          id: () => "1",
          summary: () => "Recurring Event",
          start: () => testDate.add(16, "hours"), // 4pm
          end: () => testDate.add(17, "hours"), // 5pm
          recurrence: () => ["RRULE:FREQ=DAILY;COUNT=2"],
        }).build(),
      ];

      const result = getEventsByDayRegion(events);
      const day1Evening = result[0].regions.find((r) => r.regionId === "eve");
      const day2Evening = result[1].regions.find((r) => r.regionId === "eve");

      expect(day1Evening?.events).toHaveLength(1);
      expect(day2Evening?.events).toHaveLength(1);
    });
  });

  describe("when events make up 0-50% of a region", () => {
    it("should mark the region as not sure", async () => {
      const events = [
        await CalendarEventFactory.props({
          id: () => "1",
          summary: () => "Short Event",
          start: () => testDate.add(12, "hours"), // 12pm
          end: () => testDate.add(12, "hours").add(30, "minutes"), // 12:30pm
        }).build(),
      ];

      const result = getEventsByDayRegion(events);
      const afternoonRegion = result[0].regions.find(
        (r) => r.regionId === "pm"
      );

      expect(afternoonRegion?.remaining.asHours()).toBeCloseTo(4.5); // 5 hours total, 0.5 taken
    });
  });

  describe("when an event extends beyond the end of a region", () => {
    it("the end of the event should be set to the end of the region", async () => {
      const events = [
        await CalendarEventFactory.props({
          id: () => "1",
          summary: () => "Overflow Event",
          start: () => testDate.add(22, "hours"), // 10pm
          end: () => testDate.add(26, "hours"), // 2am next day
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
          start: () => testDate.add(4, "hours"), // 4am
          end: () => testDate.add(8, "hours"), // 8am
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
      const events = [
        await CalendarEventFactory.props({
          id: () => "1",
          summary: () => "Overlap 1",
          start: () => testDate.add(13, "hours"), // 1pm
          end: () => testDate.add(15, "hours"), // 3pm
        }).build(),
        await CalendarEventFactory.props({
          id: () => "2",
          summary: () => "Overlap 2",
          start: () => testDate.add(14, "hours"), // 2pm
          end: () => testDate.add(16, "hours"), // 4pm
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
