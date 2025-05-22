import axios from "axios";
import dayjs from "dayjs";
import { AnyZodObject, z, ZodSchema } from "zod";
import { mergeDefaults } from "./utils";

const CalendarDateTime = z.object({
  dateTime: z.string(),
  timeZone: z.string(),
});

const CalendarDate = z.object({
  date: z.string(),
});

// Union type that accepts either format
const CalendarEventDateTime = z.union([CalendarDateTime, CalendarDate]);

const DayJsDate = z.string().transform((data) => dayjs(data));

const StartEndSchema = CalendarEventDateTime.transform((data) => {
  if ("dateTime" in data) {
    return dayjs(data.dateTime).tz(data.timeZone);
  } else {
    return dayjs(data.date);
  }
});

const CalendarEventSchema = z
  .object({
    kind: z.literal("calendar#event"),
    etag: z.string(),
    id: z.string(),
    status: z.string(),
    htmlLink: z.string().url(),
    created: DayJsDate,
    updated: DayJsDate,
    summary: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    colorId: z.string().optional(),
    creator: z.object({
      id: z.string().optional(),
      email: z.string().email().optional(),
      displayName: z.string().optional(),
      self: z.boolean().optional(),
    }),
    organizer: z.object({
      id: z.string().optional(),
      email: z.string().email().optional(),
      displayName: z.string().optional(),
      self: z.boolean().optional(),
    }),
    start: StartEndSchema,
    end: StartEndSchema,
    endTimeUnspecified: z.boolean().optional(),
    recurrence: z.array(z.string()).optional(),
    recurringEventId: z.string().optional(),
    originalStartTime: StartEndSchema.optional(),
    transparency: z.string().optional(),
    visibility: z.string().optional(),
    iCalUID: z.string().optional(),
    sequence: z.number().int().optional(),
    attendees: z
      .array(
        z.object({
          id: z.string().optional(),
          email: z.string().email().optional(),
          displayName: z.string().optional(),
          organizer: z.boolean().optional(),
          self: z.boolean().optional(),
          resource: z.boolean().optional(),
          optional: z.boolean().optional(),
          responseStatus: z.string().optional(),
          comment: z.string().optional(),
          additionalGuests: z.number().int().optional(),
        })
      )
      .optional(),
    attendeesOmitted: z.boolean().optional(),
    extendedProperties: z
      .object({
        private: z.record(z.string()).optional(),
        shared: z.record(z.string()).optional(),
      })
      .optional(),
    hangoutLink: z.string().url().optional(),
    conferenceData: z
      .object({
        createRequest: z
          .object({
            requestId: z.string(),
            conferenceSolutionKey: z.object({
              type: z.string(),
            }),
            status: z.object({
              statusCode: z.string(),
            }),
          })
          .optional(),
        entryPoints: z
          .array(
            z.object({
              entryPointType: z.string(),
              uri: z.string().url(),
              label: z.string().optional(),
              pin: z.string().optional(),
              accessCode: z.string().optional(),
              meetingCode: z.string().optional(),
              passcode: z.string().optional(),
              password: z.string().optional(),
            })
          )
          .optional(),
        conferenceSolution: z
          .object({
            key: z.object({
              type: z.string(),
            }),
            name: z.string().optional(),
            iconUri: z.string().url().optional(),
          })
          .optional(),
        conferenceId: z.string().optional(),
        signature: z.string().optional(),
        notes: z.string().optional(),
      })
      .optional(),
    gadget: z
      .object({
        type: z.string(),
        title: z.string(),
        link: z.string().url(),
        iconLink: z.string().url(),
        width: z.number().int(),
        height: z.number().int(),
        display: z.string(),
        preferences: z.record(z.string()).optional(),
      })
      .optional(),
    anyoneCanAddSelf: z.boolean().optional(),
    guestsCanInviteOthers: z.boolean().optional(),
    guestsCanModify: z.boolean().optional(),
    guestsCanSeeOtherGuests: z.boolean().optional(),
    privateCopy: z.boolean().optional(),
    locked: z.boolean().optional(),
    reminders: z
      .object({
        useDefault: z.boolean(),
        overrides: z
          .array(
            z.object({
              method: z.string(),
              minutes: z.number().int(),
            })
          )
          .optional(),
      })
      .optional(),
    source: z
      .object({
        url: z.string().url(),
        title: z.string(),
      })
      .optional(),
    workingLocationProperties: z
      .object({
        type: z.string(),
        homeOffice: z.any().optional(),
        customLocation: z
          .object({
            label: z.string(),
          })
          .optional(),
        officeLocation: z
          .object({
            buildingId: z.string(),
            floorId: z.string(),
            floorSectionId: z.string(),
            deskId: z.string(),
            label: z.string(),
          })
          .optional(),
      })
      .optional(),
    outOfOfficeProperties: z
      .object({
        autoDeclineMode: z.string(),
        declineMessage: z.string(),
      })
      .optional(),
    focusTimeProperties: z
      .object({
        autoDeclineMode: z.string(),
        declineMessage: z.string(),
        chatStatus: z.string(),
      })
      .optional(),
    attachments: z
      .array(
        z.object({
          fileUrl: z.string().url(),
          title: z.string(),
          mimeType: z.string(),
          iconLink: z.string().url(),
          fileId: z.string(),
        })
      )
      .optional(),
    birthdayProperties: z
      .object({
        contact: z.string(),
        type: z.string(),
        customTypeName: z.string().optional(),
      })
      .optional(),
    eventType: z.string().optional(),
  })
  .strict();

const createListSchema = <T extends string, U extends ZodSchema>(
  kind: T,
  itemSchema: U
) => {
  return z
    .object({
      kind: z.literal(kind),
      etag: z.string(),
      summary: z.string().optional(),
      description: z.string().optional(),
      updated: DayJsDate,
      timeZone: z.string(),
      accessRole: z.string(),
      defaultReminders: z
        .array(
          z.object({
            method: z.string(),
            minutes: z.number().int(),
          })
        )
        .optional(),
      nextPageToken: z.string().optional(),
      nextSyncToken: z.string().optional(),
      items: z.array(itemSchema as U),
    })
    .strict();
};

const ListEventsSchema = createListSchema(
  "calendar#events",
  CalendarEventSchema
);
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
export type ListCalendarEvents = z.infer<typeof ListEventsSchema>;

type GetEventsApiParams = {
  timeMin: string;
  timeMax: string;
  calendarId?: string;
  singleEvents?: boolean;
};
type GetEventsOptions = GetEventsApiParams & {
  accessToken: string;
};

export class ApiGoogleCalendar {
  getEvents = async (options: GetEventsOptions) => {
    const { timeMin, timeMax, accessToken, singleEvents } = mergeDefaults(
      options,
      { singleEvents: true, calendarId: "primary" }
    );
    const response = await axios<GetEventsApiParams>(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
      {
        params: { timeMin, timeMax, singleEvents },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const body = ListEventsSchema.parse(response.data);

    if (body.nextPageToken) {
      console.warn("Result was paginated!");
    }

    return body;
  };
}
