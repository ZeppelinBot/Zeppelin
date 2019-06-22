export enum LoadStatus {
  None = 1,
  Loading,
  Done,
}

export interface AuthState {
  apiKey: string | null;
  loadedInitialAuth: boolean;
}

export interface GuildState {
  availableGuildsLoadStatus: LoadStatus;
  available: Array<{
    guild_id: string;
    name: string;
    icon: string | null;
  }>;
  configs: {
    [key: string]: string;
  };
}

export type RootState = {
  auth: AuthState;
  guilds: GuildState;
};
