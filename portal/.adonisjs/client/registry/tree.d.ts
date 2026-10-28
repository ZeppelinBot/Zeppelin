/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  splash: {
    getIndex: typeof routes['splash.get_index']
  }
  docs: {
    getIndex: typeof routes['docs.get_index']
  }
  auth: {
    getDiscordLogin: typeof routes['auth.get_discord_login']
    getDiscordCallback: typeof routes['auth.get_discord_callback']
    postLogout: typeof routes['auth.post_logout']
  }
  account: {
    getAccountPage: typeof routes['account.get_account_page']
    postDownloadAccountData: typeof routes['account.post_download_account_data']
    postDeleteAccountData: typeof routes['account.post_delete_account_data']
  }
}
