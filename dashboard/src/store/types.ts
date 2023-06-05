import { ApiPermissions } from "@shared/apiPermissions";

export enum LoadStatus {
  None = 1,
  Loading,
  Done,
}

export type TimeoutType = ReturnType<typeof setTimeout>;
export type IntervalType = ReturnType<typeof setInterval>;

export interface AuthState {
  apiKey: string | null;
  loadedInitialAuth: boolean;
  authRefreshInterval: IntervalType | null;
  userId: string | null;
}

export interface GuildPermissionAssignment {
  type: string;
  target_id: string;
  permissions: Set<ApiPermissions>;
  expires_at: string | null;
}

export interface GuildState {
  availableGuildsLoadStatus: LoadStatus;
  available: Map<
    string,
    {
      id: string;
      name: string;
      icon: string | null;
    }
  >;
  configs: {
    [key: string]: string;
  };
  guildPermissionAssignments: {
    [guildId: string]: GuildPermissionAssignment[];
  };
}

export interface StaffState {
  isStaff: boolean;
}

export interface ThinDocsPlugin {
  name: string;
  info: {
    name: string;
    description?: string;
  };
}

export interface DocsPlugin extends ThinDocsPlugin {
  messageCommands: any[];
  slashCommands: any[];
  defaultOptions: any;
  configSchema?: string;
  info: {
    name: string;
    description?: string;
    usageGuide?: string;
    configurationGuide?: string;
  };
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
  staff: StaffState;
};
