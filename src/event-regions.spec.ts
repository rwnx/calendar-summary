import dayjs from "@/dayjs";
import { getEventsByDayRegion } from "@/event-regions";
import { CalendarEventFactory } from "@/__tests__/factories";

describe("getEventsByDayRegion", () => {
  it("should subtract 3 hours from the remaining time when an event takes up 3 hours of a region", async () => {
    const today = dayjs().startOf("day");
    const events = [
      await CalendarEventFactory.props({
        id: () => "1",
        summary: () => "Test Event",
        start: () => today.add(6, "hours"), // 6am
        end: () => today.add(9, "hours"), // 9am (3 hours)
      }).build(),
    ];
    const result = getEventsByDayRegion(events);
    const morningRegion = result[0].regions.find((r) => r.regionId === "am");
    expect(morningRegion?.remaining.asHours()).toBe(3); // 6am-12pm is 6 hours, 3 taken
  });

  it("should subtract their combined duration from the region when multiple events fall in a region", async () => {
    const today = dayjs().startOf("day");
    const events = [
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
    const result = getEventsByDayRegion(events);
    const morningRegion = result[0].regions.find((r) => r.regionId === "am");
    expect(morningRegion?.remaining.asHours()).toBe(1); // 6am-12pm is 6 hours, 5 taken
  });

  it("should repeat that event across multiple regions when an event overlaps multiple regions", async () => {
    const today = dayjs().startOf("day");
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
    const afternoonRegion = result[0].regions.find((r) => r.regionId === "pm");
    expect(morningRegion?.events).toHaveLength(1);
    expect(afternoonRegion?.events).toHaveLength(1);
  });

  it("should set the end of the event to the end of the region when an event extends beyond the end of a region", async () => {
    const today = dayjs().startOf("day");
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

  it("should set the start of the event to the start of the region when an event starts before the start of a region", async () => {
    const today = dayjs().startOf("day");
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
    expect(morningRegion?.events[0].boundedStart.format("HH:mm")).toBe("06:00");
  });

  it("should reflect consumed time once when multiple events overlap the same time", async () => {
    const today = dayjs().startOf("day");
    const events = [
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
    const afternoonRegion = result[0].regions.find((r) => r.regionId === "pm");
    // 12-5pm is 5 hours, overlapping events take 3 hours (1-4pm)
    expect(afternoonRegion?.remaining.asHours()).toBe(2);
  });
});
