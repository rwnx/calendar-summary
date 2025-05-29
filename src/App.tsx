import { useState } from "react";
import { useAuth } from "./useAuth";
import "./App.css";
import { useQuery } from "@tanstack/react-query";
import { ApiGoogleCalendar } from "./api";
import dayjs from "dayjs";
import {
  Day,
  getEventsByDayRegion,
  StatusEmoji,
  REGIONS,
  DayRegion,
} from "./event-parsing";

const getEventDetailsByRegion = (
  region: DayRegion,
  day: Day,
  options: { showEvents: boolean }
) => {
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
      options.showEvents ? `[${event.event.summary}]` : ""
    }`;
  });
  return notes;
};

export const getRegionStatus = (
  region: DayRegion,
  day: Day,
  statusOptions: { showEvents: boolean }
) => {
  const percentRemaining =
    (region.remaining.asMilliseconds() / region.total.asMilliseconds()) * 100;
  const notes = getEventDetailsByRegion(region, day, statusOptions);

  if (percentRemaining === 100) {
    return { emoji: region.emoji, notes };
  } else if (percentRemaining >= 50) {
    return { emoji: StatusEmoji.NOT_SURE, notes };
  } else {
    return { emoji: StatusEmoji.BUSY, notes };
  }
};

const googleCalendar = new ApiGoogleCalendar();

function App() {
  const { tokenData, error, login, handleLogout } = useAuth();
  const isLoggedIn = !!tokenData;
  const calendar = useQuery({
    queryKey: ["calendar", tokenData?.access_token],
    enabled: !!tokenData?.access_token,
    select: (data) => getEventsByDayRegion(data.items),
    queryFn: async () => {
      if (!tokenData?.access_token) throw new Error("Missing access token.");
      const timeMin = dayjs();
      const timeMax = timeMin.add(2, "weeks");

      return await googleCalendar.getEvents({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        accessToken: tokenData.access_token,
      });
    },
  });
  const [showEvents, setShowEvents] = useState(true);

  const thisWeekEnd = dayjs().endOf("week");
  const nextWeekEnd = dayjs().add(1, "week");

  const thisWeekDays = calendar.data?.filter((x) =>
    x.startOfDay.isBefore(thisWeekEnd)
  );
  const nextWeekDays = calendar.data?.filter(
    (x) =>
      x.startOfDay.isAfter(thisWeekEnd) && x.startOfDay.isBefore(nextWeekEnd)
  );

  const beyondDays = calendar.data?.filter((x) =>
    x.startOfDay.isAfter(nextWeekEnd)
  );

  const renderDay = (day: Day) => {
    const regionStatuses = day.regions.map((dayRegion) =>
      getRegionStatus(dayRegion, day, { showEvents })
    );
    const allNotes = regionStatuses.flatMap((x) => x.notes).filter((x) => !!x);
    return (
      <>
        {day.startOfDay.format("ddd Do")}
        {regionStatuses.map((r) => `${r.emoji}`).join("")}
        {allNotes.length > 0 && `\n  ${allNotes.join("\n  ")}`}
        {"\n"}
      </>
    );
  };

  return (
    <div className="app">
      {!isLoggedIn ? (
        <div className="login-container">
          <p>Please sign in to view your calendar summary</p>
          <button onClick={() => login()} className="login-button">
            Sign in with Google
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      ) : (
        <div>
          <div className="header-controls">
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
          Show events
          <input
            type="checkbox"
            value={"showEvents"}
            checked={showEvents}
            onChange={(evt) => setShowEvents(evt.target.checked)}
          />
          <pre>
            {REGIONS.map((region) => (
              <>
                {region.emoji} = {region.name} Free{"\n"}
              </>
            ))}
            {StatusEmoji.NOT_SURE} = Not Sure{"\n"}
            {StatusEmoji.BUSY} = Busy
          </pre>
          {calendar.isLoading && <p>Loading calendar...</p>}
          {error && <p className="error">Error loading calendar: {error}</p>}
          <div className="summary">
            <pre>
              {thisWeekDays?.map((day) => renderDay(day))}

              {nextWeekDays && nextWeekDays?.length > 0 && (
                <>
                  {"\n"}Next Week{"\n"}
                  {nextWeekDays?.map((day) => renderDay(day))}
                </>
              )}
              {beyondDays && beyondDays?.length > 0 && (
                <>
                  {"\n"}More{"\n"}
                  {beyondDays?.map((day) => renderDay(day))}
                </>
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
