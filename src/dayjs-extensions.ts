// dayjs extensions
import dayjs from "dayjs";

import duration from "dayjs/plugin/duration";
import isBetween from "dayjs/plugin/isBetween";
import minMax from "dayjs/plugin/minMax";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";

dayjs.extend(utc);
dayjs.extend(advancedFormat);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.extend(minMax);
