import dayjs, { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration";
import { CalendarEvent } from "./api";
import { sortByAccessor, mergeDefaults } from "./utils";

type RegionDefinition = {
  name: string;
  emoji: string;
  start: Duration;
  end: Duration;
};

type DayRegionEventReference = {
  id: string;
  event: CalendarEvent;
  boundedStart: Dayjs;
  boundedEnd: Dayjs;
  boundedDuration: Duration;
};

type DayRegion = {
  name: string;
  emoji: string;
  start: Dayjs;
  end: Dayjs;
  total: Duration;
  remaining: Duration;
  events: DayRegionEventReference[];
};

export type Day = {
  startOfDay: Dayjs;
  endOfDay: Dayjs;
  regions: DayRegion[];
};

export const TIME_REGIONS: RegionDefinition[] = [
  {
    name: "Morning",
    start: dayjs.duration({ hours: 6 }),
    end: dayjs.duration({ hours: 12 }),
    emoji: "🌞",
  },
  {
    name: "Afternoon",
    start: dayjs.duration({ hours: 12 }),
    end: dayjs.duration({ hours: 17 }),
    emoji: "⛅",
  },
  {
    name: "Evening",
    start: dayjs.duration({ hours: 17 }),
    end: dayjs.duration({ hours: 24 }),
    emoji: "✨",
  },
];

export enum StatusEmoji {
  NOT_SURE = "⚠️",
  BUSY = "🚫",
}

// Helper functions
const createEmptyDay = (daysFromNow: number): Day => {
  const startOfDay = dayjs().add(daysFromNow, "day").startOf("day");
  return {
    startOfDay,
    endOfDay: startOfDay.endOf("day"),
    regions: TIME_REGIONS.map((region) => {
      const start = startOfDay.add(region.start);
      const end = startOfDay.add(region.end);
      return {
        ...region,
        start,
        end,
        total: dayjs.duration(end.diff(start)),
        remaining: dayjs.duration(end.diff(start)),
        events: [],
      };
    }),
  };
};

const sortEventsByStart = sortByAccessor<CalendarEvent>((x) => x.start.unix());

const getRegionNotes = (region: DayRegion, day: Day, { showEvents }) => {
  const notes = region.events.map((event) => {
    let startFormat = event.boundedEnd.isBefore(day.startOfDay)
      ? "h:mm a(Do)"
      : "h:mm a";
    let endFormat = event.boundedEnd.isAfter(day.endOfDay)
      ? "h:mm a(Do)"
      : "h:mm a";

    return `${region.name} ${event.boundedStart.format(
      startFormat
    )}-${event.boundedEnd.format(endFormat)}${
      showEvents ? `[${event.event.summary}]` : ""
    }`;
  });
  return notes;
};

export const getRegionStatus = (
  region: DayRegion,
  day: Day,
  statusOptions: { showEvents?: boolean }
) => {
  const options = mergeDefaults(statusOptions, { showEvents: false });

  const percentRemaining =
    (region.remaining.asMilliseconds() / region.total.asMilliseconds()) * 100;
  const notes = getRegionNotes(region, day, options);

  if (percentRemaining === 100) {
    return { emoji: region.emoji, notes };
  } else if (percentRemaining >= 50) {
    return { emoji: StatusEmoji.NOT_SURE, notes };
  } else {
    return { emoji: StatusEmoji.BUSY, notes };
  }
};

export const getEventsByDayRegion = (
  events: CalendarEvent[],
  optionsInput?: {
    days?: number;
  }
): Day[] => {
  const options = mergeDefaults(optionsInput, {
    days: 14,
  });

  const emptyDays = Array.from({ length: options.days! }, (_, i) =>
    createEmptyDay(i)
  );
  events.sort(sortEventsByStart);

  return events.reduce((days: Day[], event: CalendarEvent) => {
    return days.map((day) => {
      const dayRegions = day.regions.map((region) => {
        const startsInRegion = event.start.isBetween(region.start, region.end);
        const endsInRegion = event.end.isBetween(region.start, region.end);
        // no overlap - exit
        if (!startsInRegion && !endsInRegion) {
          return region;
        }

        // cap the event start and end to the start and end of the region
        const boundedStart = dayjs.max(event.start, region.start);
        const boundedEnd = dayjs.min(event.end, region.end);

        const boundedDuration = dayjs.duration(boundedEnd.diff(boundedStart));

        // check for overlap from previous events and remove this from the effective duration
        const effectiveDuration = region.events.reduce((prev, cur) => {
          return prev.subtract(cur.boundedDuration);
        }, boundedDuration);

        const nextEvent = {
          id: event.id,
          event,
          boundedStart,
          boundedEnd,
          boundedDuration,
          effectiveDuration,
        };

        const nextRegion = {
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
