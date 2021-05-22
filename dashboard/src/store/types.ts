import { ApiPermissions } from "@shared/apiPermissions";
import { ApiPermissionTypes } from "../../../backend/src/data/ApiPermissionAssignments";

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
  myPermissions: {
    [guildId: string]: {
      [K in ApiPermissions]?: boolean;
    };
  };
  guildPermissionAssignments: {
    [guildId: string]: Array<{
      target_id: string;
      type: ApiPermissionTypes;
      permissions: Set<ApiPermissions>;
    }>;
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
  commands: any[];
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
