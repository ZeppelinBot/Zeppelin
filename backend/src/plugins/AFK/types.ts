import * as t from 'io-ts';
import { BasePluginType, guildCommand, guildEventListener } from 'knub';
import { AFK } from '../../data/AFK';

export const ConfigSchema = t.type({
    can_afk: t.boolean,
    allow_links: t.boolean,
    allow_invites: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface AFKPluginType extends BasePluginType {
    config: TConfigSchema;
    state: {
        afkUsers: AFK;
    }  
}

export const afkCmd = guildCommand<AFKPluginType>();
export const afkEvt = guildEventListener<AFKPluginType>();