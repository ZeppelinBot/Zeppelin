/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  splash: {
    getIndex: typeof routes['splash.get_index']
  }
  privacyPolicy: {
    getPrivacyPolicyPage: typeof routes['privacy_policy.get_privacy_policy_page']
  }
  docs: {
    getIndex: typeof routes['docs.get_index']
  }
  auth: {
    getDiscordLogin: typeof routes['auth.get_discord_login']
    getDiscordCallback: typeof routes['auth.get_discord_callback']
    postLogout: typeof routes['auth.post_logout']
  }
  dataExport: {
    getStatus: typeof routes['data_export.get_status']
    getDownload: typeof routes['data_export.get_download']
    deleteExport: typeof routes['data_export.delete_export']
  }
  account: {
    getMyAccountPage: typeof routes['account.get_my_account_page']
    postDownloadMyAccountData: typeof routes['account.post_download_my_account_data']
    postDeleteMyAccountData: typeof routes['account.post_delete_my_account_data']
    getSpecificAccountPage: typeof routes['account.get_specific_account_page']
    postDownloadSpecificAccountData: typeof routes['account.post_download_specific_account_data']
    postDeleteSpecificAccountData: typeof routes['account.post_delete_specific_account_data']
  }
}
