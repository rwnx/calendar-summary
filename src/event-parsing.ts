import dayjs, { Dayjs } from "dayjs";
import "./dayjs";
import { Duration } from "dayjs/plugin/duration";
import { CalendarEvent } from "./api";
import { sortByAccessor, mergeDefaults } from "./utils";
import { REGIONS } from "./constants";

export type DayRegionEvent = {
  dayId: string;
  regionId: string;

  event: CalendarEvent;
  boundedStart: Dayjs;
  boundedEnd: Dayjs;
  boundedDuration: Duration;
  effectiveDuration: Duration;
};

export type DayRegion = {
  dayId: string;
  regionId: string;

  name: string;
  emoji: string;
  start: Dayjs;
  end: Dayjs;
  total: Duration;
  remaining: Duration;
  events: DayRegionEvent[];
};

export type Day = {
  startOfDay: Dayjs;
  endOfDay: Dayjs;
  regions: DayRegion[];
};

// Helper functions
const createEmptyDay = (daysFromNow: number): Day => {
  const startOfDay = dayjs().add(daysFromNow, "day").startOf("day");
  return {
    startOfDay,
    endOfDay: startOfDay.endOf("day"),
    regions: REGIONS.map((region) => {
      const start = startOfDay.add(region.start);
      const end = startOfDay.add(region.end);
      return {
        ...region,
        regionId: region.id,
        dayId: startOfDay.format("YYYY-MM-DD"),
        start,
        end,
        total: dayjs.duration(end.diff(start)),
        remaining: dayjs.duration(end.diff(start)),
        events: [],
      };
    }),
  };
};

export const getEventsByDayRegion = (events: CalendarEvent[]): Day[] => {
  const emptyDays = Array.from({ length: 14 }, (_, i) => createEmptyDay(i));
  events.sort(sortByAccessor((x) => x.start.unix()));

  return events.reduce((days: Day[], event: CalendarEvent): Day[] => {
    return days.map((day): Day => {
      const dayRegions = day.regions.map((region): DayRegion => {
        const startsInRegion = event.start.isBetween(region.start, region.end);
        const endsInRegion = event.end.isBetween(region.start, region.end);

        if (!startsInRegion && !endsInRegion) {
          return region;
        }

        // cap the event start and end to the start and end of the region
        const boundedStart = dayjs.max(event.start, region.start);
        const boundedEnd = dayjs.min(event.end, region.end);

        const boundedDuration = dayjs.duration(boundedEnd.diff(boundedStart));

        // check for overlap with previous events and calculate the unique duration
        const effectiveDuration = region.events.reduce((prev, cur) => {
          const overlapStart = dayjs.max(boundedStart, cur.boundedStart);
          const overlapEnd = dayjs.min(boundedEnd, cur.boundedEnd);
          const overlap = dayjs.duration(overlapEnd.diff(overlapStart));

          if (overlap.asMilliseconds() > 0) {
            return prev.subtract(overlap);
          }
          return prev;
        }, boundedDuration);

        const nextEvent: DayRegionEvent = {
          dayId: region.dayId,
          regionId: region.regionId,
          event,
          boundedStart,
          boundedEnd,
          boundedDuration,
          effectiveDuration,
        };

        const nextRegion: DayRegion = {
          ...region,
          remaining: region.remaining.subtract(effectiveDuration),
          events: [...region.events, nextEvent],
        };

        return nextRegion;
      });

      return { ...day, regions: dayRegions };
    });
  }, emptyDays);
};
