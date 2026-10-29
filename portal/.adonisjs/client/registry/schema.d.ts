/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'splash.get_index': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#backend/features/splash/controllers/SplashController').default['getIndex']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#backend/features/splash/controllers/SplashController').default['getIndex']>>>
    }
  }
  'docs.get_index': {
    methods: ["GET","HEAD"]
    pattern: '/docs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#backend/features/docs/controllers/DocsController').default['getIndex']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#backend/features/docs/controllers/DocsController').default['getIndex']>>>
    }
  }
  'auth.get_discord_login': {
    methods: ["GET","HEAD"]
    pattern: '/oauth/discord/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#backend/features/auth/controllers/AuthController').default['getDiscordLogin']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#backend/features/auth/controllers/AuthController').default['getDiscordLogin']>>>
    }
  }
  'auth.get_discord_callback': {
    methods: ["GET","HEAD"]
    pattern: '/oauth/discord/callback'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#backend/features/auth/controllers/AuthController').default['getDiscordCallback']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#backend/features/auth/controllers/AuthController').default['getDiscordCallback']>>>
    }
  }
  'auth.post_logout': {
    methods: ["POST"]
    pattern: '/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#backend/features/auth/controllers/AuthController').default['postLogout']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#backend/features/auth/controllers/AuthController').default['postLogout']>>>
    }
  }
  'account.get_my_account_page': {
    methods: ["GET","HEAD"]
    pattern: '/account'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#backend/features/account/controllers/AccountController').default['getMyAccountPage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#backend/features/account/controllers/AccountController').default['getMyAccountPage']>>>
    }
  }
  'account.post_download_my_account_data': {
    methods: ["POST"]
    pattern: '/account/download-data'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#backend/features/account/controllers/AccountController').default['postDownloadMyAccountData']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#backend/features/account/controllers/AccountController').default['postDownloadMyAccountData']>>>
    }
  }
  'account.post_delete_my_account_data': {
    methods: ["POST"]
    pattern: '/account/delete-data'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#backend/features/account/controllers/AccountController').default['postDeleteMyAccountData']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#backend/features/account/controllers/AccountController').default['postDeleteMyAccountData']>>>
    }
  }
  'account.get_specific_account_page': {
    methods: ["GET","HEAD"]
    pattern: '/specific-account/:userId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { userId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#backend/features/account/controllers/AccountController').default['getSpecificAccountPage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#backend/features/account/controllers/AccountController').default['getSpecificAccountPage']>>>
    }
  }
  'account.post_download_specific_account_data': {
    methods: ["POST"]
    pattern: '/specific-account/:userId/download-data'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { userId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#backend/features/account/controllers/AccountController').default['postDownloadSpecificAccountData']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#backend/features/account/controllers/AccountController').default['postDownloadSpecificAccountData']>>>
    }
  }
  'account.post_delete_specific_account_data': {
    methods: ["POST"]
    pattern: '/specific-account/:userId/delete-data'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { userId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#backend/features/account/controllers/AccountController').default['postDeleteSpecificAccountData']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#backend/features/account/controllers/AccountController').default['postDeleteSpecificAccountData']>>>
    }
  }
}
