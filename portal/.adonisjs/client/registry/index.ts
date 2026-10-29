/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'splash.get_index': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [{"old":"/","type":0,"val":"/","end":""}],
    types: placeholder as Registry['splash.get_index']['types'],
  },
  'docs.get_index': {
    methods: ["GET","HEAD"],
    pattern: '/docs',
    tokens: [{"old":"/docs","type":0,"val":"docs","end":""}],
    types: placeholder as Registry['docs.get_index']['types'],
  },
  'auth.get_discord_login': {
    methods: ["GET","HEAD"],
    pattern: '/oauth/discord/login',
    tokens: [{"old":"/oauth/discord/login","type":0,"val":"oauth","end":""},{"old":"/oauth/discord/login","type":0,"val":"discord","end":""},{"old":"/oauth/discord/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['auth.get_discord_login']['types'],
  },
  'auth.get_discord_callback': {
    methods: ["GET","HEAD"],
    pattern: '/oauth/discord/callback',
    tokens: [{"old":"/oauth/discord/callback","type":0,"val":"oauth","end":""},{"old":"/oauth/discord/callback","type":0,"val":"discord","end":""},{"old":"/oauth/discord/callback","type":0,"val":"callback","end":""}],
    types: placeholder as Registry['auth.get_discord_callback']['types'],
  },
  'auth.post_logout': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [{"old":"/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['auth.post_logout']['types'],
  },
  'account.get_my_account_page': {
    methods: ["GET","HEAD"],
    pattern: '/account',
    tokens: [{"old":"/account","type":0,"val":"account","end":""}],
    types: placeholder as Registry['account.get_my_account_page']['types'],
  },
  'account.post_download_my_account_data': {
    methods: ["POST"],
    pattern: '/account/download-data',
    tokens: [{"old":"/account/download-data","type":0,"val":"account","end":""},{"old":"/account/download-data","type":0,"val":"download-data","end":""}],
    types: placeholder as Registry['account.post_download_my_account_data']['types'],
  },
  'account.post_delete_my_account_data': {
    methods: ["POST"],
    pattern: '/account/delete-data',
    tokens: [{"old":"/account/delete-data","type":0,"val":"account","end":""},{"old":"/account/delete-data","type":0,"val":"delete-data","end":""}],
    types: placeholder as Registry['account.post_delete_my_account_data']['types'],
  },
  'account.get_specific_account_page': {
    methods: ["GET","HEAD"],
    pattern: '/specific-account/:userId',
    tokens: [{"old":"/specific-account/:userId","type":0,"val":"specific-account","end":""},{"old":"/specific-account/:userId","type":1,"val":"userId","end":""}],
    types: placeholder as Registry['account.get_specific_account_page']['types'],
  },
  'account.post_download_specific_account_data': {
    methods: ["POST"],
    pattern: '/specific-account/:userId/download-data',
    tokens: [{"old":"/specific-account/:userId/download-data","type":0,"val":"specific-account","end":""},{"old":"/specific-account/:userId/download-data","type":1,"val":"userId","end":""},{"old":"/specific-account/:userId/download-data","type":0,"val":"download-data","end":""}],
    types: placeholder as Registry['account.post_download_specific_account_data']['types'],
  },
  'account.post_delete_specific_account_data': {
    methods: ["POST"],
    pattern: '/specific-account/:userId/delete-data',
    tokens: [{"old":"/specific-account/:userId/delete-data","type":0,"val":"specific-account","end":""},{"old":"/specific-account/:userId/delete-data","type":1,"val":"userId","end":""},{"old":"/specific-account/:userId/delete-data","type":0,"val":"delete-data","end":""}],
    types: placeholder as Registry['account.post_delete_specific_account_data']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
