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

export interface ThinDocsPlugin {
  name: string;
  info: {
    name: string;
    description?: string;
  };
}

export interface DocsPlugin extends ThinDocsPlugin {
  commands: any[];
}

export interface DocsState {
  allPlugins: ThinDocsPlugin[];
  loadingAllPlugins: boolean;

  plugins: {
    [key: string]: DocsPlugin;
  };
}

export type RootState = {
  auth: AuthState;
  guilds: GuildState;
  docs: DocsState;
};
