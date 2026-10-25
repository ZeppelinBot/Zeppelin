import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'splash.get_index': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'splash.get_index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'splash.get_index': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}