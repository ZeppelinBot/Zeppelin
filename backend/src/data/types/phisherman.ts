export interface PhishermanUnknownDomain {
  classification: "unknown";
}

export interface PhishermanDomainInfo {
  status: string;
  lastChecked: string;
  verifiedPhish: boolean;
  classification: "safe" | "malicious";
  created: string;
  firstSeen: string | null;
  lastSeen: string | null;
  targetedBrand: string;
  phishCaught: number;
  details: PhishermanDomainInfoDetails;
}

export interface PhishermanDomainInfoDetails {
  phishTankId: string | null;
  urlScanId: string;
  websiteScreenshot: string;
  ip_address: string;
  asn: PhishermanDomainInfoAsn;
  registry: string;
  country: string;
}

export interface PhishermanDomainInfoAsn {
  asn: string;
  asn_name: string;
  route: string;
}
