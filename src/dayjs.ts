// dayjs extensions
import dayjsOriginal from "dayjs";

import duration from "dayjs/plugin/duration.js";
import isBetween from "dayjs/plugin/isBetween.js";
import minMax from "dayjs/plugin/minMax.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import advancedFormat from "dayjs/plugin/advancedFormat.js";

dayjsOriginal.extend(utc);
dayjsOriginal.extend(advancedFormat);
dayjsOriginal.extend(timezone);
dayjsOriginal.extend(duration);
dayjsOriginal.extend(isBetween);
dayjsOriginal.extend(minMax);

export default dayjsOriginal;
export type Dayjs = dayjsOriginal.Dayjs;
export type Duration = duration.Duration;
