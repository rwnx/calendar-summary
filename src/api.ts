import { z } from 'zod';
import axios from 'axios';
import dayjs from 'dayjs';

const IssNowSchema = z.object({
  message: z.literal("success"),
  timestamp: z.number().transform((ts) => dayjs.unix(ts)),
  iss_position: z.object({
    latitude: z.string(),
    longitude: z.string(),
  })
});

type IssNow = z.infer<typeof IssNowSchema>;

export class Api {
  getData = async (): Promise<IssNow> => {
    const response = await axios.get('http://api.open-notify.org/iss-now.json');
    return IssNowSchema.parse(response.data);
  };
}