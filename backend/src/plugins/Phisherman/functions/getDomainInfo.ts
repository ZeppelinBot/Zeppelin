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

  const info = await getPhishermanDomainInfo(domain).catch(() => null);
  if (info != null && !phishermanDomainIsSafe(info)) {
    trackPhishermanCaughtDomain(pluginData.state.validApiKey, domain);
  }

  return info;
}
