import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'splash.get_index': { paramsTuple?: []; params?: {} }
    'privacy_policy.get_privacy_policy_page': { paramsTuple?: []; params?: {} }
    'docs.get_index': { paramsTuple?: []; params?: {} }
    'auth.get_discord_login': { paramsTuple?: []; params?: {} }
    'auth.get_discord_callback': { paramsTuple?: []; params?: {} }
    'auth.post_logout': { paramsTuple?: []; params?: {} }
    'data_export.get_status': { paramsTuple: [ParamValue]; params: {'code': ParamValue} }
    'data_export.get_download': { paramsTuple: [ParamValue]; params: {'code': ParamValue} }
    'account.get_my_account_page': { paramsTuple?: []; params?: {} }
    'account.post_download_my_account_data': { paramsTuple?: []; params?: {} }
    'account.post_delete_my_account_data': { paramsTuple?: []; params?: {} }
    'account.get_specific_account_page': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'account.post_download_specific_account_data': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'account.post_delete_specific_account_data': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
  }
  GET: {
    'splash.get_index': { paramsTuple?: []; params?: {} }
    'privacy_policy.get_privacy_policy_page': { paramsTuple?: []; params?: {} }
    'docs.get_index': { paramsTuple?: []; params?: {} }
    'auth.get_discord_login': { paramsTuple?: []; params?: {} }
    'auth.get_discord_callback': { paramsTuple?: []; params?: {} }
    'data_export.get_status': { paramsTuple: [ParamValue]; params: {'code': ParamValue} }
    'data_export.get_download': { paramsTuple: [ParamValue]; params: {'code': ParamValue} }
    'account.get_my_account_page': { paramsTuple?: []; params?: {} }
    'account.get_specific_account_page': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
  }
  HEAD: {
    'splash.get_index': { paramsTuple?: []; params?: {} }
    'privacy_policy.get_privacy_policy_page': { paramsTuple?: []; params?: {} }
    'docs.get_index': { paramsTuple?: []; params?: {} }
    'auth.get_discord_login': { paramsTuple?: []; params?: {} }
    'auth.get_discord_callback': { paramsTuple?: []; params?: {} }
    'data_export.get_status': { paramsTuple: [ParamValue]; params: {'code': ParamValue} }
    'data_export.get_download': { paramsTuple: [ParamValue]; params: {'code': ParamValue} }
    'account.get_my_account_page': { paramsTuple?: []; params?: {} }
    'account.get_specific_account_page': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
  }
  POST: {
    'auth.post_logout': { paramsTuple?: []; params?: {} }
    'account.post_download_my_account_data': { paramsTuple?: []; params?: {} }
    'account.post_delete_my_account_data': { paramsTuple?: []; params?: {} }
    'account.post_download_specific_account_data': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'account.post_delete_specific_account_data': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}