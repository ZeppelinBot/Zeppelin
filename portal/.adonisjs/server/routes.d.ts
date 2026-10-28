import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'splash.get_index': { paramsTuple?: []; params?: {} }
    'docs.get_index': { paramsTuple?: []; params?: {} }
    'auth.get_discord_login': { paramsTuple?: []; params?: {} }
    'auth.get_discord_callback': { paramsTuple?: []; params?: {} }
    'auth.post_logout': { paramsTuple?: []; params?: {} }
    'account.get_account_page': { paramsTuple?: []; params?: {} }
    'account.post_download_account_data': { paramsTuple?: []; params?: {} }
    'account.post_delete_account_data': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'splash.get_index': { paramsTuple?: []; params?: {} }
    'docs.get_index': { paramsTuple?: []; params?: {} }
    'auth.get_discord_login': { paramsTuple?: []; params?: {} }
    'auth.get_discord_callback': { paramsTuple?: []; params?: {} }
    'account.get_account_page': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'splash.get_index': { paramsTuple?: []; params?: {} }
    'docs.get_index': { paramsTuple?: []; params?: {} }
    'auth.get_discord_login': { paramsTuple?: []; params?: {} }
    'auth.get_discord_callback': { paramsTuple?: []; params?: {} }
    'account.get_account_page': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.post_logout': { paramsTuple?: []; params?: {} }
    'account.post_download_account_data': { paramsTuple?: []; params?: {} }
    'account.post_delete_account_data': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}