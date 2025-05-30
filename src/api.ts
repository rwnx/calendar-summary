import { z } from 'zod';
import axios, { Axios } from "axios";
import dayjs, { Dayjs } from "dayjs";
import pollFor from "p-wait-for";
import queryString from "query-string";
import { jwtDecode } from "jwt-decode";

const scopes = ["playlist-modify-private", "playlist-modify-public"] as const;
type Scope = typeof scopes;

const spotifyJwtPayloadSchema = z.object({
  iss: z.string().url(),
  exp: z
    .number()
    .int()
    .transform((unix) => dayjs.unix(unix)),
  iat: z
    .number()
    .int()
    .transform((unix) => dayjs.unix(unix)),
  aud: z.union([z.string(), z.array(z.string())]),
  sub: z.string(),
  scope: z.string().optional(), // scopes are usually space-separated strings
  // add any other Spotify JWT claims you expect here
});

const createTokenResponseSchema = z.object({
  access_token: z
    .string()
    .transform((jwt) => spotifyJwtPayloadSchema.parse(jwtDecode(jwt))),
  expires_in: z.number().transform((n) => dayjs.unix(n)),
});

type createTokenResponse = z.infer<typeof createTokenResponseSchema>;

export const CreatePlaylistItemResponseSchema = z.object({
  collaborative: z.boolean(),
  description: z.string(),
  external_urls: z.object({
    spotify: z.string().url(),
  }),
  href: z.string().url(),
  id: z.string(),
  images: z.array(
    z.object({
      url: z.string().url(),
      height: z.number().int().positive().nullable(),
      width: z.number().int().positive().nullable(),
    })
  ),
  name: z.string(),
  owner: z.object({
    external_urls: z.object({
      spotify: z.string().url(),
    }),
    href: z.string().url(),
    id: z.string(),
    type: z.literal("user"),
    uri: z.string(),
    display_name: z.string().nullable(),
  }),
  public: z.boolean(),
  snapshot_id: z.string(),
  tracks: z.object({
    href: z.string().url(),
    total: z.number().int().min(0),
  }),
  type: z.string(),
  uri: z.string(),
});

export type CreatePlaylistItemResponse = z.infer<
  typeof CreatePlaylistItemResponseSchema
>;

const userProfileSchema = z.object({
  country: z.string(),
  display_name: z.string(),
  email: z.string(),
  explicit_content: z.object({
    filter_enabled: z.boolean(),
    filter_locked: z.boolean(),
  }),
  external_urls: z.object({
    spotify: z.string(),
  }),
  followers: z.object({
    href: z.string(),
    total: z.number(),
  }),
  href: z.string(),
  id: z.string(),
  images: z.array(
    z.object({
      url: z.string().url(),
      height: z.number(),
      width: z.number(),
    })
  ),
  product: z.string(),
  type: z.string(),
  uri: z.string(),
});

export class Spotify {
  private status:
    | undefined
    | {
        id: "authenticated";
        createdAt: Dayjs;
        updatedAt: Dayjs | undefined;
        accessToken;
      };

  setToken = (accessToken: createTokenResponse["access_token"]) => {
    if (this.status?.id == "authenticated") {
      this.status = {
        ...this.status,
        updatedAt: dayjs(),
        accessToken,
      };
    } else {
      this.status = {
        id: "authenticated",
        createdAt: dayjs(),
        updatedAt: undefined,
        accessToken,
      };
    }
  };

  private authenticatedClient: Axios;

  constructor(private clientId: string, private redirectUri: string) {
    this.authenticatedClient = new Axios({
      baseURL: "https://api.spotify.com",
    });

    this.authenticatedClient.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        config.headers.set("Authorization", `Bearer ${token}`);
        config.headers.set("Content-Type", "application/json");

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  get isAuthenticated() {
    return this.status?.id == "authenticated";
  }

  private getToken = async () => {
    const accessToken = this.status?.accessToken;
    if (!accessToken) return accessToken;
  };

  getMe = async () => {
    const response = await this.authenticatedClient.get("/v1/me");
    return userProfileSchema.parse(response.data);
  };

  getAuthUrl(scopes: Scope[]) {
    const uniqueScopes = [...new Set(scopes)];
    return `https://accounts.spotify.com/authorize?${queryString.stringify({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.redirectUri,
      scope: uniqueScopes,
      show_dialog: "true",
    })}`;
  }

  async getAccessToken(code: string, code_verifier?: string) {
    const response = await axios.post("https://accounts.spotify.com/token", {
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      // code_verifier,
    });

    return createTokenResponseSchema.parse(response.data);
  }

  async createPlaylist(options: {
    userId: string;
    name: string;
    description: string;
    isPublic: boolean;
    isCollaborative: boolean;
  }): Promise<CreatePlaylistItemResponse> {
    const { userId, name, description, isPublic, isCollaborative } = options;
    const response = await this.authenticatedClient.post(
      `/v1/users/${userId}/playlists`,
      {
        name,
        description,
        public: isPublic,
        collaborative: isCollaborative,
      }
    );
    return CreatePlaylistItemResponseSchema.parse(response.data);
  }
}

