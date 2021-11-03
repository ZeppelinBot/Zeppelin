import { GuildPluginData } from "knub";
import { PhishermanPluginType } from "../types";
import { PhishermanDomainInfo } from "../../../data/types/phisherman";
import { getPhishermanDomainInfo, phishermanDomainIsSafe, trackPhishermanCaughtDomain } from "../../../data/Phisherman";

export async function getDomainInfo(
  pluginData: GuildPluginData<PhishermanPluginType>,
  domain: string,
): Promise<PhishermanDomainInfo | null> {
  if (!pluginData.state.validApiKey) {
    return null;
  }

  const info = await getPhishermanDomainInfo(domain).catch((err) => {
    // tslint:disable-next-line:no-console
    console.warn(`[PHISHERMAN] Error in getDomainInfo() for server ${pluginData.guild.id}: ${err.message}`);
    if (err.message === "missing permissions") {
      pluginData.state.validApiKey = null;
    }
    return null;
  });
  if (info != null && !phishermanDomainIsSafe(info)) {
    trackPhishermanCaughtDomain(pluginData.state.validApiKey, domain);
  }

  return info;
}
