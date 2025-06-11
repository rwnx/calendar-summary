import dayjs from "./dayjs";

export const TOKEN_STORAGE_KEY = "googleTokenData";

export const REGIONS = [
  {
    id: "am",
    name: "Morning",
    start: dayjs.duration({ hours: 6 }),
    end: dayjs.duration({ hours: 12 }),
    emoji: "🌞",
  },
  {
    id: "pm",
    name: "Afternoon",
    start: dayjs.duration({ hours: 12 }),
    end: dayjs.duration({ hours: 17 }),
    emoji: "⛅",
  },
  {
    id: "eve",
    name: "Evening",
    start: dayjs.duration({ hours: 17 }),
    end: dayjs.duration({ hours: 24 }),
    emoji: "✨",
  },
] as const;

export enum StatusEmoji {
  NOT_SURE = "⚠️",
  BUSY = "🚫",
}
